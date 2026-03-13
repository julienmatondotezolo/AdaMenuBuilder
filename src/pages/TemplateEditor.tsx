import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
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
  Sparkles,
  Shapes,
  TypeOutline,
  Paintbrush,
  Link2,
  Link2Off,
  Rocket,
  FileText,
  Smartphone,
  Monitor,
  QrCode,
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
import { useTemplateById, updateTemplate, deleteTemplate, downloadTemplate, getTemplateHash } from "../db/hooks";
import type { MenuTemplate, PageVariant, VariantBodyConfig, HighlightStyle, Decoration, ShapeDecoration, TextDecoration, ImageDecoration, DecorationGradient, ShapePreset } from "../types/template";
import { PAGE_FORMATS, mmToPx } from "../types/template";
import { sampleMenuData } from "../data/sampleMenu";
import { useMenus } from "../db/hooks";
import type { MenuData } from "../types/menu";
import { FONT_CATALOG, FONT_PAIRINGS, loadTemplateFonts, fontDisplayName, findFont, loadFont, type FontPairing } from "../data/fonts";
import { SHAPE_PRESETS } from "../data/decorationPresets";
import DecorationRenderer from "../components/Preview/DecorationRenderer";
import MaskEditor from "../components/Preview/MaskEditor";
import { readImageFile } from "../utils/imageUpload";
import { useAuth } from "../context/AuthContext";
import {
  fetchRestaurants,
  fetchPublishStatus,
  publishTemplate,
  updatePublishedTemplate,
  unpublishTemplate,
  setTemplateDefault,
  type Restaurant,
  type PublishStatus,
} from "../services/templateApi";

/* ── Section order type for drag-and-drop ────────────────────────────── */

import type { SectionType } from "../types/template";
import { getBodyForSection, isBodySection } from "../types/template";

const BASE_SECTION_META: Record<string, { label: string; icon: typeof TypeIcon }> = {
  header: { label: "Header", icon: TypeIcon },
  body: { label: "Menu Content", icon: Columns3 },
  highlight: { label: "Highlight Image", icon: ImageIcon },
};

function getSectionMeta(section: SectionType): { label: string; icon: typeof TypeIcon } {
  if (BASE_SECTION_META[section]) return BASE_SECTION_META[section];
  const m = section.match(/^body-(\d+)$/);
  if (m) return { label: `Menu Content ${m[1]}`, icon: Columns3 };
  return { label: section, icon: Columns3 };
}

/* ── Panel types ─────────────────────────────────────────────────────── */

