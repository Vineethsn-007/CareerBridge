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

export function LiveTranscriptBox({
  transcript,
  isAvatarSpeaking,
  onCandidateSpeechRecognized,
}: LiveTranscriptBoxProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [interimText, setInterimText] = useState<string>("");
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState<boolean>(false);

  // Auto-scroll on new transcript entries or interim speech
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Client-side Web Speech Recognition for live captions
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recognition: any = null;
    let isStopped = false;

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (Indian accent optimized)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
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

      recognition.onerror = () => {
        setIsCandidateSpeaking(false);
      };

      recognition.onend = () => {
        setIsCandidateSpeaking(false);
        // Restart if component is still mounted and not avatar speaking
        if (!isStopped) {
          try {
            recognition.start();
          } catch {
            // ignore start error
          }
        }
      };

      recognition.start();
    } catch (err) {
      console.warn("Speech recognition not available or blocked:", err);
    }

    return () => {
      isStopped = true;
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
    </div>
  );
}
