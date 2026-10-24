"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  const [chips, setChips] = useState(["React", "TypeScript", "Next.js", "Python", "SQL"]);
  const [meterVal, setMeterVal] = useState(82);
  const [btnLoading, setBtnLoading] = useState(false);

  const removeChip = (skill: string) => {
    setChips((prev) => prev.filter((c) => c !== skill));
  };

  return (
    <div className="py-10 bg-merino min-h-screen text-primary-text">
      <Container size="xl">
        <PageHeader
          title="Design System & Token Catalog"
          subtitle="Single source of truth for CareerBridge cream-and-blue UI components, tokens, and motion styles."
          badge={<Badge variant="verified">Living Spec v2.0</Badge>}
        />

        <div className="space-y-16">
          {/* Brand Tokens Section */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal flex items-center gap-2">
                <span>1. Color Tokens & Theme</span>
                <span className="text-xs text-secondary-text font-normal font-sans">(Cream & Powder-Blue Palette)</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "--color-merino", hex: "#F5EEDD", label: "Main Cream Canvas" },
                { name: "--color-pure-white", hex: "#FFFFFF", label: "Card Surfaces" },
                { name: "--color-pale-blue", hex: "#E6F0F5", label: "Soft Panels" },
                { name: "--color-rock-blue", hex: "#84B3CE", label: "Secondary Blue" },
                { name: "--color-venice-blue", hex: "#16587B", label: "Primary Brand Blue" },
                { name: "--color-deep-teal", hex: "#104763", label: "High-Emphasis Text" },
                { name: "--color-dark-navy", hex: "#163A50", label: "Contrast Navy" },
                { name: "--color-light-blue", hex: "#D5E6EF", label: "Accent Blue" },
                { name: "--color-primary-text", hex: "#173A4A", label: "Primary Text" },
                { name: "--color-secondary-text", hex: "#496775", label: "Secondary Text" },
                { name: "--color-border", hex: "#D8E1DE", label: "Fine Border" },
                { name: "--color-success", hex: "#18856B", label: "Verified Green" },
                { name: "--color-warning", hex: "#B87926", label: "Warning Amber" },
                { name: "--color-error", hex: "#B54747", label: "Error Rose" },
              ].map((token) => (
                <div
                  key={token.name}
                  className="rounded-lg border border-border bg-pure-white p-3 space-y-2 shadow-subtle"
                >
                  <div
                    className="h-14 rounded-md border border-border"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-deep-teal">{token.name}</p>
                    <p className="text-[11px] text-secondary-text">{token.label}</p>
                    <p className="text-[10px] text-muted-text font-mono">{token.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Typography Scale Section */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal flex items-center gap-2">
                <span>2. Typography Hierarchy</span>
                <span className="text-xs text-secondary-text font-normal font-sans">(Playfair Display Serif + Plus Jakarta Sans)</span>
              </h2>
            </div>

            <Card variant="default" className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-text uppercase tracking-wider">Hero Headline (Serif)</span>
                <h1 className="text-4xl sm:text-5xl font-serif font-bold text-deep-teal">
                  Your Skills. Your Future. Your CareerBridge.
                </h1>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <span className="text-xs text-muted-text uppercase tracking-wider">Section Heading (Serif)</span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-deep-teal">
                  Career decisions shouldn&apos;t feel like guesswork.
                </h2>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <span className="text-xs text-muted-text uppercase tracking-wider">Dashboard Heading (Sans-Serif)</span>
                <h3 className="text-lg font-bold text-primary-text">
                  Verified Matches Dashboard
                </h3>
              </div>

              <div className="space-y-1 pt-2 border-t border-border">
                <span className="text-xs text-muted-text uppercase tracking-wider">Body Copy (Sans-Serif)</span>
                <p className="text-sm text-secondary-text leading-relaxed max-w-2xl">
                  Discover relevant jobs, identify skill gaps, and build personalized preparation plans with AI, designed for students, fresh graduates, and aspiring professionals.
                </p>
              </div>
            </Card>
          </section>

          {/* Buttons Section */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal">3. Buttons & Actions</h2>
            </div>

            <Card variant="default" className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Primary (Venice Blue)
                </Button>
                <Button variant="secondary">
                  Secondary (Pale Blue)
                </Button>
                <Button variant="highlight">
                  Highlight (Rock Blue)
                </Button>
                <Button variant="outline">
                  Outline
                </Button>
                <Button variant="ghost">
                  Ghost
                </Button>
                <Button
                  variant="primary"
                  isLoading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1500);
                  }}
                >
                  Click for Loading
                </Button>
              </div>

              <div className="pt-2 border-t border-border flex items-center gap-4">
                <span className="text-xs text-secondary-text">Magnet Interactive CTA:</span>
                <Magnet strength={0.3}>
                  <Button variant="primary" size="md">
                    Hover Over Magnet
                  </Button>
                </Magnet>
              </div>
            </Card>
          </section>

          {/* Cards & Badges Section */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal">4. Badges, Chips & Cards</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card variant="default" className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-deep-teal">Status Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="verified">Verified Listing</Badge>
                  <Badge variant="priority-high">High Priority</Badge>
                  <Badge variant="priority-medium">Expected</Badge>
                  <Badge variant="priority-low">Bonus Skill</Badge>
                  <Badge variant="neutral">Neutral Status</Badge>
                  <Badge variant="outline">Full-Time</Badge>
                </div>
              </Card>

              <Card variant="default" className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-deep-teal">Skill Chips</h3>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <Chip key={c} label={c} variant="default" onRemove={() => removeChip(c)} />
                  ))}
                  <Chip label="Matched Skill" variant="matched" />
                  <Chip label="Missing Skill" variant="missing" />
                  <Chip label="Target Skill" variant="highlight" />
                </div>
              </Card>
            </div>
          </section>

          {/* Visual Meters & Score Rings */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal">5. Progress Meters & Radial Rings</h2>
            </div>

            <Card variant="default" className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-around gap-6">
                <ScoreRing score={meterVal} size="sm" label="Small Ring" />
                <ScoreRing score={meterVal} size="md" label="Medium Ring" />
                <ScoreRing score={meterVal} size="lg" label="Large Ring" />
              </div>

              <div className="space-y-3 pt-4 border-t border-border max-w-md mx-auto">
                <Meter value={meterVal} label="Interactive Role Readiness" />
                <div className="flex justify-center gap-2 pt-2">
                  {[25, 50, 75, 90, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMeterVal(v)}
                      className="px-2.5 py-1 text-xs rounded bg-pale-blue text-deep-teal hover:bg-light-blue font-mono font-semibold"
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* Inputs & Forms Section */}
          {/* Inputs & Forms Section */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal">6. Form Controls</h2>
            </div>

            <Card variant="default" className="p-6 space-y-4 max-w-xl">
              <Input
                label="Full Name"
                placeholder="Enter candidate name..."
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Input
                label="Email Address"
                placeholder="candidate@university.edu"
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="We will never share your personal email."
              />
              <Textarea
                label="Interview Answer"
                placeholder="Use the STAR method to structure your response..."
              />
            </Card>
          </section>

          {/* Interactive, Feedback & Empty States */}
          <section className="space-y-6">
            <div className="border-b border-border pb-2">
              <h2 className="text-xl font-serif font-bold text-deep-teal flex items-center gap-2">
                <span>7. Feedback, Loading & Empty States</span>
                <Sparkles className="w-4 h-4 text-venice-blue" />
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <Card variant="default" className="p-6 space-y-3">
                <h3 className="text-sm font-bold text-deep-teal flex items-center gap-2">
                  <span>Editorial Card with</span>
                  <GradientText>Gradient Text</GradientText>
                </h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Clean editorial card presentation with subtle borders and serene color hierarchy.
                </p>
              </Card>

              <SkeletonCard />
            </div>

            <div className="space-y-4">
              <ErrorMessage
                title="Example Network Warning"
                message="This is a demonstrated accessible alert component with a retry callback."
                onRetry={() => {}}
              />

              <EmptyState
                title="No Openings in Selected Filter"
                description="This empty state component guides users when no search parameters match."
                actionLabel="Reset Sample Filter"
                onAction={() => {}}
              />
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
