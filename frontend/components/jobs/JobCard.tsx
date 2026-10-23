"use client";

import React from "react";
import Link from "next/link";
import type { JobMatch } from "@/lib/types";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  MapPin,
  Building2,
  ExternalLink,
  Target,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface JobCardProps {
  match: JobMatch;
  rank: number;
}

export function JobCard({ match, rank }: JobCardProps) {
  const { job, score, matched_skills, missing_skills, rationale } = match;

  return (
    <SpotlightCard
      data-cursor="card"
      className="flex flex-col justify-between space-y-5 border-border hover:border-rock-blue hover:-translate-y-1 hover:shadow-float transition-all duration-300 group bg-pure-white shadow-card"
      spotlightColor="rgba(132, 179, 206, 0.2)"
    >
      <div className="space-y-4">
        {/* Top Header: Rank, Badges, Score */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pale-blue text-deep-teal border border-border font-medium">
                #{rank.toString().padStart(2, "0")}
              </span>

              {job.verified ? (
                <Badge variant="verified">
                  Verified {job.last_verified ? `(${job.last_verified})` : ""}
                </Badge>
              ) : (
                <Badge variant="neutral">Verified Source</Badge>
              )}

              <Badge variant="outline" className="capitalize">
                {job.job_type}
              </Badge>

              <span className="text-xs text-secondary-text capitalize">
                {job.experience_level}
              </span>
            </div>

            <h3 className="text-lg font-bold text-deep-teal group-hover:text-venice-blue transition-colors line-clamp-1">
              {job.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-secondary-text">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-secondary-text" />
                {job.company}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-secondary-text" />
                {job.location}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <ScoreRing score={Math.round(score)} size="md" />
          </div>
        </div>

        {/* Short Job Description snippet */}
        <p className="text-xs text-secondary-text line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Rationale explanation banner */}
        {rationale && (
          <div className="p-2.5 rounded bg-pale-blue/70 border border-border flex items-center gap-2 text-xs text-secondary-text">
            <Sparkles className="w-3.5 h-3.5 text-venice-blue shrink-0" />
            <span className="line-clamp-1">{rationale}</span>
          </div>
        )}

        {/* Matched & Missing Skills Chips */}
        <div className="space-y-2 pt-1">
          {matched_skills.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#18856B]">
                Matched Skills ({matched_skills.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {matched_skills.map((skill) => (
                  <Chip key={skill} label={skill} variant="matched" />
                ))}
              </div>
            </div>
          )}

          {missing_skills.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-[#B54747]">
                Skills to Develop ({missing_skills.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missing_skills.map((skill) => (
                  <Chip key={skill} label={skill} variant="missing" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/jobs/${job.id}`}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Target className="w-3.5 h-3.5 text-venice-blue" />}
              className="text-xs"
            >
              Skill Gap & Prep
            </Button>
          </Link>

          <Link href={`/interview?job_id=${encodeURIComponent(job.id)}`}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<MessageSquare className="w-3.5 h-3.5 text-venice-blue" />}
              className="text-xs hover:text-venice-blue"
            >
              Practice Interview
            </Button>
          </Link>
        </div>

        <a
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/apply inline-flex items-center gap-1.5 text-xs text-venice-blue hover:text-deep-teal font-medium transition-colors"
        >
          <span>Official Apply</span>
          <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover/apply:translate-x-0.5 group-hover/apply:-translate-y-0.5" />
        </a>
      </div>
    </SpotlightCard>
  );
}
