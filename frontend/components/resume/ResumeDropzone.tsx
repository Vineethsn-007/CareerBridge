"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ResumeDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function ResumeDropzone({
  onFileSelect,
  isLoading = false,
  error: externalError,
}: ResumeDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandle = (file: File) => {
    setValidationError(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setValidationError("File is too large. Maximum supported size is 5 MB.");
      return;
    }

    // Validate extension/type
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ext === "pdf" || ext === "txt" || ext === "docx";
    const isAllowedMime = ALLOWED_TYPES.includes(file.type);

    if (!isAllowedExt && !isAllowedMime) {
      setValidationError("Invalid file type. Please upload a PDF (.pdf) or Text (.txt) file.");
      return;
    }

    setSelectedFileName(file.name);
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandle(e.target.files[0]);
    }
  };

  const currentError = validationError || externalError;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={cn(
          "relative group border-2 border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 overflow-hidden bg-pure-white shadow-card",
          isDragOver
            ? "border-venice-blue bg-pale-blue/60 scale-[1.01]"
            : "border-border hover:border-venice-blue hover:bg-pale-blue/20",
          isLoading && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
          {isLoading ? (
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-pale-blue border border-rock-blue flex items-center justify-center text-venice-blue shadow-subtle animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-deep-teal">
                  Parsing Document...
                </h4>
                <p className="text-xs text-secondary-text">
                  Extracting skills, education, and career profile via NLP
                </p>
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                  isDragOver
                    ? "bg-pale-blue text-venice-blue scale-110"
                    : "bg-pale-blue border border-border text-venice-blue group-hover:border-rock-blue"
                )}
              >
                <UploadCloud className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-primary-text">
                  Drag and drop your resume here
                </h3>
                <p className="text-xs text-secondary-text">
                  or <span className="text-venice-blue underline font-medium">browse from your device</span>
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 text-[11px] text-muted-text">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-venice-blue" />
                  PDF, DOCX, or Plain Text (.txt)
                </span>
                <span>•</span>
                <span>Max size: 5 MB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {currentError && (
        <div className="p-3.5 rounded-DEFAULT bg-rose-50 border border-[#B54747]/30 flex items-center gap-2.5 text-xs text-[#B54747]">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#B54747]" />
          <span>{currentError}</span>
        </div>
      )}

      {selectedFileName && !currentError && !isLoading && (
        <div className="p-3 rounded-DEFAULT bg-pure-white border border-border flex items-center justify-between text-xs shadow-subtle">
          <div className="flex items-center gap-2 text-primary-text font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#18856B]" />
            <span className="truncate max-w-xs">{selectedFileName}</span>
          </div>
          <span className="text-[11px] text-secondary-text">Ready to parse</span>
        </div>
      )}

      {/* Quick sample prompt for hackathon walkthrough */}
      <div className="pt-2 text-center">
        <p className="text-[11px] text-secondary-text">
          Need a quick sample? Drop any student PDF or use our{" "}
          <button
            type="button"
            onClick={() => {
              const sampleFile = new File(
                [
                  "Aarav Sharma\n" +
                    "aarav.sharma@gmail.com\n" +
                    "+91 9876543210\n" +
                    "Bangalore, India\n\n" +
                    "SUMMARY\n" +
                    "Final year Computer Science student seeking fresher Software Engineer roles.\n\n" +
                    "SKILLS\n" +
                    "Python, React, TypeScript, Next.js, Node.js, SQL, Git, REST APIs, Tailwind CSS\n\n" +
                    "EDUCATION\n" +
                    "B.Tech in Computer Science & Engineering, VTU, 2024 (CGPA: 8.7)\n\n" +
                    "PROJECTS\n" +
                    "- Smart Campus Portal: Fullstack Next.js and FastAPI app for college events\n" +
                    "- E-Commerce Microservices: Python FastAPI order processing system\n",
                ],
                "sample_resume.txt",
                { type: "text/plain" }
              );
              validateAndHandle(sampleFile);
            }}
            className="text-venice-blue underline hover:text-deep-teal font-medium"
          >
            preloaded student profile
          </button>
        </p>
      </div>
    </div>
  );
}
