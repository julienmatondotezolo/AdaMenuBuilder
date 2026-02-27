import { useState, useRef, useCallback, type WheelEvent } from "react";
import { FileText, Monitor, Tablet, Smartphone, QrCode, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import MenuPreview from "./MenuPreview";
import PdfViewer from "./PdfViewer";
import type { Viewport } from "../../types/menu";

interface ViewportOption {
  id: Viewport;
  label: string;
  icon: LucideIcon;
  width: number;
}

const viewports: ViewportOption[] = [
  { id: "paper", label: "Paper", icon: FileText, width: 794 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1024 },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
  { id: "paper" as Viewport, label: "QR Code", icon: QrCode, width: 794 },
];

// Deduplicate — paper appears once as the first entry; QR Code is separate
const viewportButtons: { id: Viewport | "qr"; label: string; icon: LucideIcon }[] = [
  { id: "paper", label: "Paper", icon: FileText },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "qr", label: "QR Code", icon: QrCode },
];

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;

const viewportWidths: Record<string, number> = {
  paper: 794,
  desktop: 1024,
  tablet: 768,
  mobile: 375,
};

export default function PreviewPanel() {
  const { viewport, setViewport } = useMenu();
  const [zoom, setZoom] = useState(0.75);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isPaper = viewport === "paper";
  const viewportWidth = viewportWidths[viewport] ?? 1024;

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(0.75);
  }, []);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(z + delta).toFixed(2))));
    }
  }, []);

  const handleViewportClick = (id: string) => {
    if (id === "qr") {
      // TODO: QR code feature
      return;
    }
    setViewport(id as Viewport);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-muted overflow-hidden">
      {/* Zoomable canvas area */}
      <div
        ref={canvasRef}
        className="flex-1 min-h-0 overflow-auto relative"
        onWheel={handleWheel}
      >
        {/* Viewport icons — fixed top-right inside preview */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-2">
          {viewportButtons.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleViewportClick(id)}
              title={label}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150",
                (id === viewport || (id === "paper" && viewport === "paper"))
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Canvas content */}
        <div className="min-h-full flex justify-center items-start p-10">
          {isPaper ? (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 150ms ease",
              }}
            >
              <PdfViewer />
            </div>
          ) : (
            <div
              className="bg-card rounded-xl shadow-lg border border-border overflow-hidden shrink-0"
              style={{
                width: `${viewportWidth}px`,
                maxWidth: "100%",
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 150ms ease",
              }}
            >
              <MenuPreview />
            </div>
          )}
        </div>
      </div>

      {/* Bottom zoom controls */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-background border-t border-border shrink-0">
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetZoom}
          title="Reset zoom"
          className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors min-w-[3.5rem] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          onClick={handleResetZoom}
          title="Reset to default"
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
