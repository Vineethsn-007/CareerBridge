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
      "bg-pale-blue text-primary-text border border-border hover:border-rock-blue hover:bg-light-blue",
    matched:
      "bg-emerald-50 text-[#18856B] border border-[#18856B]/30 hover:border-[#18856B]/60",
    missing:
      "bg-rose-50 text-[#B54747] border border-[#B54747]/30 hover:border-[#B54747]/60",
    highlight:
      "bg-light-blue text-venice-blue border border-rock-blue/40 font-medium",
  };

  const isClickable = Boolean(onClick || onAdd);

  return (
    <span
      onClick={onClick || onAdd}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all duration-200 select-none",
        variantStyles[variant],
        selected && "ring-2 ring-venice-blue border-transparent bg-venice-blue text-white",
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
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/5 text-muted-text hover:text-primary-text transition-colors cursor-pointer"
          aria-label={`Remove ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {onAdd && (
        <Plus className="w-3 h-3 text-venice-blue shrink-0 ml-0.5 -mr-0.5" />
      )}
    </span>
  );
}
