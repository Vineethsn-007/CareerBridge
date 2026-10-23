"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  Briefcase,
  FileText,
  MessageSquare,
  Sparkles,
  Menu,
  X,
  Layers,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/resume", label: "Upload Resume", icon: FileText },
    { href: "/jobs", label: "Matched Jobs", icon: Briefcase },
    { href: "/interview", label: "Interview Practice", icon: MessageSquare },
    { href: "/design", label: "Design System", icon: Layers },
  ];

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-bg/80 backdrop-blur-xl transition-all">
      <Container size="xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Wordmark */}
          <Link
            href="/"
            onClick={closeMenu}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-DEFAULT py-1 px-1.5"
          >
            <div className="w-8 h-8 rounded-DEFAULT bg-brand-gradient flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 fill-white/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                Career<span className="text-gradient">Bridge</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-DEFAULT transition-all duration-150",
                    isActive
                      ? "bg-surface-2 text-accent border border-accent/20 shadow-sm"
                      : "text-text-muted hover:text-text hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/resume">
              <Button size="sm" variant="highlight">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-muted hover:text-text rounded-DEFAULT hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-accent" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-DEFAULT transition-colors",
                  isActive
                    ? "bg-surface-2 text-accent border border-accent/30"
                    : "text-text-muted hover:text-text hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 text-accent" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-border">
            <Link href="/resume" onClick={closeMenu} className="block w-full">
              <Button size="md" variant="highlight" className="w-full">
                Upload Resume & Find Jobs
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
