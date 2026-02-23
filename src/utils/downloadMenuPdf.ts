import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import type { Category, PaperFormat, Orientation } from "../types/menu";
import { getPaperDimensions, PAGE_MARGIN_PX } from "./paperDimensions";
import {
  calculatePageBreaks,
  type BlockMeasurement,
} from "./calculatePageBreaks";

const CAPTURE_SCALE = 2;

function measureBlocks(
  container: HTMLElement,
  categories: Category[],
): BlockMeasurement[] {
  const blocks: BlockMeasurement[] = [];

  for (const category of categories) {
    const mode = category.pageBreakMode ?? "category";

    if (mode === "category") {
      const el = container.querySelector<HTMLElement>(
        `[data-category-id="${category.id}"]`,
      );
      if (el) {
        blocks.push({
          top: el.offsetTop,
          height: el.offsetHeight,
          pageBreakBefore: category.pageBreakBefore ?? false,
        });
      }
    } else {
      for (const item of category.items) {
        const el = container.querySelector<HTMLElement>(
          `[data-item-id="${item.id}"]`,
        );
        if (el) {
          blocks.push({
            top: el.offsetTop,
            height: el.offsetHeight,
            pageBreakBefore: item.pageBreakBefore ?? false,
          });
        }
      }
    }
  }

  return blocks;
}

export async function downloadMenuPdf(
  restaurantName: string = "Menu",
  format: PaperFormat = "A4",
  categories: Category[] = [],
  orientation: Orientation = "portrait",
): Promise<void> {
  const source = document.querySelector<HTMLElement>("[data-menu-preview]");
  if (!source) {
    throw new Error("Menu preview element not found");
  }

  const dims = getPaperDimensions(format, orientation);

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.width = `${dims.widthPx}px`;
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  document.body.appendChild(clone);

  try {
    const blocks = measureBlocks(clone, categories);
    const totalContentHeight = clone.scrollHeight;

    const pageStartsPx = calculatePageBreaks(
      blocks,
      dims.heightPx,
      totalContentHeight,
      PAGE_MARGIN_PX,
    );

    const canvas = await html2canvas(clone, {
      useCORS: true,
      scale: CAPTURE_SCALE,
      backgroundColor: "#faf9f6",
      width: dims.widthPx,
    });

    const pageWidthCanvas = dims.widthPx * CAPTURE_SCALE;
    const pageHeightCanvas = dims.heightPx * CAPTURE_SCALE;

    const pdf = new jsPDF({
      unit: "pt",
      format: [dims.widthPt, dims.heightPt],
      orientation,
    });

    const marginScaled = PAGE_MARGIN_PX * CAPTURE_SCALE;

    for (let page = 0; page < pageStartsPx.length; page++) {
      if (page > 0) pdf.addPage();

      const topMargin = page > 0 ? marginScaled : 0;
      const startPxScaled = pageStartsPx[page] * CAPTURE_SCALE;
      const nextStartScaled =
        page < pageStartsPx.length - 1
          ? pageStartsPx[page + 1] * CAPTURE_SCALE
          : canvas.height;
      const availableHeight = pageHeightCanvas - topMargin;
      const contentSlice = Math.min(
        nextStartScaled - startPxScaled,
        availableHeight,
      );

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = pageWidthCanvas;
      pageCanvas.height = pageHeightCanvas;

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.fillStyle = "#faf9f6";
      ctx.fillRect(0, 0, pageWidthCanvas, pageHeightCanvas);

      ctx.drawImage(
        canvas,
        0,
        startPxScaled,
        pageWidthCanvas,
        contentSlice,
        0,
        topMargin,
        pageWidthCanvas,
        contentSlice,
      );

      const imgData = pageCanvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, dims.widthPt, dims.heightPt);
    }

    const safeName = restaurantName.replace(/[^a-zA-Z0-9]+/g, "-");
    pdf.save(`${safeName}-Menu-${format}.pdf`);
  } finally {
    document.body.removeChild(clone);
  }
}
