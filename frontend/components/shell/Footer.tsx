import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Sparkles, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/80 bg-surface/50 pt-12 pb-10 text-xs text-text-muted">
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-border/40">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand-gradient flex items-center justify-center text-white shadow-glow">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-base font-bold text-white">
                Career<span className="text-gradient">Bridge</span>
              </span>
            </div>
            <p className="text-xs text-text-muted max-w-sm leading-relaxed">
              Empowering Indian students and freshers to find verified opportunities, bridge critical skill gaps, and ace technical interviews.
            </p>
            <div className="flex items-center gap-2 text-emerald-400/90 text-[11px] font-medium pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>100% Verified fresher & internship listings</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-text text-xs uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/resume" className="hover:text-accent transition-colors">
                  Resume Parser
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-accent transition-colors">
                  Verified Matches
                </Link>
              </li>
              <li>
                <Link href="/interview" className="hover:text-accent transition-colors">
                  Mock Interview AI
                </Link>
              </li>
              <li>
                <Link href="/design" className="hover:text-accent transition-colors">
                  Design System
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-text text-xs uppercase tracking-wider">Mission</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Built for the National Hackathon with a focus on Tier-2/3 college graduates across India.
            </p>
            <p className="text-[11px] text-text-muted/80 pt-1">
              Backend API connected to real verified job data.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-text-muted/70">
          <p>© {new Date().getFullYear()} CareerBridge. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> for Indian Students
          </p>
        </div>
      </Container>
    </footer>
  );
}
