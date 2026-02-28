import type { MenuTemplate } from "../types/template";

/* ═══════════════════════════════════════════════════════════════════════
   Built-in templates — diverse styles for different restaurant vibes
   ═══════════════════════════════════════════════════════════════════════ */

export const LUMIERE_TEMPLATE: MenuTemplate = {
  id: "tpl-lumiere-dining",
  name: "Lumière Dining",
  description: "Elegant centered serif layout with decorative lines and highlight image",
  isBuiltIn: true,
  format: { type: "A4", width: 210, height: 297 },
  orientation: "portrait",
  colors: {
    primary: "#4d5cc5",
    background: "#ffffff",
    text: "#0a1029",
    accent: "#4d5cc5",
    muted: "#6b7280",
  },
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'DM Sans', sans-serif",
  },
  spacing: {
    marginTop: 48,
    marginBottom: 24,
    marginLeft: 32,
    marginRight: 32,
    categoryGap: 40,
    itemGap: 24,
  },
  pageVariants: [
    {
      id: "cover",
      name: "Cover",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: true, showDivider: true },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "content",
      name: "Content",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "content-image",
      name: "Content + Image",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: true, position: "bottom", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "back-cover",
      name: "Back Cover",
      header: { show: true, style: "minimal", showSubtitle: false, showEstablished: true, showDivider: true },
      body: { columns: 1, categoryStyle: "minimal", itemAlignment: "center", pricePosition: "below", separatorStyle: "none", showDescriptions: false, showFeaturedBadge: false },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const TRATTORIA_TEMPLATE: MenuTemplate = {
  id: "tpl-trattoria-rustica",
  name: "Trattoria Rustica",
  description: "Warm Italian-inspired layout with earthy tones, left-aligned with dotted price lines",
  isBuiltIn: true,
  format: { type: "A4", width: 210, height: 297 },
  orientation: "portrait",
  colors: {
    primary: "#8b4513",
    background: "#faf6f1",
    text: "#2c1810",
    accent: "#c4783e",
    muted: "#8c7b6b",
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Lora', serif",
  },
  spacing: {
    marginTop: 40,
    marginBottom: 28,
    marginLeft: 36,
    marginRight: 36,
    categoryGap: 36,
    itemGap: 20,
  },
  pageVariants: [
    {
      id: "cover",
      name: "Cover",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: true, showDivider: true },
      body: { columns: 1, categoryStyle: "bold", itemAlignment: "left", pricePosition: "right", separatorStyle: "dotted", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: true, position: "top", height: 100, marginTop: 0, marginBottom: 16, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "content",
      name: "Menu",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "bold", itemAlignment: "left", pricePosition: "right", separatorStyle: "dotted", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MODERN_NOIR_TEMPLATE: MenuTemplate = {
  id: "tpl-modern-noir",
  name: "Modern Noir",
  description: "Dark sophisticated layout with bold sans-serif typography and minimal accents",
  isBuiltIn: true,
  format: { type: "A4", width: 210, height: 297 },
  orientation: "portrait",
  colors: {
    primary: "#d4af37",
    background: "#1a1a1a",
    text: "#f5f5f0",
    accent: "#d4af37",
    muted: "#888880",
  },
  fonts: {
    heading: "'Bebas Neue', sans-serif",
    body: "'Montserrat', sans-serif",
  },
  spacing: {
    marginTop: 52,
    marginBottom: 32,
    marginLeft: 40,
    marginRight: 40,
    categoryGap: 44,
    itemGap: 22,
  },
  pageVariants: [
    {
      id: "cover",
      name: "Cover",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: false, showDivider: true },
      body: { columns: 2, categoryStyle: "minimal", itemAlignment: "left", pricePosition: "right", separatorStyle: "line", showDescriptions: false, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "content",
      name: "Menu",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 2, categoryStyle: "minimal", itemAlignment: "left", pricePosition: "right", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: true, position: "bottom", height: 90, marginTop: 16, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const GARDEN_BISTRO_TEMPLATE: MenuTemplate = {
  id: "tpl-garden-bistro",
  name: "Garden Bistro",
  description: "Fresh green-accented layout with handwritten heading and airy spacing",
  isBuiltIn: true,
  format: { type: "DL", width: 99, height: 210 },
  orientation: "portrait",
  colors: {
    primary: "#2d6a4f",
    background: "#f8faf6",
    text: "#1b3a26",
    accent: "#52b788",
    muted: "#74917e",
  },
  fonts: {
    heading: "'Dancing Script', cursive",
    body: "'Nunito Sans', sans-serif",
  },
  spacing: {
    marginTop: 32,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    categoryGap: 28,
    itemGap: 16,
  },
  pageVariants: [
    {
      id: "front",
      name: "Front",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: false, showDivider: true },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "back",
      name: "Back",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: false, showFeaturedBadge: false },
      highlight: { show: true, position: "bottom", height: 60, marginTop: 8, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const PARISIAN_CHIC_TEMPLATE: MenuTemplate = {
  id: "tpl-parisian-chic",
  name: "Parisian Chic",
  description: "Refined French-inspired layout with DM Serif headings and clean structure",
  isBuiltIn: true,
  format: { type: "A5", width: 148, height: 210 },
  orientation: "portrait",
  colors: {
    primary: "#1a1a2e",
    background: "#fefefe",
    text: "#1a1a2e",
    accent: "#c9a96e",
    muted: "#9ca3af",
  },
  fonts: {
    heading: "'DM Serif Display', serif",
    body: "'Poppins', sans-serif",
  },
  spacing: {
    marginTop: 36,
    marginBottom: 20,
    marginLeft: 24,
    marginRight: 24,
    categoryGap: 32,
    itemGap: 18,
  },
  pageVariants: [
    {
      id: "cover",
      name: "Cover",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: true, showDivider: true },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "inline", separatorStyle: "none", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
    {
      id: "content",
      name: "Carte",
      header: { show: false, style: "none", showSubtitle: false, showEstablished: false, showDivider: false },
      body: { columns: 2, categoryStyle: "bold", itemAlignment: "left", pricePosition: "right", separatorStyle: "none", showDescriptions: true, showFeaturedBadge: false },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** All built-in templates */
export const BUILT_IN_TEMPLATES: MenuTemplate[] = [
  LUMIERE_TEMPLATE,
  TRATTORIA_TEMPLATE,
  MODERN_NOIR_TEMPLATE,
  GARDEN_BISTRO_TEMPLATE,
  PARISIAN_CHIC_TEMPLATE,
];
