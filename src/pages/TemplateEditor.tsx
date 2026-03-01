import { useState, useEffect, useRef, useCallback } from "react";
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
  Type as TypeIcon,
  Columns3,
  ImageIcon,
  GripVertical,
  Eye,
  EyeOff,
  Ruler,
  Check,
  Space,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  Button,
  Badge,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  cn,
} from "ada-design-system";
import { useTemplateById, updateTemplate, deleteTemplate, downloadTemplate } from "../db/hooks";
import type { MenuTemplate, PageVariant } from "../types/template";
import { PAGE_FORMATS, mmToPx } from "../types/template";
import { sampleMenuData } from "../data/sampleMenu";
import { FONT_CATALOG, FONT_PAIRINGS, loadTemplateFonts, fontDisplayName, type FontPairing } from "../data/fonts";

/* ── Section order type for drag-and-drop ────────────────────────────── */

import type { SectionType } from "../types/template";

const SECTION_META: Record<SectionType, { label: string; icon: typeof TypeIcon }> = {
  header: { label: "Header", icon: TypeIcon },
  body: { label: "Menu Content", icon: Columns3 },
  highlight: { label: "Highlight Image", icon: ImageIcon },
};

/* ── Panel types ─────────────────────────────────────────────────────── */

type PanelId = SectionType | "format" | "colors" | "fonts" | "spacing";

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
  const [openPanel, setOpenPanel] = useState<PanelId | null>("format");
  const [sectionOrder, setSectionOrder] = useState<SectionType[]>(["header", "body", "highlight"]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Drag state
  const [draggedSection, setDraggedSection] = useState<SectionType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartIndex = useRef<number | null>(null);

  // Load Google Fonts for this template
  useEffect(() => {
    if (template) loadTemplateFonts(template.fonts.heading, template.fonts.body);
  }, [template?.fonts.heading, template?.fonts.body]);

  useEffect(() => {
    if (template && !activeVariantId) {
      setActiveVariantId(template.pageVariants[0]?.id || "");
    }
  }, [template]);

  // Derive section order from variant (use persisted order if available, otherwise fallback to highlight position)
  useEffect(() => {
    if (!template) return;
    const v = template.pageVariants.find((p) => p.id === activeVariantId);
    if (!v) return;
    
    // Use persisted section order if available
    if (v.sectionOrder && v.sectionOrder.length > 0) {
      setSectionOrder(v.sectionOrder);
    } else {
      // Fallback to deriving from highlight position for backward compatibility
      if (v.highlight.show && v.highlight.position === "top") {
        setSectionOrder(["header", "highlight", "body"]);
      } else {
        setSectionOrder(["header", "body", "highlight"]);
      }
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

  const togglePanel = (panelId: PanelId) => setOpenPanel(openPanel === panelId ? null : panelId);

  const handleDeleteTemplate = async () => {
    if (!id) return;
    try {
      await deleteTemplate(id);
      navigate("/templates");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cannot delete this template");
    }
    setShowDeleteDialog(false);
  };

  /* ── Drag handlers ── */

  const handleDragStart = (idx: number, section: SectionType) => {
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

    if (activeVariant) {
      // Persist section order to variant
      updateVariant(activeVariant.id, { sectionOrder: newOrder });
      
      // Keep highlight position logic for backward compatibility
      if (moved === "highlight") {
        const bodyIdx = newOrder.indexOf("body");
        const highlightIdx = newOrder.indexOf("highlight");
        const pos = highlightIdx < bodyIdx ? "top" : "bottom";
        updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, position: pos as "top" | "bottom" } });
      }
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive hover:bg-destructive/5">
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => id && downloadTemplate(id)}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => navigate("/templates")}>
            <Check className="w-4 h-4 mr-1.5" />
            Save
          </Button>
        </div>
      </header>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{template.name}</strong>? This action cannot be undone. Any menus using this template will lose their template reference.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex overflow-hidden">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="w-[360px] shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
          {/* Variant tabs */}
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
              <div className="p-3 space-y-1.5">
                {/* ── Page Format ── */}
                <SettingsPanel
                  icon={<Ruler className={cn("w-4 h-4", openPanel === "format" ? "text-primary" : "text-muted-foreground")} />}
                  label="Page Format"
                  badge={<Badge variant="secondary" className="text-[9px] px-1.5 py-0">{template.format.type}</Badge>}
                  isOpen={openPanel === "format"}
                  onToggle={() => togglePanel("format")}
                >
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
                    <div className="flex gap-2 mt-3">
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
                </SettingsPanel>

                {/* ── Fonts ── */}
                <SettingsPanel
                  icon={<TypeIcon className={cn("w-4 h-4", openPanel === "fonts" ? "text-primary" : "text-muted-foreground")} />}
                  label="Typography"
                  badge={
                    <span className="text-[9px] text-muted-foreground/70 truncate max-w-[100px]">
                      {fontDisplayName(template.fonts.heading).split(",")[0].replace(/'/g, "")}
                    </span>
                  }
                  isOpen={openPanel === "fonts"}
                  onToggle={() => togglePanel("fonts")}
                >
                  {/* Font pairings (quick select) */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Pairings</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONT_PAIRINGS.map((pair) => (
                        <FontPairingChip
                          key={pair.name}
                          pair={pair}
                          isActive={template.fonts.heading === pair.heading && template.fonts.body === pair.body}
                          onSelect={() => {
                            save({ fonts: { heading: pair.heading, body: pair.body } });
                            loadTemplateFonts(pair.heading, pair.body);
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Individual font selects */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Heading Font</Label>
                      <Select
                        value={template.fonts.heading}
                        onValueChange={(v) => {
                          save({ fonts: { ...template.fonts, heading: v } });
                          loadTemplateFonts(v, template.fonts.body);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <span style={{ fontFamily: template.fonts.heading }}>{fontDisplayName(template.fonts.heading)}</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {FONT_CATALOG.map((f) => (
                            <SelectItem key={f.family} value={f.family}>
                              <span style={{ fontFamily: f.family }}>{f.name}</span>
                              <span className="text-[9px] text-muted-foreground ml-1.5">({f.category})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Body Font</Label>
                      <Select
                        value={template.fonts.body}
                        onValueChange={(v) => {
                          save({ fonts: { ...template.fonts, body: v } });
                          loadTemplateFonts(template.fonts.heading, v);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <span style={{ fontFamily: template.fonts.body }}>{fontDisplayName(template.fonts.body)}</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {FONT_CATALOG.map((f) => (
                            <SelectItem key={f.family} value={f.family}>
                              <span style={{ fontFamily: f.family }}>{f.name}</span>
                              <span className="text-[9px] text-muted-foreground ml-1.5">({f.category})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SettingsPanel>

                {/* ── Colors ── */}
                <SettingsPanel
                  icon={<Palette className={cn("w-4 h-4", openPanel === "colors" ? "text-primary" : "text-muted-foreground")} />}
                  label="Colors"
                  badge={
                    <div className="flex gap-1">
                      {[template.colors.primary, template.colors.background, template.colors.text].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-border/60" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  }
                  isOpen={openPanel === "colors"}
                  onToggle={() => togglePanel("colors")}
                >
                  <ColorRow label="Primary" value={template.colors.primary}
                    onChange={(v) => save({ colors: { ...template.colors, primary: v, accent: v } })} />
                  <ColorRow label="Background" value={template.colors.background}
                    onChange={(v) => save({ colors: { ...template.colors, background: v } })} />
                  <ColorRow label="Text" value={template.colors.text}
                    onChange={(v) => save({ colors: { ...template.colors, text: v } })} />
                  <ColorRow label="Accent" value={template.colors.accent}
                    onChange={(v) => save({ colors: { ...template.colors, accent: v } })} />
                  <ColorRow label="Muted" value={template.colors.muted}
                    onChange={(v) => save({ colors: { ...template.colors, muted: v } })} />
                </SettingsPanel>

                {/* ── Spacing ── */}
                <SettingsPanel
                  icon={<Space className={cn("w-4 h-4", openPanel === "spacing" ? "text-primary" : "text-muted-foreground")} />}
                  label="Spacing & Margins"
                  isOpen={openPanel === "spacing"}
                  onToggle={() => togglePanel("spacing")}
                >
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Page Margins</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <NumberRow label="Top" value={template.spacing.marginTop} unit="px" compact
                      onChange={(v) => save({ spacing: { ...template.spacing, marginTop: v } })} />
                    <NumberRow label="Bottom" value={template.spacing.marginBottom} unit="px" compact
                      onChange={(v) => save({ spacing: { ...template.spacing, marginBottom: v } })} />
                    <NumberRow label="Left" value={template.spacing.marginLeft} unit="px" compact
                      onChange={(v) => save({ spacing: { ...template.spacing, marginLeft: v } })} />
                    <NumberRow label="Right" value={template.spacing.marginRight} unit="px" compact
                      onChange={(v) => save({ spacing: { ...template.spacing, marginRight: v } })} />
                  </div>
                  <div className="mt-4">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Content Spacing</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <NumberRow label="Category Gap" value={template.spacing.categoryGap} unit="px" compact
                        onChange={(v) => save({ spacing: { ...template.spacing, categoryGap: v } })} />
                      <NumberRow label="Item Gap" value={template.spacing.itemGap} unit="px" compact
                        onChange={(v) => save({ spacing: { ...template.spacing, itemGap: v } })} />
                    </div>
                  </div>
                </SettingsPanel>

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
                  const isDraggable = true; // All sections are now draggable

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
                        openPanel === section && "ring-1 ring-primary/30",
                      )}
                    >
                      {/* Section header row */}
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-t-lg transition-colors",
                          enabled ? "bg-background" : "bg-muted/30",
                          openPanel === section && "bg-primary/5",
                        )}
                      >
                        {isDraggable ? (
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
                        ) : (
                          <div className="w-3.5 shrink-0" />
                        )}
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => togglePanel(section)}
                        >
                          <Icon className={cn("w-4 h-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground/40")} />
                          <span className={cn("text-xs font-semibold", enabled ? "text-foreground" : "text-muted-foreground/50")}>{meta.label}</span>
                        </button>
                        {section !== "body" && (
                          <button
                            onClick={() => toggleSection(section)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors"
                            title={enabled ? "Hide section" : "Show section"}
                          >
                            {enabled
                              ? <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              : <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />}
                          </button>
                        )}
                        <button onClick={() => togglePanel(section)} className="p-0.5">
                          {openPanel === section
                            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      </div>

                      {/* Expanded settings */}
                      {openPanel === section && enabled && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                          {section === "header" && (
                            <>
                              <SelectRow label="Style" value={activeVariant.header.style}
                                options={[{ v: "centered", l: "Centered" }, { v: "left", l: "Left Aligned" }, { v: "minimal", l: "Minimal" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, style: v as "centered" | "left" | "minimal" } })} />
                              <ToggleRow label="Show Subtitle" checked={activeVariant.header.showSubtitle}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showSubtitle: v } })} />
                              <ToggleRow label="Show Year" checked={activeVariant.header.showEstablished}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showEstablished: v } })} />
                              <ToggleRow label="Divider Line" checked={activeVariant.header.showDivider}
                                onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showDivider: v } })} />
                              
                              {/* Image Configuration */}
                              <div className="pt-2">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Background Image</Label>
                                <div className="space-y-2 mt-1.5">
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">URL</Label>
                                    <Input
                                      value={activeVariant.header.image?.url || ""}
                                      placeholder="No image set"
                                      className="h-7 text-xs"
                                      onChange={(e) => updateVariant(activeVariant.id, { 
                                        header: { 
                                          ...activeVariant.header, 
                                          image: { 
                                            offsetX: 0, offsetY: 0, width: 100, height: 100, opacity: 0.3, objectFit: "cover", 
                                            ...activeVariant.header.image, 
                                            url: e.target.value 
                                          } 
                                        } 
                                      })}
                                    />
                                  </div>
                                  {activeVariant.header.image?.url && (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <NumberRow label="X Offset" value={activeVariant.header.image.offsetX} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, offsetX: v } } })} />
                                        <NumberRow label="Y Offset" value={activeVariant.header.image.offsetY} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, offsetY: v } } })} />
                                        <NumberRow label="Width" value={activeVariant.header.image.width} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, width: v } } })} />
                                        <NumberRow label="Height" value={activeVariant.header.image.height} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, height: v } } })} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Opacity</Label>
                                          <Input type="number" min="0" max="1" step="0.1" value={activeVariant.header.image.opacity} className="h-7 text-xs"
                                            onChange={(e) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, opacity: Number(e.target.value) } } })} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Object Fit</Label>
                                          <Select value={activeVariant.header.image.objectFit} onValueChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, image: { ...activeVariant.header.image!, objectFit: v as "cover" | "contain" | "fill" } } })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="cover">Cover</SelectItem>
                                              <SelectItem value="contain">Contain</SelectItem>
                                              <SelectItem value="fill">Fill</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          {section === "body" && (
                            <>
                              <SelectRow label="Columns" value={String(activeVariant.body.columns)}
                                options={[{ v: "1", l: "1 Column" }, { v: "2", l: "2 Columns" }, { v: "3", l: "3 Columns" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, columns: Number(v) } })} />
                              <SelectRow label="Category Style" value={activeVariant.body.categoryStyle}
                                options={[{ v: "lines", l: "Decorative Lines" }, { v: "bold", l: "Bold Header" }, { v: "minimal", l: "Minimal" }, { v: "dots", l: "Dotted" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryStyle: v as "lines" | "bold" | "minimal" | "dots" } })} />
                              <SelectRow label="Alignment" value={activeVariant.body.itemAlignment}
                                options={[{ v: "center", l: "Centered" }, { v: "left", l: "Left Aligned" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, itemAlignment: v as "center" | "left" } })} />
                              <SelectRow label="Price" value={activeVariant.body.pricePosition}
                                options={[{ v: "below", l: "Below Name" }, { v: "right", l: "Right Side" }, { v: "inline", l: "Inline" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, pricePosition: v as "right" | "below" | "inline" } })} />
                              <SelectRow label="Separator" value={activeVariant.body.separatorStyle}
                                options={[{ v: "line", l: "Solid Line" }, { v: "dotted", l: "Dotted" }, { v: "none", l: "None" }]}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, separatorStyle: v as "line" | "dotted" | "none" } })} />
                              <ToggleRow label="Descriptions" checked={activeVariant.body.showDescriptions}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showDescriptions: v } })} />
                              <ToggleRow label="Featured Badge" checked={activeVariant.body.showFeaturedBadge}
                                onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showFeaturedBadge: v } })} />
                              
                              {/* Image Configuration */}
                              <div className="pt-2">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Background Image</Label>
                                <div className="space-y-2 mt-1.5">
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">URL</Label>
                                    <Input
                                      value={activeVariant.body.image?.url || ""}
                                      placeholder="No image set"
                                      className="h-7 text-xs"
                                      onChange={(e) => updateVariant(activeVariant.id, { 
                                        body: { 
                                          ...activeVariant.body, 
                                          image: { 
                                            offsetX: 0, offsetY: 0, width: 100, height: 100, opacity: 0.1, objectFit: "cover", 
                                            ...activeVariant.body.image, 
                                            url: e.target.value 
                                          } 
                                        } 
                                      })}
                                    />
                                  </div>
                                  {activeVariant.body.image?.url && (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <NumberRow label="X Offset" value={activeVariant.body.image.offsetX} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, offsetX: v } } })} />
                                        <NumberRow label="Y Offset" value={activeVariant.body.image.offsetY} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, offsetY: v } } })} />
                                        <NumberRow label="Width" value={activeVariant.body.image.width} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, width: v } } })} />
                                        <NumberRow label="Height" value={activeVariant.body.image.height} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, height: v } } })} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Opacity</Label>
                                          <Input type="number" min="0" max="1" step="0.1" value={activeVariant.body.image.opacity} className="h-7 text-xs"
                                            onChange={(e) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, opacity: Number(e.target.value) } } })} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Object Fit</Label>
                                          <Select value={activeVariant.body.image.objectFit} onValueChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, image: { ...activeVariant.body.image!, objectFit: v as "cover" | "contain" | "fill" } } })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="cover">Cover</SelectItem>
                                              <SelectItem value="contain">Contain</SelectItem>
                                              <SelectItem value="fill">Fill</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
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
                              
                              {/* Image Configuration */}
                              <div className="pt-2">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Background Image</Label>
                                <div className="space-y-2 mt-1.5">
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">URL</Label>
                                    <Input
                                      value={activeVariant.highlight.image?.url || ""}
                                      placeholder="No image set"
                                      className="h-7 text-xs"
                                      onChange={(e) => updateVariant(activeVariant.id, { 
                                        highlight: { 
                                          ...activeVariant.highlight, 
                                          image: { 
                                            offsetX: 0, offsetY: 0, width: 100, height: 100, opacity: 0.5, objectFit: "cover", 
                                            ...activeVariant.highlight.image, 
                                            url: e.target.value 
                                          } 
                                        } 
                                      })}
                                    />
                                  </div>
                                  {activeVariant.highlight.image?.url && (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <NumberRow label="X Offset" value={activeVariant.highlight.image.offsetX} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, offsetX: v } } })} />
                                        <NumberRow label="Y Offset" value={activeVariant.highlight.image.offsetY} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, offsetY: v } } })} />
                                        <NumberRow label="Width" value={activeVariant.highlight.image.width} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, width: v } } })} />
                                        <NumberRow label="Height" value={activeVariant.highlight.image.height} unit="px" compact
                                          onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, height: v } } })} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Opacity</Label>
                                          <Input type="number" min="0" max="1" step="0.1" value={activeVariant.highlight.image.opacity} className="h-7 text-xs"
                                            onChange={(e) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, opacity: Number(e.target.value) } } })} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Object Fit</Label>
                                          <Select value={activeVariant.highlight.image.objectFit} onValueChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, image: { ...activeVariant.highlight.image!, objectFit: v as "cover" | "contain" | "fill" } } })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="cover">Cover</SelectItem>
                                              <SelectItem value="contain">Contain</SelectItem>
                                              <SelectItem value="fill">Fill</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <VariantPreview 
              template={template} 
              variant={activeVariant} 
              sectionOrder={sectionOrder} 
              scale={scale} 
              onUpdateVariant={updateVariant}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Panel (collapsible) ────────────────────────────────────── */

