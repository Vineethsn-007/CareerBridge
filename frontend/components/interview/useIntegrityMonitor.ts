"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { IntegrityEvent } from "@/lib/types";

interface UseIntegrityMonitorProps {
  sessionId: string;
  enabled: boolean;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
}

export interface IntegrityMonitorState {
  alertsCount: number;
  integrityScore: number;
  lastAlert: string | null;
  events: IntegrityEvent[];
}

export function useIntegrityMonitor({
  sessionId,
  enabled,
  videoElementRef,
}: UseIntegrityMonitorProps) {
  const [alertsCount, setAlertsCount] = useState(0);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  const pendingEventsRef = useRef<IntegrityEvent[]>([]);
  const noFaceTimerRef = useRef<number | null>(null);

  const recordEvent = useCallback(
    (
      eventType: IntegrityEvent["event_type"],
      penalty: number,
      alertMessage: string,
      details?: Record<string, unknown>
    ) => {
      const event: IntegrityEvent = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        details,
      };

      pendingEventsRef.current.push(event);
      setAlertsCount((prev) => prev + 1);
      setIntegrityScore((prev) => Math.max(0, prev - penalty));
      setLastAlert(alertMessage);
    },
    []
  );

  // Periodic flush of pending events to backend
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const interval = setInterval(() => {
      if (pendingEventsRef.current.length > 0) {
        const toSend = [...pendingEventsRef.current];
        pendingEventsRef.current = [];
        api
          .logIntegrityEvents(sessionId, toSend)
          .then((res) => {
            if (res && typeof res.integrity_score === "number") {
              setIntegrityScore(res.integrity_score);
            }
          })
          .catch((err) => {
            // Put unsent events back on network failure
            pendingEventsRef.current = [...toSend, ...pendingEventsRef.current];
            console.warn("Failed to sync integrity events:", err);
          });
      }
    }, 12000);

    return () => {
      clearInterval(interval);
      // Flush on cleanup
      if (pendingEventsRef.current.length > 0) {
        const toSend = [...pendingEventsRef.current];
        pendingEventsRef.current = [];
        api.logIntegrityEvents(sessionId, toSend).catch(() => {});
      }
    };
  }, [enabled, sessionId]);

  // Tab switch & window blur detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordEvent(
          "tab_switch",
          5,
          "Tab switch detected. Please remain focused on the interview room.",
          { hidden: true }
        );
      }
    };

    const handleWindowBlur = () => {
      recordEvent(
        "window_blur",
        3,
        "Interview window lost focus. Keep CareerBridge in the foreground.",
        { activeElement: document.activeElement?.tagName }
      );
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordEvent(
          "fullscreen_exit",
          4,
          "Fullscreen exited. Recommended to stay in focus during mock interview.",
          {}
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enabled, recordEvent]);

  // Camera presence check (educational client-side verification)
  useEffect(() => {
    if (!enabled || !videoElementRef) return;

    const interval = setInterval(async () => {
      const video = videoElementRef.current;
      if (!video || video.paused || video.ended || video.readyState < 2) return;

      try {
        // Use browser FaceDetector API if available (Chrome 56+)
        if ("FaceDetector" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const FaceDetectorClass = (window as any).FaceDetector;
          const detector = new FaceDetectorClass({ maxDetectedFaces: 5, fastMode: true });
          const faces = await detector.detect(video);

          if (faces.length === 0) {
            if (!noFaceTimerRef.current) {
              // Wait 8s before flagging to prevent false positives during blinks or head turns
              noFaceTimerRef.current = window.setTimeout(() => {
                recordEvent(
                  "no_face",
                  5,
                  "No face detected in camera view. Ensure good lighting and center yourself.",
                  {}
                );
                noFaceTimerRef.current = null;
              }, 8000);
            }
          } else {
            if (noFaceTimerRef.current) {
              clearTimeout(noFaceTimerRef.current);
              noFaceTimerRef.current = null;
            }
            if (faces.length > 1) {
              recordEvent(
                "multiple_faces",
                10,
                "Multiple faces detected in frame. Maintain individual interview setting.",
                { count: faces.length }
              );
            }
          }
        }
      } catch {
        // FaceDetector failed or blocked, ignore gracefully
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
      }
    };
  }, [enabled, videoElementRef, recordEvent]);

  return {
    alertsCount,
    integrityScore,
    lastAlert,
    recordEvent,
  };
}
