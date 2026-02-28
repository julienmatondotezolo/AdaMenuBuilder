import { useState, type KeyboardEvent } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  UtensilsCrossed,
  Beef,
  CakeSlice,
  Wine,
  Coffee,
  Soup,
  Salad,
  Fish,
} from "lucide-react";
import { Button, Input, cn } from "ada-design-system";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMenu } from "../../context/MenuContext";
import MenuItemCard from "./MenuItemCard";
import type { Category } from "../../types/menu";

/* Map category names to icons */
const CATEGORY_ICONS: Record<string, typeof UtensilsCrossed> = {
  starters: UtensilsCrossed,
  appetizers: UtensilsCrossed,
  "main courses": Beef,
  mains: Beef,
  entrees: Beef,
  desserts: CakeSlice,
  drinks: Wine,
  beverages: Wine,
  wines: Wine,
  cocktails: Wine,
  coffee: Coffee,
  soups: Soup,
  salads: Salad,
  fish: Fish,
  seafood: Fish,
};

function getCategoryIcon(name: string) {
  const Icon = CATEGORY_ICONS[name.toLowerCase()] ?? UtensilsCrossed;
  return <Icon className="w-4 h-4" />;
}

interface CategorySectionProps {
  category: Category;
  isDraggingActive: boolean;
  isDraggingCategory: boolean;
}

export default function CategorySection({
  category,
  isDraggingActive,
  isDraggingCategory,
}: CategorySectionProps) {
  const {
    addItem,
    removeCategory,
    updateCategory,
    setHover,
    clearHover,
    hoveredId,
    dragState,
  } = useMenu();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const { setNodeRef: setDroppableRef, isOver: isItemsOver } = useDroppable({
    id: `${category.id}-items`,
    data: { type: "category", categoryId: category.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHighlighted = hoveredId === category.id;
  const isDragActive = dragState.activeId === category.id;
  const isDragOver =
    dragState.overId === category.id && dragState.activeId !== category.id;

  const handleSaveName = () => {
    if (editName.trim()) {
      updateCategory(category.id, { name: editName.trim() });
    } else {
      setEditName(category.name);
    }
    setIsEditingName(false);
  };

  const handleAddItem = () => {
    addItem(category.id, {
      name: "New Item",
      price: 0,
      description: "",
      featured: false,
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") {
      setEditName(category.name);
      setIsEditingName(false);
    }
  };

  const singularName = category.name.endsWith("s")
    ? category.name.slice(0, -1)
    : category.name;

  const itemIds = category.items.map((i) => i.id);

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDragActive && "ring-2 ring-primary/60 rounded-xl bg-primary/5",
        isDragOver && "ring-2 ring-primary/40 rounded-xl bg-primary/3",
        isHighlighted && !isDraggingActive && "ring-2 ring-primary/30 rounded-xl"
      )}
      onMouseEnter={() => !isDraggingActive && setHover(category.id, "category")}
      onMouseLeave={() => clearHover(category.id)}
    >
      {isDragging ? (
        <div className="flex items-center gap-2 py-2 px-1 opacity-40 border-2 border-dashed border-muted-foreground/30 rounded-xl">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
          <span className="font-bold text-sm uppercase tracking-wider text-foreground">
            {category.name}
          </span>
        </div>
      ) : isDraggingCategory ? (
        <div className="flex items-center gap-2 py-2 px-1 border border-border rounded-xl bg-card">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
          <span className="font-bold text-sm uppercase tracking-wider text-card-foreground">
            {category.name}
          </span>
        </div>
      ) : (
        <>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-1 group/cat">
            {/* Drag handle */}
            <div
              className={cn(
                "text-muted-foreground/30 hover:text-muted-foreground cursor-grab shrink-0",
                "opacity-0 group-hover/cat:opacity-100 transition-opacity",
              )}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Icon */}
            <span className="text-primary shrink-0">
              {getCategoryIcon(category.name)}
            </span>

            {/* Name */}
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-bold text-sm uppercase tracking-wider"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleSaveName}
                  className="text-success hover:text-success"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditName(category.name);
                    setIsEditingName(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h3
                className="font-bold text-sm uppercase tracking-wider text-foreground cursor-pointer"
                onDoubleClick={() => setIsEditingName(true)}
              >
                {category.name}
              </h3>
            )}

            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed((c) => !c)}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isCollapsed && "-rotate-90"
                )}
              />
            </button>

            <div className="flex-1" />

            {/* Delete — hover only */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeCategory(category.id)}
              className="opacity-0 group-hover/cat:opacity-100 text-muted-foreground hover:text-destructive transition-all w-7 h-7"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>

            {/* + ADD ITEM */}
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add item
            </button>
          </div>

          {/* Accent line */}
          <div className="h-px bg-primary/30 mb-4" />

          {/* Items */}
          {!isCollapsed && (
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              <div
                ref={setDroppableRef}
                className={cn(
                  "space-y-3 rounded-lg transition-all duration-150",
                  isItemsOver &&
                    dragState.activeType === "item" &&
                    "ring-1 ring-primary/30 bg-primary/3 p-2 -m-2"
                )}
              >
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    isDraggingActive={isDraggingActive}
                  />
                ))}

                {category.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground/60 text-sm">
                    No items yet — click + Add item above
                  </div>
                )}
              </div>
            </SortableContext>
          )}

          {isCollapsed && (
            <p className="text-xs text-muted-foreground/50 mb-2">
              {category.items.length} {category.items.length === 1 ? "item" : "items"} · double-click name to rename
            </p>
          )}
        </>
      )}
    </div>
  );
}
