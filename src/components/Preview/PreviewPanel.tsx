import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FileText, Monitor, Smartphone, QrCode, Minus, Plus, Maximize, Copy, Check, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, Button, Switch, Label } from "ada-design-system";
import AIPromptBar from "../AIPromptBar";
import { QRCodeSVG } from "qrcode.react";
import MenuPreview from "./MenuPreview";
import DeviceMockup from "./DeviceMockup";
import WebMenuRenderer from "./WebMenuRenderer";
import { useMenu } from "../../context/MenuContext";
import { useAuth } from "../../context/AuthContext";
import type { MenuTemplate } from "../../types/template";
import { mmToPx } from "../../types/template";
import type { MenuData } from "../../types/menu";
import { API_URL } from "../../config/api";
import { publishMenu, unpublishMenu, getPublishStatus } from "../../services/menuPublishApi";
import { fetchRestaurants } from "../../services/templateApi";

/* ── Preview sidebar icons ────────────────────────────────────────────── */

const previewIcons: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "paper", label: "Paper", icon: FileText },
  { id: "mobile", label: "Phone", icon: Smartphone },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "qr", label: "QR Code", icon: QrCode },
];

/* ── Zoom constants ──────────────────────────────────────────────────── */

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const DEFAULT_ZOOM = 0.7;

const PREVIEW_WIDTH = 794;

export type PreviewMode = "paper" | "mobile" | "desktop" | "qr";

interface PreviewPanelProps {
  template?: MenuTemplate;
  menuId?: string;
  previewData?: MenuData;
  previewMode?: PreviewMode;
  onPreviewModeChange?: (mode: PreviewMode) => void;
}

/* ── QR Code View ────────────────────────────────────────────────────── */

interface QrCodeViewProps {
  menuId?: string;
  menuTitle?: string;
  colors?: MenuTemplate["colors"];
  menuData?: MenuData;
  template?: MenuTemplate;
}

