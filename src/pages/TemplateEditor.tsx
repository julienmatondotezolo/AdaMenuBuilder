import { useState, useEffect, useRef } from "react";
import { uid } from "../utils/uid";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Palette,
  Type,
  Columns3,
  ImageIcon,
  GripVertical,
  Eye,
  EyeOff,
  Ruler,
  Check,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ada-design-system";
import { useTemplateById, updateTemplate } from "../db/hooks";
import type { MenuTemplate, PageVariant } from "../types/template";
import { PAGE_FORMATS, mmToPx } from "../types/template";
import { sampleMenuData } from "../data/sampleMenu";

/* ── Section order type for drag-and-drop ────────────────────────────── */

type SectionType = "header" | "body" | "highlight";

const SECTION_META: Record<SectionType, { label: string; icon: typeof Type }> = {
  header: { label: "Header", icon: Type },
  body: { label: "Menu Content", icon: Columns3 },
  highlight: { label: "Highlight Image", icon: ImageIcon },
};

/* ── Format chips ────────────────────────────────────────────────────── */

const FORMATS = [
  { key: "A4", label: "A4", sub: "210×297" },
  { key: "A5", label: "A5", sub: "148×210" },
  { key: "DL", label: "DL", sub: "99×210" },
  { key: "LONG", label: "Long", sub: "110×297" },
  { key: "CUSTOM", label: "Custom", sub: null },
] as const;

