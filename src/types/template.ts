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
export type SectionType = "header" | "body" | "highlight" | `body-${number}`;

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
  showCategoryName?: boolean;     // show/hide category headers (default true)
  priceJustifyRight?: boolean;    // push price to far right edge of container
  showItemDot?: boolean;          // decorative dot before item name
  itemDotColor?: string;          // dot color (defaults to primary)
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
  // Font size overrides (px) — all optional, defaults in renderer
  itemFontSize?: number;          // item name size (default 14)
  priceFontSize?: number;         // price size (default 12)
  descriptionFontSize?: number;   // description size (default 12)
  itemDotSize?: number;           // dot diameter (default 6)
  globalFontScale?: number;       // multiplier 0.5–2.0 (default 1) — scales all sizes at once
  maxCategories?: number;         // max categories in this body section (overflow goes to next body)
  itemTextTransform?: "uppercase" | "capitalize" | "none";   // item name casing (default "uppercase")
  categoryTextTransform?: "uppercase" | "capitalize" | "none"; // category name casing (default "uppercase")
  // Per-section spacing overrides (px) — override global spacing when set
  itemSpacingV?: number;          // vertical gap between items (overrides spacing.itemGap)
  itemSpacingH?: number;          // horizontal padding on items
  categorySpacingV?: number;      // vertical gap between categories (overrides spacing.categoryGap)
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
  name?: string;            // user-editable display name
  x: number;               // px from left (unscaled, relative to page)
  y: number;               // px from top
  width: number;
  height: number;
  rotation: number;        // degrees
  opacity: number;         // 0-1
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  aspectRatioLocked?: boolean;
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
  extraBodies?: VariantBodyConfig[];   // Additional body sections (body-2, body-3, …)
  sectionOrder?: SectionType[];  // Order of sections for drag-and-drop
  decorations?: Decoration[];    // Free-form decorative elements
}

/** Helper: get a body config by section type ("body" → main, "body-2" → extraBodies[0], etc.) */
export function getBodyForSection(variant: PageVariant, section: SectionType): VariantBodyConfig | undefined {
  if (section === "body") return variant.body;
  const m = section.match(/^body-(\d+)$/);
  if (!m) return undefined;
  const idx = Number(m[1]) - 2; // "body-2" → index 0
  return variant.extraBodies?.[idx];
}

/** Helper: check if a section type is a body section */
export function isBodySection(section: SectionType): boolean {
  return section === "body" || /^body-\d+$/.test(section);
}

/* ── Web Layout Blocks ───────────────────────────────────────────────── */

export type WebBlockType =
  | "hero"
  | "category-nav"
  | "menu-section"
  | "featured-spotlight"
  | "image-banner"
  | "info-bar"
  | "search"
  | "footer";

interface WebBlockBase {
  id: string;
  type: WebBlockType;
}

export interface WebHeroBlock extends WebBlockBase {
  type: "hero";
  height: number;               // px
  textAlign: "left" | "center" | "right";
  backgroundImageUrl?: string;
  backgroundOverlayOpacity: number; // 0-1
}

export interface WebCategoryNavBlock extends WebBlockBase {
  type: "category-nav";
  style: "tabs" | "pills" | "anchors";
  sticky: boolean;
}

export interface WebMenuSectionBlock extends WebBlockBase {
  type: "menu-section";
  columns: 1 | 2;
  itemStyle: "compact" | "card" | "detailed";
  pricePosition: "right" | "below" | "inline";
}

export interface WebFeaturedSpotlightBlock extends WebBlockBase {
  type: "featured-spotlight";
  layout: "horizontal" | "grid";
  maxItems: number;
}

export interface WebImageBannerBlock extends WebBlockBase {
  type: "image-banner";
  imageUrl?: string;
  height: number;               // px
  objectFit: "cover" | "contain" | "fill";
}

export interface WebInfoBarBlock extends WebBlockBase {
  type: "info-bar";
  items: { icon: string; text: string }[];
  layout: "row" | "column";
}

export interface WebSearchBlock extends WebBlockBase {
  type: "search";
  placeholder: string;
}

export interface WebFooterBlock extends WebBlockBase {
  type: "footer";
  showAddress: boolean;
  showPhone: boolean;
  customText: string;
}

export type WebBlock =
  | WebHeroBlock
  | WebCategoryNavBlock
  | WebMenuSectionBlock
  | WebFeaturedSpotlightBlock
  | WebImageBannerBlock
  | WebInfoBarBlock
  | WebSearchBlock
  | WebFooterBlock;

export interface WebLayoutSpacing {
  sectionGap: number;       // px between blocks
  contentPaddingX: number;  // px horizontal padding
  contentMaxWidth: number;  // px max content width
}

export interface WebLayout {
  blocks: WebBlock[];
  spacing: WebLayoutSpacing;
  borderRadius: number;
  showScrollbar: boolean;
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
  previewMenuId?: string;         // menu ID used for preview data ("sample" or a real menu ID)
  publishedAt?: string;           // ISO timestamp of last publish
  publishedHash?: string;         // hash of template content at publish time
  remoteIds?: Record<string, string>; // map of restaurantId → remote template ID in Supabase
  builtInVersion?: number;        // version counter from backend built_in_templates table
  hasLocalChanges?: boolean;      // true when saved locally but not yet published/synced to backend
  webLayout?: WebLayout;
  createdAt: string;
  updatedAt: string;
}
