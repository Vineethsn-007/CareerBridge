import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-secondary-text uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-muted-text">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={type}
            className={cn(
              "w-full bg-pure-white text-primary-text text-sm rounded-DEFAULT px-3.5 py-2.5 border border-border placeholder:text-muted-text/70 transition-all duration-200 focus:outline-none focus:border-venice-blue focus:ring-2 focus:ring-rock-blue/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-subtle",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[#B54747] focus:border-[#B54747] focus:ring-[#B54747]/20",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-muted-text">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#B54747] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-secondary-text">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-secondary-text uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "w-full bg-pure-white text-primary-text text-sm rounded-DEFAULT px-3.5 py-2.5 border border-border placeholder:text-muted-text/70 transition-all duration-200 focus:outline-none focus:border-venice-blue focus:ring-2 focus:ring-rock-blue/30 disabled:opacity-50 min-h-[100px] resize-y shadow-subtle",
            error && "border-[#B54747] focus:border-[#B54747] focus:ring-[#B54747]/20",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[#B54747] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-secondary-text">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
