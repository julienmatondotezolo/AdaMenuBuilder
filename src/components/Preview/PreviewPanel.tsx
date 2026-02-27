import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FileText, Monitor, Tablet, Smartphone, QrCode, Minus, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import MenuPreview from "./MenuPreview";
import type { Viewport } from "../../types/menu";

/* ── Viewport config ─────────────────────────────────────────────────────── */

const viewportButtons: { id: Viewport | "qr"; label: string; icon: LucideIcon; width: number }[] = [
  { id: "paper", label: "Paper", icon: FileText, width: 794 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1024 },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
  { id: "qr", label: "QR Code", icon: QrCode, width: 794 },
];

/* ── Zoom constants ──────────────────────────────────────────────────────── */

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;
const DEFAULT_ZOOM = 0.7;

export default function PreviewPanel() {
  const { viewport, setViewport } = useMenu();

  /* ── Canvas state ──────────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const activeViewport = viewportButtons.find(
    (v) => v.id === viewport,
  );
  const viewportWidth = activeViewport?.width ?? 794;

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

  /* ── Pointer panning (space + drag OR middle-click drag) ───────────────── */
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Space held or middle mouse button
      if (spaceHeld || e.button === 1) {
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
    setZoom(DEFAULT_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  /* ── Viewport click ────────────────────────────────────────────────────── */
  const handleViewportClick = (id: string) => {
    if (id === "qr") return; // TODO: QR code feature
    setViewport(id as Viewport);
  };

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
        className={cn("absolute inset-0 select-none", cursorClass)}
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
          <div className="flex justify-center pt-16" style={{ width: `${100 / zoom}vw` }}>
            <div
              className="bg-card rounded-xl shadow-lg border border-border overflow-hidden shrink-0"
              style={{ width: `${viewportWidth}px` }}
            >
              <MenuPreview />
            </div>
          </div>
        </div>
      </div>

      {/* ── Viewport icons — fixed top-right ───────────────────────────── */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-center gap-2 pointer-events-auto">
        {viewportButtons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleViewportClick(id)}
            title={label}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 shadow-sm",
              id === viewport
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20",
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* ── Zoom controls — fixed bottom-center ────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
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
        </div>
      </div>
    </div>
  );
}
