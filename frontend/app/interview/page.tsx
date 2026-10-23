"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type {
  ParsedResume,
  InterviewQuestion,
  AnswerFeedback,
} from "@/lib/types";
import {
  MessageSquare,
  Send,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  RotateCcw,
  FileText,
  Briefcase,
  Star,
} from "lucide-react";

type SessionState = "idle" | "loading-questions" | "answering" | "evaluating" | "feedback" | "done" | "error";

const KIND_CONFIG = {
  technical: { label: "Technical", color: "bg-primary/10 text-primary border-primary/30" },
  behavioural: { label: "Behavioural", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  hr: { label: "HR", color: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
};

interface QuestionResult {
  question: InterviewQuestion;
  answer: string;
  feedback: AnswerFeedback | null;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "text-emerald-400" : score >= 5 ? "text-amber-400" : "text-rose-400";
  return (
    <span className={`text-2xl font-extrabold ${color}`}>{score}<span className="text-sm font-normal text-text-muted">/10</span></span>
  );
}

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job") ?? "";

  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("parsedResume");
      if (raw) setParsedResume(JSON.parse(raw) as ParsedResume);
    } catch { /* ignore */ }
  }, []);

  const startSession = useCallback(async () => {
    if (!parsedResume) return;
    setSessionState("loading-questions");
    setErrorMsg(null);
    setResults([]);
    setCurrentIdx(0);
    setAnswer("");
    try {
      const qs = await api.interviewQuestions({
        resume: parsedResume,
        job_id: jobId,
        num_questions: numQuestions,
      });
      setQuestions(qs);
      setSessionState("answering");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate questions.");
      setSessionState("error");
    }
  }, [parsedResume, jobId, numQuestions]);

  const submitAnswer = useCallback(async () => {
    if (!answer.trim() || !parsedResume) return;
    const q = questions[currentIdx];
    setSessionState("evaluating");
    let feedback: AnswerFeedback | null = null;
    try {
      feedback = await api.evaluateAnswer({
        job_id: jobId,
        question: q,
        answer: answer.trim(),
      });
    } catch {
      // Proceed without feedback if evaluation fails
    }

    const result: QuestionResult = { question: q, answer: answer.trim(), feedback };
    const newResults = [...results, result];
    setResults(newResults);

    const isLast = currentIdx === questions.length - 1;
    if (isLast) {
      setSessionState("done");
    } else {
      setCurrentIdx((i) => i + 1);
      setAnswer("");
      setSessionState("answering");
    }
  }, [answer, questions, currentIdx, results, jobId, parsedResume]);

  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.feedback?.score ?? 0), 0) /
            results.filter((r) => r.feedback).length
        )
      : 0;

  const noResume = !parsedResume;

  return (
    <div className="min-h-screen bg-mesh py-10">
      <Container size="lg">
        <PageHeader
          title="Mock Interview"
          subtitle={jobId ? `AI-powered practice for ${jobId}` : "Practice technical, behavioural, and HR questions with instant STAR rubric feedback."}
          backHref={jobId ? `/skills?job=${encodeURIComponent(jobId)}` : "/jobs"}
          backLabel={jobId ? "Skill Gap" : "Jobs"}
          badge={
            sessionState === "answering" ? (
              <Badge variant="highlight" showIcon={false}>
                Q{currentIdx + 1} of {questions.length}
              </Badge>
            ) : sessionState === "done" ? (
              <Badge variant="verified">Session Complete</Badge>
            ) : undefined
          }
        />

        {/* No resume */}
        {noResume && sessionState === "idle" && (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No resume uploaded"
            description="Upload your resume first so CareerBridge can generate role-specific interview questions tailored to your background."
            actionLabel="Upload Resume"
            onAction={() => router.push("/resume")}
          />
        )}

        {/* Error */}
        {sessionState === "error" && errorMsg && (
          <ErrorMessage message={errorMsg} onRetry={startSession} />
        )}

        {/* Setup / idle */}
        {!noResume && sessionState === "idle" && (
          <Card className="p-8 max-w-lg mx-auto space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Ready to practice?</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                CareerBridge will generate questions tailored to your resume and the target role. Answer each one, then get instant STAR rubric scores.
              </p>
            </div>
            {jobId && (
              <div className="flex items-center gap-2 justify-center text-xs text-text-muted">
                <Briefcase className="w-3.5 h-3.5 text-accent" />
                <span>Role: <span className="text-text font-medium">{jobId}</span></span>
              </div>
            )}
            {/* Number of questions selector */}
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs text-text-muted">Questions:</span>
              {[3, 5, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumQuestions(n)}
                  className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-all ${
                    numQuestions === n
                      ? "bg-primary border-primary/60 text-white shadow-glow"
                      : "bg-surface-2 border-border text-text-muted hover:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button
              id="start-interview-btn"
              size="lg"
              variant="highlight"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={startSession}
              className="w-full shadow-glow-saffron"
            >
              Start Session
            </Button>
          </Card>
        )}

        {/* Loading questions */}
        {sessionState === "loading-questions" && (
          <div className="space-y-4 max-w-lg mx-auto">
            <p className="text-sm text-text-muted text-center animate-pulse">Generating your personalised questions...</p>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Answering */}
        {(sessionState === "answering" || sessionState === "evaluating") && questions[currentIdx] && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Question {currentIdx + 1} of {questions.length}</span>
                <span>{Math.round(((currentIdx) / questions.length) * 100)}% complete</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${(currentIdx / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question card */}
            <Card className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-accent shrink-0 mt-0.5">
                  Q
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${KIND_CONFIG[questions[currentIdx].kind]?.color}`}>
                      {KIND_CONFIG[questions[currentIdx].kind]?.label}
                    </span>
                    {questions[currentIdx].focus_skill && (
                      <span className="text-[11px] text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
                        {questions[currentIdx].focus_skill}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-semibold text-white leading-relaxed">
                    {questions[currentIdx].question}
                  </p>
                </div>
              </div>

              {/* Answer textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">
                  Your Answer
                </label>
                <textarea
                  id="interview-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here using the STAR format (Situation, Task, Action, Result)..."
                  disabled={sessionState === "evaluating"}
                  className="w-full bg-surface-2 text-text text-sm rounded-md px-4 py-3 border border-border placeholder:text-text-muted/60 transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-primary/30 min-h-[140px] resize-y disabled:opacity-50"
                />
                <p className="text-xs text-text-muted">
                  Tip: Use the <span className="text-accent font-medium">STAR format</span> — Situation, Task, Action, Result
                </p>
              </div>

              <Button
                id="submit-answer-btn"
                size="lg"
                variant="primary"
                rightIcon={sessionState === "evaluating"
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                onClick={submitAnswer}
                disabled={!answer.trim() || sessionState === "evaluating"}
                className="w-full"
              >
                {sessionState === "evaluating" ? "Evaluating..." : "Submit Answer"}
              </Button>
            </Card>

            {/* Previous results mini-view */}
            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Previous answers</p>
                <div className="space-y-2">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface/60 border border-border/40 text-sm">
                      <span className="text-text-muted truncate max-w-[80%]">Q{i + 1}: {r.question.question}</span>
                      {r.feedback && <ScoreBadge score={r.feedback.score} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done — full results */}
        {sessionState === "done" && results.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Session Complete!</h2>
                  <p className="text-sm text-text-muted">You answered {results.length} questions</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <ScoreRing score={avgScore * 10} size="md" />
                    <p className="text-xs text-text-muted mt-1">Avg Score</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Individual results */}
            <div className="space-y-4">
              {results.map((r, i) => (
                <Card key={i} className="p-6 space-y-4">
                  {/* Question */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${KIND_CONFIG[r.question.kind]?.color}`}>
                          {KIND_CONFIG[r.question.kind]?.label}
                        </span>
                        <span className="text-[11px] text-text-muted">Q{i + 1}</span>
                      </div>
                      <p className="text-sm font-semibold text-white">{r.question.question}</p>
                    </div>
                    {r.feedback && <ScoreBadge score={r.feedback.score} />}
                  </div>

                  {/* Answer */}
                  <div className="p-3 rounded-lg bg-surface-2/60 border border-border/40">
                    <p className="text-xs font-semibold text-text-muted uppercase mb-1">Your Answer</p>
                    <p className="text-sm text-text-muted leading-relaxed">{r.answer}</p>
                  </div>

                  {/* Feedback */}
                  {r.feedback && (
                    <div className="space-y-3">
                      {r.feedback.strengths.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Strengths
                          </div>
                          <ul className="space-y-1">
                            {r.feedback.strengths.map((s, j) => (
                              <li key={j} className="text-xs text-text-muted flex items-start gap-2">
                                <Star className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.feedback.improvements.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Improvements
                          </div>
                          <ul className="space-y-1">
                            {r.feedback.improvements.map((s, j) => (
                              <li key={j} className="text-xs text-text-muted flex items-start gap-2">
                                <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.feedback.sample_answer && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                          <p className="text-xs font-semibold text-accent uppercase">Sample Answer</p>
                          <p className="text-xs text-text-muted leading-relaxed">{r.feedback.sample_answer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Retry / navigate */}
            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <Button
                id="retry-interview-btn"
                size="lg"
                variant="primary"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => { setSessionState("idle"); setResults([]); setQuestions([]); setCurrentIdx(0); setAnswer(""); }}
                className="flex-1"
              >
                Practice Again
              </Button>
              <Button
                id="back-to-jobs-btn"
                size="lg"
                variant="secondary"
                onClick={() => router.push("/jobs")}
                className="flex-1"
              >
                Browse More Jobs
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
