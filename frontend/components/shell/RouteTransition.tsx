"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const transitionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transitionRef.current) return;
    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReduced) {
      transitionRef.current.style.opacity = "1";
      transitionRef.current.style.transform = "none";
      return;
    }

    const el = transitionRef.current;
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "none";

    const rafId = requestAnimationFrame(() => {
      el.style.transition =
        "opacity 0.35s cubic-bezier(0, 0, 0.2, 1), transform 0.35s cubic-bezier(0, 0, 0.2, 1)";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  return (
    <div ref={transitionRef} className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
