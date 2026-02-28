import { useRef } from "react";
import {
  AlertTriangle,
  FileText,
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
  const variant = template?.pageVariants.find((v) => v.id === page.variantId);
  const hasOverflow = overflowPx > 0;
  const primaryColor = template?.colors.primary || "#4d5cc5";
  const categoryIds = page.categoryIds;

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
        <span className="text-xs text-muted-foreground">
          {categories.length} cat{categories.length !== 1 ? "s" : ""}
        </span>
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
      </div>
    </div>
  );
}
