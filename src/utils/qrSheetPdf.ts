import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";

interface GenerateQrSheetPdfOptions {
  menuId: string;
  menuTitle: string;
  tableCount: number;
  primaryColor: string;
  baseUrl: string;
  /** Localized label for "Table" (without trailing number) */
  tableLabel: string;
  /** Optional — appended to each QR URL for self-documentation. Routing is unaffected. */
  restaurantId?: string;
}

/**
 * Parse a hex color (#rgb or #rrggbb) into 0-1 sRGB channel values.
 * Returns null if the input cannot be parsed.
 */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Approximate relative luminance per WCAG (using a simple gamma-2.2 approximation).
 * Returns a value in [0, 1]. Very light colors will read close to 1.
 */
function getLuminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 0;
  const lin = (v: number) => Math.pow(v, 2.2);
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function pickQrForegroundColor(primaryColor: string): string {
  return getLuminance(primaryColor) > 0.7 ? "#000000" : primaryColor;
}

function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "menu"
  );
}

function truncate(value: string, max = 40): string {
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

/**
 * Compute a 1-page A4-portrait grid based on QR count.
 *  - ≤2 → 1 col
 *  - 3-4 → 2 cols
 *  - 5-9 → 3 cols
 *  - 10+ → 4 cols
 */
function computeColumns(count: number): number {
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * Mount N hidden QRCodeCanvas elements off-screen, capture them as PNGs,
 * unmount, then return the data URLs in table order.
 */
async function renderQrPngs({
  count,
  baseUrl,
  menuId,
  fgColor,
  restaurantId,
}: {
  count: number;
  baseUrl: string;
  menuId: string;
  fgColor: string;
  restaurantId?: string;
}): Promise<string[]> {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.pointerEvents = "none";
  container.style.opacity = "0";
  document.body.appendChild(container);

  const root = createRoot(container);

  // Render a flat list of QR canvases. Each gets a stable data-table attribute
  // so we can find them in DOM order afterwards.
  const qrSize = 512; // high-res source; jsPDF will scale on the page
  try {
    root.render(
      createElement(
        "div",
        null,
        Array.from({ length: count }).map((_, i) =>
          createElement(QRCodeCanvas, {
            key: i,
            value: `${baseUrl}/qr/${menuId}?table=${i + 1}${restaurantId ? `&restaurant=${restaurantId}` : ""}`,
            size: qrSize,
            level: "H",
            fgColor,
            bgColor: "#ffffff",
            includeMargin: false,
            "data-table": String(i + 1),
          } as React.ComponentProps<typeof QRCodeCanvas> & { "data-table": string })
        )
      )
    );

    // Two RAFs + a microtask tick to ensure canvases have painted.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const canvases = Array.from(
      container.querySelectorAll<HTMLCanvasElement>("canvas[data-table]")
    );
    if (canvases.length !== count) {
      throw new Error(
        `QR render incomplete: expected ${count} canvas elements, found ${canvases.length}`
      );
    }
    canvases.sort(
      (a, b) =>
        Number(a.getAttribute("data-table")) -
        Number(b.getAttribute("data-table"))
    );
    return canvases.map((c) => c.toDataURL("image/png"));
  } finally {
    root.unmount();
    container.remove();
  }
}

/**
 * Generate and trigger download of a single A4 portrait PDF with one QR per
 * table arranged on a grid. Each QR is labelled "<tableLabel> N" underneath
 * and the menu title is printed at the top of the sheet.
 */
export async function generateQrSheetPdf({
  menuId,
  menuTitle,
  tableCount,
  primaryColor,
  baseUrl,
  tableLabel,
  restaurantId,
}: GenerateQrSheetPdfOptions): Promise<void> {
  const count = Math.min(Math.max(1, Math.floor(tableCount || 1)), 50);
  const fgColor = pickQrForegroundColor(primaryColor);

  const pngs = await renderQrPngs({ count, baseUrl, menuId, fgColor, restaurantId });

  // A4 portrait in mm: 210 × 297
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginX = 12;
  const marginTop = 16;
  const marginBottom = 12;
  const headerHeight = 14;

  // Max 12 QRs per page. For multi-page sheets, use a 3×4 grid so every
  // page has a consistent layout and QR size.
  const MAX_PER_PAGE = 12;
  const totalPages = Math.ceil(count / MAX_PER_PAGE);
  const truncatedTitle = truncate(menuTitle || "Menu", 40);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const startIdx = page * MAX_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_PER_PAGE, count);
    const pageQrCount = endIdx - startIdx;

    // Header — menu title + page indicator
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(truncatedTitle, pageWidth / 2, marginTop, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const subtitle = totalPages > 1
      ? `${count} ${count === 1 ? "QR" : "QRs"}  ·  Page ${page + 1} / ${totalPages}`
      : `${count} ${count === 1 ? "QR" : "QRs"}`;
    doc.text(subtitle, pageWidth / 2, marginTop + 5, { align: "center" });

    // Single-page sheets use the auto-fit grid (compact for small counts).
    // Multi-page sheets use a fixed 3×4 grid so all pages match.
    const cols = totalPages > 1 ? 3 : computeColumns(pageQrCount);
    const rows = totalPages > 1 ? 4 : Math.ceil(pageQrCount / cols);

    const gridTop = marginTop + headerHeight;
    const gridLeft = marginX;
    const gridWidth = pageWidth - marginX * 2;
    const gridHeight = pageHeight - gridTop - marginBottom;

    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;

    const labelHeight = 7;
    const cellPadding = 4;
    const qrSize = Math.max(
      20,
      Math.min(cellW - cellPadding * 2, cellH - labelHeight - cellPadding * 2)
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);

    for (let i = startIdx; i < endIdx; i++) {
      const localIdx = i - startIdx;
      const col = localIdx % cols;
      const row = Math.floor(localIdx / cols);
      const cellX = gridLeft + col * cellW;
      const cellY = gridTop + row * cellH;

      const qrX = cellX + (cellW - qrSize) / 2;
      const qrY = cellY + cellPadding;

      doc.addImage(pngs[i], "PNG", qrX, qrY, qrSize, qrSize, undefined, "FAST");

      const labelY = qrY + qrSize + labelHeight - 1.5;
      doc.text(`${tableLabel} ${i + 1}`, cellX + cellW / 2, labelY, {
        align: "center",
      });
    }
  }

  const fileName = `${sanitizeFilename(menuTitle || "menu")}-qr-sheet.pdf`;
  doc.save(fileName);
}
