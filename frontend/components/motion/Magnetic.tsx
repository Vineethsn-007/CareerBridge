"use client";

import React, { useRef, useEffect } from "react";
import { gsap, prefersReducedMotion, isFinePointer } from "@/lib/motion";

interface MagneticProps {
  children: React.ReactNode;
  /** Max translation distance in pixels (default: 6px) */
  maxTranslation?: number;
  /** Magnetic attraction padding radius around the element in pixels (default: 32px) */
  radius?: number;
  /** Additional container classes */
  className?: string;
  /** Whether the effect is active (default: true) */
  enabled?: boolean;
}

export function Magnetic({
  children,
  maxTranslation = 6,
  radius = 32,
  className = "inline-flex",
  enabled = true,
}: MagneticProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !enabled || prefersReducedMotion() || !isFinePointer()) {
      return;
    }

    // High performance GSAP quickTo functions
    const xTo = gsap.quickTo(container, "x", {
      duration: 0.4,
      ease: "power3.out",
    });
    const yTo = gsap.quickTo(container, "y", {
      duration: 0.4,
      ease: "power3.out",
    });

    // Content secondary parallax translation for physical layered depth
    const contentXTo = content
      ? gsap.quickTo(content, "x", { duration: 0.4, ease: "power3.out" })
      : null;
    const contentYTo = content
      ? gsap.quickTo(content, "y", { duration: 0.4, ease: "power3.out" })
      : null;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const threshold = Math.max(rect.width, rect.height) / 2 + radius;

      if (dist < threshold) {
        // Calculate non-linear falloff (stronger near center, weaker near edge)
        const power = 1 - Math.min(dist / threshold, 1);
        const pullX = (e.clientX - centerX) * 0.25 * power;
        const pullY = (e.clientY - centerY) * 0.25 * power;

        // Clamp to max translation
        const clampedX = Math.max(-maxTranslation, Math.min(maxTranslation, pullX));
        const clampedY = Math.max(-maxTranslation, Math.min(maxTranslation, pullY));

        xTo(clampedX);
        yTo(clampedY);

        if (contentXTo && contentYTo) {
          contentXTo(clampedX * 0.35);
          contentYTo(clampedY * 0.35);
        }
      } else {
        // Return to neutral when pointer moves outside threshold
        xTo(0);
        yTo(0);
        if (contentXTo && contentYTo) {
          contentXTo(0);
          contentYTo(0);
        }
      }
    };

    const handlePointerLeave = () => {
      // Smooth return to rest with ease
      gsap.to(container, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });

      if (content) {
        gsap.to(content, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
          overwrite: "auto",
        });
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      gsap.killTweensOf([container, content]);
    };
  }, [maxTranslation, radius, enabled]);

  return (
    <div
      ref={containerRef}
      data-magnetic="true"
      data-cursor="cta"
      className={className}
      style={{ willChange: "transform" }}
    >
      <div ref={contentRef} className="w-full h-full inline-flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
