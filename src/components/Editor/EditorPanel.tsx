import { useState, type KeyboardEvent } from "react";
import { Plus, X, Check, GripVertical, ChevronDown } from "lucide-react";
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
import HeaderSection from "./HeaderSection";
import LayoutSection from "./LayoutSection";
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
  const [menuItemsOpen, setMenuItemsOpen] = useState(true);

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

  // Find active item for the drag overlay
  const activeItem: (MenuItem & { categoryId: string }) | null = (() => {
    if (!dragState.activeId || dragState.activeType !== "item") return null;
    for (const cat of menuData.categories) {
      const item = cat.items.find((i) => i.id === dragState.activeId);
      if (item) return { ...item, categoryId: cat.id };
    }
    return null;
  })();

  // Find active category for the drag overlay
  const activeCategory = (() => {
    if (!dragState.activeId || dragState.activeType !== "category") return null;
    return menuData.categories.find((c) => c.id === dragState.activeId) ?? null;
  })();

  const getIdType = (
    id: string,
  ): "category" | "item" => {
    if (menuData.categories.some((c) => c.id === id)) return "category";
    return "item";
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    const activeType = getIdType(activeId);
    setDragState({
      activeId,
      activeType,
      overId: null,
      overType: null,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragState((prev) => ({ ...prev, overId: null, overType: null }));
      return;
    }

    const activeId = String(active.id);
    const rawOverId = String(over.id);
    // Resolve "-items" droppable IDs back to the category ID
    const overId = rawOverId.endsWith("-items") ? rawOverId.replace(/-items$/, "") : rawOverId;
    const activeType = getIdType(activeId);
    const overType = getIdType(overId);

    setDragState((prev) => ({ ...prev, overId, overType }));

    // Real-time cross-container item moves for smooth sortable animations
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

      if (
        activeCategory &&
        overCategory &&
        activeCategory.id !== overCategory.id
      ) {
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
      // Same-category reorder (cross-category was already handled in handleDragOver)
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
    <div className="w-full h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {menuData.title}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Last edited {menuData.lastEditedTime} by {menuData.lastEditedBy}
            </p>
          </div>
        </div>

        <HeaderSection />
        <LayoutSection />

        <div className="mb-6 border border-gray-200 rounded-xl">
          <button
            onClick={() => setMenuItemsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Menu Items
            </span>
            <div className="flex items-center gap-2">
              {!isAddingCategory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingCategory(true);
                    if (!menuItemsOpen) setMenuItemsOpen(true);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${menuItemsOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {menuItemsOpen && (
            <div className="px-4 py-4 bg-white">
              {isAddingCategory && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Category name (e.g. Desserts)"
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/30 placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setNewCategoryName("");
                      setIsAddingCategory(false);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                measuring={{
                  droppable: {
                    strategy: MeasuringStrategy.Always,
                  },
                }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={categoryIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-8">
                    {menuData.categories.map((category) => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        isDraggingActive={dragState.activeId !== null}
                        isDraggingCategory={dragState.activeType === "category"}
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
                    <div className="rotate-1 scale-105 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-indigo-primary/30 ring-2 ring-indigo-primary/20">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-base text-gray-900">
                        {activeCategory.name}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-primary/10 text-indigo-primary text-[10px] font-bold rounded-full tracking-wider uppercase">
                        {activeCategory.items.length}{" "}
                        {activeCategory.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

              {menuData.categories.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-lg font-medium">No categories yet</p>
                  <p className="text-sm mt-1">
                    Click the + button above to add your first category
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
