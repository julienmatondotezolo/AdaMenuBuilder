import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import {
  Plus,
  X,
  Check,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  Type,
  Palette,
  AlertTriangle,
  ArrowLeftRight,
  Trash2,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import { Button, Input } from "ada-design-system";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
  MeasuringStrategy,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useMenu } from "../../context/MenuContext";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n";
import { useTemplates, useTemplateById } from "../../db/hooks";
import CategorySection from "./CategorySection";
import EditorCard from "./EditorCard";
import PageCard from "./PageCard";
import OverflowDialog from "./OverflowDialog";
import MenuItemCard from "./MenuItemCard";
import type { MenuItem, MenuPage, Category } from "../../types/menu";
import type { MenuTemplate, PageVariant, VariantBodyConfig } from "../../types/template";
import { mmToPx } from "../../types/template";
import { uid } from "../../utils/uid";

/** Compute max categories a page variant can display across all its body sections */
function getVariantCategoryCapacity(variant: PageVariant | undefined): number {
  if (!variant) return Infinity;
  const allBodies: VariantBodyConfig[] = [
    variant.body,
    ...(variant.extraBodies ?? []).filter((eb) => eb.show !== false),
  ];
  let total = 0;
  let hasUnlimited = false;
  for (const bc of allBodies) {
    const max = bc.maxCategories;
    if (max && max > 0) {
      total += max;
    } else {
      hasUnlimited = true;
    }
  }
  return hasUnlimited ? Infinity : total;
}

/* ── Overflow measurement helper ─────────────────────────────────────── */

function measurePageOverflow(
  template: MenuTemplate | undefined,
  pageIndex: number,
): number {
  if (!template) return 0;
  const pageHeight = mmToPx(template.format.height);
  const el = document.querySelector(
    `[data-menu-preview][data-page-index="${pageIndex}"]`,
  ) as HTMLElement | null;
  if (!el) return 0;
  const overflow = Math.max(0, el.scrollHeight - pageHeight);
  return overflow;
}

/* ── Template Selector (simplified — just dropdown) ──────────────────── */

