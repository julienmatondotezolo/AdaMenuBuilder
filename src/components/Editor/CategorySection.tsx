import { useState, type KeyboardEvent } from "react";
import { GripVertical, Plus, Trash2, Pencil, Check, X, SeparatorHorizontal, Rows3, Columns } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import MenuItemCard from "./MenuItemCard";
import type { Category } from "../../types/menu";

interface CategorySectionProps {
  category: Category;
}

export default function CategorySection({ category }: CategorySectionProps) {
  const {
    addItem,
    removeCategory,
    updateCategory,
    setHover,
    clearHover,
    hoveredId,
    columnCount,
  } = useMenu();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(category.name);

  const isHighlighted = hoveredId === category.id;
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

  return (
    <div
      className={`transition-all duration-200 ${
        isHighlighted ? "ring-2 ring-indigo-primary/30 rounded-xl" : ""
      }`}
      onMouseEnter={() => setHover(category.id, "category")}
      onMouseLeave={() => clearHover(category.id)}
    >
      <div className="flex items-center gap-2 mb-3">
        <button className="text-gray-300 hover:text-gray-500 cursor-grab p-0.5">
          <GripVertical className="w-5 h-5" />
        </button>

        {isEditingName ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-bold text-base text-gray-900 border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-primary/30"
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditName(category.name);
                setIsEditingName(false);
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h3
            className="font-bold text-base text-gray-900 cursor-pointer"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {category.name}
          </h3>
        )}

        <span className="px-2 py-0.5 bg-indigo-primary/10 text-indigo-primary text-[10px] font-bold rounded-full tracking-wider uppercase">
          {category.items.length}{" "}
          {category.items.length === 1 ? "item" : "items"}
        </span>

        <div className="flex-1" />

        {!isEditingName && (
          <button
            onClick={() => setIsEditingName(true)}
            className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() =>
            updateCategory(category.id, {
              pageBreakMode: pageBreakMode === "category" ? "item" : "category",
            })
          }
          title={pageBreakMode === "category" ? "Page breaks: category level (click to switch to item level)" : "Page breaks: item level (click to switch to category level)"}
          className={`p-1 transition-colors ${
            pageBreakMode === "item"
              ? "text-indigo-primary hover:text-indigo-hover"
              : "text-gray-300 hover:text-gray-500"
          }`}
        >
          <Rows3 className="w-3.5 h-3.5" />
        </button>

        {pageBreakMode === "category" && (
          <button
            onClick={() =>
              updateCategory(category.id, {
                pageBreakBefore: !category.pageBreakBefore,
              })
            }
            title="Page break before this category"
            className={`p-1 transition-colors ${
              category.pageBreakBefore
                ? "text-indigo-primary hover:text-indigo-hover"
                : "text-gray-300 hover:text-gray-500"
            }`}
          >
            <SeparatorHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {columnCount > 1 && (
          <div className="flex items-center gap-0.5" title="Assign to column">
            <Columns className="w-3 h-3 text-gray-400 mr-0.5" />
            {Array.from({ length: columnCount }, (_, i) => i + 1).map((col) => (
              <button
                key={col}
                onClick={() => updateCategory(category.id, { column: col })}
                className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
                  currentColumn === col
                    ? "bg-indigo-primary text-white"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => removeCategory(category.id)}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3 ml-7">
        {category.items.map((item) => (
          <MenuItemCard key={item.id} item={item} categoryId={category.id} showPageBreak={pageBreakMode === "item"} />
        ))}

        <button
          onClick={handleAddItem}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 font-medium hover:border-indigo-primary/30 hover:text-indigo-primary/70 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {singularName}
        </button>
      </div>
    </div>
  );
}
