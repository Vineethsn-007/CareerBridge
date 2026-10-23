import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "highlight" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-DEFAULT transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

    const variantStyles = {
      primary:
        "bg-brand-gradient text-white hover:opacity-95 shadow-glow hover:shadow-glow-accent border border-white/10",
      secondary:
        "bg-surface-2 text-text hover:bg-surface-2/80 border border-border hover:border-white/20",
      highlight:
        "bg-saffron-gradient text-bg font-semibold hover:brightness-105 shadow-glow-saffron border border-highlight/30",
      outline:
        "bg-transparent text-text border border-border hover:border-accent hover:text-accent",
      ghost:
        "bg-transparent text-text-muted hover:text-text hover:bg-white/5",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
