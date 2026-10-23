"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, isFinePointer } from "@/lib/motion";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(132, 179, 206, 0.2)",
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || prefersReducedMotion() || !isFinePointer()) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty("--spotlight-x", `${x}px`);
      card.style.setProperty("--spotlight-y", `${y}px`);
      card.style.setProperty("--spotlight-opacity", "1");
    };

    const handlePointerLeave = () => {
      card.style.setProperty("--spotlight-opacity", "0");
    };

    card.addEventListener("pointermove", handlePointerMove, { passive: true });
    card.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      card.removeEventListener("pointermove", handlePointerMove);
      card.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      data-cursor="card"
      className={cn(
        "relative rounded-md border border-border bg-pure-white p-6 shadow-card overflow-hidden transition-all duration-300 hover:border-rock-blue/70 hover:shadow-float group",
        className
      )}
      style={{
        ["--spotlight-x" as string]: "50%",
        ["--spotlight-y" as string]: "50%",
        ["--spotlight-opacity" as string]: "0",
      }}
      {...props}
    >
      {/* Soft Cursor-Responsive Spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity: "var(--spotlight-opacity, 0)",
          background: `radial-gradient(450px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), ${spotlightColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
