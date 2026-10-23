"use client";

import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Meter } from "@/components/ui/Meter";
import { Chip } from "@/components/ui/Chip";
import { BlurText } from "@/components/reactbits/BlurText";
import { GradientText } from "@/components/reactbits/GradientText";
import { Magnet } from "@/components/reactbits/Magnet";
import {
  FileText,
  Briefcase,
  Target,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Glow ambient background rings */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-accent/15 blur-[100px] rounded-full pointer-events-none -z-10" />

        <Container size="xl">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Banner */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-surface/70 backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
              <span className="text-xs font-medium text-text-muted">
                National Hackathon Edition • AI Platform for Indian Students
              </span>
              <Badge variant="verified" size="sm" showIcon={false}>
                Live
              </Badge>
            </div>

            {/* Headline Reveal via BlurText */}
            <div className="space-y-3">
              <BlurText
                text="From College Campus to Verified Tech Career"
                as="h1"
                className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white justify-center leading-[1.15]"
              />
              <p className="text-base sm:text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed pt-2">
                Drop your resume. Discover <GradientText>100% verified fresher listings</GradientText>, close your real-world skill gaps, and master technical interviews with AI rubric feedback.
              </p>
            </div>

            {/* Action Buttons with Magnet CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
              <Magnet strength={0.25}>
                <Link href="/resume" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="highlight"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full sm:w-auto text-base shadow-glow-saffron px-8"
                  >
                    Upload Resume & Find Jobs
                  </Button>
                </Link>
              </Magnet>

              <Link href="/jobs" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  leftIcon={<Briefcase className="w-4 h-4 text-accent" />}
                  className="w-full sm:w-auto text-base"
                >
                  Browse Verified Listings
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero fake jobs or ghost listings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Official company portal links</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-highlight" />
                <span>STAR interview evaluation</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Interactive Feature Showcase Section */}
      <section className="py-16 border-y border-border/60 bg-surface/30">
        <Container size="xl">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-accent">
              End-to-End Career Acceleration
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Built Specifically for the Indian Hiring Landscape
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              No generic suggestions. Every step uses deterministic taxonomy matching and AI evaluation tailored for freshers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1: Upload */}
            <SpotlightCard className="flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Step 01</span>
                  <h3 className="text-lg font-bold text-white">Smart Resume Parsing</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Upload PDF or text resumes. Extracts skills, education, and projects into editable canonical taxonomy chips.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Chip label="React" variant="matched" />
                  <Chip label="Python" variant="matched" />
                  <Chip label="SQL" variant="default" />
                </div>
              </div>
              <div className="pt-6">
                <Link href="/resume">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="px-0 hover:bg-transparent text-accent">
                    Try resume drop
                  </Button>
                </Link>
              </div>
            </SpotlightCard>

            {/* Step 2: Match */}
            <SpotlightCard className="flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Step 02</span>
                  <h3 className="text-lg font-bold text-white">Verified Matches</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Real-time match scoring against real internship & fresher jobs. Verified dates and direct apply links.
                  </p>
                </div>
                <div className="p-3 rounded bg-surface-2/60 border border-border/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-text">SDE Intern</p>
                    <p className="text-[10px] text-text-muted">Bengaluru • Full-time</p>
                  </div>
                  <ScoreRing score={92} size="sm" />
                </div>
              </div>
              <div className="pt-6">
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="px-0 hover:bg-transparent text-emerald-400">
                    View matches
                  </Button>
                </Link>
              </div>
            </SpotlightCard>

            {/* Step 3: Skill Gap */}
            <SpotlightCard className="flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Step 03</span>
                  <h3 className="text-lg font-bold text-white">Skill Gap & Plan</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    See exactly which high-priority skills stand between you and the offer, backed by a week-by-week plan.
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  <Meter value={76} label="Target Role Fit" variant="brand" size="sm" />
                  <div className="flex gap-1.5">
                    <Badge variant="priority-high" size="sm">Docker (High)</Badge>
                    <Badge variant="priority-medium" size="sm">Redis</Badge>
                  </div>
                </div>
              </div>
              <div className="pt-6">
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="px-0 hover:bg-transparent text-amber-400">
                    Analyze gap
                  </Button>
                </Link>
              </div>
            </SpotlightCard>

            {/* Step 4: Interview */}
            <SpotlightCard className="flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-highlight/20 border border-highlight/30 flex items-center justify-center text-highlight shadow-glow-saffron">
                  <MessageSquare className="w-5 h-5 text-highlight" />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Step 04</span>
                  <h3 className="text-lg font-bold text-white">Mock Interview AI</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Practice role-specific technical, behavioral, and HR questions with instant rubric scores and strengths.
                  </p>
                </div>
                <div className="p-2.5 rounded bg-surface-2/60 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text font-medium">STAR Answer</span>
                    <span className="text-emerald-400 font-bold">9/10</span>
                  </div>
                  <p className="text-[10px] text-text-muted line-clamp-2">
                    &quot;Strong structured breakdown of problem constraints and business outcome.&quot;
                  </p>
                </div>
              </div>
              <div className="pt-6">
                <Link href="/interview">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="px-0 hover:bg-transparent text-highlight">
                    Start practice
                  </Button>
                </Link>
              </div>
            </SpotlightCard>
          </div>
        </Container>
      </section>

      {/* Proof / Metrics Strip */}
      <section className="py-16">
        <Container size="xl">
          <div className="rounded-lg border border-border bg-surface p-8 sm:p-12 relative overflow-hidden shadow-card">
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gradient opacity-10 blur-3xl pointer-events-none" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">100%</p>
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">Verified Jobs</p>
                <p className="text-[11px] text-text-muted">Direct from official hiring portals</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">0</p>
                <p className="text-xs font-semibold text-highlight uppercase tracking-wider">Ghost Listings</p>
                <p className="text-[11px] text-text-muted">Strict timestamp verification</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">4-Week</p>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Prep Plans</p>
                <p className="text-[11px] text-text-muted">Curated free learning resources</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">&lt; 90s</p>
                <p className="text-xs font-semibold text-text uppercase tracking-wider">Fast Demo Flow</p>
                <p className="text-[11px] text-text-muted">Zero friction for hackathon judges</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Ready to Demo CTA */}
      <section className="py-16 pb-24 text-center">
        <Container size="md">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Ready to see the student journey in action?
            </h2>
            <p className="text-sm text-text-muted max-w-lg mx-auto leading-relaxed">
              Start with the resume upload dropzone. Watch it extract skills and match verified openings in seconds.
            </p>
            <div className="pt-2">
              <Link href="/resume">
                <Button size="lg" variant="highlight" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Launch Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
