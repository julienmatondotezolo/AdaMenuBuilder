import { useState, type KeyboardEvent } from "react";
import { Trash2, Star, SeparatorHorizontal, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Button, Input, Badge, cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import type { MenuItem } from "../../types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  categoryId: string;
  showPageBreak?: boolean;
  isDraggingActive: boolean;
  isOverlay?: boolean;
}

export default function MenuItemCard({
  item,
  categoryId,
  showPageBreak,
  isDraggingActive,
  isOverlay,
}: MenuItemCardProps) {
  const { removeItem, updateItem, setHover, clearHover, hoveredId, dragState } =
    useMenu();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState<number | string>(item.price);
  const [editDesc, setEditDesc] = useState(item.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isOverlay });

  const style = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const isHighlighted = hoveredId === item.id;
  const isDragActive = dragState.activeId === item.id;
  const isDragOver =
    dragState.overId === item.id && dragState.activeId !== item.id;

  const handleSave = () => {
    updateItem(categoryId, item.id, {
      name: editName,
      price: Number(editPrice) || 0,
      description: editDesc,
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditName(item.name);
      setEditPrice(item.price);
      setEditDesc(item.description);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-1",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {/* Drag handle — outside the card */}
      <GripVertical
        className={cn(
          "w-4 h-4 shrink-0 text-muted-foreground transition-opacity",
          isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />

      {/* Card */}
      <Card
        className={cn(
          "flex-1 relative p-4 transition-all duration-200",
          isOverlay &&
            "border-primary/60 bg-card shadow-lg shadow-primary/20 z-50",
          isDragActive &&
            "border-primary/60 bg-primary/8 shadow-md shadow-primary/15 z-50",
          isDragOver &&
            "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10",
          isHighlighted && 
            !isDraggingActive &&
            "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10",
          !isOverlay && 
            !isDragActive && 
            !isDragOver && 
            (!isHighlighted || isDraggingActive) &&
            "border-border bg-card hover:border-muted-foreground"
        )}
        onMouseEnter={() => !isDraggingActive && setHover(item.id, "item")}
        onMouseLeave={() => clearHover(item.id)}
        onDoubleClick={() => !isDragging && setIsEditing(true)}
      >
        <div className="absolute top-3 right-3 flex items-center gap-1">
        {showPageBreak && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              updateItem(categoryId, item.id, {
                pageBreakBefore: !item.pageBreakBefore,
              });
            }}
            title="Page break before this item"
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-all",
              item.pageBreakBefore &&
                "opacity-100! text-primary hover:text-primary/80",
              !item.pageBreakBefore &&
                "text-muted-foreground hover:text-foreground"
            )}
          >
            <SeparatorHorizontal className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            removeItem(categoryId, item.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 font-semibold text-sm"
              placeholder="Item name"
            />
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-1">$</span>
              <Input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-16 font-semibold text-sm text-primary"
                type="number"
                min="0"
                step="1"
              />
            </div>
          </div>
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleKeyDown(e);
            }}
            rows={2}
            className="w-full text-xs text-muted-foreground border border-input rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring focus:border-input resize-none bg-background"
            placeholder="Description"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="text-xs"
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditName(item.name);
                setEditPrice(item.price);
                setEditDesc(item.description);
                setIsEditing(false);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between pr-6">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-sm text-card-foreground">
                {item.name}
              </h4>
              {item.featured && (
                <Badge variant="secondary" className="h-5 px-1">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                </Badge>
              )}
            </div>
            <span className="font-semibold text-sm text-primary">
              ${item.price}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </>
      )}
      </Card>
    </div>
  );
}
