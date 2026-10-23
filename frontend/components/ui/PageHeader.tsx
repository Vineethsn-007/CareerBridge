import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  isSerif?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  action,
  badge,
  isSerif = true,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border mb-8",
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-secondary-text hover:text-venice-blue transition-colors mb-1 font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className={cn(
              "text-2xl sm:text-3xl tracking-tight text-deep-teal font-bold",
              isSerif && "font-serif text-3xl sm:text-4xl"
            )}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-secondary-text max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}
