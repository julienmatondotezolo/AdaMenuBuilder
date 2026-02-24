import { useState, type KeyboardEvent } from "react";
import { Plus, X, Check } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMenu } from "../../context/MenuContext";
import CategorySection from "./CategorySection";
import LayoutSection from "./LayoutSection";

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoryIds = menuData.categories.map((c) => c.id);

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
    const overId = event.over ? String(event.over.id) : null;
    const overType = overId ? getIdType(overId) : null;
    setDragState((prev) => ({ ...prev, overId, overType }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragState({ activeId: null, activeType: null, overId: null, overType: null });

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeType = getIdType(activeId);

    if (activeType === "category") {
      reorderCategories(activeId, overId);
    } else {
      moveOrReorderItem(activeId, overId);
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
            <h1 className="text-2xl font-bold text-gray-900">
              {menuData.title}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Last edited {menuData.lastEditedTime} by {menuData.lastEditedBy}
            </p>
          </div>

          {!isAddingCategory && (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {isAddingCategory && (
          <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name (e.g. Desserts)"
              className="flex-1 text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/30 placeholder:text-gray-400"
            />
            <button
              onClick={handleAddCategory}
              className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setNewCategoryName("");
                setIsAddingCategory(false);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <LayoutSection />

        <DndContext
          sensors={sensors}
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {menuData.categories.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No categories yet</p>
            <p className="text-sm mt-1">
              Click the + button above to add your first category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
