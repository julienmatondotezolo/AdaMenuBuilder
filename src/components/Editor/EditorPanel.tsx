import { useState, type KeyboardEvent } from "react";
import { Plus, X, Check, Search } from "lucide-react";
import { Button, Input } from "ada-design-system";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMenu } from "../../context/MenuContext";
import CategorySection from "./CategorySection";
import MenuItemCard from "./MenuItemCard";
import type { MenuItem } from "../../types/menu";

export default function EditorPanel() {
  const {
    menuData,
    addCategory,
    reorderCategories,
    moveOrReorderItem,
    setDragState,
    dragState,
  } = useMenu();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoryIds = menuData.categories.map((c) => c.id);

  const collisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);
    const activeType = getIdType(activeId);

    if (activeType === "category") {
      const categoryContainers = args.droppableContainers.filter((c) =>
        categoryIds.includes(String(c.id)),
      );
      return closestCorners({ ...args, droppableContainers: categoryContainers });
    }

    return closestCorners(args);
  };

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

  const getIdType = (id: string): "category" | "item" => {
    if (menuData.categories.some((c) => c.id === id)) return "category";
    return "item";
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const activeType = getIdType(activeId);
    setDragState({ activeId, activeType, overId: null, overType: null });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragState((prev) => ({ ...prev, overId: null, overType: null }));
      return;
    }

    const activeId = String(active.id);
    const rawOverId = String(over.id);
    const overId = rawOverId.endsWith("-items") ? rawOverId.replace(/-items$/, "") : rawOverId;
    const activeType = getIdType(activeId);
    const overType = getIdType(overId);

    setDragState((prev) => ({ ...prev, overId, overType }));

    if (activeType === "item" && activeId !== overId) {
      const activeCategory = menuData.categories.find((c) =>
        c.items.some((i) => i.id === activeId),
      );
      const overCategory =
        overType === "category"
          ? menuData.categories.find((c) => c.id === overId)
          : menuData.categories.find((c) =>
              c.items.some((i) => i.id === overId),
            );

      if (activeCategory && overCategory && activeCategory.id !== overCategory.id) {
        moveOrReorderItem(activeId, overId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragState({ activeId: null, activeType: null, overId: null, overType: null });

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const rawOverId = String(over.id);
    const overId = rawOverId.endsWith("-items") ? rawOverId.replace(/-items$/, "") : rawOverId;
    const activeType = getIdType(activeId);

    if (activeType === "category") {
      reorderCategories(activeId, overId);
    } else {
      const activeCategory = menuData.categories.find((c) =>
        c.items.some((i) => i.id === activeId),
      );
      const overCategory = menuData.categories.find((c) =>
        c.items.some((i) => i.id === overId),
      );
      if (activeCategory && overCategory && activeCategory.id === overCategory.id) {
        moveOrReorderItem(activeId, overId);
      }
    }
  };

  const handleDragCancel = () => {
    setDragState({ activeId: null, activeType: null, overId: null, overType: null });
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
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

  return (
    <div className="w-full h-full overflow-y-auto bg-muted/30">
      <div className="p-4">
        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Category list */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {menuData.categories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  isDraggingActive={dragState.activeId !== null}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          </SortableContext>

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
                  searchQuery=""
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Create New Category */}
        <div className="mt-4">
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
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-primary-foreground transition-colors"
              style={{ backgroundColor: 'hsl(232 100% 66%)' }}
            >
              <Plus className="w-4 h-4" />
              Create New Category
            </button>
          )}
        </div>

        {menuData.categories.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">Create your first category to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
