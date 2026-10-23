"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Award,
  Video,
  Eye,
  Info,
} from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type { InterviewReport } from "@/lib/types";

interface ReportPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function InterviewReportPage({ params }: ReportPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expandable question cards state
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({
    q1: true,
  });

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      try {
        setIsLoading(true);
        const data = await api.getInterviewReport(sessionId);
        if (!isMounted) return;
        setReport(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load interview report.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const toggleQuestion = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleDeleteData = async () => {
    try {
      setIsDeleting(true);
      await api.deleteInterviewData(sessionId);
      setIsDeleted(true);
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete interview data.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 bg-merino min-h-screen">
        <Container size="lg">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </Container>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="py-16 bg-cream-mesh min-h-screen flex items-center justify-center">
        <Container size="md">
          <div className="editorial-card rounded-2xl p-8 bg-white border border-border shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif font-bold text-primary-text">
              Interview Data Permanently Deleted
            </h2>
            <p className="text-sm text-secondary-text max-w-md mx-auto">
              In accordance with your privacy preferences and data governance policies, your audio/video recording references, transcripts, perception observations, and scorecard have been completely purged.
            </p>
            <div className="pt-4">
              <Link href="/interview">
                <Button variant="primary">Practice Another Interview</Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="py-12 bg-merino min-h-screen">
        <Container size="md">
          <ErrorMessage
            title="Unable to Load Report"
            message={error || "Report not found."}
            onRetry={() => window.location.reload()}
          />
        </Container>
      </div>
    );
  }

  const getReadinessBadgeVariant = (readiness: string) => {
    if (readiness === "Ready") return "verified";
    if (readiness === "Nearly Ready") return "highlight";
    return "priority-medium";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 6.0) return "text-amber-800 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  };

  return (
    <div className="py-10 bg-cream-mesh min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Interview Performance Report"
          subtitle={`Personalized evaluation for ${report.role_title} at ${report.company_name}`}
          badge={
            <Badge variant={getReadinessBadgeVariant(report.readiness_level)}>
              {report.readiness_level}
            </Badge>
          }
          action={
            <div className="flex items-center gap-3">
              <Link href="/interview">
                <Button variant="outline" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />}>
                  Practice Again
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-rose-700 hover:bg-rose-50 border-rose-200"
                leftIcon={<Trash2 className="w-4 h-4 text-rose-600" />}
              >
                Delete My Data
              </Button>
            </div>
          }
        />

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8 items-stretch">
          {/* Overall Score Card */}
          <div className="md:col-span-4 editorial-card rounded-2xl p-6 bg-white border border-border shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary-text mb-4">
              Overall Interview Score
            </h3>
            <ScoreRing
              score={report.overall_score}
              size="lg"
              strokeWidth={10}
              label={report.readiness_level}
            />
            <div className="mt-4 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
                Readiness: {report.readiness_level}
              </span>
              <p className="text-xs text-secondary-text max-w-xs leading-relaxed">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Quick Communication Metrics */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-venice-blue" /> Average Speaking Pace
              </span>
              <div>
                <span className="text-2xl font-bold font-serif text-primary-text">
                  {Math.round(report.communication_metrics.words_per_minute)}
                </span>
                <span className="text-xs text-secondary-text ml-1">WPM</span>
              </div>
              <Badge
                variant={
                  report.communication_metrics.words_per_minute >= 120 &&
                  report.communication_metrics.words_per_minute <= 165
                    ? "verified"
                    : "highlight"
                }
                size="sm"
              >
                {report.communication_metrics.words_per_minute >= 120 &&
                report.communication_metrics.words_per_minute <= 165
                  ? "Optimal Cadence (120-165)"
                  : "Needs Pacing Adjustment"}
              </Badge>
            </div>

            <div className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-venice-blue" /> Filler Word Rate
              </span>
              <div>
                <span className="text-2xl font-bold font-serif text-primary-text">
                  {report.communication_metrics.filler_percentage}%
                </span>
                <span className="text-xs text-secondary-text ml-1">
                  ({report.communication_metrics.filler_word_count} total)
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(report.communication_metrics.filler_breakdown || {}).map(
                  ([filler, count]) =>
                    count > 0 ? (
                      <span
                        key={filler}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-pale-blue text-secondary-text font-mono border border-border"
                      >
                        {filler}: {count}
                      </span>
                    ) : null
                )}
              </div>
            </div>

            <div className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between">
              <span className="text-xs text-secondary-text font-medium flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-venice-blue" /> Delivery Dimensions
              </span>
              <div className="space-y-1.5 my-1 text-xs text-secondary-text">
                <div className="flex justify-between">
                  <span>Clarity:</span>
                  <span className="font-semibold text-primary-text">
                    {report.communication_metrics.clarity_score}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Conciseness:</span>
                  <span className="font-semibold text-primary-text">
                    {report.communication_metrics.conciseness_score}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>STAR Structure:</span>
                  <span className="font-semibold text-primary-text">
                    {report.communication_metrics.star_structure_score}/10
                  </span>
                </div>
              </div>
              <Badge variant="verified" size="sm">
                Confidence: {report.communication_metrics.confidence_score}/10
              </Badge>
            </div>
          </div>
        </div>

        {/* Top Strengths and Priority Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="editorial-card rounded-2xl p-6 bg-white border border-border shadow-sm">
            <h3 className="text-sm font-serif font-bold text-primary-text flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Standout Strengths
            </h3>
            <ul className="space-y-3">
              {report.top_strengths.map((str, idx) => (
                <li
                  key={idx}
                  className="text-xs text-primary-text flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="editorial-card rounded-2xl p-6 bg-white border border-border shadow-sm">
            <h3 className="text-sm font-serif font-bold text-primary-text flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> High-Impact Improvements
            </h3>
            <ul className="space-y-3">
              {report.top_improvements.map((imp, idx) => (
                <li
                  key={idx}
                  className="text-xs text-primary-text flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/60 border border-amber-100"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Optional Presentation & Integrity Cues (Consent-governed) */}
        {(report.presentation_cues || report.integrity_summary) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {report.presentation_cues && (
              <div className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="w-4 h-4 text-venice-blue" />
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary-text">
                    Presentation Cues (Informational Suggestions)
                  </h3>
                </div>
                <ul className="space-y-2">
                  {report.presentation_cues.map((cue, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-secondary-text flex items-start gap-2 leading-relaxed"
                    >
                      <Eye className="w-3.5 h-3.5 text-venice-blue shrink-0 mt-0.5" />
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.integrity_summary && (
              <div className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-venice-blue" />
                    <h3 className="text-xs uppercase tracking-wider font-semibold text-secondary-text">
                      Integrity Audit Summary
                    </h3>
                  </div>
                  <Badge variant="verified" size="sm">
                    {report.integrity_summary.integrity_score}% Score
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-xs text-secondary-text">
                  {report.integrity_summary.flags.map((flag, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-venice-blue shrink-0" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Questions Breakdown Section */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-primary-text">
              Detailed Question-by-Question Rubric ({report.question_evaluations.length})
            </h2>
            <span className="text-xs text-secondary-text">
              Scored against hidden job-specific rubric points & STAR framework
            </span>
          </div>

          <div className="space-y-4">
            {report.question_evaluations.map((q, idx) => {
              const isExpanded = !!expandedQuestions[q.question_id || `q${idx + 1}`];
              const qKey = q.question_id || `q${idx + 1}`;

              return (
                <div
                  key={qKey}
                  className="editorial-card rounded-2xl bg-white border border-border shadow-sm overflow-hidden transition-all"
                >
                  {/* Card Header (Clickable to toggle) */}
                  <button
                    type="button"
                    onClick={() => toggleQuestion(qKey)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-pale-blue/30 transition-colors"
                  >
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pale-blue text-venice-blue border border-border">
                          Q{idx + 1} • {q.question_type} • {q.difficulty}
                        </span>
                        {q.focus_skill_or_project && (
                          <span className="text-xs font-medium text-secondary-text">
                            Focus: {q.focus_skill_or_project}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-primary-text pt-0.5">
                        {q.question_text}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getScoreColor(
                          q.score
                        )}`}
                      >
                        {q.score} / 10
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-secondary-text" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-secondary-text" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-5 border-t border-border bg-pale-blue/10 space-y-5">
                      {/* Candidate Answer Quote */}
                      {q.candidate_answer ? (
                        <div className="p-4 rounded-xl bg-white border border-border space-y-1.5">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-venice-blue" /> Candidate Transcript
                          </span>
                          <p className="text-xs text-primary-text italic font-serif leading-relaxed">
                            &ldquo;{q.candidate_answer}&rdquo;
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                          Question was skipped or no answer was recorded.
                        </div>
                      )}

                      {/* Rubric Points: Covered vs Missed */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Rubric Points Covered ({q.covered_points.length})
                          </span>
                          <ul className="space-y-1.5">
                            {q.covered_points.length > 0 ? (
                              q.covered_points.map((pt, pIdx) => (
                                <li
                                  key={pIdx}
                                  className="text-xs text-primary-text flex items-start gap-2 leading-relaxed"
                                >
                                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-secondary-text italic">
                                None of the expected core points were addressed.
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Rubric Points Missed ({q.missed_points.length})
                          </span>
                          <ul className="space-y-1.5">
                            {q.missed_points.length > 0 ? (
                              q.missed_points.map((pt, pIdx) => (
                                <li
                                  key={pIdx}
                                  className="text-xs text-primary-text flex items-start gap-2 leading-relaxed"
                                >
                                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-emerald-700 font-medium">
                                Comprehensive coverage; all key rubric points met!
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Feedback Improvements */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
                            Feedback & Strengths
                          </span>
                          <ul className="space-y-1">
                            {q.strengths.map((st, sIdx) => (
                              <li key={sIdx} className="text-xs text-secondary-text flex items-start gap-2">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span>{st}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-border space-y-2">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
                            Actionable Guidance
                          </span>
                          <ul className="space-y-1">
                            {q.improvements.map((imp, iIdx) => (
                              <li key={iIdx} className="text-xs text-secondary-text flex items-start gap-2">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Model Exemplary Answer */}
                      {q.sample_answer && (
                        <div className="p-4 rounded-xl bg-pale-blue/60 border border-rock-blue/30 space-y-1.5">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-venice-blue flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-venice-blue" /> Exemplary Model Response
                          </span>
                          <p className="text-xs text-primary-text leading-relaxed">
                            {q.sample_answer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actionable Next Steps / Curated Roadmap */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-primary-text">
              Targeted Next Steps & Roadmap
            </h2>
            <span className="text-xs text-secondary-text">
              Hand-curated, verified resources mapped to your skill gaps
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {report.next_steps.map((step, idx) => (
              <div
                key={idx}
                className="editorial-card rounded-2xl p-5 bg-white border border-border shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-venice-blue px-2 py-0.5 rounded bg-pale-blue border border-border">
                      {step.skill}
                    </span>
                    <span className="text-[10px] text-secondary-text uppercase font-semibold">
                      {step.kind}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-primary-text">{step.title}</h4>
                  <p className="text-xs text-secondary-text leading-relaxed">{step.action}</p>
                </div>

                <div className="pt-4">
                  {step.url ? (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:underline"
                    >
                      Start Free Learning <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <Link
                      href={`/jobs/${report.job_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:underline"
                    >
                      Practice in Prep Plan <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps CTA */}
        <div className="editorial-card rounded-2xl p-6 bg-pale-blue/60 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-serif font-bold text-primary-text">
              Ready to practice another role or close your gaps?
            </h3>
            <p className="text-xs text-secondary-text mt-1">
              Refine your STAR interview responses or explore curated prep modules tailored to {report.role_title}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/jobs/${report.job_id}`}>
              <Button variant="outline" size="md">
                View Role Prep
              </Button>
            </Link>
            <Link href="/interview">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Practice Another Mock Interview
              </Button>
            </Link>
          </div>
        </div>
      </Container>

      {/* Delete My Data Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="editorial-card rounded-2xl max-w-md w-full bg-white border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-primary-text">
                  Permanently Delete Interview Data?
                </h3>
                <p className="text-xs text-secondary-text">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary-text leading-relaxed">
              In compliance with data privacy standards, clicking &ldquo;Delete Everything&rdquo; will immediately erase your interview transcript, recording URLs, AI evaluation report, and integrity event logs from our database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteData}
                disabled={isDeleting}
                className="bg-rose-700 hover:bg-rose-800 text-white border-transparent"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
