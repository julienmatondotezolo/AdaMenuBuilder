import { useRef, useState, useEffect } from "react";
import type { Decoration, ShapeDecoration, TextDecoration, ImageDecoration, DecorationGradient } from "../../types/template";
import { getShapePreset } from "../../data/decorationPresets";

/* ── Gradient helpers ───────────────────────────────────────────────── */

function gradientToCss(g: DecorationGradient): string {
  const stops = g.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(", ");
  if (g.type === "radial") return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${g.angle ?? 0}deg, ${stops})`;
}

function gradientToSvgId(decoId: string): string {
  return `grad-${decoId}`;
}

function SvgGradientDef({ id, gradient }: { id: string; gradient: DecorationGradient }) {
  if (gradient.type === "radial") {
    return (
      <radialGradient id={id} cx="50%" cy="50%" r="50%">
        {gradient.stops.map((s, i) => (
          <stop key={i} offset={`${s.offset * 100}%`} stopColor={s.color} />
        ))}
      </radialGradient>
    );
  }
  // Linear — convert angle to x1/y1/x2/y2
  const angle = (gradient.angle ?? 0) * (Math.PI / 180);
  const x1 = 50 - Math.sin(angle) * 50;
  const y1 = 50 + Math.cos(angle) * 50;
  const x2 = 50 + Math.sin(angle) * 50;
  const y2 = 50 - Math.cos(angle) * 50;
  return (
    <linearGradient id={id} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
      {gradient.stops.map((s, i) => (
        <stop key={i} offset={`${s.offset * 100}%`} stopColor={s.color} />
      ))}
    </linearGradient>
  );
}

/* ── Shape Renderer ─────────────────────────────────────────────────── */

function ShapeRenderer({ deco }: { deco: ShapeDecoration }) {
  const preset = getShapePreset(deco.shape);
  if (!preset) return null;

  const isGradient = typeof deco.fill !== "string";
  const gradId = gradientToSvgId(deco.id);
  const fillValue = isGradient ? `url(#${gradId})` : (deco.fill as string);

  // Blob shapes use path centered at 100,100 in 200x200 viewbox
  if (preset.path) {
    return (
      <svg viewBox={preset.viewBox} width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          {isGradient && <SvgGradientDef id={gradId} gradient={deco.fill as DecorationGradient} />}
        </defs>
        <g transform="translate(100,100)">
          <path
            d={preset.path}
            fill={fillValue}
            stroke={deco.stroke || "none"}
            strokeWidth={deco.strokeWidth || 0}
          />
        </g>
      </svg>
    );
  }

  // Basic shapes
  if (deco.shape === "circle") {
    return (
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          {isGradient && <SvgGradientDef id={gradId} gradient={deco.fill as DecorationGradient} />}
        </defs>
        <circle cx="100" cy="100" r="98" fill={fillValue} stroke={deco.stroke || "none"} strokeWidth={deco.strokeWidth || 0} />
      </svg>
    );
  }

  if (deco.shape === "ellipse") {
    return (
      <svg viewBox={preset.viewBox} width="100%" height="100%">
        <defs>
          {isGradient && <SvgGradientDef id={gradId} gradient={deco.fill as DecorationGradient} />}
        </defs>
        <ellipse cx="100" cy="50" rx="98" ry="48" fill={fillValue} stroke={deco.stroke || "none"} strokeWidth={deco.strokeWidth || 0} />
      </svg>
    );
  }

  if (deco.shape === "rectangle") {
    return (
      <svg viewBox={preset.viewBox} width="100%" height="100%">
        <defs>
          {isGradient && <SvgGradientDef id={gradId} gradient={deco.fill as DecorationGradient} />}
        </defs>
        <rect x="1" y="1" width="198" height="198" rx={deco.borderRadius || 0} fill={fillValue} stroke={deco.stroke || "none"} strokeWidth={deco.strokeWidth || 0} />
      </svg>
    );
  }

  return null;
}

/* ── Text Renderer ──────────────────────────────────────────────────── */

