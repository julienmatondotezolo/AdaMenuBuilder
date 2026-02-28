import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react";
import {
  Plus,
  X,
  Check,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  Type,
  ImageIcon,
  Palette,
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
import { useTemplates, useTemplateById } from "../../db/hooks";
import CategorySection from "./CategorySection";
import EditorCard from "./EditorCard";
import PageCard from "./PageCard";
import OverflowDialog from "./OverflowDialog";
import MenuItemCard from "./MenuItemCard";
import type { MenuItem, MenuPage, Category } from "../../types/menu";
import type { MenuTemplate } from "../../types/template";
import { mmToPx } from "../../types/template";
import { uid } from "../../utils/uid";

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
  return Math.max(0, el.scrollHeight - pageHeight);
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

export default function EditorPanel() {
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
    reorderCategories,
    moveOrReorderItem,
    setDragState,
    dragState,
  } = useMenu();

  const currentTemplate = useTemplateById(templateId || undefined);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);
  const [dragCollapseSignal, setDragCollapseSignal] = useState(0);
  const [dragRestoreSignal, setDragRestoreSignal] = useState(0);

  /* ── Overflow dialog state ─────────────────────────────────────── */
  const [overflowDialog, setOverflowDialog] = useState<{
    categoryId: string;
    categoryName: string;
    pageId: string;
    pageIndex: number;
    overflowPx: number;
  } | null>(null);

  /* ── Per-page overflow tracking ────────────────────────────────── */
  const [pageOverflows, setPageOverflows] = useState<Map<number, number>>(
    new Map(),
  );

  const measureAllOverflows = useCallback(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < pages.length; i++) {
      const px = measurePageOverflow(currentTemplate, i);
      if (px > 4) map.set(i, Math.round(px));
    }
    setPageOverflows(map);
  }, [currentTemplate, pages.length]);

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
      setPages([
        {
          id: `page-${uid()}`,
          variantId: firstVariant?.id ?? "",
          categoryIds: menuData.categories.map((c) => c.id),
        },
      ]);
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

      // Move category to target page if not already there
      if (sourcePage?.id !== targetPageId) {
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

      // Remove from all pages
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
            // Cross-page: move to target page at position of overId
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
        } else if (!sourcePage && targetPage) {
          // From unassigned to page at position of overId
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

    // Category — everything handled in dragOver already, just check overflow
    if (wasCategory) {
      setTimeout(() => checkOverflowAfterDrop(activeId), 350);
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

  /* ── Overflow check after category drop ────────────────────────── */
  const checkOverflowAfterDrop = useCallback(
    (categoryId: string) => {
      const page = findPageForCategory(categoryId);
      if (!page || !currentTemplate) return;
      const pageIndex = pages.indexOf(page);
      if (pageIndex === -1) return;

      const overflow = measurePageOverflow(currentTemplate, pageIndex);
      if (overflow > 10) {
        const cat = menuData.categories.find((c) => c.id === categoryId);
        setOverflowDialog({
          categoryId,
          categoryName: cat?.name || "Category",
          pageId: page.id,
          pageIndex,
          overflowPx: Math.round(overflow),
        });
      }
      measureAllOverflows();
    },
    [pages, currentTemplate, menuData.categories, measureAllOverflows],
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
    // Move orphaned categories to previous page (or first page)
    const targetPageIdx = pageIndex > 0 ? pageIndex - 1 : 1;

    setPages((prev) => {
      const targetPage = prev[targetPageIdx];
      return prev
        .map((p, i) => {
          if (i === pageIndex) return null; // remove
          if (p.id === targetPage?.id) {
            return {
              ...p,
              categoryIds: [...p.categoryIds, ...removedPage.categoryIds],
            };
          }
          return p;
        })
        .filter(Boolean) as MenuPage[];
    });

    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2));
    }
    setTimeout(measureAllOverflows, 400);
  };

  const changePageVariant = (pageIndex: number, variantId: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === pageIndex ? { ...p, variantId } : p)),
    );
  };

  /* ── Add category — goes to active page ────────────────────────── */
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const catId = addCategory(newCategoryName.trim());
      // Add to active page
      if (pages.length > 0 && catId) {
        const targetPageIndex = Math.min(activePageIndex, pages.length - 1);
        setPages((prev) =>
          prev.map((p, i) =>
            i === targetPageIndex
              ? { ...p, categoryIds: [...p.categoryIds, catId] }
              : p,
          ),
        );
        // Check overflow after adding
        setTimeout(() => {
          const overflow = measurePageOverflow(currentTemplate, targetPageIndex);
          if (overflow > 10) {
            const cat = menuData.categories.find((c) => c.id === catId) ??
              { name: newCategoryName.trim() };
            setOverflowDialog({
              categoryId: catId,
              categoryName: cat.name,
              pageId: pages[targetPageIndex].id,
              pageIndex: targetPageIndex,
              overflowPx: Math.round(overflow),
            });
          }
          measureAllOverflows();
        }, 400);
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
  const assignedCategoryIds = new Set(pages.flatMap((p) => p.categoryIds));
  const unassignedCategories = menuData.categories.filter(
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
      .map((cid) => menuData.categories.find((c) => c.id === cid))
      .filter(Boolean) as typeof menuData.categories;
  };

  const isDraggingCategory = dragState.activeType === "category";

  return (
    <div className="w-full h-full flex flex-col bg-muted/30">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <h2 className="text-lg font-bold text-foreground">Menu Editor</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Curate your culinary offerings with precision and light.
        </p>
      </div>

      {/* Menu title + fold/unfold */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {menuData.title || "Untitled Menu"}
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
            placeholder="Search menu items..."
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
        {/* Template Selector */}
        <EditorCard
          icon={<Palette className="w-4 h-4" />}
          title="Template"
          defaultCollapsed
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
              Edit template settings →
            </a>
          )}
        </EditorCard>

        <div className="h-4" />

        {/* Menu Header Editor */}
        <EditorCard
          icon={<Type className="w-4 h-4" />}
          title="Menu Header"
          defaultCollapsed
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Subtitle
            </label>
            <input
              type="text"
              value={menuData.subtitle}
              onChange={(e) =>
                setMenuData((prev) => ({ ...prev, subtitle: e.target.value }))
              }
              placeholder="e.g. SUMMER COLLECTION"
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
              Restaurant Name
            </label>
            <input
              type="text"
              value={menuData.restaurantName}
              onChange={(e) =>
                setMenuData((prev) => ({
                  ...prev,
                  restaurantName: e.target.value,
                }))
              }
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
              Established Year
            </label>
            <input
              type="text"
              value={menuData.established}
              onChange={(e) =>
                setMenuData((prev) => ({
                  ...prev,
                  established: e.target.value,
                }))
              }
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
        </EditorCard>

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
          <div className="space-y-3">
            {pages.map((page, pageIndex) => (
              <PageCard
                key={page.id}
                page={page}
                pageIndex={pageIndex}
                categories={getPageCategories(page)}
                template={currentTemplate}
                isActive={activePageIndex === pageIndex}
                totalPages={pages.length}
                overflowPx={pageOverflows.get(pageIndex) ?? 0}
                isDraggingCategory={isDraggingCategory}
                onActivate={() => setActivePageIndex(pageIndex)}
                onRemove={() => removePage(pageIndex)}
                onChangeVariant={(v) => changePageVariant(pageIndex, v)}
                onAddItem={(catId) => {
                  /* handled by CategorySection */
                }}
                searchQuery={searchQuery}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
                dragCollapseSignal={dragCollapseSignal}
                dragRestoreSignal={dragRestoreSignal}
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
          <button
            onClick={addPage}
            className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors"
            style={{ border: "2px dashed hsl(220 13% 88%)" }}
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
            Add Page
          </button>

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

        {menuData.categories.length === 0 && pages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">
              Create your first category to get started
            </p>
          </div>
        )}

        <div className="h-4" />

        {/* Highlight Image Editor */}
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

      {/* Fixed bottom — Create New Category */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-background">
        {isAddingCategory ? (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
            <Input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name (e.g. Desserts)"
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
      </div>

      {/* Overflow Dialog */}
      <OverflowDialog
        open={!!overflowDialog}
        onClose={() => setOverflowDialog(null)}
        categoryName={overflowDialog?.categoryName ?? ""}
        pageIndex={overflowDialog?.pageIndex ?? 0}
        overflowPx={overflowDialog?.overflowPx ?? 0}
        availablePages={overflowAvailablePages}
        onKeep={handleOverflowKeep}
        onMoveToPage={handleOverflowMoveToPage}
        onCreateNewPage={handleOverflowCreatePage}
      />
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