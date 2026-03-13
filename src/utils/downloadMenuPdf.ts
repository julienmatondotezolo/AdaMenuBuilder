import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Capture each [data-menu-preview] page from the DOM at high resolution,
 * then assemble them into a multi-page PDF that matches the on-screen preview.
 */
export async function downloadMenuPdf(
  fileName: string = "Menu",
): Promise<void> {
  const pageElements = document.querySelectorAll<HTMLElement>("[data-menu-preview]");
  if (pageElements.length === 0) {
    throw new Error("No preview pages found in the DOM");
  }

  const pixelRatio = 3; // 3x for high quality print
  let doc: jsPDF | null = null;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];

    // Temporarily strip UI-only styles for a clean capture
    const prevBorder = el.style.border;
    const prevBoxShadow = el.style.boxShadow;
    const prevBorderRadius = el.style.borderRadius;
    el.style.border = "none";
    el.style.boxShadow = "none";
    el.style.borderRadius = "0";

    // Remove selected/hovered item highlights
    const highlighted = el.querySelectorAll<HTMLElement>(
      ".preview-item-selected, .preview-item-hovered, [class*='drag-']"
    );
    const origClasses = Array.from(highlighted).map((n) => n.className);
    highlighted.forEach((n) => {
      n.className = n.className
        .replace(/preview-item-selected/g, "")
        .replace(/preview-item-hovered/g, "")
        .replace(/drag-\S+/g, "");
    });

    let dataUrl: string;
    try {
      dataUrl = await toPng(el, {
        pixelRatio,
        cacheBust: true,
        filter: (node: HTMLElement) => {
          // Filter out the active page outline overlay
          if (
            node instanceof HTMLElement &&
            node.classList?.contains("pointer-events-none") &&
            node.style?.outline
          ) {
            return false;
          }
          return true;
        },
      });
    } finally {
      // Restore original styles
      el.style.border = prevBorder;
      el.style.boxShadow = prevBoxShadow;
      el.style.borderRadius = prevBorderRadius;
      highlighted.forEach((n, idx) => {
        n.className = origClasses[idx];
      });
    }

    // Page dimensions in points (1px ≈ 0.75pt at 96dpi)
    const widthPt = el.offsetWidth * 0.75;
    const heightPt = el.offsetHeight * 0.75;

    if (i === 0) {
      doc = new jsPDF({
        orientation: widthPt > heightPt ? "landscape" : "portrait",
        unit: "pt",
        format: [widthPt, heightPt],
      });
    } else {
      doc!.addPage([widthPt, heightPt], widthPt > heightPt ? "landscape" : "portrait");
    }

    doc!.addImage(dataUrl, "PNG", 0, 0, widthPt, heightPt, undefined, "FAST");
  }

  if (doc) {
    const safeName = fileName.replace(/[^a-zA-Z0-9\s]+/g, "-").trim() || "Menu";
    doc.save(`${safeName}.pdf`);
  }
}
