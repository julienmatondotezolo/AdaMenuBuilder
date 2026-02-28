import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  Palette,
  Type,
  Columns3,
  Ruler,
  ImageIcon,
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

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const template = useTemplateById(id);

  const [activeVariantId, setActiveVariantId] = useState<string>("");
  const [expandedPanel, setExpandedPanel] = useState<string | null>("format");

  useEffect(() => {
    if (template && !activeVariantId) {
      setActiveVariantId(template.pageVariants[0]?.id || "");
    }
  }, [template]);

  if (!template) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading...</div>;
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
      id: `var-${crypto.randomUUID()}`,
      name: `Page ${template.pageVariants.length + 1}`,
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none" },
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
    const source = template.pageVariants.find((v) => v.id === variantId);
    if (!source) return;
    const copy: PageVariant = { ...source, id: `var-${crypto.randomUUID()}`, name: `${source.name} (Copy)` };
    save({ pageVariants: [...template.pageVariants, copy] });
    setActiveVariantId(copy.id);
  };

  const previewW = mmToPx(template.format.width);
  const previewH = mmToPx(template.format.height);
  const scale = Math.min(400 / previewW, 600 / previewH, 1);

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 bg-background border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/templates")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-foreground">{template.name}</h1>
            <p className="text-[10px] text-muted-foreground">{template.format.type} · {template.pageVariants.length} variants</p>
          </div>
        </div>
        <Badge variant="secondary">{template.format.width} × {template.format.height} mm</Badge>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Settings */}
        <div className="w-80 shrink-0 border-r border-border bg-background overflow-y-auto">
          {/* Page variant tabs */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold">Page Variants</Label>
              <Button variant="ghost" size="icon-sm" onClick={addVariant}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {template.pageVariants.map((v) => (
                <Button
                  key={v.id}
                  variant={activeVariantId === v.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setActiveVariantId(v.id)}
                >
                  {v.name}
                </Button>
              ))}
            </div>
          </div>

          {activeVariant && (
            <div className="p-3 space-y-2">
              {/* Variant name + actions */}
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={activeVariant.name}
                  onChange={(e) => updateVariant(activeVariant.id, { name: e.target.value })}
                  className="flex-1 h-8 text-sm font-medium"
                />
                <Button variant="ghost" size="icon-sm" onClick={() => duplicateVariant(activeVariant.id)} title="Duplicate variant">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                {template.pageVariants.length > 1 && (
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteVariant(activeVariant.id)} title="Delete variant" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Settings panels */}
              <SettingsPanel title="Page Format" icon={<Ruler className="w-3.5 h-3.5" />} isOpen={expandedPanel === "format"} onToggle={() => setExpandedPanel(expandedPanel === "format" ? null : "format")}>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["A4", "A5", "DL", "LONG", "CUSTOM"] as const).map((fmt) => (
                    <Button
                      key={fmt}
                      variant={template.format.type === fmt ? "default" : "outline"}
                      size="sm"
                      className="text-[10px] h-7 px-1"
                      onClick={() => {
                        const f = fmt === "CUSTOM" ? { type: "CUSTOM" as const, width: template.format.width, height: template.format.height } : PAGE_FORMATS[fmt];
                        save({ format: f });
                      }}
                    >
                      {fmt}
                    </Button>
                  ))}
                </div>
                {template.format.type === "CUSTOM" && (
                  <div className="flex gap-2 mt-2">
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

              <SettingsPanel title="Header" icon={<Type className="w-3.5 h-3.5" />} isOpen={expandedPanel === "header"} onToggle={() => setExpandedPanel(expandedPanel === "header" ? null : "header")}>
                <ToggleRow label="Show Header" checked={activeVariant.header.show}
                  onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, show: v } })} />
                {activeVariant.header.show && (
                  <>
                    <SelectRow label="Style" value={activeVariant.header.style}
                      options={[{ v: "centered", l: "Centered" }, { v: "left", l: "Left Aligned" }, { v: "minimal", l: "Minimal" }]}
                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, style: v as any } })} />
                    <ToggleRow label="Subtitle" checked={activeVariant.header.showSubtitle}
                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showSubtitle: v } })} />
                    <ToggleRow label="Established" checked={activeVariant.header.showEstablished}
                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showEstablished: v } })} />
                    <ToggleRow label="Divider" checked={activeVariant.header.showDivider}
                      onChange={(v) => updateVariant(activeVariant.id, { header: { ...activeVariant.header, showDivider: v } })} />
                  </>
                )}
              </SettingsPanel>

              <SettingsPanel title="Body Layout" icon={<Columns3 className="w-3.5 h-3.5" />} isOpen={expandedPanel === "body"} onToggle={() => setExpandedPanel(expandedPanel === "body" ? null : "body")}>
                <SelectRow label="Columns" value={String(activeVariant.body.columns)}
                  options={[{ v: "1", l: "1 Column" }, { v: "2", l: "2 Columns" }, { v: "3", l: "3 Columns" }]}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, columns: Number(v) } })} />
                <SelectRow label="Category Style" value={activeVariant.body.categoryStyle}
                  options={[{ v: "lines", l: "Decorative Lines" }, { v: "bold", l: "Bold Header" }, { v: "minimal", l: "Minimal" }, { v: "dots", l: "Dotted" }]}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, categoryStyle: v as any } })} />
                <SelectRow label="Item Alignment" value={activeVariant.body.itemAlignment}
                  options={[{ v: "center", l: "Centered" }, { v: "left", l: "Left Aligned" }]}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, itemAlignment: v as any } })} />
                <SelectRow label="Price Position" value={activeVariant.body.pricePosition}
                  options={[{ v: "below", l: "Below" }, { v: "right", l: "Right" }, { v: "inline", l: "Inline" }]}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, pricePosition: v as any } })} />
                <ToggleRow label="Descriptions" checked={activeVariant.body.showDescriptions}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showDescriptions: v } })} />
                <ToggleRow label="Featured Badge" checked={activeVariant.body.showFeaturedBadge}
                  onChange={(v) => updateVariant(activeVariant.id, { body: { ...activeVariant.body, showFeaturedBadge: v } })} />
              </SettingsPanel>

              <SettingsPanel title="Highlight Image" icon={<ImageIcon className="w-3.5 h-3.5" />} isOpen={expandedPanel === "highlight"} onToggle={() => setExpandedPanel(expandedPanel === "highlight" ? null : "highlight")}>
                <ToggleRow label="Show Highlight" checked={activeVariant.highlight.show}
                  onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, show: v } })} />
                {activeVariant.highlight.show && (
                  <SelectRow label="Position" value={activeVariant.highlight.position}
                    options={[{ v: "bottom", l: "Bottom" }, { v: "top", l: "Top" }]}
                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, position: v as any } })} />
                )}
              </SettingsPanel>

              <SettingsPanel title="Colors" icon={<Palette className="w-3.5 h-3.5" />} isOpen={expandedPanel === "colors"} onToggle={() => setExpandedPanel(expandedPanel === "colors" ? null : "colors")}>
                <ColorRow label="Primary" value={template.colors.primary}
                  onChange={(v) => save({ colors: { ...template.colors, primary: v, accent: v } })} />
                <ColorRow label="Background" value={template.colors.background}
                  onChange={(v) => save({ colors: { ...template.colors, background: v } })} />
                <ColorRow label="Text" value={template.colors.text}
                  onChange={(v) => save({ colors: { ...template.colors, text: v } })} />
                <ColorRow label="Muted" value={template.colors.muted}
                  onChange={(v) => save({ colors: { ...template.colors, muted: v } })} />
              </SettingsPanel>
            </div>
          )}
        </div>

        {/* Right: Live preview */}
        <div className="flex-1 flex items-center justify-center bg-muted/50 overflow-auto p-8">
          <Card className="overflow-hidden" style={{ width: previewW * scale, height: previewH * scale }}>
            <VariantPreview template={template} variant={activeVariant} />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible settings panel ──────────────────────────────────────── */

