"use client";

import { useEffect, useRef, useCallback } from "react";
import { prefersReducedMotion, isFinePointer } from "@/lib/motion";

export interface PointerCoordinates {
  /** Normalized X from -1 (left) to 1 (right) relative to container */
  x: number;
  /** Normalized Y from -1 (top) to 1 (bottom) relative to container */
  y: number;
  /** Raw pixel X inside container */
  px: number;
  /** Raw pixel Y inside container */
  py: number;
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Whether the pointer is currently within bounds */
  isInside: boolean;
}

export type PointerCallback = (coords: PointerCoordinates) => void;

/**
 * High-performance pointer tracking hook that computes normalized coordinates
 * relative to a container element. Dispatches updates via a callback or ref
 * to avoid unnecessary React re-renders.
 */
export function usePointerPosition<T extends HTMLElement>(
  onPointerMove?: PointerCallback,
  onPointerLeave?: () => void
) {
  const elementRef = useRef<T>(null);
  const coordsRef = useRef<PointerCoordinates>({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    width: 0,
    height: 0,
    isInside: false,
  });

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const el = elementRef.current;
      if (!el || prefersReducedMotion() || !isFinePointer()) return;

      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Normalize from -1 to 1 with 0 as center
      const x = Math.max(-1, Math.min(1, (px / rect.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, (py / rect.height) * 2 - 1));

      coordsRef.current = {
        x,
        y,
        px,
        py,
        width: rect.width,
        height: rect.height,
        isInside: true,
      };

      if (onPointerMove) {
        onPointerMove(coordsRef.current);
      }
    },
    [onPointerMove]
  );

  const handlePointerLeave = useCallback(() => {
    coordsRef.current.isInside = false;
    coordsRef.current.x = 0;
    coordsRef.current.y = 0;

    if (onPointerLeave) {
      onPointerLeave();
    }
  }, [onPointerLeave]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || prefersReducedMotion() || !isFinePointer()) return;

    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [handlePointerMove, handlePointerLeave]);

  return { elementRef, coordsRef };
}
