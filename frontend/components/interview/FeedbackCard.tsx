"use client";

import React, { useState } from "react";
import type { AnswerFeedback, InterviewQuestion } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FeedbackCardProps {
  question: InterviewQuestion;
  userAnswer: string;
  feedback: AnswerFeedback;
  isLastQuestion: boolean;
  onNext: () => void;
}

export function FeedbackCard({
  question,
  userAnswer,
  feedback,
  isLastQuestion,
  onNext,
}: FeedbackCardProps) {
  const [showSample, setShowSample] = useState(false);
  const { score, strengths, improvements, sample_answer } = feedback;

  const scorePercentage = Math.round((score / 10) * 100);

  return (
    <Card variant="default" className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Header with Score Ring */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-border pb-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-secondary-text uppercase">Rubric Evaluation</span>
            {score >= 7 ? (
              <Badge variant="verified">Strong Answer</Badge>
            ) : score >= 4 ? (
              <Badge variant="priority-medium">Good Start</Badge>
            ) : (
              <Badge variant="priority-high">Needs Practice</Badge>
            )}
          </div>
          <h3 className="text-lg font-bold text-deep-teal leading-snug">
            {question.question}
          </h3>
          <p className="text-xs text-secondary-text italic line-clamp-2">
            Your answer: &ldquo;{userAnswer}&rdquo;
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <ScoreRing score={scorePercentage} size="lg" label="Rubric Score" />
        </div>
      </div>

      {/* Strengths & Improvements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Strengths */}
        <div className="space-y-3 p-4 rounded-lg border border-[#18856B]/30 bg-emerald-50">
          <h4 className="text-xs font-bold text-[#18856B] uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#18856B]" />
            <span>Key Strengths:</span>
          </h4>
          {strengths && strengths.length > 0 ? (
            <ul className="space-y-2 text-xs text-primary-text leading-relaxed">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#18856B] font-bold shrink-0">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-secondary-text italic">Clear attempt addressing the question.</p>
          )}
        </div>

        {/* Suggested Improvements */}
        <div className="space-y-3 p-4 rounded-lg border border-[#B87926]/30 bg-amber-50">
          <h4 className="text-xs font-bold text-[#B87926] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#B87926]" />
            <span>How to Improve:</span>
          </h4>
          {improvements && improvements.length > 0 ? (
            <ul className="space-y-2 text-xs text-primary-text leading-relaxed">
              {improvements.map((imp, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#B87926] font-bold shrink-0">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-secondary-text italic">Solid response adhering to rubric guidelines.</p>
          )}
        </div>
      </div>

      {/* Sample / Model Answer Section */}
      {sample_answer && (
        <div className="rounded-lg border border-border bg-pale-blue/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSample(!showSample)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-venice-blue hover:bg-pale-blue transition-colors"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-venice-blue" />
              <span>Recommended Model Answer</span>
            </span>
            {showSample ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSample && (
            <div className="p-4 pt-1 border-t border-border text-xs text-primary-text leading-relaxed bg-pure-white">
              <p>{sample_answer}</p>
            </div>
          )}
        </div>
      )}

      {/* Next Question CTA */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          variant="primary"
          onClick={onNext}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="w-full sm:w-auto shadow-card"
        >
          {isLastQuestion ? "View Performance Summary" : "Next Question"}
        </Button>
      </div>
    </Card>
  );
}
