import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { sampleMenu } from "../data/sampleMenu";
import type {
  MenuData,
  MenuItem,
  Category,
  HoveredType,
  Viewport,
  Orientation,
  LayoutDirection,
  MenuContextValue,
  DragState,
} from "../types/menu";

const MenuContext = createContext<MenuContextValue | null>(null);

const INITIAL_DRAG_STATE: DragState = {
  activeId: null,
  activeType: null,
  overId: null,
  overType: null,
};

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuData, setMenuData] = useState<MenuData>(sampleMenu);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<HoveredType>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [columnCount, setColumnCountRaw] = useState<number>(1);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>("N");

  const setColumnCount = useCallback((count: number) => {
    const clamped = Math.max(1, Math.min(4, count));
    setColumnCountRaw(clamped);
    setMenuData((prev) => ({
      ...prev,
      categories: prev.categories.map((c, index) => ({
        ...c,
        column: (index % clamped) + 1,
      })),
    }));
  }, []);
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);

  // ---- Category CRUD ----
  const addCategory = useCallback((name: string) => {
    setMenuData((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          id: `cat-${crypto.randomUUID()}`,
          name,
          items: [],
        },
      ],
    }));
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setMenuData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
    }));
  }, []);

  const updateCategory = useCallback(
    (categoryId: string, updates: Partial<Category>) => {
      setMenuData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, ...updates } : c,
        ),
      }));
    },
    [],
  );

  // ---- Item CRUD ----
  const addItem = useCallback(
    (categoryId: string, item: Partial<MenuItem>) => {
      const newItem: MenuItem = {
        id: `item-${crypto.randomUUID()}`,
        name: item.name || "New Item",
        price: item.price || 0,
        description: item.description || "",
        featured: item.featured || false,
      };
      setMenuData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId ? { ...c, items: [...c.items, newItem] } : c,
        ),
      }));
    },
    [],
  );

  const removeItem = useCallback((categoryId: string, itemId: string) => {
    setMenuData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c,
      ),
    }));
  }, []);

  const updateItem = useCallback(
    (categoryId: string, itemId: string, updates: Partial<MenuItem>) => {
      setMenuData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === itemId ? { ...i, ...updates } : i,
                ),
              }
            : c,
        ),
      }));
    },
    [],
  );

  // ---- Drag reorder/move ----
  const reorderCategories = useCallback(
    (activeCategoryId: string, overCategoryId: string) => {
      setMenuData((prev) => {
        const oldIndex = prev.categories.findIndex(
          (c) => c.id === activeCategoryId,
        );
        const newIndex = prev.categories.findIndex(
          (c) => c.id === overCategoryId,
        );
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return prev;
        return {
          ...prev,
          categories: arrayMove(prev.categories, oldIndex, newIndex),
        };
      });
    },
    [],
  );

  const moveOrReorderItem = useCallback(
    (activeItemId: string, overItemOrCategoryId: string) => {
      setMenuData((prev) => {
        // Find source category and item
        let sourceCategory: Category | undefined;
        let sourceItemIndex = -1;
        for (const cat of prev.categories) {
          const idx = cat.items.findIndex((i) => i.id === activeItemId);
          if (idx !== -1) {
            sourceCategory = cat;
            sourceItemIndex = idx;
            break;
          }
        }
        if (!sourceCategory || sourceItemIndex === -1) return prev;

        const movingItem = sourceCategory.items[sourceItemIndex];

        // Check if dropping over a category (empty or end-of-list drop)
        const isOverCategory = prev.categories.some(
          (c) => c.id === overItemOrCategoryId,
        );

        if (isOverCategory) {
          const targetCategoryId = overItemOrCategoryId;
          if (sourceCategory.id === targetCategoryId) return prev;

          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id === sourceCategory!.id) {
                return {
                  ...c,
                  items: c.items.filter((i) => i.id !== activeItemId),
                };
              }
              if (c.id === targetCategoryId) {
                return { ...c, items: [...c.items, movingItem] };
              }
              return c;
            }),
          };
        }

        // Dropping over another item
        let targetCategory: Category | undefined;
        let targetItemIndex = -1;
        for (const cat of prev.categories) {
          const idx = cat.items.findIndex((i) => i.id === overItemOrCategoryId);
          if (idx !== -1) {
            targetCategory = cat;
            targetItemIndex = idx;
            break;
          }
        }
        if (!targetCategory || targetItemIndex === -1) return prev;

        if (sourceCategory.id === targetCategory.id) {
          // Same category reorder
          return {
            ...prev,
            categories: prev.categories.map((c) => {
              if (c.id === sourceCategory!.id) {
                return {
                  ...c,
                  items: arrayMove(c.items, sourceItemIndex, targetItemIndex),
                };
              }
              return c;
            }),
          };
        }

        // Cross-category move: insert at target position
        return {
          ...prev,
          categories: prev.categories.map((c) => {
            if (c.id === sourceCategory!.id) {
              return {
                ...c,
                items: c.items.filter((i) => i.id !== activeItemId),
              };
            }
            if (c.id === targetCategory!.id) {
              const newItems = [...c.items];
              newItems.splice(targetItemIndex, 0, movingItem);
              return { ...c, items: newItems };
            }
            return c;
          }),
        };
      });
    },
    [],
  );

  // ---- Hover helpers ----
  const setHover = useCallback((id: string, type: "item" | "category") => {
    setHoveredId(id);
    setHoveredType(type);
  }, []);

  const clearHover = useCallback((id: string) => {
    setHoveredId((prev) => (prev === id ? null : prev));
    setHoveredType((prev) => (prev === null ? null : prev));
  }, []);

  const value: MenuContextValue = {
    menuData,
    setMenuData,
    hoveredId,
    hoveredType,
    setHover,
    clearHover,
    viewport,
    setViewport,
    orientation,
    setOrientation,
    columnCount,
    setColumnCount,
    layoutDirection,
    setLayoutDirection,
    addCategory,
    removeCategory,
    updateCategory,
    addItem,
    removeItem,
    updateItem,
    reorderCategories,
    moveOrReorderItem,
    dragState,
    setDragState,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}
