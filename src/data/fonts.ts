/* ── Google Fonts catalog for template editor ────────────────────────── */

export interface FontOption {
  name: string;
  family: string;       // CSS font-family value
  category: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  weights: number[];
  googleUrl?: string;    // Google Fonts CSS import URL (undefined = system font)
}

/** Curated list of popular Google Fonts for restaurant menus */
export const FONT_CATALOG: FontOption[] = [
  // ── System defaults ──
  { name: "System Serif", family: "Georgia, 'Times New Roman', serif", category: "serif", weights: [400, 700] },
  { name: "System Sans", family: "-apple-system, 'Segoe UI', sans-serif", category: "sans-serif", weights: [400, 700] },

  // ── Serif (elegant, classic) ──
  { name: "Playfair Display", family: "'Playfair Display', serif", category: "serif", weights: [400, 500, 600, 700, 800, 900],
    googleUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&display=swap" },
  { name: "Cormorant Garamond", family: "'Cormorant Garamond', serif", category: "serif", weights: [300, 400, 500, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" },
  { name: "Lora", family: "'Lora', serif", category: "serif", weights: [400, 500, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" },
  { name: "Libre Baskerville", family: "'Libre Baskerville', serif", category: "serif", weights: [400, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" },
  { name: "DM Serif Display", family: "'DM Serif Display', serif", category: "serif", weights: [400],
    googleUrl: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" },
  { name: "Merriweather", family: "'Merriweather', serif", category: "serif", weights: [300, 400, 700, 900],
    googleUrl: "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap" },

  // ── Sans-serif (modern, clean) ──
  { name: "Inter", family: "'Inter', sans-serif", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800],
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" },
  { name: "DM Sans", family: "'DM Sans', sans-serif", category: "sans-serif", weights: [400, 500, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap" },
  { name: "Montserrat", family: "'Montserrat', sans-serif", category: "sans-serif", weights: [300, 400, 500, 600, 700, 800],
    googleUrl: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,700&display=swap" },
  { name: "Raleway", family: "'Raleway', sans-serif", category: "sans-serif", weights: [300, 400, 500, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap" },
  { name: "Poppins", family: "'Poppins', sans-serif", category: "sans-serif", weights: [300, 400, 500, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" },
  { name: "Nunito Sans", family: "'Nunito Sans', sans-serif", category: "sans-serif", weights: [300, 400, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&display=swap" },

  // ── Display (statement headings) ──
  { name: "Abril Fatface", family: "'Abril Fatface', serif", category: "display", weights: [400],
    googleUrl: "https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap" },
  { name: "Cinzel", family: "'Cinzel', serif", category: "display", weights: [400, 500, 600, 700, 800, 900],
    googleUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&display=swap" },
  { name: "Bebas Neue", family: "'Bebas Neue', sans-serif", category: "display", weights: [400],
    googleUrl: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },

  // ── Handwriting (casual, artisanal) ──
  { name: "Dancing Script", family: "'Dancing Script', cursive", category: "handwriting", weights: [400, 500, 600, 700],
    googleUrl: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap" },
  { name: "Great Vibes", family: "'Great Vibes', cursive", category: "handwriting", weights: [400],
    googleUrl: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" },
  { name: "Pacifico", family: "'Pacifico', cursive", category: "handwriting", weights: [400],
    googleUrl: "https://fonts.googleapis.com/css2?family=Pacifico&display=swap" },
];

/** Preloaded font URLs — inject <link> tags for these */
const loadedFonts = new Set<string>();

export function loadFont(font: FontOption): void {
  if (!font.googleUrl || loadedFonts.has(font.family)) return;
  loadedFonts.add(font.family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.googleUrl;
  document.head.appendChild(link);
}

/** Load all fonts used by a template */
export function loadTemplateFonts(headingFamily: string, bodyFamily: string): void {
  for (const font of FONT_CATALOG) {
    if (font.family === headingFamily || font.family === bodyFamily) {
      loadFont(font);
    }
  }
}

/** Find FontOption by family string */
export function findFont(family: string): FontOption | undefined {
  return FONT_CATALOG.find((f) => f.family === family);
}

/** Get display name for a font family string */
export function fontDisplayName(family: string): string {
  return findFont(family)?.name ?? family;
}

/** Curated font pairings (heading + body) */
export interface FontPairing {
  name: string;
  heading: string;   // family string
  body: string;      // family string
  vibe: string;      // short description
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    name: "Classic Elegance",
    heading: "'Playfair Display', serif",
    body: "'DM Sans', sans-serif",
    vibe: "Timeless fine dining",
  },
  {
    name: "Modern Minimal",
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    vibe: "Clean contemporary",
  },
  {
    name: "Italian Trattoria",
    heading: "'Cormorant Garamond', serif",
    body: "'Lora', serif",
    vibe: "Warm classic Italian",
  },
  {
    name: "Parisian Bistro",
    heading: "'DM Serif Display', serif",
    body: "'Nunito Sans', sans-serif",
    vibe: "Chic French-inspired",
  },
  {
    name: "Bold Statement",
    heading: "'Bebas Neue', sans-serif",
    body: "'Montserrat', sans-serif",
    vibe: "Strong & modern",
  },
  {
    name: "Rustic Artisan",
    heading: "'Abril Fatface', serif",
    body: "'Raleway', sans-serif",
    vibe: "Artisanal & warm",
  },
  {
    name: "Luxury Gold",
    heading: "'Cinzel', serif",
    body: "'Poppins', sans-serif",
    vibe: "Upscale & refined",
  },
  {
    name: "Garden Café",
    heading: "'Dancing Script', cursive",
    body: "'Nunito Sans', sans-serif",
    vibe: "Casual & inviting",
  },
];
