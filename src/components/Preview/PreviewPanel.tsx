import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FileText, Monitor, Smartphone, QrCode, Minus, Plus, Maximize, Volume2, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, Button, Input } from "ada-design-system";
import MenuPreview from "./MenuPreview";

/* ── Preview sidebar icons (display only) ────────────────────────────────── */

const previewIcons: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "paper", label: "Paper", icon: FileText },
  { id: "mobile", label: "Phone", icon: Smartphone },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "qr", label: "QR Code", icon: QrCode },
];

/* ── Zoom constants ──────────────────────────────────────────────────────── */

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const DEFAULT_ZOOM = 0.7;

const PREVIEW_WIDTH = 794;

export default function PreviewPanel() {
  const [selectedIcon, setSelectedIcon] = useState("paper");

  /* ── Canvas state ──────────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Refs to always have latest zoom/pan in event handlers (avoids stale closures)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  /* ── Pinch-to-zoom state ───────────────────────────────────────────────── */
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number; midX: number; midY: number } | null>(null);

  /* ── Measure container + auto-center on mount ───────────────────────────── */
  const hasCentered = useRef(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
      // Center on first measure
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
    // Small delay for content to render
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Space key for hand tool ───────────────────────────────────────────── */
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

  /* ── Pointer panning (space + drag OR middle-click drag OR touch) ────── */
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Track touch pointers for pinch
      if (e.pointerType === "touch") {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

        // Two fingers down → start pinch
        if (activePointers.current.size === 2) {
          const pts = [...activePointers.current.values()];
          const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          pinchStart.current = { dist, zoom, midX, midY };
          setIsPanning(false); // stop single-finger pan during pinch
          return;
        }

        // Single finger → pan
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      // Space held or middle mouse button
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
      // Update tracked pointer
      if (e.pointerType === "touch" && activePointers.current.has(e.pointerId)) {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Pinch zoom with two fingers — Figma-style zoom to midpoint
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
    if (activePointers.current.size < 2) {
      pinchStart.current = null;
    }
    if (activePointers.current.size === 0) {
      setIsPanning(false);
    }
  }, []);

  /* ── Wheel: Ctrl/⌘ = zoom, otherwise pan ───────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent all default wheel behavior (including macOS back/forward swipe)
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        // Read current values from refs (always fresh)
        const prevZoom = zoomRef.current;
        const prevPan = panRef.current;

        // Smooth proportional zoom from trackpad deltaY
        const rawDelta = -e.deltaY * 0.01;
        const clampedDelta = Math.max(-0.15, Math.min(0.15, rawDelta));
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(prevZoom * (1 + clampedDelta)).toFixed(3)));
        const scaleFactor = newZoom / prevZoom;

        // Keep the point under the cursor fixed
        const newPan = {
          x: pointerX - scaleFactor * (pointerX - prevPan.x),
          y: pointerY - scaleFactor * (pointerY - prevPan.y),
        };

        setZoom(newZoom);
        setPan(newPan);
      } else {
        // Normal scroll = pan
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ── Zoom helpers ──────────────────────────────────────────────────────── */
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
    // Fit menu inside container with padding
    const padding = 100;
    const cW = el.clientWidth - padding;
    const cH = el.clientHeight - padding;
    const contentH = content?.scrollHeight ?? 1000;
    const fitZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +Math.min(cW / PREVIEW_WIDTH, cH / contentH).toFixed(2)));
    // Center content in container
    const panX = (el.clientWidth - PREVIEW_WIDTH * fitZoom) / 2;
    const panY = (el.clientHeight - contentH * fitZoom) / 2;
    setZoom(fitZoom);
    setPan({ x: panX, y: Math.max(panY, padding / 2) });
  }, []);

  /* ── Cursor ────────────────────────────────────────────────────────────── */
  const cursorClass = isPanning
    ? "cursor-grabbing"
    : spaceHeld
      ? "cursor-grab"
      : "cursor-default";

  return (
    <div className="absolute inset-0 bg-muted overflow-hidden">
      {/* ── Infinite canvas ────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className={cn("absolute inset-0 select-none touch-none", cursorClass)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Transform layer — pan + zoom */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
          className="absolute top-0 left-0"
        >
          <div
            ref={contentRef}
            className="bg-card rounded-xl shadow-lg border border-border overflow-hidden shrink-0"
            style={{ width: `${PREVIEW_WIDTH}px` }}
          >
            <MenuPreview />
          </div>
        </div>
      </div>

      {/* ── Preview icons — vertically centered, fixed right ──────────── */}
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

      {/* ── Magic Prompt — fixed bottom-center ──────────────────────────── */}
      <div className="absolute bottom-4 inset-x-0 z-30 pointer-events-auto flex justify-center px-4">
        <div className="w-[90%] max-w-2xl">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl shadow-lg px-4 py-2.5">
          <Button size="sm" className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
            Speak
          </Button>

          <Input
            type="text"
            placeholder="Describe your menu changes — e.g. 'Make all pasta prices €14' or 'Add a vegan section with 3 dishes'"
            className="flex-1 bg-transparent border-none focus:ring-0 focus:border-none shadow-none"
          />

          <div className="flex items-center shrink-0">
            <Button size="icon" className="w-8 h-8 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* ── Zoom controls — fixed top-left ──────────────────────────────── */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg px-2 py-1.5">
          <button
            onClick={handleZoomOut}
            title="Zoom out"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitView}
            title="Fit to view"
            className="px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted rounded-md transition-colors min-w-[4rem] text-center tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            title="Zoom in"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={handleFitView}
            title="Fit to view"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
