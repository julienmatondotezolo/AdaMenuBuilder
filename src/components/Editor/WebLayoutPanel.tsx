import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Type as TypeIcon,
  Image as ImageIcon,
  Star,
  Info,
  Navigation,
  Footprints,
  Search,
} from "lucide-react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ada-design-system";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { uid } from "../../utils/uid";
import type { WebLayout, WebBlock, WebBlockType } from "../../types/template";
import WebBlockSettings from "./WebBlockSettings";

interface Props {
  webLayout: WebLayout;
  onChange: (layout: WebLayout) => void;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}

const BLOCK_META: Record<WebBlockType, { label: string; icon: typeof TypeIcon }> = {
  "hero":               { label: "Hero Banner",       icon: LayoutGrid },
  "category-nav":       { label: "Category Nav",      icon: Navigation },
  "menu-section":       { label: "Menu Section",      icon: TypeIcon },
  "featured-spotlight": { label: "Featured",          icon: Star },
  "image-banner":       { label: "Image Banner",      icon: ImageIcon },
  "info-bar":           { label: "Info Bar",           icon: Info },
  "search":             { label: "Search",             icon: Search },
  "footer":             { label: "Footer",             icon: Footprints },
};

function createBlock(type: WebBlockType): WebBlock {
  const id = `wb-${uid()}`;
  switch (type) {
    case "hero":
      return { id, type, height: 200, textAlign: "center", backgroundOverlayOpacity: 0.4 };
    case "category-nav":
      return { id, type, style: "pills", sticky: true };
    case "menu-section":
      return { id, type, columns: 1, itemStyle: "compact", pricePosition: "right" };
    case "featured-spotlight":
      return { id, type, layout: "horizontal", maxItems: 4 };
    case "image-banner":
      return { id, type, height: 180, objectFit: "cover" };
    case "info-bar":
      return { id, type, items: [], layout: "row" };
    case "search":
      return { id, type, placeholder: "Search menu..." };
    case "footer":
      return { id, type, showAddress: true, showPhone: true, customText: "" };
  }
}

function SortableBlockCard({ block, isSelected, onSelect, onRemove, children }: {
  block: WebBlock;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const meta = BLOCK_META[block.type];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn("rounded-lg border transition-all", isSelected && "ring-1 ring-primary/30")}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-lg",
          isSelected ? "bg-primary/5" : "bg-background hover:bg-muted/30",
        )}
        onClick={onSelect}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium flex-1 truncate">{meta.label}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-5 w-5 shrink-0 text-destructive/60 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {isSelected && children && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function WebLayoutPanel({ webLayout, onChange, selectedBlockId, onSelectBlock }: Props) {
  const [addBlockType, setAddBlockType] = useState<WebBlockType>("menu-section");
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateBlock = (blockId: string, updates: Partial<WebBlock>) => {
    onChange({
      ...webLayout,
      blocks: webLayout.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } as WebBlock : b
      ),
    });
  };

  const removeBlock = (blockId: string) => {
    onChange({ ...webLayout, blocks: webLayout.blocks.filter((b) => b.id !== blockId) });
    if (selectedBlockId === blockId) onSelectBlock(null);
  };

  const addBlock = () => {
    const newBlock = createBlock(addBlockType);
    onChange({ ...webLayout, blocks: [...webLayout.blocks, newBlock] });
    onSelectBlock(newBlock.id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDragActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = webLayout.blocks.findIndex((b) => b.id === active.id);
    const newIdx = webLayout.blocks.findIndex((b) => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onChange({ ...webLayout, blocks: arrayMove(webLayout.blocks, oldIdx, newIdx) });
  };

  return (
    <div className="space-y-3">
      {/* Spacing controls */}
      <div className="space-y-2 pb-3 border-b border-border/50">
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Web Layout Spacing</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Section Gap</Label>
            <input
              type="number"
              className="w-full h-7 text-xs px-2 rounded border border-border bg-background"
              value={webLayout.spacing.sectionGap}
              min={0} max={80}
              onChange={(e) => onChange({ ...webLayout, spacing: { ...webLayout.spacing, sectionGap: Number(e.target.value) } })}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Padding X</Label>
            <input
              type="number"
              className="w-full h-7 text-xs px-2 rounded border border-border bg-background"
              value={webLayout.spacing.contentPaddingX}
              min={0} max={60}
              onChange={(e) => onChange({ ...webLayout, spacing: { ...webLayout.spacing, contentPaddingX: Number(e.target.value) } })}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Max Width</Label>
            <input
              type="number"
              className="w-full h-7 text-xs px-2 rounded border border-border bg-background"
              value={webLayout.spacing.contentMaxWidth}
              min={320} max={1200}
              onChange={(e) => onChange({ ...webLayout, spacing: { ...webLayout.spacing, contentMaxWidth: Number(e.target.value) } })}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Border Radius</Label>
            <input
              type="number"
              className="w-full h-7 text-xs px-2 rounded border border-border bg-background"
              value={webLayout.borderRadius}
              min={0} max={24}
              onChange={(e) => onChange({ ...webLayout, borderRadius: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Block list */}
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Blocks</Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={webLayout.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {webLayout.blocks.map((block) => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(selectedBlockId === block.id ? null : block.id)}
                  onRemove={() => removeBlock(block.id)}
                >
                  <WebBlockSettings
                    block={block}
                    onChange={(updates) => updateBlock(block.id, updates)}
                  />
                </SortableBlockCard>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {dragActiveId && (() => {
              const block = webLayout.blocks.find((b) => b.id === dragActiveId);
              if (!block) return null;
              const meta = BLOCK_META[block.type];
              const Icon = meta.icon;
              return (
                <div className="rounded-lg border bg-background shadow-md px-3 py-2 flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{meta.label}</span>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Add block */}
      <div className="flex gap-1.5">
        <Select value={addBlockType} onValueChange={(v) => setAddBlockType(v as WebBlockType)}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(BLOCK_META) as WebBlockType[]).map((type) => (
              <SelectItem key={type} value={type}>{BLOCK_META[type].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={addBlock}>
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
