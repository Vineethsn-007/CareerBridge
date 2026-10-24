"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import { RefreshCw, Sparkles, Quote, ArrowRight } from "lucide-react";
import type {
  PersonaProfileResult,
  PersonaQuestion,
  PersonaStartResponse,
  PersonaTopic,
} from "@/lib/types";

type Phase =
  | { kind: "intro" }
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

const CONFIDENCE_VARIANT = {
  high: "verified",
  medium: "highlight",
  low: "neutral",
} as const;

export default function PersonaPage() {
  const { resume, isHydrated } = useResumeStore();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const start = async () => {
    setPhase({ kind: "loading" });
    setAnswer("");
    try {
      const session: PersonaStartResponse = await api.personaStart({
        resume: resume ?? undefined,
      });
      setPhase({ kind: "question", personaId: session.persona_id, question: session.question });
    } catch (err: unknown) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not start the Q&A. Please try again.",
      });
    }
  };

  const submit = async (personaId: number, question: PersonaQuestion, skip: boolean) => {
    if (!skip && !answer.trim()) return;
    setIsSubmitting(true);
    setPhase({ kind: "question", personaId, question }); // stays on the question while loading
    try {
      const response = await api.personaAnswer({
        persona_id: personaId,
        question,
        answer: skip ? undefined : answer.trim(),
        skip,
      });
      if (response.completed && response.profile) {
        setPhase({ kind: "done", profile: response.profile });
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
  const totalQuestions = phase.kind === "question" ? phase.question.index : 0;

  return (
    <div className="py-10 bg-merino min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Persona Q&A"
          subtitle="Answer a few questions about how you work, in your own words. We turn your answers into an evidence-based profile that personalizes interview practice."
          badge={
            phase.kind === "done" ? (
              <Badge variant={CONFIDENCE_VARIANT[phase.profile.confidence]}>
                {`Confidence: ${phase.profile.confidence}`}
              </Badge>
            ) : (
              <Badge variant="neutral">{resume ? "Resume Linked" : "No Resume Loaded"}</Badge>
            )
          }
          backHref="/resume"
          backLabel="Back to Resume"
        />

        {!isHydrated ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <SkeletonCard />
          </div>
        ) : phase.kind === "intro" ? (
          <Card padding="lg" className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-pale-blue text-venice-blue shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-semibold text-primary-text">
                  Six questions, about five minutes
                </h2>
                <ul className="text-sm text-secondary-text list-disc pl-5 space-y-1">
                  <li>Questions are grounded in your parsed resume skills and projects.</li>
                  <li>Answer in your own words; direct quotes become your profile evidence.</li>
                  <li>Skipping is allowed, but skipped topics carry no evidence.</li>
                </ul>
              </div>
            </div>
            <Button onClick={start} size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="mt-6">
              Start Q&A
            </Button>
          </Card>
        ) : phase.kind === "loading" ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <SkeletonCard />
          </div>
        ) : phase.kind === "error" ? (
          <div className="max-w-2xl mx-auto">
            <ErrorMessage message={phase.message} onRetry={start} isRetrying />
          </div>
        ) : phase.kind === "question" ? (
          <Card variant="elevated" padding="lg" className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <Chip label={TOPIC_LABELS[phase.question.topic] ?? phase.question.topic} variant="highlight" />
              <span className="text-xs text-secondary-text">
                Question {phase.question.index} of 6
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-pale-blue mb-6 overflow-hidden">
              <div
                className="h-full bg-venice-blue rounded-full transition-all duration-500"
                style={{ width: `${(answeredSoFar / Math.max(totalQuestions, 1)) * 100}%` }}
              />
            </div>
            <p className="font-serif text-lg text-primary-text leading-relaxed mb-6">
              {phase.question.question}
            </p>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Describe a specific situation: what you did, your role, and the outcome."
              rows={5}
              className="w-full rounded-md border border-border bg-pure-white px-3.5 py-3 text-sm text-primary-text placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-venice-blue resize-y"
            />
            <div className="flex items-center justify-between gap-3 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => submit(phase.personaId, phase.question, true)}
                disabled={isSubmitting}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Skip this question
              </Button>
              <Button
                onClick={() => submit(phase.personaId, phase.question, false)}
                isLoading={isSubmitting}
                disabled={!answer.trim()}
              >
                Submit answer
              </Button>
            </div>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {phase.profile.summary && (
              <Card padding="lg">
                <h2 className="font-serif text-xl text-deep-teal mb-2">Your working-style profile</h2>
                <p className="text-sm text-secondary-text leading-relaxed">{phase.profile.summary}</p>
              </Card>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {phase.profile.strengths.map((strength) => (
                <Card key={`${strength.topic}-${strength.strength}`} padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-venice-blue shrink-0" />
                    <Chip label={TOPIC_LABELS[strength.topic] ?? strength.topic} variant="default" />
                  </div>
                  <p className="text-sm font-semibold text-primary-text">{strength.strength}</p>
                  {strength.quote && (
                    <p className="mt-2 text-xs text-secondary-text italic leading-relaxed flex gap-1.5">
                      <Quote className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>&ldquo;{strength.quote}&rdquo;</span>
                    </p>
                  )}
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={start} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Restart Q&A
              </Button>
            </div>
          </div>
        )}

        {phase.kind === "intro" && !resume && isHydrated && (
          <div className="max-w-2xl mx-auto mt-6">
            <EmptyState
              title="No resume loaded"
              description="You can answer without one, but uploading your resume first makes questions specific to your actual projects and internships."
              actionLabel="Continue without a resume"
              onAction={start}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
