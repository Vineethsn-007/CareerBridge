"use client";

import React, { useState } from "react";
import type { InterviewQuestion } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  Send,
  Lightbulb,
} from "lucide-react";

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
  total: number;
  onSubmitAnswer: (answer: string) => void;
  isEvaluating?: boolean;
}

export function QuestionCard({
  question,
  index,
  total,
  onSubmitAnswer,
  isEvaluating = false,
}: QuestionCardProps) {
  const [answer, setAnswer] = useState("");
  const [showStarGuide, setShowStarGuide] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !isEvaluating) {
      onSubmitAnswer(answer.trim());
    }
  };

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case "technical":
        return <Badge variant="priority-low">Technical</Badge>;
      case "behavioural":
        return <Badge variant="highlight">Behavioral (STAR)</Badge>;
      case "hr":
        return <Badge variant="verified">HR & Culture</Badge>;
      default:
        return <Badge variant="neutral">{kind}</Badge>;
    }
  };

  return (
    <Card variant="default" className="p-6 sm:p-8 space-y-6">
      {/* Top Header: Progress & Category */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-venice-blue px-2.5 py-1 rounded bg-pale-blue border border-border">
            Question {index + 1} of {total}
          </span>
          {getKindBadge(question.kind)}
        </div>

        {question.focus_skill && (
          <div className="flex items-center gap-1.5 text-xs text-secondary-text">
            <span>Target Skill:</span>
            <Chip label={question.focus_skill} variant="highlight" />
          </div>
        )}
      </div>

      {/* Prominent Question Statement */}
      <div className="space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-deep-teal leading-relaxed">
          &ldquo;{question.question}&rdquo;
        </h3>
        <p className="text-xs text-secondary-text">
          Take a moment to formulate your thoughts. Clear, structured answers earn higher rubric scores.
        </p>
      </div>

      {/* STAR Framework Toggle Helper */}
      <div className="rounded-lg border border-border bg-pale-blue/60 p-3.5 space-y-2">
        <button
          type="button"
          onClick={() => setShowStarGuide(!showStarGuide)}
          className="flex items-center gap-2 text-xs font-semibold text-venice-blue hover:underline"
        >
          <Lightbulb className="w-3.5 h-3.5 text-venice-blue" />
          <span>{showStarGuide ? "Hide STAR Method Guidance" : "Need help structuring? View STAR Method Guide"}</span>
        </button>

        {showStarGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-secondary-text border-t border-border">
            <div className="p-2 rounded bg-pure-white border border-border">
              <strong className="text-venice-blue font-semibold">Situation:</strong> Set the context of a project or challenge.
            </div>
            <div className="p-2 rounded bg-pure-white border border-border">
              <strong className="text-venice-blue font-semibold">Task:</strong> Explain your specific role and objective.
            </div>
            <div className="p-2 rounded bg-pure-white border border-border">
              <strong className="text-venice-blue font-semibold">Action:</strong> Detail the steps, technologies, and decisions you took.
            </div>
            <div className="p-2 rounded bg-pure-white border border-border">
              <strong className="text-venice-blue font-semibold">Result:</strong> Share measurable outcomes, lessons learned, and metrics.
            </div>
          </div>
        )}
      </div>

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Your Response"
          placeholder="Type your structured answer here (Ctrl + Enter to submit)..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isEvaluating}
          className="min-h-[140px] text-sm"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              handleSubmit(e);
            }
          }}
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-text">
            {answer.trim().split(/\s+/).filter(Boolean).length} words
          </span>

          <Button
            type="submit"
            size="md"
            variant="primary"
            isLoading={isEvaluating}
            disabled={!answer.trim()}
            rightIcon={<Send className="w-4 h-4" />}
          >
            Submit Answer
          </Button>
        </div>
      </form>
    </Card>
  );
}
