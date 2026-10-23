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
        "rounded-md border border-rose-500/30 bg-rose-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-text",
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-rose-500/20 text-rose-400 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          isLoading={isRetrying}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 border-rose-500/20 hover:border-rose-500/40"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
