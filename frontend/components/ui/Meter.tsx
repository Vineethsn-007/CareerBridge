import React from "react";
import { cn } from "@/lib/utils";

export interface MeterProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "saffron" | "success" | "warning";
}

export function Meter({
  value,
  label,
  showValue = true,
  size = "md",
  variant = "brand",
  className,
  ...props
}: MeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantStyles = {
    brand: "bg-venice-blue",
    saffron: "bg-rock-blue",
    success: "bg-[#18856B]",
    warning: "bg-[#B87926]",
  };

  return (
    <div className={cn("w-full space-y-1.5", className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-secondary-text">{label}</span>}
          {showValue && (
            <span className="font-semibold text-primary-text tabular-nums">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full bg-pale-blue rounded-full overflow-hidden border border-border",
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            variantStyles[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
