"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type { ParsedResume, SkillGap, PrepPlan, MissingSkill, Resource } from "@/lib/types";
import {
  Target,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  ArrowRight,
  FileText,
} from "lucide-react";

type LoadState = "idle" | "loading" | "done" | "error";

const PRIORITY_CONFIG = {
  high: { label: "High", badge: "priority-high" as const, dot: "bg-rose-500" },
  medium: { label: "Medium", badge: "priority-medium" as const, dot: "bg-amber-500" },
  low: { label: "Low", badge: "priority-low" as const, dot: "bg-cyan-500" },
};

const KIND_ICONS: Record<string, string> = {
  course: "🎓",
  docs: "📄",
  practice: "💻",
  project: "🚀",
  video: "▶️",
};

function WeekCard({ week, isOpen, onToggle }: {
  week: PrepPlan["weeks"][0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-2/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
            {week.week}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{week.focus}</p>
            <p className="text-xs text-text-muted">{week.tasks.length} tasks · {week.resources.length} resources</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40">
          <div className="pt-3 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tasks</p>
            <ul className="space-y-1.5">
              {week.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                  {task}
                </li>
              ))}
            </ul>
          </div>

          {week.resources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Resources</p>
              <div className="space-y-1.5">
                {week.resources.map((res: Resource, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-base">{KIND_ICONS[res.kind] ?? "📌"}</span>
                    {res.url ? (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline underline-offset-2 flex items-center gap-1"
                      >
                        {res.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-text-muted">{res.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job");

  const [gapState, setGapState] = useState<LoadState>("idle");
  const [planState, setPlanState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("parsedResume");
      if (raw) setParsedResume(JSON.parse(raw) as ParsedResume);
    } catch { /* ignore */ }
  }, []);

  const loadGap = useCallback(async (resume: ParsedResume, jid: string) => {
    setGapState("loading");
    setErrorMsg(null);
    try {
      const data = await api.skillGap({ resume, job_id: jid });
      setGap(data);
      setGapState("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to analyze skill gap.");
      setGapState("error");
    }
  }, []);

  const loadPlan = useCallback(async (skillGap: SkillGap) => {
    setPlanState("loading");
    try {
      const data = await api.prepPlan({ gap: skillGap, weeks: 4, hours_per_week: 8 });
      setPlan(data);
      setPlanState("done");
    } catch {
      setPlanState("error");
    }
  }, []);

  useEffect(() => {
    if (parsedResume && jobId) {
      loadGap(parsedResume, jobId);
    }
  }, [parsedResume, jobId, loadGap]);

  useEffect(() => {
    if (gap) loadPlan(gap);
  }, [gap, loadPlan]);

  const toggleWeek = (week: number) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const noResume = !parsedResume;
  const noJob = !jobId;

  return (
    <div className="min-h-screen bg-mesh py-10">
      <Container size="lg">
        <PageHeader
          title="Skill Gap Analysis"
          subtitle={gap ? `${gap.job_title} — see exactly which skills stand between you and the offer.` : "Identify missing skills and get a week-by-week prep plan."}
          backHref="/jobs"
          backLabel="Jobs"
          badge={
            gap ? (
              <Badge variant={gap.coverage_pct >= 70 ? "verified" : gap.coverage_pct >= 40 ? "priority-medium" : "priority-high"}>
                {Math.round(gap.coverage_pct)}% Match
              </Badge>
            ) : undefined
          }
          action={
            gap && (
              <Button
                size="sm"
                variant="highlight"
                rightIcon={<MessageSquare className="w-4 h-4" />}
                onClick={() => router.push(`/interview?job=${encodeURIComponent(jobId!)}`)}
              >
                Practice Interview
              </Button>
            )
          }
        />

        {/* No resume / job state */}
        {(noResume || noJob) && gapState === "idle" && (
          <EmptyState
            icon={noResume ? <FileText className="w-6 h-6" /> : <Target className="w-6 h-6" />}
            title={noResume ? "No resume uploaded" : "No job selected"}
            description={noResume ? "Upload your resume first so CareerBridge can measure your skill fit against this role." : "Select a job from the job listings to analyse your skill gap."}
            actionLabel={noResume ? "Upload Resume" : "Browse Jobs"}
            onAction={() => router.push(noResume ? "/resume" : "/jobs")}
          />
        )}

        {/* Error */}
        {gapState === "error" && errorMsg && (
          <ErrorMessage message={errorMsg} onRetry={() => parsedResume && jobId && loadGap(parsedResume, jobId)} />
        )}

        {/* Loading */}
        {gapState === "loading" && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Gap result */}
        {gapState === "done" && gap && (
          <div className="space-y-8">
            {/* Coverage meter */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Role Fit Score</h2>
              </div>
              <Meter
                value={gap.coverage_pct}
                label={`${Math.round(gap.coverage_pct)}% of required skills covered`}
                variant={gap.coverage_pct >= 70 ? "success" : gap.coverage_pct >= 40 ? "warning" : "danger"}
                size="lg"
              />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <p className="text-xs font-semibold text-text-muted uppercase">You have</p>
                  <p className="text-2xl font-bold text-emerald-400">{gap.matched.length}</p>
                  <p className="text-xs text-text-muted">matched skills</p>
                </div>
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <p className="text-xs font-semibold text-text-muted uppercase">You need</p>
                  <p className="text-2xl font-bold text-rose-400">{gap.missing.length}</p>
                  <p className="text-xs text-text-muted">missing skills</p>
                </div>
              </div>
            </Card>

            {/* Matched skills */}
            {gap.matched.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Skills You Already Have</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gap.matched.map((skill) => (
                    <Chip key={skill} label={skill} variant="matched" />
                  ))}
                </div>
              </Card>
            )}

            {/* Missing skills */}
            {gap.missing.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Skills to Learn</h2>
                </div>
                <div className="space-y-3">
                  {gap.missing.map((ms: MissingSkill) => {
                    const cfg = PRIORITY_CONFIG[ms.priority];
                    return (
                      <div key={ms.skill} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/50 border border-border/40">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text">{ms.skill}</span>
                            <Badge variant={cfg.badge} size="sm" showIcon={false}>{cfg.label} Priority</Badge>
                          </div>
                          <p className="text-xs text-text-muted leading-relaxed">{ms.why}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Prep plan */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-highlight" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">4-Week Prep Plan</h2>
                {planState === "loading" && (
                  <span className="text-xs text-text-muted animate-pulse">Generating plan...</span>
                )}
              </div>

              {planState === "loading" && (
                <div className="space-y-3">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              )}

              {planState === "done" && plan && (
                <div className="space-y-3">
                  {plan.weeks.map((week) => (
                    <WeekCard
                      key={week.week}
                      week={week}
                      isOpen={openWeeks.has(week.week)}
                      onToggle={() => toggleWeek(week.week)}
                    />
                  ))}
                </div>
              )}

              {planState === "error" && (
                <div className="p-4 rounded-lg bg-surface-2 border border-border text-sm text-text-muted flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-highlight shrink-0" />
                  Could not generate prep plan. Focus on the missing skills listed above.
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="pb-8">
              <Button
                id="practice-interview-btn"
                size="lg"
                variant="highlight"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => router.push(`/interview?job=${encodeURIComponent(jobId!)}`)}
                className="shadow-glow-saffron"
              >
                Practice Mock Interview for This Role
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10 bg-mesh min-h-screen">
          <Container size="xl">
            <SkeletonCard />
          </Container>
        </div>
      }
    >
      <SkillsContent />
    </Suspense>
  );
}
