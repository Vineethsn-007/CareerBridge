"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Bot, User, Volume2, Mic } from "lucide-react";

export interface TranscriptItem {
  sender: "Robin" | "You";
  text: string;
  timestamp: string;
}

interface LiveTranscriptBoxProps {
  transcript: TranscriptItem[];
  isAvatarSpeaking: boolean;
  onCandidateSpeechRecognized?: (text: string) => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultEntry {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultEntry;
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onspeechend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function LiveTranscriptBox({
  transcript,
  isAvatarSpeaking,
  onCandidateSpeechRecognized,
}: LiveTranscriptBoxProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [interimText, setInterimText] = useState<string>("");
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>("");

  // Auto-scroll on new transcript entries or interim speech
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Client-side Web Speech Recognition for live captions
  useEffect(() => {
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
    const SpeechRecognitionClass = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => BrowserSpeechRecognition)
      | undefined;
    if (!SpeechRecognitionClass) return;

    let recognition: BrowserSpeechRecognition | null = null;
    let isStopped = false;
    let restartTimer: NodeJS.Timeout | null = null;

    const safeStart = () => {
      if (isStopped || !recognition) return;
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (isStopped) return;
        try {
          recognition?.start();
        } catch {
          // Ignore if already starting or active
        }
      }, 400);
    };

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (Indian accent optimized)

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const final = event.results[i][0].transcript.trim();
            if (final) {
              onCandidateSpeechRecognized?.(final);
            }
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInterimText(currentInterim);
        setIsCandidateSpeaking(currentInterim.length > 0);
      };

      recognition.onspeechend = () => {
        setIsCandidateSpeaking(false);
      };

      recognition.onerror = (e: SpeechRecognitionErrorEventLike) => {
        setIsCandidateSpeaking(false);
        // Only ignore restart if user explicitly denied microphone
        if (e?.error !== "not-allowed" && e?.error !== "service-not-allowed") {
          safeStart();
        }
      };

      recognition.onend = () => {
        setIsCandidateSpeaking(false);
        safeStart();
      };

      recognition.start();
    } catch (err) {
      console.warn("Speech recognition not available or blocked:", err);
    }

    return () => {
      isStopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [onCandidateSpeechRecognized]);

  return (
    <div className="editorial-card rounded-xl bg-white border border-border shadow-sm flex flex-col h-[280px] sm:h-[320px] overflow-hidden">
      {/* Box Header */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-venice-blue" />
          <span className="text-xs font-semibold text-primary-text">Live Transcript</span>
        </div>

        {/* Dynamic Status Indicator */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {isAvatarSpeaking ? (
            <span className="flex items-center gap-1 text-venice-blue font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
              Robin speaking...
            </span>
          ) : isCandidateSpeaking || interimText ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium animate-pulse">
              <Mic className="w-3.5 h-3.5" />
              Listening to you...
            </span>
          ) : (
            <span className="text-secondary-text text-[10px]">Listening for speech</span>
          )}
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed"
      >
        {transcript.length === 0 && !interimText && (
          <div className="h-full flex flex-col items-center justify-center text-center text-secondary-text p-4">
            <p className="text-xs">
              Live conversation transcript will appear here as you and Robin speak.
            </p>
          </div>
        )}

        {transcript.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${
              item.sender === "You" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Sender Avatar Icon */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                item.sender === "Robin"
                  ? "bg-venice-blue text-white"
                  : "bg-surface-2 text-primary-text border border-border"
              }`}
            >
              {item.sender === "Robin" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-lg p-2.5 ${
                item.sender === "Robin"
                  ? "bg-pale-blue text-primary-text rounded-tl-none border border-border-subtle"
                  : "bg-venice-blue text-white rounded-tr-none"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <span className="font-semibold text-[11px] opacity-80">
                  {item.sender}
                </span>
                <span className="text-[9px] opacity-60">
                  {item.timestamp}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{item.text}</p>
            </div>
          </div>
        ))}

        {/* Real-time Interim Candidate Speech */}
        {interimText && (
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-surface-2 text-primary-text border border-border">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-lg p-2.5 bg-venice-blue/80 text-white rounded-tr-none border border-venice-blue animate-pulse">
              <span className="font-semibold text-[10px] opacity-75 block mb-0.5">
                Speaking...
              </span>
              <p className="italic">{interimText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Input Option: Type or Speak */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typedInput.trim()) {
            onCandidateSpeechRecognized?.(typedInput.trim());
            setTypedInput("");
          }
        }}
        className="p-2 border-t border-border-subtle bg-surface-muted flex items-center gap-1.5"
      >
        <input
          type="text"
          value={typedInput}
          onChange={(e) => setTypedInput(e.target.value)}
          placeholder="Speak or type your answer..."
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white text-primary-text focus:outline-none focus:ring-1 focus:ring-venice-blue"
        />
        <button
          type="submit"
          disabled={!typedInput.trim()}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-venice-blue text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-venice-blue/90 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
