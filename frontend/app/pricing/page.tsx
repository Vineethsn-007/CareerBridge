"use client";

import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Check, Info, ArrowRight } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "For students exploring career guidance and discovering verified opportunities.",
      isPopular: false,
      ctaLabel: "Get Started Free",
      ctaHref: "/resume",
      ctaVariant: "outline" as const,
      features: [
        "Unlimited resume uploads & parsing",
        "Browse 50+ verified fresher job listings",
        "Detailed skill gap breakdown per job",
        "View top matched roles with rationale",
        "Sample 4-week prep plan outline",
      ],
    },
    {
      name: "Plus",
      price: "₹299",
      period: "per month",
      description: "For students actively preparing for campus placements and off-campus drives.",
      isPopular: true,
      badge: "Most Popular",
      ctaLabel: "Explore Plus (Demo)",
      ctaHref: "/resume",
      ctaVariant: "primary" as const,
      features: [
        "Everything in Free, plus:",
        "Unlimited AI mock interview sessions",
        "STAR methodology answer feedback",
        "Detailed rubric scoring & model answers",
        "Customizable weekly study commitment (5-20 hrs/wk)",
        "Curated free resources from NPTEL & official docs",
      ],
    },
    {
      name: "Pro",
      price: "₹599",
      period: "per month",
      description: "For intensive placement preparation with personalized coaching roadmaps.",
      isPopular: false,
      ctaLabel: "Explore Pro (Demo)",
      ctaHref: "/resume",
      ctaVariant: "outline" as const,
      features: [
        "Everything in Plus, plus:",
        "Priority AI analysis & model answers",
        "Multi-role skill gap comparison",
        "Progressive checklist tracking with local saving",
        "Exportable PDF preparation summaries",
        "Early access to newly verified job postings",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-merino text-primary-text py-12 md:py-20">
      <Container size="xl">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge variant="verified" size="sm">
            Student-First Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-deep-teal">
            Simple, Transparent Pricing for Indian Students
          </h1>
          <p className="text-base sm:text-lg text-secondary-text leading-relaxed">
            Every core feature of CareerBridge is free during the hackathon evaluation.
            Below are our proposed sustainable tiers for post-competition launch.
          </p>

          <div className="inline-flex items-center gap-2 p-3 bg-pale-blue border border-border rounded-lg text-xs text-secondary-text text-left max-w-xl mx-auto">
            <Info className="w-4 h-4 text-venice-blue shrink-0" />
            <span>
              <strong>Note:</strong> All features are currently 100% unlocked in Free tier for hackathon judges and evaluation testing. No payment or billing is required.
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative bg-pure-white border rounded-xl p-8 shadow-card flex flex-col justify-between transition-all duration-200 ${
                p.isPopular
                  ? "border-venice-blue ring-2 ring-rock-blue/30 shadow-float"
                  : "border-border hover:border-rock-blue"
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-venice-blue text-white text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-subtle">
                    {p.badge}
                  </span>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-serif font-bold text-deep-teal">{p.name}</h3>
                  <p className="text-xs text-secondary-text min-h-[36px]">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1.5 pb-4 border-b border-border">
                  <span className="text-4xl font-serif font-bold text-deep-teal">{p.price}</span>
                  <span className="text-xs text-secondary-text">/ {p.period}</span>
                </div>

                {/* Features List */}
                <ul className="space-y-3">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-primary-text">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-[#18856B] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#18856B]" />
                      </div>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link href={p.ctaHref} className="block w-full">
                  <Button
                    size="md"
                    variant={p.ctaVariant}
                    className="w-full"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {p.ctaLabel}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-deep-teal">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-secondary-text">Everything you need to know about CareerBridge access.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is CareerBridge completely free right now?",
                a: "Yes! All features — resume parsing, verified job matching, skill gap priorities, weekly prep plans, and AI mock interviews — are completely free and unlocked for testing.",
              },
              {
                q: "Where do the job listings come from?",
                a: "Every listing is vetted against official career portals, Apprenticeship India, and university placement boards to guarantee 100% zero ghost jobs.",
              },
              {
                q: "How does the AI evaluate my mock interview answers?",
                a: "Answers are evaluated against role-specific rubrics based on the STAR methodology (Situation, Task, Action, Result), providing constructive feedback and exemplar model answers.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-pure-white border border-border rounded-lg p-5 shadow-subtle space-y-1.5">
                <h4 className="text-sm font-bold text-deep-teal">{faq.q}</h4>
                <p className="text-xs text-secondary-text leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
