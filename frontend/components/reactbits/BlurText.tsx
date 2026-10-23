"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";

interface BlurTextProps extends React.HTMLAttributes<HTMLHeadingElement> {
  text: string;
  delay?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export function BlurText({
  text,
  delay = 0,
  className,
  as: Component = "h1",
  ...props
}: BlurTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      if (!containerRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(containerRef.current.querySelectorAll(".blur-word"), {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
        });
        return;
      }

      const elements = containerRef.current.querySelectorAll(".blur-word");
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          filter: "blur(10px)",
          y: 20,
        },
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          delay,
          ease: "power3.out",
        }
      );
    },
    { scope: containerRef, dependencies: [text, delay] }
  );

  return (
    <Component
      ref={containerRef}
      className={cn("flex flex-wrap gap-x-2.5 gap-y-1", className)}
      {...props}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="blur-word inline-block opacity-0 will-change-[filter,transform,opacity]"
        >
          {word}
        </span>
      ))}
    </Component>
  );
}
