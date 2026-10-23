import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "soft";
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
    default: "bg-pure-white border border-border shadow-card",
    elevated: "bg-pure-white border border-border shadow-float",
    interactive:
      "bg-pure-white border border-border hover:border-rock-blue hover:shadow-float transition-all duration-300 cursor-pointer",
    soft: "bg-pale-blue border border-border",
  };

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden",
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
