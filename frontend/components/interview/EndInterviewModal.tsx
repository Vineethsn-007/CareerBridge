"use client";

import React from "react";
import { AlertTriangle, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EndInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEnd: () => void;
  isEnding: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
}

export function EndInterviewModal({
  isOpen,
  onClose,
  onConfirmEnd,
  isEnding,
  currentQuestionIndex,
  totalQuestions,
}: EndInterviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl max-w-md w-full p-6 border border-border shadow-2xl space-y-4">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-primary-text">
              End Mock Interview?
            </h3>
            <p className="text-xs text-secondary-text mt-1">
              You are currently on question {currentQuestionIndex + 1} of {totalQuestions}.
            </p>
          </div>
        </div>

        {/* Informative Body */}
        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border-subtle text-xs text-secondary-text space-y-1.5">
          <p>
            Ending now will disconnect your live video room with Robin.
          </p>
          <p>
            CareerBridge will immediately aggregate your transcript, calculate your speech pace (WPM), analyze filler words, and evaluate your responses against the STAR rubric.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isEnding}
            className="text-xs"
          >
            Continue Interview
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmEnd}
            isLoading={isEnding}
            className="bg-danger hover:bg-danger/90 border-danger text-white text-xs"
            leftIcon={<PhoneOff className="w-3.5 h-3.5 text-white" />}
          >
            {isEnding ? "Ending Room..." : "Yes, End & Get Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
