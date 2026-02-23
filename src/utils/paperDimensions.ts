import type { PaperFormat, Orientation } from "../types/menu";

export interface PaperDimensions {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
}

/** Top margin (in px) applied to pages after the first */
export const PAGE_MARGIN_PX = 40;

export const PAPER_FORMATS: Record<PaperFormat, PaperDimensions> = {
  A3: { widthPt: 841.89, heightPt: 1190.55, widthPx: 1123, heightPx: 1587 },
  A4: { widthPt: 595.28, heightPt: 841.89, widthPx: 794, heightPx: 1123 },
  A5: { widthPt: 419.53, heightPt: 595.28, widthPx: 559, heightPx: 794 },
};

export function getPaperDimensions(
  format: PaperFormat,
  orientation: Orientation,
): PaperDimensions {
  const base = PAPER_FORMATS[format];
  if (orientation === "portrait") return base;
  return {
    widthPt: base.heightPt,
    heightPt: base.widthPt,
    widthPx: base.heightPx,
    heightPx: base.widthPx,
  };
}
