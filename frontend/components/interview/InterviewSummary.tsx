"use client";

import React from "react";
import Link from "next/link";
import type { InterviewQuestion, AnswerFeedback } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Target,
} from "lucide-react";

interface InterviewSummaryProps {
  questions: InterviewQuestion[];
  answers: string[];
  feedbacks: AnswerFeedback[];
  jobTitle?: string;
  jobId?: string;
  onRestart: () => void;
}

export function InterviewSummary({
  questions,
  answers,
  feedbacks,
  jobTitle = "Software Engineer",
  jobId,
  onRestart,
}: InterviewSummaryProps) {
  // Compute overall average score
  const totalScore = feedbacks.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = feedbacks.length > 0 ? (totalScore / feedbacks.length).toFixed(1) : "0";
  const percentage = Math.round((parseFloat(averageScore) / 10) * 100);

  const getVerdict = (avg: number) => {
    if (avg >= 7.5) {
      return {
        title: "Placement Ready!",
        badge: "verified" as const,
        description: "Your responses demonstrated structured problem-solving, technical depth, and clear communication.",
      };
    }
    if (avg >= 5.0) {
      return {
        title: "Solid Foundation",
        badge: "priority-medium" as const,
        description: "Good conceptual answers. To reach top offers, incorporate the STAR framework and give specific metrics in your examples.",
      };
    }
    return {
      title: "Practice Recommended",
      badge: "priority-high" as const,
      description: "Focus on articulating your thought process step-by-step and reviewing fundamental terminology.",
    };
  };

  const verdict = getVerdict(parseFloat(averageScore));

  return (
    <div className="space-y-8 animate-in fade-in duration-400">
      {/* Top Celebratory Hero Card */}
      <Card variant="default" className="p-8 sm:p-10 relative overflow-hidden bg-surface">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gradient opacity-10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-highlight/15 border border-highlight/30 text-highlight text-xs font-semibold">
              <Trophy className="w-4 h-4 text-highlight" />
              <span>Mock Interview Complete</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {verdict.title}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted max-w-lg leading-relaxed">
                Evaluated against real hiring expectations for <strong className="text-text">{jobTitle}</strong>.
              </p>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              {verdict.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Button
                size="md"
                variant="highlight"
                onClick={onRestart}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="shadow-glow-saffron"
              >
                Practice Again
              </Button>

              {jobId && (
                <Link href={`/jobs/${jobId}`}>
                  <Button
                    size="md"
                    variant="secondary"
                    leftIcon={<Target className="w-4 h-4 text-accent" />}
                  >
                    Review Prep Plan
                  </Button>
                </Link>
              )}

              <Link href="/jobs">
                <Button
                  size="md"
                  variant="ghost"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  All Matches
                </Button>
              </Link>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center p-6 rounded-lg bg-surface-2/60 border border-border">
            <ScoreRing score={percentage} size="lg" label="Average Rubric Score" />
            <span className="text-lg font-bold text-white mt-2">
              {averageScore} <span className="text-xs text-text-muted font-normal">/ 10</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Question-by-Question Detailed Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Question Performance Breakdown ({questions.length})</span>
          </h3>
          <span className="text-xs text-text-muted">Detailed rubric feedback</span>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const fb = feedbacks[idx];
            const ans = answers[idx];
            if (!fb) return null;

            return (
              <Card key={q.id || idx} variant="default" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                      Q{idx + 1}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {q.kind}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted">Rubric Score:</span>
                    <span className="font-bold text-highlight font-mono text-sm">
                      {fb.score}/10
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">
                    {q.question}
                  </h4>
                  <p className="text-xs text-text-muted italic bg-surface-2/40 p-2.5 rounded border border-border/60">
                    &ldquo;{ans}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Strengths:</span>
                    </span>
                    <ul className="space-y-1 text-text-muted pl-4 list-disc">
                      {fb.strengths.map((str, sIdx) => (
                        <li key={sIdx}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Opportunities for Growth:</span>
                    </span>
                    <ul className="space-y-1 text-text-muted pl-4 list-disc">
                      {fb.improvements.map((imp, iIdx) => (
                        <li key={iIdx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