function QrCodeView({ menuId, menuTitle, colors, menuData, template }: QrCodeViewProps) {
  const { token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const qrUrl = menuId ? `${window.location.origin}/qr/${menuId}` : "";

  // Fetch restaurant ID + publish status on mount
  useEffect(() => {
    if (!token) return;
    fetchRestaurants(token)
      .then((restaurants) => {
        if (restaurants.length > 0) setRestaurantId(restaurants[0].id);
      })
      .catch(() => {});

    if (!menuId) return;
    getPublishStatus(token, menuId)
      .then(({ published, updatedAt }) => {
        setIsPublished(published);
        setPublishedAt(updatedAt || null);
      })
      .catch(() => {});
  }, [menuId, token]);

  const handleCopy = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTogglePublish = async (publish: boolean) => {
    if (!menuId || !token) {
      setPublishError("Not authenticated");
      return;
    }
    setToggling(true);
    setPublishError(null);
    try {
      if (publish) {
        if (!restaurantId || !menuData || !template) {
          setPublishError("Missing menu data or restaurant info");
          setToggling(false);
          return;
        }
        await publishMenu(token, {
          menu_id: menuId,
          restaurant_id: restaurantId,
          title: menuTitle || menuData.title || "Menu",
          menu_data: menuData as unknown as Record<string, unknown>,
          template_data: {
            colors: template.colors,
            fonts: template.fonts,
            webLayoutQr: template.webLayoutQr,
            webLayoutMobile: template.webLayoutMobile,
            qrOrderConfig: template.qrOrderConfig,
            name: template.name,
          },
        });
        setIsPublished(true);
        setPublishedAt(new Date().toISOString());
      } else {
        await unpublishMenu(token, menuId);
        setIsPublished(false);
        setPublishedAt(null);
      }
    } catch (err: any) {
      setPublishError(err.message || (publish ? "Failed to publish" : "Failed to unpublish"));
    } finally {
      setToggling(false);
    }
  };

  if (!menuId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Save this menu first to generate a QR code.</p>
      </div>
    );
  }

  const primary = colors?.primary || "#4d6aff";

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-6 max-w-md">
        {/* QR Code */}
        <div
          className="bg-white rounded-2xl shadow-lg p-8"
          style={{ border: `3px solid ${primary}15` }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={280}
            level="H"
            fgColor={primary}
            bgColor="#ffffff"
            imageSettings={{
              src: "",
              height: 0,
              width: 0,
              excavate: false,
            }}
          />
        </div>

        {/* Label */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground mb-1">Scan to Order</h3>
          <p className="text-sm text-muted-foreground">
            Customers scan this QR code to view the menu and place orders
          </p>
        </div>

        {/* URL + Copy — only when published */}
        {isPublished && (
          <div className="w-full flex items-center gap-2 bg-muted/30 rounded-lg border border-border px-3 py-2.5">
            <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
              {qrUrl}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        )}

        {/* Publish toggle */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium">Publicly accessible</Label>
              <span className="text-xs text-muted-foreground">
                {isPublished
                  ? `Live${publishedAt ? ` since ${new Date(publishedAt).toLocaleDateString()}` : ""}`
                  : "Enable to let customers scan and order"}
              </span>
            </div>
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={isPublished}
                onCheckedChange={handleTogglePublish}
                disabled={!token}
              />
            )}
          </div>
          {publishError && (
            <p className="text-xs text-destructive text-center">{publishError}</p>
          )}
          {!token && (
            <p className="text-xs text-muted-foreground text-center">Sign in to publish this menu</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Preview Panel ──────────────────────────────────────────────── */

export default function PreviewPanel({ template, menuId, previewData, previewMode, onPreviewModeChange }: PreviewPanelProps) {
  const { menuData, selectedItemId, activePageIndex, aiMode } = useMenu();
  const [internalMode, setInternalMode] = useState<PreviewMode>("paper");

  // Use controlled mode if provided, otherwise internal
  const selectedIcon = previewMode ?? internalMode;
  const setSelectedIcon = (mode: string) => {
    const m = mode as PreviewMode;
    if (onPreviewModeChange) onPreviewModeChange(m);
    else setInternalMode(m);
  };

  const data = previewData || menuData;

  /* ── Canvas state ──────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  /* ── Pinch-to-zoom state ─────────────────────────────────────────── */
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);

  const prevActivePageRef = useRef(activePageIndex);

  /* ── Measure container + auto-center on mount ────────────────────── */
  const hasCentered = useRef(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      if (!hasCentered.current) {
        hasCentered.current = true;
        const content = contentRef.current;
        const contentH = content?.scrollHeight ?? 1000;
        const padding = 100;
        const fitZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +Math.min((el.clientWidth - padding) / PREVIEW_WIDTH, (el.clientHeight - padding) / contentH).toFixed(2)));
        const panX = (el.clientWidth - PREVIEW_WIDTH * fitZoom) / 2;
        const panY = (el.clientHeight - contentH * fitZoom) / 2;
        setZoom(fitZoom);
        setPan({ x: panX, y: Math.max(panY, padding / 2) });
      }
    };
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Space key for hand tool ─────────────────────────────────────── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /* ── Pointer panning ─────────────────────────────────────────────── */
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        if (activePointers.current.size === 2) {
          const pts = [...activePointers.current.values()];
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          pinchStart.current = { dist, zoom, midX, midY };
          setIsPanning(false);
          return;
        }
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }
      if (spaceHeld || e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [spaceHeld, pan, zoom],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch" && activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.current.size === 2 && pinchStart.current) {
          const pts = [...activePointers.current.values()];
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const scale = dist / pinchStart.current.dist;
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(pinchStart.current.zoom * scale).toFixed(3)));
          const el = containerRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
            const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
            const prevZoom = zoomRef.current;
            const prevPan = panRef.current;
            const scaleFactor = newZoom / prevZoom;
            setPan({
              x: midX - scaleFactor * (midX - prevPan.x),
              y: midY - scaleFactor * (midY - prevPan.y),
            });
          }
          setZoom(newZoom);
          return;
        }
      }
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    },
    [isPanning, zoom],
  );

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0) setIsPanning(false);
  }, []);

  /* ── Wheel: Ctrl/⌘ = zoom, otherwise pan ─────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        const prevZoom = zoomRef.current;
        const prevPan = panRef.current;
        const rawDelta = -e.deltaY * 0.01;
        const clampedDelta = Math.max(-0.15, Math.min(0.15, rawDelta));
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(prevZoom * (1 + clampedDelta)).toFixed(3)));
        const scaleFactor = newZoom / prevZoom;
        setPan({
          x: pointerX - scaleFactor * (pointerX - prevPan.x),
          y: pointerY - scaleFactor * (pointerY - prevPan.y),
        });
        setZoom(newZoom);
      } else {
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Zoom-to-selected item ───────────────────────────────────────── */
  useEffect(() => {
    if (!selectedItemId) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const itemEl = content.querySelector(`[data-item-id="${selectedItemId}"]`) as HTMLElement | null;
    if (!itemEl) return;
    const contentRect = content.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const itemX = (itemRect.left - contentRect.left) / currentZoom;
    const itemY = (itemRect.top - contentRect.top) / currentZoom;
    const itemW = itemRect.width / currentZoom;
    const itemH = itemRect.height / currentZoom;
    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, (cW * 0.9) / itemW));
    const newPanX = (cW - itemW * targetZoom) / 2 - itemX * targetZoom;
    const newPanY = (cH - itemH * targetZoom) / 2 - itemY * targetZoom;
    setIsAnimating(true);
    setZoom(targetZoom);
    setPan({ x: newPanX, y: newPanY });
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [selectedItemId]);

  /* ── Zoom-to-page ────────────────────────────────────────────────── */
  const lastItemZoomRef = useRef(0);
  useEffect(() => {
    if (selectedItemId) lastItemZoomRef.current = Date.now();
  }, [selectedItemId]);

  useEffect(() => {
    if (prevActivePageRef.current === activePageIndex) return;
    prevActivePageRef.current = activePageIndex;
    if (Date.now() - lastItemZoomRef.current < 600) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const pageEl = content.querySelector(`[data-menu-preview][data-page-index="${activePageIndex}"]`) as HTMLElement | null;
    if (!pageEl) return;
    requestAnimationFrame(() => {
      const contentRect = content.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const currentZoom = zoomRef.current;
      const pageY = (pageRect.top - contentRect.top) / currentZoom;
      const pageW = pageRect.width / currentZoom;
      const pageH = pageRect.height / currentZoom;
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const padding = 60;
      const targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, (cH - padding) / pageH));
      const newPanX = (cW - pageW * targetZoom) / 2;
      const newPanY = (cH - pageH * targetZoom) / 2 - pageY * targetZoom;
      setIsAnimating(true);
      setZoom(targetZoom);
      setPan({ x: newPanX, y: newPanY });
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    });
  }, [activePageIndex]);

  /* ── Zoom helpers ────────────────────────────────────────────────── */
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  }, []);

  const handleFitView = useCallback(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    if (!el) {
      setZoom(DEFAULT_ZOOM);
      setPan({ x: 0, y: 0 });
      return;
    }
    const padding = 100;
    const cW = el.clientWidth - padding;
    const cH = el.clientHeight - padding;
    const contentH = content?.scrollHeight ?? 1000;
    const fitZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +Math.min(cW / PREVIEW_WIDTH, cH / contentH).toFixed(2)));
    const panX = (el.clientWidth - PREVIEW_WIDTH * fitZoom) / 2;
    const panY = (el.clientHeight - contentH * fitZoom) / 2;
    setZoom(fitZoom);
    setPan({ x: panX, y: Math.max(panY, padding / 2) });
  }, []);

  /* ── Cursor ──────────────────────────────────────────────────────── */
  const cursorClass = isPanning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default";

  const isPaper = selectedIcon === "paper";
  const isWeb = selectedIcon === "mobile" || selectedIcon === "desktop";
  const isQr = selectedIcon === "qr";

  const activeWebLayout = selectedIcon === "desktop"
    ? template?.webLayoutDesktop
    : template?.webLayoutMobile;

  return (
    <div className="absolute inset-0 bg-muted overflow-hidden">
      {/* ── Paper: Infinite canvas ───────────────────────────────────── */}
      {isPaper && (
        <>
          <div
            ref={containerRef}
            className={cn("absolute inset-0 select-none touch-none", cursorClass)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                willChange: "transform",
                transition: isAnimating ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              }}
              className="absolute top-0 left-0"
            >
              <div
                ref={contentRef}
                className="shrink-0"
                style={{ width: `${template ? mmToPx(template.format.width) : PREVIEW_WIDTH}px` }}
              >
                <MenuPreview template={template} />
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-30 pointer-events-auto">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg px-2 py-1.5">
              <button onClick={handleZoomOut} title="Zoom out" className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={handleFitView} title="Fit to view" className="px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded-md transition-colors min-w-[4rem] text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={handleZoomIn} title="Zoom in" className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Plus className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-0.5" />
              <button onClick={handleFitView} title="Fit to view" className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile / Desktop: Device mockup ──────────────────────────── */}
      {isWeb && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          {activeWebLayout && template ? (
            <DeviceMockup mode={selectedIcon as "mobile" | "desktop"}>
              <WebMenuRenderer
                webLayout={activeWebLayout}
                menuData={data}
                colors={template.colors}
                fonts={template.fonts}
                templateName={template.name}
                mode={selectedIcon as "mobile" | "desktop"}
              />
            </DeviceMockup>
          ) : (
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                No {selectedIcon} web layout configured for this template.
              </p>
              <p className="text-xs mt-1">
                Set it up in the Template Editor first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── QR Code ──────────────────────────────────────────────────── */}
      {isQr && (
        <div className="absolute inset-0">
          <QrCodeView
            menuId={menuId}
            menuTitle={data.title}
            colors={template?.colors}
            menuData={data}
            template={template}
          />
        </div>
      )}

      {/* ── AI Prompt — fixed bottom-center (paper, mobile, desktop), hidden in AI mode ── */}
      {(isPaper || isWeb) && !aiMode && (
        <div className="absolute bottom-4 inset-x-0 z-30 pointer-events-auto flex justify-center px-4">
          <div className="w-[90%] max-w-2xl">
            <AIPromptBar menuId={menuId} />
          </div>
        </div>
      )}

      {/* ── Preview icons — vertically centered, fixed right ─────────── */}
      <div className="absolute inset-y-0 right-3 z-30 flex flex-col items-center justify-center gap-2 pointer-events-auto">
        {previewIcons.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            onClick={() => setSelectedIcon(id)}
            title={label}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 shadow-sm cursor-pointer",
              selectedIcon === id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20",
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
