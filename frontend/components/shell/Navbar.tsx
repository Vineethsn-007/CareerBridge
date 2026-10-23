"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  Menu,
  X,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#capabilities", label: "Product" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#career-paths", label: "Career Paths" },
    { href: "/jobs", label: "Jobs" },
    { href: "/pricing", label: "Pricing" },
    { href: "/interview", label: "Practice" },
  ];

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-merino/90 backdrop-blur-md transition-all">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Official CareerBridge Brand */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-venice-blue rounded-DEFAULT py-1 px-1"
            aria-label="CareerBridge Home"
          >
            <Image
              src="/images/logo-horizontal.png"
              alt="CareerBridge"
              width={160}
              height={36}
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-[1.02] transition-transform duration-200"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-DEFAULT transition-all duration-150",
                    isActive
                      ? "text-venice-blue bg-pale-blue font-semibold"
                      : "text-secondary-text hover:text-primary-text hover:bg-pale-blue/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/resume">
              <Button size="sm" variant="ghost">
                Sign In
              </Button>
            </Link>
            <Link href="/resume">
              <Button size="sm" variant="primary">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-secondary-text hover:text-primary-text rounded-DEFAULT hover:bg-pale-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-venice-blue"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-venice-blue" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-pure-white px-4 pt-3 pb-6 space-y-2 shadow-float animate-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={cn(
                  "block px-3 py-2 text-sm font-medium rounded-DEFAULT transition-colors",
                  isActive
                    ? "bg-pale-blue text-venice-blue font-semibold"
                    : "text-secondary-text hover:text-primary-text hover:bg-pale-blue/50"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Link href="/resume" onClick={closeMenu}>
              <Button size="md" variant="primary" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
