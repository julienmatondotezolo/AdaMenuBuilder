import { useState, type KeyboardEvent } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  SeparatorHorizontal,
  Rows3,
  Columns,
} from "lucide-react";
import { Button, Badge, Input, cn } from "ada-design-system";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMenu } from "../../context/MenuContext";
import MenuItemCard from "./MenuItemCard";
import type { Category } from "../../types/menu";

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
    columnCount,
  } = useMenu();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(category.name);

  // Sortable for the category row itself
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  // Droppable for the items list (allows dropping items into empty categories)
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
  const pageBreakMode = category.pageBreakMode ?? "category";
  const currentColumn = category.column ?? 1;

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
          <span className="font-bold text-base text-foreground">{category.name}</span>
          <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
            {category.items.length} {category.items.length === 1 ? "item" : "items"}
          </Badge>
        </div>
      ) : isDraggingCategory ? (
        <div className="flex items-center gap-2 py-2 px-1 border border-border rounded-xl bg-card">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
          <span className="font-bold text-base text-card-foreground">{category.name}</span>
          <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
            {category.items.length} {category.items.length === 1 ? "item" : "items"}
          </Badge>
        </div>
      ) : (
      <>
      <div className="flex items-center gap-2 mb-3">
        {/* Drag handle — only this element activates the drag */}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-muted-foreground hover:text-foreground p-0.5 cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </Button>

        {isEditingName ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-bold text-base"
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
            className="font-bold text-base text-foreground cursor-pointer"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {category.name}
          </h3>
        )}

        <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
          {category.items.length} {category.items.length === 1 ? "item" : "items"}
        </Badge>

        <div className="flex-1" />

        {!isEditingName && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsEditingName(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            updateCategory(category.id, {
              pageBreakMode: pageBreakMode === "category" ? "item" : "category",
            })
          }
          title={
            pageBreakMode === "category"
              ? "Page breaks: category level (click to switch to item level)"
              : "Page breaks: item level (click to switch to category level)"
          }
          className={cn(
            pageBreakMode === "item"
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Rows3 className="w-3.5 h-3.5" />
        </Button>

        {pageBreakMode === "category" && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              updateCategory(category.id, {
                pageBreakBefore: !category.pageBreakBefore,
              })
            }
            title="Page break before this category"
            className={cn(
              category.pageBreakBefore
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SeparatorHorizontal className="w-3.5 h-3.5" />
          </Button>
        )}

        {columnCount > 1 && (
          <div className="flex items-center gap-0.5" title="Assign to column">
            <Columns className="w-3 h-3 text-muted-foreground mr-0.5" />
            {Array.from({ length: columnCount }, (_, i) => i + 1).map((col) => (
              <Button
                key={col}
                variant={currentColumn === col ? "default" : "ghost"}
                size="tiny"
                onClick={() => updateCategory(category.id, { column: col })}
                className={cn(
                  "w-5 h-5 text-[10px] font-bold",
                  currentColumn === col
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {col}
              </Button>
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeCategory(category.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className={cn(
            "space-y-3 ml-7 rounded-lg transition-all duration-150",
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
              showPageBreak={pageBreakMode === "item"}
              isDraggingActive={isDraggingActive}
            />
          ))}

          <Button
            variant="outline"
            onClick={handleAddItem}
            className="ml-5 w-[calc(100%-1.25rem)] flex items-center justify-center gap-1.5 py-2.5 border-dashed text-muted-foreground font-medium hover:border-primary/30 hover:text-primary/70"
          >
            <Plus className="w-4 h-4" />
            Add {singularName}
          </Button>
        </div>
      </SortableContext>
      </>
      )}
    </div>
  );
}
