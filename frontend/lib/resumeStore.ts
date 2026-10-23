"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParsedResume } from "./types";

const STORAGE_KEY = "careerbridge_parsed_resume";

export function useResumeStore() {
  const [resume, setResumeState] = useState<ParsedResume | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ParsedResume;
        setResumeState(parsed);
      }
    } catch (e) {
      console.error("Failed to parse stored resume from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const saveResume = useCallback((newResume: ParsedResume) => {
    setResumeState(newResume);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newResume));
      } catch (e) {
        console.error("Failed to persist resume to localStorage:", e);
      }
    }
  }, []);

  const clearResume = useCallback(() => {
    setResumeState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const updateSkills = useCallback((skills: string[]) => {
    setResumeState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, skills };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const addSkill = useCallback((skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setResumeState((prev) => {
      if (!prev) return null;
      if (prev.skills.includes(trimmed)) return prev;
      const updated = { ...prev, skills: [...prev.skills, trimmed] };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const removeSkill = useCallback((skillToRemove: string) => {
    setResumeState((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        skills: prev.skills.filter((s) => s !== skillToRemove),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return {
    resume,
    isHydrated,
    saveResume,
    clearResume,
    updateSkills,
    addSkill,
    removeSkill,
  };
}
