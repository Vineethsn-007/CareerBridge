"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Award,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import type { InterviewSessionResponse } from "@/lib/types";

interface WaitingReportViewProps {
  session: InterviewSessionResponse;
  onReportReady: () => void;
}

export function WaitingReportView({ session, onReportReady }: WaitingReportViewProps) {
  const [currentSession, setCurrentSession] = useState<InterviewSessionResponse>(session);
  const [pollCount, setPollCount] = useState(0);

  // Poll and trigger report generation
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;
    let isFetching = false;

    async function checkStatus() {
      if (isFetching) return;
      isFetching = true;
      try {
        setPollCount((p) => p + 1);

        // 1. Actively request the report:
        // /report endpoint syncs any pending transcript and runs LLM evaluation on-demand
        try {
          const report = await api.getInterviewReport(session.session_id);
          if (report && isMounted) {
            setCurrentSession((prev) => ({
              ...prev,
              status: "report_ready",
              has_report: true,
            }));
            onReportReady();
            return;
          }
        } catch {
          // If transcript is still synchronizing, fallback to session polling
        }

        // 2. Also check session metadata status
        const updated = await api.getInterviewSession(session.session_id);
        if (!isMounted) return;
        setCurrentSession(updated);

        if (updated.status === "report_ready" || updated.has_report) {
          onReportReady();
        }
      } catch (err) {
        console.warn("Report polling notice:", err);
      } finally {
        isFetching = false;
      }
    }

    if (currentSession.status !== "report_ready" && !currentSession.has_report) {
      timer = setInterval(checkStatus, 3000);
      // Run immediate initial check
      checkStatus();
    }

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [session.session_id, currentSession.status, currentSession.has_report, onReportReady]);

  const isReady = currentSession.status === "report_ready" || currentSession.has_report;

  // Visual evaluation stages based on poll count
  const stage2Done = pollCount >= 1 || isReady;
  const stage3Done = pollCount >= 2 || isReady;
  const stage4Done = isReady;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Animated Center Icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-pale-blue animate-ping opacity-30" />
        <div className="relative w-full h-full rounded-full bg-white border-2 border-venice-blue flex items-center justify-center shadow-lg">
          {isReady ? (
            <Award className="w-10 h-10 text-venice-blue animate-bounce" />
          ) : (
            <Loader2 className="w-9 h-9 text-venice-blue animate-spin" />
          )}
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pale-blue text-venice-blue border border-border text-xs font-medium mb-3">
        <Sparkles className="w-3.5 h-3.5 text-venice-blue" />
        <span>{isReady ? "Report Ready!" : "AI Evaluation in Progress"}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary-text mb-3">
        {isReady ? "Your Performance Report is Ready" : "Preparing Your Feedback Report"}
      </h1>

      <p className="text-sm text-secondary-text max-w-lg mx-auto mb-8">
        {isReady
          ? "We've analyzed your spoken answers, speaking pace, and rubric coverage. Explore your detailed feedback and targeted improvement plan."
          : `Robin has completed your interview for ${session.role_title}. CareerBridge is now evaluating your performance across communication and technical competencies.`}
      </p>

      {/* Pipeline Progress Steps */}
      <div className="editorial-card rounded-xl p-5 bg-white border border-border text-left shadow-sm mb-8 space-y-4">
        {/* Step 1 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-primary-text">Live video room closed & synchronized</span>
          </div>
          <Badge variant="verified">Completed</Badge>
        </div>

        {/* Step 2 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {stage2Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-venice-blue animate-spin flex-shrink-0" />
            )}
            <span className="font-medium text-primary-text">Transcribing spoken responses & audio stream</span>
          </div>
          <Badge variant={stage2Done ? "verified" : "highlight"}>
            {stage2Done ? "Completed" : "Processing"}
          </Badge>
        </div>

        {/* Step 3 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {stage3Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-venice-blue animate-spin flex-shrink-0" />
            )}
            <span className="font-medium text-primary-text">Computing speech pace (WPM) & filler word metrics</span>
          </div>
          <Badge variant={stage3Done ? "verified" : stage2Done ? "highlight" : "neutral"}>
            {stage3Done ? "Completed" : stage2Done ? "Processing" : "Queued"}
          </Badge>
        </div>

        {/* Step 4 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {stage4Done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-venice-blue animate-spin flex-shrink-0" />
            )}
            <span className="font-medium text-primary-text">STAR rubric scoring & actionable guidance</span>
          </div>
          <Badge variant={stage4Done ? "verified" : stage3Done ? "highlight" : "neutral"}>
            {stage4Done ? "Ready" : stage3Done ? "Processing" : "Queued"}
          </Badge>
        </div>
      </div>

      {/* Action Button */}
      {isReady ? (
        <Button
          variant="primary"
          size="lg"
          onClick={onReportReady}
          className="text-base px-8 py-3.5 font-semibold shadow-md"
          rightIcon={<ArrowRight className="w-5 h-5" />}
        >
          View Full Performance Report
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {pollCount >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReportReady}
              className="text-xs px-5 py-2 font-medium"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open Report
            </Button>
          )}
          <p className="text-xs text-secondary-text flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-venice-blue" />
            This typically takes 5–15 seconds. You will be automatically redirected.
          </p>
        </div>
      )}
    </div>
  );
}
