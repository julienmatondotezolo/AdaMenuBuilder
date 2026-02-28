import { useState, useEffect, useRef, useCallback } from "react";
import {
  Palette,
  ChevronDown,
  AlertTriangle,
  Layers,
  ExternalLink,
  Check,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { cn } from "ada-design-system";
import { uid } from "../../utils/uid";
import { useMenu } from "../../context/MenuContext";
import { useTemplates, useTemplateById } from "../../db/hooks";
import type { MenuTemplate, PageVariant } from "../../types/template";
import type { MenuPage } from "../../types/menu";
import { mmToPx } from "../../types/template";

/* ── Content overflow detection (per page) ───────────────────────────── */

interface PageOverflow {
  pageIndex: number;
  contentHeight: number;
  pageHeight: number;
  overflowPx: number;
}

function usePageOverflows(template: MenuTemplate | undefined, pageCount: number): PageOverflow[] {
  const [overflows, setOverflows] = useState<PageOverflow[]>([]);

  const measure = useCallback(() => {
    if (!template) return;
    const pageHeight = mmToPx(template.format.height);
    const results: PageOverflow[] = [];

    for (let i = 0; i < pageCount; i++) {
      const el = document.querySelector(`[data-menu-preview][data-page-index="${i}"]`) as HTMLElement | null;
      if (!el) continue;
      const contentHeight = el.scrollHeight;
      const overflowPx = Math.max(0, contentHeight - pageHeight);
      if (overflowPx > 4) { // 4px tolerance for rounding
        results.push({ pageIndex: i, contentHeight, pageHeight, overflowPx });
      }
    }
    setOverflows(results);
  }, [template, pageCount]);

  useEffect(() => {
    measure();
    const interval = setInterval(measure, 1500);
    return () => clearInterval(interval);
  }, [measure]);

  useEffect(() => {
    const timer = setTimeout(measure, 300);
    return () => clearTimeout(timer);
  }, [template?.id, template?.updatedAt, measure]);

  return overflows;
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function TemplateSelectorCard() {
  const { templateId, setTemplateId, pages, setPages, menuData, activePageIndex, setActivePageIndex } = useMenu();
  const templates = useTemplates();
  const currentTemplate = useTemplateById(templateId || undefined);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const overflows = usePageOverflows(currentTemplate, pages.length || 1);
  const hasAnyOverflow = overflows.length > 0;

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

  // When template changes and pages reference invalid variants, fix them
  useEffect(() => {
    if (!currentTemplate || pages.length === 0) return;
    const validIds = new Set(currentTemplate.pageVariants.map(v => v.id));
    const needsFix = pages.some(p => !validIds.has(p.variantId));
    if (needsFix) {
      setPages(prev => prev.map(p =>
        validIds.has(p.variantId)
          ? p
          : { ...p, variantId: currentTemplate.pageVariants[0]?.id ?? "" }
      ));
    }
  }, [currentTemplate?.id, currentTemplate?.pageVariants.length]);

  const addPage = () => {
    if (!currentTemplate) return;
    // Pick a variant — prefer one not used yet, fallback to first content variant
    const usedVariantIds = new Set(pages.map(p => p.variantId));
    const availableVariant = currentTemplate.pageVariants.find(v => !usedVariantIds.has(v.id))
      ?? currentTemplate.pageVariants.find(v => v.body && !v.header.show)
      ?? currentTemplate.pageVariants[0];

    const newPage: MenuPage = {
      id: `page-${uid()}`,
      variantId: availableVariant?.id ?? "",
      categoryIds: [],
    };
    setPages(prev => [...prev, newPage]);
    setActivePageIndex(pages.length); // select the new page
  };

  const removePage = (pageIndex: number) => {
    if (pages.length <= 1) return; // can't remove last page
    setPages(prev => prev.filter((_, i) => i !== pageIndex));
    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2));
    }
  };

  const changePageVariant = (pageIndex: number, variantId: string) => {
    setPages(prev => prev.map((p, i) =>
      i === pageIndex ? { ...p, variantId } : p
    ));
  };

  const toggleCategoryOnPage = (pageIndex: number, categoryId: string) => {
    setPages(prev => prev.map((p, i) => {
      if (i !== pageIndex) {
        // Remove from other pages
        return { ...p, categoryIds: p.categoryIds.filter(cid => cid !== categoryId) };
      }
      // Toggle on this page
      if (p.categoryIds.includes(categoryId)) {
        return { ...p, categoryIds: p.categoryIds.filter(cid => cid !== categoryId) };
      }
      return { ...p, categoryIds: [...p.categoryIds, categoryId] };
    }));
  };

  const isExpanded = !isCollapsed;

  // Categories assigned across all pages
  const assignedCategoryIds = new Set(pages.flatMap(p => p.categoryIds));
  const unassignedCategories = menuData.categories.filter(c => !assignedCategoryIds.has(c.id));

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-200",
      "border border-border bg-card",
      hasAnyOverflow && "border-amber-400",
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
          Template & Pages
        </h3>

        {hasAnyOverflow && (
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

        {pages.length > 0 && (
          <span className={cn(
            "text-xs",
            isExpanded ? "text-white/70" : "text-muted-foreground",
          )}>
            {pages.length} page{pages.length !== 1 ? "s" : ""}
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

            {showDropdown && templates && (
              <div
                className="absolute left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
                style={{ maxHeight: "240px", overflowY: "auto" }}
              >
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => { setTemplateId(tpl.id); setShowDropdown(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                    style={{
                      backgroundColor: tpl.id === templateId ? "hsl(232 100% 66% / 0.08)" : "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tpl.id === templateId ? "hsl(232 100% 66% / 0.12)" : "hsl(220 14% 96%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = tpl.id === templateId ? "hsl(232 100% 66% / 0.08)" : "transparent"; }}
                  >
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
              </div>
            )}
          </div>

          {/* Pages section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Pages ({pages.length || 1})
              </label>
              <button
                onClick={addPage}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors"
                style={{ opacity: 0.8 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
              >
                <Plus className="w-3 h-3" />
                Add Page
              </button>
            </div>

            <div className="space-y-2">
              {(pages.length > 0 ? pages : [{ id: "fallback", variantId: currentTemplate?.pageVariants[0]?.id ?? "", categoryIds: menuData.categories.map(c => c.id) } as MenuPage]).map((page, pageIndex) => {
                const variant = currentTemplate?.pageVariants.find(v => v.id === page.variantId);
                const pageOverflow = overflows.find(o => o.pageIndex === pageIndex);
                const pageCats = page.categoryIds
                  .map(cid => menuData.categories.find(c => c.id === cid))
                  .filter(Boolean);

                return (
                  <div
                    key={page.id}
                    className={cn(
                      "rounded-lg transition-all cursor-pointer",
                      activePageIndex === pageIndex
                        ? "ring-1"
                        : "",
                    )}
                    style={{
                      backgroundColor: activePageIndex === pageIndex ? "hsl(232 100% 66% / 0.06)" : "hsl(220 14% 96%)",
                      ringColor: activePageIndex === pageIndex ? (currentTemplate?.colors.primary || "hsl(232 80% 62%)") : undefined,
                      border: activePageIndex === pageIndex ? `1px solid ${currentTemplate?.colors.primary || "hsl(232 80% 62%)"}33` : "1px solid transparent",
                    }}
                    onClick={() => setActivePageIndex(pageIndex)}
                  >
                    {/* Page header row */}
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      {/* Page number */}
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor: activePageIndex === pageIndex
                            ? (currentTemplate?.colors.primary || "#4d5cc5")
                            : "hsl(220 14% 80%)",
                          color: "#fff",
                        }}
                      >
                        {pageIndex + 1}
                      </span>

                      {/* Variant name + info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {variant?.name || "Page"}
                          </p>
                          {pageOverflow && (
                            <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "#b45309" }} />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {pageCats.length > 0
                            ? pageCats.map(c => c!.name).join(", ")
                            : "No categories assigned"
                          }
                        </p>
                      </div>

                      {/* Variant selector (small) */}
                      {currentTemplate && pages.length > 0 && (
                        <select
                          value={page.variantId}
                          onChange={(e) => { e.stopPropagation(); changePageVariant(pageIndex, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] bg-background rounded px-1.5 py-1 text-muted-foreground shrink-0 outline-none"
                          style={{ border: "1px solid hsl(220 13% 91%)", maxWidth: "90px" }}
                        >
                          {currentTemplate.pageVariants.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Delete page */}
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removePage(pageIndex); }}
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground transition-colors shrink-0"
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.backgroundColor = "hsl(0 80% 50% / 0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = ""; e.currentTarget.style.backgroundColor = ""; }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Category assignment — shown when page is active */}
                    {activePageIndex === pageIndex && pages.length > 0 && menuData.categories.length > 0 && (
                      <div className="px-3 pb-2.5 pt-0.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Assign categories
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {menuData.categories.map((cat) => {
                            const isOnThisPage = page.categoryIds.includes(cat.id);
                            const isOnOtherPage = !isOnThisPage && assignedCategoryIds.has(cat.id);
                            return (
                              <button
                                key={cat.id}
                                onClick={(e) => { e.stopPropagation(); toggleCategoryOnPage(pageIndex, cat.id); }}
                                className="text-[11px] font-medium px-2 py-1 rounded-md transition-all"
                                style={{
                                  backgroundColor: isOnThisPage
                                    ? (currentTemplate?.colors.primary || "#4d5cc5")
                                    : isOnOtherPage
                                      ? "hsl(220 14% 90%)"
                                      : "hsl(220 14% 93%)",
                                  color: isOnThisPage ? "#fff" : isOnOtherPage ? "hsl(220 9% 60%)" : "hsl(224 71% 4%)",
                                  opacity: isOnOtherPage ? 0.6 : 1,
                                  border: isOnThisPage ? "1px solid transparent" : "1px solid hsl(220 13% 88%)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isOnThisPage) {
                                    e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.15)";
                                    e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.3)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isOnThisPage) {
                                    e.currentTarget.style.backgroundColor = isOnOtherPage ? "hsl(220 14% 90%)" : "hsl(220 14% 93%)";
                                    e.currentTarget.style.borderColor = "hsl(220 13% 88%)";
                                  }
                                }}
                              >
                                {cat.name}
                                {isOnThisPage && <Check className="w-2.5 h-2.5 inline ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overflow alerts */}
          {overflows.map((o) => (
            <div
              key={o.pageIndex}
              className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "hsl(38 92% 50% / 0.08)",
                border: "1px solid hsl(38 92% 50% / 0.25)",
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#b45309" }} />
              <div>
                <p className="font-semibold" style={{ color: "#92400e" }}>
                  Page {o.pageIndex + 1} overflows by {o.overflowPx}px
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
                  Move some categories to another page or reduce content.
                </p>
              </div>
            </div>
          ))}

          {/* Unassigned categories warning */}
          {pages.length > 0 && unassignedCategories.length > 0 && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "hsl(232 100% 66% / 0.06)",
                border: "1px solid hsl(232 100% 66% / 0.2)",
              }}
            >
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  {unassignedCategories.length} unassigned
                </p>
                <p className="text-xs mt-0.5 text-muted-foreground">
                  {unassignedCategories.map(c => c.name).join(", ")} — assign to a page above.
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
