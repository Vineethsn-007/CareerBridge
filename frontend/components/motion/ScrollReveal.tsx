"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface EditorialHeadingProps {
  lines: string[];
  as?: "h1" | "h2" | "h3" | "h4";
  className?: string;
  lineClassName?: string;
  delay?: number;
}

/**
 * EditorialHeading: Renders display headlines with a cinematic line-by-line reveal
 * using clipping containers (overflow-hidden) and GSAP ScrollTrigger.
 */
export function EditorialHeading({
  lines,
  as: Component = "h2",
  className,
  lineClassName,
  delay = 0,
}: EditorialHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!headingRef.current || prefersReducedMotion()) return;

      const lineEls = headingRef.current.querySelectorAll<HTMLElement>(".reveal-line");
      if (!lineEls.length) return;

      gsap.fromTo(
        lineEls,
        {
          yPercent: 110,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.12,
          delay,
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 88%",
            once: true,
          },
        }
      );
    },
    { scope: headingRef }
  );

  return (
    <Component ref={headingRef} className={cn("font-serif font-bold text-deep-teal", className)}>
      {lines.map((line, idx) => (
        <span key={idx} className="block overflow-hidden pb-1">
          <span className={cn("reveal-line block will-change-transform", lineClassName)}>
            {line}
          </span>
        </span>
      ))}
    </Component>
  );
}

interface ImageMaskRevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
  scaleStart?: number;
  delay?: number;
}

/**
 * ImageMaskReveal: Applies cinematic mask expansion to photographs and previews
 * using CSS clip-path animated by GSAP ScrollTrigger.
 */
export function ImageMaskReveal({
  children,
  className,
  direction = "horizontal",
  scaleStart = 1.08,
  delay = 0,
}: ImageMaskRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || prefersReducedMotion()) return;

      const container = containerRef.current;
      const innerImg = container.querySelector<HTMLElement>("img, picture, .inner-reveal-target");

      const initialClip =
        direction === "horizontal"
          ? "inset(0% 100% 0% 0%)"
          : "inset(100% 0% 0% 0%)";

      gsap.set(container, { clipPath: initialClip });
      if (innerImg) {
        gsap.set(innerImg, { scale: scaleStart });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top 85%",
          once: true,
        },
        delay,
      });

      tl.to(container, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.1,
        ease: "power3.inOut",
      });

      if (innerImg) {
        tl.to(
          innerImg,
          {
            scale: 1,
            duration: 1.3,
            ease: "power2.out",
          },
          0
        );
      }
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden will-change-[clip-path]", className)}
      style={prefersReducedMotion() ? undefined : { clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <div className="inner-reveal-target w-full h-full will-change-transform">{children}</div>
    </div>
  );
}

interface ScrollParallaxProps {
  children: React.ReactNode;
  yOffset?: number;
  className?: string;
  speed?: number;
}

/**
 * ScrollParallax: Subtle, scrubbed vertical parallax translation linked directly
 * to viewport scroll position using ScrollTrigger scrub.
 */
export function ScrollParallax({
  children,
  yOffset = -40,
  className,
}: ScrollParallaxProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!elementRef.current || prefersReducedMotion()) return;

      gsap.to(elementRef.current, {
        y: yOffset,
        ease: "none",
        scrollTrigger: {
          trigger: elementRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: elementRef }
  );

  return (
    <div ref={elementRef} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
