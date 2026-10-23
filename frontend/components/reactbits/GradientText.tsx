import React from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export function GradientText({
  children,
  className,
  colors = ["#16587B", "#84B3CE", "#104763", "#16587B"],
  showBorder = false,
  ...props
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
    backgroundSize: "300% 100%",
  };

  return (
    <span
      className={cn(
        "relative inline-block text-transparent bg-clip-text font-semibold",
        showBorder && "py-0.5 px-2 rounded border border-border",
        className
      )}
      style={gradientStyle}
      {...props}
    >
      {children}
    </span>
  );
}
