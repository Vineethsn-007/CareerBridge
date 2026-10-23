"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScoreRingProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number; // 0 to 100
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  label?: string;
  animate?: boolean;
}

export function ScoreRing({
  score,
  size = "md",
  strokeWidth = 4,
  label,
  animate = true,
  className,
  ...props
}: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }

    const duration = 900; // ms
    const startTime = performance.now();
    const startValue = 0;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startValue + (score - startValue) * ease));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [score, animate]);

  const dimensions = {
    sm: { dimension: 48, radius: 18, fontSize: "text-xs" },
    md: { dimension: 64, radius: 24, fontSize: "text-sm" },
    lg: { dimension: 96, radius: 38, fontSize: "text-xl" },
  };

  const { dimension, radius, fontSize } = dimensions[size];
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 80) return "url(#brand-gradient-score)";
    if (val >= 60) return "#16587B";
    if (val >= 40) return "#B87926";
    return "#B54747";
  };

  return (
    <div
      className={cn("relative inline-flex flex-col items-center justify-center", className)}
      {...props}
    >
      <svg
        width={dimension}
        height={dimension}
        className="-rotate-90 transform"
        viewBox={`0 0 ${dimension} ${dimension}`}
      >
        <defs>
          <linearGradient id="brand-gradient-score" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16587B" />
            <stop offset="100%" stopColor="#84B3CE" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke="#D8E1DE"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress fill */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center score readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tracking-tight text-primary-text tabular-nums", fontSize)}>
          {displayScore}
          <span className="text-[10px] text-secondary-text font-normal">%</span>
        </span>
      </div>
      {label && <span className="mt-1 text-[11px] text-secondary-text">{label}</span>}
    </div>
  );
}