function SettingsPanel({ title, icon, isOpen, onToggle, children }: {
  title: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Card>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors">
        <span className="text-muted-foreground">{icon}</span>
        {title}
        <ChevronDown className={cn("w-3 h-3 ml-auto text-muted-foreground transition-transform", !isOpen && "-rotate-90")} />
      </button>
      {isOpen && <CardContent className="px-3 pb-3 pt-0 space-y-2.5">{children}</CardContent>}
    </Card>
  );
}

/* ── Control rows ────────────────────────────────────────────────────── */

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-[11px] font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] font-normal shrink-0">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-[11px] min-w-0 w-auto">
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
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[11px] font-normal">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value.startsWith("#") ? value : "#4d6aff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded-md border border-border cursor-pointer p-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-24 h-7 text-[10px] font-mono" />
      </div>
    </div>
  );
}

/* ── Mini preview ────────────────────────────────────────────────────── */

function VariantPreview({ template, variant }: { template: MenuTemplate; variant?: PageVariant }) {
  if (!variant) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Select a page variant</div>;

  const data = sampleMenuData;
  const { colors, fonts, spacing } = template;

  return (
    <div className="h-full overflow-hidden" style={{
      fontFamily: fonts.body, color: colors.text, backgroundColor: colors.background,
      padding: `${spacing.marginTop}px ${spacing.marginRight}px ${spacing.marginBottom}px ${spacing.marginLeft}px`,
    }}>
      {variant.header.show && (
        <div className={variant.header.style === "left" ? "text-left pb-4" : "text-center pb-4"}>
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
      )}

      <div style={{
        display: variant.body.columns > 1 ? "grid" : "block",
        gridTemplateColumns: variant.body.columns > 1 ? `repeat(${variant.body.columns}, 1fr)` : undefined,
        gap: variant.body.columns > 1 ? "0 16px" : undefined,
      }}>
        {data.categories.map((cat) => (
          <div key={cat.id} style={{ marginBottom: `${spacing.categoryGap * 0.4}px` }}>
            <div className={variant.body.itemAlignment === "left" ? "text-left mb-3" : "flex items-center justify-center gap-2 mb-3"}>
              {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                <span style={{ flex: "1", maxWidth: "30px", height: "1px", backgroundColor: colors.primary, opacity: 0.3 }} />
              )}
              <h2 style={{ fontSize: "8px", letterSpacing: "0.25em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>
                {cat.name}
              </h2>
              {variant.body.categoryStyle === "lines" && variant.body.itemAlignment === "center" && (
                <span style={{ flex: "1", maxWidth: "30px", height: "1px", backgroundColor: colors.primary, opacity: 0.3 }} />
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

      {variant.highlight.show && data.highlightImage && (
        <div style={{ marginTop: "auto", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
          <img src={data.highlightImage} alt="" style={{ width: "100%", height: "60px", objectFit: "cover" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
            <p style={{ fontSize: "5px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{data.highlightLabel}</p>
            <p style={{ fontSize: "8px", color: "white", fontStyle: "italic" }}>{data.highlightTitle}</p>
          </div>
        </div>
      )}
    </div>
  );
}
