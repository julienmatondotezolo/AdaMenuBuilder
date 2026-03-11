import { useRef, useState, useEffect, useCallback } from "react";
import { Button, Label, cn } from "ada-design-system";
import { Eraser, Paintbrush, RotateCcw, Check, X } from "lucide-react";

interface MaskEditorProps {
  width: number;
  height: number;
  imageSrc: string;
  existingMask?: string;
  onSave: (maskDataUri: string) => void;
  onCancel: () => void;
}

export default function MaskEditor({ width, height, imageSrc, existingMask, onSave, onCancel }: MaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [isErasing, setIsErasing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Fit the editor into available space
  const maxDisplayW = 800;
  const maxDisplayH = 600;
  const displayScale = Math.min(1, maxDisplayW / width, maxDisplayH / height);
  const displayW = Math.round(width * displayScale);
  const displayH = Math.round(height * displayScale);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    if (existingMask) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = existingMask;
    } else {
      // White = fully visible
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
    }
  }, [width, height, existingMask]);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / displayScale,
      y: (e.clientY - rect.top) / displayScale,
    };
  }, [displayScale]);

  const paintAt = useCallback((x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = isErasing ? "white" : "black";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [brushSize, isErasing]);

  const paintLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
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
  }, [getCanvasPos, paintAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPainting) return;
    const pos = getCanvasPos(e);
    if (lastPos.current) {
      paintLine(lastPos.current, pos);
    }
    lastPos.current = pos;
  }, [isPainting, getCanvasPos, paintLine]);

  const handleMouseUp = useCallback(() => {
    setIsPainting(false);
    lastPos.current = null;
  }, []);

  const resetMask = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
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
        style={{ width: displayW, height: displayH }}
      >
        {/* Background image */}
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
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />

        {/* Mask preview overlay — shows current mask with semi-transparent red */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: "crosshair",
            mixBlendMode: "multiply",
            opacity: 0.4,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Live result preview — the actual masked image */}
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
            maskImage: canvasRef.current ? `url(${canvasRef.current.toDataURL()})` : undefined,
            WebkitMaskImage: canvasRef.current ? `url(${canvasRef.current.toDataURL()})` : undefined,
            maskSize: "100% 100%",
          }}
        />

        {/* Brush cursor indicator */}
        <div
          className="pointer-events-none absolute rounded-full border-2"
          style={{
            width: brushSize * displayScale,
            height: brushSize * displayScale,
            borderColor: isErasing ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)",
            transform: "translate(-50%,-50%)",
            left: "50%",
            top: "50%",
            display: "none",
          }}
          id="mask-brush-cursor"
        />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Paint black areas to hide parts of the image. Use Reveal mode to bring back hidden areas.
      </p>
    </div>
  );
}