function SettingsPanel({ icon, label, badge, isOpen, onToggle, children }: {
  icon: React.ReactNode; label: string; badge?: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border transition-all", isOpen ? "ring-1 ring-primary/30 border-border" : "border-border")}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-3 rounded-t-lg transition-colors",
          isOpen ? "bg-primary/5" : "hover:bg-muted/30",
        )}
      >
        {icon}
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{label}</span>
        {badge && <div className="mr-1">{badge}</div>}
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-border/50">{children}</div>}
    </div>
  );
}

/* ── Font Pairing Chip ───────────────────────────────────────────────── */

function FontPairingChip({ pair, isActive, onSelect }: {
  pair: FontPairing; isActive: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start px-2.5 py-2 rounded-lg border-2 transition-all text-left",
        isActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/30"
      )}
    >
      <span className="text-[10px] font-semibold text-foreground truncate w-full">{pair.name}</span>
      <span className="text-[8px] text-muted-foreground/70 truncate w-full">{pair.vibe}</span>
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
  // Ensure we have a valid hex for the color picker
  const hexValue = value.startsWith("#") ? value : "#4d6aff";
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <Label className="text-[11px] font-normal text-foreground/80">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={hexValue}
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

function VariantPreview({ template, variant, sectionOrder, scale, onUpdateVariant }: {
  template: MenuTemplate; variant?: PageVariant; sectionOrder: SectionType[]; scale: number;
  onUpdateVariant?: (variantId: string, updates: Partial<PageVariant>) => void;
}) {
  const [dragState, setDragState] = useState<{
    section: SectionType;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [hoverSection, setHoverSection] = useState<SectionType | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startX) / scale;
    const dy = (e.clientY - dragState.startY) / scale;
    setDragState((prev) => prev ? {
      ...prev,
      currentX: Math.round(prev.origX + dx),
      currentY: Math.round(prev.origY + dy),
    } : null);
  }, [dragState, scale]);

  const handleMouseUp = useCallback(() => {
    if (!dragState || !onUpdateVariant || !variant) return;
    const { section, currentX, currentY } = dragState;
    const configKey = section;
    onUpdateVariant(variant.id, {
      [configKey]: { ...variant[configKey], offsetX: currentX, offsetY: currentY },
    });
    setDragState(null);
  }, [dragState, onUpdateVariant, variant]);

  if (!variant) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Select a variant</div>;

  const data = sampleMenuData;
  const { colors, fonts, spacing } = template;

  const fs = (size: number) => `${size}px`;

  const getOffset = (section: SectionType) => {
    const config = variant[section];
    const ox = config.offsetX ?? 0;
    const oy = config.offsetY ?? 0;
    if (dragState?.section === section) {
      return { x: dragState.currentX, y: dragState.currentY };
    }
    return { x: ox, y: oy };
  };

  const handleMouseDown = (e: React.MouseEvent, section: SectionType) => {
    e.preventDefault();
    e.stopPropagation();
    const config = variant[section];
    setDragState({
      section,
      startX: e.clientX,
      startY: e.clientY,
      origX: config.offsetX ?? 0,
      origY: config.offsetY ?? 0,
      currentX: config.offsetX ?? 0,
      currentY: config.offsetY ?? 0,
    });
  };

  const renderSeparator = (style: string) => {
    if (style === "none") return null;
    return (
      <div style={{
        width: "100%",
        height: style === "dotted" ? "0" : "1px",
        backgroundColor: style === "dotted" ? "transparent" : `${colors.muted}33`,
        borderBottom: style === "dotted" ? `1px dotted ${colors.muted}66` : "none",
        margin: "6px 0",
      }} />
    );
  };

  const renderBackgroundImage = (section: SectionType) => {
    const config = variant[section];
    if (!config.image?.url) return null;
    
    return (
      <div
        style={{
          position: "absolute",
          top: config.image.offsetY,
          left: config.image.offsetX,
          width: config.image.width,
          height: config.image.height,
          opacity: config.image.opacity,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <img
          src={config.image.url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: config.image.objectFit,
            borderRadius: "4px",
          }}
        />
      </div>
    );
  };

  const wrapDraggable = (section: SectionType, content: React.ReactNode) => {
    const offset = getOffset(section);
    const isDragging = dragState?.section === section;
    const isHovered = hoverSection === section;
    return (
      <div
        key={section}
        onMouseDown={(e) => handleMouseDown(e, section)}
        onMouseEnter={() => setHoverSection(section)}
        onMouseLeave={() => setHoverSection(null)}
        style={{
          position: "relative",
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          cursor: isDragging ? "grabbing" : "move",
          outline: isDragging ? "2px solid #4d6aff" : isHovered ? "1px dashed #4d6aff66" : "none",
          outlineOffset: "2px",
          borderRadius: "2px",
          transition: isDragging ? "none" : "outline 0.15s ease",
          userSelect: "none",
        }}
      >
        {content}
        {isDragging && (
          <div style={{
            position: "absolute",
            top: -18,
            left: 0,
            fontSize: "8px",
            fontFamily: "monospace",
            background: "#4d6aff",
            color: "white",
            padding: "1px 4px",
            borderRadius: "2px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
          }}>
            x: {offset.x}, y: {offset.y}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: SectionType) => {
    switch (section) {
      case "header":
        if (!variant.header.show) return null;
        return (
          <div style={{
            position: "relative",
            textAlign: variant.header.style === "left" ? "left" : "center",
            paddingBottom: "16px",
          }}>
            {renderBackgroundImage("header")}
            {variant.header.showSubtitle && (
              <p style={{ fontSize: fs(7), letterSpacing: "0.3em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, marginBottom: "8px", fontFamily: fonts.body }}>
                {data.subtitle}
              </p>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: fs(22), fontWeight: 400, fontStyle: "italic", letterSpacing: "0.05em", color: colors.text }}>
              {data.restaurantName}
            </h1>
            {variant.header.showEstablished && data.established && (
              <p style={{ fontSize: fs(7), letterSpacing: "0.2em", color: colors.muted, textTransform: "uppercase", marginTop: "6px", fontFamily: fonts.body }}>
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
          <div style={{
            display: variant.body.columns > 1 ? "grid" : "block",
            gridTemplateColumns: variant.body.columns > 1 ? `repeat(${variant.body.columns}, 1fr)` : undefined,
            gap: variant.body.columns > 1 ? `0 ${spacing.categoryGap * 0.3}px` : undefined,
            flex: 1,
          }}>
            {data.categories.map((cat, catIdx) => (
              <div key={cat.id} style={{ marginBottom: `${spacing.categoryGap * 0.4}px` }}>
                {/* Category header */}
                <div style={{
                  textAlign: variant.body.itemAlignment,
                  marginBottom: `${spacing.itemGap * 0.4}px`,
                  display: variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" ? "flex" : "block",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                  <h2 style={{
                    fontSize: fs(variant.body.categoryStyle === "bold" ? 9 : 8),
                    letterSpacing: "0.25em",
                    color: colors.primary,
                    textTransform: "uppercase",
                    fontWeight: variant.body.categoryStyle === "bold" ? 800 : 600,
                    whiteSpace: "nowrap",
                    fontFamily: variant.body.categoryStyle === "bold" ? fonts.heading : fonts.body,
                    borderBottom: variant.body.categoryStyle === "bold" ? `2px solid ${colors.primary}` : "none",
                    paddingBottom: variant.body.categoryStyle === "bold" ? "4px" : "0",
                  }}>
                    {cat.name}
                  </h2>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                </div>

                {/* Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.itemGap * 0.3}px` }}>
                  {cat.items.slice(0, variant.body.columns > 1 ? 2 : 3).map((item) => (
                    <div key={item.id} style={{ textAlign: variant.body.itemAlignment }}>
                      <div style={{
                        display: variant.body.pricePosition === "right" ? "flex" : "block",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <p style={{ fontSize: fs(8), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: fonts.body, color: colors.text }}>
                            {item.name}
                          </p>
                          {variant.body.pricePosition === "inline" && (
                            <span style={{ fontSize: fs(7), color: colors.primary, fontWeight: 600 }}>€{item.price}</span>
                          )}
                          {item.featured && variant.body.showFeaturedBadge && (
                            <span style={{ fontSize: fs(5), color: colors.accent, marginLeft: "2px" }}>★</span>
                          )}
                        </div>
                        {variant.body.pricePosition === "right" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, marginLeft: "4px" }}>
                            {variant.body.separatorStyle === "dotted" && (
                              <span style={{ flex: 1, borderBottom: `1px dotted ${colors.muted}66`, minWidth: "10px" }} />
                            )}
                            <span style={{ fontSize: fs(7), color: colors.primary, fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price}</span>
                          </div>
                        )}
                      </div>
                      {variant.body.showDescriptions && item.description && (
                        <p style={{
                          fontSize: fs(6), color: colors.muted, fontStyle: "italic", marginTop: "2px",
                          maxWidth: variant.body.columns > 1 ? "140px" : "200px",
                          marginLeft: variant.body.itemAlignment === "center" ? "auto" : undefined,
                          marginRight: variant.body.itemAlignment === "center" ? "auto" : undefined,
                          fontFamily: fonts.body,
                        }}>
                          {item.description.slice(0, 60)}…
                        </p>
                      )}
                      {variant.body.pricePosition === "below" && (
                        <p style={{ fontSize: fs(7), color: colors.primary, fontWeight: 600, marginTop: "3px" }}>€{item.price}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Separator between categories */}
                {catIdx < data.categories.length - 1 && variant.body.separatorStyle !== "dotted" && renderSeparator(variant.body.separatorStyle)}
              </div>
            ))}
          </div>
        );

      case "highlight": {
        if (!variant.highlight.show || !data.highlightImage) return null;
        const hl = variant.highlight;
        return (
          <div style={{
            marginTop: `${hl.marginTop ?? 12}px`,
            marginBottom: `${hl.marginBottom ?? 0}px`,
            marginLeft: `${hl.marginLeft ?? 0}px`,
            marginRight: `${hl.marginRight ?? 0}px`,
          }}>
            <div style={{ borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <img src={data.highlightImage} alt="" style={{ width: "100%", height: `${hl.height ?? 80}px`, objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                <p style={{ fontSize: fs(5), color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: fonts.body }}>{data.highlightLabel}</p>
                <p style={{ fontSize: fs(8), color: "white", fontStyle: "italic", fontFamily: fonts.heading }}>{data.highlightTitle}</p>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        fontFamily: fonts.body, color: colors.text, backgroundColor: colors.background,
        padding: `${spacing.marginTop}px ${spacing.marginRight}px ${spacing.marginBottom}px ${spacing.marginLeft}px`,
      }}
    >
      {sectionOrder.map((section) => {
        const content = renderSection(section);
        if (!content) return null;
        return wrapDraggable(section, content);
      })}
    </div>
  );
}