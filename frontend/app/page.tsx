"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Chip } from "@/components/ui/Chip";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/motion";
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
} from "lucide-react";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!heroRef.current || prefersReducedMotion()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-eyebrow", {
        opacity: 0,
        y: -12,
        duration: 0.6,
      })
        .from(
          ".hero-heading",
          {
            opacity: 0,
            y: 20,
            duration: 0.8,
          },
          "-=0.4"
        )
        .from(
          ".hero-desc",
          {
            opacity: 0,
            y: 16,
            duration: 0.7,
          },
          "-=0.5"
        )
        .from(
          ".hero-actions",
          {
            opacity: 0,
            y: 14,
            duration: 0.6,
          },
          "-=0.4"
        )
        .from(
          ".hero-image-wrap",
          {
            opacity: 0,
            scale: 0.96,
            duration: 0.9,
          },
          "-=0.6"
        )
        .from(
          ".hero-float-card",
          {
            opacity: 0,
            y: 20,
            stagger: 0.15,
            duration: 0.6,
          },
          "-=0.5"
        );
    },
    { scope: heroRef }
  );

  return (
    <div className="relative min-h-screen bg-merino text-primary-text">
      {/* SECTION 2 — HERO */}
      <section
        ref={heroRef}
        className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-border bg-cream-mesh"
      >
        <Container size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
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

              {/* Large Editorial Serif Headline */}
              <h1 className="hero-heading text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-deep-teal leading-[1.12]">
                Your Skills. Your Future.{" "}
                <span className="text-venice-blue italic">Your CareerBridge.</span>
              </h1>

              {/* Supporting Description */}
              <p className="hero-desc text-base sm:text-lg md:text-xl text-secondary-text max-w-xl leading-relaxed">
                Discover relevant jobs, identify skill gaps, and build
                personalized preparation plans with AI — all in one place.
              </p>

              {/* CTAs */}
              <div className="hero-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link href="/resume">
                  <Button
                    size="lg"
                    variant="primary"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full sm:w-auto px-7 py-3.5 shadow-card"
                  >
                    Build My Career Path
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Explore How It Works
                  </Button>
                </Link>
              </div>

              {/* Short supporting statement */}
              <p className="text-xs text-muted-text flex items-center gap-2 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#18856B]" />
                <span>Designed for students, fresh graduates, and aspiring professionals.</span>
              </p>
            </div>

            {/* Right Column: Editorial Visual & Product Cards */}
            <div className="lg:col-span-5 relative">
              {/* Soft blue visual accent behind image */}
              <div className="absolute -inset-4 bg-rock-blue/20 rounded-2xl transform -rotate-1 pointer-events-none" />

              <div className="hero-image-wrap relative rounded-2xl overflow-hidden border border-border shadow-float bg-pure-white">
                <div className="relative aspect-[1024/738] w-full">
                  <Image
                    src="/images/hero-student.jpg"
                    alt="Indian engineering student working on code projects on his laptop"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 520px"
                  />
                </div>
              </div>

              {/* Floating Product Preview 1 (Top-Left): Candidate Readiness & Active Prep Plan */}
              <div className="hero-float-card absolute -top-4 -left-4 sm:-left-6 bg-pure-white border border-border rounded-xl p-3 shadow-float hidden sm:flex items-center gap-3 z-20">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 text-[#18856B] flex items-center justify-center font-bold text-xs shrink-0">
                  4W
                </div>
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-deep-teal">Prep Plan Active</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#18856B] animate-pulse" />
                  </div>
                  <p className="text-[11px] text-secondary-text">Week 1: TypeScript & System Design</p>
                </div>
              </div>

              {/* Floating Product Preview 2 (Bottom-Right): Verified Match & Score */}
              <div className="hero-float-card absolute -bottom-5 -right-4 sm:-right-6 bg-pure-white border border-border rounded-xl p-3.5 shadow-float hidden sm:flex items-center gap-3.5 z-20">
                <ScoreRing score={88} size="sm" animate={true} />
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-deep-teal">88% Match</p>
                    <Badge variant="verified" size="sm">
                      Verified Match
                    </Badge>
                  </div>
                  <p className="text-[11px] text-secondary-text">Junior SDE • Bengaluru (₹8–12 LPA)</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 3 — VALUE PROPOSITION STRIP */}
      <section className="bg-pale-blue py-12 border-b border-border">
        <Container size="xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-start gap-4">
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

            <div className="flex items-start gap-4">
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

            <div className="flex items-start gap-4">
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

            <div className="flex items-start gap-4">
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

      {/* SECTION 4 — THE CHALLENGE */}
      <section className="py-20 border-b border-border bg-merino">
        <Container size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and Explanation */}
            <div className="lg:col-span-6 space-y-5">
              <Badge variant="priority-medium" size="sm">
                The Real Challenge
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal leading-tight">
                Career decisions shouldn&apos;t feel like guesswork.
              </h2>
              <p className="text-base text-secondary-text leading-relaxed">
                Students face many challenges when planning their careers.
                CareerBridge brings everything together to help you make informed,
                data-backed decisions.
              </p>

              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-border shadow-card mt-6">
                <Image
                  src="/images/collaborating-students.jpg"
                  alt="Indian engineering students collaborating on code and career preparation during a hackathon"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
              </div>
            </div>

            {/* Right Column: 5 Concise Challenge Cards */}
            <div className="lg:col-span-6 space-y-3.5">
              {[
                {
                  title: "Too many career options",
                  desc: "Endless job titles and conflicting advice make choosing a clear focus exhausting.",
                  num: "01",
                },
                {
                  title: "Uncertainty about suitable jobs",
                  desc: "Hard to know whether your academic background truly matches market requirements.",
                  num: "02",
                },
                {
                  title: "Confusion about which skills to learn",
                  desc: "Students waste months on outdated tutorials without knowing employer priorities.",
                  num: "03",
                },
                {
                  title: "Resume not matching roles",
                  desc: "Generic resumes get filtered out by screening algorithms before a human ever looks.",
                  num: "04",
                },
                {
                  title: "Limited interview practice",
                  desc: "Few students get realistic technical mock interviews with structured rubric feedback.",
                  num: "05",
                },
              ].map((c) => (
                <div
                  key={c.num}
                  className="bg-pure-white border border-border rounded-lg p-4 shadow-subtle flex items-start gap-4 transition-all hover:border-rock-blue"
                >
                  <span className="text-xs font-serif font-bold text-rock-blue mt-0.5">
                    {c.num}
                  </span>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-deep-teal">{c.title}</h4>
                    <p className="text-xs text-secondary-text leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* SECTION 5 — PRODUCT CAPABILITIES */}
      <section id="capabilities" className="py-20 border-b border-border bg-muted-cream">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Comprehensive Toolkit
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal">
              Everything you need to move forward.
            </h2>
            <p className="text-sm text-secondary-text leading-relaxed">
              From parsing messy resumes to practicing live mock interviews, every
              step is powered by transparent, explainable AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <FileText className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Resume Intelligence</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Extracts skills, projects, and coursework with editable controls to fix mistakes.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/resume" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>Upload resume</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Card 2 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <Briefcase className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Job Matching</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Calculates explainable match scores over real fresher roles verified against official portals.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>Browse matches</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Card 3 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <Target className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Skill Gap Analysis</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Categorizes missing skills into High, Medium, and Low priorities with clear explanations.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs/job-web-001" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>View sample gap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Card 4 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <Clock className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Guided Preparation Plans</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Custom weekly task schedules sized to your hours with verified free course links.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/jobs/job-web-001" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>Explore prep plan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Card 5 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <MessageSquare className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Interview Practice</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  AI mock questions evaluated on rubric criteria with STAR method answer drawers.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>Practice questions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>

            {/* Card 6 */}
            <Card variant="default" className="p-6 space-y-4 hover:border-rock-blue transition-colors">
              <div className="w-10 h-10 rounded-lg bg-pale-blue flex items-center justify-center text-venice-blue">
                <Layers className="w-5 h-5 text-venice-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-deep-teal">Career Discovery</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Cross-disciplinary career roadmaps for Software, Data, Cloud, AI, and Product Design.
                </p>
              </div>
              <div className="pt-2">
                <Link href="#career-paths" className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal">
                  <span>Explore pathways</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* SECTION 6 — HOW IT WORKS */}
      <section id="how-it-works" ref={stepsRef} className="py-20 border-b border-border bg-merino">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Simple 5-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal">
              Your journey to a better career, in five simple steps.
            </h2>
            <p className="text-sm text-secondary-text leading-relaxed">
              Career planning designed to be methodical, transparent, and motivating.
            </p>
          </div>

          {/* 5-Step Progression */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: "01",
                title: "Upload Resume",
                desc: "Drop your PDF or TXT resume to parse your skills and projects.",
              },
              {
                step: "02",
                title: "Discover Jobs",
                desc: "Explore ranked opportunities with transparent match explanations.",
              },
              {
                step: "03",
                title: "Understand Gaps",
                desc: "See exact missing requirements prioritized by job importance.",
              },
              {
                step: "04",
                title: "Build Prep Plan",
                desc: "Get a structured weekly plan with curated free tutorials.",
              },
              {
                step: "05",
                title: "Practice & Ace",
                desc: "Simulate technical & behavioral questions with AI rubric feedback.",
              },
            ].map((s, idx) => (
              <div
                key={s.step}
                className="bg-pure-white border border-border rounded-lg p-5 shadow-subtle space-y-3 relative group hover:border-rock-blue transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-pale-blue text-venice-blue font-serif font-bold text-xs flex items-center justify-center">
                    {s.step}
                  </span>
                  {idx < 4 && (
                    <span className="hidden md:block text-muted-text/50 text-xs">→</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-deep-teal">{s.title}</h4>
                <p className="text-xs text-secondary-text leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* SECTION 7 — CAREER PATHS */}
      <section id="career-paths" className="py-20 border-b border-border bg-pale-blue/40">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Role Taxonomies
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-deep-teal">
              Curated Career Pathways
            </h2>
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
                  className="bg-pure-white border border-border rounded-lg p-6 shadow-subtle space-y-4 hover:border-rock-blue transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-pale-blue text-venice-blue flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-venice-blue" />
                    </div>
                    <h3 className="text-base font-bold text-deep-teal">{p.title}</h3>
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
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-venice-blue hover:text-deep-teal"
                    >
                      <span>Explore verified roles</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section className="py-20 bg-pale-blue border-b border-border">
        <Container size="xl">
          <div className="bg-pure-white border border-border rounded-2xl p-8 sm:p-12 shadow-float max-w-4xl mx-auto text-center space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-venice-blue">
              Ready to Accelerate?
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-deep-teal leading-tight">
              Your next opportunity starts with your next step.
            </h2>
            <p className="text-base text-secondary-text max-w-xl mx-auto leading-relaxed">
              Build a clearer picture of your skills, explore relevant opportunities,
              and create a practical path toward your career goals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/resume">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start Your Career Journey
                </Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="outline">
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
