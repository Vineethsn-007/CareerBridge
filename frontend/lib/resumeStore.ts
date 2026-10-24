"use client";

import { useState, useEffect, useCallback } from "react";
import type { ParsedResume, PersonaProfileResult, PersonaTopic, PersonaInput } from "./types";

const STORAGE_KEY_RESUME = "careerbridge_parsed_resume";
const STORAGE_KEY_PERSONA = "careerbridge_persona_profile";
const STORAGE_KEY_ANSWERS = "careerbridge_persona_answers";

export interface PersonaAnswerRecord {
  topic: PersonaTopic;
  question: string;
  answer: string;
}

export function useResumeStore() {
  const [resume, setResumeState] = useState<ParsedResume | null>(null);
  const [personaProfile, setPersonaProfileState] = useState<PersonaProfileResult | null>(null);
  const [personaAnswers, setPersonaAnswersState] = useState<PersonaAnswerRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedResume = localStorage.getItem(STORAGE_KEY_RESUME);
      if (storedResume) {
        setResumeState(JSON.parse(storedResume) as ParsedResume);
      }

      const storedPersona = localStorage.getItem(STORAGE_KEY_PERSONA);
      if (storedPersona) {
        setPersonaProfileState(JSON.parse(storedPersona) as PersonaProfileResult);
      }

      const storedAnswers = localStorage.getItem(STORAGE_KEY_ANSWERS);
      if (storedAnswers) {
        setPersonaAnswersState(JSON.parse(storedAnswers) as PersonaAnswerRecord[]);
      }
    } catch (e) {
      console.error("Failed to parse stored candidate state from localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const saveResume = useCallback((newResume: ParsedResume) => {
    setResumeState(newResume);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(newResume));
      } catch (e) {
        console.error("Failed to persist resume to localStorage:", e);
      }
    }
  }, []);

  const clearResume = useCallback(() => {
    setResumeState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_RESUME);
    }
  }, []);

  const savePersonaProfile = useCallback((profile: PersonaProfileResult) => {
    setPersonaProfileState(profile);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_PERSONA, JSON.stringify(profile));
      } catch (e) {
        console.error("Failed to persist persona profile to localStorage:", e);
      }
    }
  }, []);

  const clearPersonaProfile = useCallback(() => {
    setPersonaProfileState(null);
    setPersonaAnswersState([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_PERSONA);
      localStorage.removeItem(STORAGE_KEY_ANSWERS);
    }
  }, []);

  const savePersonaAnswers = useCallback((answers: PersonaAnswerRecord[]) => {
    setPersonaAnswersState(answers);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
      } catch (e) {
        console.error("Failed to persist persona answers to localStorage:", e);
      }
    }
  }, []);

  const addPersonaAnswer = useCallback((record: PersonaAnswerRecord) => {
    setPersonaAnswersState((prev) => {
      const filtered = prev.filter((item) => item.question !== record.question);
      const updated = [...filtered, record];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to persist persona answer:", e);
        }
      }
      return updated;
    });
  }, []);

  const getPersonaInput = useCallback((): PersonaInput | null => {
    if (!personaProfile && personaAnswers.length === 0) return null;
    return {
      summary: personaProfile?.summary ?? null,
      strengths: personaProfile?.strengths?.map((s) => `${s.topic}: ${s.strength}`) ?? [],
      confidence: personaProfile?.confidence ?? null,
      answers: personaAnswers.map((a) => ({
        topic: a.topic,
        question: a.question,
        answer: a.answer,
      })),
    };
  }, [personaProfile, personaAnswers]);

  const resetAll = useCallback(() => {
    setResumeState(null);
    setPersonaProfileState(null);
    setPersonaAnswersState([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_RESUME);
      localStorage.removeItem(STORAGE_KEY_PERSONA);
      localStorage.removeItem(STORAGE_KEY_ANSWERS);
    }
  }, []);

  const updateSkills = useCallback((skills: string[]) => {
    setResumeState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, skills };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(updated));
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
        localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(updated));
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
        localStorage.setItem(STORAGE_KEY_RESUME, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return {
    resume,
    personaProfile,
    personaAnswers,
    isHydrated,
    saveResume,
    clearResume,
    savePersonaProfile,
    clearPersonaProfile,
    savePersonaAnswers,
    addPersonaAnswer,
    getPersonaInput,
    resetAll,
    updateSkills,
    addSkill,
    removeSkill,
  };
}
