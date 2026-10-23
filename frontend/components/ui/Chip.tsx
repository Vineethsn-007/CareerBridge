import React from "react";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  onRemove?: () => void;
  onAdd?: () => void;
  variant?: "default" | "matched" | "missing" | "highlight";
  selected?: boolean;
}

export function Chip({
  className,
  label,
  onRemove,
  onAdd,
  variant = "default",
  selected = false,
  onClick,
  ...props
}: ChipProps) {
  const variantStyles = {
    default:
      "bg-surface-2 text-text border border-border hover:border-white/20 hover:bg-surface-2/80",
    matched:
      "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50",
    missing:
      "bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:border-rose-400/50",
    highlight:
      "bg-primary/20 text-accent border border-primary/40 hover:border-accent",
  };

  const isClickable = Boolean(onClick || onAdd);

  return (
    <span
      onClick={onClick || onAdd}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all duration-200 select-none",
        variantStyles[variant],
        selected && "ring-2 ring-accent border-transparent bg-primary/30 text-white",
        isClickable && "cursor-pointer active:scale-95",
        className
      )}
      {...props}
    >
      <span>{label}</span>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition-colors"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {onAdd && (
        <Plus className="w-3 h-3 text-accent shrink-0 ml-0.5 -mr-0.5" />
      )}
    </span>
  );
}
