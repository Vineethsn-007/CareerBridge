"use client";

import React from "react";
import type { SkillGap, Priority } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Meter } from "@/components/ui/Meter";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  HelpCircle,
} from "lucide-react";

interface SkillGapSummaryProps {
  gap: SkillGap;
}

export function SkillGapSummary({ gap }: SkillGapSummaryProps) {
  const { coverage_pct, matched, missing, job_title } = gap;

  // "0 missing" only means a full match when the listing actually required skills;
  // scraped rows can have empty requirement lists (no structured skills extracted).
  const hasRequirements = matched.length + missing.length > 0;

  // Group missing skills by priority
  const highPriority = missing.filter((m) => m.priority === "high");
  const mediumPriority = missing.filter((m) => m.priority === "medium");
  const lowPriority = missing.filter((m) => m.priority === "low");

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case "high":
        return <Badge variant="priority-high">Must Have</Badge>;
      case "medium":
        return <Badge variant="priority-medium">Expected</Badge>;
      case "low":
        return <Badge variant="priority-low">Bonus</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Card */}
      <Card variant="default" className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pale-blue border border-border flex items-center justify-center text-venice-blue shadow-subtle">
                <Target className="w-4 h-4 text-venice-blue" />
              </div>
              <div>
                <h3 className="text-base font-bold text-deep-teal">
                  Skill Coverage for {job_title}
                </h3>
                <p className="text-xs text-secondary-text">
                  You already have {matched.length} of {matched.length + missing.length} required competencies.
                </p>
              </div>
            </div>

            <div className="pt-2 max-w-md">
              <Meter
                value={Math.round(coverage_pct)}
                label="Role Readiness"
                variant={coverage_pct >= 70 ? "success" : coverage_pct >= 40 ? "brand" : "warning"}
                size="md"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <ScoreRing score={Math.round(coverage_pct)} size="lg" label="Skill Fit" />
          </div>
        </div>
      </Card>

      {/* Matched vs Missing Skills Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Matched Skills */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#18856B]" />
              <h4 className="text-sm font-bold text-deep-teal">Skills You Have</h4>
            </div>
            <Badge variant="verified" size="sm">
              {matched.length} Verified
            </Badge>
          </div>

          {matched.length === 0 ? (
            <p className="text-xs text-secondary-text italic">
              No direct skill matches detected on your resume yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {matched.map((skill) => (
                <Chip key={skill} label={skill} variant="matched" />
              ))}
            </div>
          )}
        </Card>

        {/* Missing Skills Overview */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B54747]" />
              <h4 className="text-sm font-bold text-deep-teal">Skills to Close</h4>
            </div>
            <Badge variant="priority-high" size="sm">
              {missing.length} Missing
            </Badge>
          </div>

          {missing.length === 0 && hasRequirements ? (
            <div className="p-4 rounded-lg bg-emerald-50 border border-[#18856B]/30 text-xs text-[#18856B] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Congratulations! You match 100% of the skills required for this job.</span>
            </div>
          ) : missing.length === 0 ? (
            <div className="p-4 rounded-lg bg-surface border border-border text-xs text-secondary-text flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-secondary-text" />
              <span>
                This listing has no structured skill requirements, so there is nothing to close.
                Compare roles by description and experience instead.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <Chip
                  key={item.skill}
                  label={item.skill}
                  variant={item.priority === "high" ? "missing" : "default"}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Prioritized Missing Skills Deep Dive */}
      {missing.length > 0 && (
        <Card variant="default" className="space-y-4">
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-bold text-deep-teal flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-venice-blue" />
              <span>Skill Gap Prioritization & Impact Analysis</span>
            </h4>
            <p className="text-xs text-secondary-text mt-0.5">
              Ranked by importance for the hiring team and interview evaluation.
            </p>
          </div>

          <div className="space-y-3">
            {[...highPriority, ...mediumPriority, ...lowPriority].map((item) => (
              <div
                key={item.skill}
                className="p-3.5 rounded-lg border border-border bg-pale-blue/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary-text">{item.skill}</span>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <p className="text-xs text-secondary-text flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-venice-blue shrink-0 mt-0.5" />
                    <span>{item.why}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
