import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Trash2,
  AlertTriangle,
  FileText,
  GripVertical,
  Plus,
} from "lucide-react";
import { cn } from "ada-design-system";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CategorySection from "./CategorySection";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const variant = template?.pageVariants.find((v) => v.id === page.variantId);
  const hasOverflow = overflowPx > 0;

  // This page is a drop target for categories
  const { setNodeRef, isOver } = useDroppable({
    id: `page-drop-${page.id}`,
    data: { type: "page", pageId: page.id },
  });

  const isExpanded = !isCollapsed;
  const primaryColor = template?.colors.primary || "#4d5cc5";
  const categoryIds = page.categoryIds;

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
              ? `${primaryColor}44`
              : "hsl(220 13% 91%)",
        backgroundColor: isOver && isDraggingCategory
          ? `${primaryColor}08`
          : undefined,
      }}
      onClick={() => { if (!isActive) onActivate(); }}
    >
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div
        className={cn(
          "category-header flex items-center gap-2 px-4 py-3 select-none transition-colors duration-200 cursor-pointer",
          isActive && "category-expanded",
        )}
        onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed((c) => !c);
          onActivate();
        }}
      >
        {/* Page icon */}
        <span className={cn("shrink-0", isActive ? "text-white/70" : "text-muted-foreground")}>
          <FileText className="w-4 h-4" />
        </span>

        {/* Page number badge */}
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{
            backgroundColor: isActive ? "rgba(255,255,255,0.25)" : primaryColor,
            color: isActive ? "#fff" : "#fff",
          }}
        >
          {pageIndex + 1}
        </span>

        {/* Variant name */}
        <h3 className={cn("font-bold text-sm", isActive ? "text-white" : "text-foreground")}>
          {variant?.name || `Page ${pageIndex + 1}`}
        </h3>

        {/* Overflow badge */}
        {hasOverflow && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isActive ? "rgba(251,191,36,0.3)" : "rgba(251,191,36,0.15)",
              color: isActive ? "#fffbeb" : "#b45309",
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            {overflowPx}px
          </span>
        )}

        <div className="flex-1" />

        {/* Category count */}
        <span className={cn("text-xs", isActive ? "text-white/60" : "text-muted-foreground")}>
          {categories.length} cat{categories.length !== 1 ? "s" : ""}
        </span>

        {/* Variant selector (compact) */}
        {template && (
          <select
            value={page.variantId}
            onChange={(e) => {
              e.stopPropagation();
              onChangeVariant(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] bg-background rounded px-1.5 py-1 text-muted-foreground shrink-0 outline-none"
            style={{ border: "1px solid hsl(220 13% 91%)", maxWidth: "100px" }}
          >
            {template.pageVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}

        {/* Delete page */}
        {totalPages > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground transition-colors shrink-0"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#dc2626";
              e.currentTarget.style.backgroundColor = "hsl(0 80% 50% / 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Chevron */}
        <span className={cn("shrink-0 transition-colors", isActive ? "text-white" : "text-muted-foreground")}>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isCollapsed && "-rotate-90")} />
        </span>
      </div>

      {/* ── Page Body — categories inside ───────────────────────────── */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
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
        </div>
      )}

      {/* Collapsed drop indicator */}
      {isCollapsed && isOver && isDraggingCategory && (
        <div className="px-3 pb-3">
          <div
            className="py-4 text-center rounded-lg text-xs font-semibold"
            style={{
              border: `2px dashed ${primaryColor}66`,
              backgroundColor: `${primaryColor}08`,
              color: primaryColor,
            }}
          >
            Drop to add to Page {pageIndex + 1}
          </div>
        </div>
      )}
    </div>
  );
}
