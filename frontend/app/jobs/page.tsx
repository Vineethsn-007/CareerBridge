"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type { Job, JobMatch, ParsedResume } from "@/lib/types";
import {
  Search,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  Clock,
  Filter,
  ArrowRight,
  FileText,
} from "lucide-react";

type ViewMode = "browse" | "matched";
type LoadState = "idle" | "loading" | "done" | "error";

const JOB_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  internship: "Internship",
  "part-time": "Part-time",
  contract: "Contract",
};

const JOB_TYPE_COLORS: Record<string, string> = {
  "full-time": "bg-primary/10 text-primary border-primary/30",
  internship: "bg-accent/10 text-accent border-accent/30",
  "part-time": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  contract: "bg-violet-500/10 text-violet-400 border-violet-500/30",
};

function JobCard({ job, matchScore, matchedSkills, missingSkills, rationale, onViewGap }: {
  job: Job;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  rationale?: string;
  onViewGap?: () => void;
}) {
  return (
    <Card variant="interactive" className="p-0 group">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white truncate">{job.title}</h2>
              {job.verified && (
                <Badge variant="verified" size="sm">Verified</Badge>
              )}
            </div>
            <p className="text-sm text-accent font-medium truncate">{job.company}</p>
            <div className="flex items-center gap-3 flex-wrap text-xs text-text-muted pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${JOB_TYPE_COLORS[job.job_type] ?? "bg-surface-2 text-text-muted border-border"}`}
              >
                <Briefcase className="w-3 h-3" />
                {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
              </span>
              {job.last_verified && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Verified {job.last_verified}
                </span>
              )}
            </div>
          </div>
          {matchScore !== undefined && (
            <div className="shrink-0">
              <ScoreRing score={Math.round(matchScore)} size="sm" />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{job.description}</p>

        {/* Skills */}
        {job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills_required.slice(0, 6).map((skill) => {
              const isMatched = matchedSkills?.includes(skill);
              const isMissing = missingSkills?.includes(skill);
              return (
                <Chip
                  key={skill}
                  label={skill}
                  variant={isMatched ? "matched" : isMissing ? "missing" : "default"}
                />
              );
            })}
            {job.skills_required.length > 6 && (
              <span className="text-xs text-text-muted self-center">+{job.skills_required.length - 6} more</span>
            )}
          </div>
        )}

        {/* Rationale */}
        {rationale && (
          <p className="text-xs text-text-muted italic border-l-2 border-primary/40 pl-3 leading-relaxed">
            {rationale}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/50 bg-surface-2/30">
        {onViewGap ? (
          <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} onClick={onViewGap} className="px-0 text-accent hover:bg-transparent">
            View Skill Gap
          </Button>
        ) : (
          <span />
        )}
        <a
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-accent transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Apply <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </Card>
  );
}

export default function JobsPage() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Detect resume in sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("parsedResume");
      if (raw) {
        const resume = JSON.parse(raw) as ParsedResume;
        setParsedResume(resume);
        setViewMode("matched");
      }
    } catch {
      // ignore
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg(null);
    try {
      const data = await api.listJobs({ verifiedOnly, q: searchQ || undefined });
      setJobs(data);
      setLoadState("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load jobs.");
      setLoadState("error");
    }
  }, [verifiedOnly, searchQ]);

  const loadMatches = useCallback(async (resume: ParsedResume) => {
    setLoadState("loading");
    setErrorMsg(null);
    try {
      const data = await api.match({ resume, verified_only: verifiedOnly, top_k: 20 });
      setMatches(data);
      setLoadState("done");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch matches.");
      setLoadState("error");
    }
  }, [verifiedOnly]);

  // Auto-load when mode changes or filters change
  useEffect(() => {
    if (viewMode === "matched" && parsedResume) {
      loadMatches(parsedResume);
    } else if (viewMode === "browse") {
      loadJobs();
    }
  }, [viewMode, parsedResume, verifiedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleViewGap = (jobId: string) => {
    router.push(`/skills?job=${encodeURIComponent(jobId)}`);
  };

  const isLoading = loadState === "loading";
  const displayedJobs = viewMode === "matched"
    ? matches.map((m) => m.job)
    : jobs;

  return (
    <div className="min-h-screen bg-mesh py-10">
      <Container size="xl">
        <PageHeader
          title="Job Listings"
          subtitle="Browse verified fresher &amp; internship openings or get AI-matched results based on your resume."
          backHref="/"
          backLabel="Home"
          badge={<Badge variant="verified" showIcon={false}>{displayedJobs.length > 0 ? `${displayedJobs.length} listings` : "Live"}</Badge>}
          action={
            <Button
              size="sm"
              variant="highlight"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={() => router.push("/resume")}
            >
              Upload Resume
            </Button>
          }
        />

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border w-fit mb-6">
          <button
            id="browse-tab"
            onClick={() => setViewMode("browse")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              viewMode === "browse"
                ? "bg-primary text-white shadow-glow"
                : "text-text-muted hover:text-text"
            }`}
          >
            Browse All
          </button>
          <button
            id="matched-tab"
            onClick={() => {
              if (!parsedResume) {
                router.push("/resume");
              } else {
                setViewMode("matched");
              }
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              viewMode === "matched"
                ? "bg-primary text-white shadow-glow"
                : "text-text-muted hover:text-text"
            }`}
          >
            AI Matched
            {parsedResume && (
              <span className="inline-flex w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {viewMode === "browse" && (
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <Input
                id="jobs-search"
                placeholder="Search by title, company, or skill..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="flex-1"
              />
              <Button type="submit" size="sm" variant="secondary" id="jobs-search-btn">
                Search
              </Button>
            </form>
          )}
          <button
            id="verified-filter"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all duration-200 shrink-0 ${
              verifiedOnly
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-surface-2 border-border text-text-muted hover:text-text hover:border-white/20"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Verified Only
            {verifiedOnly && <Filter className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Error */}
        {loadState === "error" && errorMsg && (
          <ErrorMessage
            message={errorMsg}
            onRetry={() => viewMode === "matched" && parsedResume ? loadMatches(parsedResume) : loadJobs()}
          />
        )}

        {/* Resume prompt for matched mode without resume */}
        {viewMode === "matched" && !parsedResume && (
          <EmptyState
            title="No resume uploaded yet"
            description="Upload your resume first so CareerBridge can find your best-matched jobs using AI skill analysis."
            actionLabel="Upload Resume"
            onAction={() => router.push("/resume")}
          />
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Job Grid */}
        {!isLoading && loadState === "done" && (
          <>
            {displayedJobs.length === 0 ? (
              <EmptyState
                title="No jobs found"
                description={verifiedOnly ? "No verified listings match your filters. Try turning off the verified filter." : "No listings match your search. Try different keywords."}
                actionLabel={verifiedOnly ? "Show All" : undefined}
                onAction={verifiedOnly ? () => setVerifiedOnly(false) : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {viewMode === "matched"
                  ? matches.map((m) => (
                      <JobCard
                        key={m.job.id}
                        job={m.job}
                        matchScore={m.score}
                        matchedSkills={m.matched_skills}
                        missingSkills={m.missing_skills}
                        rationale={m.rationale}
                        onViewGap={() => handleViewGap(m.job.id)}
                      />
                    ))
                  : jobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
