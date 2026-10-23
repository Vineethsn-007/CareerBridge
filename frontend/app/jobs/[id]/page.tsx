"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SkillGapSummary } from "@/components/gap/SkillGapSummary";
import { PrepPlanTimeline } from "@/components/gap/PrepPlanTimeline";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import type { Job, SkillGap, PrepPlan, ParsedResume } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  ExternalLink,
  MessageSquare,
  Target,
  Calendar,
} from "lucide-react";

// Preloaded sample resume for demo fallback
const DEMO_RESUME: ParsedResume = {
  name: "Muhammad Haashid",
  email: "muhammad.haashid@gmail.com",
  phone: "+91 9876543210",
  summary: "Final year Computer Science student seeking fresher Software Engineer roles.",
  skills: ["Python", "React", "TypeScript", "Next.js", "Node.js", "SQL", "Git", "REST API", "Problem Solving"],
  education: [
    {
      institution: "Visvesvaraya Technological University (VTU)",
      degree: "B.Tech in Computer Science & Engineering",
      year: "2024",
    },
  ],
  experience: [
    {
      title: "Frontend Development Intern",
      company: "Tech Mahindra (Academic Track)",
      duration: "3 months",
      summary: "Built student management dashboards using React and Tailwind CSS.",
    },
  ],
  projects: [
    "Smart Campus Portal: Fullstack Next.js and FastAPI app for college events",
    "E-Commerce Microservices: Python FastAPI order processing system",
  ],
  raw_text: "Muhammad Haashid resume sample",
};

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const { resume, isHydrated, saveResume } = useResumeStore();

  const [job, setJob] = useState<Job | null>(null);
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [plan, setPlan] = useState<PrepPlan | null>(null);

  const [weeks, setWeeks] = useState(4);
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [activeTab, setActiveTab] = useState<"gap" | "plan">("gap");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeResume = resume || DEMO_RESUME;

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Job details
      const jobData = await api.getJob(jobId);
      setJob(jobData);

      // 2. Fetch Skill Gap
      const gapData = await api.skillGap({
        resume: activeResume,
        job_id: jobId,
      });
      setGap(gapData);

      // 3. Fetch Weekly Prep Plan
      const planData = await api.prepPlan({
        gap: gapData,
        weeks,
        hours_per_week: hoursPerWeek,
      });
      setPlan(planData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load job details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, activeResume, weeks, hoursPerWeek]);

  useEffect(() => {
    if (isHydrated) {
      loadData();
    }
  }, [isHydrated, loadData]);

  // Re-fetch plan when schedule changes
  const handleWeeksChange = async (newWeeks: number) => {
    setWeeks(newWeeks);
    if (!gap) return;
    try {
      const planData = await api.prepPlan({
        gap,
        weeks: newWeeks,
        hours_per_week: hoursPerWeek,
      });
      setPlan(planData);
    } catch (err) {
      console.error("Failed to update plan weeks:", err);
    }
  };

  const handleHoursChange = async (newHours: number) => {
    setHoursPerWeek(newHours);
    if (!gap) return;
    try {
      const planData = await api.prepPlan({
        gap,
        weeks,
        hours_per_week: newHours,
      });
      setPlan(planData);
    } catch (err) {
      console.error("Failed to update plan hours:", err);
    }
  };

  return (
    <div className="py-10 bg-merino min-h-screen">
      <Container size="xl">
        <PageHeader
          title={job ? job.title : "Role Analysis"}
          subtitle={
            job
              ? `${job.company} • ${job.location} • ${job.job_type} (${job.experience_level})`
              : "Loading role specifications..."
          }
          backHref="/jobs"
          backLabel="All Matches"
          badge={
            job?.verified ? (
              <Badge variant="verified">
                Verified {job.last_verified ? `(${job.last_verified})` : ""}
              </Badge>
            ) : (
              <Badge variant="neutral">Verified Source</Badge>
            )
          }
          action={
            job && (
              <div className="flex items-center gap-3">
                <Link href={`/interview?job_id=${encodeURIComponent(job.id)}`}>
                  <Button
                    size="sm"
                    variant="highlight"
                    leftIcon={<MessageSquare className="w-4 h-4" />}
                  >
                    Mock Interview
                  </Button>
                </Link>
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Official Portal
                  </Button>
                </a>
              </div>
            )
          }
        />

        {/* Demo banner if fallback resume used */}
        {isHydrated && !resume && (
          <div className="mb-6 p-4 rounded-md border border-primary/30 bg-surface-2/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">
              Displaying analysis for preloaded profile: <strong className="text-text">{DEMO_RESUME.name}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                saveResume(DEMO_RESUME);
                loadData();
              }}
            >
              Save as My Profile
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-8">
            <ErrorMessage
              title="Unable to analyze role"
              message={error}
              onRetry={loadData}
              isRetrying={isLoading}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Main Content with Tabs */}
        {!isLoading && job && gap && plan && (
          <div className="space-y-8">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-3 border-b border-border/80 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("gap")}
                className={`flex items-center gap-2 px-4 py-2 rounded-DEFAULT text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "gap"
                    ? "bg-venice-blue text-white shadow-subtle border border-venice-blue font-semibold"
                    : "bg-pure-white text-secondary-text hover:text-primary-text border border-border hover:bg-pale-blue"
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Skill Gap Breakdown</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className={`flex items-center gap-2 px-4 py-2 rounded-DEFAULT text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "plan"
                    ? "bg-venice-blue text-white shadow-subtle border border-venice-blue font-semibold"
                    : "bg-pure-white text-secondary-text hover:text-primary-text border border-border hover:bg-pale-blue"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Weekly Preparation Roadmap</span>
              </button>
            </div>

            {/* Tab Views */}
            {activeTab === "gap" ? (
              <SkillGapSummary gap={gap} />
            ) : (
              <PrepPlanTimeline
                plan={plan}
                weeks={weeks}
                onWeeksChange={handleWeeksChange}
                hoursPerWeek={hoursPerWeek}
                onHoursChange={handleHoursChange}
              />
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
