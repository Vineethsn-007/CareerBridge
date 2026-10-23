"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  FileText,
  Target,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";

const STAGES = [
  {
    num: "01",
    label: "Intelligent Resume Analysis",
    title: "Extract, normalize, and verify your actual skills.",
    desc: "Drop your PDF or TXT resume. Our transparent parsing engine extracts your technical competencies, frameworks, and coursework with confidence ratings so you can edit mistakes before matching.",
    cta: "Upload Resume",
    href: "/resume",
    icon: FileText,
  },
  {
    num: "02",
    label: "Job Matching & Skill-Gap Priority",
    title: "Ranked fresher roles with transparent match rationales.",
    desc: "Compare your background against official listings from verified employer portals. View exact percentage match breakdowns and missing skills ranked by High, Medium, and Low importance.",
    cta: "Explore Job Matches",
    href: "/jobs",
    icon: Target,
  },
  {
    num: "03",
    label: "Personalized Preparation & Practice",
    title: "Structured 4-week milestones with AI interview prep.",
    desc: "Receive customized weekly task milestones linked to curated free resources, followed by voice-capable AI technical mock interviews evaluated with real STAR method rubrics.",
    cta: "View Preparation Plans",
    href: "/interview",
    icon: Clock,
  },
];

export function PinnedStorytelling() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinWrapperRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useGSAP(
    () => {
      if (!sectionRef.current || prefersReducedMotion()) return;

      const sectionEl = sectionRef.current;
      const mm = gsap.matchMedia();

      // Desktop Pinning Experience (1024px and up)
      mm.add("(min-width: 1024px)", () => {
        const previewCards = sectionEl.querySelectorAll<HTMLElement>(".preview-stage-card");
        const stageProgress = sectionEl.querySelector<HTMLElement>(".pinned-progress-fill");

        const trigger = ScrollTrigger.create({
          trigger: sectionEl,
          start: "top top",
          end: "+=180%",
          pin: pinWrapperRef.current,
          scrub: 0.8,
          onUpdate: (self) => {
            const rawProgress = self.progress;
            // Advance progress fill
            if (stageProgress) {
              gsap.to(stageProgress, {
                scaleY: rawProgress,
                duration: 0.1,
                ease: "none",
              });
            }

            // Determine active stage
            const step = Math.min(2, Math.floor(rawProgress * 3));
            setActiveStage(step);

            // Cross-fade preview cards
            previewCards.forEach((card, idx) => {
              if (idx === step) {
                gsap.to(card, {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.4,
                  ease: "power2.out",
                  pointerEvents: "auto",
                });
              } else {
                gsap.to(card, {
                  opacity: 0,
                  y: idx < step ? -18 : 18,
                  scale: 0.97,
                  duration: 0.4,
                  ease: "power2.out",
                  pointerEvents: "none",
                });
              }
            });
          },
        });

        return () => {
          trigger.kill();
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="storytelling"
      ref={sectionRef}
      className="relative bg-muted-cream border-b border-border py-20 lg:py-0 overflow-hidden"
    >
      <div
        ref={pinWrapperRef}
        className="lg:min-h-screen lg:flex lg:items-center py-12 lg:py-20"
      >
        <Container size="xl">
          {/* Section Header */}
          <div className="mb-12 lg:mb-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pale-blue border border-border text-venice-blue mb-3">
              <Sparkles className="w-3.5 h-3.5 text-venice-blue" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Progressive Career Journey
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-deep-teal leading-tight">
              From Your Resume to Your Next Opportunity.
            </h2>
            <p className="text-sm sm:text-base text-secondary-text mt-3 leading-relaxed">
              A cohesive, transparent progression designed to eliminate guesswork at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Stage Progress & Text (Desktop + Mobile) */}
            <div className="lg:col-span-6 relative">
              {/* Desktop Progress Bar Track */}
              <div className="hidden lg:block absolute left-4 top-4 bottom-4 w-0.5 bg-border rounded-full">
                <div className="pinned-progress-fill w-full h-full bg-venice-blue origin-top scale-y-0 rounded-full will-change-transform" />
              </div>

              <div className="space-y-8 lg:pl-12">
                {STAGES.map((s, idx) => {
                  const isActive = activeStage === idx;
                  const Icon = s.icon;

                  return (
                    <div
                      key={s.num}
                      className={cn(
                        "p-5 rounded-xl border transition-all duration-300",
                        isActive
                          ? "bg-pure-white border-venice-blue/40 shadow-float"
                          : "bg-pure-white/40 border-border/80 opacity-70 hover:opacity-90"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "w-7 h-7 rounded-full text-xs font-serif font-bold flex items-center justify-center transition-colors",
                              isActive
                                ? "bg-venice-blue text-white"
                                : "bg-pale-blue text-secondary-text"
                            )}
                          >
                            {s.num}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
                            {s.label}
                          </span>
                        </div>
                        <Icon className="w-4 h-4 text-venice-blue" />
                      </div>

                      <h3 className="text-lg font-bold text-deep-teal mt-2">
                        {s.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-secondary-text leading-relaxed mt-1.5">
                        {s.desc}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <Link
                          href={s.href}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group"
                        >
                          <span>{s.cta}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                        </Link>
                        {isActive && (
                          <span className="text-[11px] font-medium text-[#18856B] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active Stage
                          </span>
                        )}
                      </div>

                      {/* Mobile Inline Product Preview */}
                      <div className="lg:hidden mt-4 pt-4 border-t border-border">
                        <PreviewCardContent stageIndex={idx} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Desktop Pinned Showcase Area */}
            <div className="hidden lg:block lg:col-span-6 relative h-[480px]">
              {/* Background ambient accent */}
              <div className="absolute inset-0 bg-rock-blue/15 rounded-3xl transform rotate-1 pointer-events-none" />

              {/* Stage Previews (Stacked and Cross-Fading) */}
              {STAGES.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "preview-stage-card absolute inset-0 bg-pure-white border border-border rounded-2xl p-6 shadow-float flex flex-col justify-between overflow-hidden",
                    idx === 0 ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  <PreviewCardContent stageIndex={idx} />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

/**
 * PreviewCardContent: Renders the authentic visual representation for each stage
 */
function PreviewCardContent({ stageIndex }: { stageIndex: number }) {
  if (stageIndex === 0) {
    // Stage 1: Resume Analysis Preview
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pale-blue text-venice-blue flex items-center justify-center font-bold text-sm">
              MH
            </div>
            <div>
              <p className="text-sm font-bold text-deep-teal">Muhammad Haashid</p>
              <p className="text-xs text-secondary-text">B.Tech Computer Science • CGPA 8.4</p>
            </div>
          </div>
          <Badge variant="verified">Parsed & Verified</Badge>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
            Extracted Technical Competencies:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {["React", "Next.js", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "TailwindCSS"].map(
              (skill) => (
                <Chip key={skill} label={skill} variant="matched" className="text-xs" />
              )
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-pale-blue/50 border border-border space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-deep-teal">Coursework & Capstones:</span>
            <span className="text-[11px] text-[#18856B] font-medium">94% Confidence</span>
          </div>
          <p className="text-xs text-secondary-text leading-relaxed">
            • Distributed Peer-to-Peer Storage Engine (Go, gRPC)
            <br />• Multi-Tenant Job Recommendation Microservice (Python, FastAPI)
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-text pt-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#18856B]" />
            Zero ATS parsing penalties detected
          </span>
          <span className="font-mono text-[11px] text-venice-blue font-semibold">Stage 1 of 3</span>
        </div>
      </div>
    );
  }

  if (stageIndex === 1) {
    // Stage 2: Job Matching & Skill Gaps Preview
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pale-blue text-deep-teal border border-border font-medium">
                #01 Match
              </span>
              <Badge variant="verified">Official Portal</Badge>
            </div>
            <h4 className="text-base font-bold text-deep-teal">Junior Full Stack Engineer</h4>
            <div className="flex items-center gap-3 text-xs text-secondary-text">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-secondary-text" /> InnovateHub India
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-secondary-text" /> Bengaluru (Hybrid)
              </span>
            </div>
          </div>
          <ScoreRing score={88} size="md" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#18856B]">Matched Skills (6):</span>
            <span className="text-[11px] text-secondary-text">Direct requirement fit</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["React", "TypeScript", "Node.js", "PostgreSQL", "Git", "REST APIs"].map((s) => (
              <Chip key={s} label={s} variant="matched" className="text-xs" />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#B54747]">Missing Competencies to Develop (2):</span>
            <Badge variant="priority-high" size="sm">High Priority</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["FastAPI Production Patterns", "Redis Caching Layers"].map((s) => (
              <Chip key={s} label={s} variant="missing" className="text-xs" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-text pt-2 border-t border-border">
          <span className="text-xs text-venice-blue font-medium">Verified CTC: ₹6.5 – 8.5 LPA</span>
          <span className="font-mono text-[11px] text-venice-blue font-semibold">Stage 2 of 3</span>
        </div>
      </div>
    );
  }

  // Stage 3: Preparation & Mock Practice Preview
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="priority-medium" size="sm">Active Plan</Badge>
            <span className="text-xs font-bold text-deep-teal">4-Week Structured Prep</span>
          </div>
          <p className="text-xs text-secondary-text mt-0.5">Week 1 Milestone: TypeScript & Data Models</p>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-[#18856B] animate-pulse" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
          Week 1 Action Checklist:
        </span>
        <div className="space-y-1.5 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[#18856B] flex items-center justify-between">
            <span className="line-through opacity-80">1. Setup strict TS configuration & generic types</span>
            <CheckCircle2 className="w-4 h-4 text-[#18856B] shrink-0" />
          </div>
          <div className="p-2.5 rounded-lg bg-pale-blue/40 border border-border flex items-center justify-between text-primary-text">
            <span>2. Build Redis cache middleware with TTL invalidation</span>
            <span className="text-[11px] text-venice-blue font-semibold">In Progress</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-pure-white border border-border shadow-subtle space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-deep-teal">AI Mock Interview Practice:</span>
          <Badge variant="neutral" size="sm">STAR Rubric</Badge>
        </div>
        <p className="text-xs text-secondary-text">
          &quot;Describe a situation where an asynchronous queue prevented data loss during traffic spikes.&quot;
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-text pt-2 border-t border-border">
        <span className="flex items-center gap-1.5 text-venice-blue font-medium">
          <ExternalLink className="w-3.5 h-3.5" />
          Free curated tutorials included
        </span>
        <span className="font-mono text-[11px] text-venice-blue font-semibold">Stage 3 of 3</span>
      </div>
    </div>
  );
}
