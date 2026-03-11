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
export type CategoryStyle = "lines" | "bold" | "minimal" | "custom";
export type ItemAlignment = "center" | "left" | "right";
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
  customWidth?: number;   // px bounding box width (custom mode)
  customHeight?: number;  // px bounding box height (custom mode)
  // Custom category style fields
  categoryFontSize?: number;      // px
  categoryFont?: string;          // font family override
  categoryLetterSpacing?: number; // em
  categoryAlignment?: "left" | "center" | "right";
  categoryBorderBottom?: boolean;
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
  borderRadius?: number;  // px — image border radius (0 = sharp corners)
  text?: HighlightTextConfig;  // text overlay controls
}

/* ── Decorative Elements ────────────────────────────────────────────── */

export type DecorationKind = "shape" | "text" | "image";

export interface GradientStop { offset: number; color: string }

export interface DecorationGradient {
  type: "linear" | "radial";
  angle?: number;          // degrees, for linear
  stops: GradientStop[];
}

export interface DecorationBase {
  id: string;
  kind: DecorationKind;
  x: number;               // px from left (unscaled, relative to page)
  y: number;               // px from top
  width: number;
  height: number;
  rotation: number;        // degrees
  opacity: number;         // 0-1
  zIndex: number;
  locked?: boolean;
}

export type ShapePreset = "blob1" | "blob2" | "blob3" | "blob4" | "circle" | "ellipse" | "rectangle";

export interface ShapeDecoration extends DecorationBase {
  kind: "shape";
  shape: ShapePreset;
  fill: string | DecorationGradient;
  borderRadius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextDecoration extends DecorationBase {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: number;   // em
  textTransform: "none" | "uppercase" | "lowercase";
  fill: string | DecorationGradient;
  stroke?: string;
  strokeWidth?: number;
  textShadow?: string;
}

export interface ImageDecoration extends DecorationBase {
  kind: "image";
  src: string;              // URL or data URI
  objectFit: "cover" | "contain" | "fill";
  maskDataUri?: string;     // painted mask stored as PNG data URI
}

export type Decoration = ShapeDecoration | TextDecoration | ImageDecoration;

/* ── Page Variant ───────────────────────────────────────────────────── */

export interface PageVariant {
  id: string;
  name: string;             // "Cover", "Content", "Content + Image", "Back Cover"
  header: VariantHeaderConfig;
  body: VariantBodyConfig;
  highlight: VariantHighlightConfig;
  sectionOrder?: SectionType[];  // Order of sections for drag-and-drop
  decorations?: Decoration[];    // Free-form decorative elements
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
