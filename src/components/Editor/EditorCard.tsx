import { useState, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "ada-design-system";

interface EditorCardProps {
  icon: ReactNode;
  title: string;
  defaultCollapsed?: boolean;
  collapseSignal?: number;
  expandSignal?: number;
  children: ReactNode;
}

export default function EditorCard({
  icon,
  title,
  defaultCollapsed = true,
  collapseSignal = 0,
  expandSignal = 0,
  children,
}: EditorCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (collapseSignal > 0) setIsCollapsed(true);
  }, [collapseSignal]);

  useEffect(() => {
    if (expandSignal > 0) setIsCollapsed(false);
  }, [expandSignal]);
  const isExpanded = !isCollapsed;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "border border-border bg-card",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "category-header flex items-center gap-2 px-4 py-3 select-none transition-colors duration-200 cursor-pointer",
          isExpanded && "category-expanded"
        )}
        onClick={() => setIsCollapsed((c) => !c)}
      >
        {/* Icon */}
        <span className={cn("shrink-0", isExpanded ? "text-white/80" : "text-muted-foreground")}>
          {icon}
        </span>

        {/* Title */}
        <h3
          className={cn(
            "font-bold text-sm",
            isExpanded ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </h3>

        <div className="flex-1" />

        {/* Chevron */}
        <span
          className={cn(
            "shrink-0 transition-colors",
            isExpanded ? "text-white" : "text-muted-foreground"
          )}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isCollapsed && "-rotate-90"
            )}
          />
        </span>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
