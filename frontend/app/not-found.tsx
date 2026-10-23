import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Compass, Home, Briefcase } from "lucide-react";

export default function NotFound() {
  return (
    <div className="py-24 bg-mesh min-h-[70vh] flex items-center justify-center">
      <Container size="sm">
        <div className="text-center space-y-6 rounded-lg border border-border bg-surface p-8 sm:p-12 shadow-card">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-accent mx-auto shadow-glow">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
              Error 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find the page you were looking for. It may have moved or the URL might be incorrect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/" className="w-full sm:w-auto">
              <Button size="md" variant="primary" leftIcon={<Home className="w-4 h-4" />} className="w-full sm:w-auto">
                Back to Home
              </Button>
            </Link>

            <Link href="/jobs" className="w-full sm:w-auto">
              <Button size="md" variant="secondary" leftIcon={<Briefcase className="w-4 h-4 text-accent" />} className="w-full sm:w-auto">
                Browse Verified Jobs
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