/* ══════════════════════════════════════════════════════════════════════ */

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = useTemplateById(id);

  const [activeVariantId, setActiveVariantId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<SectionType | "format" | "colors" | null>("format");
  const [sectionOrder, setSectionOrder] = useState<SectionType[]>(["header", "body", "highlight"]);

  // Drag state
  const [draggedSection, setDraggedSection] = useState<SectionType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartIndex = useRef<number | null>(null);

  useEffect(() => {
    if (template && !activeVariantId) {
      setActiveVariantId(template.pageVariants[0]?.id || "");
    }
  }, [template]);

  // Derive section order from variant highlight position
  useEffect(() => {
    if (!template) return;
    const v = template.pageVariants.find((p) => p.id === activeVariantId);
    if (!v) return;
    if (v.highlight.show && v.highlight.position === "top") {
      setSectionOrder(["header", "highlight", "body"]);
    } else {
      setSectionOrder(["header", "body", "highlight"]);
    }
  }, [activeVariantId, template]);

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const activeVariant = template.pageVariants.find((v) => v.id === activeVariantId);

  const save = (updates: Partial<MenuTemplate>) => {
    if (id) updateTemplate(id, updates);
  };

  const updateVariant = (variantId: string, updates: Partial<PageVariant>) => {
    save({
      pageVariants: template.pageVariants.map((v) =>
        v.id === variantId ? { ...v, ...updates } : v
      ),
    });
  };

  const addVariant = () => {
    const newVar: PageVariant = {
      id: `var-${uid()}`,
      name: `Page ${template.pageVariants.length + 1}`,
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    };
    save({ pageVariants: [...template.pageVariants, newVar] });
    setActiveVariantId(newVar.id);
  };

  const deleteVariant = (variantId: string) => {
    if (template.pageVariants.length <= 1) return;
    const remaining = template.pageVariants.filter((v) => v.id !== variantId);
    save({ pageVariants: remaining });
    if (activeVariantId === variantId) setActiveVariantId(remaining[0].id);
  };

  const duplicateVariant = (variantId: string) => {
    const src = template.pageVariants.find((v) => v.id === variantId);
    if (!src) return;
    const copy: PageVariant = { ...src, id: `var-${uid()}`, name: `${src.name} (Copy)` };
    save({ pageVariants: [...template.pageVariants, copy] });
    setActiveVariantId(copy.id);
  };

  const isSectionEnabled = (s: SectionType): boolean => {
    if (!activeVariant) return false;
    if (s === "header") return activeVariant.header.show;
    if (s === "highlight") return activeVariant.highlight.show;
    return true; // body always on
  };

  const toggleSection = (s: SectionType) => {
    if (!activeVariant) return;
    if (s === "header") updateVariant(activeVariant.id, { header: { ...activeVariant.header, show: !activeVariant.header.show } });
    if (s === "highlight") updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, show: !activeVariant.highlight.show, position: !activeVariant.highlight.show ? "bottom" : "none" } });
  };

  /* ── Drag handlers (pointer-based for tablet) ── */

  const handleDragStart = (idx: number, section: SectionType) => {
    if (section === "body") return; // body not draggable
    dragStartIndex.current = idx;
    setDraggedSection(section);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragStartIndex.current === null || draggedSection === null) return;
    const newOrder = [...sectionOrder];
    const fromIdx = dragStartIndex.current;
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    setSectionOrder(newOrder);

    // Update highlight position based on new order
    if (activeVariant && moved === "highlight") {
      const bodyIdx = newOrder.indexOf("body");
      const highlightIdx = newOrder.indexOf("highlight");
      const pos = highlightIdx < bodyIdx ? "top" : "bottom";
      updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, position: pos as any } });
    }

    setDraggedSection(null);
    setDragOverIndex(null);
    dragStartIndex.current = null;
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
    setDragOverIndex(null);
    dragStartIndex.current = null;
  };

  const previewW = mmToPx(template.format.width);
  const previewH = mmToPx(template.format.height);
  const scale = Math.min(500 / previewW, 700 / previewH, 1);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ═══ Top bar ═══ */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0 bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/templates")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">{template.name}</h1>
            <Badge variant="secondary" className="text-[10px]">
              {template.format.width} × {template.format.height} mm
            </Badge>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/templates")}>
          <Check className="w-4 h-4 mr-1.5" />
          Save
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="w-[340px] shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
          {/* Variant tabs — horizontal scroll */}
          <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Page Variants</span>
              <Button variant="ghost" size="icon-sm" onClick={addVariant} className="h-6 w-6">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-none">
              {template.pageVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVariantId(v.id)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    activeVariantId === v.id
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Variant name + actions */}
          {activeVariant && (
            <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
              <Input
                value={activeVariant.name}
                onChange={(e) => updateVariant(activeVariant.id, { name: e.target.value })}
                className="flex-1 h-8 text-sm font-medium"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => duplicateVariant(activeVariant.id)} title="Duplicate" className="h-7 w-7 shrink-0">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              {template.pageVariants.length > 1 && (
                <Button variant="ghost" size="icon-sm" onClick={() => deleteVariant(activeVariant.id)} title="Delete" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Scrollable settings area */}
          <div className="flex-1 overflow-y-auto">
            {activeVariant && (
              <div className="p-3 space-y-1">
                {/* ── Page Format (big card) ── */}
                <div className={cn(
                  "rounded-lg border transition-all",
                  selectedSection === "format" ? "ring-1 ring-primary/30 border-border" : "border-border",
                )}>
                  <button
                    onClick={() => setSelectedSection(selectedSection === "format" ? null : "format")}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-3 rounded-t-lg transition-colors",
                      selectedSection === "format" ? "bg-primary/5" : "hover:bg-muted/30",
                    )}
                  >
                    <Ruler className={cn("w-4 h-4 shrink-0", selectedSection === "format" ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-xs font-semibold text-foreground flex-1 text-left">Page Format</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mr-1">{template.format.type}</Badge>
                    {selectedSection === "format" ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {selectedSection === "format" && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                      <div className="flex flex-wrap gap-1.5">
                        {FORMATS.map((f) => (
                          <button
                            key={f.key}
                            onClick={() => {
                              const fmt = f.key === "CUSTOM"
                                ? { type: "CUSTOM" as const, width: template.format.width, height: template.format.height }
                                : PAGE_FORMATS[f.key as keyof typeof PAGE_FORMATS];
                              save({ format: fmt });
                            }}
                            className={cn(
                              "flex flex-col items-center px-3 py-2.5 rounded-lg border-2 transition-all",
                              template.format.type === f.key
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary/30 text-muted-foreground"
                            )}
                          >
                            <span className="text-xs font-semibold">{f.label}</span>
                            {f.sub && <span className="text-[9px] opacity-60">{f.sub}</span>}
                          </button>
                        ))}
                      </div>
                      {template.format.type === "CUSTOM" && (
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px]">Width (mm)</Label>
                            <Input type="number" value={template.format.width} className="h-8 text-xs"
                              onChange={(e) => save({ format: { ...template.format, width: Number(e.target.value) } })} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px]">Height (mm)</Label>
                            <Input type="number" value={template.format.height} className="h-8 text-xs"
                              onChange={(e) => save({ format: { ...template.format, height: Number(e.target.value) } })} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Section separator ── */}
                <div className="pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page Sections</span>
                  <p className="text-[10px] text-muted-foreground/60">Drag to reorder · Toggle visibility</p>
                </div>

                {/* ── Draggable section blocks ── */}
                {sectionOrder.map((section, idx) => {
                  const meta = SECTION_META[section];
                  const Icon = meta.icon;
                  const enabled = isSectionEnabled(section);
                  const isDragging = draggedSection === section;
                  const isDropTarget = dragOverIndex === idx && draggedSection !== null;
                  const isDraggable = section !== "body";

                  return (
                    <div
                      key={section}
                      draggable={isDraggable}
                      onDragStart={() => handleDragStart(idx, section)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-lg border transition-all",
                        isDragging && "opacity-40 scale-95",
                        isDropTarget && "border-primary border-dashed bg-primary/5",
                        !isDragging && !isDropTarget && "border-border",
                        selectedSection === section && "ring-1 ring-primary/30",
                      )}
                    >
                      {/* Section header row */}
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-t-lg transition-colors",
                          enabled ? "bg-background" : "bg-muted/30",
                          selectedSection === section && "bg-primary/5",
                        )}
                      >
                        {/* Drag handle */}
                        {isDraggable ? (
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
                        ) : (
                          <div className="w-3.5 shrink-0" />
                        )}

                        {/* Icon + label — clickable to select */}
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => setSelectedSection(selectedSection === section ? null : section)}
                        >
                          <Icon className={cn("w-4 h-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground/40")} />
                          <span className={cn("text-xs font-semibold", enabled ? "text-foreground" : "text-muted-foreground/50")}>{meta.label}</span>
                        </button>

                        {/* Visibility toggle (not for body) */}
                        {section !== "body" && (
                          <button
                            onClick={() => toggleSection(section)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors"
                            title={enabled ? "Hide section" : "Show section"}
                          >
                            {enabled ? (
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />
                            )}
                          </button>
                        )}

                        {/* Expand chevron */}
                        <button
                          onClick={() => setSelectedSection(selectedSection === section ? null : section)}
                          className="p-0.5"
                        >
                          {selectedSection === section ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>

                      {/* Expanded settings */}
                      {selectedSection === section && enabled && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                          {section === "header" && (
                            <>
                              <SelectRow label="Style" value={activeVariant.header.style}
                                options={[{ v: "centered", l: "Centered" }, { v: "left", l: "Left Aligned" }, { v: "minimal", l: "Minimal" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, style: v as any } })} />
                              <ToggleRow label="Show Subtitle" checked={activeVariant.header.showSubtitle}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showSubtitle: v } })} />
                              <ToggleRow label="Show Year" checked={activeVariant.header.showEstablished}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showEstablished: v } })} />
                              <ToggleRow label="Divider Line" checked={activeVariant.header.showDivider}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showDivider: v } })} />
                            </>
                          )}
                          {section === "body" && (
                            <>
                              <SelectRow label="Columns" value={String(activeVariant.body.columns)}
                                options={[{ v: "1", l: "1 Column" }, { v: "2", l: "2 Columns" }, { v: "3", l: "3 Columns" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, columns: Number(v) } })} />
                              <SelectRow label="Category Style" value={activeVariant.body.categoryStyle}
                                options={[{ v: "lines", l: "Decorative Lines" }, { v: "bold", l: "Bold Header" }, { v: "minimal", l: "Minimal" }, { v: "dots", l: "Dotted" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryStyle: v as any } })} />
                              <SelectRow label="Alignment" value={activeVariant.body.itemAlignment}
                                options={[{ v: "center", l: "Centered" }, { v: "left", l: "Left Aligned" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, itemAlignment: v as any } })} />
                              <SelectRow label="Price" value={activeVariant.body.pricePosition}
                                options={[{ v: "below", l: "Below Name" }, { v: "right", l: "Right Side" }, { v: "inline", l: "Inline" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, pricePosition: v as any } })} />
                              <ToggleRow label="Descriptions" checked={activeVariant.body.showDescriptions}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showDescriptions: v } })} />
                              <ToggleRow label="Featured Badge" checked={activeVariant.body.showFeaturedBadge}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showFeaturedBadge: v } })} />
                            </>
                          )}
                          {section === "highlight" && (
                            <>
                              <NumberRow label="Height" value={activeVariant.highlight.height ?? 80} unit="px"
                                onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, height: v } })} />
                              <div className="pt-1">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Margin</Label>
                                <div className="grid grid-cols-2 gap-2 mt-1.5">
                                  <NumberRow label="Top" value={activeVariant.highlight.marginTop ?? 12} unit="px" compact
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginTop: v } })} />
                                  <NumberRow label="Bottom" value={activeVariant.highlight.marginBottom ?? 0} unit="px" compact
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginBottom: v } })} />
                                  <NumberRow label="Left" value={activeVariant.highlight.marginLeft ?? 0} unit="px" compact
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginLeft: v } })} />
                                  <NumberRow label="Right" value={activeVariant.highlight.marginRight ?? 0} unit="px" compact
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginRight: v } })} />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Colors (big card) ── */}
                <div className="pt-1" />
                <div className={cn(
                  "rounded-lg border transition-all",
                  selectedSection === "colors" ? "ring-1 ring-primary/30 border-border" : "border-border",
                )}>
                  <button
                    onClick={() => setSelectedSection(selectedSection === "colors" ? null : "colors")}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-3 rounded-t-lg transition-colors",
                      selectedSection === "colors" ? "bg-primary/5" : "hover:bg-muted/30",
                    )}
                  >
                    <Palette className={cn("w-4 h-4 shrink-0", selectedSection === "colors" ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-xs font-semibold text-foreground flex-1 text-left">Colors</span>
                    {/* Color swatches preview */}
                    <div className="flex gap-1 mr-1">
                      {[template.colors.primary, template.colors.background, template.colors.text].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-border/60" style={{ backgroundColor: c.startsWith("#") ? c : "#4d6aff" }} />
                      ))}
                    </div>
                    {selectedSection === "colors" ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {selectedSection === "colors" && (
                    <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-border/50">
                      <ColorRow label="Primary" value={template.colors.primary}
                        onChange={(v) => save({ colors: { ...template.colors, primary: v, accent: v } })} />
                      <ColorRow label="Background" value={template.colors.background}
                        onChange={(v) => save({ colors: { ...template.colors, background: v } })} />
                      <ColorRow label="Text" value={template.colors.text}
                        onChange={(v) => save({ colors: { ...template.colors, text: v } })} />
                      <ColorRow label="Muted" value={template.colors.muted}
                        onChange={(v) => save({ colors: { ...template.colors, muted: v } })} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Live Preview ═══ */}
        <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-auto p-6">
          <div
            className="bg-white rounded-sm overflow-hidden"
            style={{
              width: previewW * scale,
              height: previewH * scale,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <VariantPreview template={template} variant={activeVariant} sectionOrder={sectionOrder} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Settings button (non-draggable) ─────────────────────────────────── */

function SettingButton({ label, icon, isSelected, onClick }: {
  label: string; icon: React.ReactNode; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all text-left",
        isSelected
          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
          : "border-border hover:border-primary/20 hover:bg-muted/30"
      )}
    >
      {icon}
      <span className="text-xs font-semibold text-foreground flex-1">{label}</span>
      {isSelected ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

/* ── Control rows ────────────────────────────────────────────────────── */

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <Label className="text-[11px] font-normal text-foreground/80">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <Label className="text-[11px] font-normal text-foreground/80 shrink-0">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] min-w-[120px] max-w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <Label className="text-[11px] font-normal text-foreground/80">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#4d6aff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-border cursor-pointer p-0.5"
          style={{ WebkitAppearance: "none" }}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-20 h-7 text-[10px] font-mono" />
      </div>
    </div>
  );
}

function NumberRow({ label, value, unit, onChange, compact }: {
  label: string; value: number; unit: string; onChange: (v: number) => void; compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2", compact ? "py-0" : "py-0.5")}>
      <Label className={cn("font-normal text-foreground/80 shrink-0", compact ? "text-[10px]" : "text-[11px]")}>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn("text-xs text-right", compact ? "w-16 h-7" : "w-20 h-7")}
        />
        <span className="text-[9px] text-muted-foreground w-4">{unit}</span>
      </div>
    </div>
  );
}

/* ── Live Preview ────────────────────────────────────────────────────── */

function VariantPreview({ template, variant, sectionOrder }: {
  template: MenuTemplate; variant?: PageVariant; sectionOrder: SectionType[];
}) {
  if (!variant) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Select a variant</div>;

  const data = sampleMenuData;
  const { colors, fonts, spacing } = template;

  const renderSection = (section: SectionType) => {
    switch (section) {
      case "header":
        if (!variant.header.show) return null;
        return (
          <div key="header" className={variant.header.style === "left" ? "text-left pb-4" : "text-center pb-4"}>
            {variant.header.showSubtitle && (
              <p style={{ fontSize: "7px", letterSpacing: "0.3em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, marginBottom: "8px" }}>
                {data.subtitle}
              </p>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: "22px", fontWeight: 300, fontStyle: "italic", letterSpacing: "0.05em" }}>
              {data.restaurantName}
            </h1>
            {variant.header.showEstablished && data.established && (
              <p style={{ fontSize: "7px", letterSpacing: "0.2em", color: colors.muted, textTransform: "uppercase", marginTop: "6px" }}>
                EST. {data.established}
              </p>
            )}
            {variant.header.showDivider && (
              <div style={{ display: "flex", justifyContent: variant.header.style === "left" ? "flex-start" : "center", marginTop: "12px" }}>
                <span style={{ width: "40px", height: "1px", backgroundColor: colors.muted, opacity: 0.3 }} />
              </div>
            )}
          </div>
        );

      case "body":
        return (
          <div key="body" style={{
            display: variant.body.columns > 1 ? "grid" : "block",
            gridTemplateColumns: variant.body.columns > 1 ? `repeat(${variant.body.columns}, 1fr)` : undefined,
            gap: variant.body.columns > 1 ? "0 16px" : undefined,
            flex: 1,
          }}>
            {data.categories.map((cat) => (
              <div key={cat.id} style={{ marginBottom: `${spacing.categoryGap * 0.4}px` }}>
                <div className={variant.body.itemAlignment === "left" ? "text-left mb-3" : "flex items-center justify-center gap-2 mb-3"}>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                  <h2 style={{ fontSize: "8px", letterSpacing: "0.25em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {cat.name}
                  </h2>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.itemGap * 0.3}px` }}>
                  {cat.items.slice(0, 3).map((item) => (
                    <div key={item.id} style={{ textAlign: variant.body.itemAlignment }}>
                      <div style={{ display: variant.body.pricePosition === "right" ? "flex" : "block", justifyContent: "space-between", alignItems: "baseline" }}>
                        <p style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.name}</p>
                        {variant.body.pricePosition === "right" && (
                          <span style={{ fontSize: "7px", color: colors.primary, fontWeight: 600 }}>${item.price}</span>
                        )}
                      </div>
                      {variant.body.showDescriptions && item.description && (
                        <p style={{ fontSize: "6px", color: colors.muted, fontStyle: "italic", marginTop: "2px", maxWidth: "200px", marginLeft: variant.body.itemAlignment === "center" ? "auto" : undefined, marginRight: variant.body.itemAlignment === "center" ? "auto" : undefined }}>
                          {item.description.slice(0, 60)}…
                        </p>
                      )}
                      {variant.body.pricePosition === "below" && (
                        <p style={{ fontSize: "7px", color: colors.primary, fontWeight: 600, marginTop: "3px" }}>${item.price}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "highlight": {
        if (!variant.highlight.show || !data.highlightImage) return null;
        const hl = variant.highlight;
        return (
          <div key="highlight" style={{
            marginTop: `${hl.marginTop ?? 12}px`,
            marginBottom: `${hl.marginBottom ?? 0}px`,
            marginLeft: `${hl.marginLeft ?? 0}px`,
            marginRight: `${hl.marginRight ?? 0}px`,
          }}>
            <div style={{ borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <img src={data.highlightImage} alt="" style={{ width: "100%", height: `${hl.height ?? 80}px`, objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                <p style={{ fontSize: "5px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{data.highlightLabel}</p>
                <p style={{ fontSize: "8px", color: "white", fontStyle: "italic" }}>{data.highlightTitle}</p>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="h-full flex flex-col" style={{
      fontFamily: fonts.body, color: colors.text, backgroundColor: colors.background,
      padding: `${spacing.marginTop}px ${spacing.marginRight}px ${spacing.marginBottom}px ${spacing.marginLeft}px`,
    }}>
      {sectionOrder.map(renderSection)}
    </div>
  );
}
