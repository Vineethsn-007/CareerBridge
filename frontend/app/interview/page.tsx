"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Video,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Clock,
  Mic,
  Brain,
  CheckCircle2,
  Building2,
  SlidersHorizontal,
} from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import type { Job, ParsedResume } from "@/lib/types";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

// Preloaded sample resume for fallback demo
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

function InterviewPracticeContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || searchParams.get("job") || "job-web-001";

  const { resume, isHydrated, saveResume, getPersonaInput } = useResumeStore();

  const [jobId, setJobId] = useState(initialJobId);
  const [job, setJob] = useState<Job | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const [isLaunchingAvatar, setIsLaunchingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const activeResume = resume || DEMO_RESUME;

  // Load available jobs for role picker
  useEffect(() => {
    setIsLoadingJobs(true);
    api
      .listJobs()
      .then((jobs) => {
        setAvailableJobs(jobs);
        const current = jobs.find((j) => j.id === jobId) || jobs[0];
        if (current) setJob(current);
      })
      .catch((err) => {
        console.error("Could not load jobs list:", err);
      })
      .finally(() => {
        setIsLoadingJobs(false);
      });
  }, [jobId]);

  // Handle launching Tavus AI Avatar interview session
  const handleLaunchAvatarInterview = async () => {
    setIsLaunchingAvatar(true);
    setError(null);
    try {
      const session = await api.createInterviewSession({
        resume: activeResume,
        job_id: jobId,
        persona: typeof getPersonaInput === "function" ? getPersonaInput() : undefined,
        num_questions: 5,
        duration_minutes: 15,
        consent_recording: false,
        consent_transcript: true,
        consent_integrity: true,
      });

      router.push(`/candidate/interview/${session.session_id}`);
    } catch (err: unknown) {
      console.error("Failed to launch avatar interview:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not initialize Robin AI Avatar interview. Please try again."
      );
      setIsLaunchingAvatar(false);
    }
  };

  return (
    <div className="py-10 bg-merino min-h-screen">
      <Container size="xl">
        <PageHeader
          title="AI Avatar Mock Interview"
          subtitle={
            job
              ? `Practice face-to-face technical & behavioral interview for ${job.title} at ${job.company}.`
              : "Experience interactive, real-time video mock interviews with Robin, our AI technical interviewer."
          }
          badge={<Badge variant="verified">Tavus CVI • Real-Time WebRTC</Badge>}
          action={
            availableJobs.length > 0 && (
              <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-lg border border-border">
                <SlidersHorizontal className="w-3.5 h-3.5 text-venice-blue ml-1" />
                <span className="text-xs font-medium text-text-muted hidden sm:inline">Target Role:</span>
                <select
                  value={jobId}
                  onChange={(e) => {
                    const selected = availableJobs.find((j) => j.id === e.target.value);
                    setJobId(e.target.value);
                    if (selected) setJob(selected);
                  }}
                  className="bg-white text-text text-xs rounded border border-border px-3 py-1.5 font-medium focus:outline-none focus:border-venice-blue"
                >
                  {availableJobs.slice(0, 15).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        />

        {/* Fallback notification if demo resume active */}
        {isHydrated && !resume && (
          <div className="mb-6 p-4 rounded-md border border-primary/30 bg-surface-2/60 flex items-center justify-between text-xs max-w-4xl mx-auto">
            <span className="text-text-muted">
              Running simulation with preloaded profile: <strong className="text-text">{DEMO_RESUME.name}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                saveResume(DEMO_RESUME);
              }}
            >
              Save as My Profile
            </Button>
          </div>
        )}
        {error && (
          <div className="mb-8 max-w-4xl mx-auto">
            <ErrorMessage
              title="Interview Setup Error"
              message={error}
              onRetry={handleLaunchAvatarInterview}
              isRetrying={isLaunchingAvatar}
            />
          </div>
        )}

        {isLoadingJobs ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: AI Avatar Showcase & Main Launch Card (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Primary Avatar Card */}
              <div className="editorial-card rounded-2xl overflow-hidden bg-gradient-to-br from-dark-navy via-[#1B445D] to-dark-navy border border-border shadow-xl text-white p-6 sm:p-8 relative">
                {/* Background decorative glows */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-venice-blue/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Badge */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AI Avatar Video Interview</span>
                  </div>
                  <div className="text-[11px] text-rock-blue font-medium tracking-wide uppercase">
                    Tavus CVI • Powered by WebRTC
                  </div>
                </div>

                {/* Avatar Visual & Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 relative z-10">
                  {/* Glowing Avatar Portrait */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute -inset-2 rounded-full bg-emerald-400/20 blur-lg animate-pulse" />
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-emerald-400 bg-emerald-950/50 flex items-center justify-center shadow-2xl">
                      <UserCheck className="w-12 h-12 text-emerald-400" />
                    </div>
                  </div>

                  <div className="text-center sm:text-left space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                      Meet Robin, AI Technical Interviewer
                    </h2>
                    <p className="text-xs sm:text-sm text-rock-blue max-w-md leading-relaxed">
                      Experience realistic face-to-face video dialog. Robin asks structured, role-specific questions, listens patiently to your spoken answers, and evaluates technical mastery and STAR delivery.
                    </p>
                  </div>
                </div>

                {/* Core Experience Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 relative z-10">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-venice-blue/50 flex items-center justify-center mb-2.5 text-rock-blue">
                      <Mic className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-white mb-1">Real-Time Voice</h4>
                    <p className="text-[11px] text-rock-blue leading-normal">
                      Speak naturally. Robin transcribes speech and acknowledges your answers in real time.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-venice-blue/50 flex items-center justify-center mb-2.5 text-rock-blue">
                      <Brain className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-white mb-1">Adaptive Questions</h4>
                    <p className="text-[11px] text-rock-blue leading-normal">
                      Structured across core technical depth, architecture, and STAR behavioral scenarios.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-lg bg-venice-blue/50 flex items-center justify-center mb-2.5 text-rock-blue">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-white mb-1">Instant Evaluation</h4>
                    <p className="text-[11px] text-rock-blue leading-normal">
                      Receive comprehensive rubric scores, speaking pace analytics, and tailored feedback.
                    </p>
                  </div>
                </div>

                {/* Primary Launch Action */}
                <div className="space-y-3 relative z-10">
                  <Button
                    variant="highlight"
                    size="lg"
                    onClick={handleLaunchAvatarInterview}
                    isLoading={isLaunchingAvatar}
                    leftIcon={<Video className="w-5 h-5 text-dark-navy" />}
                    rightIcon={<ArrowRight className="w-5 h-5 text-dark-navy" />}
                    className="w-full justify-center text-sm sm:text-base font-bold py-4 shadow-lg hover:scale-[1.01] transition-transform duration-200"
                  >
                    {isLaunchingAvatar ? "Preparing Interview Room..." : "Start AI Avatar Interview (15 min)"}
                  </Button>

                  <p className="text-center text-[11px] text-rock-blue">
                    You will first enter a device check lobby where you can preview your camera and microphone before Robin starts.
                  </p>
                </div>
              </div>

              {/* Candidate Profile Preview Banner */}
              <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary-text">Interviewing As:</span>
                      <strong className="text-xs text-primary-text font-bold">{activeResume.name}</strong>
                    </div>
                    <p className="text-xs text-secondary-text">
                      {activeResume.summary || "Fullstack & Fresher Software Engineering track"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeResume.skills.slice(0, 7).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 text-primary-text border border-border"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isHydrated && !resume && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveResume(DEMO_RESUME)}
                      className="text-xs flex-shrink-0"
                    >
                      Save as My Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Target Role Brief & Interview Structure (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Job Details Card */}
              {job && (
                <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-venice-blue">
                        Target Role Brief
                      </span>
                      <h3 className="text-lg font-serif font-bold text-primary-text">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-secondary-text">
                        <Building2 className="w-3.5 h-3.5 text-venice-blue" />
                        <span>{job.company}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                      </div>
                    </div>
                    <Badge variant="verified">{job.job_type || "full-time"}</Badge>
                  </div>

                  <p className="text-xs text-secondary-text line-clamp-3 leading-relaxed">
                    {job.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <span className="text-xs font-semibold text-primary-text">Target Skills Tested:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(job.skills_required || []).map((s, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-pale-blue text-venice-blue border border-border"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 15-Minute Interview Agenda */}
              <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-primary-text flex items-center gap-2">
                    <Clock className="w-4 h-4 text-venice-blue" />
                    Structured Interview Agenda
                  </h3>
                  <span className="text-xs font-semibold text-venice-blue">~15 Minutes</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border/60">
                    <div className="w-6 h-6 rounded-full bg-venice-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-primary-text">Warm-up & Background</h4>
                      <p className="text-[11px] text-secondary-text">
                        Brief icebreaker on your technical journey and career aspirations. (~2 min)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border/60">
                    <div className="w-6 h-6 rounded-full bg-venice-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-primary-text">Core Technical Depth</h4>
                      <p className="text-[11px] text-secondary-text">
                        In-depth questions addressing {(job?.skills_required || []).slice(0, 3).join(", ") || "core domain skills"}. (~5 min)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border/60">
                    <div className="w-6 h-6 rounded-full bg-venice-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-primary-text">Applied Problem Solving</h4>
                      <p className="text-[11px] text-secondary-text">
                        Real-world architecture and debugging scenarios from production projects. (~5 min)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-border/60">
                    <div className="w-6 h-6 rounded-full bg-venice-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-primary-text">Behavioral & STAR Delivery</h4>
                      <p className="text-[11px] text-secondary-text">
                        Situation, Task, Action, and Result communication with Robin. (~3 min)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-flight Checklist */}
              <div className="editorial-card rounded-xl p-5 bg-white border border-border shadow-sm space-y-3">
                <h3 className="text-sm font-serif font-bold text-primary-text flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pre-Interview Tips
                </h3>
                <ul className="text-xs text-secondary-text space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-venice-blue" />
                    Ensure your camera and microphone permissions are granted.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-venice-blue" />
                    Sit in a well-lit, quiet room to ensure accurate transcription.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-venice-blue" />
                    Use the <strong>&ldquo;Done Speaking&rdquo;</strong> button or say <em>&ldquo;I have finished my answer&rdquo;</em> to advance questions seamlessly.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10 bg-merino min-h-screen">
          <Container size="xl">
            <SkeletonCard />
          </Container>
        </div>
      }
    >
      <InterviewPracticeContent />
    </Suspense>
  );
}