function TemplateSelector({
  template,
  templateId,
  setTemplateId,
}: {
  template: MenuTemplate | undefined;
  templateId: string;
  setTemplateId: (id: string) => void;
}) {
  const templates = useTemplates();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">
        Template
      </label>
      <button
        onClick={() => setShowDropdown((s) => !s)}
        className="w-full h-9 rounded-lg text-sm bg-background text-foreground flex items-center justify-between px-3 transition-colors"
        style={{ border: "1px solid hsl(220 13% 91%)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)";
        }}
        onMouseLeave={(e) => {
          if (!showDropdown)
            e.currentTarget.style.borderColor = "hsl(220 13% 91%)";
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {template && (
            <span className="flex gap-0.5 shrink-0">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: template.colors.primary }}
              />
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: template.colors.background,
                  border: "1px solid hsl(220 13% 91%)",
                }}
              />
            </span>
          )}
          <span className="truncate">{template?.name ?? "Select template..."}</span>
        </span>
        <span className="text-muted-foreground text-xs shrink-0 ml-2">
          {template?.format.type}
        </span>
      </button>

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
                backgroundColor:
                  tpl.id === templateId
                    ? "hsl(232 100% 66% / 0.08)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  tpl.id === templateId
                    ? "hsl(232 100% 66% / 0.12)"
                    : "hsl(220 14% 96%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  tpl.id === templateId
                    ? "hsl(232 100% 66% / 0.08)"
                    : "transparent";
              }}
            >
              {tpl.thumbnail ? (
                <img src={tpl.thumbnail} alt="" className="w-8 h-10 object-cover rounded-sm border border-border shrink-0" />
              ) : (
                <div className="flex gap-0.5 shrink-0">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tpl.colors.primary }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: tpl.colors.background,
                      border: "1px solid hsl(220 13% 91%)",
                    }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tpl.colors.accent }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{tpl.name}</span>
                  {tpl.isBuiltIn && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      Built-in
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {tpl.format.type} · {tpl.pageVariants.length} variant
                  {tpl.pageVariants.length !== 1 ? "s" : ""}
                </span>
              </div>
              {tpl.id === templateId && (
                <Check className="w-4 h-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Editor Panel ───────────────────────────────────────────────── */

export default function EditorPanel({ canEdit = true }: { canEdit?: boolean }) {
  const {
    menuData,
    setMenuData,
    templateId,
    setTemplateId,
    pages,
    setPages,
    activePageIndex,
    setActivePageIndex,
    addCategory,
    removeCategory,
    moveOrReorderItem,
    setDragState,
    dragState,
    aiPreviewData,
    aiPreviewPages,
    aiPreviewNewIds,
  } = useMenu();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === "admin";

  // When AI preview is active, use preview data for display
  const isAiPreview = !!aiPreviewData;
  const displayData = aiPreviewData || menuData;
  const displayPages = aiPreviewPages || pages;

  const currentTemplate = useTemplateById(templateId || undefined);

  // When template loads/changes, ensure pages use valid variant IDs
  const lastResolvedTemplateId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentTemplate || currentTemplate.id === lastResolvedTemplateId.current) return;

    const validVariantIds = new Set(currentTemplate.pageVariants.map((v) => v.id));
    const defaultVariantId = currentTemplate.pageVariants[0]?.id;
    if (!defaultVariantId) return;

    if (pages.length === 0) {
      // No pages yet — distribute categories across pages based on variant capacity
      lastResolvedTemplateId.current = currentTemplate.id;
      const firstVariant = currentTemplate.pageVariants.find((v) => v.id === defaultVariantId);
      const capacity = getVariantCategoryCapacity(firstVariant);
      const allCatIds = displayData.categories.map((c) => c.id);

      if (capacity === Infinity || allCatIds.length <= capacity) {
        // Everything fits on one page
        setPages([{ id: `page-${Date.now()}`, variantId: defaultVariantId, categoryIds: allCatIds }]);
      } else {
        // Distribute across multiple pages
        const newPages: MenuPage[] = [];
        for (let i = 0; i < allCatIds.length; i += capacity) {
          newPages.push({
            id: `page-${Date.now()}-${newPages.length}`,
            variantId: defaultVariantId,
            categoryIds: allCatIds.slice(i, i + capacity),
          });
        }
        setPages(newPages);
      }
    } else {
      const needsUpdate = pages.some((p) => !validVariantIds.has(p.variantId));
      if (needsUpdate) {
        lastResolvedTemplateId.current = currentTemplate.id;
        setPages(pages.map((p) => ({
          ...p,
          variantId: validVariantIds.has(p.variantId) ? p.variantId : defaultVariantId,
        })));
      } else {
        // Pages are already valid for this template
        lastResolvedTemplateId.current = currentTemplate.id;
      }
    }
  }, [currentTemplate, pages, setPages, displayData.categories]);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);
  const [dragCollapseSignal, setDragCollapseSignal] = useState(0);
  const [dragRestoreSignal, setDragRestoreSignal] = useState(0);

  /* ── Capacity notification (shown when category auto-moved to next page) ── */
  const [capacityNotice, setCapacityNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!capacityNotice) return;
    const timer = setTimeout(() => setCapacityNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [capacityNotice]);

  /* ── Drag capacity (swap) dialog state ────────────────────────── */
  const pendingSwapRef = useRef<{
    draggedCategoryId: string;
    draggedCategoryName: string;
    sourcePageId: string;
    targetPageId: string;
    targetPageIndex: number;
    capacity: number;
    targetCategoryIds: string[];
  } | null>(null);
  const [swapDialog, setSwapDialog] = useState<{
    draggedCategoryId: string;
    draggedCategoryName: string;
    sourcePageId: string;
    targetPageId: string;
    targetPageIndex: number;
    capacity: number;
    targetCategoryIds: string[];
  } | null>(null);

  /* ── Delete page dialog state ─────────────────────────────────── */
  const [deletePageDialog, setDeletePageDialog] = useState<{
    pageIndex: number;
    categoryCount: number;
  } | null>(null);

  /* ── Overflow dialog state ─────────────────────────────────────── */
  const [overflowDialog, setOverflowDialog] = useState<{
    categoryId: string;
    categoryName: string;
    pageId: string;
    pageIndex: number;
    overflowPx: number;
    capacityOverflow?: boolean;
  } | null>(null);

  /* ── Per-page overflow tracking ────────────────────────────────── */
  const [pageOverflows, setPageOverflows] = useState<Map<number, number>>(
    new Map(),
  );

  /**
   * Ref that stores the last category that was mutated (added, dropped, etc.)
   * When the overflow check runs and finds overflow on that category's page,
   * it opens the dialog for this category.
   */
  const pendingOverflowCheckRef = useRef<string | null>(null);

  /** Check a single page for overflow — returns { px } or null */
  const checkPageOverflow = useCallback(
    (pageIndex: number): { px: number; capacity: boolean } | null => {
      if (!currentTemplate || pageIndex < 0 || pageIndex >= pages.length) return null;
      const page = pages[pageIndex];

      // Skip overflow checks on empty pages — nothing can overflow
      if (page.categoryIds.length === 0) return null;

      // DOM-based overflow only — measure actual rendered content vs page height
      const px = measurePageOverflow(currentTemplate, pageIndex);
      if (px > 10) {
        return { px: Math.round(px), capacity: false };
      }

      return null;
    },
    [currentTemplate, pages],
  );

  /** Measure all pages for the yellow overflow badge indicators */
  const measureAllOverflows = useCallback(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < pages.length; i++) {
      const result = checkPageOverflow(i);
      if (result) {
        map.set(i, result.capacity ? -1 : result.px);
      }
    }
    setPageOverflows(map);
  }, [checkPageOverflow, pages.length]);

  /**
   * Unified overflow check — runs after any mutation.
   * If pendingOverflowCheckRef has a category id, checks its page and opens
   * the dialog if overflow is detected.
   */
  const runOverflowCheck = useCallback(() => {
    const categoryId = pendingOverflowCheckRef.current;
    pendingOverflowCheckRef.current = null;
    measureAllOverflows();

    if (!categoryId || !currentTemplate) return;

    // Find which page this category is on
    const page = pages.find((p) => p.categoryIds.includes(categoryId));
    if (!page) return;
    const pageIndex = pages.indexOf(page);

    const result = checkPageOverflow(pageIndex);
    if (result) {
      const cat = menuData.categories.find((c) => c.id === categoryId);
      setOverflowDialog({
        categoryId,
        categoryName: cat?.name || "Category",
        pageId: page.id,
        pageIndex,
        overflowPx: result.px,
        capacityOverflow: result.capacity,
      });
    }
  }, [pages, currentTemplate, menuData.categories, measureAllOverflows, checkPageOverflow]);

  /** Schedule an overflow check for a specific category after React re-renders */
  const scheduleOverflowCheck = useCallback(
    (categoryId: string) => {
      pendingOverflowCheckRef.current = categoryId;
      // Delay so React has time to render the updated preview DOM
      setTimeout(runOverflowCheck, 400);
    },
    [runOverflowCheck],
  );

  // Periodic overflow measurement for badges
  useEffect(() => {
    const timer = setTimeout(measureAllOverflows, 400);
    const interval = setInterval(measureAllOverflows, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [measureAllOverflows, menuData, pages]);

  /* ── Auto-init pages if empty ──────────────────────────────────── */
  useEffect(() => {
    if (pages.length === 0 && menuData.categories.length > 0 && currentTemplate) {
      const firstVariant = currentTemplate.pageVariants[0];
      const variantId = firstVariant?.id ?? "";
      const capacity = getVariantCategoryCapacity(firstVariant);
      const allCatIds = menuData.categories.map((c) => c.id);

      if (capacity === Infinity || allCatIds.length <= capacity) {
        setPages([{ id: `page-${uid()}`, variantId, categoryIds: allCatIds }]);
      } else {
        const newPages: MenuPage[] = [];
        for (let i = 0; i < allCatIds.length; i += capacity) {
          newPages.push({
            id: `page-${uid()}`,
            variantId,
            categoryIds: allCatIds.slice(i, i + capacity),
          });
        }
        setPages(newPages);
      }
    }
  }, [pages.length, menuData.categories.length, currentTemplate?.id]);

  /* ── DnD sensors ───────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ── ID helpers ────────────────────────────────────────────────── */
  const allCategoryIds = menuData.categories.map((c) => c.id);

  const getIdType = (id: string): "category" | "item" | "page" => {
    if (String(id).startsWith("page-drop-")) return "page";
    if (menuData.categories.some((c) => c.id === id)) return "category";
    return "item";
  };

  const findPageForCategory = (categoryId: string): MenuPage | undefined => {
    return pages.find((p) => p.categoryIds.includes(categoryId));
  };

  /* ── DnD: active overlay data ──────────────────────────────────── */
  const activeItem: (MenuItem & { categoryId: string }) | null = (() => {
    if (!dragState.activeId || dragState.activeType !== "item") return null;
    for (const cat of menuData.categories) {
      const item = cat.items.find((i) => i.id === dragState.activeId);
      if (item) return { ...item, categoryId: cat.id };
    }
    return null;
  })();

  const activeCategory = (() => {
    if (!dragState.activeId || dragState.activeType !== "category") return null;
    return menuData.categories.find((c) => c.id === dragState.activeId) ?? null;
  })();

  /* ── Collision detection ───────────────────────────────────────── */
  const collisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);
    const activeType = getIdType(activeId);

    if (activeType === "category") {
      // For categories: check page droppables + category positions
      const validContainers = args.droppableContainers.filter((c) => {
        const cId = String(c.id);
        return (
          cId.startsWith("page-drop-") ||
          cId.startsWith("unassigned-drop") ||
          allCategoryIds.includes(cId)
        );
      });
      return closestCorners({
        ...args,
        droppableContainers: validContainers,
      });
    }

    // For items: standard behavior
    return closestCorners(args);
  };

  /* ── DnD handlers ──────────────────────────────────────────────── */
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const activeType = getIdType(activeId);
    setDragState({
      activeId,
      activeType: activeType === "page" ? null : activeType,
      overId: null,
      overType: null,
    });
    if (activeType === "category") {
      setDragCollapseSignal((s) => s + 1);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragState((prev) => ({ ...prev, overId: null, overType: null }));
      return;
    }

    const activeId = String(active.id);
    const rawOverId = String(over.id);
    const activeType = getIdType(activeId);

    // ── Category being dragged over a page droppable ──
    if (activeType === "category" && rawOverId.startsWith("page-drop-")) {
      const targetPageId = rawOverId.replace("page-drop-", "");
      const sourcePage = findPageForCategory(activeId);

      setDragState((prev) => ({
        ...prev,
        overId: targetPageId,
        overType: "category",
      }));

      if (sourcePage?.id !== targetPageId) {
        // Check capacity before allowing the move
        const targetPage = pages.find((p) => p.id === targetPageId);
        const targetVariant = currentTemplate?.pageVariants.find((v) => v.id === targetPage?.variantId);
        const capacity = getVariantCategoryCapacity(targetVariant);
        // Only count valid (non-orphaned) category IDs for capacity
        const validCatIds = targetPage?.categoryIds.filter((cid) => displayData.categories.some((c) => c.id === cid)) ?? [];

        if (capacity !== Infinity && targetPage && validCatIds.length >= capacity) {
          // Page is full — queue swap dialog for dragEnd
          const cat = displayData.categories.find((c) => c.id === activeId);
          const targetIdx = pages.indexOf(targetPage);
          pendingSwapRef.current = {
            draggedCategoryId: activeId,
            draggedCategoryName: cat?.name || "Category",
            sourcePageId: sourcePage?.id || "",
            targetPageId,
            targetPageIndex: targetIdx,
            capacity,
            targetCategoryIds: validCatIds,
          };
          return; // Don't move — swap dialog will handle it
        }

        setPages((prev) => {
          const cleaned = prev.map((p) => ({
            ...p,
            categoryIds: p.categoryIds.filter((cid) => cid !== activeId),
          }));
          return cleaned.map((p) => {
            if (p.id === targetPageId) {
              return { ...p, categoryIds: [...p.categoryIds, activeId] };
            }
            return p;
          });
        });
      }
      return;
    }

    // ── Category being dragged over unassigned pool ──
    if (activeType === "category" && rawOverId === "unassigned-drop") {
      setDragState((prev) => ({
        ...prev,
        overId: "unassigned",
        overType: "category",
      }));

      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          categoryIds: p.categoryIds.filter((cid) => cid !== activeId),
        })),
      );
      return;
    }

    // ── Category being dragged over another category ──
    if (activeType === "category") {
      const overId = rawOverId.endsWith("-items")
        ? rawOverId.replace(/-items$/, "")
        : rawOverId;
      const overType = getIdType(overId);

      if (overType === "category" && overId !== activeId) {
        const sourcePage = findPageForCategory(activeId);
        const targetPage = findPageForCategory(overId);

        setDragState((prev) => ({ ...prev, overId, overType: "category" }));

        if (sourcePage && targetPage) {
          if (sourcePage.id === targetPage.id) {
            // Reorder within same page
            setPages((prev) =>
              prev.map((p) => {
                if (p.id !== sourcePage.id) return p;
                const oldIdx = p.categoryIds.indexOf(activeId);
                const newIdx = p.categoryIds.indexOf(overId);
                if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx)
                  return p;
                return {
                  ...p,
                  categoryIds: arrayMove(p.categoryIds, oldIdx, newIdx),
                };
              }),
            );
          } else {
            // Cross-page: check capacity before moving
            const targetVariant = currentTemplate?.pageVariants.find((v) => v.id === targetPage.variantId);
            const capacity = getVariantCategoryCapacity(targetVariant);
            const validCatIds2 = targetPage.categoryIds.filter((cid) => displayData.categories.some((c) => c.id === cid));

            if (capacity !== Infinity && validCatIds2.length >= capacity) {
              // Page is full — queue swap dialog
              const cat = displayData.categories.find((c) => c.id === activeId);
              const targetIdx = pages.indexOf(targetPage);
              pendingSwapRef.current = {
                draggedCategoryId: activeId,
                draggedCategoryName: cat?.name || "Category",
                sourcePageId: sourcePage.id,
                targetPageId: targetPage.id,
                targetPageIndex: targetIdx,
                capacity,
                targetCategoryIds: validCatIds2,
              };
            } else {
              setPages((prev) => {
                const cleaned = prev.map((p) => ({
                  ...p,
                  categoryIds: p.categoryIds.filter((cid) => cid !== activeId),
                }));
                return cleaned.map((p) => {
                  if (p.id !== targetPage.id) return p;
                  const idx = p.categoryIds.indexOf(overId);
                  const newIds = [...p.categoryIds];
                  newIds.splice(idx, 0, activeId);
                  return { ...p, categoryIds: newIds };
                });
              });
            }
          }
        } else if (!sourcePage && targetPage) {
          // From unassigned to page — check capacity
          const targetVariant = currentTemplate?.pageVariants.find((v) => v.id === targetPage.variantId);
          const capacity = getVariantCategoryCapacity(targetVariant);
          const validCatIds3 = targetPage.categoryIds.filter((cid) => displayData.categories.some((c) => c.id === cid));

          if (capacity !== Infinity && validCatIds3.length >= capacity) {
            const cat = displayData.categories.find((c) => c.id === activeId);
            const targetIdx = pages.indexOf(targetPage);
            pendingSwapRef.current = {
              draggedCategoryId: activeId,
              draggedCategoryName: cat?.name || "Category",
              sourcePageId: "",
              targetPageId: targetPage.id,
              targetPageIndex: targetIdx,
              capacity,
              targetCategoryIds: validCatIds3,
            };
          } else {
            setPages((prev) =>
              prev.map((p) => {
                if (p.id !== targetPage.id) return p;
                const idx = p.categoryIds.indexOf(overId);
                const newIds = [...p.categoryIds];
                newIds.splice(idx, 0, activeId);
                return { ...p, categoryIds: newIds };
              }),
            );
          }
        }
      }
      return;
    }

    // ── Item drag (existing behavior) ──
    if (activeType === "item") {
      const overId = rawOverId.endsWith("-items")
        ? rawOverId.replace(/-items$/, "")
        : rawOverId;
      const overType = getIdType(overId);

      setDragState((prev) => ({
        ...prev,
        overId,
        overType: overType === "page" ? null : overType,
      }));

      if (activeId !== overId) {
        const activeCategory = menuData.categories.find((c) =>
          c.items.some((i) => i.id === activeId),
        );
        const overCategory =
          overType === "category"
            ? menuData.categories.find((c) => c.id === overId)
            : menuData.categories.find((c) =>
                c.items.some((i) => i.id === overId),
              );

        if (
          activeCategory &&
          overCategory &&
          activeCategory.id !== overCategory.id
        ) {
          moveOrReorderItem(activeId, overId);
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const wasCategory = dragState.activeType === "category";
    const activeId = String(active?.id ?? "");

    setDragState({
      activeId: null,
      activeType: null,
      overId: null,
      overType: null,
    });
    setDragRestoreSignal((s) => s + 1);

    if (!over || active.id === over.id) {
      // Check overflow after drop
      if (wasCategory) {
        setTimeout(() => checkOverflowAfterDrop(activeId), 350);
      }
      return;
    }

    const rawOverId = String(over.id);
    const overId = rawOverId.endsWith("-items")
      ? rawOverId.replace(/-items$/, "")
      : rawOverId;
    const activeType = getIdType(activeId);

    // Item reorder within same category
    if (activeType === "item") {
      const activeCategory = menuData.categories.find((c) =>
        c.items.some((i) => i.id === activeId),
      );
      const overCategory = menuData.categories.find((c) =>
        c.items.some((i) => i.id === overId),
      );
      if (
        activeCategory &&
        overCategory &&
        activeCategory.id === overCategory.id
      ) {
        moveOrReorderItem(activeId, overId);
      }
    }

    // Category — check for pending swap dialog or overflow
    if (wasCategory) {
      if (pendingSwapRef.current) {
        setSwapDialog(pendingSwapRef.current);
        pendingSwapRef.current = null;
      } else {
        setTimeout(() => checkOverflowAfterDrop(activeId), 350);
      }
    }
  };

  const handleDragCancel = () => {
    setDragState({
      activeId: null,
      activeType: null,
      overId: null,
      overType: null,
    });
    setDragRestoreSignal((s) => s + 1);
  };

  /* ── Overflow check after category drop — delegates to unified check ─ */
  const checkOverflowAfterDrop = useCallback(
    (categoryId: string) => {
      scheduleOverflowCheck(categoryId);
    },
    [scheduleOverflowCheck],
  );

  /* ── Overflow dialog actions ───────────────────────────────────── */
  const handleOverflowKeep = () => {
    setOverflowDialog(null);
  };

  const handleOverflowMoveToPage = (targetPageId: string) => {
    if (!overflowDialog) return;
    setPages((prev) => {
      const cleaned = prev.map((p) => ({
        ...p,
        categoryIds: p.categoryIds.filter(
          (cid) => cid !== overflowDialog.categoryId,
        ),
      }));
      return cleaned.map((p) => {
        if (p.id === targetPageId) {
          return {
            ...p,
            categoryIds: [...p.categoryIds, overflowDialog.categoryId],
          };
        }
        return p;
      });
    });
    setOverflowDialog(null);
    setTimeout(measureAllOverflows, 400);
  };

  const handleOverflowCreatePage = () => {
    if (!overflowDialog || !currentTemplate) return;
    const variant =
      currentTemplate.pageVariants.find((v) => v.body && !v.header?.show) ??
      currentTemplate.pageVariants[0];

    const newPageId = `page-${uid()}`;
    setPages((prev) => {
      const cleaned = prev.map((p) => ({
        ...p,
        categoryIds: p.categoryIds.filter(
          (cid) => cid !== overflowDialog.categoryId,
        ),
      }));
      return [
        ...cleaned,
        {
          id: newPageId,
          variantId: variant?.id ?? "",
          categoryIds: [overflowDialog.categoryId],
        },
      ];
    });
    setActivePageIndex(pages.length); // select new page
    setOverflowDialog(null);
    setTimeout(measureAllOverflows, 400);
  };

  /* ── Page management ───────────────────────────────────────────── */
  const addPage = () => {
    if (!currentTemplate) return;
    const usedVariantIds = new Set(pages.map((p) => p.variantId));
    const variant =
      currentTemplate.pageVariants.find((v) => !usedVariantIds.has(v.id)) ??
      currentTemplate.pageVariants.find((v) => v.body && !v.header?.show) ??
      currentTemplate.pageVariants[0];

    setPages((prev) => [
      ...prev,
      {
        id: `page-${uid()}`,
        variantId: variant?.id ?? "",
        categoryIds: [],
      },
    ]);
    setActivePageIndex(pages.length);
  };

  const removePage = (pageIndex: number) => {
    if (pages.length <= 1) return;
    const removedPage = pages[pageIndex];
    const validCatCount = removedPage.categoryIds.filter((cid) =>
      displayData.categories.some((c) => c.id === cid),
    ).length;

    if (validCatCount > 0) {
      setDeletePageDialog({ pageIndex, categoryCount: validCatCount });
      return;
    }
    // No categories — just remove the page
    executeDeletePage(pageIndex, false);
  };

  const executeDeletePage = (pageIndex: number, deleteCategories: boolean) => {
    const removedPage = pages[pageIndex];
    const catIds = removedPage.categoryIds.filter((cid) =>
      displayData.categories.some((c) => c.id === cid),
    );

    if (deleteCategories) {
      // Delete page and all its categories
      for (const catId of catIds) {
        removeCategory(catId);
      }
      setPages((prev) => prev.filter((_, i) => i !== pageIndex));
    } else {
      // Delete page only — redistribute categories respecting capacity
      setPages((prev) => {
        const remaining = prev
          .filter((_, i) => i !== pageIndex)
          .map((p) => ({ ...p, categoryIds: [...p.categoryIds] }));
        let overflow: string[] = [];

        for (const catId of catIds) {
          const targetPage = remaining.find((p) => {
            const variant = currentTemplate?.pageVariants.find((v) => v.id === p.variantId);
            const cap = getVariantCategoryCapacity(variant);
            return p.categoryIds.length < cap;
          });

          if (targetPage) {
            targetPage.categoryIds.push(catId);
          } else {
            overflow.push(catId);
          }
        }

        if (overflow.length > 0) {
          const defaultVariantId = currentTemplate?.pageVariants[0]?.id ?? "";
          remaining.push({
            id: `page-${Date.now()}-overflow`,
            variantId: defaultVariantId,
            categoryIds: overflow,
          });
          setCapacityNotice(
            t("overflow.categoriesMovedToNew").replace("{{page}}", String(remaining.length)),
          );
        }

        return remaining;
      });

      // Schedule overflow checks for each moved category so the popup triggers if needed
      for (const catId of catIds) {
        setTimeout(() => scheduleOverflowCheck(catId), 500);
      }
    }

    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2));
    }
    setDeletePageDialog(null);
    setTimeout(measureAllOverflows, 400);
  };

  const changePageVariant = (pageIndex: number, variantId: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, variantId } : p)),
    );
  };

  /* ── Add category — goes to active page, respects maxCategories ── */
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const catId = addCategory(newCategoryName.trim());
      if (pages.length > 0 && catId) {
        const targetPageIndex = Math.min(activePageIndex, pages.length - 1);
        const targetPage = pages[targetPageIndex];
        const variant = currentTemplate?.pageVariants.find((v) => v.id === targetPage?.variantId);
        const capacity = getVariantCategoryCapacity(variant);

        if (capacity !== Infinity && targetPage.categoryIds.length >= capacity) {
          // Page is full — find next page with space or create one
          const nextPageIndex = pages.findIndex(
            (p, i) => i > targetPageIndex && p.categoryIds.length < getVariantCategoryCapacity(
              currentTemplate?.pageVariants.find((v) => v.id === p.variantId),
            ),
          );

          if (nextPageIndex !== -1) {
            // Add to next available page
            setPages((prev) =>
              prev.map((p, i) => i === nextPageIndex ? { ...p, categoryIds: [...p.categoryIds, catId] } : p),
            );
            setCapacityNotice(
              t("overflow.pageFull")
                .replace("{{page}}", String(targetPageIndex + 1))
                .replace("{{max}}", String(capacity))
                .replace("{{target}}", String(nextPageIndex + 1)),
            );
            setActivePageIndex(nextPageIndex);
          } else {
            // No page with space — create a new one
            const defaultVariantId = currentTemplate?.pageVariants[0]?.id ?? "";
            const newPageId = `page-${uid()}`;
            setPages((prev) => [
              ...prev,
              { id: newPageId, variantId: targetPage.variantId || defaultVariantId, categoryIds: [catId] },
            ]);
            const newPageIndex = pages.length;
            setCapacityNotice(
              t("overflow.pageFullNewPage")
                .replace("{{page}}", String(targetPageIndex + 1))
                .replace("{{max}}", String(capacity))
                .replace("{{target}}", String(newPageIndex + 1)),
            );
            setActivePageIndex(newPageIndex);
          }
        } else {
          // Page has space — add normally
          setPages((prev) =>
            prev.map((p, i) =>
              i === targetPageIndex ? { ...p, categoryIds: [...p.categoryIds, catId] } : p,
            ),
          );
          scheduleOverflowCheck(catId);
        }
      }
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddCategory();
    if (e.key === "Escape") {
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const handleToggleAll = () => {
    if (allCollapsed) {
      setExpandSignal((s) => s + 1);
      setAllCollapsed(false);
    } else {
      setCollapseSignal((s) => s + 1);
      setAllCollapsed(true);
    }
  };

  /* ── Unassigned categories (not on any page) ───────────────────── */
  const assignedCategoryIds = new Set(displayPages.flatMap((p) => p.categoryIds));
  const unassignedCategories = displayData.categories.filter(
    (c) => !assignedCategoryIds.has(c.id),
  );

  /* ── Overflow dialog available pages ───────────────────────────── */
  const overflowAvailablePages =
    overflowDialog
      ? pages
          .map((p, i) => ({
            id: p.id,
            index: i,
            name:
              currentTemplate?.pageVariants.find((v) => v.id === p.variantId)
                ?.name || `Page ${i + 1}`,
          }))
          .filter((p) => p.id !== overflowDialog.pageId)
      : [];

  /* ── Build page categories ─────────────────────────────────────── */
  const getPageCategories = (page: MenuPage) => {
    return page.categoryIds
      .map((cid) => displayData.categories.find((c) => c.id === cid))
      .filter(Boolean) as typeof displayData.categories;
  };

  const isDraggingCategory = dragState.activeType === "category";

  /* ── Active page variant info ─────────────────────────────────── */
  const activePage = displayPages[activePageIndex];
  const activeVariant = activePage
    ? currentTemplate?.pageVariants.find((v) => v.id === activePage.variantId)
    : undefined;
  const activeVariantHeaderVisible = activeVariant?.header?.show !== false;

  /* ── Determine which pages are "new" in AI preview ─────────────── */
  const originalPageIds = new Set(pages.map((p) => p.id));
  const isNewPage = (pageId: string) => isAiPreview && !originalPageIds.has(pageId);

  return (
    <div className="w-full h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <h2 className="text-lg font-bold text-foreground">{t("editorPanel.title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("editorPanel.subtitle_tagline")}
        </p>
      </div>

      {/* View-only banner for staff */}
      {!canEdit && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ backgroundColor: "hsl(220 14% 96%)", borderColor: "hsl(220 13% 88%)" }}>
          <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-xs font-semibold text-foreground">{t("permissions.viewOnly")}</span>
            <p className="text-[10px] text-muted-foreground">{t("permissions.viewOnlyDescription")}</p>
          </div>
        </div>
      )}

      {/* Menu title + fold/unfold */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {displayData.title || "Untitled Menu"}
        </h3>
        <button
          onClick={handleToggleAll}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors"
          style={{ padding: "2px 6px", borderRadius: "6px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(220 14% 93%)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "";
          }}
        >
          {allCollapsed ? (
            <>
              <ChevronsUpDown className="w-3.5 h-3.5" />
              Expand all
            </>
          ) : (
            <>
              <ChevronsDownUp className="w-3.5 h-3.5" />
              Collapse all
            </>
          )}
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("editorPanel.searchMenuItems")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 rounded-lg text-sm bg-card text-foreground placeholder:text-muted-foreground outline-none"
            style={{
              border: "1px solid hsl(220 13% 91%)",
              paddingLeft: "2.25rem",
              paddingRight: "2.25rem",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.5)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "hsl(220 13% 91%)";
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-muted-foreground transition-colors"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "hsl(224 71% 4%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "";
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Template Selector — admin only */}
        {isAdmin && (
          <EditorCard
            icon={<Palette className="w-4 h-4" />}
            title={t("editorPanel.template")}
            defaultCollapsed
            collapseSignal={collapseSignal}
            expandSignal={expandSignal}
          >
            <TemplateSelector
              template={currentTemplate}
              templateId={templateId}
              setTemplateId={setTemplateId}
            />
            {currentTemplate && (
              <a
                href={`/templates/${currentTemplate.id}/edit`}
                className="flex items-center gap-1.5 text-xs font-medium text-primary transition-colors"
                style={{ opacity: 0.8 }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.8";
                }}
              >
                {t("editorPanel.editTemplateSettings")} →
              </a>
            )}
          </EditorCard>
        )}

        <div className="h-4" />

        {/* Menu Header Editor — hidden when active page variant disables header */}
        {activeVariantHeaderVisible && <EditorCard
          icon={<Type className="w-4 h-4" />}
          title={t("editorPanel.menuHeader")}
          defaultCollapsed
          collapseSignal={collapseSignal}
          expandSignal={expandSignal}
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("editorPanel.subtitle")}
            </label>
            <input
              type="text"
              value={menuData.subtitle}
              readOnly={!canEdit}
              onChange={canEdit ? (e) =>
                setMenuData((prev) => ({ ...prev, subtitle: e.target.value }))
              : undefined}
              placeholder={t("editorPanel.subtitlePlaceholder")}
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
              {t("editorPanel.restaurantName")}
            </label>
            <input
              type="text"
              value={menuData.restaurantName}
              readOnly={!canEdit}
              onChange={canEdit ? (e) =>
                setMenuData((prev) => ({
                  ...prev,
                  restaurantName: e.target.value,
                }))
              : undefined}
              placeholder="e.g. Lumière Dining"
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
              {t("editorPanel.establishedYear")}
            </label>
            <input
              type="text"
              value={menuData.established}
              readOnly={!canEdit}
              onChange={canEdit ? (e) =>
                setMenuData((prev) => ({
                  ...prev,
                  established: e.target.value,
                }))
              : undefined}
              placeholder="e.g. 2024"
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
        </EditorCard>}

        <div className="h-4" />

        {/* ── Pages Section ──────────────────────────────────────── */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* AI Preview banner */}
          {isAiPreview && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-semibold text-amber-700">AI Preview Mode</span>
              <span className="text-xs text-amber-600 ml-auto">New items highlighted in green</span>
            </div>
          )}

          {/* Capacity notice banner */}
          {capacityNotice && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-xs font-medium text-blue-700 flex-1">{capacityNotice}</span>
              <button
                onClick={() => setCapacityNotice(null)}
                className="text-blue-400 hover:text-blue-600 shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {displayPages.map((page, pageIndex) => (
              <PageCard
                key={page.id}
                page={page}
                pageIndex={pageIndex}
                categories={getPageCategories(page)}
                template={currentTemplate}
                isActive={activePageIndex === pageIndex}
                totalPages={displayPages.length}
                overflowPx={pageOverflows.get(pageIndex) ?? 0}
                isDraggingCategory={isDraggingCategory}
                onActivate={() => setActivePageIndex(pageIndex)}
                onRemove={isAiPreview || !canEdit ? undefined : () => removePage(pageIndex)}
                onChangeVariant={isAiPreview || !canEdit ? undefined : (v) => changePageVariant(pageIndex, v)}
                onAddItem={() => {
                  /* handled by CategorySection */
                }}
                onContentChanged={scheduleOverflowCheck}
                searchQuery={searchQuery}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
                dragCollapseSignal={dragCollapseSignal}
                dragRestoreSignal={dragRestoreSignal}
                isNewPage={isNewPage(page.id)}
                newPageLabel={isNewPage(page.id) ? `Page ${pages.length + displayPages.filter((p, i) => i <= pageIndex && isNewPage(p.id)).length}` : undefined}
                aiNewIds={isAiPreview ? aiPreviewNewIds : undefined}
                canEdit={canEdit}
              />
            ))}
          </div>

          {/* Unassigned categories pool */}
          {unassignedCategories.length > 0 && (
            <UnassignedPool
              categories={unassignedCategories}
              isDraggingCategory={isDraggingCategory}
              searchQuery={searchQuery}
              collapseSignal={collapseSignal}
              expandSignal={expandSignal}
              dragCollapseSignal={dragCollapseSignal}
              dragRestoreSignal={dragRestoreSignal}
            />
          )}

          {/* Add Page button */}
          {!isAiPreview && canEdit && <button
            onClick={addPage}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors"
            style={{ border: "2px dashed hsl(220 13% 88%)", marginTop: "24px" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "hsl(232 100% 66% / 0.4)";
              e.currentTarget.style.color = "hsl(232 100% 66%)";
              e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "hsl(220 13% 88%)";
              e.currentTarget.style.color = "";
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            <Plus className="w-4 h-4" />
            {t("editorPanel.addPage")}
          </button>}

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div className="rotate-1 scale-105">
                <MenuItemCard
                  item={activeItem}
                  categoryId={activeItem.categoryId}
                  isDraggingActive
                  isOverlay
                />
              </div>
            )}
            {activeCategory && (
              <div className="rotate-1 scale-[1.02] opacity-90">
                <CategorySection
                  category={activeCategory}
                  isDraggingActive
                  isOverlay
                  forceCollapsed
                  searchQuery=""
                  collapseSignal={0}
                  expandSignal={0}
                  dragCollapseSignal={0}
                  dragRestoreSignal={0}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {displayData.categories.length === 0 && displayPages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">
              Create your first category to get started
            </p>
          </div>
        )}

      </div>

      {/* Fixed bottom — Create New Category */}
      {canEdit && <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
        {isAddingCategory ? (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
            <Input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("editorPanel.categoryNamePlaceholder")}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleAddCategory}
              className="text-success hover:text-success"
            >
              <Check className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setNewCategoryName("");
                setIsAddingCategory(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsAddingCategory(true)}
            className="w-full flex items-center justify-center gap-2 font-semibold"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Create New Category
          </Button>
        )}
      </div>}

      {/* Overflow Dialog */}
      <OverflowDialog
        open={!!overflowDialog}
        onClose={() => setOverflowDialog(null)}
        categoryName={overflowDialog?.categoryName ?? ""}
        pageIndex={overflowDialog?.pageIndex ?? 0}
        overflowPx={overflowDialog?.overflowPx ?? 0}
        capacityOverflow={overflowDialog?.capacityOverflow}
        availablePages={overflowAvailablePages}
        onKeep={handleOverflowKeep}
        onMoveToPage={handleOverflowMoveToPage}
        onCreateNewPage={handleOverflowCreatePage}
      />

      {/* Swap Dialog — shown when dragging to a full page */}
      {swapDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setSwapDialog(null)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl border border-border p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "hsl(232 100% 66% / 0.12)" }}
              >
                <ArrowLeftRight className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{t("overflow.pageFullTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("overflow.pageFullDescription")
                    .replace("{{page}}", String(swapDialog.targetPageIndex + 1))
                    .replace("{{max}}", String(swapDialog.capacity))}
                </p>
              </div>
              <button
                onClick={() => setSwapDialog(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {swapDialog.targetCategoryIds
                .map((catId) => ({ catId, cat: displayData.categories.find((c) => c.id === catId) }))
                .filter(({ cat }) => !!cat)
                .map(({ catId, cat }) => (
                  <button
                    key={catId}
                    onClick={() => {
                      // Swap: move dragged category to target page, move this category to source page
                      setPages((prev) => {
                        return prev.map((p) => {
                          if (p.id === swapDialog.targetPageId) {
                            return {
                              ...p,
                              categoryIds: p.categoryIds.map((cid) =>
                                cid === catId ? swapDialog.draggedCategoryId : cid,
                              ),
                            };
                          }
                          if (p.id === swapDialog.sourcePageId) {
                            return {
                              ...p,
                              categoryIds: p.categoryIds.map((cid) =>
                                cid === swapDialog.draggedCategoryId ? catId : cid,
                              ),
                            };
                          }
                          return p;
                        });
                      });
                      setSwapDialog(null);
                      setTimeout(measureAllOverflows, 400);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground transition-colors text-left"
                    style={{
                      backgroundColor: "hsl(232 100% 66% / 0.06)",
                      border: "1px solid hsl(232 100% 66% / 0.15)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.06)";
                    }}
                  >
                    <ArrowLeftRight className="w-4 h-4 text-primary shrink-0" />
                    {t("overflow.swapWith")} <strong>{cat!.name}</strong>
                  </button>
                ))}

              <button
                onClick={() => setSwapDialog(null)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "hsl(0 84% 60% / 0.08)",
                  border: "1px solid hsl(0 84% 60% / 0.3)",
                  color: "hsl(0 84% 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.15)";
                  e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.08)";
                  e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.3)";
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page Dialog */}
      {deletePageDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeletePageDialog(null)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl border border-border p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "hsl(0 84% 60% / 0.12)" }}
              >
                <Trash2 className="w-5 h-5" style={{ color: "hsl(0 84% 60%)" }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{t("overflow.deletePageTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("overflow.deletePageDescription")
                    .replace("{{page}}", String(deletePageDialog.pageIndex + 1))
                    .replace("{{count}}", String(deletePageDialog.categoryCount))}
                </p>
              </div>
              <button
                onClick={() => setDeletePageDialog(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => executeDeletePage(deletePageDialog.pageIndex, false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground transition-colors text-left"
                style={{
                  backgroundColor: "hsl(232 100% 66% / 0.06)",
                  border: "1px solid hsl(232 100% 66% / 0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.06)";
                }}
              >
                <ArrowRightLeft className="w-4 h-4 text-primary shrink-0" />
                {t("overflow.deletePageOnly")}
              </button>

              <button
                onClick={() => executeDeletePage(deletePageDialog.pageIndex, true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left"
                style={{
                  backgroundColor: "hsl(0 84% 60% / 0.06)",
                  border: "1px solid hsl(0 84% 60% / 0.15)",
                  color: "hsl(0 84% 60%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.06)";
                }}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                {t("overflow.deletePageAndCategories")}
              </button>

              <button
                onClick={() => setDeletePageDialog(null)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Unassigned Categories Pool ──────────────────────────────────────── */

function UnassignedPool({
  categories,
  isDraggingCategory,
  searchQuery,
  collapseSignal,
  expandSignal,
  dragCollapseSignal,
  dragRestoreSignal,
}: {
  categories: Category[];
  isDraggingCategory: boolean;
  searchQuery: string;
  collapseSignal: number;
  expandSignal: number;
  dragCollapseSignal: number;
  dragRestoreSignal: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-drop",
    data: { type: "unassigned" },
  });

  return (
    <div
      ref={setNodeRef}
      className="mt-3 rounded-xl overflow-hidden transition-all duration-200"
      style={{
        border: isOver && isDraggingCategory
          ? "2px dashed hsl(38 92% 50% / 0.5)"
          : "2px dashed hsl(220 13% 85%)",
        backgroundColor: isOver && isDraggingCategory
          ? "hsl(38 92% 50% / 0.05)"
          : "transparent",
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Unassigned ({categories.length})
        </span>
      </div>
      <div className="px-3 pb-3 space-y-3">
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
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
        </SortableContext>
      </div>
    </div>
  );
}