"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Loader2, AlertCircle, RefreshCw, Volume2, UserCheck, Sparkles } from "lucide-react";
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

  // Detect whether this is an offline mock room URL (e.g. from tests or offline dev mode)
  const isMockUrl = Boolean(
    !conversationUrl ||
      conversationUrl.includes("mock") ||
      conversationUrl.includes("mock-") ||
      conversationUrl.startsWith("c_mock")
  );

  // Helper to extract Tavus CVI conversation ID from URL (e.g. https://tavus.daily.co/c75d88fe82944449 -> c75d88fe82944449)
  const getTavusConvId = (): string => {
    if (conversationUrl) {
      const parts = conversationUrl.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && !lastPart.includes(".")) {
        return lastPart;
      }
    }
    return sessionId;
  };

  // Expose imperative methods to parent (e.g. candidate "Done Speaking" button sends message)
  useImperativeHandle(ref, () => ({
    sendRespond: (text: string) => {
      if (isMockUrl) {
        // In mock simulation, simulate interviewer acknowledgment & speech cycle
        setIsAvatarSpeaking(true);
        onAvatarStartedSpeaking?.();
        setTimeout(() => {
          onUtterance?.(
            "Thank you for that response. Let's move to the next question in our plan.",
            "interviewer"
          );
          setTimeout(() => {
            setIsAvatarSpeaking(false);
            onAvatarStoppedSpeaking?.();
          }, 2000);
        }, 1200);
        return;
      }

      if (callFrameRef.current) {
        const tavusId = getTavusConvId();
        try {
          callFrameRef.current.sendAppMessage(
            {
              message_type: "conversation",
              event_type: "conversation.respond",
              conversation_id: tavusId,
              properties: { text },
            },
            "*"
          );
        } catch (err) {
          console.warn("Notice: Failed to send respond app-message via Daily:", err);
        }
      }
    },
    sendInterrupt: () => {
      if (isMockUrl) {
        setIsAvatarSpeaking(false);
        onAvatarStoppedSpeaking?.();
        return;
      }

      if (callFrameRef.current) {
        const tavusId = getTavusConvId();
        try {
          callFrameRef.current.sendAppMessage(
            {
              message_type: "conversation",
              event_type: "conversation.interrupt",
              conversation_id: tavusId,
            },
            "*"
          );
        } catch (err) {
          console.warn("Notice: Failed to send interrupt app-message via Daily:", err);
        }
      }
    },
  }));

  useEffect(() => {
    // 1. If this is a mock URL, avoid initializing Daily JS against a non-existent daily.co room
    if (isMockUrl) {
      setStatus("live");
      // Simulate initial greeting
      const timer = setTimeout(() => {
        setIsAvatarSpeaking(true);
        onAvatarStartedSpeaking?.();
        setTimeout(() => {
          setIsAvatarSpeaking(false);
          onAvatarStoppedSpeaking?.();
        }, 3000);
      }, 1000);
      return () => clearTimeout(timer);
    }

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

        // Clean up any existing call frame in this container
        if (callFrameRef.current) {
          try {
            await callFrameRef.current.destroy();
          } catch {
            // ignore cleanup error
          }
          callFrameRef.current = null;
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        const frame = DailyIframe.createFrame(containerRef.current, {
          url: conversationUrl || undefined,
          showLeaveButton: false,
          showFullscreenButton: true,
          showLocalVideo: false,
          showParticipantsBar: false,
          showUserNameChangeUI: false,
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
          // Log as info/warning rather than breaking console error
          console.warn("Daily stream notice:", e);
          if (isMounted) {
            // Gracefully switch to direct iframe fallback if Daily WebRTC encounters an issue
            setUseIframeFallback(true);
            setStatus("live");
          }
        });

        // Listen for Tavus CVI app messages & events
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
          } else if (
            data.event_type === "conversation.utterance" ||
            data.event_type === "conversation.caption"
          ) {
            const text =
              data.properties?.text ||
              data.properties?.caption ||
              data.properties?.speech ||
              data.properties?.content ||
              "";
            const role =
              data.properties?.role === "user" ? "candidate" : "interviewer";
            if (text) {
              onUtterance?.(text, role);
            }
          }
        });

        // Also capture native Daily live transcription messages if emitted
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frame.on("transcription-message", (evt: any) => {
          const text = evt?.text;
          if (text) {
            const isLocal = evt?.participantId === frame.participants()?.local?.session_id;
            onUtterance?.(text, isLocal ? "candidate" : "interviewer");
          }
        });

        await frame.join();
      } catch (err: unknown) {
        console.warn("Daily SDK init notice, falling back to direct embed:", err);
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
  }, [conversationUrl, useIframeFallback, isMockUrl, onAvatarStartedSpeaking, onAvatarStoppedSpeaking, onUtterance, sessionId]);

  return (
    <div className="relative w-full h-full min-h-[420px] sm:min-h-[500px] lg:min-h-[580px] bg-dark-navy rounded-xl overflow-hidden border border-border shadow-md flex items-center justify-center">
      {/* Mock Avatar Simulation Mode */}
      {isMockUrl ? (
        <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-dark-navy via-[#1B445D] to-dark-navy text-center select-none">
          {/* Animated Avatar Circle with Aura */}
          <div className="relative mb-6">
            <div
              className={`absolute -inset-3 rounded-full blur-xl transition-all duration-700 ${
                isAvatarSpeaking
                  ? "bg-emerald-400/30 scale-110 animate-pulse"
                  : "bg-rock-blue/20 scale-100"
              }`}
            />
            <div
              className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 flex items-center justify-center shadow-xl transition-all duration-300 ${
                isAvatarSpeaking
                  ? "border-emerald-400 bg-emerald-950/40"
                  : "border-rock-blue/40 bg-white/5"
              }`}
            >
              <UserCheck
                className={`w-14 h-14 sm:w-16 sm:h-16 transition-colors duration-300 ${
                  isAvatarSpeaking ? "text-emerald-400" : "text-rock-blue"
                }`}
              />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-semibold text-white mb-2">
            Robin
          </h3>
          <p className="text-xs sm:text-sm text-rock-blue max-w-sm mb-4">
            AI Technical Interviewer
          </p>

          {/* Equalizer animation when speaking */}
          {isAvatarSpeaking ? (
            <div className="flex items-center gap-1.5 h-8 px-4 py-1.5 rounded-full bg-black/40 border border-emerald-400/30 backdrop-blur-md">
              <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-4" />
              <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-6" />
              <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-5" />
              <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_400ms] h-7" />
              <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-4" />
              <span className="text-xs font-medium text-emerald-400 ml-2">Speaking...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-rock-blue animate-pulse" />
              <span className="text-xs font-medium text-rock-blue">Listening to you</span>
            </div>
          )}

          {/* Simulation mode watermark badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-white/80 text-[11px] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-accent-peach" />
            <span>AI Mock Interview Simulator</span>
          </div>
        </div>
      ) : !useIframeFallback ? (
        /* Container for Daily Iframe */
        <div ref={containerRef} className="w-full h-full absolute inset-0" />
      ) : conversationUrl ? (
        /* Fallback standard Iframe */
        <iframe
          src={conversationUrl}
          allow="camera; microphone; autoplay; display-capture; fullscreen"
          className="w-full h-full absolute inset-0 border-0 rounded-xl"
          title="Robin, AI Interviewer"
        />
      ) : null}

      {/* Connecting Overlay (for live room only) */}
      {!isMockUrl && status === "connecting" && (
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

      {/* Error Overlay (for live room only if fallback fails) */}
      {!isMockUrl && status === "error" && (
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
