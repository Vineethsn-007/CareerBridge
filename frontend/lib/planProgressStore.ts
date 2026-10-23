"use client";

import { useState, useEffect, useCallback } from "react";

const PROGRESS_STORAGE_KEY_PREFIX = "careerbridge_plan_progress_";

export function usePlanProgressStore(jobId: string) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `${PROGRESS_STORAGE_KEY_PREFIX}${jobId}`;

  useEffect(() => {
    if (typeof window === "undefined" || !jobId) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCompletedTasks(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load plan progress:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, jobId]);

  const toggleTask = useCallback(
    (taskId: string) => {
      setCompletedTasks((prev) => {
        const next = { ...prev, [taskId]: !prev[taskId] };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            console.error("Failed to save plan progress:", e);
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  const resetProgress = useCallback(() => {
    setCompletedTasks({});
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    completedTasks,
    isLoaded,
    toggleTask,
    resetProgress,
  };
}
