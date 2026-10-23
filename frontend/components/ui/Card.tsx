import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const variantStyles = {
    default: "bg-surface border border-border shadow-card",
    elevated: "bg-surface-2 border border-border shadow-card hover:border-white/15",
    interactive:
      "bg-surface border border-border hover:border-accent/40 hover:bg-surface-2 transition-all duration-300 shadow-card hover:shadow-glow cursor-pointer",
  };

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden bg-card-reflection",
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {/* Subtle top edge specular reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}
