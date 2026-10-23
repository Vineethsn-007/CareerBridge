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
      "bg-emerald-50 text-[#18856B] border border-[#18856B]/30 font-medium",
    "priority-high":
      "bg-rose-50 text-[#B54747] border border-[#B54747]/30 font-medium",
    "priority-medium":
      "bg-amber-50 text-[#B87926] border border-[#B87926]/30 font-medium",
    "priority-low":
      "bg-pale-blue text-deep-teal border border-rock-blue/30 font-medium",
    highlight:
      "bg-pale-blue text-venice-blue border border-rock-blue/40 font-semibold",
    neutral:
      "bg-pale-blue text-secondary-text border border-border font-medium",
    outline:
      "bg-transparent text-secondary-text border border-border",
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    switch (variant) {
      case "verified":
        return <ShieldCheck className="w-3.5 h-3.5 text-[#18856B] shrink-0" />;
      case "priority-high":
        return <AlertCircle className="w-3.5 h-3.5 text-[#B54747] shrink-0" />;
      case "priority-medium":
        return <AlertCircle className="w-3.5 h-3.5 text-[#B87926] shrink-0" />;
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
