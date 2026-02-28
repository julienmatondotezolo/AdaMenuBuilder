import { useState, type KeyboardEvent } from "react";
import { Trash2, Star, GripVertical, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Badge, cn } from "ada-design-system";
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
  isDraggingActive,
  isOverlay,
}: MenuItemCardProps) {
  const { removeItem, updateItem, setHover, clearHover, hoveredId, dragState, selectedItemId, selectItem } =
    useMenu();
  const [isEditing, setIsEditing] = useState(false);
  const isSelected = selectedItemId === item.id;
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

  const isHovered = hoveredId === item.id;
  const isDragOver =
    dragState.overId === item.id && dragState.activeId !== item.id;
  const showActions = isSelected;

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
      selectItem(null);
    }
  };

  const handleCardClick = () => {
    if (!isDragging && !isEditing) {
      selectItem(item.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={cn(
        "group relative rounded-lg transition-all duration-150 cursor-pointer",
        "border border-border/60 bg-card",
        /* Hover — light blue bg */
        "hover:bg-[hsl(232,100%,66%,0.05)]",
        /* Selected — blue border + blue bg */
        isSelected && !isEditing && "border-primary bg-[hsl(232,100%,66%,0.05)]",
        /* Editing — blue border, stronger */
        isEditing && "border-primary ring-1 ring-primary/30",
        /* Featured — yellow left accent */
        item.featured && !isSelected && !isEditing && "border-l-[3px] border-l-warning",
        item.featured && (isSelected || isEditing) && "border-l-[3px] border-l-primary",
        /* Overlay / drag states */
        isOverlay && "shadow-lg border-primary/60 z-50",
        isDragOver && "border-primary/50 bg-primary/5",
      )}
      onMouseEnter={() => !isDraggingActive && setHover(item.id, "item")}
      onMouseLeave={() => clearHover(item.id)}
    >
      <div className="flex gap-3 p-3.5">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-start pt-0.5 shrink-0 text-muted-foreground/30 transition-colors",
            "hover:text-muted-foreground cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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
                  <span className="text-sm text-muted-foreground mr-1">€</span>
                  <Input
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-16 font-semibold text-sm"
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
                className="w-full text-xs text-muted-foreground border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-background"
                placeholder="Description"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="text-xs">
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
                    selectItem(null);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Name + price row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground leading-snug">
                    {item.name}
                  </h4>
                  {item.featured && (
                    <Badge className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 bg-warning/15 text-warning border border-warning/30">
                      Popular
                    </Badge>
                  )}
                </div>
                <span className="font-bold text-sm text-primary shrink-0">
                  €{item.price}
                </span>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Action buttons — only on hover or selected */}
              {showActions && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="h-5 text-[10px] font-medium px-2 bg-white/50"
                  >
                    <Pencil className="w-2.5 h-2.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(categoryId, item.id);
                    }}
                    className="h-5 text-[10px] font-medium px-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    <Trash2 className="w-2.5 h-2.5 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
