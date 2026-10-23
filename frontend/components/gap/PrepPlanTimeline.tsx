"use client";

import React from "react";
import type { PrepPlan } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { cn } from "@/lib/utils";
import { usePlanProgressStore } from "@/lib/planProgressStore";
import {
  Calendar,
  Clock,
  Check,
  ExternalLink,
  BookOpen,
  Code,
  Video,
  FileCode,
  Compass,
  RotateCcw,
} from "lucide-react";

interface PrepPlanTimelineProps {
  plan: PrepPlan;
  weeks: number;
  onWeeksChange: (w: number) => void;
  hoursPerWeek: number;
  onHoursChange: (h: number) => void;
  isLoading?: boolean;
}

export function PrepPlanTimeline({
  plan,
  weeks,
  onWeeksChange,
  hoursPerWeek,
  onHoursChange,
  isLoading = false,
}: PrepPlanTimelineProps) {
  const { completedTasks, toggleTask, resetProgress } = usePlanProgressStore(plan.job_id);

  let totalTasks = 0;
  let completedCount = 0;

  plan.weeks.forEach((w) => {
    w.tasks.forEach((_, tIdx) => {
      totalTasks++;
      const taskId = `w${w.week}_t${tIdx}`;
      if (completedTasks[taskId]) {
        completedCount++;
      }
    });
  });

  const completionPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getResourceIcon = (kind: string) => {
    switch (kind) {
      case "docs":
        return <BookOpen className="w-3.5 h-3.5 text-venice-blue" />;
      case "course":
        return <Compass className="w-3.5 h-3.5 text-venice-blue" />;
      case "practice":
        return <Code className="w-3.5 h-3.5 text-[#18856B]" />;
      case "project":
        return <FileCode className="w-3.5 h-3.5 text-venice-blue" />;
      case "video":
        return <Video className="w-3.5 h-3.5 text-[#B54747]" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-secondary-text" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Schedule Customizer Bar */}
      <Card variant="default" className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Weeks Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-venice-blue" />
              <span>Target Duration:</span>
            </span>
            <div className="flex items-center gap-2">
              {[2, 4, 6, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onWeeksChange(w)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-DEFAULT border transition-all duration-150 select-none",
                    weeks === w
                      ? "bg-venice-blue text-white font-medium border-transparent shadow-subtle"
                      : "bg-pale-blue text-secondary-text hover:text-primary-text border-border"
                  )}
                >
                  {w} Weeks
                </button>
              ))}
            </div>
          </div>

          {/* Hours Per Week */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-venice-blue" />
              <span>Weekly Commitment:</span>
            </span>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20].map((h) => (
                <button
                  key={h}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onHoursChange(h)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-DEFAULT border transition-all duration-150 select-none",
                    hoursPerWeek === h
                      ? "bg-rock-blue text-dark-navy font-semibold border-transparent shadow-subtle"
                      : "bg-pale-blue text-secondary-text hover:text-primary-text border-border"
                  )}
                >
                  {h} hrs/wk
                </button>
              ))}
            </div>
          </div>

          {/* Checklist reset */}
          <div className="self-end md:self-center">
            <button
              type="button"
              onClick={resetProgress}
              className="inline-flex items-center gap-1.5 text-xs text-secondary-text hover:text-primary-text p-2 rounded hover:bg-pale-blue transition-colors"
              title="Reset task checkmarks"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Checklist</span>
            </button>
          </div>
        </div>

        {/* Overall Completion Progress */}
        <div className="pt-4 mt-4 border-t border-border space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-secondary-text font-medium">Preparation Checklist Progress</span>
            <span className="text-primary-text font-bold tabular-nums">
              {completedCount} of {totalTasks} Tasks Completed ({completionPct}%)
            </span>
          </div>
          <Meter value={completionPct} variant="success" size="sm" showValue={false} />
        </div>
      </Card>

      {/* Week-by-Week Cards */}
      <div className="space-y-4">
        {plan.weeks.map((week) => (
          <Card key={week.week} variant="default" className="p-6 space-y-4">
            {/* Week Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-pale-blue text-venice-blue font-bold text-xs flex items-center justify-center shrink-0">
                  W{week.week}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-deep-teal flex items-center gap-2">
                    <span>{week.focus}</span>
                  </h4>
                  <p className="text-[11px] text-secondary-text">
                    Week {week.week} Milestone
                  </p>
                </div>
              </div>

              <Badge variant="neutral" size="sm">
                {week.tasks.length} Action Items
              </Badge>
            </div>

            {/* Tasks Checklist */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
                Milestone Tasks:
              </span>
              <div className="space-y-2">
                {week.tasks.map((task, tIdx) => {
                  const taskId = `w${week.week}_t${tIdx}`;
                  const isChecked = Boolean(completedTasks[taskId]);
                  return (
                    <div
                      key={taskId}
                      onClick={() => toggleTask(taskId)}
                      className={cn(
                        "p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none",
                        isChecked
                          ? "bg-emerald-50 border-[#18856B]/30 text-[#18856B]"
                          : "bg-pale-blue/30 border-border hover:border-rock-blue text-primary-text"
                      )}
                    >
                      <button
                        type="button"
                        aria-label="Toggle task"
                        className={cn(
                          "w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors shrink-0",
                          isChecked
                            ? "bg-[#18856B] text-white"
                            : "border border-border bg-pure-white hover:border-venice-blue"
                        )}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        className={cn(
                          "text-xs leading-relaxed transition-all",
                          isChecked && "line-through opacity-70"
                        )}
                      >
                        {task}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommended Learning Resources */}
            {week.resources && week.resources.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
                  Curated Free Resources:
                </span>
                <div className="flex flex-wrap gap-2">
                  {week.resources.map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pale-blue border border-border text-xs text-secondary-text hover:text-primary-text transition-colors"
                    >
                      {getResourceIcon(res.kind)}
                      <span className="text-xs text-primary-text font-medium">{res.title}</span>
                      <span className="text-[10px] text-venice-blue uppercase font-mono px-1 rounded bg-light-blue">
                        {res.kind}
                      </span>
                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-venice-blue"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
