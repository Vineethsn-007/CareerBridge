"use client";

import React, { useRef } from "react";
import { Container } from "@/components/ui/Container";
import { EditorialHeading } from "@/components/motion/ScrollReveal";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  FileText,
  Briefcase,
  Target,
  Clock,
  MessageSquare,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Upload Resume",
    tagline: "Transparent Skill Extraction",
    desc: "Drop your PDF or TXT resume. Our transparent parser extracts your technical skills, capstone projects, and coursework with confidence scores.",
    icon: FileText,
    accent: "Automatic ATS parsing check",
  },
  {
    step: "02",
    title: "Discover Jobs",
    tagline: "Verified Role Recommendations",
    desc: "Explore ranked opportunities with transparent match percentages backed by official employer career portal listings across India.",
    icon: Briefcase,
    accent: "Verified fresher & internship sources",
  },
  {
    step: "03",
    title: "Understand Gaps",
    tagline: "Ranked Requirement Priority",
    desc: "See exact missing skills categorized into High, Medium, and Low priorities so you know precisely what to learn first.",
    icon: Target,
    accent: "Transparent skill fit breakdown",
  },
  {
    step: "04",
    title: "Build Prep Plan",
    tagline: "Structured Weekly Milestones",
    desc: "Get an actionable weekly schedule sized to your available hours, backed by verified free courses and practical tutorials.",
    icon: Clock,
    accent: "Checklist progress tracking",
  },
  {
    step: "05",
    title: "Practice & Ace",
    tagline: "Voice-Capable AI Simulations",
    desc: "Simulate technical and behavioral interview questions with immediate feedback evaluated on standard STAR method rubrics.",
    icon: MessageSquare,
    accent: "STAR rubric scoring & model answers",
  },
];

