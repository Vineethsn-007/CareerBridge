import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const motionConfig = {
  duration: {
    fast: 0.2,
    base: 0.5,
    slow: 0.9,
  },
  ease: {
    primary: "power3.out",
    smooth: "expo.out",
    bounce: "back.out(1.7)",
  },
  stagger: {
    fast: 0.05,
    base: 0.1,
    slow: 0.15,
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger };
