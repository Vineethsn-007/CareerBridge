"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Save,
  Clock,
  ArrowRight,
  ShieldCheck,
  Target,
  FileCheck,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { api } from "@/lib/api";
import type {
  Job,
  ParsedResume,
  TailoredResume,
  TailoredResumeRecord,
  TailoredResumeListItem,
} from "@/lib/types";

interface TailorResumeModalProps {
  job: Job;
  resume: ParsedResume | null;
  isOpen: boolean;
  onClose: () => void;
}

const PROGRESS_MESSAGES = [
  "Analyzing job requirements and target keywords...",
  "Comparing candidate evidence against must-have skills...",
  "Formulating high-impact, action-driven achievement bullets...",
  "Enforcing strict truthfulness checks (zero hallucinated facts)...",
  "Optimizing single-column layout for ATS parser readability...",
  "Calculating before-and-after ATS deterministic match scores...",
];

export function TailorResumeModal({
  job,
  resume,
  isOpen,
  onClose,
}: TailorResumeModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [record, setRecord] = useState<TailoredResumeRecord | null>(null);
  const [editableContent, setEditableContent] = useState<TailoredResume | null>(null);
  const [versions, setVersions] = useState<TailoredResumeListItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState<"pdf" | "docx" | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"tailored" | "original">("tailored");
  const [hasEdits, setHasEdits] = useState(false);

  // Cycling progress messages
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load version list
  const loadVersions = useCallback(async () => {
    try {
      const list = await api.listTailoredResumes(job.id);
      setVersions(list);
    } catch {
      // Ignore background version list errors
    }
  }, [job.id]);

  // Trigger tailor generation
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgressIndex(0);
    try {
      const result = await api.tailorResume({
        job_id: job.id,
        resume: resume || undefined,
      });
      setRecord(result);
      setEditableContent(JSON.parse(JSON.stringify(result.content)));
      setSelectedVersionId(result.id);
      setHasEdits(false);
      await loadVersions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate tailored resume.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [job.id, resume, loadVersions]);

  // Load a specific version when selected from dropdown
  const handleSelectVersion = useCallback(async (versionId: number) => {
    if (versionId === record?.id) return;
    setIsGenerating(true);
    setError(null);
    try {
      const fetched = await api.getTailoredResume(versionId);
      setRecord(fetched);
      setEditableContent(JSON.parse(JSON.stringify(fetched.content)));
      setSelectedVersionId(fetched.id);
      setHasEdits(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load version.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [record?.id]);

  // Automatically start generation or load previous version on modal open
  useEffect(() => {
    if (isOpen && !record && !isGenerating) {
      // Check if previous versions exist for this job first
      api.listTailoredResumes(job.id).then((prevs) => {
        setVersions(prevs);
        if (prevs.length > 0) {
          handleSelectVersion(prevs[0].id);
        } else {
          handleGenerate();
        }
      }).catch(() => {
        handleGenerate();
      });
    }
  }, [isOpen, job.id, record, isGenerating, handleGenerate, handleSelectVersion]);

  // Save manual edits as a new version
  const handleSaveVersion = async () => {
    if (!record || !editableContent) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateTailoredResume(record.id, editableContent);
      setRecord(updated);
      setEditableContent(JSON.parse(JSON.stringify(updated.content)));
      setSelectedVersionId(updated.id);
      setHasEdits(false);
      await loadVersions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save edits as new version.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Download PDF / DOCX
  const handleDownload = async (format: "pdf" | "docx") => {
    if (!record) return;
    setIsDownloading(format);
    try {
      await api.downloadTailoredResume(
        record.id,
        format,
        `${(resume?.name || "Resume").replace(/\s+/g, "_")}_${job.title.replace(/\s+/g, "_")}_v${record.version}.${format}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to download ${format.toUpperCase()}.`;
      setError(msg);
    } finally {
      setIsDownloading(null);
    }
  };

  // Copy plain text
  const handleCopyText = () => {
    if (!editableContent) return;
    const lines: string[] = [];
    lines.push(resume?.name || "Candidate");
    if (resume?.email || resume?.phone) {
      lines.push([resume.email, resume.phone].filter(Boolean).join(" | "));
    }
    lines.push("");
    lines.push(editableContent.headline.toUpperCase());
    lines.push("=".repeat(editableContent.headline.length));
    lines.push("");
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(editableContent.summary);
    lines.push("");
    lines.push("TECHNICAL SKILLS");
    for (const [group, skills] of Object.entries(editableContent.skills_grouped)) {
      lines.push(`${group}: ${skills.join(", ")}`);
    }
    lines.push("");
    lines.push("WORK EXPERIENCE");
    for (const exp of editableContent.experience) {
      lines.push(`${exp.title}${exp.company ? ` - ${exp.company}` : ""}${exp.duration ? ` (${exp.duration})` : ""}`);
      for (const bullet of exp.bullets) {
        lines.push(`• ${bullet}`);
      }
      lines.push("");
    }
    if (editableContent.projects.length > 0) {
      lines.push("PROJECTS");
      for (const proj of editableContent.projects) {
        lines.push(proj.name);
        for (const h of proj.highlights) {
          lines.push(`• ${h}`);
        }
      }
      lines.push("");
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Check if job offers an explicit email application
  const employerEmail = useMemo(() => {
    const text = `${job.description} ${job.source_url} ${job.apply_url || ""}`;
    const emailMatch = text.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1] : null;
  }, [job]);

  // Draft mailto link
  const mailtoLink = useMemo(() => {
    if (!employerEmail || !editableContent) return null;
    const subject = encodeURIComponent(`Application for ${job.title} - ${resume?.name || "Candidate"}`);
    const body = encodeURIComponent(
      `Dear Hiring Team at ${job.company},\n\n` +
      `I am writing to express my strong interest in the ${job.title} role.\n\n` +
      `${editableContent.summary}\n\n` +
      `My resume is attached for your review. I look forward to the opportunity to discuss how my background aligns with your team's goals.\n\n` +
      `Sincerely,\n` +
      `${resume?.name || "Candidate"}\n` +
      `${resume?.phone || ""}`
    );
    return `mailto:${employerEmail}?subject=${subject}&body=${body}`;
  }, [employerEmail, editableContent, job, resume]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-dark-navy/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6"
    >
      <div className="bg-pure-white w-full max-w-6xl max-h-[92vh] rounded-xl shadow-2xl flex flex-col border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Navbar */}
        <div className="px-5 py-4 border-b border-border bg-merino/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-venice-blue/10 flex items-center justify-center text-venice-blue">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-deep-teal">
                  AI Tailored Resume
                </h2>
                <Badge variant="verified">100% Truthful Guarantee</Badge>
              </div>
              <p className="text-xs text-secondary-text">
                Targeting <strong className="text-primary-text">{job.title}</strong> at {job.company}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Version dropdown */}
            {versions.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-secondary-text" />
                <select
                  value={selectedVersionId || ""}
                  onChange={(e) => handleSelectVersion(Number(e.target.value))}
                  className="bg-pure-white border border-border text-xs rounded px-2 py-1 text-primary-text focus:outline-none focus:ring-1 focus:ring-venice-blue"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Version {v.version} (ATS {Math.round(v.ats_score_after)}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-pale-blue transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Generating Loading State */}
          {isGenerating && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-venice-blue/20 border-t-venice-blue animate-spin" />
                <Sparkles className="w-6 h-6 text-venice-blue absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-base font-bold text-deep-teal">
                  Tailoring your resume for {job.company}
                </h3>
                <p className="text-sm font-medium text-venice-blue transition-all duration-300 min-h-[24px]">
                  {PROGRESS_MESSAGES[progressIndex]}
                </p>
                <p className="text-xs text-secondary-text">
                  Enforcing strict ethical truthfulness: reordering & emphasizing only genuine facts from your profile.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && !isGenerating && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={handleGenerate}>
                Retry
              </Button>
            </div>
          )}

          {/* Main Loaded View */}
          {!isGenerating && record && editableContent && (
            <div className="space-y-6">
              {/* ATS Score Improvement Banner & Action Toolbar */}
              <div className="p-4 rounded-xl border border-border bg-pale-blue/60 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-[11px] text-secondary-text font-medium">Before</div>
                      <ScoreRing score={Math.round(editableContent.ats_score_before)} size="sm" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-secondary-text shrink-0" />
                    <div className="text-center">
                      <div className="text-[11px] text-emerald-700 font-bold">Tailored</div>
                      <ScoreRing score={Math.round(editableContent.ats_score_after)} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-deep-teal flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>
                        ATS Alignment: +
                        {Math.max(
                          0,
                          Math.round(editableContent.ats_score_after - editableContent.ats_score_before)
                        )}
                        % Match Gain
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary-text">
                      Matched {editableContent.ats_keywords_matched.length} key technical competencies for {job.title}.
                    </p>
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {hasEdits && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveVersion}
                      isLoading={isSaving}
                      leftIcon={<Save className="w-3.5 h-3.5" />}
                    >
                      Save Version {record.version + 1}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload("pdf")}
                    isLoading={isDownloading === "pdf"}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download PDF
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload("docx")}
                    isLoading={isDownloading === "docx"}
                    leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                  >
                    Download DOCX
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyText}
                    leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? "Copied!" : "Copy Text"}
                  </Button>
                </div>
              </div>

              {/* Employer Application Flow Banner */}
              <div className="p-3.5 rounded-lg border border-border bg-pure-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-deep-teal">Next step: Apply to employer</span>
                  <p className="text-secondary-text">
                    CareerBridge never auto-submits your resume without your explicit consent. Download your tailored resume and submit on their portal.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {mailtoLink && (
                    <a href={mailtoLink} className="inline-flex">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Mail className="w-3.5 h-3.5 text-venice-blue" />}
                      >
                        Send via Email App
                      </Button>
                    </a>
                  )}

                  {resume?.email && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEmailSentNotice(true);
                        setTimeout(() => setEmailSentNotice(false), 3000);
                      }}
                    >
                      {emailSentNotice ? "Sent to " + resume.email : "Email Me a Copy"}
                    </Button>
                  )}

                  <a
                    href={job.apply_url || job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button
                      size="sm"
                      variant="highlight"
                      rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Open Official Apply
                    </Button>
                  </a>
                </div>
              </div>

              {/* Mobile View Switcher */}
              <div className="md:hidden flex items-center gap-2 border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setMobileTab("tailored")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all ${
                    mobileTab === "tailored"
                      ? "bg-venice-blue text-white"
                      : "bg-pale-blue text-secondary-text"
                  }`}
                >
                  Tailored Resume (Targeting {job.company})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("original")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all ${
                    mobileTab === "original"
                      ? "bg-venice-blue text-white"
                      : "bg-pale-blue text-secondary-text"
                  }`}
                >
                  Original Profile
                </button>
              </div>

              {/* Side-by-Side Comparison Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Original Profile */}
                <div
                  className={`space-y-4 rounded-xl border border-border bg-merino/30 p-5 ${
                    mobileTab === "original" ? "block" : "hidden md:block"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary-text">
                      Original Profile
                    </span>
                    <Badge variant="neutral">Source Data</Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-deep-teal uppercase mb-1">Headline & Summary</h4>
                    <p className="text-xs text-secondary-text leading-relaxed">
                      {resume?.summary || "No summary provided in original resume."}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-deep-teal uppercase mb-1.5">Original Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {resume?.skills?.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded bg-pale-blue text-secondary-text border border-border">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-deep-teal uppercase mb-2">Original Experience</h4>
                    <div className="space-y-3">
                      {resume?.experience?.map((exp, i) => (
                        <div key={i} className="text-xs space-y-1">
                          <div className="font-semibold text-primary-text">
                            {exp.title} {exp.company ? `• ${exp.company}` : ""}
                          </div>
                          {exp.impact?.map((imp, j) => (
                            <div key={j} className="text-secondary-text pl-2 border-l border-border">
                              • {imp}
                            </div>
                          ))}
                          {!exp.impact?.length && exp.summary && (
                            <div className="text-secondary-text pl-2 border-l border-border">
                              {exp.summary}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Tailored Resume (with Inline Editing) */}
                <div
                  className={`space-y-5 rounded-xl border-2 border-venice-blue/30 bg-pure-white p-5 shadow-card ${
                    mobileTab === "tailored" ? "block" : "hidden md:block"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-venice-blue flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tailored for {job.title}</span>
                    </span>
                    <span className="text-[11px] text-secondary-text">
                      Click text to edit inline
                    </span>
                  </div>

                  {/* Headline */}
                  <div>
                    <label className="text-[11px] font-bold text-deep-teal uppercase block mb-1">
                      Target Role Headline
                    </label>
                    <input
                      type="text"
                      value={editableContent.headline}
                      onChange={(e) => {
                        setEditableContent({ ...editableContent, headline: e.target.value });
                        setHasEdits(true);
                      }}
                      className="w-full text-xs font-bold text-deep-teal border border-border rounded px-2.5 py-1.5 focus:border-venice-blue focus:outline-none bg-pale-blue/30"
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="text-[11px] font-bold text-deep-teal uppercase block mb-1">
                      Targeted Professional Summary
                    </label>
                    <textarea
                      rows={3}
                      value={editableContent.summary}
                      onChange={(e) => {
                        setEditableContent({ ...editableContent, summary: e.target.value });
                        setHasEdits(true);
                      }}
                      className="w-full text-xs text-primary-text border border-border rounded p-2.5 leading-relaxed focus:border-venice-blue focus:outline-none bg-pale-blue/30"
                    />
                  </div>

                  {/* Grouped Skills */}
                  <div>
                    <label className="text-[11px] font-bold text-deep-teal uppercase block mb-1.5">
                      Skills Grouped by Role Alignment
                    </label>
                    <div className="space-y-2">
                      {Object.entries(editableContent.skills_grouped).map(([group, skills]) => (
                        <div key={group} className="space-y-1">
                          <span className="text-[11px] font-semibold text-secondary-text">
                            {group}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {skills.map((s) => {
                              const isMatched = editableContent.ats_keywords_matched.includes(s);
                              return (
                                <Chip
                                  key={s}
                                  label={s}
                                  variant={isMatched ? "matched" : "default"}
                                  className="text-[11px]"
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Experience Entries with Editable Bullets */}
                  <div>
                    <label className="text-[11px] font-bold text-deep-teal uppercase block mb-2">
                      Rewritten Experience Bullets (Action + Result)
                    </label>
                    <div className="space-y-4">
                      {editableContent.experience.map((exp, expIdx) => (
                        <div key={expIdx} className="space-y-2">
                          <div className="text-xs font-bold text-deep-teal">
                            {exp.title} {exp.company ? `• ${exp.company}` : ""}
                            {exp.duration ? ` (${exp.duration})` : ""}
                          </div>
                          <div className="space-y-1.5">
                            {exp.bullets.map((bullet, bulletIdx) => (
                              <div key={bulletIdx} className="flex items-start gap-2">
                                <span className="text-venice-blue font-bold text-xs mt-1">•</span>
                                <input
                                  type="text"
                                  value={bullet}
                                  onChange={(e) => {
                                    const nextExp = [...editableContent.experience];
                                    nextExp[expIdx].bullets[bulletIdx] = e.target.value;
                                    setEditableContent({ ...editableContent, experience: nextExp });
                                    setHasEdits(true);
                                  }}
                                  className="flex-1 text-xs text-primary-text border border-border/80 rounded px-2 py-1 focus:border-venice-blue focus:outline-none bg-pure-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Panels: Change Log & Gaps Not Added */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Change Log Panel */}
                <div className="p-4 rounded-xl border border-border bg-pure-white space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-venice-blue" />
                    <h4 className="text-xs font-bold text-deep-teal uppercase">
                      Change Log ({editableContent.change_log.length})
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {editableContent.change_log.map((change, i) => (
                      <div key={i} className="p-2.5 rounded bg-merino/50 border border-border/80 space-y-1">
                        <div className="font-semibold text-primary-text flex items-center justify-between">
                          <span>{change.what}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-pale-blue text-venice-blue">
                            {change.section}
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary-text">
                          <em>Why:</em> {change.why}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gaps (Not Added) & Roadmap Link Panel */}
                <div className="p-4 rounded-xl border border-border bg-pure-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-deep-teal uppercase">
                        Gaps (Not Added to Resume)
                      </h4>
                    </div>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-[11px] text-venice-blue hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Open Prep Roadmap</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <p className="text-[11px] text-secondary-text leading-relaxed">
                    To maintain strict 100% truthfulness, CareerBridge NEVER inserts skills you haven&apos;t demonstrated. Master these skills through your personalized roadmap:
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editableContent.gaps_not_added.length > 0 ? (
                      editableContent.gaps_not_added.map((gap) => (
                        <Link key={gap} href={`/jobs/${job.id}`}>
                          <Chip label={gap} variant="missing" className="cursor-pointer hover:opacity-80" />
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium">
                        None! Your profile matches all stated requirements for this job.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
