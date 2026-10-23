import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Compass, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-merino pt-12 pb-10 text-xs text-secondary-text">
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-border">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-venice-blue flex items-center justify-center text-white shadow-subtle">
                <Compass className="w-4 h-4 text-rock-blue" />
              </div>
              <span className="text-lg font-serif font-bold text-deep-teal">
                Career<span className="text-venice-blue">Bridge</span>
              </span>
            </div>
            <p className="text-xs text-secondary-text max-w-sm leading-relaxed">
              Your Skills. Your Future. Your CareerBridge. Discover relevant jobs, identify your skill gaps, and build a personalized path toward your career goals.
            </p>
            <div className="flex items-center gap-2 text-[#18856B] text-[11px] font-medium pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#18856B]" />
              <span>Verified fresher & internship listings across India</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-deep-teal text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/resume" className="hover:text-venice-blue transition-colors">
                  Resume Intelligence
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:text-venice-blue transition-colors">
                  Job Matching
                </Link>
              </li>
              <li>
                <Link href="/interview" className="hover:text-venice-blue transition-colors">
                  Interview Practice
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-venice-blue transition-colors">
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-semibold text-deep-teal text-xs uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#how-it-works" className="hover:text-venice-blue transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#career-paths" className="hover:text-venice-blue transition-colors">
                  Career Paths
                </Link>
              </li>
              <li>
                <Link href="/design" className="hover:text-venice-blue transition-colors">
                  Design System
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-text">
          <p>© {new Date().getFullYear()} CareerBridge. All rights reserved.</p>
          <p>
            Designed for students, fresh graduates, and aspiring professionals across India.
          </p>
        </div>
      </Container>
    </footer>
  );
}
