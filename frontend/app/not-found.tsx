import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Compass, Home, Briefcase } from "lucide-react";

export default function NotFound() {
  return (
    <div className="py-24 bg-merino min-h-[70vh] flex items-center justify-center">
      <Container size="sm">
        <div className="text-center space-y-6 rounded-xl border border-border bg-pure-white p-8 sm:p-12 shadow-card">
          <div className="w-16 h-16 rounded-full bg-pale-blue border border-border flex items-center justify-center text-venice-blue mx-auto shadow-subtle">
            <Compass className="w-8 h-8 text-venice-blue" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-venice-blue uppercase tracking-wider">
              Error 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-deep-teal">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-secondary-text max-w-sm mx-auto leading-relaxed">
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
              <Button size="md" variant="outline" leftIcon={<Briefcase className="w-4 h-4 text-venice-blue" />} className="w-full sm:w-auto">
                Browse Verified Jobs
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
