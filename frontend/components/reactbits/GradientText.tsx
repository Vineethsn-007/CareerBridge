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
  colors = ["#6366F1", "#22D3EE", "#FF9933", "#6366F1"],
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
        "relative inline-block text-transparent bg-clip-text animate-[gradient_8s_ease_infinite] font-semibold",
        showBorder && "py-0.5 px-2 rounded border border-white/10",
        className
      )}
      style={gradientStyle}
      {...props}
    >
      {children}
    </span>
  );
}