type PanelId = SectionType | "format" | "colors" | "fonts" | "spacing" | "decorations";

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
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState("paper");

  // Decoration state
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);
  const [maskEditingDecoId, setMaskEditingDecoId] = useState<string | null>(null);

  // Drag state (dnd-kit)
  const [activeDragSection, setActiveDragSection] = useState<SectionType | null>(null);
  const [hoveredSection, setHoveredSection] = useState<SectionType | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<PanelId | null>(null);
  const [lockedSections, setLockedSections] = useState<Set<SectionType>>(new Set());
  const [capturingThumbnail, setCapturingThumbnail] = useState(false);

  // Auth & publish state
  const { user, token } = useAuth();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>({});
  const [publishLoading, setPublishLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Preview data source — "sample" or a menu ID (persisted in template)
  const [previewDataSource, setPreviewDataSource] = useState<string>("sample");
  const allMenus = useMenus();
  // Sync from template once loaded
  useEffect(() => {
    if (template?.previewMenuId) setPreviewDataSource(template.previewMenuId);
  }, [template?.previewMenuId]);
  const hasRealMenus = allMenus && allMenus.some((m) => m.data.categories.some((c) => c.items.length > 0));
  const previewData: MenuData = (() => {
    if (previewDataSource === "sample") return sampleMenuData;
    const menu = allMenus?.find((m) => m.id === previewDataSource);
    return menu?.data ?? sampleMenuData;
  })();

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

  // Load custom fonts (highlight text, custom category, decorations)
  useEffect(() => {
    if (!template) return;
    for (const v of template.pageVariants) {
      const lf = v.highlight.text?.labelFont;
      const tf = v.highlight.text?.titleFont;
      const cf = v.body.categoryFont;
      if (lf) { const f = findFont(lf); if (f) loadFont(f); }
      if (tf) { const f = findFont(tf); if (f) loadFont(f); }
      if (cf) { const f = findFont(cf); if (f) loadFont(f); }
      // Load decoration text fonts
      for (const deco of v.decorations ?? []) {
        if (deco.kind === "text") {
          const df = findFont((deco as import("../types/template").TextDecoration).fontFamily);
          if (df) loadFont(df);
        }
      }
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
      const extraBodySections: SectionType[] = (v.extraBodies ?? []).map((_, i) => `body-${i + 2}` as SectionType);
      if (v.highlight.show && v.highlight.position === "top") {
        setSectionOrder(["header", "highlight", "body", ...extraBodySections]);
      } else {
        setSectionOrder(["header", "body", ...extraBodySections, "highlight"]);
      }
    }
  }, [activeVariantId, template]);

  // useLiveQuery returns undefined while loading AND when not found.
  // After a short delay, show "not found" instead of infinite loading.
  useEffect(() => {
    if (template) { setLoadTimeout(false); return; }
    const timer = setTimeout(() => setLoadTimeout(true), 2000);
    return () => clearTimeout(timer);
  }, [template]);

  // Delete selected decoration on Delete/Backspace key
  // (must be before early return to maintain consistent hook count)
  const activeVariantForEffect = template?.pageVariants.find((v) => v.id === activeVariantId);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedDecorationId || !activeVariantForEffect) return;
      // Don't trigger when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        // Delete inline — can't call deleteDecoration since it's defined after early return
        const existing = activeVariantForEffect.decorations ?? [];
        if (id) {
          updateTemplate(id, {
            pageVariants: (template?.pageVariants ?? []).map((v) =>
              v.id === activeVariantForEffect.id
                ? { ...v, decorations: existing.filter((d) => d.id !== selectedDecorationId) }
                : v
            ),
          });
        }
        setSelectedDecorationId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDecorationId, activeVariantForEffect, id, template?.pageVariants]);

  // Fetch restaurants + publish status when dialog opens
  useEffect(() => {
    if (!showPublishDialog || !token || !template) return;
    setPublishLoading(true);
    setPublishError(null);
    Promise.all([
      fetchRestaurants(token),
      fetchPublishStatus(token, template.name),
    ]).then(([r, s]) => {
      setRestaurants(r);
      setPublishStatus(s);
    }).catch(() => {
      setRestaurants([]);
      setPublishStatus({});
    }).finally(() => setPublishLoading(false));
  }, [showPublishDialog, token, template?.name]);

  if (!template) {
    if (loadTimeout) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-muted-foreground text-sm">Template not found</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/templates")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Templates
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const activeVariant = template.pageVariants.find((v) => v.id === activeVariantId);

  const save = (updates: Partial<MenuTemplate>) => {
    if (id) updateTemplate(id, updates);
    setIsDirty(true);
    setShowSaved(false);
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
    if (isBodySection(s)) {
      const b = getBodyForSection(activeVariant, s);
      return b ? b.show !== false : false;
    }
    return true;
  };

  const toggleSection = (s: SectionType) => {
    if (!activeVariant) return;
    if (s === "header") updateVariant(activeVariant.id, { header: { ...activeVariant.header, show: !activeVariant.header.show } });
    if (s === "body") updateVariant(activeVariant.id, { body: { ...activeVariant.body, show: activeVariant.body.show === false } });
    if (s === "highlight") updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, show: !activeVariant.highlight.show, position: !activeVariant.highlight.show ? "bottom" : "none" } });
    if (isBodySection(s) && s !== "body") {
      const bodies = [...(activeVariant.extraBodies ?? [])];
      const m = s.match(/^body-(\d+)$/);
      if (m) {
        const idx = Number(m[1]) - 2;
        if (bodies[idx]) {
          bodies[idx] = { ...bodies[idx], show: bodies[idx].show === false };
          updateVariant(activeVariant.id, { extraBodies: bodies });
        }
      }
    }
  };

  const addBodySection = () => {
    if (!activeVariant) return;
    const bodies = [...(activeVariant.extraBodies ?? [])];
    const newBody: VariantBodyConfig = {
      columns: 1,
      categoryStyle: "bold",
      itemAlignment: "left",
      pricePosition: "right",
      separatorStyle: "none",
      showDescriptions: true,
      showFeaturedBadge: false,
    };
    bodies.push(newBody);
    const idx = bodies.length + 1; // "body-2", "body-3", …
    const newSection = `body-${idx}` as SectionType;
    const newOrder = [...sectionOrder, newSection];
    setSectionOrder(newOrder);
    updateVariant(activeVariant.id, { extraBodies: bodies, sectionOrder: newOrder });
  };

  const removeBodySection = (section: SectionType) => {
    if (!activeVariant || section === "body") return;
    const m = section.match(/^body-(\d+)$/);
    if (!m) return;
    const idx = Number(m[1]) - 2;
    const bodies = [...(activeVariant.extraBodies ?? [])];
    bodies.splice(idx, 1);
    // Rebuild section order — remove this section and renumber remaining
    const newOrder = sectionOrder.filter((s) => s !== section).map((s) => {
      const bm = s.match(/^body-(\d+)$/);
      if (!bm) return s;
      const bIdx = Number(bm[1]);
      if (bIdx > Number(m[1])) return `body-${bIdx - 1}` as SectionType;
      return s;
    });
    setSectionOrder(newOrder);
    updateVariant(activeVariant.id, { extraBodies: bodies, sectionOrder: newOrder });
    if (openPanel === section) setOpenPanel(null);
  };

  const duplicateBodySection = (section: SectionType) => {
    if (!activeVariant) return;
    const src = getBodyForSection(activeVariant, section);
    if (!src) return;
    const copy: VariantBodyConfig = { ...src };
    const bodies = [...(activeVariant.extraBodies ?? [])];
    bodies.push(copy);
    const idx = bodies.length + 1;
    const newSection = `body-${idx}` as SectionType;
    // Insert the copy right after the source section in the order
    const srcIdx = sectionOrder.indexOf(section);
    const newOrder = [...sectionOrder];
    newOrder.splice(srcIdx + 1, 0, newSection);
    setSectionOrder(newOrder);
    updateVariant(activeVariant.id, { extraBodies: bodies, sectionOrder: newOrder });
  };

  const togglePanel = (panelId: PanelId) => setOpenPanel(openPanel === panelId ? null : panelId);

  /* ── Decoration helpers ── */

  const addDecoration = (deco: Decoration) => {
    if (!activeVariant) return;
    const existing = activeVariant.decorations ?? [];
    updateVariant(activeVariant.id, { decorations: [...existing, deco] });
    setSelectedDecorationId(deco.id);
  };

  const updateDecoration = (decoId: string, updates: Partial<Decoration>) => {
    if (!activeVariant) return;
    const existing = activeVariant.decorations ?? [];
    updateVariant(activeVariant.id, {
      decorations: existing.map((d) => (d.id === decoId ? { ...d, ...updates } as Decoration : d)),
    });
  };

  const deleteDecoration = (decoId: string) => {
    if (!activeVariant) return;
    const existing = activeVariant.decorations ?? [];
    updateVariant(activeVariant.id, {
      decorations: existing.filter((d) => d.id !== decoId),
    });
    if (selectedDecorationId === decoId) setSelectedDecorationId(null);
  };

  const duplicateDecoration = (decoId: string) => {
    if (!activeVariant) return;
    const existing = activeVariant.decorations ?? [];
    const src = existing.find((d) => d.id === decoId);
    if (!src) return;
    const copy = { ...src, id: `deco-${uid()}`, x: src.x + 20, y: src.y + 20 };
    updateVariant(activeVariant.id, { decorations: [...existing, copy] });
    setSelectedDecorationId(copy.id);
  };

  const addShapeDecoration = (shape: ShapePreset) => {
    const preset = SHAPE_PRESETS.find((s) => s.id === shape);
    if (!preset) return;
    const pageW = mmToPx(template.format.width);
    const pageH = mmToPx(template.format.height);
    const deco: ShapeDecoration = {
      id: `deco-${uid()}`,
      kind: "shape",
      shape,
      x: Math.round((pageW - preset.defaultWidth) / 2),
      y: Math.round((pageH - preset.defaultHeight) / 2),
      width: preset.defaultWidth,
      height: preset.defaultHeight,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      fill: template.colors.primary,
    };
    addDecoration(deco);
  };

  const addTextDecoration = () => {
    const pageW = mmToPx(template.format.width);
    const pageH = mmToPx(template.format.height);
    const deco: TextDecoration = {
      id: `deco-${uid()}`,
      kind: "text",
      text: "MENU",
      fontFamily: template.fonts.heading,
      fontSize: 48,
      fontWeight: 700,
      fontStyle: "normal",
      letterSpacing: 0.1,
      textTransform: "uppercase",
      fill: template.colors.primary,
      x: Math.round((pageW - 200) / 2),
      y: Math.round(pageH * 0.05),
      width: 200,
      height: 70,
      rotation: 0,
      opacity: 1,
      zIndex: 2,
    };
    addDecoration(deco);
  };

  const addImageDecoration = (src: string) => {
    const pageW = mmToPx(template.format.width);
    const pageH = mmToPx(template.format.height);
    const deco: ImageDecoration = {
      id: `deco-${uid()}`,
      kind: "image",
      src,
      objectFit: "cover",
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      rotation: 0,
      opacity: 0.5,
      zIndex: 0,
    };
    addDecoration(deco);
  };

  const selectedDecoration = activeVariant?.decorations?.find((d) => d.id === selectedDecorationId) ?? null;

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

  const handleSave = async () => {
    if (!id || isSaving) return;
    setIsSaving(true);
    try {
      // Capture thumbnail from preview
      if (previewRef.current) {
        try {
          // Hide selection outlines / guidelines / resize handles during capture
          setCapturingThumbnail(true);
          // Wait a tick for React to re-render without outlines
          await new Promise((r) => setTimeout(r, 50));

          const dataUrl = await toPng(previewRef.current, {
            width: previewRef.current.offsetWidth,
            height: previewRef.current.offsetHeight,
            pixelRatio: 0.4, // small thumbnail
            cacheBust: true,
            skipFonts: true, // skip cross-origin Google Fonts stylesheets
            filter: (node: HTMLElement) => {
              // Filter out snap guideline elements (they have dashed borders)
              if (node.dataset?.snapGuide === "true") return false;
              // Filter out margin overlay elements
              if (node.dataset?.marginOverlay === "true") return false;
              return true;
            },
          });
          await updateTemplate(id, { thumbnail: dataUrl });
        } catch (err) {
          // Thumbnail capture failed — save without it
          console.warn("Thumbnail capture failed", err);
        } finally {
          setCapturingThumbnail(false);
        }
      }
      setIsDirty(false);
      setShowSaved(true);
    } finally {
      setIsSaving(false);
    }
  };

  const buildProjectJson = () => {
    if (!template) return {};
    return {
      _format: 'ada-menu-template',
      _version: 2,
      format: template.format,
      orientation: template.orientation,
      colors: template.colors,
      fonts: template.fonts,
      spacing: template.spacing,
      previewMenuId: template.previewMenuId,
      pageVariants: template.pageVariants.map(v => ({
        name: v.name,
        header: v.header,
        body: v.body,
        highlight: v.highlight,
        extraBodies: v.extraBodies,
        sectionOrder: v.sectionOrder,
        decorations: v.decorations,
      })),
    };
  };

  const handlePublishTo = async (restaurantId: string) => {
    if (!token || !template) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const existing = publishStatus[restaurantId];
      if (existing) {
        // Update existing published template
        await updatePublishedTemplate(token, restaurantId, existing.id, {
          name: template.name,
          description: template.description,
          thumbnail: template.thumbnail,
          project_json: buildProjectJson(),
          published_by: user?.id,
        });
      } else {
        // Publish new
        await publishTemplate(token, restaurantId, {
          name: template.name,
          description: template.description,
          thumbnail: template.thumbnail,
          project_json: buildProjectJson(),
          is_default: false,
          published_by: user?.id,
        });
      }
      // Refresh status
      const s = await fetchPublishStatus(token, template.name);
      setPublishStatus(s);
      // Update local publish tracking
      if (id) {
        await updateTemplate(id, {
          publishedAt: new Date().toISOString(),
          publishedHash: getTemplateHash(template),
          hasLocalChanges: false,
        });
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublishFrom = async (restaurantId: string) => {
    if (!token || !template) return;
    const existing = publishStatus[restaurantId];
    if (!existing) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      await unpublishTemplate(token, restaurantId, existing.id);
      const s = await fetchPublishStatus(token, template.name);
      setPublishStatus(s);
      // If no longer published anywhere, clear local publish status
      if (id && Object.keys(s).length === 0) {
        await updateTemplate(id, { publishedAt: undefined, publishedHash: undefined, hasLocalChanges: false });
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to unpublish');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleDefault = async (restaurantId: string, value: boolean) => {
    if (!token) return;
    const existing = publishStatus[restaurantId];
    if (!existing) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      await setTemplateDefault(token, restaurantId, existing.id, value);
      const s = await fetchPublishStatus(token, template!.name);
      setPublishStatus(s);
    } catch (err: any) {
      setPublishError(err.message || 'Failed to update default');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishToAll = async () => {
    if (!token || !template) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      for (const r of restaurants) {
        const existing = publishStatus[r.id];
        if (existing) {
          await updatePublishedTemplate(token, r.id, existing.id, {
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail,
            project_json: buildProjectJson(),
            published_by: user?.id,
          });
        } else {
          await publishTemplate(token, r.id, {
            name: template.name,
            description: template.description,
            thumbnail: template.thumbnail,
            project_json: buildProjectJson(),
            is_default: false,
            published_by: user?.id,
          });
        }
      }
      const s = await fetchPublishStatus(token, template.name);
      setPublishStatus(s);
      if (id) {
        await updateTemplate(id, {
          publishedAt: new Date().toISOString(),
          publishedHash: getTemplateHash(template),
          hasLocalChanges: false,
        });
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
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
            {template.hasLocalChanges && (
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">Unpublished changes</Badge>
            )}
            {template.publishedAt && !template.hasLocalChanges && (
              <Badge variant="default" className="text-[10px]">Published</Badge>
            )}
            {!template.publishedAt && !template.isBuiltIn && !template.hasLocalChanges && (
              <Badge variant="outline" className="text-[10px]">Draft</Badge>
            )}
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
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <Button variant="outline" size="sm" onClick={() => setShowPublishDialog(true)}>
              <Rocket className="w-4 h-4 mr-1.5" />
              Publish
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (!isDirty && showSaved)}
            variant={!isDirty && showSaved ? "outline" : "default"}
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isSaving ? "Saving..." : !isDirty && showSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </header>

      {/* Delete confirmation dialog */}
      {/* Mask editor dialog */}
      {maskEditingDecoId && (() => {
        const deco = activeVariant?.decorations?.find((d) => d.id === maskEditingDecoId) as ImageDecoration | undefined;
        if (!deco || deco.kind !== "image") return null;
        return (
          <Dialog open onOpenChange={() => setMaskEditingDecoId(null)}>
            <DialogContent className="sm:max-w-[900px]">
              <DialogHeader>
                <DialogTitle>Edit Mask</DialogTitle>
                <DialogDescription>
                  Paint to hide areas of the image. Switch to Reveal mode to bring back hidden areas.
                </DialogDescription>
              </DialogHeader>
              <MaskEditor
                width={deco.width}
                height={deco.height}
                imageSrc={deco.src}
                existingMask={deco.maskDataUri}
                onSave={(mask) => {
                  updateDecoration(deco.id, { maskDataUri: mask });
                  setMaskEditingDecoId(null);
                }}
                onCancel={() => setMaskEditingDecoId(null)}
              />
            </DialogContent>
          </Dialog>
        );
      })()}

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

      {/* Publish dialog */}
      {showPublishDialog && (
        <Dialog open onOpenChange={(open) => !open && setShowPublishDialog(false)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Publish Settings</DialogTitle>
              <DialogDescription>
                Manage where this template is published. Toggle per restaurant, set defaults, or publish to all.
              </DialogDescription>
            </DialogHeader>
            {publishLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading restaurants...</div>
            ) : restaurants.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No restaurants found.</div>
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto py-2">
                {restaurants.map((r) => {
                  const pub = publishStatus[r.id];
                  const isPublished = !!pub;
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        {isPublished && (
                          <p className="text-[11px] text-muted-foreground">
                            Published {new Date(pub.updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isPublished && (
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className="text-[11px] text-muted-foreground">Default</span>
                            <Switch
                              checked={pub.is_default}
                              onCheckedChange={(v) => handleToggleDefault(r.id, v)}
                              disabled={isPublishing}
                            />
                          </label>
                        )}
                        {isPublished ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handlePublishTo(r.id)}
                              disabled={isPublishing}
                            >
                              Update
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleUnpublishFrom(r.id)}
                              disabled={isPublishing}
                            >
                              Unpublish
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handlePublishTo(r.id)}
                            disabled={isPublishing}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {publishError && (
              <p className="text-sm text-destructive px-1">{publishError}</p>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePublishToAll}
                disabled={isPublishing || restaurants.length === 0}
              >
                {isPublishing ? 'Publishing...' : 'Publish to All'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPublishDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
                {/* ── Preview Data Source ── */}
                {hasRealMenus && (
                  <div className="mb-2 pb-2 border-b border-border/50">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Preview Data</Label>
                    <Select value={previewDataSource} onValueChange={(v) => { setPreviewDataSource(v); save({ previewMenuId: v }); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sample">Sample menu</SelectItem>
                        {allMenus?.filter((m) => m.data.categories.some((c) => c.items.length > 0)).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.data.title || m.title || "Untitled Menu"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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

                {/* ── Decorations ── */}
                <SettingsPanel
                  icon={<Sparkles className={cn("w-4 h-4", openPanel === "decorations" ? "text-primary" : "text-muted-foreground")} />}
                  label="Decorations"
                  isOpen={openPanel === "decorations"}
                  onToggle={() => togglePanel("decorations")}
                  isHovered={hoveredPanel === "decorations"}
                  onMouseEnter={() => setHoveredPanel("decorations")}
                  onMouseLeave={() => setHoveredPanel(null)}
                >
                  {/* Add shape / text buttons */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Add Element</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SHAPE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => addShapeDecoration(preset.id)}
                          className="flex flex-col items-center gap-0.5 p-1.5 rounded-md border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          title={preset.label}
                        >
                          <div className="w-7 h-7 flex items-center justify-center">
                            <svg viewBox={preset.viewBox} className="w-6 h-6">
                              {preset.path ? (
                                <g transform="translate(100,100)">
                                  <path d={preset.path} fill="currentColor" opacity={0.6} />
                                </g>
                              ) : preset.id === "circle" ? (
                                <circle cx="100" cy="100" r="90" fill="currentColor" opacity={0.6} />
                              ) : preset.id === "ellipse" ? (
                                <ellipse cx="100" cy="50" rx="90" ry="45" fill="currentColor" opacity={0.6} />
                              ) : (
                                <rect x="10" y="10" width="180" height="180" rx="4" fill="currentColor" opacity={0.6} />
                              )}
                            </svg>
                          </div>
                          <span className="text-[8px] text-muted-foreground truncate w-full text-center">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={addTextDecoration}
                    >
                      <TypeOutline className="w-3 h-3 mr-1.5" />
                      Add Text
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => document.getElementById("deco-image-input")?.click()}
                    >
                      <ImageIcon className="w-3 h-3 mr-1.5" />
                      Add Image
                    </Button>
                    <input
                      id="deco-image-input"
                      type="file"
                      accept="image/*,.heic,.heif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUri = await readImageFile(file);
                          addImageDecoration(dataUri);
                        } catch (err) {
                          console.error("Failed to load image:", err);
                        }
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* List of existing decorations */}
                  {(activeVariant?.decorations ?? []).length > 0 && (
                    <div className="mt-3 space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Elements</Label>
                      {(activeVariant?.decorations ?? []).map((deco) => {
                        const defaultName = deco.kind === "text" ? (deco as TextDecoration).text : deco.kind === "image" ? "Image" : (deco as ShapeDecoration).shape;
                        const displayName = deco.name || defaultName;
                        return (
                        <div
                          key={deco.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                            selectedDecorationId === deco.id
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedDecorationId(deco.id)}
                        >
                          {deco.kind === "shape" ? (
                            <Shapes className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : deco.kind === "image" ? (
                            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <TypeOutline className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("truncate flex-1", deco.hidden && "opacity-40")} title={displayName}>
                            {displayName}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateDecoration(deco.id, { locked: !deco.locked }); }}
                            className={cn("p-0.5", deco.locked ? "text-primary" : "text-muted-foreground/40 hover:text-foreground")}
                            title={deco.locked ? "Unlock element" : "Lock element"}
                          >
                            {deco.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateDecoration(deco.id, { hidden: !deco.hidden }); }}
                            className={cn("p-0.5", deco.hidden ? "text-muted-foreground/40 hover:text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title={deco.hidden ? "Show element" : "Hide element"}
                          >
                            {deco.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); duplicateDecoration(deco.id); }}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteDecoration(deco.id); }}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Property editor for selected decoration */}
                  {selectedDecoration && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Properties</Label>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                        <Input
                          value={selectedDecoration.name || ""}
                          placeholder={selectedDecoration.kind === "text" ? (selectedDecoration as TextDecoration).text : selectedDecoration.kind === "image" ? "Image" : (selectedDecoration as ShapeDecoration).shape}
                          onChange={(e) => updateDecoration(selectedDecoration.id, { name: e.target.value || undefined })}
                          className="text-xs h-7 mt-0.5"
                        />
                      </div>
                      {(() => {
                        const pageW = mmToPx(template.format.width);
                        const pageH = mmToPx(template.format.height);
                        return (
                          <div className="space-y-1.5">
                            <SliderRow label="X" value={selectedDecoration.x} min={-pageW} max={pageW * 2} unit="px"
                              onChange={(v) => updateDecoration(selectedDecoration.id, { x: v })} />
                            <SliderRow label="Y" value={selectedDecoration.y} min={-pageH} max={pageH * 2} unit="px"
                              onChange={(v) => updateDecoration(selectedDecoration.id, { y: v })} />
                          </div>
                        );
                      })()}
                      {/* W/H with sliders */}
                      {(() => {
                        const pageW = mmToPx(template.format.width);
                        const pageH = mmToPx(template.format.height);
                        const maxW = pageW * 2;
                        const maxH = pageH * 2;
                        const onChangeW = (v: number) => {
                          const updates: Partial<Decoration> = { width: v };
                          if (selectedDecoration.aspectRatioLocked && selectedDecoration.width > 0) {
                            updates.height = Math.round(v * selectedDecoration.height / selectedDecoration.width);
                          }
                          updateDecoration(selectedDecoration.id, updates);
                        };
                        const onChangeH = (v: number) => {
                          const updates: Partial<Decoration> = { height: v };
                          if (selectedDecoration.aspectRatioLocked && selectedDecoration.height > 0) {
                            updates.width = Math.round(v * selectedDecoration.width / selectedDecoration.height);
                          }
                          updateDecoration(selectedDecoration.id, updates);
                        };
                        return (
                          <div className="space-y-1.5">
                            <SliderRow label="W" value={selectedDecoration.width} min={20} max={maxW} unit="px" onChange={onChangeW} />
                            <SliderRow label="H" value={selectedDecoration.height} min={20} max={maxH} unit="px" onChange={onChangeH} />
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => updateDecoration(selectedDecoration.id, { aspectRatioLocked: !selectedDecoration.aspectRatioLocked })}
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded transition-colors w-full",
                          selectedDecoration.aspectRatioLocked
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                        title={selectedDecoration.aspectRatioLocked ? "Unlock aspect ratio (hold Shift while resizing to toggle)" : "Lock aspect ratio (hold Shift while resizing to toggle)"}
                      >
                        {selectedDecoration.aspectRatioLocked
                          ? <Link2 className="w-3 h-3" />
                          : <Link2Off className="w-3 h-3" />}
                        {selectedDecoration.aspectRatioLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                        <span className="ml-auto text-[9px] text-muted-foreground/60">Shift to toggle</span>
                      </button>
                      <SliderRow label="Rotate" value={selectedDecoration.rotation} min={-180} max={180} unit="°"
                        onChange={(v) => updateDecoration(selectedDecoration.id, { rotation: v })} />
                      <SliderRow label="Opacity" value={Math.round(selectedDecoration.opacity * 100)} min={0} max={100} unit="%"
                        onChange={(v) => updateDecoration(selectedDecoration.id, { opacity: Math.max(0, Math.min(100, v)) / 100 })} />
                      <SliderRow label="Z-Index" value={selectedDecoration.zIndex} min={-10} max={50} unit=""
                        onChange={(v) => updateDecoration(selectedDecoration.id, { zIndex: v })} />

                      {/* Fill color (not for image decorations) */}
                      {selectedDecoration.kind !== "image" && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fill</Label>
                        {typeof (selectedDecoration as ShapeDecoration | TextDecoration).fill === "string" ? (
                          <div className="flex items-center gap-2">
                            <ColorRow label="Color" value={(selectedDecoration as ShapeDecoration | TextDecoration).fill as string}
                              onChange={(v) => updateDecoration(selectedDecoration.id, { fill: v })} />
                          </div>
                        ) : (
                          <GradientEditor
                            gradient={(selectedDecoration as ShapeDecoration | TextDecoration).fill as DecorationGradient}
                            onChange={(g) => updateDecoration(selectedDecoration.id, { fill: g })}
                          />
                        )}
                        <div className="flex gap-1">
                          <button
                            className={cn("text-[9px] px-1.5 py-0.5 rounded border", typeof (selectedDecoration as ShapeDecoration | TextDecoration).fill === "string" ? "bg-primary/10 border-primary/30" : "border-border/50")}
                            onClick={() => {
                              const fill = (selectedDecoration as ShapeDecoration | TextDecoration).fill;
                              if (typeof fill !== "string") {
                                updateDecoration(selectedDecoration.id, { fill: fill.stops[0]?.color || template.colors.primary });
                              }
                            }}
                          >
                            Solid
                          </button>
                          <button
                            className={cn("text-[9px] px-1.5 py-0.5 rounded border", typeof (selectedDecoration as ShapeDecoration | TextDecoration).fill !== "string" ? "bg-primary/10 border-primary/30" : "border-border/50")}
                            onClick={() => {
                              const fill = (selectedDecoration as ShapeDecoration | TextDecoration).fill;
                              if (typeof fill === "string") {
                                updateDecoration(selectedDecoration.id, {
                                  fill: { type: "linear", angle: 135, stops: [{ offset: 0, color: fill }, { offset: 1, color: template.colors.accent }] },
                                });
                              }
                            }}
                          >
                            Gradient
                          </button>
                        </div>
                      </div>
                      )}

                      {/* Shape-specific: stroke */}
                      {selectedDecoration.kind === "shape" && (
                        <div className="space-y-1.5">
                          <ColorRow label="Stroke" value={(selectedDecoration as ShapeDecoration).stroke || "transparent"}
                            onChange={(v) => updateDecoration(selectedDecoration.id, { stroke: v })} />
                          <SliderRow label="Stroke W" value={(selectedDecoration as ShapeDecoration).strokeWidth || 0} min={0} max={20} unit="px"
                            onChange={(v) => updateDecoration(selectedDecoration.id, { strokeWidth: v })} />
                        </div>
                      )}

                      {/* Text-specific properties */}
                      {selectedDecoration.kind === "text" && (() => {
                        const td = selectedDecoration as TextDecoration;
                        return (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Text</Label>
                              <Input
                                value={td.text}
                                onChange={(e) => updateDecoration(td.id, { text: e.target.value })}
                                className="text-xs h-7 mt-0.5"
                              />
                            </div>
                            <SelectRow label="Font" value={td.fontFamily}
                              options={FONT_CATALOG.map((f) => ({ v: f.family, l: f.name }))}
                              onChange={(v) => {
                                const font = findFont(v);
                                if (font) loadFont(font);
                                updateDecoration(td.id, { fontFamily: v });
                              }} />
                            <SliderRow label="Size" value={td.fontSize} min={8} max={200} unit="px"
                              onChange={(v) => updateDecoration(td.id, { fontSize: v })} />
                            <SliderRow label="Weight" value={td.fontWeight} min={100} max={900} unit=""
                              onChange={(v) => updateDecoration(td.id, { fontWeight: Math.round(v / 100) * 100 })} />
                            <div className="grid grid-cols-2 gap-2">
                              <NumberRow label="Spacing" value={td.letterSpacing} unit="em" compact
                                onChange={(v) => updateDecoration(td.id, { letterSpacing: v })} />
                              <SelectRow label="Case" value={td.textTransform}
                                options={[{ v: "none", l: "None" }, { v: "uppercase", l: "ABC" }, { v: "lowercase", l: "abc" }]}
                                onChange={(v) => updateDecoration(td.id, { textTransform: v as "none" | "uppercase" | "lowercase" })} />
                            </div>
                            <SelectRow label="Style" value={td.fontStyle}
                              options={[{ v: "normal", l: "Normal" }, { v: "italic", l: "Italic" }]}
                              onChange={(v) => updateDecoration(td.id, { fontStyle: v as "normal" | "italic" })} />
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Shadow</Label>
                              <Input
                                value={td.textShadow || ""}
                                placeholder="e.g. 2px 2px 4px rgba(0,0,0,0.3)"
                                onChange={(e) => updateDecoration(td.id, { textShadow: e.target.value || undefined })}
                                className="text-xs h-7 mt-0.5"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Image-specific properties */}
                      {selectedDecoration.kind === "image" && (() => {
                        const img = selectedDecoration as ImageDecoration;
                        return (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Image Source</Label>
                              {img.src.startsWith("data:") ? (
                                <p className="text-[9px] text-muted-foreground/60 mt-0.5">Uploaded image</p>
                              ) : (
                                <Input
                                  value={img.src}
                                  placeholder="https://..."
                                  onChange={(e) => updateDecoration(img.id, { src: e.target.value })}
                                  className="text-xs h-7 mt-0.5"
                                />
                              )}
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Replace Image</Label>
                              <input
                                type="file"
                                accept="image/*,.heic,.heif"
                                className="text-[10px] mt-0.5 w-full"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const dataUri = await readImageFile(file);
                                    updateDecoration(img.id, { src: dataUri });
                                  } catch (err) {
                                    console.error("Failed to load image:", err);
                                  }
                                }}
                              />
                            </div>
                            <SelectRow label="Fit" value={img.objectFit}
                              options={[{ v: "cover", l: "Cover" }, { v: "contain", l: "Contain" }, { v: "fill", l: "Fill" }]}
                              onChange={(v) => updateDecoration(img.id, { objectFit: v as "cover" | "contain" | "fill" })} />
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] text-foreground/80">Lock Position</Label>
                              <Switch
                                checked={!!img.locked}
                                onCheckedChange={(v) => updateDecoration(img.id, { locked: v })}
                              />
                            </div>
                            {/* Mask tool */}
                            <div className="space-y-1 pt-1 border-t border-border/50">
                              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mask</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7"
                                onClick={() => setMaskEditingDecoId(img.id)}
                              >
                                <Paintbrush className="w-3 h-3 mr-1.5" />
                                Edit Mask
                              </Button>
                              {img.maskDataUri && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-xs h-6 text-destructive hover:text-destructive"
                                  onClick={() => updateDecoration(img.id, { maskDataUri: undefined })}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Clear Mask
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
                  // Body helper: get config and updater for any body section
                  const bodyConfig = isBodySection(section) ? getBodyForSection(activeVariant, section) : undefined;
                  const updateBody = (updates: Partial<VariantBodyConfig>) => {
                    if (section === "body") {
                      updateVariant(activeVariant.id, { body: { ...activeVariant.body, ...updates } });
                    } else {
                      const m = section.match(/^body-(\d+)$/);
                      if (!m) return;
                      const idx = Number(m[1]) - 2;
                      const bodies = [...(activeVariant.extraBodies ?? [])];
                      if (bodies[idx]) {
                        bodies[idx] = { ...bodies[idx], ...updates };
                        updateVariant(activeVariant.id, { extraBodies: bodies });
                      }
                    }
                  };

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
                          {isBodySection(section) && bodyConfig && (
                            <>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="flex-1 text-xs h-6 justify-start"
                                  onClick={() => duplicateBodySection(section)}>
                                  <Copy className="w-3 h-3 mr-1" /> Duplicate
                                </Button>
                                {section !== "body" && (
                                  <Button variant="ghost" size="sm" className="flex-1 text-xs h-6 text-destructive hover:text-destructive justify-start"
                                    onClick={() => removeBodySection(section)}>
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                  </Button>
                                )}
                              </div>
                              {/* ── Layout ── */}
                              <div>
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Layout</Label>
                                <div className="space-y-1.5 mt-2">
                                  <SelectRow label="Columns" value={String(bodyConfig.columns)}
                                    options={[{ v: "1", l: "1 Column" }, { v: "2", l: "2 Columns" }, { v: "3", l: "3 Columns" }]}
                                    onChange={(v) => updateBody({ columns: Number(v) })} />
                                  <SelectRow label="Alignment" value={bodyConfig.itemAlignment}
                                    options={[{ v: "center", l: "Centered" }, { v: "left", l: "Left Aligned" }, { v: "right", l: "Right Aligned" }]}
                                    onChange={(v) => updateBody({ itemAlignment: v as "center" | "left" | "right" })} />
                                  <SelectRow label="Price" value={bodyConfig.pricePosition}
                                    options={[{ v: "below", l: "Below Name" }, { v: "right", l: "Right Side" }, { v: "inline", l: "Inline" }]}
                                    onChange={(v) => updateBody({ pricePosition: v as "right" | "below" | "inline" })} />
                                  {bodyConfig.pricePosition === "right" && (
                                    <>
                                      <ToggleRow label="Price Far Right" checked={!!bodyConfig.priceJustifyRight}
                                        onChange={(v) => updateBody({ priceJustifyRight: v })} />
                                      <SelectRow label="Separator" value={bodyConfig.separatorStyle}
                                        options={[{ v: "line", l: "Solid Line" }, { v: "dotted", l: "Dotted" }, { v: "none", l: "None" }]}
                                        onChange={(v) => updateBody({ separatorStyle: v as "line" | "dotted" | "none" })} />
                                    </>
                                  )}
                                  {/* Max categories per body section */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[11px] text-muted-foreground">Categories limit</Label>
                                      <div className="flex items-center gap-1.5">
                                        <Label className="text-[10px] text-muted-foreground">All</Label>
                                        <Switch
                                          checked={!bodyConfig.maxCategories}
                                          onCheckedChange={(checked) => updateBody({ maxCategories: checked ? undefined : 3 })}
                                          className="scale-75 origin-right"
                                        />
                                      </div>
                                    </div>
                                    {bodyConfig.maxCategories != null && bodyConfig.maxCategories > 0 && (
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min={1}
                                          max={50}
                                          value={bodyConfig.maxCategories}
                                          onChange={(e) => {
                                            const v = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                                            updateBody({ maxCategories: v });
                                          }}
                                          className="h-7 w-16 text-xs text-center"
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                          max categories — overflow goes to next section
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ── Display ── */}
                              <div className="pt-3 border-t border-border/50">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Display</Label>
                                <div className="space-y-1.5 mt-2">
                                  <ToggleRow label="Category Names" checked={bodyConfig.showCategoryName !== false}
                                    onChange={(v) => updateBody({ showCategoryName: v })} />
                                  <ToggleRow label="Descriptions" checked={bodyConfig.showDescriptions}
                                    onChange={(v) => updateBody({ showDescriptions: v })} />
                                  <ToggleRow label="Featured Badge" checked={bodyConfig.showFeaturedBadge}
                                    onChange={(v) => updateBody({ showFeaturedBadge: v })} />
                                  <ToggleRow label="Item Dot" checked={!!bodyConfig.showItemDot}
                                    onChange={(v) => updateBody({ showItemDot: v })} />
                                  {bodyConfig.showItemDot && (
                                    <ColorRow label="Dot Color" value={bodyConfig.itemDotColor || template.colors.primary}
                                      onChange={(v) => updateBody({ itemDotColor: v })} />
                                  )}
                                </div>
                              </div>

                              {/* ── Category Style ── */}
                              <div className="pt-3 border-t border-border/50">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category Style</Label>
                                <div className="space-y-1.5 mt-2">
                                  <SelectRow label="Style" value={bodyConfig.categoryStyle}
                                    options={[{ v: "lines", l: "Decorative Lines" }, { v: "bold", l: "Bold Header" }, { v: "minimal", l: "Minimal" }, { v: "custom", l: "Custom" }]}
                                    onChange={(v) => {
                                      const newStyle = v as "lines" | "bold" | "minimal" | "custom";
                                      if (newStyle === "custom" && bodyConfig.categoryStyle !== "custom") {
                                        const contentW = mmToPx(template.format.width) - template.spacing.marginLeft - template.spacing.marginRight;
                                        const contentH = mmToPx(template.format.height) - template.spacing.marginTop - template.spacing.marginBottom;
                                        updateBody({
                                          categoryStyle: newStyle,
                                          offsetX: bodyConfig.offsetX ?? 0,
                                          offsetY: bodyConfig.offsetY ?? 0,
                                          customWidth: bodyConfig.customWidth || contentW,
                                          customHeight: bodyConfig.customHeight || Math.round(contentH * 0.6),
                                        });
                                      } else {
                                        updateBody({ categoryStyle: newStyle });
                                      }
                                    }} />
                                  {bodyConfig.categoryStyle === "custom" && (
                                    <>
                                      <SliderRow label="X" value={bodyConfig.offsetX ?? 0} min={-200} max={800} unit="px"
                                        onChange={(v) => updateBody({ offsetX: v })} />
                                      <SliderRow label="Y" value={bodyConfig.offsetY ?? 0} min={-200} max={1200} unit="px"
                                        onChange={(v) => updateBody({ offsetY: v })} />
                                      <SliderRow label="W" value={bodyConfig.customWidth ?? 0} min={20} max={1200} unit="px"
                                        onChange={(v) => updateBody({ customWidth: v || undefined })} />
                                      <SliderRow label="H" value={bodyConfig.customHeight ?? 0} min={20} max={1600} unit="px"
                                        onChange={(v) => updateBody({ customHeight: v || undefined })} />
                                      <SelectRow label="Alignment" value={bodyConfig.categoryAlignment || "center"}
                                        options={[{ v: "left", l: "Left" }, { v: "center", l: "Center" }, { v: "right", l: "Right" }]}
                                        onChange={(v) => updateBody({ categoryAlignment: v as "left" | "center" | "right" })} />
                                      <SliderRow label="Font Size" value={bodyConfig.categoryFontSize ?? 9} min={6} max={48} unit="px"
                                        onChange={(v) => updateBody({ categoryFontSize: v })} />
                                      <SliderRow label="Letter Spacing" value={bodyConfig.categoryLetterSpacing ?? 0.25} min={0} max={1} step={0.01} unit="em"
                                        onChange={(v) => updateBody({ categoryLetterSpacing: v })} />
                                      <div className="space-y-1">
                                        <Label className="text-[10px]">Font</Label>
                                        <Select value={bodyConfig.categoryFont || "__default__"} onValueChange={(v) => updateBody({ categoryFont: v === "__default__" ? undefined : v })}>
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Template heading font" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__default__">Default (heading)</SelectItem>
                                            {FONT_CATALOG.map(f => (
                                              <SelectItem key={f.family} value={f.family}>{f.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <ToggleRow label="Underline" checked={bodyConfig.categoryBorderBottom ?? false}
                                        onChange={(v) => updateBody({ categoryBorderBottom: v })} />
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* ── Typography ── */}
                              <div className="pt-3 border-t border-border/50">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Typography</Label>
                                <div className="space-y-1.5 mt-2">
                                  <SliderRow label="Item" value={bodyConfig.itemFontSize ?? 14} min={8} max={36} unit="px"
                                    onChange={(v) => updateBody({ itemFontSize: v })} />
                                  <SliderRow label="Price" value={bodyConfig.priceFontSize ?? 12} min={6} max={30} unit="px"
                                    onChange={(v) => updateBody({ priceFontSize: v })} />
                                  <SliderRow label="Desc" value={bodyConfig.descriptionFontSize ?? 12} min={6} max={24} unit="px"
                                    onChange={(v) => updateBody({ descriptionFontSize: v })} />
                                  {bodyConfig.showItemDot && (
                                    <SliderRow label="Dot" value={bodyConfig.itemDotSize ?? 6} min={2} max={16} unit="px"
                                      onChange={(v) => updateBody({ itemDotSize: v })} />
                                  )}
                                  <SelectRow label="Item Casing" value={bodyConfig.itemTextTransform ?? "uppercase"}
                                    options={[{ v: "uppercase", l: "UPPERCASE" }, { v: "capitalize", l: "Capitalize" }, { v: "none", l: "As typed" }]}
                                    onChange={(v) => updateBody({ itemTextTransform: v as "uppercase" | "capitalize" | "none" })} />
                                  <SelectRow label="Cat. Casing" value={bodyConfig.categoryTextTransform ?? "uppercase"}
                                    options={[{ v: "uppercase", l: "UPPERCASE" }, { v: "capitalize", l: "Capitalize" }, { v: "none", l: "As typed" }]}
                                    onChange={(v) => updateBody({ categoryTextTransform: v as "uppercase" | "capitalize" | "none" })} />
                                </div>
                              </div>

                              {/* ── Spacing ── */}
                              <div className="pt-3 border-t border-border/50">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Spacing</Label>
                                <div className="space-y-1.5 mt-2">
                                  <SliderRow label="Item V" value={bodyConfig.itemSpacingV ?? template.spacing.itemGap} min={0} max={60} unit="px"
                                    onChange={(v) => updateBody({ itemSpacingV: v })} />
                                  <SliderRow label="Item H" value={bodyConfig.itemSpacingH ?? 0} min={0} max={60} unit="px"
                                    onChange={(v) => updateBody({ itemSpacingH: v })} />
                                  <SliderRow label="Cat Gap" value={bodyConfig.categorySpacingV ?? template.spacing.categoryGap} min={0} max={80} unit="px"
                                    onChange={(v) => updateBody({ categorySpacingV: v })} />
                                </div>
                              </div>
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
                                  <SliderRow label="X" value={activeVariant.highlight.offsetX ?? 0} min={-200} max={800} unit="px"
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, offsetX: v } })} />
                                  <SliderRow label="Y" value={activeVariant.highlight.offsetY ?? 0} min={-200} max={1200} unit="px"
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, offsetY: v } })} />
                                  <SliderRow label="W" value={activeVariant.highlight.customWidth ?? 0} min={20} max={1200} unit="px"
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, customWidth: v || undefined } })} />
                                  <SliderRow label="H" value={activeVariant.highlight.customHeight ?? 0} min={20} max={1600} unit="px"
                                    onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, customHeight: v || undefined } })} />
                                </>
                              )}

                              {/* Non-custom: height control */}
                              {activeVariant.highlight.style !== "custom" && (
                                <SliderRow label="Height" value={activeVariant.highlight.height ?? 80} min={20} max={400} unit="px"
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

                              {/* Border Radius */}
                              <SliderRow label="Round" value={activeVariant.highlight.borderRadius ?? 4} min={0} max={50} unit="px"
                                onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, borderRadius: v } })} />
                              
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
                                      accept="image/*,.heic,.heif"
                                      className="h-7 text-xs"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          const dataUri = await readImageFile(file);
                                          updateVariant(activeVariant.id, {
                                            highlight: { ...activeVariant.highlight, imageUrl: dataUri }
                                          });
                                        } catch (err) {
                                          console.error("Failed to load image:", err);
                                        }
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
                                  <div className="space-y-1.5 mt-1.5">
                                    <SliderRow label="Top" value={activeVariant.highlight.marginTop ?? 12} min={0} max={100} unit="px"
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginTop: v } })} />
                                    <SliderRow label="Bottom" value={activeVariant.highlight.marginBottom ?? 0} min={0} max={100} unit="px"
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginBottom: v } })} />
                                    <SliderRow label="Left" value={activeVariant.highlight.marginLeft ?? 0} min={0} max={100} unit="px"
                                      onChange={(v) => updateVariant(activeVariant.id, { highlight: { ...activeVariant.highlight, marginLeft: v } })} />
                                    <SliderRow label="Right" value={activeVariant.highlight.marginRight ?? 0} min={0} max={100} unit="px"
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
                                        <SliderRow label="Label" value={hlText().labelSize} min={4} max={36} unit="px"
                                          onChange={(v) => setHlText({ labelSize: v })} />
                                        <SliderRow label="Title" value={hlText().titleSize} min={6} max={48} unit="px"
                                          onChange={(v) => setHlText({ titleSize: v })} />
                                        <div className="space-y-1">
                                          <Label className="text-[10px]">Label Font</Label>
                                          <Select value={hlText().labelFont || "__default__"} onValueChange={(v) => setHlText({ labelFont: v === "__default__" ? undefined : v })}>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Template body font" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__default__">Default (body)</SelectItem>
                                              {FONT_CATALOG.map(f => (
                                                <SelectItem key={f.family} value={f.family}>{f.name}</SelectItem>
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
                                                <SelectItem key={f.family} value={f.family}>{f.name}</SelectItem>
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

                {/* Add body section button */}
                <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-2" onClick={addBodySection}>
                  <Plus className="w-3 h-3 mr-1" /> Add Menu Content
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Live Preview ═══ */}
        <div className="flex-1 relative flex items-center justify-center bg-muted/30 overflow-auto p-6">
          <div
            ref={previewRef}
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
              highlightedSection={capturingThumbnail ? null : (hoveredSection ?? (openPanel && (["header", "body", "highlight"].includes(openPanel) || /^body-\d+$/.test(openPanel)) ? openPanel as SectionType : null))}
              isDraggingCard={!!activeDragSection}
              showMargins={capturingThumbnail ? false : (hoveredPanel === "spacing" || openPanel === "spacing")}
              onClickSection={(section) => { if (!lockedSections.has(section)) setOpenPanel(openPanel === section ? null : section); }}
              lockedSections={lockedSections}
              capturingThumbnail={capturingThumbnail}
              selectedDecorationId={selectedDecorationId}
              onSelectDecoration={setSelectedDecorationId}
              previewData={previewData}
            />
          </div>

          {/* ── Preview icons — vertically centered, fixed right ──────── */}
          <div className="absolute inset-y-0 right-3 z-30 flex flex-col items-center justify-center gap-2">
            {([
              { id: "paper", label: "Paper", icon: FileText },
              { id: "mobile", label: "Phone", icon: Smartphone },
              { id: "desktop", label: "Desktop", icon: Monitor },
              { id: "qr", label: "QR Code", icon: QrCode },
            ] as const).map(({ id, label, icon: Icon }) => (
              <div
                key={id}
                onClick={() => setPreviewMode(id)}
                title={label}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 shadow-sm cursor-pointer",
                  previewMode === id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20",
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sortable Section Card ───────────────────────────────────────────── */

function SortableSectionCard({ section, enabled, isActivePanel, isDragActive: _isDragActive, isHovered, isLocked, onMouseEnter, onMouseLeave, onTogglePanel, onToggleSection, onToggleLock, children }: {
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

  const meta = getSectionMeta(section);
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
  const meta = getSectionMeta(section);
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

function GradientEditor({ gradient, onChange }: { gradient: DecorationGradient; onChange: (g: DecorationGradient) => void }) {
  const updateStop = (index: number, updates: Partial<{ offset: number; color: string }>) => {
    const stops = gradient.stops.map((s, i) => (i === index ? { ...s, ...updates } : s));
    onChange({ ...gradient, stops });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground shrink-0">Type</Label>
        <select
          value={gradient.type}
          onChange={(e) => onChange({ ...gradient, type: e.target.value as "linear" | "radial" })}
          className="text-[10px] h-6 rounded border border-border bg-background px-1"
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>
        {gradient.type === "linear" && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={gradient.angle ?? 0}
              onChange={(e) => onChange({ ...gradient, angle: Number(e.target.value) })}
              className="w-14 h-6 text-[10px] text-right"
            />
            <span className="text-[9px] text-muted-foreground">°</span>
          </div>
        )}
      </div>
      {/* Preview swatch */}
      <div
        className="h-5 rounded border border-border"
        style={{
          background: gradient.type === "radial"
            ? `radial-gradient(circle, ${gradient.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(", ")})`
            : `linear-gradient(${gradient.angle ?? 0}deg, ${gradient.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(", ")})`,
        }}
      />
      {gradient.stops.map((stop, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="color"
            value={stop.color.startsWith("#") ? stop.color : "#000000"}
            onChange={(e) => updateStop(i, { color: e.target.value })}
            className="w-6 h-6 rounded border border-border cursor-pointer p-0.5"
            style={{ WebkitAppearance: "none" }}
          />
          <Input
            value={stop.color}
            onChange={(e) => updateStop(i, { color: e.target.value })}
            className="flex-1 h-6 text-[8px] font-mono px-1"
          />
          <Input
            type="number"
            value={Math.round(stop.offset * 100)}
            onChange={(e) => updateStop(i, { offset: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
            className="w-12 h-6 text-[10px] text-right"
          />
          <span className="text-[8px] text-muted-foreground">%</span>
          {gradient.stops.length > 2 && (
            <button onClick={() => onChange({ ...gradient, stops: gradient.stops.filter((_, j) => j !== i) })}
              className="text-muted-foreground hover:text-destructive p-0.5">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => onChange({ ...gradient, stops: [...gradient.stops, { offset: 1, color: "#000000" }] })}
        className="text-[9px] text-primary hover:underline"
      >
        + Add stop
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, unit, step, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; step?: number; onChange: (v: number) => void;
}) {
  const s = step ?? 1;
  return (
    <div className="flex items-center gap-2">
      <Label className="text-[10px] font-normal text-foreground/80 shrink-0 w-8">{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={s}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-primary"
      />
      <Input
        type="number"
        step={s}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 h-6 text-[10px] text-right"
      />
      <span className="text-[9px] text-muted-foreground w-4">{unit}</span>
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

function VariantPreview({ template, variant, sectionOrder, scale, onUpdateVariant, highlightedSection, isDraggingCard: _isDraggingCard, showMargins, onClickSection, lockedSections, capturingThumbnail, selectedDecorationId, onSelectDecoration, previewData }: {
  template: MenuTemplate; variant?: PageVariant; sectionOrder: SectionType[]; scale: number;
  onUpdateVariant?: (variantId: string, updates: Partial<PageVariant>) => void;
  highlightedSection?: SectionType | null;
  isDraggingCard?: boolean;
  showMargins?: boolean;
  onClickSection?: (section: SectionType) => void;
  lockedSections?: Set<SectionType>;
  capturingThumbnail?: boolean;
  selectedDecorationId?: string | null;
  onSelectDecoration?: (id: string | null) => void;
  previewData?: MenuData;
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

  // Decoration drag/resize state
  const [activeDragDeco, setActiveDragDeco] = useState<string | null>(null);
  const [resizeDeco, setResizeDeco] = useState<{ id: string; handle: string; w: number; h: number } | null>(null);
  const [decoOffset, setDecoOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDecoRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeDecoRef = useRef<{ id: string; handle: string; startX: number; startY: number; origW: number; origH: number; origOX: number; origOY: number; aspectRatio: number; lockAspect: boolean } | null>(null);
  const decoOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const decoDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

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
      if (isBodySection(d.section) && d.section !== "body") {
        const m = d.section.match(/^body-(\d+)$/);
        if (m) {
          const idx = Number(m[1]) - 2;
          const bodies = [...(variant.extraBodies ?? [])];
          if (bodies[idx]) {
            bodies[idx] = { ...bodies[idx], offsetX: final.x, offsetY: final.y };
            onUpdateVariant(variant.id, { extraBodies: bodies });
          }
        }
      } else {
        onUpdateVariant(variant.id, {
          [d.section]: { ...(variant as any)[d.section], offsetX: final.x, offsetY: final.y },
        });
      }
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

      // Snap edges to guidelines during resize
      const snapPts = getSnapPoints();
      const t = SNAP_DISTANCE;
      const guides: { type: "x" | "y"; value: number; source: SnapSource }[] = [];

      // Compute edges in scaled (rendered) coordinates
      const left = newOX * scale, top = newOY * scale;
      const right = left + newW * scale, bottom = top + newH * scale;
      const cx = (left + right) / 2, cy = (top + bottom) / 2;

      // Snap X edges (left, center, right) — adjust width or position depending on handle
      const xEdges: { val: number; side: "l" | "c" | "r" }[] = [];
      if (r.handle.includes("l")) xEdges.push({ val: left, side: "l" });
      if (r.handle.includes("r")) xEdges.push({ val: right, side: "r" });
      xEdges.push({ val: cx, side: "c" });

      let bestXDist = Infinity;
      for (const edge of xEdges) {
        for (const sp of snapPts) {
          if (sp.type !== "x") continue;
          const d = Math.abs(edge.val - sp.value);
          if (d <= t && d < bestXDist) {
            bestXDist = d;
            const snapPx = Math.round((sp.value - edge.val) / scale);
            if (edge.side === "r") {
              newW += snapPx;
            } else if (edge.side === "l") {
              newOX += snapPx;
              newW -= snapPx;
            }
            // center snap: shift both sides equally
            if (edge.side === "c") {
              newOX += snapPx;
            }
            const idx = guides.findIndex(g => g.type === "x");
            if (idx >= 0) guides[idx] = { type: "x", value: sp.value, source: sp.source };
            else guides.push({ type: "x", value: sp.value, source: sp.source });
          }
        }
      }

      // Snap Y edges (top, center, bottom)
      const yEdges: { val: number; side: "t" | "c" | "b" }[] = [];
      if (r.handle.includes("t")) yEdges.push({ val: top, side: "t" });
      if (r.handle.includes("b")) yEdges.push({ val: bottom, side: "b" });
      yEdges.push({ val: cy, side: "c" });

      let bestYDist = Infinity;
      for (const edge of yEdges) {
        for (const sp of snapPts) {
          if (sp.type !== "y") continue;
          const d = Math.abs(edge.val - sp.value);
          if (d <= t && d < bestYDist) {
            bestYDist = d;
            const snapPx = Math.round((sp.value - edge.val) / scale);
            if (edge.side === "b") {
              newH += snapPx;
            } else if (edge.side === "t") {
              newOY += snapPx;
              newH -= snapPx;
            }
            if (edge.side === "c") {
              newOY += snapPx;
            }
            const idx = guides.findIndex(g => g.type === "y");
            if (idx >= 0) guides[idx] = { type: "y", value: sp.value, source: sp.source };
            else guides.push({ type: "y", value: sp.value, source: sp.source });
          }
        }
      }

      // Enforce minimum size after snapping
      newW = Math.max(minSz, newW);
      newH = Math.max(minSz, newH);

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
      if (isBodySection(r.section) && r.section !== "body") {
        const m = r.section.match(/^body-(\d+)$/);
        if (m) {
          const idx = Number(m[1]) - 2;
          const bodies = [...(variant.extraBodies ?? [])];
          if (bodies[idx]) {
            bodies[idx] = { ...bodies[idx], offsetX: finalPos.x, offsetY: finalPos.y, customWidth: finalDims.w, customHeight: finalDims.h };
            onUpdateVariant(variant.id, { extraBodies: bodies });
          }
        }
      } else {
        onUpdateVariant(variant.id, {
          [r.section]: { ...(variant as any)[r.section], offsetX: finalPos.x, offsetY: finalPos.y, customWidth: finalDims.w, customHeight: finalDims.h },
        });
      }
      resizeRef.current = null;
      setResizeState(null);
      setActiveGuides([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizeState, scale, onUpdateVariant, variant]);

  /* ─── Decoration drag effect ──────────────────────────────────────── */
  useEffect(() => {
    if (!activeDragDeco) return;
    const onMove = (e: MouseEvent) => {
      const d = dragDecoRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      let newX = Math.round(d.origX + dx);
      let newY = Math.round(d.origY + dy);
      // Snap
      const deco = variant?.decorations?.find((dec) => dec.id === d.id);
      if (deco) {
        const { snapDx, snapDy, guides } = calculateSnap(newX * scale, newY * scale, deco.width * scale, deco.height * scale);
        newX += Math.round(snapDx / scale);
        newY += Math.round(snapDy / scale);
        setActiveGuides(guides);
      }
      decoOffsetRef.current = { x: newX, y: newY };
      setDecoOffset({ x: newX, y: newY });
    };
    const onUp = () => {
      const d = dragDecoRef.current;
      if (!d || !onUpdateVariant || !variant) {
        dragDecoRef.current = null; setActiveDragDeco(null); setActiveGuides([]); return;
      }
      const final = decoOffsetRef.current;
      const decos = (variant.decorations ?? []).map((dec) =>
        dec.id === d.id ? { ...dec, x: final.x, y: final.y } : dec
      );
      onUpdateVariant(variant.id, { decorations: decos });
      dragDecoRef.current = null;
      setActiveDragDeco(null);
      setActiveGuides([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [activeDragDeco, scale, onUpdateVariant, variant]);

  /* ─── Decoration resize effect ────────────────────────────────────── */
  useEffect(() => {
    if (!resizeDeco) return;
    const onMove = (e: MouseEvent) => {
      const r = resizeDecoRef.current;
      if (!r) return;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      let newW = r.origW, newH = r.origH, newOX = r.origOX, newOY = r.origOY;
      const minSz = 20;
      // Shift key toggles aspect ratio lock behavior
      const lockAR = e.shiftKey ? !r.lockAspect : r.lockAspect;
      const isCorner = r.handle.length === 2; // "tl", "tr", "bl", "br"

      if (r.handle.includes("r")) newW = Math.max(minSz, r.origW + dx);
      if (r.handle.includes("l")) { newW = Math.max(minSz, r.origW - dx); newOX = r.origOX + (r.origW - newW); }
      if (r.handle.includes("b")) newH = Math.max(minSz, r.origH + dy);
      if (r.handle.includes("t")) { newH = Math.max(minSz, r.origH - dy); newOY = r.origOY + (r.origH - newH); }
      if (r.handle === "t" || r.handle === "b") newW = r.origW;
      if (r.handle === "l" || r.handle === "r") newH = r.origH;

      // Enforce aspect ratio on corner handles when locked
      if (lockAR && isCorner && r.aspectRatio > 0) {
        const wFromH = newH * r.aspectRatio;
        const hFromW = newW / r.aspectRatio;
        // Use whichever dimension changed more as the driver
        if (Math.abs(newW - r.origW) > Math.abs(newH - r.origH)) {
          newH = Math.max(minSz, Math.round(hFromW));
          if (r.handle.includes("t")) newOY = r.origOY + (r.origH - newH);
        } else {
          newW = Math.max(minSz, Math.round(wFromH));
          if (r.handle.includes("l")) newOX = r.origOX + (r.origW - newW);
        }
      }

      newW = Math.round(newW); newH = Math.round(newH);
      newOX = Math.round(newOX); newOY = Math.round(newOY);

      decoOffsetRef.current = { x: newOX, y: newOY };
      decoDimsRef.current = { w: newW, h: newH };
      setDecoOffset({ x: newOX, y: newOY });
      setResizeDeco({ id: r.id, handle: r.handle, w: newW, h: newH });
    };
    const onUp = () => {
      const r = resizeDecoRef.current;
      if (!r || !onUpdateVariant || !variant) {
        resizeDecoRef.current = null; setResizeDeco(null); setActiveGuides([]); return;
      }
      const finalPos = decoOffsetRef.current;
      const finalDims = decoDimsRef.current;
      const decos = (variant.decorations ?? []).map((dec) =>
        dec.id === r.id ? { ...dec, x: finalPos.x, y: finalPos.y, width: finalDims.w, height: finalDims.h } : dec
      );
      onUpdateVariant(variant.id, { decorations: decos });
      resizeDecoRef.current = null;
      setResizeDeco(null);
      setActiveGuides([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizeDeco, scale, onUpdateVariant, variant]);

  if (!variant) return <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Select a variant</div>;

  const data = previewData ?? sampleMenuData;
  const { colors, fonts, spacing } = template;
  const fs = (size: number) => `${Math.round(size * scale)}px`;

  /* ─── Helpers ────────────────────────────────────────────────────── */

  const isSectionCustom = (section: SectionType): boolean => {
    if (section === "header") return variant.header.style === "custom";
    if (isBodySection(section)) {
      const b = getBodyForSection(variant, section);
      return b ? b.categoryStyle === "custom" : false;
    }
    if (section === "highlight") return variant.highlight.style === "custom";
    return false;
  };

  const getSectionCfg = (section: SectionType): any => {
    if (isBodySection(section)) return getBodyForSection(variant, section);
    return (variant as any)[section];
  };

  const getOffset = (section: SectionType) => {
    if (activeDragSection === section || resizeState?.section === section) return dragOffset;
    const cfg = getSectionCfg(section);
    return { x: cfg?.offsetX ?? 0, y: cfg?.offsetY ?? 0 };
  };

  const getDimensions = (section: SectionType) => {
    if (resizeState?.section === section) return { w: resizeState.w, h: resizeState.h };
    const cfg = getSectionCfg(section);
    return { w: cfg?.customWidth as number | undefined, h: cfg?.customHeight as number | undefined };
  };

  const startDrag = (e: React.MouseEvent, section: SectionType) => {
    e.preventDefault(); e.stopPropagation();
    const cfg = getSectionCfg(section);
    const ox = cfg?.offsetX ?? 0, oy = cfg?.offsetY ?? 0;
    dragRef.current = { section, startX: e.clientX, startY: e.clientY, origX: ox, origY: oy };
    dragOffsetRef.current = { x: ox, y: oy };
    setDragOffset({ x: ox, y: oy });
    setActiveDragSection(section);
    setSelectedSection(section);
  };

  const startResize = (e: React.MouseEvent, section: SectionType, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    const cfg = getSectionCfg(section);
    const el = sectionRefs.current[section];
    const origW = cfg?.customWidth || (el ? Math.round(el.offsetWidth / scale) : 200);
    const origH = cfg?.customHeight || (el ? Math.round(el.offsetHeight / scale) : 100);
    const origOX = cfg?.offsetX ?? 0, origOY = cfg?.offsetY ?? 0;
    resizeRef.current = { section, handle, startX: e.clientX, startY: e.clientY, origW, origH, origOX, origOY };
    dragOffsetRef.current = { x: origOX, y: origOY };
    resizeDimsRef.current = { w: origW, h: origH };
    setDragOffset({ x: origOX, y: origOY });
    setResizeState({ section, handle, w: origW, h: origH });
    setSelectedSection(section);
  };

  /* ─── Decoration interaction helpers ─────────────────────────────── */

  const startDecoDrag = (e: React.MouseEvent, deco: Decoration) => {
    e.preventDefault(); e.stopPropagation();
    if (deco.locked) return;
    dragDecoRef.current = { id: deco.id, startX: e.clientX, startY: e.clientY, origX: deco.x, origY: deco.y };
    decoOffsetRef.current = { x: deco.x, y: deco.y };
    setDecoOffset({ x: deco.x, y: deco.y });
    setActiveDragDeco(deco.id);
    onSelectDecoration?.(deco.id);
    setSelectedSection(null);
  };

  const startDecoResize = (e: React.MouseEvent, deco: Decoration, handle: string) => {
    e.preventDefault(); e.stopPropagation();
    if (deco.locked) return;
    resizeDecoRef.current = { id: deco.id, handle, startX: e.clientX, startY: e.clientY, origW: deco.width, origH: deco.height, origOX: deco.x, origOY: deco.y, aspectRatio: deco.height > 0 ? deco.width / deco.height : 1, lockAspect: !!deco.aspectRatioLocked };
    decoOffsetRef.current = { x: deco.x, y: deco.y };
    decoDimsRef.current = { w: deco.width, h: deco.height };
    setDecoOffset({ x: deco.x, y: deco.y });
    setResizeDeco({ id: deco.id, handle, w: deco.width, h: deco.height });
    onSelectDecoration?.(deco.id);
    setSelectedSection(null);
  };

  const renderDecoHandles = (deco: Decoration) => {
    const hs = HANDLE_SIZE;
    const half = -hs / 2;
    const handles = [
      { id: "tl", top: half, left: half, cursor: "nwse-resize" },
      { id: "tr", top: half, right: half, cursor: "nesw-resize" },
      { id: "bl", bottom: half, left: half, cursor: "nesw-resize" },
      { id: "br", bottom: half, right: half, cursor: "nwse-resize" },
      { id: "t", top: half, left: "50%", cursor: "ns-resize", transform: "translateX(-50%)" },
      { id: "b", bottom: half, left: "50%", cursor: "ns-resize", transform: "translateX(-50%)" },
      { id: "l", top: "50%", left: half, cursor: "ew-resize", transform: "translateY(-50%)" },
      { id: "r", top: "50%", right: half, cursor: "ew-resize", transform: "translateY(-50%)" },
    ];
    return handles.map((h) => (
      <div
        key={h.id}
        onMouseDown={(e) => startDecoResize(e, deco, h.id)}
        style={{
          position: "absolute",
          width: hs, height: hs,
          top: h.top, left: h.left, right: h.right, bottom: h.bottom,
          transform: h.transform,
          backgroundColor: "white",
          border: `1.5px solid ${SELECT_COLOR}`,
          borderRadius: "1px",
          cursor: h.cursor,
          zIndex: 20,
          pointerEvents: "auto",
          boxShadow: "0 0 0 0.5px rgba(0,0,0,0.1)",
        } as React.CSSProperties}
      />
    ));
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

  const renderItems = (items: { id: string; name: string; price: number; description: string; featured?: boolean }[], bc: import("../types/template").VariantBodyConfig, _key: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: `${(bc.itemSpacingV ?? spacing.itemGap) * scale}px` }}>
      {items.slice(0, bc.columns > 1 ? 6 : 9).map((item) => (
        <div key={item.id} style={{
          textAlign: bc.itemAlignment,
          paddingLeft: bc.itemSpacingH ? `${bc.itemSpacingH * scale}px` : undefined,
          paddingRight: bc.itemSpacingH ? `${bc.itemSpacingH * scale}px` : undefined,
        }}>
          <div style={{
            display: bc.pricePosition === "right" ? "flex" : "block",
            width: "100%",
            justifyContent: bc.pricePosition === "right"
              ? (bc.priceJustifyRight ? "space-between" : bc.itemAlignment === "right" ? "flex-end" : bc.itemAlignment === "center" ? "center" : "flex-start")
              : undefined,
            alignItems: "baseline",
            gap: bc.pricePosition === "right" ? "4px" : undefined,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexShrink: 0, justifyContent: bc.itemAlignment === "center" ? "center" : bc.itemAlignment === "right" ? "flex-end" : "flex-start" }}>
              {bc.showItemDot && (
                <span style={{ width: (bc.itemDotSize ?? 6) * scale, height: (bc.itemDotSize ?? 6) * scale, borderRadius: "50%", backgroundColor: bc.itemDotColor || colors.primary, flexShrink: 0, position: "relative", top: "-1px" }} />
              )}
              <p style={{ fontSize: fs(bc.itemFontSize ?? 14), fontWeight: 700, textTransform: bc.itemTextTransform ?? "uppercase", letterSpacing: "0.05em", fontFamily: fonts.body, color: colors.text }}>
                {item.name}
              </p>
              {bc.pricePosition === "inline" && (
                <span style={{ fontSize: fs(bc.priceFontSize ?? 12), color: colors.price || colors.primary, fontWeight: 600 }}>€{item.price}</span>
              )}
              {item.featured && bc.showFeaturedBadge && (
                <span style={{ fontSize: fs(10), color: colors.accent, marginLeft: "2px" }}>★</span>
              )}
            </div>
            {bc.pricePosition === "right" && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: bc.priceJustifyRight ? 1 : undefined, marginLeft: bc.priceJustifyRight ? "4px" : undefined, justifyContent: bc.priceJustifyRight ? "flex-end" : undefined }}>
                {bc.priceJustifyRight && bc.separatorStyle === "dotted" && (
                  <span style={{ flex: 1, borderBottom: `1px dotted ${colors.muted}66`, minWidth: "10px" }} />
                )}
                {bc.priceJustifyRight && bc.separatorStyle === "line" && (
                  <span style={{ flex: 1, height: "1px", backgroundColor: `${colors.muted}33`, minWidth: "10px" }} />
                )}
                <span style={{ fontSize: fs(bc.priceFontSize ?? 12), color: colors.price || colors.primary, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>€{item.price}</span>
              </div>
            )}
          </div>
          {bc.showDescriptions && item.description && (
            <p style={{
              fontSize: fs(bc.descriptionFontSize ?? 12), color: colors.muted, fontStyle: "italic", marginTop: "2px",
              maxWidth: bc.columns > 1 ? "140px" : "200px",
              marginLeft: bc.itemAlignment === "center" || bc.itemAlignment === "right" ? "auto" : undefined,
              marginRight: bc.itemAlignment === "center" ? "auto" : undefined,
              fontFamily: fonts.body,
            }}>
              {item.description.slice(0, 60)}…
            </p>
          )}
          {bc.pricePosition === "below" && !bc.priceJustifyRight && (
            <p style={{ fontSize: fs(bc.priceFontSize ?? 12), color: colors.price || colors.primary, fontWeight: 600, marginTop: "3px" }}>€{item.price}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderBackgroundImage = (section: "header" | "body" | `body-${number}`) => {
    const cfg = isBodySection(section) ? getBodyForSection(variant, section) : (variant as any)[section];
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
              <p style={{ fontSize: fs(10), letterSpacing: "0.3em", color: colors.primary, textTransform: "uppercase", fontWeight: 600, marginBottom: "8px", fontFamily: fonts.body, position: "relative", zIndex: 1 }}>
                {data.subtitle}
              </p>
            )}
            <h1 style={{ fontFamily: fonts.heading, fontSize: fs(36), fontWeight: 400, fontStyle: "italic", letterSpacing: "0.05em", color: colors.text, position: "relative", zIndex: 1 }}>
              {data.restaurantName}
            </h1>
            {variant.header.showEstablished && data.established && (
              <p style={{ fontSize: fs(10), letterSpacing: "0.2em", color: colors.muted, textTransform: "uppercase", marginTop: "6px", fontFamily: fonts.body, position: "relative", zIndex: 1 }}>
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
      default: {
        if (!isBodySection(section)) return null;
        const bc = getBodyForSection(variant, section);
        if (!bc || bc.show === false) return null;
        return (
          <div style={{
            position: "relative",
            display: bc.columns > 1 ? "grid" : "block",
            gridTemplateColumns: bc.columns > 1 ? `repeat(${bc.columns}, 1fr)` : undefined,
            gap: bc.columns > 1 ? `0 ${spacing.categoryGap * scale}px` : undefined,
            flex: 1,
          }}>
            {bc.showCategoryName !== false ? (
              /* With category names: render each category as a separate group */
              data.categories.map((cat, catIdx) => (
                <div key={cat.id} style={{ marginBottom: `${(bc.categorySpacingV ?? spacing.categoryGap) * scale}px`, position: "relative", zIndex: 1 }}>
                  <div style={{
                    textAlign: bc.categoryStyle === "custom" ? (bc.categoryAlignment || "center") : bc.itemAlignment,
                    marginBottom: `${(bc.itemSpacingV ?? spacing.itemGap) * scale}px`,
                    display: bc.categoryStyle === "lines" && bc.itemAlignment === "center" ? "flex" : "block",
                    alignItems: "center", justifyContent: "center", gap: "8px",
                  }}>
                    {bc.categoryStyle === "lines" && bc.itemAlignment === "center" && (
                      <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                    )}
                    <h2 style={{
                      fontSize: fs(bc.categoryStyle === "custom"
                        ? (bc.categoryFontSize ?? 11)
                        : bc.categoryStyle === "bold" ? 13 : 11),
                      letterSpacing: bc.categoryStyle === "custom"
                        ? `${bc.categoryLetterSpacing ?? 0.25}em`
                        : "0.25em",
                      color: colors.primary, textTransform: bc.categoryTextTransform ?? "uppercase",
                      fontWeight: bc.categoryStyle === "bold" || bc.categoryStyle === "custom" ? 800 : 600,
                      whiteSpace: "nowrap",
                      fontFamily: bc.categoryStyle === "custom"
                        ? (bc.categoryFont || fonts.heading)
                        : bc.categoryStyle === "bold" ? fonts.heading : fonts.body,
                      borderBottom: (bc.categoryStyle === "bold" || (bc.categoryStyle === "custom" && bc.categoryBorderBottom))
                        ? `2px solid ${colors.primary}` : "none",
                      paddingBottom: (bc.categoryStyle === "bold" || (bc.categoryStyle === "custom" && bc.categoryBorderBottom))
                        ? "4px" : "0",
                    }}>
                      {cat.name}
                    </h2>
                    {bc.categoryStyle === "lines" && bc.itemAlignment === "center" && (
                      <span style={{ flex: 1, maxWidth: 30, height: 1, backgroundColor: colors.primary, opacity: 0.3 }} />
                    )}
                  </div>
                  {renderItems(cat.items, bc, cat.id)}
                  {catIdx < data.categories.length - 1 && bc.separatorStyle !== "dotted" && renderSeparator(bc.separatorStyle)}
                </div>
              ))
            ) : (
              /* Without category names: all items in a single flat list */
              <div style={{ position: "relative", zIndex: 1 }}>
                {renderItems(data.categories.flatMap(c => c.items), bc, "all")}
              </div>
            )}
          </div>
        );
      }
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

        // Image dimensions — custom mode uses 100% (parent wrapper controls size), others use explicit px
        const imgHeight = isCustom ? "100%" : `${hl.height ?? 80}px`;
        const imgObjectFit = hlFit === "fit" ? ("fill" as const) : hlFit;

        return (
          <div style={{ ...containerStyle, ...(isCustom ? { width: "100%", height: "100%" } : {}) }}>
            <div style={{ borderRadius: isFullWidth ? 0 : `${hl.borderRadius ?? 4}px`, overflow: "hidden", position: "relative", zIndex: 1, width: "100%", height: isCustom ? "100%" : undefined }}>
              {hlImage ? (
                <img src={hlImage} alt="" style={{ 
                  width: "100%", 
                  height: imgHeight, 
                  objectFit: imgObjectFit,
                }} />
              ) : (
                <div style={{ width: "100%", height: imgHeight, background: `${colors.muted}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: fs(12), color: colors.muted, fontFamily: fonts.body }}>No image set</p>
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
    const showHandles = canDrag && (isSelected || isInteracting) && !isDragging && !capturingThumbnail;

    if (isLocked) {
      return (
        <div key={section} style={{ position: "relative", pointerEvents: capturingThumbnail ? undefined : "none", opacity: capturingThumbnail ? 1 : 0.6 }}>
          {content}
        </div>
      );
    }

    // Determine outline style (Figma-like: blue on select, light blue on hover)
    let outline = "none";
    let outlineOffset = "0px";
    if (capturingThumbnail) {
      // No outlines during thumbnail capture
    } else if (isInteracting) {
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
        {isInteracting && !capturingThumbnail && (
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
          onSelectDecoration?.(null);
        }
      }}
      style={{
        position: "relative",
        fontFamily: fonts.body, color: colors.text, backgroundColor: colors.background,
        padding: `${spacing.marginTop}px ${spacing.marginRight}px ${spacing.marginBottom}px ${spacing.marginLeft}px`,
      }}
    >
      {/* Margin overlays — each side a distinct pink tint */}
      {!capturingThumbnail && (showMargins || !!activeDragSection || !!resizeState) && (
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
      {!capturingThumbnail && activeGuides.map((g, i) => {
        const color = g.source === "margin" ? MARGIN_GUIDE_COLOR : GUIDE_COLOR;
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

      {/* Render decorations */}
      {(variant.decorations ?? []).filter((d) => !d.hidden).map((deco) => {
        const isSelected = selectedDecorationId === deco.id;
        const isDragging = activeDragDeco === deco.id;
        const isResizing = resizeDeco?.id === deco.id;
        const isInteracting = isDragging || isResizing;

        const x = isDragging || isResizing ? decoOffset.x : deco.x;
        const y = isDragging || isResizing ? decoOffset.y : deco.y;
        const w = isResizing ? resizeDeco!.w : deco.width;
        const h = isResizing ? resizeDeco!.h : deco.height;

        return (
          <div
            key={deco.id}
            style={{
              position: "absolute",
              left: x * scale,
              top: y * scale,
              width: w * scale,
              height: h * scale,
              transform: deco.rotation ? `rotate(${deco.rotation}deg)` : undefined,
              opacity: deco.opacity,
              zIndex: deco.zIndex + (isInteracting ? 100 : 0),
              cursor: deco.locked ? "default" : "move",
              outline: isSelected && !capturingThumbnail ? `1.5px solid ${SELECT_COLOR}` : "none",
              outlineOffset: "1px",
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              onSelectDecoration?.(deco.id);
              setSelectedSection(null);
              if (!deco.locked) startDecoDrag(e, deco);
            }}
          >
            <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
              <DecorationRenderer decoration={{ ...deco, width: w, height: h }} />
            </div>

            {/* Resize handles */}
            {isSelected && !capturingThumbnail && !deco.locked && renderDecoHandles(deco)}

            {/* Position/size tooltip */}
            {isInteracting && !capturingThumbnail && (
              <div style={{
                position: "absolute",
                top: -22, left: "50%", transform: "translateX(-50%)",
                fontSize: "9px", fontFamily: "'Inter', monospace", fontWeight: 500,
                background: "rgba(0,0,0,0.8)", color: "white",
                padding: "2px 6px", borderRadius: "3px",
                whiteSpace: "nowrap", pointerEvents: "none", zIndex: 30,
                letterSpacing: "0.02em",
              }}>
                {isResizing ? `${w} × ${h}` : `${x}, ${y}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}