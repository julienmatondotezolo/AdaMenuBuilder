import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { sampleMenu } from "../data/sampleMenu";
import type {
  MenuData,
  MenuItem,
  Category,
  HoveredType,
  Viewport,
  PaperFormat,
  Orientation,
  MenuContextValue,
} from "../types/menu";

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuData, setMenuData] = useState<MenuData>(sampleMenu);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<HoveredType>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [paperFormat, setPaperFormat] = useState<PaperFormat>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [columnCount, setColumnCountRaw] = useState<number>(1);

  const setColumnCount = useCallback((count: number) => {
    const clamped = Math.max(1, Math.min(4, count));
    setColumnCountRaw(clamped);
    setMenuData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => ({
        ...c,
        column: c.column !== undefined ? Math.min(c.column, clamped) : 1,
      })),
    }));
  }, []);

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
    paperFormat,
    setPaperFormat,
    orientation,
    setOrientation,
    columnCount,
    setColumnCount,
    addCategory,
    removeCategory,
    updateCategory,
    addItem,
    removeItem,
    updateItem,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}
