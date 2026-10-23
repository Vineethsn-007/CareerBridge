"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Input, Textarea } from "@/components/ui/Input";
import { Meter } from "@/components/ui/Meter";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { GradientText } from "@/components/reactbits/GradientText";
import { Magnet } from "@/components/reactbits/Magnet";
import {
  Sparkles,
  ArrowRight,
  Search,
  Mail,
} from "lucide-react";

export default function DesignSystemPage() {
  const [chips, setChips] = useState(["React", "TypeScript", "Next.js", "Tailwind CSS", "Python"]);
  const [meterVal, setMeterVal] = useState(78);
  const [btnLoading, setBtnLoading] = useState(false);

  const removeChip = (skill: string) => {
    setChips((prev) => prev.filter((c) => c !== skill));
  };

  return (
    <div className="py-10 bg-mesh min-h-screen">
      <Container size="xl">
        <PageHeader
          title="Design System & Token Catalog"
          subtitle="Single source of truth for CareerBridge UI components, tokens, and motion styles."
          badge={<Badge variant="verified">Living Spec v1.0</Badge>}
        />

        <div className="space-y-16">
          {/* Brand Tokens Section */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text flex items-center gap-2">
                <span>1. Color Tokens & Theme</span>
                <span className="text-xs text-text-muted font-normal">(Dark-first canvas)</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "--bg", hex: "#0A0B14", label: "Canvas" },
                { name: "--surface", hex: "#12142A", label: "Cards" },
                { name: "--surface-2", hex: "#1B1E3D", label: "Raised/Hover" },
                { name: "--primary", hex: "#6366F1", label: "Indigo" },
                { name: "--accent", hex: "#22D3EE", label: "Cyan" },
                { name: "--highlight", hex: "#FF9933", label: "Saffron" },
                { name: "--success", hex: "#22C55E", label: "Verified" },
                { name: "--warning", hex: "#F59E0B", label: "Warning" },
                { name: "--danger", hex: "#EF4444", label: "Danger" },
                { name: "--text", hex: "#F4F5FB", label: "Text Primary" },
                { name: "--text-muted", hex: "#9AA0BE", label: "Text Muted" },
                { name: "--border", hex: "rgba(255,255,255,0.08)", label: "Border" },
              ].map((token) => (
                <div
                  key={token.name}
                  className="rounded-md border border-border bg-surface p-3 space-y-2 shadow-sm"
                >
                  <div
                    className="h-14 rounded border border-white/10"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-text">{token.name}</p>
                    <p className="text-[11px] text-text-muted">{token.label}</p>
                    <p className="text-[10px] text-text-muted/60 font-mono">{token.hex}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Brand Gradient Banner */}
            <div className="rounded-md p-6 bg-brand-gradient text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-glow">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-80">Signature Brand Gradient</span>
                <h3 className="text-xl font-bold">linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)</h3>
                <p className="text-xs opacity-90 mt-1">Used consistently for hero reveals, primary CTA buttons, focus outlines, and meters.</p>
              </div>
              <Badge variant="highlight" className="bg-bg/40 text-highlight border-highlight/40">
                Primary Direction
              </Badge>
            </div>
          </section>

          {/* Typography Scale */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">2. Typography Scale (Plus Jakarta Sans)</h2>
            </div>
            <div className="rounded-md border border-border bg-surface p-6 space-y-6">
              <div>
                <span className="text-xs text-text-muted uppercase">Display Hero</span>
                <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text">
                  Accelerate your <GradientText>tech career</GradientText> in India
                </p>
              </div>
              <div>
                <span className="text-xs text-text-muted uppercase">Heading 1</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-text">Verified Fresher Opportunities</h1>
              </div>
              <div>
                <span className="text-xs text-text-muted uppercase">Heading 2</span>
                <h2 className="text-xl font-semibold text-text">Skill Gap Assessment & Prep Plan</h2>
              </div>
              <div>
                <span className="text-xs text-text-muted uppercase">Body Lead</span>
                <p className="text-base text-text-muted leading-relaxed">
                  Every recommendation is built on your exact resume and benchmarked against real company expectations.
                </p>
              </div>
              <div>
                <span className="text-xs text-text-muted uppercase">Caption / Microcopy</span>
                <p className="text-xs text-text-muted">
                  Last verified: 2026-10-20 • Direct official portal apply link
                </p>
              </div>
            </div>
          </section>

          {/* Buttons Section */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">3. Buttons & Interactions</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Primary Gradient
              </Button>
              <Button variant="highlight" leftIcon={<Sparkles className="w-4 h-4" />}>
                Saffron Highlight CTA
              </Button>
              <Button variant="secondary">Secondary Surface</Button>
              <Button variant="outline">Outline Border</Button>
              <Button variant="ghost">Ghost Plain</Button>
              <Button
                variant="primary"
                isLoading={btnLoading}
                onClick={() => {
                  setBtnLoading(true);
                  setTimeout(() => setBtnLoading(false), 2000);
                }}
              >
                Click for Loading
              </Button>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Magnet strength={0.4}>
                <Button variant="highlight" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Magnet CTA (Hover Me)
                </Button>
              </Magnet>
              <Button size="sm" variant="primary">Small</Button>
              <Button size="md" variant="primary">Medium</Button>
              <Button size="lg" variant="primary">Large</Button>
            </div>
          </section>

          {/* Cards & Spotlight */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">4. Cards & Spotlight Surfaces</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="default">
                <Badge variant="neutral" className="mb-3">Standard Card</Badge>
                <h3 className="text-base font-semibold text-text mb-2">Base Surface</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Surface `#12142A` with 1px border and subtle specular reflection on the top border.
                </p>
              </Card>

              <Card variant="interactive">
                <Badge variant="verified" className="mb-3">Interactive</Badge>
                <h3 className="text-base font-semibold text-text mb-2">Hover Glow Card</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Smooth hover elevation with cyan border glow, perfect for clickable job cards.
                </p>
              </Card>

              <SpotlightCard spotlightColor="rgba(34, 211, 238, 0.2)">
                <Badge variant="highlight" className="mb-3">React Bits Spotlight</Badge>
                <h3 className="text-base font-semibold text-text mb-2">Dynamic Spotlight</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Move your mouse across this card to see real-time radial illumination tracking.
                </p>
              </SpotlightCard>
            </div>
          </section>

          {/* Badges & Chips */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">5. Badges & Skill Chips</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="verified">Verified Listing</Badge>
                <Badge variant="priority-high">High Priority</Badge>
                <Badge variant="priority-medium">Medium Priority</Badge>
                <Badge variant="priority-low">Low Priority</Badge>
                <Badge variant="highlight">Top Match 95%</Badge>
                <Badge variant="neutral">Fresher Friendly</Badge>
                <Badge variant="outline">Full-Time</Badge>
              </div>

              <div className="pt-2">
                <p className="text-xs text-text-muted mb-2">Interactive Skill Chips (Click X to remove):</p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((skill) => (
                    <Chip
                      key={skill}
                      label={skill}
                      variant="default"
                      onRemove={() => removeChip(skill)}
                    />
                  ))}
                  <Chip
                    label="Python (Matched)"
                    variant="matched"
                  />
                  <Chip
                    label="Docker (Missing)"
                    variant="missing"
                  />
                  <Chip
                    label="Add Skill"
                    variant="highlight"
                    onAdd={() => {
                      const newSkill = prompt("Enter skill:");
                      if (newSkill) setChips((prev) => [...prev, newSkill]);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Score Rings & Meters */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">6. Progress Meters & Score Rings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 rounded-md border border-border bg-surface p-6">
                <h3 className="text-sm font-semibold text-text mb-2">Linear Coverage Meters</h3>
                <Meter value={meterVal} label="Job Match Coverage" variant="brand" />
                <Meter value={92} label="Python & Backend Skills" variant="success" />
                <Meter value={45} label="Cloud & DevOps Readiness" variant="warning" />
                <Meter value={68} label="STAR Method Practice" variant="saffron" />
                <div className="pt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setMeterVal(Math.floor(Math.random() * 100))}>
                    Randomize Value
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-6 flex flex-wrap items-center justify-around gap-6">
                <ScoreRing score={94} size="lg" label="Overall Match" />
                <ScoreRing score={72} size="md" label="Technical Fit" />
                <ScoreRing score={48} size="sm" label="Experience" />
              </div>
            </div>
          </section>

          {/* Inputs & Form Controls */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">7. Form Elements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Search Listings"
                placeholder="Job title, tech stack, or location..."
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Input
                label="Student Email"
                placeholder="student@college.edu.in"
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="We never send spam. Used only for interview feedback."
              />
              <Input
                label="Target Role"
                defaultValue="Frontend Engineer"
                error="Please enter at least 3 required skills"
              />
              <Textarea
                label="Interview Answer (STAR format)"
                placeholder="Situation: During my final year project... Task: I was responsible for... Action: I built... Result: Improved latency by 40%..."
              />
            </div>
          </section>

          {/* Skeletons & Async States */}
          <section className="space-y-6">
            <div className="border-b border-border/50 pb-2">
              <h2 className="text-xl font-bold text-text">8. Skeletons & Async Feedback States</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonCard />
              <div className="space-y-4">
                <ErrorMessage
                  title="Failed to fetch matching jobs"
                  message="Could not reach the backend service on http://localhost:8000. Please ensure the server is running."
                  onRetry={() => alert("Retrying API connection...")}
                />
                <EmptyState
                  title="No Jobs Found"
                  description="No listings match your current filters. Try expanding your search radius or clearing type filters."
                  actionLabel="Reset Filters"
                  onAction={() => alert("Filters reset!")}
                />
              </div>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
