import { useState, type KeyboardEvent } from "react";
import { Plus, X, Check, Search, ChevronsDownUp, ChevronsUpDown, Type, ImageIcon } from "lucide-react";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMenu } from "../../context/MenuContext";
import CategorySection from "./CategorySection";
import EditorCard from "./EditorCard";
import MenuItemCard from "./MenuItemCard";
import type { MenuItem } from "../../types/menu";

export default function EditorPanel() {
  const {
    menuData,
    setMenuData,
    addCategory,
    reorderCategories,
    moveOrReorderItem,
    setDragState,
    dragState,
  } = useMenu();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  // Increment to signal all categories to collapse/expand
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);
  // Increment to signal all categories to collapse/restore on category drag
  const [dragCollapseSignal, setDragCollapseSignal] = useState(0);
  const [dragRestoreSignal, setDragRestoreSignal] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
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
    setDragRestoreSignal((s) => s + 1);

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
    setDragRestoreSignal((s) => s + 1);
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

  const handleToggleAll = () => {
    if (allCollapsed) {
      setExpandSignal((s) => s + 1);
      setAllCollapsed(false);
    } else {
      setCollapseSignal((s) => s + 1);
      setAllCollapsed(true);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-muted/30">
      {/* Header: title + subtitle */}
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
          style={{ padding: '2px 6px', borderRadius: '6px' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(220 14% 93%)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
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
            style={{ border: '1px solid hsl(220 13% 91%)', paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-muted-foreground transition-colors"
              onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(224 71% 4%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable category list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Menu Header Editor */}
        <EditorCard
          icon={<Type className="w-4 h-4" />}
          title="Menu Header"
          defaultCollapsed
        >
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Subtitle</label>
            <input
              type="text"
              value={menuData.subtitle}
              onChange={(e) => setMenuData((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="e.g. SUMMER COLLECTION"
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Restaurant Name</label>
            <input
              type="text"
              value={menuData.restaurantName}
              onChange={(e) => setMenuData((prev) => ({ ...prev, restaurantName: e.target.value }))}
              placeholder="e.g. Lumière Dining"
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Established Year</label>
            <input
              type="text"
              value={menuData.established}
              onChange={(e) => setMenuData((prev) => ({ ...prev, established: e.target.value }))}
              placeholder="e.g. 2024"
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
            />
          </div>
        </EditorCard>

        <div className="h-4" />

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
                  collapseSignal={collapseSignal}
                  expandSignal={expandSignal}
                  dragCollapseSignal={dragCollapseSignal}
                  dragRestoreSignal={dragRestoreSignal}
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

        {menuData.categories.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">Create your first category to get started</p>
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
            <div className="relative rounded-lg overflow-hidden" style={{ maxHeight: '200px' }}>
              {/* Blurred background fill */}
              <img
                src={menuData.highlightImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
              />
              {/* Actual image, fit in height */}
              <img
                src={menuData.highlightImage}
                alt="Highlight preview"
                className="relative w-full object-contain mx-auto"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Image URL</label>
            <input
              type="text"
              value={menuData.highlightImage}
              onChange={(e) => setMenuData((prev) => ({ ...prev, highlightImage: e.target.value }))}
              placeholder="https://..."
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
            <input
              type="text"
              value={menuData.highlightLabel}
              onChange={(e) => setMenuData((prev) => ({ ...prev, highlightLabel: e.target.value }))}
              placeholder="e.g. TODAY'S HIGHLIGHT"
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <input
              type="text"
              value={menuData.highlightTitle}
              onChange={(e) => setMenuData((prev) => ({ ...prev, highlightTitle: e.target.value }))}
              placeholder="e.g. The Nordic Atlantic Salmon"
              className="w-full h-9 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
              style={{ border: '1px solid hsl(220 13% 91%)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.5)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; }}
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
    </div>
  );
}