function TextRenderer({ deco }: { deco: TextDecoration }) {
  const isGradient = typeof deco.fill !== "string";

  const style: React.CSSProperties = {
    fontFamily: deco.fontFamily,
    fontSize: `${deco.fontSize}px`,
    fontWeight: deco.fontWeight,
    fontStyle: deco.fontStyle,
    letterSpacing: `${deco.letterSpacing}em`,
    textTransform: deco.textTransform,
    lineHeight: 1.1,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (isGradient) {
    const grad = deco.fill as DecorationGradient;
    style.background = gradientToCss(grad);
    style.WebkitBackgroundClip = "text";
    style.WebkitTextFillColor = "transparent";
    style.backgroundClip = "text";
  } else {
    style.color = deco.fill as string;
  }

  if (deco.stroke) {
    style.WebkitTextStroke = `${deco.strokeWidth || 1}px ${deco.stroke}`;
  }

  if (deco.textShadow) {
    style.textShadow = deco.textShadow;
  }

  return <div style={style}>{deco.text}</div>;
}

/* ── Image Renderer ─────────────────────────────────────────────────── */

function MaskedImage({ src, maskDataUri, objectFit, width, height }: {
  src: string; maskDataUri: string; objectFit: string; width: number; height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    const mask = new Image();
    let loaded = 0;

    const tryComposite = () => {
      loaded++;
      if (loaded < 2) return;

      canvas.width = width;
      canvas.height = height;

      // Step 1: Draw the mask and convert luminance → alpha
      // The mask is white (visible) / black (hidden), both fully opaque.
      // We need: white → alpha 255, black → alpha 0.
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(mask, 0, 0, width, height);
      const maskData = ctx.getImageData(0, 0, width, height);
      const px = maskData.data;
      for (let i = 0; i < px.length; i += 4) {
        // Set alpha = luminance (R channel), make pixel white
        px[i + 3] = px[i]; // A = R (white=255=visible, black=0=hidden)
        px[i] = 255;       // R
        px[i + 1] = 255;   // G
        px[i + 2] = 255;   // B
      }
      ctx.putImageData(maskData, 0, 0);

      // Step 2: Draw the image using source-in (keeps image only where mask alpha > 0)
      ctx.globalCompositeOperation = "source-in";
      if (objectFit === "contain") {
        const s = Math.min(width / img.naturalWidth, height / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
      } else if (objectFit === "cover") {
        const s = Math.max(width / img.naturalWidth, height / img.naturalHeight);
        const dw = img.naturalWidth * s;
        const dh = img.naturalHeight * s;
        ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }
      ctx.globalCompositeOperation = "source-over";

      setReady(true);
    };

    img.onload = tryComposite;
    img.src = src;

    mask.onload = tryComposite;
    mask.src = maskDataUri;
  }, [src, maskDataUri, width, height, objectFit]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", opacity: ready ? 1 : 0 }}
    />
  );
}

function ImageRenderer({ deco }: { deco: ImageDecoration }) {
  if (deco.maskDataUri) {
    return (
      <MaskedImage
        src={deco.src}
        maskDataUri={deco.maskDataUri}
        objectFit={deco.objectFit}
        width={deco.width}
        height={deco.height}
      />
    );
  }

  return (
    <img
      src={deco.src}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: deco.objectFit, display: "block" }}
      draggable={false}
    />
  );
}

/* ── Main Renderer ──────────────────────────────────────────────────── */

export default function DecorationRenderer({ decoration }: { decoration: Decoration }) {
  if (decoration.kind === "shape") return <ShapeRenderer deco={decoration as ShapeDecoration} />;
  if (decoration.kind === "text") return <TextRenderer deco={decoration as TextDecoration} />;
  if (decoration.kind === "image") return <ImageRenderer deco={decoration as ImageDecoration} />;
  return null;
}

/** Wrapper that positions a decoration absolutely within a page container */
export function DecorationLayer({ decoration }: { decoration: Decoration }) {
  return (
    <div
      style={{
        position: "absolute",
        left: decoration.x,
        top: decoration.y,
        width: decoration.width,
        height: decoration.height,
        transform: decoration.rotation ? `rotate(${decoration.rotation}deg)` : undefined,
        opacity: decoration.opacity,
        zIndex: decoration.zIndex,
        pointerEvents: "none",
      }}
    >
      <DecorationRenderer decoration={decoration} />
    </div>
  );
}
