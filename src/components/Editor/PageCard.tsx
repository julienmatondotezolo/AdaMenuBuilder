import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  FileText,
  ImageIcon,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "ada-design-system";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CategorySection from "./CategorySection";
import EditorCard from "./EditorCard";
import { useMenu } from "../../context/MenuContext";
import type { Category, MenuPage } from "../../types/menu";
import type { MenuTemplate } from "../../types/template";

interface PageCardProps {
  page: MenuPage;
  pageIndex: number;
  categories: Category[];
  template: MenuTemplate | undefined;
  isActive: boolean;
  totalPages: number;
  overflowPx: number;
  isDraggingCategory: boolean;
  onActivate: () => void;
  onRemove: () => void;
  onChangeVariant: (variantId: string) => void;
  onAddItem: (categoryId: string) => void;
  searchQuery: string;
  collapseSignal: number;
  expandSignal: number;
  dragCollapseSignal: number;
  dragRestoreSignal: number;
}

export default function PageCard({
  page,
  pageIndex,
  categories,
  template,
  isActive,
  totalPages,
  overflowPx,
  isDraggingCategory,
  onActivate,
  onRemove,
  onChangeVariant,
  onAddItem,
  searchQuery,
  collapseSignal,
  expandSignal,
  dragCollapseSignal,
  dragRestoreSignal,
}: PageCardProps) {
  const { menuData, setMenuData } = useMenu();
  const variant = template?.pageVariants.find((v) => v.id === page.variantId);
  const hasOverflow = overflowPx > 0;
  const primaryColor = template?.colors.primary || "#4d5cc5";
  const categoryIds = page.categoryIds;

  // Check if this page's variant has highlight image enabled
  const hasHighlight = variant?.highlight?.show === true;

  // Variant picker state
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const variantPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showVariantPicker) return;
    const onClick = (e: MouseEvent) => {
      if (variantPickerRef.current && !variantPickerRef.current.contains(e.target as Node)) {
        setShowVariantPicker(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showVariantPicker]);

  // This page is a drop target for categories
  const { setNodeRef, isOver } = useDroppable({
    id: `page-drop-${page.id}`,
    data: { type: "page", pageId: page.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "border bg-card",
      )}
      style={{
        borderColor: isOver && isDraggingCategory
          ? `${primaryColor}88`
          : hasOverflow
            ? "#fbbf24"
            : isActive
              ? primaryColor
              : "hsl(220 13% 91%)",
        borderWidth: isActive && !hasOverflow && !(isOver && isDraggingCategory) ? "2px" : "1px",
        backgroundColor: isOver && isDraggingCategory
          ? `${primaryColor}08`
          : undefined,
      }}
      onClick={() => { if (!isActive) onActivate(); }}
    >
      {/* ── Page Header — clean, no blue, no collapse ────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-3 select-none"
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        style={{ cursor: "pointer" }}
      >
        {/* Page icon */}
        <span className="shrink-0 text-muted-foreground">
          <FileText className="w-4 h-4" />
        </span>

        {/* Page number badge */}
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            backgroundColor: isActive ? primaryColor : "hsl(220 14% 90%)",
            color: isActive ? "#fff" : "hsl(220 9% 46%)",
          }}
        >
          {pageIndex + 1}
        </span>

        {/* Page name */}
        <h3 className="font-semibold text-sm text-foreground">
          {variant?.name || `Page ${pageIndex + 1}`}
        </h3>

        {/* Overflow badge */}
        {hasOverflow && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(251,191,36,0.15)",
              color: "#b45309",
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            {overflowPx}px
          </span>
        )}

        <div className="flex-1" />

        {/* Category count */}
        <span className="text-xs text-muted-foreground mr-1">
          {categories.length} cat{categories.length !== 1 ? "s" : ""}
        </span>

        {/* ── Edit variant button ── */}
        <div className="relative" ref={variantPickerRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVariantPicker((s) => !s);
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: showVariantPicker
                ? `${primaryColor}15`
                : "transparent",
              color: showVariantPicker ? primaryColor : "hsl(220 9% 56%)",
            }}
            onMouseEnter={(e) => {
              if (!showVariantPicker) {
                e.currentTarget.style.backgroundColor = "hsl(220 14% 93%)";
                e.currentTarget.style.color = "hsl(220 9% 30%)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showVariantPicker) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "hsl(220 9% 56%)";
              }
            }}
            title="Change page variant"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Variant dropdown */}
          {showVariantPicker && template && (
            <div
              className="absolute right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl overflow-hidden"
              style={{ width: "200px" }}
            >
              <div className="px-3 py-2 border-b border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Page Variant
                </span>
              </div>
              {template.pageVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeVariant(v.id);
                    setShowVariantPicker(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    backgroundColor:
                      v.id === page.variantId
                        ? `${primaryColor}10`
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      v.id === page.variantId
                        ? `${primaryColor}18`
                        : "hsl(220 14% 96%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      v.id === page.variantId
                        ? `${primaryColor}10`
                        : "transparent";
                  }}
                >
                  <span className="flex-1 font-medium truncate">{v.name}</span>
                  {v.id === page.variantId && (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Delete page button ── */}
        {totalPages > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors"
            style={{
              color: "hsl(0 60% 60%)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.1)";
              e.currentTarget.style.color = "hsl(0 84% 60%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "hsl(0 60% 60%)";
            }}
            title="Delete page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Page Body — always visible (no collapse) ─────────────────── */}
      <div className="px-3 pb-3 pt-1">
        {/* Drop indicator at top of page when dragging */}
        {isDraggingCategory && categories.length > 0 && isOver && (
          <div
            className="mb-2 py-2 text-center rounded-lg text-xs font-semibold"
            style={{
              border: `2px dashed ${primaryColor}66`,
              backgroundColor: `${primaryColor}08`,
              color: primaryColor,
            }}
          >
            Drop here
          </div>
        )}

        <SortableContext
          items={categoryIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                isDraggingActive={isDraggingCategory}
                searchQuery={searchQuery}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
                dragCollapseSignal={dragCollapseSignal}
                dragRestoreSignal={dragRestoreSignal}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty state / drop zone */}
        {categories.length === 0 && (
          <div
            className="py-8 text-center rounded-lg text-sm"
            style={{
              border: isDraggingCategory
                ? `2px dashed ${primaryColor}66`
                : "2px dashed hsl(220 13% 88%)",
              backgroundColor: isDraggingCategory
                ? `${primaryColor}08`
                : "transparent",
              color: isDraggingCategory ? primaryColor : "hsl(220 9% 60%)",
            }}
          >
            {isDraggingCategory ? "Drop category here" : "Drag categories here"}
          </div>
        )}

        {/* Drop zone indicator at end of list */}
        {isDraggingCategory && categories.length > 0 && isOver && (
          <div
            className="mt-2 py-3 text-center rounded-lg text-xs font-semibold"
            style={{
              border: `2px dashed ${primaryColor}66`,
              backgroundColor: `${primaryColor}08`,
              color: primaryColor,
            }}
          >
            Drop here
          </div>
        )}

        {/* ── Highlight Image — only for variants with highlight.show ── */}
        {hasHighlight && (
          <div className="mt-3">
            <EditorCard
              icon={<ImageIcon className="w-4 h-4" />}
              title="Highlight Image"
              defaultCollapsed
            >
              {menuData.highlightImage && (
                <div
                  className="relative rounded-lg overflow-hidden"
                  style={{ maxHeight: "200px" }}
                >
                  <img
                    src={menuData.highlightImage}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "blur(20px)", transform: "scale(1.1)" }}
                  />
                  <img
                    src={menuData.highlightImage}
                    alt="Highlight preview"
                    className="relative w-full object-contain mx-auto"
                    style={{ maxHeight: "200px" }}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Image URL
                </label>
                <input
                  type="text"
                  value={menuData.highlightImage}
                  onChange={(e) =>
                    setMenuData((prev) => ({
                      ...prev,
                      highlightImage: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "hsl(220 13% 91%)";
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Label
                </label>
                <input
                  type="text"
                  value={menuData.highlightLabel}
                  onChange={(e) =>
                    setMenuData((prev) => ({
                      ...prev,
                      highlightLabel: e.target.value,
                    }))
                  }
                  placeholder="e.g. TODAY'S HIGHLIGHT"
                  className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "hsl(220 13% 91%)";
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={menuData.highlightTitle}
                  onChange={(e) =>
                    setMenuData((prev) => ({
                      ...prev,
                      highlightTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g. The Nordic Atlantic Salmon"
                  className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "hsl(220 13% 91%)";
                  }}
                />
              </div>
            </EditorCard>
          </div>
        )}
      </div>
    </div>
  );
}
