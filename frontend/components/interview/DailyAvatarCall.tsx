"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Loader2, AlertCircle, RefreshCw, Volume2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface DailyAvatarCallHandle {
  sendRespond: (text: string) => void;
  sendInterrupt: () => void;
}

interface DailyAvatarCallProps {
  conversationUrl?: string | null;
  sessionId: string;
  onAvatarStartedSpeaking?: () => void;
  onAvatarStoppedSpeaking?: () => void;
  onUtterance?: (text: string, role: "interviewer" | "candidate") => void;
}

export const DailyAvatarCall = forwardRef<
  DailyAvatarCallHandle,
  DailyAvatarCallProps
>(function DailyAvatarCall(
  {
    conversationUrl,
    sessionId,
    onAvatarStartedSpeaking,
    onAvatarStoppedSpeaking,
    onUtterance,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callFrameRef = useRef<any>(null);

  const [status, setStatus] = useState<"connecting" | "live" | "reconnecting" | "error">(
    "connecting"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState<boolean>(false);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Expose imperative methods to parent (e.g., "Done Speaking" button sends response message)
  useImperativeHandle(ref, () => ({
    sendRespond: (text: string) => {
      if (callFrameRef.current) {
        try {
          callFrameRef.current.sendAppMessage(
            {
              message_type: "conversation",
              event_type: "conversation.respond",
              conversation_id: sessionId,
              properties: { text },
            },
            "*"
          );
        } catch (err) {
          console.warn("Failed to send respond app message via Daily:", err);
        }
      }
    },
    sendInterrupt: () => {
      if (callFrameRef.current) {
        try {
          callFrameRef.current.sendAppMessage(
            {
              message_type: "conversation",
              event_type: "conversation.interrupt",
              conversation_id: sessionId,
            },
            "*"
          );
        } catch (err) {
          console.warn("Failed to send interrupt app message via Daily:", err);
        }
      }
    },
  }));

  useEffect(() => {
    if (!conversationUrl) {
      setStatus("connecting");
      return;
    }

    if (useIframeFallback) {
      // Direct iframe fallback mode
      setStatus("live");
      return;
    }

    let isMounted = true;

    async function initDaily() {
      try {
        setStatus("connecting");
        setErrorMessage(null);

        // Dynamically load DailyIframe on client
        const DailyIframe = (await import("@daily-co/daily-js")).default;

        if (!containerRef.current || !isMounted) return;

        // Clean up any existing call frame
        if (callFrameRef.current) {
          try {
            await callFrameRef.current.destroy();
          } catch {
            // ignore cleanup error
          }
          callFrameRef.current = null;
        }

        const frame = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "12px",
            backgroundColor: "#163A50",
          },
        });

        callFrameRef.current = frame;

        // Register Daily event listeners
        frame.on("loading", () => {
          if (isMounted) setStatus("connecting");
        });

        frame.on("joined-meeting", () => {
          if (isMounted) setStatus("live");
        });

        frame.on("left-meeting", () => {
          if (isMounted) setStatus("connecting");
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frame.on("error", (e: any) => {
          console.error("Daily room error:", e);
          if (isMounted) {
            setStatus("error");
            setErrorMessage(e?.errorMsg || "Could not connect to interviewer video stream.");
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frame.on("app-message", (evt: any) => {
          const data = evt?.data;
          if (!data) return;

          if (data.event_type === "conversation.started_speaking") {
            setIsAvatarSpeaking(true);
            onAvatarStartedSpeaking?.();
          } else if (data.event_type === "conversation.stopped_speaking") {
            setIsAvatarSpeaking(false);
            onAvatarStoppedSpeaking?.();
          } else if (data.event_type === "conversation.utterance") {
            const text = data.properties?.text || data.properties?.speech || "";
            const role = data.properties?.role === "user" ? "candidate" : "interviewer";
            if (text) {
              onUtterance?.(text, role);
            }
          }
        });

        await frame.join({ url: conversationUrl || undefined });
      } catch (err: unknown) {
        console.error("Failed to initialize Daily video call:", err);
        if (isMounted) {
          // If Daily SDK errors, offer clean fallback to standard responsive iframe
          setUseIframeFallback(true);
          setStatus("live");
        }
      }
    }

    initDaily();

    return () => {
      isMounted = false;
      if (callFrameRef.current) {
        try {
          callFrameRef.current.destroy();
        } catch {
          // ignore cleanup error
        }
        callFrameRef.current = null;
      }
    };
  }, [conversationUrl, useIframeFallback, onAvatarStartedSpeaking, onAvatarStoppedSpeaking, onUtterance, sessionId]);

  return (
    <div className="relative w-full h-full min-h-[420px] sm:min-h-[500px] lg:min-h-[580px] bg-dark-navy rounded-xl overflow-hidden border border-border shadow-md flex items-center justify-center">
      {/* Container for Daily Iframe or fallback standard Iframe */}
      {!useIframeFallback ? (
        <div ref={containerRef} className="w-full h-full absolute inset-0" />
      ) : conversationUrl ? (
        <iframe
          src={conversationUrl}
          allow="camera; microphone; autoplay; display-capture; fullscreen"
          className="w-full h-full absolute inset-0 border-0 rounded-xl"
          title="Robin, AI Interviewer"
        />
      ) : null}

      {/* Connecting Overlay */}
      {status === "connecting" && (
        <div className="absolute inset-0 bg-dark-navy/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-venice-blue/40 border border-venice-blue flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-rock-blue animate-spin" />
          </div>
          <h3 className="text-lg font-serif font-semibold text-white mb-1">
            Connecting to Robin...
          </h3>
          <p className="text-xs text-white/70 max-w-sm">
            Setting up your secure WebRTC video stream. Robin will begin by introducing himself and the interview structure.
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {status === "error" && (
        <div className="absolute inset-0 bg-dark-navy/95 z-20 flex flex-col items-center justify-center p-6 text-center text-white">
          <AlertCircle className="w-12 h-12 text-danger mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">Connection Issue</h3>
          <p className="text-xs text-white/70 max-w-sm mb-4">
            {errorMessage || "Unable to maintain video connection with the interviewer avatar."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="highlight"
              size="sm"
              onClick={() => {
                setStatus("connecting");
                setUseIframeFallback(true);
              }}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Switch to Direct Embed
            </Button>
          </div>
        </div>
      )}

      {/* Name Tag & Status Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-rock-blue" />
          <span className="text-xs font-semibold text-white">Robin</span>
          <span className="text-[10px] text-white/60">AI Interviewer</span>

          <div className="h-3 w-px bg-white/20 mx-0.5" />

          {/* Speaking Indicator */}
          {isAvatarSpeaking ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Speaking...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-rock-blue">
              <span className="w-1.5 h-1.5 rounded-full bg-rock-blue animate-pulse" />
              <span>Listening</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
