"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const transitionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!transitionRef.current) return;
      if (prefersReducedMotion()) {
        gsap.set(transitionRef.current, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        transitionRef.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
        }
      );
    },
    { scope: transitionRef, dependencies: [pathname] }
  );

  return (
    <div ref={transitionRef} className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
