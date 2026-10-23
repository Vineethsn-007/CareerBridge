"use client";

import React, { useRef } from "react";
import { Container } from "@/components/ui/Container";
import { EditorialHeading } from "@/components/motion/ScrollReveal";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
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

  useGSAP(
    () => {
      if (!containerRef.current || prefersReducedMotion()) return;

      const container = containerRef.current;
      const progressLine = progressLineRef.current;
      const stepCards = container.querySelectorAll<HTMLElement>(".workflow-step-card");
      const stepDots = container.querySelectorAll<HTMLElement>(".workflow-step-dot");

      // Scroll-linked progress line advancing through the section
      if (progressLine) {
        gsap.fromTo(
          progressLine,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top 75%",
              end: "bottom 85%",
              scrub: 0.6,
            },
          }
        );
      }

      // Step cards staggered entrance
      gsap.fromTo(
        stepCards,
        {
          opacity: 0,
          y: 35,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: container,
            start: "top 70%",
            once: true,
          },
        }
      );

      // Active state illumination as progress reaches each step
      stepDots.forEach((dot, idx) => {
        ScrollTrigger.create({
          trigger: dot,
          start: "top 70%",
          onEnter: () => {
            gsap.to(dot, {
              backgroundColor: "#16587B",
              color: "#FFFFFF",
              scale: 1.05,
              duration: 0.35,
              ease: "back.out(1.5)",
            });
          },
          onLeaveBack: () => {
            if (idx > 0) {
              gsap.to(dot, {
                backgroundColor: "#E6F0F5",
                color: "#16587B",
                scale: 1,
                duration: 0.25,
              });
            }
          },
        });
      });
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

        {/* Desktop Progress Tracker Track */}
        <div className="hidden lg:block relative mb-10 px-8">
          <div className="h-1 w-full bg-border rounded-full overflow-hidden">
            <div
              ref={progressLineRef}
              className="h-full w-full bg-venice-blue origin-left scale-x-0 will-change-transform"
            />
          </div>
        </div>

        {/* 5-Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {WORKFLOW_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="workflow-step-card bg-pure-white border border-border rounded-xl p-5 shadow-subtle hover:border-rock-blue hover:shadow-card transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Step Header with Step Dot */}
                  <div className="flex items-center justify-between">
                    <span
                      className="workflow-step-dot w-8 h-8 rounded-full bg-pale-blue text-venice-blue font-serif font-bold text-xs flex items-center justify-center transition-all duration-300 shadow-subtle"
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
