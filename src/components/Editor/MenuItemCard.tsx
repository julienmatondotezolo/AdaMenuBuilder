import { useState, type KeyboardEvent } from "react";
import { Trash2, GripVertical, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Badge, cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import type { MenuItem } from "../../types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  categoryId: string;
  isDraggingActive: boolean;
  isOverlay?: boolean;
}

export default function MenuItemCard({
  item,
  categoryId,
  isDraggingActive,
  isOverlay,
}: MenuItemCardProps) {
  const { removeItem, updateItem, setHover, clearHover, dragState, selectedItemId, selectItem } =
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
        "menu-item-card group relative rounded-lg transition-all duration-150 cursor-pointer",
        "border border-border/40 bg-background",
        /* Selected */
        isSelected && !isEditing && "selected",
        /* Editing */
        isEditing && "selected",
        /* Featured — accent */
        item.featured && !isSelected && !isEditing && "border-l-[3px] border-l-warning",
        /* Overlay / drag */
        isOverlay && "shadow-lg border-primary/60 z-50",
        isDragOver && "border-primary/50",
      )}
      onMouseEnter={() => !isDraggingActive && setHover(item.id, "item")}
      onMouseLeave={() => clearHover(item.id)}
    >
      <div className="flex gap-3 p-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-start pt-1 shrink-0 text-muted-foreground/25 transition-colors",
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
                  €{item.price.toFixed(2)}
                </span>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Action buttons — only when selected */}
              {isSelected && (
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="edit-action-btn flex items-center gap-1 h-auto text-xs font-medium px-2 py-1 rounded border border-border bg-white/50 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(categoryId, item.id);
                    }}
                    className="delete-action-btn flex items-center gap-1 h-auto text-xs font-medium px-2 py-1 rounded border border-border bg-white/50 transition-colors"
                    style={{ color: 'hsl(346 87% 43%)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {/* Status dot */}
                  <div className="flex-1" />
                  <div className="w-3 h-3 rounded-full bg-success border-2 border-success/30" />
                </div>
              )}

              {/* Status dot when not selected */}
              {!isSelected && (
                <div className="flex justify-end mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
