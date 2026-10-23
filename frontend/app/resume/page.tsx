"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResumeDropzone } from "@/components/resume/ResumeDropzone";
import { ParsedResumeView } from "@/components/resume/ParsedResumeView";
import { useResumeStore } from "@/lib/resumeStore";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function ResumePage() {
  const {
    resume,
    isHydrated,
    saveResume,
    clearResume,
    addSkill,
    removeSkill,
  } = useResumeStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await api.parseResume(file);
      saveResume(parsed);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse resume. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-10 bg-mesh min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Resume Intelligence"
          subtitle="Upload your resume to extract skills, review your profile, and discover personalized verified job openings."
          badge={
            resume ? (
              <Badge variant="verified">Resume Loaded</Badge>
            ) : (
              <Badge variant="neutral">Step 1 of 4</Badge>
            )
          }
        />

        {!isHydrated ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <SkeletonCard />
          </div>
        ) : resume ? (
          <ParsedResumeView
            resume={resume}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onReset={clearResume}
          />
        ) : (
          <ResumeDropzone
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            error={error}
          />
        )}
      </Container>
    </div>
  );
}
