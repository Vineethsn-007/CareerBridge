"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Video, Sparkles, ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { QuestionCard } from "@/components/interview/QuestionCard";
import { FeedbackCard } from "@/components/interview/FeedbackCard";
import { InterviewSummary } from "@/components/interview/InterviewSummary";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import type {
  InterviewQuestion,
  AnswerFeedback,
  Job,
  ParsedResume,
} from "@/lib/types";
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
  const initialJobId = searchParams.get("job_id") || "job-web-001";

  const { resume, isHydrated, saveResume, getPersonaInput } = useResumeStore();

  const [jobId, setJobId] = useState(initialJobId);
  const [job, setJob] = useState<Job | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<AnswerFeedback[]>([]);

  const [stage, setStage] = useState<"answering" | "feedback" | "completed">("answering");
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLaunchingAvatar, setIsLaunchingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const activeResume = resume || DEMO_RESUME;

  // Load available jobs for role picker
  useEffect(() => {
    api
      .listJobs()
      .then((jobs) => {
        setAvailableJobs(jobs);
        const current = jobs.find((j) => j.id === jobId) || jobs[0];
        if (current) setJob(current);
      })
      .catch((err) => console.error("Could not load jobs list:", err));
  }, [jobId]);

  // Load interview questions
  const loadQuestions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentIndex(0);
    setAnswers([]);
    setFeedbacks([]);
    setStage("answering");

    try {
      const qs = await api.interviewQuestions({
        resume: activeResume,
        job_id: jobId,
        num_questions: 4,
      });
      setQuestions(qs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate interview questions.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeResume, jobId]);

  useEffect(() => {
    if (isHydrated) {
      loadQuestions();
    }
  }, [isHydrated, loadQuestions]);

  // Evaluate candidate answer
  const handleSubmitAnswer = async (answer: string) => {
    if (!questions[currentIndex]) return;
    setIsEvaluating(true);
    setError(null);

    try {
      const feedback = await api.evaluateAnswer({
        job_id: jobId,
        question: questions[currentIndex],
        answer,
      });

      // Save answer and feedback
      setAnswers((prev) => [...prev, answer]);
      setFeedbacks((prev) => [...prev, feedback]);
      setStage("feedback");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to evaluate answer.";
      setError(msg);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setStage("answering");
    } else {
      setStage("completed");
    }
  };

  return (
    <div className="py-10 bg-merino min-h-screen">
      <Container size="xl">
        <PageHeader
          title="AI Mock Interview Simulator"
          subtitle={
            job
              ? `Practicing for ${job.title} at ${job.company}`
              : "Practice technical and behavioral interview questions with AI rubric feedback."
          }
          badge={<Badge variant="verified">STAR Rubric Evaluator</Badge>}
          action={
            availableJobs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted hidden sm:inline">Role:</span>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="bg-surface-2 text-text text-xs rounded border border-border px-3 py-1.5 focus:outline-none focus:border-accent"
                >
                  {availableJobs.slice(0, 10).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.company})
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        />

        {/* AI Avatar Video Interview Banner */}
        <div className="mb-8 editorial-card rounded-xl p-5 bg-gradient-to-r from-pale-blue via-white to-surface-2 border border-venice-blue/30 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-venice-blue text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Featured: Tavus CVI
              </span>
              <span className="text-xs font-semibold text-venice-blue">
                Realistic AI Avatar Mock Interview
              </span>
            </div>
            <h2 className="text-base font-serif font-bold text-primary-text">
              Practice Face-to-Face with Robin, Your AI Interviewer
            </h2>
            <p className="text-xs text-secondary-text leading-relaxed">
              Experience dynamic WebRTC video dialog, real-time speech-to-text, and comprehensive STAR feedback with speech pace and filler word analytics.
            </p>
          </div>

          <div className="flex-shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              onClick={async () => {
                setIsLaunchingAvatar(true);
                try {
                  const s = await api.createInterviewSession({
                    resume: activeResume,
                    job_id: jobId,
                    persona: getPersonaInput(),
                    num_questions: 5,
                    duration_minutes: 15,
                    consent_recording: false,
                    consent_transcript: true,
                    consent_integrity: true,
                  });
                  router.push(`/candidate/interview/${s.session_id}`);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Failed to launch avatar interview.");
                  setIsLaunchingAvatar(false);
                }
              }}
              isLoading={isLaunchingAvatar}
              leftIcon={<Video className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto font-semibold px-5 shadow-sm"
            >
              {isLaunchingAvatar ? "Preparing Room..." : "Launch Video Interview (15m)"}
            </Button>
          </div>
        </div>

        {/* Fallback notification if demo resume active */}
        {isHydrated && !resume && (
          <div className="mb-6 p-4 rounded-md border border-primary/30 bg-surface-2/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">
              Running simulation with preloaded profile: <strong className="text-text">{DEMO_RESUME.name}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                saveResume(DEMO_RESUME);
                loadQuestions();
              }}
            >
              Save as My Profile
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8">
            <ErrorMessage
              title="Interview Simulator Error"
              message={error}
              onRetry={loadQuestions}
              isRetrying={isLoading}
            />
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <SkeletonCard />
          </div>
        )}

        {/* Question Answering Phase */}
        {!isLoading && stage === "answering" && questions.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <QuestionCard
              question={questions[currentIndex]}
              index={currentIndex}
              total={questions.length}
              onSubmitAnswer={handleSubmitAnswer}
              isEvaluating={isEvaluating}
            />
          </div>
        )}

        {/* Feedback Phase */}
        {!isLoading && stage === "feedback" && questions.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <FeedbackCard
              question={questions[currentIndex]}
              userAnswer={answers[currentIndex] || ""}
              feedback={feedbacks[currentIndex]}
              isLastQuestion={currentIndex + 1 >= questions.length}
              onNext={handleNextQuestion}
            />
          </div>
        )}

        {/* Completed Summary Screen */}
        {!isLoading && stage === "completed" && (
          <InterviewSummary
            questions={questions}
            answers={answers}
            feedbacks={feedbacks}
            jobTitle={job?.title || "Target Role"}
            jobId={job?.id}
            onRestart={loadQuestions}
          />
        )}
      </Container>
    </div>
  );
}

export default function InterviewPage() {
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
      <InterviewPracticeContent />
    </Suspense>
  );
}
