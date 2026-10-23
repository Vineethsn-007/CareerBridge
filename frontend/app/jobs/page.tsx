"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import type { JobMatch, ParsedResume } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import {
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// Preloaded sample resume for instant demo without uploading
const DEMO_RESUME: ParsedResume = {
  name: "Aarav Sharma",
  email: "aarav.sharma@gmail.com",
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
  raw_text: "Aarav Sharma resume sample",
};

export default function JobsPage() {
  const { resume, isHydrated, saveResume } = useResumeStore();

  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedJobType, setSelectedJobType] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Fetch job matches whenever active resume is present
  const fetchMatches = async (activeResume: ParsedResume) => {
    setIsLoading(true);
    setError(null);
    try {
      // Call backend POST /api/match with real resume
      const results = await api.match({
        resume: activeResume,
        top_k: 20,
        verified_only: false, // ensure all verified + verified-source listings are retrieved
      });
      setMatches(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load matching jobs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && resume) {
      fetchMatches(resume);
    }
  }, [isHydrated, resume]);

  // Extract unique locations from matches
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    matches.forEach((m) => {
      if (m.job.location) locSet.add(m.job.location);
    });
    return Array.from(locSet).sort();
  }, [matches]);

  // Filtered and sorted matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // Location filter
      if (selectedLocation !== "all" && m.job.location !== selectedLocation) {
        return false;
      }
      // Job Type filter
      if (selectedJobType !== "all" && m.job.job_type !== selectedJobType) {
        return false;
      }
      // Verified only
      if (verifiedOnly && !m.job.verified) {
        return false;
      }
      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.job.title.toLowerCase().includes(q);
        const matchesCompany = m.job.company.toLowerCase().includes(q);
        const matchesLocation = m.job.location.toLowerCase().includes(q);
        const matchesSkills = m.job.skills_required.some((s) =>
          s.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesSkills) {
          return false;
        }
      }
      return true;
    });
  }, [matches, selectedLocation, selectedJobType, verifiedOnly, searchQuery]);

  // GSAP staggered entrance animation for job cards
  useGSAP(
    () => {
      if (isLoading || filteredMatches.length === 0 || !listContainerRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(listContainerRef.current.children, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        listContainerRef.current.children,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        }
      );
    },
    { scope: listContainerRef, dependencies: [filteredMatches, isLoading] }
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setSelectedJobType("all");
    setVerifiedOnly(false);
  };

  return (
    <div className="py-10 bg-mesh min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Verified Job Matches"
          subtitle="Ranked algorithmically based on your technical skills, education, and target career direction."
          badge={
            resume ? (
              <Badge variant="verified">
                Matched for {resume.name || "Candidate"}
              </Badge>
            ) : (
              <Badge variant="neutral">Demo Mode</Badge>
            )
          }
          action={
            resume && (
              <Link href="/resume">
                <Button size="sm" variant="secondary" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                  Edit Skills ({resume.skills.length})
                </Button>
              </Link>
            )
          }
        />

        {/* Missing Resume Alert Banner */}
        {isHydrated && !resume && (
          <div className="mb-8 p-6 rounded-lg border border-primary/30 bg-surface-2/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-card">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-highlight" />
                <span>No Resume Uploaded Yet</span>
              </h3>
              <p className="text-xs text-text-muted">
                Upload your resume for personalized match scores, or test with our sample fresher profile.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                size="sm"
                variant="highlight"
                onClick={() => {
                  saveResume(DEMO_RESUME);
                  fetchMatches(DEMO_RESUME);
                }}
              >
                Load Sample Student Profile
              </Button>
              <Link href="/resume">
                <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Upload My Resume
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert with Retry */}
        {error && (
          <div className="mb-8">
            <ErrorMessage
              title="Unable to load job matches"
              message={error}
              onRetry={() => resume && fetchMatches(resume)}
              isRetrying={isLoading}
            />
          </div>
        )}

        {/* Filter Controls */}
        {matches.length > 0 && (
          <div className="mb-8">
            <JobFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              selectedJobType={selectedJobType}
              onJobTypeChange={setSelectedJobType}
              verifiedOnly={verifiedOnly}
              onVerifiedOnlyToggle={() => setVerifiedOnly(!verifiedOnly)}
              locations={locations}
              totalCount={matches.length}
              filteredCount={filteredMatches.length}
              onReset={resetFilters}
            />
          </div>
        )}

        {/* Loading State Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Job Matches Grid */}
        {!isLoading && filteredMatches.length > 0 && (
          <div ref={listContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMatches.map((match, idx) => (
              <JobCard key={match.job.id} match={match} rank={idx + 1} />
            ))}
          </div>
        )}

        {/* Empty Filter State */}
        {!isLoading && matches.length > 0 && filteredMatches.length === 0 && (
          <EmptyState
            title="No Matching Openings Found"
            description="No jobs match your current filter parameters. Try clearing your filters or selecting 'All Cities'."
            actionLabel="Reset All Filters"
            onAction={resetFilters}
          />
        )}
      </Container>
    </div>
  );
}