export function HowItWorksTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || prefersReducedMotion()) return;

      const container = containerRef.current;
      const progressLine = progressLineRef.current;
      const stepCards = container.querySelectorAll<HTMLElement>(".workflow-step-card");
      const desktopStepNodes = container.querySelectorAll<HTMLElement>(".desktop-step-node");
      const mobileStepDots = container.querySelectorAll<HTMLElement>(".mobile-step-dot");

      // 1. Initial entrance animation for step cards when section enters viewport
      gsap.fromTo(
        stepCards,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: container,
            start: "top 86%",
            once: true,
          },
        }
      );

      // 2. Desktop sequential progress scrubber connecting Steps 01 -> 02 -> 03 -> 04 -> 05
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        ScrollTrigger.create({
          trigger: container,
          start: "top 65%",
          end: "bottom 65%",
          scrub: 0.35,
          onUpdate: (self) => {
            const p = self.progress;

            // Fill horizontal connecting bar
            if (progressLine) {
              gsap.to(progressLine, {
                scaleX: p,
                duration: 0.1,
                ease: "none",
                overwrite: "auto",
              });
            }

            // Determine active step index: 0 (01), 1 (02), 2 (03), 3 (04), 4 (05)
            let activeIndex = 0;
            if (p >= 0.92) {
              activeIndex = 4;
            } else if (p >= 0.68) {
              activeIndex = 3;
            } else if (p >= 0.44) {
              activeIndex = 2;
            } else if (p >= 0.18) {
              activeIndex = 1;
            } else {
              activeIndex = 0;
            }

            // Update desktop timeline milestone nodes
            desktopStepNodes.forEach((node, i) => {
              if (i <= activeIndex) {
                node.classList.add("bg-venice-blue", "text-white", "border-venice-blue", "scale-110", "shadow-card");
                node.classList.remove("bg-pure-white", "text-secondary-text", "border-border");
              } else {
                node.classList.remove("bg-venice-blue", "text-white", "border-venice-blue", "scale-110", "shadow-card");
                node.classList.add("bg-pure-white", "text-secondary-text", "border-border");
              }
            });

            // Update cards active border & elevation
            stepCards.forEach((card, i) => {
              if (i === activeIndex) {
                card.classList.add("border-venice-blue/60", "shadow-card", "bg-pure-white", "ring-1", "ring-venice-blue/20");
                card.classList.remove("border-border", "bg-pure-white/80");
              } else {
                card.classList.remove("border-venice-blue/60", "shadow-card", "ring-1", "ring-venice-blue/20");
                card.classList.add("border-border", "bg-pure-white/80");
              }
            });
          },
        });
      });

      // 3. Mobile (< 1024px) sequential reveals as each card scrolls past
      mm.add("(max-width: 1023px)", () => {
        mobileStepDots.forEach((dot, idx) => {
          ScrollTrigger.create({
            trigger: dot,
            start: "top 78%",
            onEnter: () => {
              gsap.to(dot, {
                backgroundColor: "#16587B",
                color: "#FFFFFF",
                scale: 1.05,
                duration: 0.3,
                ease: "back.out(1.4)",
              });
            },
            onLeaveBack: () => {
              if (idx > 0) {
                gsap.to(dot, {
                  backgroundColor: "#E6F0F5",
                  color: "#16587B",
                  scale: 1,
                  duration: 0.2,
                });
              }
            },
          });
        });
      });

      return () => {
        mm.revert();
      };
    },
    { scope: containerRef }
  );

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="py-24 border-b border-border bg-merino relative overflow-hidden"
    >
      <Container size="xl">
        {/* Section Header with Line Reveal */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pale-blue border border-border text-venice-blue mx-auto">
            <Sparkles className="w-3.5 h-3.5 text-venice-blue" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Methodical 5-Step Process
            </span>
          </div>

          <EditorialHeading
            as="h2"
            lines={["Your journey to a better career,", "in five simple steps."]}
            className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-deep-teal leading-tight"
          />

          <p className="text-sm sm:text-base text-secondary-text leading-relaxed pt-1">
            Career planning engineered to be transparent, actionable, and motivating from day one.
          </p>
        </div>

        {/* Desktop Milestone Timeline Track (Integrated connecting line with precisely aligned nodes) */}
        <div ref={timelineTrackRef} className="hidden lg:block relative mb-10 h-10">
          {/* Base Background Track spanning from Column 1 center (10%) to Column 5 center (90%) */}
          <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-border rounded-full" />

          {/* Active Filling Progress Line */}
          <div
            ref={progressLineRef}
            className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1 w-[80%] bg-venice-blue origin-left scale-x-0 rounded-full will-change-transform"
          />

          {/* 5 Milestone Step Nodes aligned with the center of each of the 5 cards below */}
          {WORKFLOW_STEPS.map((s, idx) => {
            const leftPercent = 10 + idx * 20;
            const isInitialActive = idx === 0;

            return (
              <div
                key={s.step}
                style={{ left: `${leftPercent}%` }}
                className={cn(
                  "desktop-step-node absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 font-serif font-bold text-xs flex items-center justify-center transition-all duration-300 z-10",
                  isInitialActive
                    ? "bg-venice-blue text-white border-venice-blue scale-110 shadow-card"
                    : "bg-pure-white text-secondary-text border-border"
                )}
              >
                {s.step}
              </div>
            );
          })}
        </div>

        {/* 5-Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {WORKFLOW_STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isInitialActive = idx === 0;

            return (
              <div
                key={s.step}
                className={cn(
                  "workflow-step-card rounded-xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 group will-change-transform",
                  isInitialActive
                    ? "border border-venice-blue/60 shadow-card bg-pure-white ring-1 ring-venice-blue/20"
                    : "border border-border bg-pure-white/80 hover:border-rock-blue hover:shadow-card"
                )}
              >
                <div className="space-y-3">
                  {/* Step Header with Category Icon & Mobile Step Dot */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "mobile-step-dot w-7 h-7 rounded-full font-serif font-bold text-xs flex items-center justify-center transition-all duration-300",
                        isInitialActive
                          ? "bg-venice-blue text-white"
                          : "bg-pale-blue text-venice-blue"
                      )}
                    >
                      {s.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-pale-blue/60 text-venice-blue flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-4 h-4 text-venice-blue" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-[11px] font-medium text-venice-blue mt-0.5">
                      {s.tagline}
                    </p>
                  </div>

                  <p className="text-xs text-secondary-text leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-[#18856B] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="line-clamp-1">{s.accent}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
