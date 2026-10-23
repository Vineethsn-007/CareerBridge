"use client";

import React from "react";
import { Check, SkipForward, RotateCcw, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ClientQuestion } from "@/lib/types";

interface QuestionProgressCardProps {
  question: ClientQuestion;
  index: number;
  total: number;
  onDoneSpeaking: () => void;
  onSkip: () => void;
  onRepeatQuestion?: () => void;
  isAvatarSpeaking?: boolean;
}

export function QuestionProgressCard({
  question,
  index,
  total,
  onDoneSpeaking,
  onSkip,
  onRepeatQuestion,
  isAvatarSpeaking = false,
}: QuestionProgressCardProps) {
  const isLast = index + 1 >= total;

  // Format kind label
  const typeLabels: Record<string, string> = {
    warmup: "Warmup & Icebreaker",
    project: "Resume Project Deep-Dive",
    technical: "Core Technical Question",
    behavioural: "STAR Behavioral Scenario",
    closing: "Candidate Questions & Closing",
  };

  const difficultyVariants: Record<string, "verified" | "highlight" | "neutral"> = {
    easy: "highlight",
    medium: "neutral",
    hard: "verified",
  };

  return (
    <div className="editorial-card rounded-xl p-4 sm:p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
      {/* Top Meta Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-venice-blue px-2 py-0.5 rounded bg-pale-blue border border-border">
              Question {index + 1} of {total}
            </span>
            <span className="text-xs text-secondary-text font-medium">
              {typeLabels[question.type] || question.type}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant={difficultyVariants[question.difficulty] || "neutral"}>
              {question.difficulty.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Question Text */}
        <h2 className="text-base sm:text-lg font-serif font-bold text-primary-text leading-snug mb-3">
          {question.text}
        </h2>

        {/* Focus Skill / Context and Time Guide */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-text mb-4">
          {question.focus_skill_or_project && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-2 text-primary-text border border-border-subtle text-[11px] font-medium">
              <Sparkles className="w-3 h-3 text-venice-blue" />
              Focus: {question.focus_skill_or_project}
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-muted text-secondary-text border border-border-subtle text-[11px]">
            <Clock className="w-3 h-3 text-secondary-text" />
            Recommended: ~{Math.round((question.time_guide_seconds || 120) / 60)} min
          </span>
        </div>
      </div>

      {/* Sync Action Buttons */}
      <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onRepeatQuestion && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRepeatQuestion}
              disabled={isAvatarSpeaking}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Repeat
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={isAvatarSpeaking || isLast}
            leftIcon={<SkipForward className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {isLast ? "Final Question" : "Skip"}
          </Button>
        </div>

        {/* Primary Sync: Done Speaking */}
        <Button
          variant="primary"
          size="sm"
          onClick={onDoneSpeaking}
          disabled={isAvatarSpeaking}
          leftIcon={<Check className="w-4 h-4" />}
          className="text-xs px-4 py-2 font-semibold shadow-sm"
        >
          {isLast ? "Done Speaking (Finish)" : "Done Speaking (Next)"}
        </Button>
      </div>
    </div>
  );
}
