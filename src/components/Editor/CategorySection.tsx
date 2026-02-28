import { useState, useEffect, type KeyboardEvent } from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  Pencil,
  UtensilsCrossed,
  Beef,
  CakeSlice,
  Wine,
  Coffee,
  Soup,
  Salad,
  Fish,
} from "lucide-react";
import { Button, Badge, Input, cn } from "ada-design-system";
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
  isOverlay?: boolean;
  searchQuery: string;
  collapseSignal: number;
  expandSignal: number;
}

export default function CategorySection({
  category,
  isDraggingActive,
  isOverlay,
  searchQuery,
  collapseSignal,
  expandSignal,
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

  // Respond to collapse/expand all signals
  useEffect(() => {
    if (collapseSignal > 0) setIsCollapsed(true);
  }, [collapseSignal]);

  useEffect(() => {
    if (expandSignal > 0) setIsCollapsed(false);
  }, [expandSignal]);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: isOverlay });

  const { setNodeRef: setDroppableRef, isOver: isItemsOver } = useDroppable({
    id: `${category.id}-items`,
    data: { type: "category", categoryId: category.id },
  });

  const style = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  const isHighlighted = hoveredId === category.id;
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

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(category.name);
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setEditName(category.name);
    setIsEditingName(false);
  };

  const handleAddItem = () => {
    addItem(category.id, {
      name: "New Item",
      price: 0,
      description: "",
      featured: false,
    });
    if (isCollapsed) setIsCollapsed(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") handleCancelEdit();
  };

  const handleHeaderClick = () => {
    if (!isEditingName) {
      setIsCollapsed((c) => !c);
    }
  };

  // Filter items by search
  const filteredItems = searchQuery
    ? category.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : category.items;

  const itemIds = filteredItems.map((i) => i.id);

  const isExpanded = !isCollapsed;

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-200",
        "border border-border bg-card",
        isDragging && "border-2 border-dashed border-primary/40",
        isDragOver && "ring-2 ring-primary/40",
        isHighlighted && !isDraggingActive && "ring-1 ring-primary/20",
        isOverlay && "shadow-xl border-primary/50",
      )}
      onMouseEnter={() => !isDraggingActive && setHover(category.id, "category")}
      onMouseLeave={() => clearHover(category.id)}
    >
      {/* ── Category Header ─────────────────────────────────────────── */}
      <div
        className={cn(
          "category-header flex items-center gap-2 px-4 py-3 select-none transition-colors duration-200",
          isExpanded && "category-expanded"
        )}
        onClick={handleHeaderClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Drag handle — icon */}
        <span
          className={cn("shrink-0 cursor-grab", isExpanded ? "text-white/80" : "text-muted-foreground")}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          {getCategoryIcon(category.name)}
        </span>

        {/* Name or Edit input */}
        {isEditingName ? (
          <div className="flex items-center gap-1.5" style={{ width: '50%' }} onClick={(e) => e.stopPropagation()}>
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "font-bold text-sm h-7",
                isCollapsed ? "bg-white border-border text-foreground" : "bg-white/20 border-white/30 text-white"
              )}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSaveName}
              className={isCollapsed ? "text-foreground hover:text-foreground/80" : "text-white hover:text-white/80"}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              className={isCollapsed ? "text-muted-foreground hover:text-foreground" : "text-white/60 hover:text-white"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <h3
            className={cn(
              "font-bold text-sm",
              isExpanded ? "text-white" : "text-foreground"
            )}
          >
            {category.name}
          </h3>
        )}

        {/* Edit button (pencil) — left of item count */}
        {!isEditingName && (
          <button
            onClick={handleStartEdit}
            className={cn(
              "shrink-0 p-0.5 rounded transition-colors",
              isExpanded
                ? "text-white/60 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}

        <div className="flex-1" />

        {/* Delete — shown on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeCategory(category.id);
          }}
          className={cn(
            "shrink-0 opacity-0 hover:opacity-100 transition-all group-hover/cat:opacity-100",
            isExpanded ? "text-white/60 hover:text-red-300" : "text-muted-foreground hover:text-red-500"
          )}
          style={{ opacity: isHighlighted ? 1 : undefined }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Item count badge — right side, next to chevron */}
        <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={isCollapsed
            ? { backgroundColor: 'hsl(220 14% 90%)', color: 'hsl(220 9% 46%)' }
            : { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }
          }
        >
          {category.items.length} {category.items.length === 1 ? "ITEM" : "ITEMS"}
        </Badge>

        {/* Collapse chevron */}
        <span
          className={cn(
            "shrink-0 transition-colors",
            isExpanded ? "text-white" : "text-muted-foreground"
          )}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isCollapsed && "-rotate-90"
            )}
          />
        </span>
      </div>

      {/* ── Category Body (items) ───────────────────────────────────── */}
      {isExpanded && (
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setDroppableRef}
            className={cn(
              "px-3 py-3 space-y-2",
              isItemsOver &&
                dragState.activeType === "item" &&
                "bg-primary/5"
            )}
          >
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                categoryId={category.id}
                isDraggingActive={isDraggingActive}
              />
            ))}

            {filteredItems.length === 0 && searchQuery && (
              <p className="text-center py-4 text-muted-foreground/50 text-xs">
                No matching items
              </p>
            )}

            {filteredItems.length === 0 && !searchQuery && (
              <p className="text-center py-4 text-muted-foreground/50 text-xs">
                No items yet
              </p>
            )}

            {/* + Add Item */}
            <button
              onClick={handleAddItem}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-muted-foreground border border-dashed border-border bg-muted/30 transition-colors"
              style={{ borderColor: 'hsl(220 13% 91%)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(232 100% 66% / 0.4)'; e.currentTarget.style.color = 'hsl(232 100% 66%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(220 13% 91%)'; e.currentTarget.style.color = ''; }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>
        </SortableContext>
      )}
    </div>
  );
}
