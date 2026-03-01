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
  Type as TypeIcon,
  Columns3,
  ImageIcon,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
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
import { useTemplateById, updateTemplate, deleteTemplate, downloadTemplate } from "../db/hooks";
import type { MenuTemplate, PageVariant, HighlightStyle } from "../types/template";
import { PAGE_FORMATS, mmToPx } from "../types/template";
import { sampleMenuData } from "../data/sampleMenu";
import { FONT_CATALOG, FONT_PAIRINGS, loadTemplateFonts, fontDisplayName, findFont, loadFont, type FontPairing } from "../data/fonts";

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

  // Drag state (dnd-kit)
  const [activeDragSection, setActiveDragSection] = useState<SectionType | null>(null);
  const [hoveredSection, setHoveredSection] = useState<SectionType | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<PanelId | null>(null);
  const [lockedSections, setLockedSections] = useState<Set<SectionType>>(new Set());

  const toggleLock = (section: SectionType) => {
    setLockedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
        // Collapse panel when locking
        if (openPanel === section) setOpenPanel(null);
      }
      return next;
    });
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load Google Fonts for this template
  useEffect(() => {
    if (template) loadTemplateFonts(template.fonts.heading, template.fonts.body);
  }, [template?.fonts.heading, template?.fonts.body]);

  // Load custom fonts (highlight text, custom category)
  useEffect(() => {
    if (!template) return;
    for (const v of template.pageVariants) {
      const lf = v.highlight.text?.labelFont;
      const tf = v.highlight.text?.titleFont;
      const cf = v.body.categoryFont;
      if (lf) { const f = findFont(lf); if (f) loadFont(f); }
      if (tf) { const f = findFont(tf); if (f) loadFont(f); }
      if (cf) { const f = findFont(cf); if (f) loadFont(f); }
    }
  }, [template?.pageVariants]);

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
      highlight: { show: false, position: "none", style: "fit", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0, imageFit: "cover", imageLocked: false },
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
    if (s === "body") return activeVariant.body.show !== false;
    return true;
  };

  const toggleSection = (s: SectionType) => {
    if (!activeVariant) return;
    if (s === "header") updateVariant(activeVariant.id, { header: { ...activeVariant.header, show: !activeVariant.header.show } });
    if (s === "body") updateVariant(activeVariant.id, { body: { ...activeVariant.body, show: activeVariant.body.show === false } });
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

  /* ── Drag handlers (dnd-kit) ── */

  const handleSectionDragStart = (event: DragStartEvent) => {
    setActiveDragSection(event.active.id as SectionType);
    setHoveredSection(null);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragSection(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sectionOrder.indexOf(active.id as SectionType);
    const newIndex = sectionOrder.indexOf(over.id as SectionType);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
    setSectionOrder(newOrder);

    if (activeVariant) {
      updateVariant(activeVariant.id, { sectionOrder: newOrder });

      // Keep highlight position logic for backward compatibility
      const moved = active.id as SectionType;
      if (moved === "highlight") {
        const bodyIdx = newOrder.indexOf("body");
        const highlightIdx = newOrder.indexOf("highlight");
        const pos = highlightIdx < bodyIdx ? "top" : "bottom";
        updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, position: pos as "top" | "bottom" } });
      }
    }
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
                  <ColorRow label="Price" value={template.colors.price || template.colors.primary}
                    onChange={(v) => save({ colors: { ...template.colors, price: v } })} />
                </SettingsPanel>

                {/* ── Spacing ── */}
                <SettingsPanel
                  icon={<Space className={cn("w-4 h-4", openPanel === "spacing" ? "text-primary" : "text-muted-foreground")} />}
                  label="Spacing & Margins"
                  isOpen={openPanel === "spacing"}
                  onToggle={() => togglePanel("spacing")}
                  isHovered={hoveredPanel === "spacing"}
                  onMouseEnter={() => setHoveredPanel("spacing")}
                  onMouseLeave={() => setHoveredPanel(null)}
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleSectionDragStart} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                {sectionOrder.map((section) => {
                  const enabled = isSectionEnabled(section);

                  return (
                    <SortableSectionCard
                      key={section}
                      section={section}
                      enabled={enabled}
                      isActivePanel={openPanel === section && !lockedSections.has(section)}
                      isDragActive={!!activeDragSection}
                      isHovered={hoveredSection === section}
                      isLocked={lockedSections.has(section)}
                      onMouseEnter={() => { if (!activeDragSection) setHoveredSection(section); }}
                      onMouseLeave={() => { if (!activeDragSection) setHoveredSection(null); }}
                      onTogglePanel={() => { if (!lockedSections.has(section)) togglePanel(section); }}
                      onToggleSection={() => toggleSection(section)}
                      onToggleLock={() => toggleLock(section)}
                    >

                      {/* Expanded settings */}
                      {openPanel === section && enabled && !lockedSections.has(section) && (
                        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
                          {section === "header" && (
                            <>
                              <SelectRow label="Style" value={activeVariant.header.style}
                                options={[{ v: "centered", l: "Centered" }, { v: "left", l: "Left Aligned" }, { v: "right", l: "Right Aligned" }, { v: "custom", l: "Custom" }]}
                                onChange={(v) => {
                                  const newStyle = v as "centered" | "left" | "right" | "custom";
                                  if (newStyle === "custom" && activeVariant.header.style !== "custom") {
                                    // Initialize custom dimensions from page format (content area)
                                    const contentW = mmToPx(template.format.width) - template.spacing.marginLeft - template.spacing.marginRight;
                                    updateVariant(activeVariant.id, {
                                      header: {
                                        ...activeVariant.header,
                                        style: newStyle,
                                        offsetX: activeVariant.header.offsetX ?? 0,
                                        offsetY: activeVariant.header.offsetY ?? 0,
                                        customWidth: activeVariant.header.customWidth || contentW,
                                        customHeight: activeVariant.header.customHeight || 120,
                                      },
                                    });
                                  } else {
                                    updateVariant(activeVariant.id, { header: { ...activeVariant.header, style: newStyle } });
                                  }
                                }} />
                              {activeVariant.header.style === "custom" && (
                                <>
                                  <SelectRow label="Alignment" value={activeVariant.header.customAlignment || "center"}
                                    options={[{ v: "center", l: "Center" }, { v: "left", l: "Left" }, { v: "right", l: "Right" }]}
                                    onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, customAlignment: v as "center" | "left" | "right" } })} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="X" value={activeVariant.header.offsetX ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, offsetX: v } })} />
                                    <NumberRow label="Y" value={activeVariant.header.offsetY ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, offsetY: v } })} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="W" value={activeVariant.header.customWidth ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, customWidth: v || undefined } })} />
                                    <NumberRow label="H" value={activeVariant.header.customHeight ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, customHeight: v || undefined } })} />
                                  </div>
                                </>
                              )}
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
                                options={[{ v: "lines", l: "Decorative Lines" }, { v: "bold", l: "Bold Header" }, { v: "minimal", l: "Minimal" }, { v: "dots", l: "Dotted" }, { v: "custom", l: "Custom" }]}
                                onChange={(v) => {
                                  const newStyle = v as "lines" | "bold" | "minimal" | "dots" | "custom";
                                  if (newStyle === "custom" && activeVariant.body.categoryStyle !== "custom") {
                                    const contentW = mmToPx(template.format.width) - template.spacing.marginLeft - template.spacing.marginRight;
                                    const contentH = mmToPx(template.format.height) - template.spacing.marginTop - template.spacing.marginBottom;
                                    updateVariant(activeVariant.id, {
                                      body: {
                                        ...activeVariant.body,
                                        categoryStyle: newStyle,
                                        offsetX: activeVariant.body.offsetX ?? 0,
                                        offsetY: activeVariant.body.offsetY ?? 0,
                                        customWidth: activeVariant.body.customWidth || contentW,
                                        customHeight: activeVariant.body.customHeight || Math.round(contentH * 0.6),
                                      },
                                    });
                                  } else {
                                    updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryStyle: newStyle } });
                                  }
                                }} />
                              {activeVariant.body.categoryStyle === "custom" && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="X" value={activeVariant.body.offsetX ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, offsetX: v } })} />
                                    <NumberRow label="Y" value={activeVariant.body.offsetY ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, offsetY: v } })} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="W" value={activeVariant.body.customWidth ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, customWidth: v || undefined } })} />
                                    <NumberRow label="H" value={activeVariant.body.customHeight ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, customHeight: v || undefined } })} />
                                  </div>
                                  <SelectRow label="Cat. Alignment" value={activeVariant.body.categoryAlignment || "center"}
                                    options={[{ v: "left", l: "Left" }, { v: "center", l: "Center" }, { v: "right", l: "Right" }]}
                                    onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryAlignment: v as "left" | "center" | "right" } })} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="Font Size" value={activeVariant.body.categoryFontSize ?? 9} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryFontSize: v } })} />
                                    <NumberRow label="Spacing" value={activeVariant.body.categoryLetterSpacing ?? 0.25} unit="em" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryLetterSpacing: v } })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">Font</Label>
                                    <Select value={activeVariant.body.categoryFont || "__default__"} onValueChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryFont: v === "__default__" ? undefined : v } })}>
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue placeholder="Template heading font" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__default__">Default (heading)</SelectItem>
                                        {FONT_CATALOG.map(f => (
                                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <ToggleRow label="Underline" checked={activeVariant.body.categoryBorderBottom ?? false}
                                    onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryBorderBottom: v } })} />
                                </>
                              )}
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
                            </>
                          )}
                          {section === "highlight" && (
                            <>
                              {/* Style selector */}
                              <SelectRow label="Style" value={activeVariant.highlight.style || "fit"}
                                options={[
                                  { v: "fit", l: "Fit (margins)" },
                                  { v: "full-width", l: "Full Width" },
                                  { v: "custom", l: "Custom" },
                                ]}
                                onChange={(v) => {
                                  const newStyle = v as HighlightStyle;
                                  if (newStyle === "custom" && activeVariant.highlight.style !== "custom") {
                                    const contentW = mmToPx(template.format.width) - template.spacing.marginLeft - template.spacing.marginRight;
                                    updateVariant(activeVariant.id, {
                                      highlight: {
                                        ...activeVariant.highlight,
                                        style: newStyle,
                                        offsetX: activeVariant.highlight.offsetX ?? 0,
                                        offsetY: activeVariant.highlight.offsetY ?? 0,
                                        customWidth: activeVariant.highlight.customWidth || contentW,
                                        customHeight: activeVariant.highlight.customHeight || (activeVariant.highlight.height || 80),
                                      },
                                    });
                                  } else {
                                    updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, style: newStyle } });
                                  }
                                }} />

                              {/* Custom mode: position & size controls */}
                              {activeVariant.highlight.style === "custom" && (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="X" value={activeVariant.highlight.offsetX ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, offsetX: v } })} />
                                    <NumberRow label="Y" value={activeVariant.highlight.offsetY ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, offsetY: v } })} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <NumberRow label="W" value={activeVariant.highlight.customWidth ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, customWidth: v || undefined } })} />
                                    <NumberRow label="H" value={activeVariant.highlight.customHeight ?? 0} unit="px" compact
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, customHeight: v || undefined } })} />
                                  </div>
                                </>
                              )}

                              {/* Non-custom: height control */}
                              {activeVariant.highlight.style !== "custom" && (
                                <NumberRow label="Height" value={activeVariant.highlight.height ?? 80} unit="px"
                                  onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, height: v } })} />
                              )}

                              {/* Image Fit Mode */}
                              <SelectRow label="Image Fit" value={activeVariant.highlight.imageFit || "cover"}
                                options={[
                                  { v: "fit", l: "Fit" },
                                  { v: "contain", l: "Contain" },
                                  { v: "cover", l: "Cover" },
                                ]}
                                onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, imageFit: v as "fit" | "contain" | "cover" } })} />
                              
                              {/* Image Source */}
                              <div className="pt-2">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Image</Label>
                                <div className="space-y-2 mt-1.5">
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">URL</Label>
                                    <Input
                                      value={activeVariant.highlight.imageUrl || ""}
                                      placeholder="Paste image URL…"
                                      className="h-7 text-xs"
                                      onChange={(e) => updateVariant(activeVariant.id, { 
                                        highlight: { ...activeVariant.highlight, imageUrl: e.target.value } 
                                      })}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px]">Or import</Label>
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      className="h-7 text-xs"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                          updateVariant(activeVariant.id, {
                                            highlight: { ...activeVariant.highlight, imageUrl: reader.result as string }
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                  </div>
                                  {activeVariant.highlight.imageUrl && (
                                    <div className="flex items-center gap-1.5">
                                      <img src={activeVariant.highlight.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" />
                                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive"
                                        onClick={() => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, imageUrl: undefined } })}>
                                        Remove
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Lock image change in menu editor */}
                              <ToggleRow label="Lock Image" checked={activeVariant.highlight.imageLocked ?? false}
                                onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, imageLocked: v } })} />

                              {/* Margin (only for non-custom, since custom uses free positioning) */}
                              {activeVariant.highlight.style !== "custom" && (
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
                              )}

                              {/* Text Overlay Controls */}
                              <div className="pt-2">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Text Overlay</Label>
                                <div className="space-y-2 mt-1.5">
                                  {(() => {
                                    const hlText = () => ({
                                      alignment: activeVariant.highlight.text?.alignment ?? "left" as const,
                                      labelSize: activeVariant.highlight.text?.labelSize ?? 5,
                                      titleSize: activeVariant.highlight.text?.titleSize ?? 8,
                                      labelFont: activeVariant.highlight.text?.labelFont,
                                      titleFont: activeVariant.highlight.text?.titleFont,
                                    });
                                    const setHlText = (patch: Record<string, any>) =>
                                      updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, text: { ...hlText(), ...patch } } });
                                    return (
                                      <>
                                        <SelectRow label="Alignment" value={hlText().alignment}
                                          options={[{ v: "left", l: "Left" }, { v: "center", l: "Center" }, { v: "right", l: "Right" }]}
                                          onChange={(v) => setHlText({ alignment: v })} />
                                        <div className="grid grid-cols-2 gap-2">
                                          <NumberRow label="Label Size" value={hlText().labelSize} unit="px" compact
                                            onChange={(v) => setHlText({ labelSize: v })} />
                                          <NumberRow label="Title Size" value={hlText().titleSize} unit="px" compact
                                            onChange={(v) => setHlText({ titleSize: v })} />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Label Font</Label>
                                          <Select value={hlText().labelFont || "__default__"} onValueChange={(v) => setHlText({ labelFont: v === "__default__" ? undefined : v })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Template body font" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__default__">Default (body)</SelectItem>
                                              {FONT_CATALOG.map(f => (
                                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Title Font</Label>
                                          <Select value={hlText().titleFont || "__default__"} onValueChange={(v) => setHlText({ titleFont: v === "__default__" ? undefined : v })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Template heading font" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__default__">Default (heading)</SelectItem>
                                              {FONT_CATALOG.map(f => (
                                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </SortableSectionCard>
                  );
                })}
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                  {activeDragSection && (
                    <SectionCardOverlay section={activeDragSection} enabled={isSectionEnabled(activeDragSection)} />
                  )}
                </DragOverlay>
                </DndContext>
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
              highlightedSection={hoveredSection ?? (openPanel && ["header", "body", "highlight"].includes(openPanel) ? openPanel as SectionType : null)}
              isDraggingCard={!!activeDragSection}
              showMargins={hoveredPanel === "spacing" || openPanel === "spacing"}
              onClickSection={(section) => { if (!lockedSections.has(section)) setOpenPanel(openPanel === section ? null : section); }}
              lockedSections={lockedSections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sortable Section Card ───────────────────────────────────────────── */

function SortableSectionCard({ section, enabled, isActivePanel, isDragActive, isHovered, isLocked, onMouseEnter, onMouseLeave, onTogglePanel, onToggleSection, onToggleLock, children }: {
  section: SectionType;
  enabled: boolean;
  isActivePanel: boolean;
  isDragActive: boolean;
  isHovered: boolean;
  isLocked: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePanel: () => void;
  onToggleSection: () => void;
  onToggleLock: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section });

  const meta = SECTION_META[section];
  const Icon = meta.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "rounded-lg border transition-all",
        isDragging && "scale-95",
        !isDragging && "border-border",
        isActivePanel && "ring-1 ring-primary/30",
      )}
    >
      {/* Section header row */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 transition-colors",
          isActivePanel ? "rounded-t-lg" : "rounded-lg",
          !isHovered && (enabled ? "bg-background" : "bg-muted/30"),
          isActivePanel && !isHovered && "bg-primary/5",
        )}
        style={isHovered && !isDragging && !isActivePanel ? { backgroundColor: "#f6f7fe" } : undefined}
      >
        <div {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
        <button
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={onTogglePanel}
        >
          <Icon className={cn("w-4 h-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground/40")} />
          <span className={cn("text-xs font-semibold", enabled ? "text-foreground" : "text-muted-foreground/50")}>{meta.label}</span>
        </button>
        <button
          onClick={onToggleLock}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
          title={isLocked ? "Unlock section" : "Lock section"}
        >
          {isLocked
            ? <Lock className="w-3.5 h-3.5 text-amber-500" />
            : <Unlock className="w-3.5 h-3.5 text-muted-foreground/40" />}
        </button>
        <button
          onClick={onToggleSection}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
          title={enabled ? "Hide section" : "Show section"}
        >
          {enabled
            ? <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            : <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />}
        </button>
        <button onClick={isLocked ? onToggleLock : onTogglePanel} className="p-0.5">
          {isActivePanel
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Expanded settings (passed as children) */}
      {children}
    </div>
  );
}

/* ── Drag Overlay Card (ghost that follows cursor) ───────────────────── */

function SectionCardOverlay({ section, enabled }: { section: SectionType; enabled: boolean }) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;

  return (
    <div className="rounded-lg border border-primary bg-background shadow-lg opacity-90">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg",
        enabled ? "bg-background" : "bg-muted/30",
      )}>
        <GripVertical className="w-3.5 h-3.5 text-primary/40 shrink-0" />
        <Icon className={cn("w-4 h-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground/40")} />
        <span className={cn("text-xs font-semibold", enabled ? "text-foreground" : "text-muted-foreground/50")}>{meta.label}</span>
      </div>
    </div>
  );
}

