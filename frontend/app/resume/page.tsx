"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResumeDropzone } from "@/components/resume/ResumeDropzone";
import { ParsedResumeView } from "@/components/resume/ParsedResumeView";
import { PersonaQnASection } from "@/components/persona/PersonaQnASection";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import {
  FileText,
  Brain,
  Briefcase,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function ResumePage() {
  const router = useRouter();
  const {
    resume,
    personaProfile,
    isHydrated,
    saveResume,
    clearResume,
    savePersonaProfile,
    addPersonaAnswer,
    addSkill,
    removeSkill,
  } = useResumeStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justParsed, setJustParsed] = useState(false);

  const personaSectionRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await api.parseResume(file);
      saveResume(parsed);
      setJustParsed(true);

      // Smooth scroll to persona section after small delay for rendering
      setTimeout(() => {
        personaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse resume. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToPersona = () => {
    personaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleProceedToJobs = () => {
    router.push("/jobs");
  };

  return (
    <div className="py-10 bg-merino min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Candidate Profile & Intelligence"
          subtitle="Upload your resume to extract skills, complete your Persona Q&A, and unlock verified AI job matching tailored to your exact profile."
          badge={
            resume && personaProfile ? (
              <Badge variant="verified">100% Profile Complete</Badge>
            ) : resume ? (
              <Badge variant="highlight">Step 2: Persona Q&A Required</Badge>
            ) : (
              <Badge variant="neutral">Step 1 of 3</Badge>
            )
          }
        />

        {/* 3-Step Guided Onboarding Pipeline */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-pale-blue/50 border border-border">
            {/* Step 1: Resume */}
            <div
              className={`flex items-center gap-2.5 p-3 rounded-lg transition-all ${
                resume
                  ? "bg-pure-white border border-[#18856B]/30 shadow-subtle"
                  : "bg-pure-white/60 border border-border"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  resume
                    ? "bg-[#18856B] text-white"
                    : "bg-venice-blue text-white"
                }`}
              >
                {resume ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-deep-teal truncate">1. Resume Parse</p>
                <p className="text-[11px] text-secondary-text truncate">
                  {resume ? `${resume.skills.length} skills parsed` : "Upload PDF/DOCX"}
                </p>
              </div>
            </div>

            {/* Step 2: Persona Q&A (Must) */}
            <div
              className={`flex items-center gap-2.5 p-3 rounded-lg transition-all ${
                personaProfile
                  ? "bg-pure-white border border-[#18856B]/30 shadow-subtle"
                  : resume
                  ? "bg-pure-white border-2 border-venice-blue shadow-subtle"
                  : "bg-pure-white/40 border border-border opacity-60"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  personaProfile
                    ? "bg-[#18856B] text-white"
                    : resume
                    ? "bg-venice-blue text-white animate-pulse"
                    : "bg-secondary-text/30 text-secondary-text"
                }`}
              >
                {personaProfile ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-deep-teal truncate">2. Persona Q&A</p>
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 rounded">Must</span>
                </div>
                <p className="text-[11px] text-secondary-text truncate">
                  {personaProfile ? "Working style verified" : resume ? "Complete right now" : "Unlocks after resume"}
                </p>
              </div>
            </div>

            {/* Step 3: Job Search */}
            <div
              className={`flex items-center gap-2.5 p-3 rounded-lg transition-all ${
                resume && personaProfile
                  ? "bg-pure-white border-2 border-[#18856B] shadow-subtle cursor-pointer hover:border-venice-blue"
                  : "bg-pure-white/40 border border-border opacity-60"
              }`}
              onClick={() => {
                if (resume && personaProfile) router.push("/jobs");
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  resume && personaProfile
                    ? "bg-venice-blue text-white"
                    : "bg-secondary-text/30 text-secondary-text"
                }`}
              >
                {resume && personaProfile ? (
                  <Briefcase className="w-4 h-4" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-deep-teal truncate">3. AI Job Search</p>
                <p className="text-[11px] text-secondary-text truncate">
                  {resume && personaProfile
                    ? "Ready to explore matches"
                    : "Locked until Persona done"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isHydrated ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <SkeletonCard />
          </div>
        ) : resume ? (
          <div className="space-y-10">
            {/* Step 1: Parsed Resume View */}
            <section aria-label="Parsed Resume Overview">
              <ParsedResumeView
                resume={resume}
                personaProfile={personaProfile}
                onAddSkill={addSkill}
                onRemoveSkill={removeSkill}
                onReset={clearResume}
                onScrollToPersona={scrollToPersona}
              />
            </section>

            {/* Step 2: Persona Q&A (Right after resume parse - MUST) */}
            <section ref={personaSectionRef} aria-label="Persona Assessment">
              <PersonaQnASection
                resume={resume}
                existingProfile={personaProfile}
                onProfileComplete={savePersonaProfile}
                onAnswerRecorded={addPersonaAnswer}
                onProceedToJobs={handleProceedToJobs}
                autoStart={justParsed}
              />
            </section>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-4 rounded-lg bg-pale-blue/60 border border-border text-xs text-secondary-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-venice-blue shrink-0" />
              <span>
                <strong>How it works:</strong> First, upload your resume to extract canonical skills and projects. Second, answer 6 quick questions grounded in your resume to establish your behavioral persona. Then discover verified jobs tailored by AI!
              </span>
            </div>

            <ResumeDropzone
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
