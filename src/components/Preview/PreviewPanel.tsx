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

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  /* ── Measure container size ────────────────────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
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
      // Space held, middle mouse button, or touch input
      if (spaceHeld || e.button === 1 || e.pointerType === "touch") {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [spaceHeld, pan],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    },
    [isPanning],
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  /* ── Wheel: Ctrl/⌘ = zoom, otherwise pan ───────────────────────────────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        setZoom((prevZoom) => {
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(prevZoom + delta).toFixed(2)));
          const scaleFactor = newZoom / prevZoom;

          setPan((prevPan) => ({
            x: pointerX - scaleFactor * (pointerX - prevPan.x),
            y: pointerY - scaleFactor * (pointerY - prevPan.y),
          }));

          return newZoom;
        });
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
    // Fit menu height inside container
    const padding = 100;
    const containerH = el.clientHeight - padding;
    const containerW = el.clientWidth - padding;
    const contentH = content?.scrollHeight ?? 1000;
    const fitByHeight = containerH / contentH;
    const fitByWidth = containerW / PREVIEW_WIDTH;
    const fitZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +Math.min(fitByHeight, fitByWidth).toFixed(2)));
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
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
          {/* Center the content in the canvas */}
          <div
            style={{
              width: `${containerSize.w / zoom}px`,
              minHeight: `${containerSize.h / zoom}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
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
