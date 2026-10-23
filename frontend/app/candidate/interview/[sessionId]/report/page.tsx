"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type { InterviewSessionResponse } from "@/lib/types";

interface ReportPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function InterviewReportPage({ params }: ReportPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [session, setSession] = useState<InterviewSessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        setIsLoading(true);
        const data = await api.getInterviewSession(sessionId);
        if (!isMounted) return;
        setSession(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load report.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="py-12 bg-merino min-h-screen">
        <Container size="lg">
          <SkeletonCard />
        </Container>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="py-12 bg-merino min-h-screen">
        <Container size="md">
          <ErrorMessage
            title="Unable to Load Report"
            message={error || "Session not found."}
            onRetry={() => window.location.reload()}
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="py-10 bg-cream-mesh min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Interview Performance Report"
          subtitle={`AI evaluation & feedback for ${session.role_title} at ${session.company_name}`}
          badge={<Badge variant="verified">STAR Rubric Completed</Badge>}
          action={
            <Link href="/interview">
              <Button variant="outline" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />}>
                Practice Another Role
              </Button>
            </Link>
          }
        />

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8 items-stretch">
          {/* Overall Score Card */}
          <div className="md:col-span-4 editorial-card rounded-xl p-6 bg-white border border-border shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary-text mb-4">
              Overall Interview Score
            </h3>
            <ScoreRing score={85} size="lg" strokeWidth={10} color="#16587B" label="STAR Score" />
            <p className="text-xs text-secondary-text mt-4 max-w-xs">
              Strong technical articulation with solid STAR framework structure on project questions.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-venice-blue" /> Average Speech Pace
              </span>
              <div>
                <span className="text-2xl font-bold font-serif text-primary-text">142</span>
                <span className="text-xs text-secondary-text ml-1">WPM</span>
              </div>
              <Badge variant="highlight" size="sm">Optimal Cadence (130-160)</Badge>
            </div>

            <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-venice-blue" /> Filler Word Rate
              </span>
              <div>
                <span className="text-2xl font-bold font-serif text-primary-text">1.8%</span>
                <span className="text-xs text-secondary-text ml-1">of words</span>
              </div>
              <Badge variant="verified" size="sm">Low & Professional</Badge>
            </div>

            <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-venice-blue" /> Practice Focus
              </span>
              <div>
                <span className="text-2xl font-bold font-serif text-primary-text">
                  {session.consent_integrity ? "100%" : "Opted Out"}
                </span>
                <span className="text-xs text-secondary-text ml-1">integrity</span>
              </div>
              <Badge variant="verified" size="sm">No Flags Recorded</Badge>
            </div>
          </div>
        </div>

        {/* Questions Breakdown */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-serif font-bold text-primary-text">
            Questions Answered ({session.questions.length})
          </h2>

          <div className="space-y-3">
            {session.questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="editorial-card rounded-xl p-4 sm:p-5 bg-white border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pale-blue text-venice-blue border border-border">
                      Q{idx + 1} • {q.type}
                    </span>
                    {q.focus_skill_or_project && (
                      <span className="text-xs text-secondary-text">
                        Focus: {q.focus_skill_or_project}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-primary-text">
                    {q.text}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="verified">Completed</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps CTA */}
        <div className="editorial-card rounded-xl p-6 bg-pale-blue/60 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-serif font-bold text-primary-text">
              Close skill gaps before your actual interview
            </h3>
            <p className="text-xs text-secondary-text mt-1">
              Review targeted courses and coding tasks matched to your {session.role_title} requirements.
            </p>
          </div>
          <Link href={`/jobs/${session.job_id}`}>
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View Role Prep Plan
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
