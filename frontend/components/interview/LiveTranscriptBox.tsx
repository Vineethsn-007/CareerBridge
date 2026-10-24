"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Bot, User, Volume2, Mic, MicOff, RefreshCw, AlertCircle } from "lucide-react";

export interface TranscriptItem {
  sender: "Robin" | "You";
  text: string;
  timestamp: string;
}

interface LiveTranscriptBoxProps {
  transcript: TranscriptItem[];
  isAvatarSpeaking: boolean;
  onCandidateSpeechRecognized?: (text: string) => void;
  onCandidateTypedAnswer?: (text: string) => void;
  isMuted?: boolean;
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
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function LiveTranscriptBox({
  transcript,
  isAvatarSpeaking,
  onCandidateSpeechRecognized,
  onCandidateTypedAnswer,
  isMuted = false,
}: LiveTranscriptBoxProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [interimText, setInterimText] = useState<string>("");
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [micError, setMicError] = useState<string | null>(null);

  // Keep latest callback in a ref to avoid tearing down the speech recognition instance on every render
  const onSpeechRef = useRef(onCandidateSpeechRecognized);
  onSpeechRef.current = onCandidateSpeechRecognized;

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isDestroyedRef = useRef<boolean>(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  // Auto-scroll on new transcript entries or interim speech
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Factory function to create and start a fresh SpeechRecognition instance.
  // In Chromium/WebKit, an instance CANNOT be restarted with .start() after onend;
  // a new instance must be created every time.
  const createAndStartRecognition = useCallback(() => {
    if (isDestroyedRef.current) return;

    if (isMutedRef.current) {
      setIsListening(false);
      setIsCandidateSpeaking(false);
      setInterimText("");
      return;
    }

    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
    const SpeechRecognitionClass = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => BrowserSpeechRecognition)
      | undefined;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      return;
    }

    // Clean up previous dead instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Detect user browser language with fallback
      const preferredLang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
      recognition.lang = preferredLang;

      recognition.onstart = () => {
        if (isDestroyedRef.current) return;
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (isDestroyedRef.current) return;
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const final = event.results[i][0].transcript.trim();
            if (final) {
              onSpeechRef.current?.(final);
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
        if (isDestroyedRef.current) return;
        const err = e?.error || "unknown";
        console.warn("Speech recognition event:", err);
        setIsCandidateSpeaking(false);

        if (err === "not-allowed" || err === "service-not-allowed") {
          setMicError("Microphone permission needed for live voice captions");
          setIsListening(false);
          return;
        }

        // For transient errors (no-speech, network, aborted), schedule a fresh instance start
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          createAndStartRecognition();
        }, 500);
      };

      recognition.onend = () => {
        if (isDestroyedRef.current) return;
        setIsListening(false);
        setIsCandidateSpeaking(false);

        // Auto restart with a fresh instance unless candidate is muted or component unmounted
        if (!isMutedRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            createAndStartRecognition();
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        createAndStartRecognition();
      }, 800);
    }
  }, []);

  // Request mic permission manually and restart recognition
  const handleRequestMicPermission = async () => {
    try {
      setMicError(null);
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      createAndStartRecognition();
    } catch (err) {
      setMicError("Microphone access was denied. Please allow mic permissions in browser settings.");
    }
  };

  // Manage recognition lifecycle
  useEffect(() => {
    isDestroyedRef.current = false;
    createAndStartRecognition();

    return () => {
      isDestroyedRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onspeechend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onstart = null;
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [createAndStartRecognition]);

  // Restart or stop speech recognition when mute state changes
  useEffect(() => {
    if (isMuted) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setIsCandidateSpeaking(false);
      setInterimText("");
    } else {
      createAndStartRecognition();
    }
  }, [isMuted, createAndStartRecognition]);

  return (
    <div className="editorial-card rounded-xl bg-white border border-border shadow-sm flex flex-col h-[280px] sm:h-[320px] overflow-hidden">
      {/* Box Header */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-venice-blue" />
          <span className="text-xs font-semibold text-primary-text">Live Transcript</span>
        </div>

        {/* Dynamic Status Indicator & Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          {isAvatarSpeaking ? (
            <span className="flex items-center gap-1 text-venice-blue font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5" />
              Robin speaking...
            </span>
          ) : isCandidateSpeaking || interimText ? (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Transcribing your voice...</span>
            </span>
          ) : isMuted ? (
            <span className="flex items-center gap-1 text-danger font-medium">
              <MicOff className="w-3.5 h-3.5" />
              Muted
            </span>
          ) : isListening ? (
            <button
              type="button"
              onClick={createAndStartRecognition}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
              title="Speech recognition is active. Click to refresh listener."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Mic Active (Listening)</span>
            </button>
          ) : micError ? (
            <button
              type="button"
              onClick={handleRequestMicPermission}
              className="flex items-center gap-1 text-amber-700 hover:text-amber-800 transition-colors font-medium cursor-pointer"
              title="Click to grant mic permission"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Mic Blocked • Retry</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={createAndStartRecognition}
              className="flex items-center gap-1 text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
              title="Click to reconnect live voice listener"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Listening for speech</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission or Browser Warning Notice */}
      {micError && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-[11px] text-amber-800">
          <span className="truncate">{micError}</span>
          <button
            type="button"
            onClick={handleRequestMicPermission}
            className="ml-2 font-semibold underline text-amber-900 hover:text-amber-950 flex-shrink-0"
          >
            Enable Mic
          </button>
        </div>
      )}

      {!speechSupported && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-[11px] text-blue-800">
          Browser voice recognition not supported in this browser. You can speak directly to Robin or type your answers below.
        </div>
      )}

      {/* Transcript Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed"
      >
        {transcript.length === 0 && !interimText && (
          <div className="h-full flex flex-col items-center justify-center text-center text-secondary-text p-4">
            <p className="text-xs">
              Live conversation transcript will appear here in real-time as you and Robin speak.
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

        {/* Real-time Interim Candidate Speech Bubble */}
        {interimText && (
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-600 text-white border border-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[85%] rounded-lg p-2.5 bg-venice-blue text-white rounded-tr-none border border-emerald-400 shadow-sm animate-pulse">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold text-[10px] text-emerald-200">
                  Transcribing your voice...
                </span>
              </div>
              <p className="italic text-white/95">{interimText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Input Option: Type or Speak */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const clean = typedInput.trim();
          if (clean) {
            onCandidateSpeechRecognized?.(clean);
            onCandidateTypedAnswer?.(clean);
            setTypedInput("");
          }
        }}
        className="p-2 border-t border-border-subtle bg-surface-muted flex items-center gap-1.5"
      >
        <input
          type="text"
          value={typedInput}
          onChange={(e) => setTypedInput(e.target.value)}
          placeholder="Speak into microphone or type your answer here..."
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

