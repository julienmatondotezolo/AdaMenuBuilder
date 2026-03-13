import type { WebBlock } from "../../types/template";
import { Input, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ada-design-system";

interface Props {
  block: WebBlock;
  onChange: (updates: Partial<WebBlock>) => void;
}

function SliderField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[10px] shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 h-1 accent-primary"
        />
        <span className="text-[10px] text-muted-foreground w-10 text-right">{value}{unit}</span>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function WebBlockSettings({ block, onChange }: Props) {
  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-2">
          <SliderField label="Height" value={block.height} min={100} max={400} unit="px" onChange={(v) => onChange({ height: v } as any)} />
          <SelectField label="Text Align" value={block.textAlign} options={[{ v: "left", l: "Left" }, { v: "center", l: "Center" }, { v: "right", l: "Right" }]} onChange={(v) => onChange({ textAlign: v } as any)} />
          <div className="space-y-1">
            <Label className="text-[10px]">Background Image URL</Label>
            <Input className="h-7 text-xs" value={block.backgroundImageUrl || ""} placeholder="https://..." onChange={(e) => onChange({ backgroundImageUrl: e.target.value || undefined } as any)} />
          </div>
          <SliderField label="Overlay Opacity" value={block.backgroundOverlayOpacity} min={0} max={1} step={0.05} onChange={(v) => onChange({ backgroundOverlayOpacity: v } as any)} />
        </div>
      );

    case "category-nav":
      return (
        <div className="space-y-2">
          <SelectField label="Style" value={block.style} options={[{ v: "tabs", l: "Tabs" }, { v: "pills", l: "Pills" }, { v: "anchors", l: "Anchors" }]} onChange={(v) => onChange({ style: v } as any)} />
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Sticky</Label>
            <Switch checked={block.sticky} onCheckedChange={(v) => onChange({ sticky: v } as any)} />
          </div>
        </div>
      );

    case "menu-section":
      return (
        <div className="space-y-2">
          <SelectField label="Columns" value={String(block.columns)} options={[{ v: "1", l: "1 Column" }, { v: "2", l: "2 Columns" }]} onChange={(v) => onChange({ columns: Number(v) } as any)} />
          <SelectField label="Item Style" value={block.itemStyle} options={[{ v: "compact", l: "Compact" }, { v: "card", l: "Card" }, { v: "detailed", l: "Detailed" }]} onChange={(v) => onChange({ itemStyle: v } as any)} />
          <SelectField label="Price Position" value={block.pricePosition} options={[{ v: "right", l: "Right" }, { v: "below", l: "Below" }, { v: "inline", l: "Inline" }]} onChange={(v) => onChange({ pricePosition: v } as any)} />
        </div>
      );

    case "featured-spotlight":
      return (
        <div className="space-y-2">
          <SelectField label="Layout" value={block.layout} options={[{ v: "horizontal", l: "Horizontal Scroll" }, { v: "grid", l: "Grid" }]} onChange={(v) => onChange({ layout: v } as any)} />
          <SliderField label="Max Items" value={block.maxItems} min={1} max={8} onChange={(v) => onChange({ maxItems: v } as any)} />
        </div>
      );

    case "image-banner":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Image URL</Label>
            <Input className="h-7 text-xs" value={block.imageUrl || ""} placeholder="https://..." onChange={(e) => onChange({ imageUrl: e.target.value || undefined } as any)} />
          </div>
          <SliderField label="Height" value={block.height} min={80} max={400} unit="px" onChange={(v) => onChange({ height: v } as any)} />
          <SelectField label="Object Fit" value={block.objectFit} options={[{ v: "cover", l: "Cover" }, { v: "contain", l: "Contain" }, { v: "fill", l: "Fill" }]} onChange={(v) => onChange({ objectFit: v } as any)} />
        </div>
      );

    case "info-bar":
      return (
        <div className="space-y-2">
          <SelectField label="Layout" value={block.layout} options={[{ v: "row", l: "Row" }, { v: "column", l: "Column" }]} onChange={(v) => onChange({ layout: v } as any)} />
          <Label className="text-[10px] text-muted-foreground">Items: {block.items.length} info items configured</Label>
        </div>
      );

    case "search":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Placeholder Text</Label>
            <Input className="h-7 text-xs" value={block.placeholder} placeholder="Search menu..." onChange={(e) => onChange({ placeholder: e.target.value } as any)} />
          </div>
        </div>
      );

    case "footer":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Show Address</Label>
            <Switch checked={block.showAddress} onCheckedChange={(v) => onChange({ showAddress: v } as any)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">Show Phone</Label>
            <Switch checked={block.showPhone} onCheckedChange={(v) => onChange({ showPhone: v } as any)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Custom Text</Label>
            <Input className="h-7 text-xs" value={block.customText} placeholder="Additional text..." onChange={(e) => onChange({ customText: e.target.value } as any)} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
