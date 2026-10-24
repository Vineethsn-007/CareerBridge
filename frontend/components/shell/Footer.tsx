"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ShieldCheck } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!footerRef.current || prefersReducedMotion()) return;

      const footer = footerRef.current;
      const brand = footer.querySelector(".footer-brand");
      const cols = footer.querySelectorAll(".footer-col");
      const bottom = footer.querySelector(".footer-bottom");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: footer,
          start: "top 92%",
          once: true,
        },
      });

      tl.from(brand, {
        opacity: 0,
        y: 18,
        duration: 0.6,
        ease: "power2.out",
      })
        .from(
          cols,
          {
            opacity: 0,
            y: 16,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.4"
        )
        .from(
          bottom,
          {
            opacity: 0,
            y: 10,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.3"
        );
    },
    { scope: footerRef }
  );

  return (
    <footer
      ref={footerRef}
      className="w-full border-t border-border bg-merino pt-12 pb-10 text-xs text-secondary-text"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-border">
          <div className="footer-brand space-y-3 md:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-venice-blue rounded-DEFAULT"
              aria-label="CareerBridge Home"
            >
              <Image
                src="/images/logo-horizontal.png"
                alt="CareerBridge"
                width={150}
                height={34}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-secondary-text max-w-sm leading-relaxed">
              Your Skills. Your Future. Your CareerBridge. Discover relevant jobs, identify your skill gaps, and build a personalized path toward your career goals.
            </p>
            <div className="flex items-center gap-2 text-[#18856B] text-[11px] font-medium pt-1">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#18856B]" />
              <span>Verified fresher & internship listings across India</span>
            </div>
          </div>

          <div className="footer-col space-y-2.5">
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

          <div className="footer-col space-y-2.5">
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

        <div className="footer-bottom pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-text">
          <p>© {new Date().getFullYear()} CareerBridge. All rights reserved.</p>
          <p>
            Designed for students, fresh graduates, and aspiring professionals across India.
          </p>
        </div>
      </Container>
    </footer>
  );
}
