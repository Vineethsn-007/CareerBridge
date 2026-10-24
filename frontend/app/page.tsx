"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Chip } from "@/components/ui/Chip";
import { EditorialHeading, ImageMaskReveal } from "@/components/motion/ScrollReveal";
import { PinnedStorytelling } from "@/components/home/PinnedStorytelling";
import { HowItWorksTimeline } from "@/components/home/HowItWorksTimeline";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import {
  FileText,
  Briefcase,
  Target,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Compass,
  Code2,
  Database,
  BrainCircuit,
  Lock,
  Cloud,
  Palette,
  Clock,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const mainRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const valPropRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef<HTMLDivElement>(null);
  const capabilitiesRef = useRef<HTMLDivElement>(null);
  const careerPathsRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // ==========================================
      // 1. HERO OPENING SEQUENCE (ON PAGE LOAD)
      // ==========================================
      if (heroRef.current) {
        const heroEl = heroRef.current;
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        heroTl
          .from(".hero-eyebrow", {
            opacity: 0,
            y: -14,
            duration: 0.6,
          })
          .fromTo(
            ".hero-title-line",
            {
              yPercent: 110,
              opacity: 0,
            },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.85,
              stagger: 0.12,
              ease: "power3.out",
            },
            "-=0.3"
          )
          .from(
            ".hero-desc",
            {
              opacity: 0,
              y: 18,
              duration: 0.7,
            },
            "-=0.5"
          )
          .from(
            ".hero-action-btn",
            {
              opacity: 0,
              y: 16,
              duration: 0.6,
              stagger: 0.1,
            },
            "-=0.4"
          )
          .from(
            ".hero-supporting-note",
            {
              opacity: 0,
              y: 10,
              duration: 0.5,
            },
            "-=0.3"
          )
          .fromTo(
            ".hero-mask-wrap",
            {
              clipPath: "inset(0% 100% 0% 0%)",
            },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.1,
              ease: "power3.inOut",
            },
            "-=0.9"
          )
          .fromTo(
            ".hero-img-target",
            {
              scale: 1.08,
            },
            {
              scale: 1,
              duration: 1.3,
              ease: "power2.out",
            },
            "-=1.1"
          )
          .from(
            ".hero-float-card",
            {
              opacity: 0,
              y: 28,
              scale: 0.94,
              stagger: 0.14,
              duration: 0.65,
              ease: "back.out(1.4)",
            },
            "-=0.7"
          );

        // ==========================================
        // 2. HERO SCROLL-LINKED PARALLAX
        // ==========================================
        const leftCol = heroEl.querySelector(".hero-left-col");
        const imgWrap = heroEl.querySelector(".hero-image-wrap");
        const bgAccent = heroEl.querySelector(".hero-bg-accent");
        const card1 = heroEl.querySelector(".hero-float-card-1");
        const card2 = heroEl.querySelector(".hero-float-card-2");
        const card3 = heroEl.querySelector(".hero-float-card-3");

        if (leftCol) {
          gsap.to(leftCol, {
            y: -35,
            opacity: 0.8,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (imgWrap) {
          gsap.to(imgWrap, {
            y: -45,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (bgAccent) {
          gsap.to(bgAccent, {
            y: -25,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (card1) {
          gsap.to(card1, {
            y: -65,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (card2) {
          gsap.to(card2, {
            y: -30,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        if (card3) {
          gsap.to(card3, {
            y: -50,
            ease: "none",
            scrollTrigger: {
              trigger: heroEl,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }
      }

      // ==========================================
      // 3. VALUE PROPOSITION STRIP REVEAL
      // ==========================================
      if (valPropRef.current) {
        const valItems = valPropRef.current.querySelectorAll(".val-prop-item");
        gsap.fromTo(
          valItems,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: valPropRef.current,
              start: "top 85%",
              once: true,
            },
          }
        );
      }

      // ==========================================
      // 4. THE CHALLENGE CARDS REVEAL
      // ==========================================
      if (challengeRef.current) {
        const challengeCards = challengeRef.current.querySelectorAll(".challenge-card");
        gsap.fromTo(
          challengeCards,
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: challengeRef.current,
              start: "top 86%",
              once: true,
            },
          }
        );
      }

      // ==========================================
      // 5. PRODUCT CAPABILITIES CARDS REVEAL
      // ==========================================
      if (capabilitiesRef.current) {
        const capCards = capabilitiesRef.current.querySelectorAll(".capability-card");
        gsap.fromTo(
          capCards,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: capabilitiesRef.current,
              start: "top 86%",
              once: true,
            },
          }
        );
      }

      // ==========================================
      // 6. CAREER PATHWAYS CARDS REVEAL
      // ==========================================
      if (careerPathsRef.current) {
        const pathCards = careerPathsRef.current.querySelectorAll(".career-path-card");
        gsap.fromTo(
          pathCards,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: careerPathsRef.current,
              start: "top 86%",
              once: true,
            },
          }
        );
      }

      // ==========================================
      // 7. FINAL CTA REVEAL
      // ==========================================
      if (finalCtaRef.current) {
        const ctaCard = finalCtaRef.current.querySelector(".final-cta-card");
        gsap.fromTo(
          ctaCard,
          { opacity: 0, y: 24, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: finalCtaRef.current,
              start: "top 86%",
              once: true,
            },
          }
        );
      }
    },
    { scope: mainRef }
  );

  return (
    <div ref={mainRef} className="relative min-h-screen bg-merino text-primary-text">
      {/* SECTION 2: HERO SECTION (CINEMATIC OPENING & SCROLL PARALLAX) */}
      <section
        ref={heroRef}
        className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-border bg-cream-mesh"
      >
        <Container size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="hero-left-col lg:col-span-7 space-y-6 will-change-transform">
              {/* Eyebrow */}
              <div className="hero-eyebrow inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pale-blue border border-border text-venice-blue">
                <Compass className="w-3.5 h-3.5 text-venice-blue" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  AI-Powered Career Guidance
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-venice-blue" />
                <span className="text-[11px] font-medium text-secondary-text">
                  National Edition
                </span>
              </div>

              {/* Large Editorial Serif Headline with Masked Line Reveal */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-deep-teal leading-[1.12]">
                <span className="block overflow-hidden pb-1">
                  <span className="hero-title-line block will-change-transform">
                    Your Skills. Your Future.
                  </span>
                </span>
                <span className="block overflow-hidden pb-1">
                  <span className="hero-title-line block text-venice-blue italic will-change-transform">
                    Your CareerBridge.
                  </span>
                </span>
              </h1>

              {/* Supporting Description */}
              <p className="hero-desc text-base sm:text-lg md:text-xl text-secondary-text max-w-xl leading-relaxed">
                Discover relevant jobs, identify skill gaps, and build
                personalized preparation plans with AI, all in one place.
              </p>

              {/* CTAs */}
              <div className="hero-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link href="/resume" className="hero-action-btn w-full sm:w-auto inline-flex">
                  <Button
                    size="lg"
                    variant="primary"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full sm:w-auto px-7 py-3.5 shadow-card"
                  >
                    Build My Career Path
                  </Button>
                </Link>
                <Link href="#how-it-works" className="hero-action-btn w-full sm:w-auto inline-flex">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore How It Works
                  </Button>
                </Link>
              </div>

              {/* Short supporting statement */}
              <p className="hero-supporting-note text-xs text-muted-text flex items-center gap-2 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#18856B]" />
                <span>Designed for students, fresh graduates, and aspiring professionals.</span>
              </p>
            </div>

            {/* Right Column: Editorial Visual & Product Cards */}
            <div className="lg:col-span-5 relative">
              {/* Soft blue visual accent behind image */}
              <div className="hero-bg-accent absolute -inset-4 bg-rock-blue/20 rounded-2xl transform -rotate-1 pointer-events-none will-change-transform" />

              <div className="hero-image-wrap hero-mask-wrap relative rounded-2xl overflow-hidden border border-border shadow-float bg-pure-white will-change-transform">
                <div className="relative aspect-[1024/738] w-full overflow-hidden">
                  <Image
                    src="/images/hero-student.jpg"
                    alt="Indian engineering student working on code projects on his laptop"
                    fill
                    priority
                    className="hero-img-target object-cover will-change-transform"
                    sizes="(max-width: 768px) 100vw, 520px"
                  />
                </div>
              </div>

              {/* Floating Product Preview 1 (Top-Right): Active Prep Plan */}
              <div className="hero-float-card hero-float-card-1 absolute -top-4 -right-3 sm:-right-5 bg-pure-white border border-border rounded-xl p-3 shadow-float hidden sm:flex items-center gap-3 z-20 will-change-transform">
                <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/60 text-[#18856B] flex items-center justify-center font-bold text-xs shrink-0">
                  4W
                </div>
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-deep-teal">Prep Plan Active</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18856B] animate-pulse" />
                  </div>
                  <p className="text-[11px] text-secondary-text">Week 1: TypeScript & ORM</p>
                </div>
              </div>

              {/* Floating Product Preview 2 (Bottom-Left): Match Score */}
              <div className="hero-float-card hero-float-card-2 absolute -bottom-5 -left-3 sm:-left-5 bg-pure-white border border-border rounded-xl p-3 shadow-float hidden sm:flex items-center gap-3 z-20 will-change-transform">
                <ScoreRing score={88} size="sm" animate={true} />
                <div className="space-y-0.5 pr-1">
                  <p className="text-xs font-bold text-deep-teal">88% Match</p>
                  <p className="text-[11px] text-secondary-text">Junior SDE • Bengaluru</p>
                </div>
              </div>

              {/* Floating Product Preview 3 (Bottom-Right): Verified Candidate Profile */}
              <div className="hero-float-card hero-float-card-3 absolute -bottom-5 -right-3 sm:-right-5 bg-pure-white border border-border rounded-xl p-3 shadow-float hidden sm:flex items-center gap-2.5 z-20 will-change-transform">
                <div className="space-y-0.5 text-left pr-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-deep-teal">Muhammad Haashid</p>
                    <Badge variant="verified" size="sm">Verified Match</Badge>
                  </div>
                  <p className="text-[11px] text-secondary-text">Full Stack & Data Engineering</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 3: VALUE PROPOSITION STRIP */}
      <section ref={valPropRef} className="bg-pale-blue py-12 border-b border-border">
        <Container size="xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="val-prop-item flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pure-white border border-border flex items-center justify-center text-venice-blue shadow-subtle shrink-0">
                <Briefcase className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-deep-teal">Discover Opportunities</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Verified fresher and internship listings from official employer portals.
                </p>
              </div>
            </div>

            <div className="val-prop-item flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pure-white border border-border flex items-center justify-center text-venice-blue shadow-subtle shrink-0">
                <Target className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-deep-teal">Identify Skill Gaps</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Pinpoint missing technical competencies ranked by job priority.
                </p>
              </div>
            </div>

            <div className="val-prop-item flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pure-white border border-border flex items-center justify-center text-venice-blue shadow-subtle shrink-0">
                <Clock className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-deep-teal">Build a Plan</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Structured weekly milestones backed by curated free resources.
                </p>
              </div>
            </div>

            <div className="val-prop-item flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pure-white border border-border flex items-center justify-center text-venice-blue shadow-subtle shrink-0">
                <MessageSquare className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-deep-teal">Practice Interviews</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Role-tailored questions with STAR guidance and instant rubric scoring.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 4: THE CHALLENGE (EDITORIAL REVEALS + MASKED PHOTOGRAPHY) */}
      <section ref={challengeRef} className="py-20 lg:py-24 border-b border-border bg-merino">
        <Container size="xl">
          {/* Top Two-Column Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Heading and Explanation */}
            <div className="lg:col-span-6 space-y-5">
              <Badge variant="priority-medium" size="sm">
                The Real Challenge
              </Badge>
              <EditorialHeading
                as="h2"
                lines={["Career decisions shouldn't", "feel like guesswork."]}
                className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-deep-teal leading-tight"
              />
              <p className="text-base sm:text-lg text-secondary-text leading-relaxed">
                Students face many challenges when planning their careers.
                CareerBridge brings everything together to help you make informed,
                data-backed decisions.
              </p>
              <p className="text-sm text-muted-text leading-relaxed pt-1">
                From fragmented placement drives to conflicting online advice, navigating your first professional leap shouldn&apos;t be a solo trial-and-error experiment.
              </p>
            </div>

            {/* Right Column: High-Quality Student Photograph with Mask Reveal */}
            <div className="lg:col-span-6 relative">
              <div className="absolute -inset-3 bg-rock-blue/20 rounded-3xl transform rotate-1 pointer-events-none" />

              <ImageMaskReveal
                direction="horizontal"
                className="relative aspect-[1024/537] w-full rounded-2xl border border-border shadow-float bg-pure-white"
              >
                <Image
                  src="/images/collaborating-students.jpg"
                  alt="Indian engineering students working together on laptops during a hackathon"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority
                />
              </ImageMaskReveal>
            </div>
          </div>

          {/* Below: Five Concise Challenge Cards with Staggered Scroll Entrance */}
          <div className="mt-12 lg:mt-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  title: "Too many career options",
                  desc: "Endless job titles and conflicting advice make choosing a clear focus exhausting.",
                  num: "01",
                  icon: Compass,
                },
                {
                  title: "Uncertainty about suitable jobs",
                  desc: "Hard to know whether your academic background truly matches market requirements.",
                  num: "02",
                  icon: Target,
                },
                {
                  title: "Confusion on skills to learn",
                  desc: "Students waste months on outdated tutorials without knowing employer priorities.",
                  num: "03",
                  icon: Layers,
                },
                {
                  title: "Resume not matching roles",
                  desc: "Generic resumes get filtered out by screening algorithms before a human ever looks.",
                  num: "04",
                  icon: FileText,
                },
                {
                  title: "Limited interview practice",
                  desc: "Few students get realistic technical mock interviews with structured rubric feedback.",
                  num: "05",
                  icon: MessageSquare,
                },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.num}
                    className="challenge-card bg-pure-white border border-border rounded-xl p-4 shadow-subtle flex flex-col justify-between gap-3 transition-all hover:border-rock-blue hover:shadow-card group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-pale-blue/60 border border-border flex items-center justify-center text-venice-blue group-hover:bg-rock-blue/20 transition-colors">
                        <Icon className="w-4 h-4 text-venice-blue" />
                      </div>
                      <span className="text-xs font-serif font-bold text-rock-blue">
                        {c.num}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-deep-teal leading-snug">{c.title}</h4>
                      <p className="text-xs text-secondary-text leading-relaxed">{c.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 5: PRODUCT CAPABILITIES (STAGGERED FEATURE CARDS) */}
      <section id="capabilities" ref={capabilitiesRef} className="py-20 border-b border-border bg-muted-cream">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Comprehensive Toolkit
            </span>
            <EditorialHeading
              as="h2"
              lines={["Everything you need", "to move forward."]}
              className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal"
            />
            <p className="text-sm text-secondary-text leading-relaxed">
              From parsing messy resumes to practicing live mock interviews, every
              step is powered by transparent, explainable AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <FileText className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Resume Intelligence</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Extracts skills, projects, and coursework with editable controls to fix mistakes.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/resume" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>Upload resume</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <Briefcase className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Job Matching</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Calculates explainable match scores over real fresher roles verified against official portals.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>Browse matches</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Card 3 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <Target className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Skill Gap Analysis</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Categorizes missing skills into High, Medium, and Low priorities with clear explanations.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs/job-web-001" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>View sample gap</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Card 4 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <Clock className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Guided Preparation Plans</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Custom weekly task schedules sized to your hours with verified free course links.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs/job-web-001" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>Explore prep plan</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Card 5 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <MessageSquare className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Interview Practice</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  AI mock questions evaluated on rubric criteria with STAR method answer drawers.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>Practice questions</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Card 6 */}
            <div className="capability-card bg-pure-white border border-border rounded-xl p-6 space-y-4 hover:border-rock-blue hover:shadow-card transition-all group">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue group-hover:scale-105 transition-transform duration-300">
                <Layers className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">Career Discovery</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Cross-disciplinary career roadmaps for Software, Data, Cloud, AI, and Product Design.
                </p>
              </div>
              <div className="pt-2">
                <Link href="#career-paths" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link">
                  <span>Explore pathways</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 6: PINNED STORYTELLING SECTION ("FROM YOUR RESUME TO YOUR NEXT OPPORTUNITY") */}
      <PinnedStorytelling />

      {/* SECTION 7: HOW IT WORKS (PROGRESSIVE WORKFLOW STORYTELLING) */}
      <HowItWorksTimeline />

      {/* SECTION 8: CAREER PATHS (SCROLL-REVEALED PATHWAYS) */}
      <section id="career-paths" ref={careerPathsRef} className="py-20 border-b border-border bg-pale-blue/40">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Role Taxonomies
            </span>
            <EditorialHeading
              as="h2"
              lines={["Curated Career Pathways"]}
              className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal"
            />
            <p className="text-sm text-secondary-text leading-relaxed">
              Explore required skills, typical fresher responsibilities, and verified job demand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Software Developer",
                desc: "Build scalable web services, APIs, and modern frontends with modern frameworks.",
                skills: ["JavaScript", "Python", "React", "PostgreSQL", "Git"],
                icon: Code2,
              },
              {
                title: "Data Analyst",
                desc: "Transform operational databases into dashboards, KPI metrics, and business intelligence.",
                skills: ["SQL", "Excel", "Python", "Power BI", "Pandas"],
                icon: Database,
              },
              {
                title: "AI / ML Engineer",
                desc: "Implement predictive modeling, NLP pipelines, and generative AI integrations.",
                skills: ["Python", "PyTorch", "Scikit-Learn", "FastAPI", "Docker"],
                icon: BrainCircuit,
              },
              {
                title: "Cybersecurity Analyst",
                desc: "Safeguard cloud infrastructure, analyze vulnerabilities, and monitor threat logs.",
                skills: ["Networking", "Linux", "SOC Analysis", "Wireshark", "Bash"],
                icon: Lock,
              },
              {
                title: "Cloud Engineer",
                desc: "Deploy resilient infrastructure, CI/CD automated pipelines, and cloud containers.",
                skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux"],
                icon: Cloud,
              },
              {
                title: "UI / UX Designer",
                desc: "Design user research flows, design systems, interactive Figma components, and usability tests.",
                skills: ["Figma", "Design Systems", "Prototyping", "Wireframing"],
                icon: Palette,
              },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="career-path-card bg-pure-white border border-border rounded-xl p-6 shadow-subtle space-y-4 hover:border-rock-blue hover:shadow-card transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-pale-blue text-venice-blue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-venice-blue" />
                    </div>
                    <h3 className="text-base font-bold text-deep-teal group-hover:text-venice-blue transition-colors">{p.title}</h3>
                  </div>
                  <p className="text-xs text-secondary-text leading-relaxed">{p.desc}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.skills.map((s) => (
                      <Chip key={s} label={s} variant="default" className="text-[11px]" />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border">
                    <Link
                      href="/jobs"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal group/link"
                    >
                      <span>Explore verified roles</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* SECTION 9: FINAL CTA (SCROLL REVEAL) */}
      <section ref={finalCtaRef} className="py-20 bg-pale-blue border-b border-border relative overflow-hidden">
        <Container size="xl">
          <div className="final-cta-card bg-pure-white border border-border rounded-2xl p-8 sm:p-12 shadow-float max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pale-blue border border-border text-venice-blue mx-auto">
              <Sparkles className="w-3.5 h-3.5 text-venice-blue" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Ready to Accelerate?
              </span>
            </div>

            <EditorialHeading
              as="h2"
              lines={["Your next opportunity starts", "with your next step."]}
              className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-deep-teal leading-tight"
            />

            <p className="text-base text-secondary-text max-w-xl mx-auto leading-relaxed">
              Discover relevant opportunities, understand your skills, and build a practical path toward your career goals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/resume" className="w-full sm:w-auto inline-flex justify-center">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto shadow-card">
                  Start Your Career Journey
                </Button>
              </Link>
              <Link href="/jobs" className="w-full sm:w-auto inline-flex justify-center">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Explore the Platform
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-text">
              100% Free for students • No credit card required • Real backend data
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
