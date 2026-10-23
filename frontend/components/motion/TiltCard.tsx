"use client";

import React, { useRef, useEffect } from "react";
import { gsap, prefersReducedMotion, isFinePointer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Max tilt rotation on X-axis (default: 3deg) */
  maxTiltX?: number;
  /** Max tilt rotation on Y-axis (default: 4deg) */
  maxTiltY?: number;
  /** Subtle elevation lift in px on hover (default: 4px) */
  lift?: number;
  /** Whether to show a soft mouse-following radial spotlight (default: true) */
  spotlight?: boolean;
  spotlightColor?: string;
  className?: string;
}

export function TiltCard({
  children,
  maxTiltX = 3,
  maxTiltY = 4,
  lift = 4,
  spotlight = true,
  spotlightColor = "rgba(132, 179, 206, 0.18)",
  className,
  ...props
}: TiltCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card || prefersReducedMotion() || !isFinePointer()) {
      return;
    }

    // High performance GSAP quickTo setters
    const rotateXTo = gsap.quickTo(card, "rotateX", { duration: 0.35, ease: "power2.out" });
    const rotateYTo = gsap.quickTo(card, "rotateY", { duration: 0.35, ease: "power2.out" });
    const yTo = gsap.quickTo(card, "y", { duration: 0.35, ease: "power2.out" });

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Normalized coordinates from -1 to 1
      const normX = Math.max(-1, Math.min(1, (px / rect.width) * 2 - 1));
      const normY = Math.max(-1, Math.min(1, (py / rect.height) * 2 - 1));

      // Calculate tilt: moving up tilts top away (positive rotateX), moving right tilts right away (positive rotateY)
      rotateXTo(-normY * maxTiltX);
      rotateYTo(normX * maxTiltY);
      yTo(-lift);

      // Update spotlight position via CSS custom properties (zero React re-renders)
      if (spotlight) {
        card.style.setProperty("--spotlight-x", `${px}px`);
        card.style.setProperty("--spotlight-y", `${py}px`);
        card.style.setProperty("--spotlight-opacity", "1");
      }
    };

    const handlePointerLeave = () => {
      // Smooth return to rest
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        overwrite: "auto",
      });

      if (spotlight) {
        card.style.setProperty("--spotlight-opacity", "0");
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      gsap.killTweensOf(card);
    };
  }, [maxTiltX, maxTiltY, lift, spotlight]);

  return (
    <div
      ref={containerRef}
      className="perspective-1000"
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        data-cursor="card"
        className={cn(
          "tilt-card relative transition-[box-shadow,border-color] duration-300 will-change-transform transform-gpu overflow-hidden",
          className
        )}
        style={{
          transformStyle: "preserve-3d",
          ["--spotlight-x" as string]: "50%",
          ["--spotlight-y" as string]: "50%",
          ["--spotlight-opacity" as string]: "0",
        }}
        {...props}
      >
        {/* Cursor-responsive ambient highlight */}
        {spotlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10"
            style={{
              opacity: "var(--spotlight-opacity, 0)",
              background: `radial-gradient(420px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), ${spotlightColor}, transparent 65%)`,
            }}
          />
        )}
        <div className="relative z-20 w-full h-full">{children}</div>
      </div>
    </div>
  );
}
