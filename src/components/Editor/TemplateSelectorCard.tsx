import { useState, useEffect, useRef, useCallback } from "react";
import { Palette, ChevronDown, AlertTriangle, Layers, ExternalLink, Check } from "lucide-react";
import { cn, Badge } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import { useTemplates, useTemplateById } from "../../db/hooks";
import type { MenuTemplate, PageVariant } from "../../types/template";

/* ── Content overflow detection ──────────────────────────────────────── */

interface OverflowInfo {
  contentHeight: number;   // px — actual rendered content height
  pageHeight: number;      // px — available page height at 96dpi
  overflowPx: number;      // how many px the content exceeds the page (0 = fits)
  overflowPercent: number; // overflow as % of page
}

function useContentOverflow(template: MenuTemplate | undefined): OverflowInfo {
  const [info, setInfo] = useState<OverflowInfo>({
    contentHeight: 0,
    pageHeight: 0,
    overflowPx: 0,
    overflowPercent: 0,
  });

  const measure = useCallback(() => {
    if (!template) return;

    // Find the preview element in the DOM
    const previewEl = document.querySelector("[data-menu-preview]") as HTMLElement | null;
    if (!previewEl) return;

    const contentHeight = previewEl.scrollHeight;
    // Convert mm → px at 96 DPI (same as mmToPx in template.ts)
    const pageHeight = Math.round((template.format.height / 25.4) * 96);

    const overflowPx = Math.max(0, contentHeight - pageHeight);
    const overflowPercent = pageHeight > 0 ? Math.round((overflowPx / pageHeight) * 100) : 0;

    setInfo({ contentHeight, pageHeight, overflowPx, overflowPercent });
  }, [template]);

  useEffect(() => {
    measure();
    // Re-measure on a short interval to catch menu data changes
    const interval = setInterval(measure, 1000);
    return () => clearInterval(interval);
  }, [measure]);

  // Also measure when template changes
  useEffect(() => {
    // Small delay to let the preview re-render
    const timer = setTimeout(measure, 200);
    return () => clearTimeout(timer);
  }, [template?.id, template?.updatedAt, measure]);

  return info;
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function TemplateSelectorCard() {
  const { templateId, setTemplateId } = useMenu();
  const templates = useTemplates();
  const currentTemplate = useTemplateById(templateId || undefined);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const overflow = useContentOverflow(currentTemplate);
  const hasOverflow = overflow.overflowPx > 0;

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showDropdown]);

  const isExpanded = !isCollapsed;

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-200",
      "border border-border bg-card",
      hasOverflow && "border-amber-400",
    )}>
      {/* Header */}
      <div
        className={cn(
          "category-header flex items-center gap-2 px-4 py-3 select-none transition-colors duration-200 cursor-pointer",
          isExpanded && "category-expanded",
        )}
        onClick={() => setIsCollapsed(c => !c)}
      >
        <span className={cn("shrink-0", isExpanded ? "text-white/80" : "text-muted-foreground")}>
          <Palette className="w-4 h-4" />
        </span>

        <h3 className={cn("font-bold text-sm", isExpanded ? "text-white" : "text-foreground")}>
          Template
        </h3>

        {/* Overflow warning badge */}
        {hasOverflow && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isExpanded ? "rgba(251,191,36,0.3)" : "rgba(251,191,36,0.15)",
              color: isExpanded ? "#fffbeb" : "#b45309",
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            Overflow
          </span>
        )}

        <div className="flex-1" />

        {/* Template name chip */}
        {currentTemplate && (
          <span className={cn(
            "text-xs truncate max-w-[120px]",
            isExpanded ? "text-white/70" : "text-muted-foreground",
          )}>
            {currentTemplate.name}
          </span>
        )}

        <span className={cn("shrink-0 transition-colors", isExpanded ? "text-white" : "text-muted-foreground")}>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isCollapsed && "-rotate-90")} />
        </span>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Template selector dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Active Template</label>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDropdown(s => !s); }}
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground flex items-center justify-between px-3 transition-colors"
              style={{ border: "1px solid hsl(220 13% 91%)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)"; }}
              onMouseLeave={(e) => { if (!showDropdown) e.currentTarget.style.borderColor = "hsl(220 13% 91%)"; }}
            >
              <span className="truncate">{currentTemplate?.name ?? "Select template..."}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform", showDropdown && "rotate-180")} />
            </button>

            {/* Dropdown */}
            {showDropdown && templates && (
              <div
                className="absolute left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                style={{ maxHeight: "240px", overflowY: "auto" }}
              >
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setTemplateId(tpl.id);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      backgroundColor: tpl.id === templateId ? "hsl(232 100% 66% / 0.08)" : "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tpl.id === templateId ? "hsl(232 100% 66% / 0.12)" : "hsl(220 14% 96%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = tpl.id === templateId ? "hsl(232 100% 66% / 0.08)" : "transparent"; }}
                  >
                    {/* Color swatch preview */}
                    <div className="flex gap-0.5 shrink-0">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.colors.primary }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.colors.background, border: "1px solid hsl(220 13% 91%)" }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.colors.accent }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{tpl.name}</span>
                        {tpl.isBuiltIn && (
                          <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase">Built-in</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{tpl.format.type} · {tpl.pageVariants.length} variant{tpl.pageVariants.length !== 1 ? "s" : ""}</span>
                    </div>

                    {tpl.id === templateId && (
                      <Check className="w-4 h-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}

                {(!templates || templates.length === 0) && (
                  <div className="px-3 py-4 text-sm text-center text-muted-foreground">No templates available</div>
                )}
              </div>
            )}
          </div>

          {/* Page Variants list */}
          {currentTemplate && currentTemplate.pageVariants.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Page Variants ({currentTemplate.pageVariants.length})
              </label>
              <div className="space-y-1.5">
                {currentTemplate.pageVariants.map((variant, index) => (
                  <VariantRow key={variant.id} variant={variant} index={index} template={currentTemplate} />
                ))}
              </div>
            </div>
          )}

          {/* Overflow alert */}
          {hasOverflow && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "hsl(38 92% 50% / 0.08)",
                border: "1px solid hsl(38 92% 50% / 0.25)",
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#b45309" }} />
              <div>
                <p className="font-semibold" style={{ color: "#92400e" }}>
                  Content overflows by {overflow.overflowPx}px ({overflow.overflowPercent}%)
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
                  The content exceeds the {currentTemplate?.format.type ?? "page"} page height.
                  Move some categories to another page or reduce content.
                </p>
              </div>
            </div>
          )}

          {/* Edit template link */}
          {currentTemplate && (
            <a
              href={`/templates/${currentTemplate.id}/edit`}
              className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors"
              style={{ opacity: 0.8 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
            >
              <ExternalLink className="w-3 h-3" />
              Edit template settings
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Variant Row ─────────────────────────────────────────────────────── */

function VariantRow({ variant, index, template }: { variant: PageVariant; index: number; template: MenuTemplate }) {
  const features: string[] = [];
  if (variant.header.show) features.push("Header");
  if (variant.body.columns > 1) features.push(`${variant.body.columns} cols`);
  if (variant.highlight.show) features.push("Image");

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
      style={{ backgroundColor: "hsl(220 14% 96%)" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220 14% 93%)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "hsl(220 14% 96%)"; }}
    >
      {/* Page number */}
      <span
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{
          backgroundColor: template.colors.primary,
          color: "#fff",
        }}
      >
        {index + 1}
      </span>

      {/* Name + features */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{variant.name}</p>
        {features.length > 0 && (
          <p className="text-[11px] text-muted-foreground">{features.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
