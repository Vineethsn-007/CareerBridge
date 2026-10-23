"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { api } from "@/lib/api";
import type { ParsedResume, Education, Experience } from "@/lib/types";
import {
  UploadCloud,
  FileText,
  User,
  Mail,
  Phone,
  BookOpen,
  Briefcase,
  FolderGit2,
  Cpu,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function ResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setUploadState("uploading");
    setErrorMsg(null);
    setParsed(null);
    try {
      const result = await api.parseResume(file);
      setParsed(result);
      setUploadState("done");
    } catch (err: unknown) {
      setUploadState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to parse resume. Please try again."
      );
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const reset = () => {
    setUploadState("idle");
    setErrorMsg(null);
    setParsed(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFindJobs = () => {
    if (parsed) {
      sessionStorage.setItem("parsedResume", JSON.stringify(parsed));
      router.push("/jobs");
    }
  };

  return (
    <div className="min-h-screen bg-mesh py-10">
      <Container size="lg">
        <PageHeader
          title="Resume Upload"
          subtitle="Drop your PDF or text resume and let CareerBridge extract your skills, experience, and education instantly."
          backHref="/"
          backLabel="Home"
          badge={<Badge variant="verified">AI Powered</Badge>}
        />

        {uploadState !== "done" && (
          <div
            id="resume-dropzone"
            className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
              dragOver
                ? "border-accent bg-accent/5 scale-[1.01]"
                : uploadState === "uploading"
                ? "border-primary/50 bg-primary/5 cursor-not-allowed"
                : "border-border/60 bg-surface/40 hover:border-primary/50 hover:bg-primary/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => uploadState !== "uploading" && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              id="resume-file-input"
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
              {uploadState === "uploading" ? (
                <>
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-2 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">Parsing {fileName}...</p>
                    <p className="text-xs text-text-muted">Extracting skills, experience, and education</p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors duration-300 ${
                    dragOver
                      ? "bg-accent/20 border-accent/50"
                      : "bg-surface-2 border-border/60 group-hover:bg-primary/20 group-hover:border-primary/50"
                  }`}>
                    <UploadCloud className={`w-8 h-8 transition-colors duration-300 ${
                      dragOver ? "text-accent" : "text-text-muted group-hover:text-accent"
                    }`} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-text">
                      {dragOver ? "Drop it!" : "Drag & drop your resume"}
                    </p>
                    <p className="text-sm text-text-muted">
                      or <span className="text-accent underline underline-offset-2">browse files</span>
                    </p>
                    <p className="text-xs text-text-muted/70">Supports PDF, TXT, DOC, DOCX · Max 5 MB</p>
                  </div>
                </>
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        )}

        {uploadState === "error" && errorMsg && (
          <div className="mt-6">
            <ErrorMessage message={errorMsg} onRetry={reset} />
          </div>
        )}

        {uploadState === "done" && parsed && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Resume parsed successfully</p>
                  <p className="text-xs text-text-muted">{fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-muted hover:text-white"
                aria-label="Upload different resume"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(parsed.name || parsed.email || parsed.phone) && (
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-accent" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    {parsed.name && (
                      <h2 className="text-xl font-bold text-white truncate">{parsed.name}</h2>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {parsed.email && (
                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                          {parsed.email}
                        </span>
                      )}
                      {parsed.phone && (
                        <span className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Phone className="w-3.5 h-3.5 text-accent shrink-0" />
                          {parsed.phone}
                        </span>
                      )}
                    </div>
                    {parsed.summary && (
                      <p className="text-sm text-text-muted mt-2 leading-relaxed line-clamp-3">{parsed.summary}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {parsed.skills.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Skills <span className="ml-1 text-text-muted font-normal normal-case">({parsed.skills.length} detected)</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.skills.map((skill) => (
                    <Chip key={skill} label={skill} variant="matched" />
                  ))}
                </div>
              </Card>
            )}

            {parsed.education.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-highlight" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Education</h3>
                </div>
                <div className="space-y-3">
                  {parsed.education.map((edu: Education, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/50 border border-border/40">
                      <div className="w-2 h-2 rounded-full bg-highlight mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{edu.institution}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {edu.degree && <span className="text-xs text-text-muted">{edu.degree}</span>}
                          {edu.year && <span className="text-xs text-accent">{edu.year}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {parsed.experience.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Experience</h3>
                </div>
                <div className="space-y-3">
                  {parsed.experience.map((exp: Experience, i: number) => (
                    <div key={i} className="p-4 rounded-lg bg-surface-2/50 border border-border/40 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text">{exp.title}</p>
                        {exp.duration && (
                          <span className="text-xs text-text-muted shrink-0">{exp.duration}</span>
                        )}
                      </div>
                      {exp.company && (
                        <p className="text-xs text-accent font-medium">{exp.company}</p>
                      )}
                      {exp.summary && (
                        <p className="text-xs text-text-muted leading-relaxed">{exp.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {parsed.projects.length > 0 && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Projects</h3>
                </div>
                <div className="space-y-2">
                  {parsed.projects.map((project, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2/50 border border-border/40">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="text-sm text-text-muted">{project}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-8">
              <Button
                id="find-jobs-btn"
                size="lg"
                variant="highlight"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleFindJobs}
                className="flex-1 sm:flex-none shadow-glow-saffron"
              >
                Find Matching Jobs
              </Button>
              <Button
                id="upload-another-btn"
                size="lg"
                variant="secondary"
                onClick={reset}
                className="flex-1 sm:flex-none"
              >
                Upload Different Resume
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
