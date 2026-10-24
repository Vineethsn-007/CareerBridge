"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Brain } from "lucide-react";
import Link from "next/link";

export default function PersonaRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to /resume where Persona Q&A is integrated right after resume parsing
    const timer = setTimeout(() => {
      router.replace("/resume");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="py-16 bg-merino min-h-screen">
      <Container size="md">
        <PageHeader
          title="Candidate Intelligence Pipeline"
          subtitle="Persona Q&A is now integrated directly right after resume parsing to power AI matching."
          badge={<Badge variant="highlight">Integrated Workflow</Badge>}
        />

        <Card variant="elevated" padding="lg" className="text-center space-y-6 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-pale-blue text-venice-blue flex items-center justify-center mx-auto shadow-subtle">
            <Brain className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-deep-teal">
              Redirecting to Unified Candidate Onboarding...
            </h3>
            <p className="text-xs text-secondary-text leading-relaxed">
              Persona Q&A now comes immediately after your resume is parsed. This ensures the AI grounds every question in your actual skills and projects, providing complete data for job matching.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link href="/resume">
              <Button
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-sm"
              >
                Go to Resume & Persona Flow Now
              </Button>
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
