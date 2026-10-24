"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import {
  Sparkles,
  Quote,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Brain,
  ShieldCheck,
  Send,
  SkipForward,
} from "lucide-react";
import type {
  ParsedResume,
  PersonaProfileResult,
  PersonaQuestion,
  PersonaStartResponse,
  PersonaTopic,
} from "@/lib/types";

interface PersonaQnASectionProps {
  resume: ParsedResume;
  existingProfile?: PersonaProfileResult | null;
  onProfileComplete: (profile: PersonaProfileResult) => void;
  onAnswerRecorded?: (record: { topic: PersonaTopic; question: string; answer: string }) => void;
  onProceedToJobs?: () => void;
  autoStart?: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "question"; personaId: number; question: PersonaQuestion }
  | { kind: "done"; profile: PersonaProfileResult }
  | { kind: "error"; message: string };

const TOPIC_LABELS: Record<PersonaTopic, string> = {
  leadership: "Leadership",
  teamwork: "Teamwork",
  ownership: "Ownership",
  communication: "Communication",
  initiative: "Initiative",
  "learning agility": "Learning Agility",
};

const TOPIC_HINTS: Record<PersonaTopic, string> = {
  leadership: "e.g., Led a sprint, mentored peers, unblocked a teammate, or championed a tech decision.",
  teamwork: "e.g., Resolved a technical disagreement, collaborated across teams, or conducted peer code reviews.",
  ownership: "e.g., Took end-to-end accountability for a buggy production issue or a critical delivery.",
  communication: "e.g., Explained complex system design to non-tech peers or documented key API specs.",
  initiative: "e.g., Identified a bottleneck, researched a tool, and introduced it without being asked.",
  "learning agility": "e.g., Quickly learned an unfamiliar language/framework to ship a deadline project.",
};

const CONFIDENCE_VARIANT = {
  high: "verified",
  medium: "highlight",
  low: "neutral",
} as const;

