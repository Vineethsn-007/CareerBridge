import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  isRetrying = false,
  className,
  ...props
}: ErrorMessageProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-[#B54747]/30 bg-rose-50/70 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-primary-text",
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-rose-100 text-[#B54747] shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#B54747]">{title}</h4>
          <p className="text-xs text-secondary-text mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 border-[#B54747]/20 hover:border-[#B54747]/40"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
