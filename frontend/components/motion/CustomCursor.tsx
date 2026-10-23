"use client";

import React, { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, isFinePointer } from "@/lib/motion";

type CursorMode = "default" | "cta" | "link" | "card" | "explore" | "hidden";

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");
  const modeRef = useRef<CursorMode>("default");
  const [cursorText, setCursorText] = useState<string | null>(null);

  // Position references for smooth interpolation
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const isVisible = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const updateMode = (newMode: CursorMode) => {
    if (modeRef.current !== newMode) {
      modeRef.current = newMode;
      setMode(newMode);
    }
  };

  useEffect(() => {
    // Only render on client with fine pointer & without reduced motion
    if (!isFinePointer() || prefersReducedMotion()) {
      return;
    }
    setMounted(true);

    const onPointerMove = (e: PointerEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible.current) {
        isVisible.current = true;
        ringPos.current.x = e.clientX;
        ringPos.current.y = e.clientY;
      }

      // Detect hover target context
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check for form inputs / native selection areas
      const isInput = target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']");
      const isDropzone = target.closest("[data-dropzone='true']");
      if (isInput || isDropzone) {
        updateMode("hidden");
        setCursorText(null);
        return;
      }

      // Check for custom contextual preview indicator
      const exploreTarget = target.closest<HTMLElement>("[data-cursor='explore'], [data-cursor-text]");
      if (exploreTarget) {
        updateMode("explore");
        const customText = exploreTarget.getAttribute("data-cursor-text") || "Explore";
        setCursorText(customText);
        return;
      }

      // Check for primary CTA or magnetic button
      const ctaTarget = target.closest<HTMLElement>("button.btn-primary, [data-cursor='cta'], [data-magnetic='true']");
      if (ctaTarget) {
        updateMode("cta");
        setCursorText(null);
        return;
      }

      // Check for clickable card
      const cardTarget = target.closest<HTMLElement>("[data-cursor='card'], .interactive-card, .tilt-card");
      if (cardTarget) {
        updateMode("card");
        setCursorText(null);
        return;
      }

      // Check for standard link / button
      const linkTarget = target.closest("a, button, [role='button'], summary");
      if (linkTarget) {
        updateMode("link");
        setCursorText(null);
        return;
      }

      updateMode("default");
      setCursorText(null);
    };

    const onPointerLeave = () => {
      isVisible.current = false;
      updateMode("hidden");
    };

    const onPointerEnter = () => {
      isVisible.current = true;
      updateMode("default");
    };

    // Smooth animation loop for outer ring
    const render = () => {
      const isHidden = !isVisible.current || modeRef.current === "hidden";

      // Immediate placement for central dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
        dotRef.current.style.opacity = isHidden ? "0" : "1";
      }

      // Smooth lerp (0.16 factor) for trailing outer ring
      const factor = 0.16;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * factor;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * factor;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
        ringRef.current.style.opacity = isHidden ? "0" : "1";
      }

      if (textRef.current) {
        textRef.current.style.transform = `translate3d(${ringPos.current.x + 14}px, ${ringPos.current.y - 12}px, 0)`;
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("pointerenter", onPointerEnter);

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("pointerenter", onPointerEnter);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  if (!mounted) return null;

  // Visual variants for the outer ring based on hover mode
  const getRingClasses = () => {
    switch (mode) {
      case "cta":
        return "w-11 h-11 border-2 border-venice-blue bg-venice-blue/15 shadow-[0_0_12px_rgba(22,88,123,0.3)] scale-110";
      case "card":
        return "w-9 h-9 border border-rock-blue bg-rock-blue/10 scale-105";
      case "link":
        return "w-6 h-6 border border-venice-blue/70 bg-venice-blue/5 scale-90";
      case "explore":
        return "w-10 h-10 border-2 border-venice-blue bg-white/70 backdrop-blur-sm shadow-subtle";
      case "hidden":
        return "opacity-0 scale-50";
      default:
        return "w-7 h-7 border border-venice-blue/50 bg-transparent";
    }
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none transition-opacity duration-300"
    >
      {/* Outer Smooth Trailing Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 -ml-[50%] -mt-[50%] rounded-full transition-[width,height,background-color,border-color,transform] duration-200 ease-out will-change-transform flex items-center justify-center ${getRingClasses()}`}
        style={{
          transform: "translate3d(-100px, -100px, 0)",
          width: mode === "cta" ? "44px" : mode === "explore" ? "40px" : mode === "card" ? "36px" : mode === "link" ? "24px" : "28px",
          height: mode === "cta" ? "44px" : mode === "explore" ? "40px" : mode === "card" ? "36px" : mode === "link" ? "24px" : "28px",
          marginTop: mode === "cta" ? "-22px" : mode === "explore" ? "-20px" : mode === "card" ? "-18px" : mode === "link" ? "-12px" : "-14px",
          marginLeft: mode === "cta" ? "-22px" : mode === "explore" ? "-20px" : mode === "card" ? "-18px" : mode === "link" ? "-12px" : "-14px",
        }}
      />

      {/* Central Immediate Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 -mt-[3px] -ml-[3px] w-1.5 h-1.5 rounded-full bg-venice-blue will-change-transform transition-[background-color,transform] duration-150 ${
          mode === "cta" ? "scale-125 bg-deep-teal" : mode === "link" ? "bg-venice-blue scale-90" : ""
        }`}
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      />

      {/* Contextual Pill Tag ("Explore" / "View") */}
      {mode === "explore" && cursorText && (
        <div
          ref={textRef}
          className="fixed top-0 left-0 bg-deep-teal text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-subtle tracking-wider uppercase pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {cursorText}
        </div>
      )}
    </div>
  );
}
