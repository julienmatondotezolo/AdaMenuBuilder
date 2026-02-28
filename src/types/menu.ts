export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  featured: boolean;
  pageBreakBefore?: boolean;
}

export interface Category {
  id: string;
  name: string;
  items: MenuItem[];
  pageBreakBefore?: boolean;
  pageBreakMode?: "category" | "item";
  column?: number;
}

export interface MenuData {
  title: string;
  restaurantName: string;
  subtitle: string;
  established: string;
  highlightImage: string;
  highlightLabel: string;
  highlightTitle: string;
  lastEditedBy: string;
  lastEditedTime: string;
  categories: Category[];
}

export type HoveredType = "item" | "category" | null;

export type Viewport = "mobile" | "tablet" | "desktop" | "paper";

export type Orientation = "portrait" | "landscape";

export type LayoutDirection = "Z" | "N";

export interface DragState {
  activeId: string | null;
  activeType: "item" | "category" | null;
  overId: string | null;
  overType: "item" | "category" | null;
}

export interface MenuContextValue {
  menuData: MenuData;
  setMenuData: React.Dispatch<React.SetStateAction<MenuData>>;
  hoveredId: string | null;
  hoveredType: HoveredType;
  setHover: (id: string, type: "item" | "category") => void;
  clearHover: (id: string) => void;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
  columnCount: number;
  setColumnCount: (count: number) => void;
  layoutDirection: LayoutDirection;
  setLayoutDirection: (direction: LayoutDirection) => void;
  addCategory: (name: string) => void;
  removeCategory: (categoryId: string) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  addItem: (categoryId: string, item: Partial<MenuItem>) => void;
  removeItem: (categoryId: string, itemId: string) => void;
  updateItem: (
    categoryId: string,
    itemId: string,
    updates: Partial<MenuItem>,
  ) => void;
  reorderCategories: (activeCategoryId: string, overCategoryId: string) => void;
  moveOrReorderItem: (
    activeItemId: string,
    overItemOrCategoryId: string,
  ) => void;
  dragState: DragState;
  setDragState: React.Dispatch<React.SetStateAction<DragState>>;
  selectedItemId: string | null;
  selectItem: (id: string | null) => void;
}