/* ── Settings Panel (collapsible) ────────────────────────────────────── */

function SettingsPanel({ icon, label, badge, isOpen, onToggle, onMouseEnter, onMouseLeave, isHovered, children }: {
  icon: React.ReactNode; label: string; badge?: React.ReactNode; isOpen: boolean; onToggle: () => void;
  onMouseEnter?: () => void; onMouseLeave?: () => void; isHovered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-lg border transition-all", isOpen ? "ring-1 ring-primary/30 border-border" : "border-border")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-3 transition-colors",
          isOpen ? "rounded-t-lg bg-primary/5" : "rounded-lg",
        )}
        style={isHovered && !isOpen ? { backgroundColor: "#f6f7fe" } : undefined}
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
          className="w-[72px] h-6 text-[8px] font-mono px-1.5" />
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

function VariantPreview({ template, variant, sectionOrder, scale, onUpdateVariant, highlightedSection, isDraggingCard, showMargins, onClickSection, lockedSections }: {
  template: MenuTemplate; variant?: PageVariant; sectionOrder: SectionType[]; scale: number;
  onUpdateVariant?: (variantId: string, updates: Partial<PageVariant>) => void;
  highlightedSection?: SectionType | null;
  isDraggingCard?: boolean;
  showMargins?: boolean;
  onClickSection?: (section: SectionType) => void;
  lockedSections?: Set<SectionType>;
}) {
  /* ─── Figma-like interaction state ───────────────────────────────── */
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(null);
  const [hoverSection, setHoverSection] = useState<SectionType | null>(null);
  const [activeDragSection, setActiveDragSection] = useState<SectionType | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeState, setResizeState] = useState<{ section: SectionType; handle: string; w: number; h: number } | null>(null);
  const [activeGuides, setActiveGuides] = useState<{ type: "x" | "y"; value: number; source: SnapSource }[]>([]);

  // Refs for smooth drag/resize (avoids stale closures + React batching)
  const dragRef = useRef<{ section: SectionType; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ section: SectionType; handle: string; startX: number; startY: number; origW: number; origH: number; origOX: number; origOY: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const SNAP_DISTANCE = 8;
  const HANDLE_SIZE = 8;
  const GUIDE_COLOR = "#ff69b4";      // pink for center/edge guides
  const MARGIN_GUIDE_COLOR = "#e84393"; // darker pink for margin guides
  const SELECT_COLOR = "#0d99ff";     // Figma's blue

  // Sync selectedSection when panel highlights change
  useEffect(() => {
    if (highlightedSection) setSelectedSection(highlightedSection);
  }, [highlightedSection]);

  /* ─── Snap engine ────────────────────────────────────────────────── */

  type SnapSource = "edge" | "center" | "margin";
  type SnapPoint = { type: "x" | "y"; value: number; source: SnapSource };

  const getSnapPoints = (): SnapPoint[] => {
    const c = containerRef.current;
    if (!c) return [];
    const cw = c.clientWidth, ch = c.clientHeight;
    // Container has CSS padding = raw margin values (NOT scaled).
    // Absolutely-positioned children use the container's coordinate system
    // where left:0 = padding edge. So margin inner boundary = raw margin px.
    const { marginLeft: ml, marginRight: mr, marginTop: mt, marginBottom: mb } = template.spacing;
    return [
      // Full container edges (padding edge)
      { type: "x", value: 0, source: "edge" }, { type: "x", value: cw, source: "edge" },
      { type: "y", value: 0, source: "edge" }, { type: "y", value: ch, source: "edge" },
      // Container center
      { type: "x", value: cw / 2, source: "center" }, { type: "y", value: ch / 2, source: "center" },
      // Margin inner boundaries (raw px, matching CSS padding)
      { type: "x", value: ml, source: "margin" }, { type: "x", value: cw - mr, source: "margin" },
      { type: "y", value: mt, source: "margin" }, { type: "y", value: ch - mb, source: "margin" },
      // Content area center
      { type: "x", value: ml + (cw - ml - mr) / 2, source: "center" },
      { type: "y", value: mt + (ch - mt - mb) / 2, source: "center" },
    ];
  };

  /** Calculate snap deltas + guidelines for an element rect (all in rendered px) */
  const calculateSnap = (elLeft: number, elTop: number, elW: number, elH: number) => {
    const snapPoints = getSnapPoints();
    const t = SNAP_DISTANCE;
    let snapDx = 0, snapDy = 0;
    const guides: { type: "x" | "y"; value: number; source: SnapSource }[] = [];

    const edgesX = [elLeft, elLeft + elW / 2, elLeft + elW];
    const edgesY = [elTop, elTop + elH / 2, elTop + elH];

    let bestXDist = Infinity;
    for (const ex of edgesX) {
      for (const sp of snapPoints) {
        if (sp.type !== "x") continue;
        const d = Math.abs(ex - sp.value);
        if (d <= t && d < bestXDist) {
          bestXDist = d;
          snapDx = sp.value - ex;
          const idx = guides.findIndex(g => g.type === "x");
          if (idx >= 0) guides[idx] = { type: "x", value: sp.value, source: sp.source };
          else guides.push({ type: "x", value: sp.value, source: sp.source });
        }
      }
    }
    let bestYDist = Infinity;
    for (const ey of edgesY) {
      for (const sp of snapPoints) {
        if (sp.type !== "y") continue;
        const d = Math.abs(ey - sp.value);
        if (d <= t && d < bestYDist) {
          bestYDist = d;
          snapDy = sp.value - ey;
          const idx = guides.findIndex(g => g.type === "y");
          if (idx >= 0) guides[idx] = { type: "y", value: sp.value, source: sp.source };
          else guides.push({ type: "y", value: sp.value, source: sp.source });
        }
      }
    }
    return { snapDx, snapDy, guides };
  };

  /* ─── Drag effect (window-level listeners for smooth tracking) ──── */
  useEffect(() => {
    if (!activeDragSection) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      let newX = Math.round(d.origX + dx);
      let newY = Math.round(d.origY + dy);

      // Snap using rendered (scaled) coordinates
      const el = sectionRefs.current[d.section];
      if (el) {
        const elW = el.offsetWidth, elH = el.offsetHeight;
        const { snapDx, snapDy, guides } = calculateSnap(newX * scale, newY * scale, elW, elH);
        newX += Math.round(snapDx / scale);
        newY += Math.round(snapDy / scale);
        setActiveGuides(guides);
      }
      dragOffsetRef.current = { x: newX, y: newY };
      setDragOffset({ x: newX, y: newY });
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d || !onUpdateVariant || !variant) {
        dragRef.current = null; setActiveDragSection(null); setActiveGuides([]); return;
      }
      const final = dragOffsetRef.current;
      onUpdateVariant(variant.id, {
        [d.section]: { ...variant[d.section], offsetX: final.x, offsetY: final.y },
      });
      dragRef.current = null;
      setActiveDragSection(null);
      setActiveGuides([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [activeDragSection, scale, onUpdateVariant, variant]);

  /* ─── Resize effect ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!resizeState) return;
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      let newW = r.origW, newH = r.origH, newOX = r.origOX, newOY = r.origOY;
      const minSz = 20;

      // Handle-aware resize (each corner anchors the opposite corner)
      if (r.handle.includes("r")) newW = Math.max(minSz, r.origW + dx);
      if (r.handle.includes("l")) { newW = Math.max(minSz, r.origW - dx); newOX = r.origOX + (r.origW - newW); }
      if (r.handle.includes("b")) newH = Math.max(minSz, r.origH + dy);
      if (r.handle.includes("t")) { newH = Math.max(minSz, r.origH - dy); newOY = r.origOY + (r.origH - newH); }

      // Edge handles preserve the other dimension
      if (r.handle === "t" || r.handle === "b") newW = r.origW;
      if (r.handle === "l" || r.handle === "r") newH = r.origH;

      newW = Math.round(newW); newH = Math.round(newH);
      newOX = Math.round(newOX); newOY = Math.round(newOY);

      // Snap during resize
      const { guides } = calculateSnap(newOX * scale, newOY * scale, newW * scale, newH * scale);
      setActiveGuides(guides);

      resizeDimsRef.current = { w: newW, h: newH };
      dragOffsetRef.current = { x: newOX, y: newOY };
      setResizeState({ section: r.section, handle: r.handle, w: newW, h: newH });
      setDragOffset({ x: newOX, y: newOY });
    };
    const onUp = () => {
      const r = resizeRef.current;
      if (!r || !onUpdateVariant || !variant) {
        resizeRef.current = null; setResizeState(null); setActiveGuides([]); return;
      }
      const finalPos = dragOffsetRef.current;
      const finalDims = resizeDimsRef.current;
      onUpdateVariant(variant.id, {
        [r.section]: { ...variant[r.section], offsetX: finalPos.x, offsetY: finalPos.y, customWidth: finalDims.w, customHeight: finalDims.h },
      });
      resizeRef.current = null;
      setResizeState(null);
      setActiveGuides([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizeState, scale, onUpdateVariant, variant]);

  if (!variant) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Select a variant</div>;

  const data = sampleMenuData;
  const { colors, fonts, spacing } = template;
  const fs = (size: number) => `${size}px`;

  /* ─── Helpers ────────────────────────────────────────────────────── */

  const isSectionCustom = (section: SectionType): boolean => {
    if (section === "header") return variant.header.style === "custom";
    if (section === "body") return variant.body.categoryStyle === "custom";
    if (section === "highlight") return variant.highlight.style === "custom";
    return false;
  };

  const getOffset = (section: SectionType) => {
    if (activeDragSection === section || resizeState?.section === section) return dragOffset;
    const cfg = variant[section];
    return { x: cfg.offsetX ?? 0, y: cfg.offsetY ?? 0 };
  };

  const getDimensions = (section: SectionType) => {
    if (resizeState?.section === section) return { w: resizeState.w, h: resizeState.h };
    const cfg = variant[section] as any;
    return { w: cfg.customWidth as number | undefined, h: cfg.customHeight as number | undefined };
  };

  const startDrag = (e: React.MouseEvent, section: SectionType) => {
    e.preventDefault(); e.stopPropagation();
    const cfg = variant[section];
    const ox = cfg.offsetX ?? 0, oy = cfg.offsetY ?? 0;
    dragRef.current = { section, startX: e.clientX, startY: e.clientY, origX: ox, origY: oy };
    dragOffsetRef.current = { x: ox, y: oy };
    setDragOffset({ x: ox, y: oy });
    setActiveDragSection(section);
    setSelectedSection(section);
  };

  const startResize = (e: React.MouseEvent, section: SectionType, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    const cfg = variant[section] as any;
    const el = sectionRefs.current[section];
    const origW = cfg.customWidth || (el ? Math.round(el.offsetWidth / scale) : 200);
    const origH = cfg.customHeight || (el ? Math.round(el.offsetHeight / scale) : 100);
    const origOX = cfg.offsetX ?? 0, origOY = cfg.offsetY ?? 0;
    resizeRef.current = { section, handle, startX: e.clientX, startY: e.clientY, origW, origH, origOX, origOY };
    dragOffsetRef.current = { x: origOX, y: origOY };
    resizeDimsRef.current = { w: origW, h: origH };
    setDragOffset({ x: origOX, y: origOY });
    setResizeState({ section, handle, w: origW, h: origH });
    setSelectedSection(section);
  };

  /* ─── Section renderers ──────────────────────────────────────────── */

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
    const cfg = variant[section];
    if (!cfg.image?.url) return null;
    return (
      <div style={{
        position: "absolute", inset: 0,
        top: cfg.image.offsetY, left: cfg.image.offsetX,
        width: cfg.image.width, height: cfg.image.height,
        opacity: cfg.image.opacity, zIndex: 0, pointerEvents: "none",
      }}>
        <img src={cfg.image.url} alt="" style={{ width: "100%", height: "100%", objectFit: cfg.image.objectFit, borderRadius: "4px" }} />
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
            textAlign: variant.header.style === "custom"
              ? (variant.header.customAlignment || "center")
              : variant.header.style === "left" ? "left" : variant.header.style === "right" ? "right" : "center",
            paddingBottom: "16px",
          }}>
            {renderBackgroundImage("header")}
            {variant.header.showSubtitle && (
              <p style={{ fontSize: fs(7), letterSpacing: "0.3em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, marginBottom: "8px", fontFamily: fonts.body, position: "relative", zIndex: 1 }}>
                {data.subtitle}
              </p>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: fs(22), fontWeight: 400, fontStyle: "italic", letterSpacing: "0.05em", color: colors.text, position: "relative", zIndex: 1 }}>
              {data.restaurantName}
            </h1>
            {variant.header.showEstablished && data.established && (
              <p style={{ fontSize: fs(7), letterSpacing: "0.2em", color: colors.muted, textTransform: "uppercase", marginTop: "6px", fontFamily: fonts.body, position: "relative", zIndex: 1 }}>
                EST. {data.established}
              </p>
            )}
            {variant.header.showDivider && (
              <div style={{ display: "flex", justifyContent: variant.header.style === "custom" ? (variant.header.customAlignment === "left" ? "flex-start" : variant.header.customAlignment === "right" ? "flex-end" : "center") : variant.header.style === "left" ? "flex-start" : variant.header.style === "right" ? "flex-end" : "center", marginTop: "12px", position: "relative", zIndex: 1 }}>
                <span style={{ width: "40px", height: "1px", backgroundColor: colors.muted, opacity: 0.3 }} />
              </div>
            )}
          </div>
        );
      case "body":
        if (variant.body.show === false) return null;
        return (
          <div style={{
            position: "relative",
            display: variant.body.columns > 1 ? "grid" : "block",
            gridTemplateColumns: variant.body.columns > 1 ? `repeat(${variant.body.columns}, 1fr)` : undefined,
            gap: variant.body.columns > 1 ? `0 ${spacing.categoryGap * 0.3}px` : undefined,
            flex: 1,
          }}>
            {data.categories.map((cat, catIdx) => (
              <div key={cat.id} style={{ marginBottom: `${spacing.categoryGap * 0.4}px`, position: "relative", zIndex: 1 }}>
                <div style={{
                  textAlign: variant.body.categoryStyle === "custom" ? (variant.body.categoryAlignment || "center") : variant.body.itemAlignment,
                  marginBottom: `${spacing.itemGap * 0.4}px`,
                  display: variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" ? "flex" : "block",
                  alignItems: "center", justifyContent: "center", gap: "8px",
                }}>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                  <h2 style={{
                    fontSize: fs(variant.body.categoryStyle === "custom"
                      ? (variant.body.categoryFontSize ?? 9)
                      : variant.body.categoryStyle === "bold" ? 9 : 8),
                    letterSpacing: variant.body.categoryStyle === "custom"
                      ? `${variant.body.categoryLetterSpacing ?? 0.25}em`
                      : "0.25em",
                    color: colors.primary, textTransform: "uppercase",
                    fontWeight: variant.body.categoryStyle === "bold" || variant.body.categoryStyle === "custom" ? 800 : 600,
                    whiteSpace: "nowrap",
                    fontFamily: variant.body.categoryStyle === "custom"
                      ? (variant.body.categoryFont || fonts.heading)
                      : variant.body.categoryStyle === "bold" ? fonts.heading : fonts.body,
                    borderBottom: (variant.body.categoryStyle === "bold" || (variant.body.categoryStyle === "custom" && variant.body.categoryBorderBottom))
                      ? `2px solid ${colors.primary}` : "none",
                    paddingBottom: (variant.body.categoryStyle === "bold" || (variant.body.categoryStyle === "custom" && variant.body.categoryBorderBottom))
                      ? "4px" : "0",
                  }}>
                    {cat.name}
                  </h2>
                  {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                    <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.itemGap * 0.3}px` }}>
                  {cat.items.slice(0, variant.body.columns > 1 ? 2 : 3).map((item) => (
                    <div key={item.id} style={{ textAlign: variant.body.itemAlignment }}>
                      <div style={{
                        display: variant.body.pricePosition === "right" ? "flex" : "block",
                        justifyContent: variant.body.pricePosition === "right" ? "space-between" : undefined,
                        alignItems: "baseline",
                      }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: variant.body.itemAlignment === "center" ? "center" : variant.body.itemAlignment === "right" ? "flex-end" : "flex-start" }}>
                          <p style={{ fontSize: fs(8), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: fonts.body, color: colors.text }}>
                            {item.name}
                          </p>
                          {variant.body.pricePosition === "inline" && (
                            <span style={{ fontSize: fs(7), color: colors.price || colors.primary, fontWeight: 600 }}>€{item.price}</span>
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
                            <span style={{ fontSize: fs(7), color: colors.price || colors.primary, fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price}</span>
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
                        <p style={{ fontSize: fs(7), color: colors.price || colors.primary, fontWeight: 600, marginTop: "3px" }}>€{item.price}</p>
                      )}
                    </div>
                  ))}
                </div>
                {catIdx < data.categories.length - 1 && variant.body.separatorStyle !== "dotted" && renderSeparator(variant.body.separatorStyle)}
              </div>
            ))}
          </div>
        );
      case "highlight": {
        if (!variant.highlight.show) return null;
        const hl = variant.highlight;
        const hlStyle = hl.style || "fit";
        const hlImage = hl.imageUrl || data.highlightImage;
        const hlFit = hl.imageFit || "cover";
        const isCustom = hlStyle === "custom";
        const isFullWidth = hlStyle === "full-width";
        const txt = hl.text;
        const textAlign = txt?.alignment || "left";
        const labelSize = txt?.labelSize ?? 5;
        const titleSize = txt?.titleSize ?? 8;
        const labelFont = txt?.labelFont || fonts.body;
        const titleFont = txt?.titleFont || fonts.heading;

        // Margins: "fit" uses margins, "full-width" breaks out of padding, "custom" uses free positioning
        const mLeft = template.spacing.marginLeft ?? 0;
        const mRight = template.spacing.marginRight ?? 0;
        const containerStyle: React.CSSProperties = isCustom
          ? { position: "relative" }
          : isFullWidth
            ? {
                position: "relative",
                marginLeft: -mLeft,
                marginRight: -mRight,
                width: `calc(100% + ${mLeft + mRight}px)`,
              }
            : {
                position: "relative",
                marginTop: `${hl.marginTop ?? 12}px`,
                marginBottom: `${hl.marginBottom ?? 0}px`,
                marginLeft: `${hl.marginLeft ?? 0}px`,
                marginRight: `${hl.marginRight ?? 0}px`,
              };

        // Image dimensions
        const imgHeight = isCustom ? (hl.customHeight ?? hl.height ?? 80) : (hl.height ?? 80);
        const imgObjectFit = hlFit === "fit" ? ("fill" as const) : hlFit;

        return (
          <div style={containerStyle}>
            <div style={{ borderRadius: isFullWidth ? 0 : "4px", overflow: "hidden", position: "relative", zIndex: 1 }}>
              {hlImage ? (
                <img src={hlImage} alt="" style={{ 
                  width: "100%", 
                  height: `${imgHeight}px`, 
                  objectFit: imgObjectFit,
                }} />
              ) : (
                <div style={{ width: "100%", height: `${imgHeight}px`, background: `${colors.muted}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: fs(6), color: colors.muted, fontFamily: fonts.body }}>No image set</p>
                </div>
              )}
              <div style={{ 
                position: "absolute", bottom: 0, left: 0, right: 0, 
                padding: "6px 8px", 
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                textAlign,
              }}>
                <p style={{ fontSize: fs(labelSize), color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: labelFont }}>{data.highlightLabel}</p>
                <p style={{ fontSize: fs(titleSize), color: "white", fontStyle: "italic", fontFamily: titleFont }}>{data.highlightTitle}</p>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  /* ─── Figma-like element wrapper ─────────────────────────────────── */

  const wrapSection = (section: SectionType, content: React.ReactNode) => {
    const offset = getOffset(section);
    const dims = getDimensions(section);
    const isDragging = activeDragSection === section;
    const isResizing = resizeState?.section === section;
    const isInteracting = isDragging || isResizing;
    const isHovered = hoverSection === section;
    const isSelected = selectedSection === section;
    const isHighlighted = highlightedSection === section && !isInteracting;
    const canDrag = isSectionCustom(section);
    const isLocked = lockedSections?.has(section) ?? false;
    const showHandles = canDrag && (isSelected || isInteracting) && !isDragging;

    if (isLocked) {
      return (
        <div key={section} style={{ position: "relative", pointerEvents: "none", opacity: 0.6 }}>
          {content}
        </div>
      );
    }

    // Determine outline style (Figma-like: blue on select, light blue on hover)
    let outline = "none";
    let outlineOffset = "0px";
    if (isInteracting) {
      outline = `2px solid ${SELECT_COLOR}`;
      outlineOffset = "0px";
    } else if (isSelected) {
      outline = `2px solid ${SELECT_COLOR}`;
      outlineOffset = "0px";
    } else if (isHighlighted) {
      outline = `2px solid ${SELECT_COLOR}88`;
      outlineOffset = "0px";
    } else if (isHovered) {
      outline = `1px solid ${SELECT_COLOR}66`;
      outlineOffset = "0px";
    }

    // Resize handle positions: 4 corners + 4 edge midpoints
    const hs = HANDLE_SIZE;
    const handles = canDrag ? [
      { id: "tl", cursor: "nwse-resize", top: -hs / 2, left: -hs / 2 },
      { id: "tr", cursor: "nesw-resize", top: -hs / 2, right: -hs / 2 },
      { id: "bl", cursor: "nesw-resize", bottom: -hs / 2, left: -hs / 2 },
      { id: "br", cursor: "nwse-resize", bottom: -hs / 2, right: -hs / 2 },
      { id: "t", cursor: "ns-resize", top: -hs / 2, left: "calc(50% - 4px)" },
      { id: "b", cursor: "ns-resize", bottom: -hs / 2, left: "calc(50% - 4px)" },
      { id: "l", cursor: "ew-resize", top: "calc(50% - 4px)", left: -hs / 2 },
      { id: "r", cursor: "ew-resize", top: "calc(50% - 4px)", right: -hs / 2 },
    ] : [];

    return (
      <div
        key={section}
        ref={(el) => { sectionRefs.current[section] = el; }}
        onMouseDown={(e) => {
          // Click to select; start drag only for custom sections
          setSelectedSection(section);
          onClickSection?.(section);
          if (canDrag) startDrag(e, section);
        }}
        onMouseEnter={() => setHoverSection(section)}
        onMouseLeave={() => setHoverSection(null)}
        style={{
          position: canDrag ? "absolute" : "relative",
          left: canDrag ? offset.x * scale : undefined,
          top: canDrag ? offset.y * scale : undefined,
          width: canDrag && dims.w ? dims.w * scale : undefined,
          height: canDrag && dims.h ? dims.h * scale : undefined,
          cursor: isDragging ? "grabbing" : canDrag ? "move" : "pointer",
          outline,
          outlineOffset,
          borderRadius: "2px",
          transition: isInteracting ? "none" : "outline 0.15s ease",
          userSelect: "none",
          zIndex: isInteracting ? 100 : canDrag ? 10 : undefined,
        }}
      >
        {/* Content container — clips content for custom/absolute sections */}
        <div style={{
          width: "100%", height: "100%",
          overflow: canDrag && dims.w ? "hidden" : undefined,
          borderRadius: "2px",
        }}>
          {content}
        </div>

        {/* Resize handles — Figma style: white squares with blue border */}
        {showHandles && handles.map(h => (
          <div
            key={h.id}
            onMouseDown={(e) => startResize(e, section, h.id)}
            style={{
              position: "absolute",
              width: hs, height: hs,
              top: h.top, left: h.left, right: h.right, bottom: h.bottom,
              backgroundColor: "white",
              border: `1.5px solid ${SELECT_COLOR}`,
              borderRadius: "1px",
              cursor: h.cursor,
              zIndex: 20,
              pointerEvents: "auto",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.1)",
            } as React.CSSProperties}
          />
        ))}

        {/* Position/size tooltip (Figma-style, top-center) */}
        {isInteracting && (
          <div style={{
            position: "absolute",
            top: -22, left: "50%", transform: "translateX(-50%)",
            fontSize: "9px", fontFamily: "'Inter', monospace", fontWeight: 500,
            background: "rgba(0,0,0,0.8)", color: "white",
            padding: "2px 6px", borderRadius: "3px",
            whiteSpace: "nowrap", pointerEvents: "none", zIndex: 30,
            letterSpacing: "0.02em",
          }}>
            {isResizing
              ? `${dims.w ?? "?"} × ${dims.h ?? "?"}`
              : `${offset.x}, ${offset.y}`
            }
          </div>
        )}
      </div>
    );
  };

  /* ─── Margin overlays (each side gets a distinct pink tint) ─────── */

  const mrgColors = {
    top:    "rgba(255, 105, 180, 0.14)",   // hot pink
    bottom: "rgba(219, 112, 147, 0.16)",   // pale violet red
    left:   "rgba(255, 82, 120, 0.13)",    // warm rose
    right:  "rgba(240, 128, 170, 0.15)",   // light pink
  };
  const mrgLabelStyle: React.CSSProperties = {
    position: "absolute", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "7px", fontWeight: 600, fontFamily: "'Inter', monospace", color: "#e84393",
    pointerEvents: "none", zIndex: 5,
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col"
      onClick={(e) => {
        // Deselect on clicking empty canvas space (Figma behavior)
        if (e.target === e.currentTarget) {
          setSelectedSection(null);
          onClickSection?.(null as any);
        }
      }}
      style={{
        position: "relative",
        fontFamily: fonts.body, color: colors.text, backgroundColor: colors.background,
        padding: `${spacing.marginTop}px ${spacing.marginRight}px ${spacing.marginBottom}px ${spacing.marginLeft}px`,
      }}
    >
      {/* Margin overlays — each side a distinct pink tint */}
      {(showMargins || !!activeDragSection || !!resizeState) && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: spacing.marginTop, backgroundColor: mrgColors.top, zIndex: 4, pointerEvents: "none" }}>
            {spacing.marginTop > 8 && <div style={{ ...mrgLabelStyle, inset: 0 }}>{spacing.marginTop}</div>}
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: spacing.marginBottom, backgroundColor: mrgColors.bottom, zIndex: 4, pointerEvents: "none" }}>
            {spacing.marginBottom > 8 && <div style={{ ...mrgLabelStyle, inset: 0 }}>{spacing.marginBottom}</div>}
          </div>
          <div style={{ position: "absolute", top: spacing.marginTop, bottom: spacing.marginBottom, left: 0, width: spacing.marginLeft, backgroundColor: mrgColors.left, zIndex: 4, pointerEvents: "none" }}>
            {spacing.marginLeft > 8 && <div style={{ ...mrgLabelStyle, inset: 0, writingMode: "vertical-lr", transform: "rotate(180deg)" }}>{spacing.marginLeft}</div>}
          </div>
          <div style={{ position: "absolute", top: spacing.marginTop, bottom: spacing.marginBottom, right: 0, width: spacing.marginRight, backgroundColor: mrgColors.right, zIndex: 4, pointerEvents: "none" }}>
            {spacing.marginRight > 8 && <div style={{ ...mrgLabelStyle, inset: 0, writingMode: "vertical-lr" }}>{spacing.marginRight}</div>}
          </div>
        </>
      )}

      {/* Snap guidelines — margin guides in darker pink, others in regular pink */}
      {activeGuides.map((g, i) => {
        const color = g.source === "margin" ? MARGIN_GUIDE_COLOR : GUIDE_COLOR;
        const dash = g.source === "margin" ? "4px 3px" : "5px 5px";
        const weight = g.source === "margin" ? "1.5px" : "1px";
        return g.type === "x" ? (
          <div key={`g${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: g.value, width: 0, borderLeft: `${weight} dashed ${color}`, pointerEvents: "none", zIndex: 25 }} />
        ) : (
          <div key={`g${i}`} style={{ position: "absolute", left: 0, right: 0, top: g.value, height: 0, borderTop: `${weight} dashed ${color}`, pointerEvents: "none", zIndex: 25 }} />
        );
      })}

      {/* Render sections in order */}
      {sectionOrder.map((section) => {
        const content = renderSection(section);
        if (!content) return null;
        return wrapSection(section, content);
      })}
    </div>
  );
}