export function PersonaQnASection({
  resume,
  existingProfile,
  onProfileComplete,
  onAnswerRecorded,
  onProceedToJobs,
  autoStart = false,
}: PersonaQnASectionProps) {
  const [phase, setPhase] = useState<Phase>(() =>
    existingProfile ? { kind: "done", profile: existingProfile } : { kind: autoStart ? "loading" : "idle" }
  );
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const start = React.useCallback(async () => {
    setPhase({ kind: "loading" });
    setAnswer("");
    try {
      const session: PersonaStartResponse = await api.personaStart({
        resume,
      });
      setPhase({ kind: "question", personaId: session.persona_id, question: session.question });
    } catch (err: unknown) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not start the Persona Q&A. Please try again.",
      });
    }
  }, [resume]);

  // Auto-start if requested and not done
  React.useEffect(() => {
    if (autoStart && !existingProfile && phase.kind === "loading") {
      start();
    }
  }, [autoStart, existingProfile, phase.kind, start]);

  const submit = async (personaId: number, question: PersonaQuestion, skip: boolean) => {
    if (!skip && !answer.trim()) return;
    setIsSubmitting(true);
    const submittedAnswer = answer.trim();

    try {
      const response = await api.personaAnswer({
        persona_id: personaId,
        question,
        answer: skip ? undefined : submittedAnswer,
        skip,
      });

      if (!skip && submittedAnswer && onAnswerRecorded) {
        onAnswerRecorded({
          topic: question.topic,
          question: question.question,
          answer: submittedAnswer,
        });
      }

      if (response.completed && response.profile) {
        setPhase({ kind: "done", profile: response.profile });
        onProfileComplete(response.profile);
      } else if (response.question) {
        setPhase({ kind: "question", personaId, question: response.question });
        setAnswer("");
      }
    } catch (err: unknown) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not submit your answer. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredSoFar = phase.kind === "question" ? phase.question.index - 1 : 0;
  const currentQuestionIdx = phase.kind === "question" ? phase.question.index : 0;

  return (
    <div id="persona-section" className="w-full space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-venice-blue/30 bg-gradient-to-r from-pale-blue/60 via-pure-white to-pale-blue/30 shadow-subtle">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-venice-blue text-white flex items-center justify-center shrink-0 shadow-sm">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-deep-teal">
                Step 2: Persona Working-Style Q&A
              </h3>
              <Badge variant={phase.kind === "done" ? "verified" : "highlight"} size="sm">
                {phase.kind === "done" ? "Persona Completed ✓" : "Mandatory for Matching"}
              </Badge>
            </div>
            <p className="text-xs text-secondary-text mt-0.5">
              Grounded in your parsed resume. Builds evidence of your working style so AI matches jobs and tailors mock interviews accurately.
            </p>
          </div>
        </div>

        {phase.kind === "done" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={start}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Re-take Q&A
            </Button>
            {onProceedToJobs ? (
              <Button
                size="sm"
                variant="primary"
                onClick={onProceedToJobs}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="shadow-sm"
              >
                Proceed to Job Search
              </Button>
            ) : (
              <Link href="/jobs" className="inline-flex">
                <Button
                  size="sm"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="shadow-sm"
                >
                  Proceed to Job Search
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {phase.kind === "idle" && (
        <Card variant="elevated" padding="lg" className="border-l-4 border-l-venice-blue">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-pale-blue text-venice-blue shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-primary-text">
                  6 Questions Grounded in Your Resume (~3-5 minutes)
                </h4>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Now that your resume is parsed, our AI generates 6 targeted behavioral and problem-solving questions based on your projects, technologies, and academic background. Your answers provide verified evidence for job fit scoring and interview simulation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-secondary-text">
              <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-venice-blue shrink-0" />
                <span>Leadership & Initiative</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#18856B] shrink-0" />
                <span>Teamwork & Ownership</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-venice-blue shrink-0" />
                <span>Learning Agility</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-secondary-text italic">
                * Answering in your own words creates direct quote evidence for your profile.
              </span>
              <Button
                onClick={start}
                size="md"
                variant="primary"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-sm"
              >
                Start Persona Q&A (Required)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {phase.kind === "loading" && (
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      )}

      {phase.kind === "error" && (
        <ErrorMessage message={phase.message} onRetry={start} isRetrying={false} />
      )}

      {phase.kind === "question" && (
        <Card variant="elevated" padding="lg" className="space-y-5 border-t-4 border-t-venice-blue">
          {/* Progress & Topic */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Chip
                label={TOPIC_LABELS[phase.question.topic] ?? phase.question.topic}
                variant="highlight"
              />
              <span className="text-xs text-secondary-text">
                Question {currentQuestionIdx} of 6
              </span>
            </div>
            <span className="text-[11px] text-muted-text font-medium">
              {answeredSoFar} answered • {6 - answeredSoFar} remaining
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-pale-blue overflow-hidden">
            <div
              className="h-full bg-venice-blue rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(answeredSoFar / 6) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-2 py-1">
            <h4 className="font-serif text-lg text-primary-text leading-relaxed">
              &ldquo;{phase.question.question}&rdquo;
            </h4>
            <p className="text-xs text-secondary-text italic">
              Tip: {TOPIC_HINTS[phase.question.topic] || "Describe what you did, your specific contribution, and the outcome."}
            </p>
          </div>

          {/* Answer Input */}
          <div className="space-y-2">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Describe a real situation — what you did, your role, and the outcome. (Direct quotes will back up your verified profile strengths)"
              rows={4}
              className="w-full rounded-md border border-border bg-pure-white px-3.5 py-3 text-sm text-primary-text placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-venice-blue resize-y transition-all"
            />
            <div className="flex justify-between items-center text-[11px] text-secondary-text">
              <span>{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Answer in your own natural voice</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => submit(phase.personaId, phase.question, true)}
              disabled={isSubmitting}
              leftIcon={<SkipForward className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
            >
              Skip this question
            </Button>
            <Button
              onClick={() => submit(phase.personaId, phase.question, false)}
              isLoading={isSubmitting}
              disabled={!answer.trim()}
              size="md"
              variant="primary"
              rightIcon={<Send className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto shadow-sm"
            >
              Submit Answer & Continue
            </Button>
          </div>
        </Card>
      )}

      {phase.kind === "done" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary & Confidence Card */}
          <Card padding="lg" className="bg-gradient-to-br from-pale-blue/30 via-pure-white to-pure-white border-venice-blue/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#18856B]" />
                <h4 className="font-serif text-lg font-bold text-deep-teal">
                  Verified Working-Style Profile
                </h4>
              </div>
              <Badge variant={CONFIDENCE_VARIANT[phase.profile.confidence]} size="sm">
                Confidence: {phase.profile.confidence.toUpperCase()}
              </Badge>
            </div>

            {phase.profile.summary && (
              <p className="text-sm text-primary-text leading-relaxed mt-2">
                {phase.profile.summary}
              </p>
            )}
          </Card>

          {/* Strengths Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {phase.profile.strengths.map((strength) => (
              <Card key={`${strength.topic}-${strength.strength}`} padding="md" className="space-y-2 border border-border/70 hover:border-venice-blue/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-venice-blue shrink-0" />
                    <Chip label={TOPIC_LABELS[strength.topic] ?? strength.topic} variant="default" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary-text">
                  {strength.strength}
                </p>
                {strength.quote && (
                  <p className="text-xs text-secondary-text italic leading-relaxed flex gap-1.5 bg-pale-blue/40 p-2.5 rounded border border-border/40">
                    <Quote className="w-3 h-3 text-venice-blue shrink-0 mt-0.5" />
                    <span>&ldquo;{strength.quote}&rdquo;</span>
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Next Step Banner: Unlocks Job Matching */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-venice-blue/10 via-pale-blue/40 to-pure-white border border-venice-blue/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="verified" size="sm">Step 2 Complete ✓</Badge>
                <h5 className="text-sm font-bold text-deep-teal">
                  AI Job Search Unlocked with Enriched Persona Insights
                </h5>
              </div>
              <p className="text-xs text-secondary-text">
                Robin and our matching engine now evaluate listings using both your verified technical skills and behavioral working-style strengths.
              </p>
            </div>
            {onProceedToJobs ? (
              <Button
                size="lg"
                variant="primary"
                onClick={onProceedToJobs}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-card shrink-0"
              >
                Find Matching Jobs (Step 3)
              </Button>
            ) : (
              <Link href="/jobs" className="w-full sm:w-auto shrink-0">
                <Button
                  size="lg"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-card"
                >
                  Find Matching Jobs (Step 3)
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
