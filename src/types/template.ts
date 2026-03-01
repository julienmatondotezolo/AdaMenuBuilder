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
  price?: string;
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

export type HeaderStyle = "centered" | "left" | "right" | "minimal" | "custom" | "none";
export type CategoryStyle = "lines" | "dots" | "bold" | "minimal";
export type ItemAlignment = "center" | "left";
export type PricePosition = "right" | "below" | "inline";
export type HighlightPosition = "bottom" | "top" | "none";
export type HighlightStyle = "fit" | "full-width" | "custom";
export type SeparatorStyle = "line" | "dotted" | "none";
export type SectionType = "header" | "body" | "highlight";

export interface SectionImageConfig {
  url?: string;           // image URL (optional)
  offsetX: number;        // px offset from left
  offsetY: number;        // px offset from top  
  width: number;          // px
  height: number;         // px
  opacity: number;        // 0-1
  objectFit: "cover" | "contain" | "fill";
}

export interface VariantHeaderConfig {
  show: boolean;
  style: HeaderStyle;
  customAlignment?: "center" | "left" | "right";
  showSubtitle: boolean;
  showEstablished: boolean;
  showDivider: boolean;
  offsetX?: number;       // px offset for preview drag
  offsetY?: number;       // px offset for preview drag
  customWidth?: number;   // px bounding box width (custom mode)
  customHeight?: number;  // px bounding box height (custom mode)
  image?: SectionImageConfig;
}

export interface VariantBodyConfig {
  show?: boolean;
  columns: number;
  categoryStyle: CategoryStyle;
  itemAlignment: ItemAlignment;
  pricePosition: PricePosition;
  separatorStyle: SeparatorStyle;
  showDescriptions: boolean;
  showFeaturedBadge: boolean;
  offsetX?: number;       // px offset for preview drag
  offsetY?: number;       // px offset for preview drag
  image?: SectionImageConfig;
}

export type HighlightTextAlign = "left" | "center" | "right";

export interface HighlightTextConfig {
  alignment: HighlightTextAlign;
  labelSize: number;       // px — "CHEF'S PICK" subtitle size
  titleSize: number;       // px — "Osso Buco alla Milanese" title size
  labelFont?: string;      // font family override for label (defaults to body font)
  titleFont?: string;      // font family override for title (defaults to heading font)
}

export interface VariantHighlightConfig {
  show: boolean;
  position: HighlightPosition;
  style: HighlightStyle;  // "fit" = full width respecting margins, "full-width" = full page width, "custom" = free position/resize
  height: number;         // px — image height in preview
  marginTop: number;      // px
  marginBottom: number;   // px
  marginLeft: number;     // px
  marginRight: number;    // px
  offsetX?: number;       // px offset for preview drag
  offsetY?: number;       // px offset for preview drag
  customWidth?: number;   // px bounding box width (custom mode)
  customHeight?: number;  // px bounding box height (custom mode)
  imageFit: "fit" | "contain" | "cover";  // how the image fills the container
  imageUrl?: string;      // image URL or data URI
  imageLocked: boolean;   // if true, image cannot be changed in menu editor
  text?: HighlightTextConfig;  // text overlay controls
}

export interface PageVariant {
  id: string;
  name: string;             // "Cover", "Content", "Content + Image", "Back Cover"
  header: VariantHeaderConfig;
  body: VariantBodyConfig;
  highlight: VariantHighlightConfig;
  sectionOrder?: SectionType[];  // Order of sections for drag-and-drop
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
