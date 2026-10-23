import React from "react";
import { cn } from "@/lib/utils";
import { FolderSearch } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed border-border bg-pure-white/80 p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 shadow-subtle",
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-pale-blue border border-border flex items-center justify-center text-venice-blue mb-4">
        {icon || <FolderSearch className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-primary-text mb-1">{title}</h3>
      <p className="text-xs text-secondary-text leading-relaxed max-w-xs mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
