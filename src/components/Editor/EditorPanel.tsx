import { useState, type KeyboardEvent } from "react";
import { Plus, X, Check, GripVertical, ChevronDown } from "lucide-react";
import { Button, Input, Card, CardContent, Badge, cn } from "ada-design-system";
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
            <h1 className="text-2xl font-bold text-foreground">
              {menuData.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Last edited {menuData.lastEditedTime} by {menuData.lastEditedBy}
            </p>
          </div>
        </div>

        <HeaderSection />
        <LayoutSection />

        <Card className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setMenuItemsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors rounded-t-lg rounded-b-none"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menu Items
            </span>
            <div className="flex items-center gap-2">
              {!isAddingCategory && (
                <Button
                  size="icon-sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingCategory(true);
                    if (!menuItemsOpen) setMenuItemsOpen(true);
                  }}
                  className="w-6 h-6 rounded-full bg-success hover:bg-success/90"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  menuItemsOpen && "rotate-180"
                )}
              />
            </div>
          </Button>

          {menuItemsOpen && (
            <CardContent className="px-4 py-4">
              {isAddingCategory && (
                <Card className="flex items-center gap-2 mb-4 p-3 bg-muted">
                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Category name (e.g. Desserts)"
                    className="flex-1"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleAddCategory}
                    className="text-success hover:text-success"
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setNewCategoryName("");
                      setIsAddingCategory(false);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </Card>
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
                    <div className="rotate-1 scale-105 flex items-center gap-2 px-3 py-2 bg-card rounded-xl shadow-lg border border-primary/30 ring-2 ring-primary/20">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <span className="font-bold text-base text-card-foreground">
                        {activeCategory.name}
                      </span>
                      <Badge className="bg-primary/10 text-primary text-[10px] font-bold rounded-full tracking-wider uppercase">
                        {activeCategory.items.length}{" "}
                        {activeCategory.items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>

              {menuData.categories.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg font-medium">No categories yet</p>
                  <p className="text-sm mt-1">
                    Click the + button above to add your first category
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
