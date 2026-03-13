import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button, Label, cn } from "ada-design-system";
import { Eraser, Paintbrush, RotateCcw, Check, X, FlipVertical2 } from "lucide-react";

interface MaskEditorProps {
  width: number;
  height: number;
  imageSrc: string;
  existingMask?: string;
  onSave: (maskDataUri: string) => void;
  onCancel: () => void;
}

export default function MaskEditor({ width, height, imageSrc, existingMask, onSave, onCancel }: MaskEditorProps) {
  // Hidden canvas for the actual mask (white = visible, black = hidden)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  // Visible canvas for the overlay preview
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [brushSize, setBrushSize] = useState(30);
  const [isErasing, setIsErasing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [maskDataUri, setMaskDataUri] = useState<string | null>(null);

  // Fit the editor into available space
  const maxDisplayW = 800;
  const maxDisplayH = 600;
  const displayScale = Math.min(1, maxDisplayW / width, maxDisplayH / height);
  const displayW = Math.round(width * displayScale);
  const displayH = Math.round(height * displayScale);

  // Initialize mask canvas
  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    if (existingMask) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        updateOverlay();
        setMaskDataUri(canvas.toDataURL("image/png"));
      };
      img.src = existingMask;
    } else {
      // White = fully visible
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      updateOverlay();
      setMaskDataUri(canvas.toDataURL("image/png"));
    }
  }, [width, height, existingMask]);

  // Initialize overlay canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
  }, [width, height]);

  // Render the overlay: red semi-transparent where mask is black (hidden)
  const updateOverlay = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!maskCanvas || !overlayCanvas) return;

    const maskCtx = maskCanvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!maskCtx || !overlayCtx) return;

    const maskData = maskCtx.getImageData(0, 0, width, height);
    const overlayImageData = overlayCtx.createImageData(width, height);
    const md = maskData.data;
    const od = overlayImageData.data;

    for (let i = 0; i < md.length; i += 4) {
      // mask is grayscale: R channel tells us visibility (255=visible, 0=hidden)
      const visibility = md[i]; // R channel
      if (visibility < 128) {
        // Hidden area — show red overlay
        od[i] = 220;     // R
        od[i + 1] = 50;  // G
        od[i + 2] = 50;  // B
        od[i + 3] = 140; // A — semi-transparent red
      } else {
        // Visible area — transparent
        od[i + 3] = 0;
      }
    }

    overlayCtx.putImageData(overlayImageData, 0, 0);
  }, [width, height]);

  const syncMaskDataUri = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    setMaskDataUri(canvas.toDataURL("image/png"));
  }, []);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / displayScale,
      y: (e.clientY - rect.top) / displayScale,
    };
  }, [displayScale]);

  const paintAt = useCallback((x: number, y: number) => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = isErasing ? "white" : "black";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize, isErasing]);

  const paintLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = isErasing ? "white" : "black";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [brushSize, isErasing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPainting(true);
    const pos = getCanvasPos(e);
    lastPos.current = pos;
    paintAt(pos.x, pos.y);
    updateOverlay();
    syncMaskDataUri();
  }, [getCanvasPos, paintAt, updateOverlay, syncMaskDataUri]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    setCursorPos({ x: e.clientX, y: e.clientY });

    if (!isPainting) return;
    if (lastPos.current) {
      paintLine(lastPos.current, pos);
    }
    lastPos.current = pos;
    updateOverlay();
    // Throttle dataURI generation to avoid lag — update on every 3rd move
    syncMaskDataUri();
  }, [isPainting, getCanvasPos, paintLine, updateOverlay, syncMaskDataUri]);

  const handleMouseUp = useCallback(() => {
    if (isPainting) {
      updateOverlay();
      syncMaskDataUri();
    }
    setIsPainting(false);
    lastPos.current = null;
  }, [isPainting, updateOverlay, syncMaskDataUri]);

  const resetMask = () => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    updateOverlay();
    syncMaskDataUri();
  };

  const invertMask = () => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, width, height);
    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
      px[i] = 255 - px[i];         // R
      px[i + 1] = 255 - px[i + 1]; // G
      px[i + 2] = 255 - px[i + 2]; // B
      // Alpha stays the same
    }
    ctx.putImageData(imageData, 0, 0);
    updateOverlay();
    syncMaskDataUri();
  };

  const handleSave = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
          <button
            onClick={() => setIsErasing(false)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors",
              !isErasing ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            Hide
          </button>
          <button
            onClick={() => setIsErasing(true)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors",
              isErasing ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <Eraser className="w-3.5 h-3.5" />
            Reveal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Brush</Label>
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 h-1.5 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-8">{brushSize}px</span>
        </div>

        <Button variant="outline" size="sm" className="text-xs h-7" onClick={invertMask}>
          <FlipVertical2 className="w-3 h-3 mr-1" />
          Invert
        </Button>

        <Button variant="outline" size="sm" className="text-xs h-7" onClick={resetMask}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button size="sm" className="text-xs h-7" onClick={handleSave}>
          <Check className="w-3 h-3 mr-1" />
          Apply Mask
        </Button>
      </div>

      {/* Canvas area */}
      <div
        className="relative mx-auto border border-border rounded-md overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[size:16px_16px]"
        style={{ width: displayW, height: displayH, cursor: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setCursorPos(null); }}
        onMouseEnter={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
      >
        {/* Background image — shown at low opacity as reference for hidden areas */}
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />

        {/* Live masked image — shows the actual result */}
        {maskDataUri && (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
              maskImage: `url(${maskDataUri})`,
              WebkitMaskImage: `url(${maskDataUri})`,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
            } as React.CSSProperties}
          />
        )}

        {/* Red overlay showing hidden areas */}
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Hidden mask canvas — not displayed, only used for data */}
        <canvas
          ref={maskCanvasRef}
          style={{ display: "none" }}
        />
      </div>

      {/* Floating brush cursor — portaled to body to avoid dialog overflow clipping */}
      {cursorPos && createPortal(
        <div
          className="pointer-events-none fixed rounded-full border-2"
          style={{
            width: brushSize * displayScale,
            height: brushSize * displayScale,
            borderColor: isErasing ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)",
            backgroundColor: isErasing ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            transform: "translate(-50%,-50%)",
            left: cursorPos.x,
            top: cursorPos.y,
            zIndex: 99999,
          }}
        />,
        document.body
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Paint to hide parts of the image (red = hidden). Use Reveal mode to bring back hidden areas.
      </p>
    </div>
  );
}
