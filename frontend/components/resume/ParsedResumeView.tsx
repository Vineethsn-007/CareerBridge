"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ParsedResume } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Plus,
} from "lucide-react";

interface ParsedResumeViewProps {
  resume: ParsedResume;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  onReset: () => void;
}

export function ParsedResumeView({
  resume,
  onAddSkill,
  onRemoveSkill,
  onReset,
}: ParsedResumeViewProps) {
  const [newSkillInput, setNewSkillInput] = useState("");

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkillInput.trim()) {
      onAddSkill(newSkillInput.trim());
      setNewSkillInput("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-border bg-surface-2/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-glow font-bold text-lg">
            {resume.name ? resume.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                {resume.name || "Student Candidate"}
              </h2>
              <Badge variant="verified" size="sm">
                Parsed Successfully
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
              {resume.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-accent" />
                  {resume.email}
                </span>
              )}
              {resume.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {resume.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Re-upload
          </Button>
          <Link href="/jobs">
            <Button
              size="md"
              variant="highlight"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Match Verified Jobs
            </Button>
          </Link>
        </div>
      </div>

      {resume.summary && (
        <Card variant="default">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Professional Summary
          </h3>
          <p className="text-sm text-text leading-relaxed">{resume.summary}</p>
        </Card>
      )}

      {/* Skills Section with Add / Remove */}
      <Card variant="default" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Extracted Skills (Canonical Taxonomy)</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Review and curate your technical skills. We match these against verified listings.
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            {resume.skills.length} Skills
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {resume.skills.length === 0 ? (
            <p className="text-xs text-text-muted italic">No skills detected. Add some below!</p>
          ) : (
            resume.skills.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                variant="default"
                onRemove={() => onRemoveSkill(skill)}
              />
            ))
          )}
        </div>

        {/* Add Skill Input Form */}
        <form onSubmit={handleAddSkillSubmit} className="pt-3 border-t border-border/40 flex gap-2">
          <Input
            placeholder="Add a missing skill (e.g. Next.js, Docker, Java)..."
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            className="text-xs py-2"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="w-3.5 h-3.5 text-accent" />}
            className="shrink-0"
          >
            Add Skill
          </Button>
        </form>
      </Card>

      {/* Education & Experience Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Education */}
        <Card variant="default" className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-border/60 pb-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Education</span>
          </h3>

          {resume.education && resume.education.length > 0 ? (
            <div className="space-y-3">
              {resume.education.map((edu, idx) => (
                <div key={idx} className="space-y-0.5 text-xs">
                  <p className="font-semibold text-text">{edu.institution}</p>
                  <p className="text-text-muted">{edu.degree || "Degree Candidate"}</p>
                  {edu.year && <p className="text-[11px] text-accent">{edu.year}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted italic">No specific degrees listed in resume.</p>
          )}
        </Card>

        {/* Experience */}
        <Card variant="default" className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-border/60 pb-2">
            <Briefcase className="w-4 h-4 text-accent" />
            <span>Experience & Internships</span>
          </h3>

          {resume.experience && resume.experience.length > 0 ? (
            <div className="space-y-3">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="space-y-0.5 text-xs">
                  <p className="font-semibold text-text">{exp.title}</p>
                  <p className="text-text-muted">{exp.company || "Fresher Experience"}</p>
                  {exp.duration && <p className="text-[11px] text-text-muted">{exp.duration}</p>}
                  {exp.summary && <p className="text-[11px] text-text-muted/80 mt-1">{exp.summary}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted italic">
              Fresher profile (no formal corporate experience). Perfect for fresher listings!
            </p>
          )}
        </Card>
      </div>

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <Card variant="default" className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-border/60 pb-2">
            <FolderGit2 className="w-4 h-4 text-highlight" />
            <span>Academic & Personal Projects</span>
          </h3>
          <ul className="space-y-2 text-xs text-text-muted list-disc list-inside">
            {resume.projects.map((proj, idx) => (
              <li key={idx} className="leading-relaxed">
                <span className="text-text font-medium">{proj}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Bottom Floating CTA */}
      <div className="p-6 rounded-lg bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-card">
        <div>
          <h4 className="text-sm font-bold text-white">Ready to match with companies?</h4>
          <p className="text-xs text-text-muted">
            Our matching engine evaluates your {resume.skills.length} skills against verified job descriptions.
          </p>
        </div>
        <Link href="/jobs" className="w-full sm:w-auto">
          <Button
            size="lg"
            variant="highlight"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto shadow-glow-saffron"
          >
            Find Matching Jobs
          </Button>
        </Link>
      </div>
    </div>
  );
}
