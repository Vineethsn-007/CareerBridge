"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Search, SlidersHorizontal, RotateCcw, ShieldCheck } from "lucide-react";

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  selectedJobType: string;
  onJobTypeChange: (type: string) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyToggle: () => void;
  locations: string[];
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
}

export function JobFilters({
  searchQuery,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  selectedJobType,
  onJobTypeChange,
  verifiedOnly,
  onVerifiedOnlyToggle,
  locations,
  totalCount,
  filteredCount,
  onReset,
}: JobFiltersProps) {
  const jobTypes = [
    { value: "all", label: "All Types" },
    { value: "full-time", label: "Full-Time" },
    { value: "internship", label: "Internships" },
    { value: "contract", label: "Contract" },
  ];

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedLocation !== "all" ||
    selectedJobType !== "all" ||
    verifiedOnly;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-4 shadow-card">
      {/* Top Search bar & quick stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Filter by role, skills, company..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onVerifiedOnlyToggle}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-DEFAULT border transition-all duration-200 font-medium",
              verifiedOnly
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
                : "bg-surface-2 border-border text-text-muted hover:text-text hover:border-white/20"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Only</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="p-2 rounded-DEFAULT bg-surface-2 border border-border text-text-muted hover:text-text hover:border-white/20 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills: Location & Job Type */}
      <div className="space-y-3 pt-1 border-t border-border/40">
        {/* Job Types */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-accent" />
            <span>Type:</span>
          </span>
          {jobTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onJobTypeChange(type.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs transition-all duration-150 shrink-0 select-none",
                selectedJobType === type.value
                  ? "bg-brand-gradient text-white font-medium shadow-glow"
                  : "bg-surface-2 text-text-muted hover:text-text hover:bg-surface-2/80 border border-border"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Locations */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0 mr-1">
            City:
          </span>
          <button
            type="button"
            onClick={() => onLocationChange("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs transition-all duration-150 shrink-0 select-none",
              selectedLocation === "all"
                ? "bg-accent/20 border border-accent/40 text-accent font-medium"
                : "bg-surface-2 text-text-muted hover:text-text border border-border"
            )}
          >
            All Cities
          </button>
          {locations.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onLocationChange(loc)}
              className={cn(
                "px-3 py-1 rounded-full text-xs transition-all duration-150 shrink-0 select-none",
                selectedLocation === loc
                  ? "bg-accent/20 border border-accent/40 text-accent font-medium"
                  : "bg-surface-2 text-text-muted hover:text-text border border-border"
              )}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
        <span>
          Showing <span className="text-text font-semibold">{filteredCount}</span> of{" "}
          <span className="text-text font-semibold">{totalCount}</span> matched openings
        </span>
        {hasActiveFilters && filteredCount < totalCount && (
          <Badge variant="highlight" size="sm">
            Filtered
          </Badge>
        )}
      </div>
    </div>
  );
}
