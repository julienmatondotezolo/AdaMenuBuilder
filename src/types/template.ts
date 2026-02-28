/* ── Page Format ─────────────────────────────────────────────────────── */

export type FormatType = "A4" | "A5" | "DL" | "LONG" | "CUSTOM";

export interface PageFormat {
  type: FormatType;
  width: number;   // mm
  height: number;  // mm
}

export const PAGE_FORMATS: Record<Exclude<FormatType, "CUSTOM">, PageFormat> = {
  A4:   { type: "A4",   width: 210,    height: 297 },
  A5:   { type: "A5",   width: 148,    height: 210 },
  DL:   { type: "DL",   width: 99,     height: 210 },
  LONG: { type: "LONG", width: 109.98, height: 297.01 },
};

/** Convert mm to px at 96 DPI (screen preview) */
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * 96);

/* ── Color & Font Schemes ────────────────────────────────────────────── */

export interface ColorScheme {
  primary: string;
  background: string;
  text: string;
  accent: string;
  muted: string;
}

export interface FontScheme {
  heading: string;
  body: string;
}

/* ── Spacing ─────────────────────────────────────────────────────────── */

export interface SpacingConfig {
  marginTop: number;     // px
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  categoryGap: number;
  itemGap: number;
}

/* ── Page Variant Layouts ────────────────────────────────────────────── */

export type HeaderStyle = "centered" | "left" | "minimal" | "none";
export type CategoryStyle = "lines" | "dots" | "bold" | "minimal";
export type ItemAlignment = "center" | "left";
export type PricePosition = "right" | "below" | "inline";
export type HighlightPosition = "bottom" | "top" | "none";
export type SeparatorStyle = "line" | "dotted" | "none";

export interface VariantHeaderConfig {
  show: boolean;
  style: HeaderStyle;
  showSubtitle: boolean;
  showEstablished: boolean;
  showDivider: boolean;
}

export interface VariantBodyConfig {
  columns: number;
  categoryStyle: CategoryStyle;
  itemAlignment: ItemAlignment;
  pricePosition: PricePosition;
  separatorStyle: SeparatorStyle;
  showDescriptions: boolean;
  showFeaturedBadge: boolean;
}

export interface VariantHighlightConfig {
  show: boolean;
  position: HighlightPosition;
  height: number;        // px — image height in preview
  marginTop: number;     // px
  marginBottom: number;  // px
  marginLeft: number;    // px
  marginRight: number;   // px
}

export interface PageVariant {
  id: string;
  name: string;             // "Cover", "Content", "Content + Image", "Back Cover"
  header: VariantHeaderConfig;
  body: VariantBodyConfig;
  highlight: VariantHighlightConfig;
}

/* ── Template ────────────────────────────────────────────────────────── */

export interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  isBuiltIn: boolean;
  format: PageFormat;
  orientation: "portrait" | "landscape";
  colors: ColorScheme;
  fonts: FontScheme;
  spacing: SpacingConfig;
  pageVariants: PageVariant[];
  createdAt: string;
  updatedAt: string;
}
