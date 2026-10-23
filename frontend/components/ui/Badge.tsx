import React from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, AlertCircle } from "lucide-react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "verified"
    | "priority-high"
    | "priority-medium"
    | "priority-low"
    | "highlight"
    | "neutral"
    | "outline";
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  showIcon = true,
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  const variantStyles = {
    verified:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium",
    "priority-high":
      "bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium",
    "priority-medium":
      "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium",
    "priority-low":
      "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium",
    highlight:
      "bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold",
    neutral:
      "bg-surface-2 text-text-muted border border-border font-medium",
    outline:
      "bg-transparent text-text-muted border border-border",
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    switch (variant) {
      case "verified":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case "priority-high":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case "priority-medium":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full tracking-wide transition-colors",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
}
