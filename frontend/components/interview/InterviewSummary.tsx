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
      <Card variant="default" className="p-8 sm:p-10 relative overflow-hidden bg-pure-white shadow-card">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pale-blue border border-border text-venice-blue text-xs font-semibold">
              <Trophy className="w-4 h-4 text-venice-blue" />
              <span>Mock Interview Complete</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-deep-teal">
                {verdict.title}
              </h2>
              <p className="text-xs sm:text-sm text-secondary-text max-w-lg leading-relaxed">
                Evaluated against real hiring expectations for <strong className="text-primary-text">{jobTitle}</strong>.
              </p>
            </div>

            <p className="text-xs text-secondary-text leading-relaxed">
              {verdict.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Button
                size="md"
                variant="secondary"
                onClick={onRestart}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Practice Again
              </Button>

              {jobId && (
                <Link href={`/jobs/${jobId}`}>
                  <Button
                    size="md"
                    variant="primary"
                    leftIcon={<Target className="w-4 h-4" />}
                  >
                    Review Prep Plan
                  </Button>
                </Link>
              )}

              <Link href="/jobs">
                <Button size="md" variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Browse Matches
                </Button>
              </Link>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2 border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-10">
            <ScoreRing score={percentage} size="lg" strokeWidth={5} />
            <span className="text-xs font-bold text-deep-teal">
              {averageScore} / 10 Average Score
            </span>
            <Badge variant={verdict.badge} size="sm">
              {verdict.title}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Question-by-Question Detailed Review Accordion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-serif font-bold text-deep-teal flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-venice-blue" />
            <span>Question-by-Question Evaluation Breakdown</span>
          </h3>
          <span className="text-xs text-secondary-text">
            {feedbacks.length} Questions Evaluated
          </span>
        </div>

        <div className="space-y-4">
          {feedbacks.map((fb, idx) => {
            const q = questions[idx];
            const answer = answers[idx];
            return (
              <Card key={idx} variant="default" className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-mono text-secondary-text">
                      Question {idx + 1} • {q ? q.kind.toUpperCase() : "GENERAL"}
                    </span>
                    <h4 className="text-sm font-bold text-deep-teal">
                      {q ? q.question : `Interview Question ${idx + 1}`}
                    </h4>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-sm font-bold text-deep-teal font-mono">
                      {fb.score} / 10
                    </span>
                    <Badge
                      variant={fb.score >= 7 ? "verified" : fb.score >= 4 ? "priority-medium" : "priority-high"}
                      size="sm"
                    >
                      {fb.score >= 7 ? "Strong" : fb.score >= 4 ? "Average" : "Needs Work"}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-pale-blue/40 border border-border text-xs text-secondary-text">
                  <strong className="text-primary-text block mb-0.5">Your Response:</strong>
                  <p className="italic">{answer || "No response recorded."}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50 border border-[#18856B]/20">
                    <span className="font-semibold text-[#18856B] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Strengths:
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-primary-text">
                      {fb.strengths && fb.strengths.length > 0 ? (
                        fb.strengths.map((s, sIdx) => <li key={sIdx}>{s}</li>)
                      ) : (
                        <li>Clear response addressing the problem.</li>
                      )}
                    </ul>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg bg-amber-50 border border-[#B87926]/20">
                    <span className="font-semibold text-[#B87926] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Areas for Improvement:
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-primary-text">
                      {fb.improvements && fb.improvements.length > 0 ? (
                        fb.improvements.map((im, imIdx) => <li key={imIdx}>{im}</li>)
                      ) : (
                        <li>Incorporate specific metrics and project outcomes.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {fb.sample_answer && (
                  <div className="p-3.5 rounded-lg bg-pale-blue border border-border text-xs text-primary-text">
                    <span className="font-bold text-deep-teal block mb-1">
                      Model Answer Breakdown:
                    </span>
                    <p className="leading-relaxed">{fb.sample_answer}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
