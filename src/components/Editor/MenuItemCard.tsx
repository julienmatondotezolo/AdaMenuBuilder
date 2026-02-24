import { useState, type KeyboardEvent } from "react";
import { Trash2, Star, SeparatorHorizontal, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMenu } from "../../context/MenuContext";
import type { MenuItem } from "../../types/menu";

interface MenuItemCardProps {
  item: MenuItem;
  categoryId: string;
  showPageBreak?: boolean;
  isDraggingActive: boolean;
}

export default function MenuItemCard({
  item,
  categoryId,
  showPageBreak,
  isDraggingActive,
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
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
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
      className={`group relative border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        isDragActive
          ? "border-indigo-primary/60 bg-indigo-primary/8 shadow-md shadow-indigo-primary/15 z-50"
          : isDragOver
            ? "border-indigo-primary/50 bg-indigo-primary/5 shadow-sm shadow-indigo-primary/10"
            : isHighlighted && !isDraggingActive
              ? "border-indigo-primary/50 bg-indigo-primary/5 shadow-sm shadow-indigo-primary/10"
              : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      onMouseEnter={() => !isDraggingActive && setHover(item.id, "item")}
      onMouseLeave={() => clearHover(item.id)}
      onDoubleClick={() => !isDragging && setIsEditing(true)}
    >
      {/* Drag handle */}
      <button
        className={`absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${
          isDragging ? "cursor-grabbing opacity-100" : "cursor-grab"
        }`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="absolute top-3 right-3 flex items-center gap-1">
        {showPageBreak && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateItem(categoryId, item.id, {
                pageBreakBefore: !item.pageBreakBefore,
              });
            }}
            title="Page break before this item"
            className={`opacity-0 group-hover:opacity-100 p-1 transition-all ${
              item.pageBreakBefore
                ? "opacity-100! text-indigo-primary hover:text-indigo-hover"
                : "text-gray-400 hover:text-gray-500"
            }`}
          >
            <SeparatorHorizontal className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeItem(categoryId, item.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 font-semibold text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-primary/30"
              placeholder="Item name"
            />
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-1">$</span>
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-16 font-semibold text-sm text-indigo-primary border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-primary/30"
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
            className="w-full text-xs text-gray-600 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-primary/30 resize-none"
            placeholder="Description"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-xs font-medium text-white bg-indigo-primary rounded-md hover:bg-indigo-hover transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditName(item.name);
                setEditPrice(item.price);
                setEditDesc(item.description);
                setIsEditing(false);
              }}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between pr-6">
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-sm text-gray-900">
                {item.name}
              </h4>
              {item.featured && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              )}
            </div>
            <span className="font-semibold text-sm text-indigo-primary">
              ${item.price}
            </span>
          </div>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}
        </>
      )}
    </div>
  );
}
