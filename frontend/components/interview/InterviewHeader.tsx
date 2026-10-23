"use client";

import React, { useState, useEffect } from "react";
import { PhoneOff, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface InterviewHeaderProps {
  roleTitle: string;
  companyName: string;
  durationMinutes: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  alertsCount: number;
  integrityEnabled: boolean;
  onEndInterview: () => void;
}

export function InterviewHeader({
  roleTitle,
  companyName,
  durationMinutes,
  currentQuestionIndex,
  totalQuestions,
  alertsCount,
  integrityEnabled,
  onEndInterview,
}: InterviewHeaderProps) {
  // Timer state in seconds
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const isLowTime = secondsRemaining <= 120 && secondsRemaining > 0;
  const isTimeUp = secondsRemaining === 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border px-4 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Role & Live Indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-danger">LIVE</span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="truncate">
            <h1 className="text-xs sm:text-sm font-semibold text-primary-text truncate flex items-center gap-1.5">
              <span>{roleTitle}</span>
              <span className="text-secondary-text font-normal hidden md:inline">at {companyName}</span>
            </h1>
          </div>
        </div>

        {/* Center: Timer & Question Pill */}
        <div className="flex items-center gap-3">
          {/* Question Progress Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-pale-blue text-venice-blue border border-border text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-venice-blue" />
            <span>
              Question {Math.min(currentQuestionIndex + 1, totalQuestions)} of {totalQuestions}
            </span>
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${
              isTimeUp
                ? "bg-danger/10 text-danger border-danger/30 animate-pulse"
                : isLowTime
                ? "bg-warning/10 text-warning border-warning/30 animate-pulse"
                : "bg-surface-2 text-primary-text border-border"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTime}</span>
          </div>

          {/* Integrity Monitoring Status */}
          {integrityEnabled && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
                alertsCount > 0
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
              title="Practice integrity checks tab switches and camera presence locally."
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{alertsCount > 0 ? `${alertsCount} Focus Alert${alertsCount > 1 ? "s" : ""}` : "Focus Clean"}</span>
            </div>
          )}
        </div>

        {/* Right: End Interview */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEndInterview}
            className="border-danger/30 text-danger hover:bg-danger/10 hover:border-danger text-xs px-3 py-1.5"
            leftIcon={<PhoneOff className="w-3.5 h-3.5 text-danger" />}
          >
            <span className="hidden sm:inline">End Interview</span>
            <span className="sm:hidden">End</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
