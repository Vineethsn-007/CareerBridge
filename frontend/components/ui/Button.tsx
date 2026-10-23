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
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-DEFAULT transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-venice-blue cursor-pointer";

    const variantStyles = {
      primary:
        "bg-venice-blue text-white hover:bg-deep-teal shadow-subtle border border-venice-blue",
      secondary:
        "bg-pale-blue text-primary-text hover:bg-light-blue border border-border",
      highlight:
        "bg-rock-blue text-dark-navy hover:bg-rock-blue/90 border border-rock-blue/40 font-semibold",
      outline:
        "bg-transparent text-primary-text border border-border hover:bg-pale-blue hover:border-rock-blue",
      ghost:
        "bg-transparent text-secondary-text hover:text-primary-text hover:bg-pale-blue/60",
    };

    const sizeStyles = {
      sm: "text-xs px-3.5 py-1.5 gap-1.5 rounded-sm",
      md: "text-sm px-4 py-2 gap-2 rounded-DEFAULT",
      lg: "text-base px-6 py-3 gap-2.5 rounded-md",
    };

    return (
      <button
        ref={ref}
        type={type}
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
