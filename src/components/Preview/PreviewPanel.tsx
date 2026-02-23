import { useRef, useState, useEffect, useCallback } from "react";
import { Monitor, Tablet, Smartphone, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import MenuPreview from "./MenuPreview";
import type { Viewport } from "../../types/menu";
import { getPaperDimensions, PAGE_MARGIN_PX } from "../../utils/paperDimensions";
import {
  calculatePageBreaks,
  type BlockMeasurement,
} from "../../utils/calculatePageBreaks";

interface ViewportOption {
  id: Viewport;
  label: string;
  icon: LucideIcon;
  width: number;
}

const viewports: ViewportOption[] = [
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1024 },
  { id: "paper", label: "Paper", icon: FileText, width: 794 },
];

export default function PreviewPanel() {
  const { viewport, setViewport, paperFormat, orientation, menuData } = useMenu();
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageStarts, setPageStarts] = useState<number[]>([0]);

  const dims = getPaperDimensions(paperFormat, orientation);
  const isPaper = viewport === "paper";

  const activeViewport = viewports.find((v) => v.id === viewport);
  const viewportWidth = isPaper ? dims.widthPx : activeViewport?.width || 1024;

  const recalcPages = useCallback(() => {
    if (!isPaper || !measureRef.current) {
      setPageStarts([0]);
      return;
    }

    const container = measureRef.current;
    const totalContentHeight = container.scrollHeight;

    const blocks: BlockMeasurement[] = [];

    for (const category of menuData.categories) {
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

    setPageStarts(calculatePageBreaks(blocks, dims.heightPx, totalContentHeight, PAGE_MARGIN_PX));
  }, [isPaper, dims.heightPx, menuData.categories]);

  useEffect(() => {
    recalcPages();

    if (!isPaper || !measureRef.current) return;
    const ro = new ResizeObserver(recalcPages);
    ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, [isPaper, recalcPages]);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <h2 className="text-sm font-semibold text-gray-600">Live Preview</h2>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {viewports.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              title={label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewport === id
                  ? "bg-white text-indigo-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-10 flex justify-center items-start">
        {isPaper ? (
          <div className="flex flex-col items-center gap-10" style={{ maxWidth: "100%" }}>
            {/* Hidden measurement container */}
            <div
              ref={measureRef}
              aria-hidden
              className="absolute overflow-hidden"
              style={{ width: dims.widthPx, left: -9999, top: 0, visibility: "hidden" }}
            >
              <MenuPreview />
            </div>

            {/* Stacked page cards */}
            {pageStarts.map((startOffset, i) => {
              const topMargin = i > 0 ? PAGE_MARGIN_PX : 0;
              const availableHeight = dims.heightPx - topMargin;
              const contentClip =
                i < pageStarts.length - 1
                  ? Math.min(pageStarts[i + 1] - startOffset, availableHeight)
                  : availableHeight;

              return (
                <div
                  key={i}
                  className="bg-[#faf9f6] rounded-sm shadow-lg border border-gray-200 overflow-hidden shrink-0 relative"
                  style={{
                    width: dims.widthPx,
                    height: dims.heightPx,
                    maxWidth: "100%",
                  }}
                >
                  <div style={{ paddingTop: topMargin, height: dims.heightPx, overflow: "hidden" }}>
                    <div style={{ height: contentClip, overflow: "hidden" }}>
                      <div style={{ transform: `translateY(-${startOffset}px)` }}>
                        <MenuPreview />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-3 text-[10px] text-gray-300 font-sans select-none">
                    {i + 1} / {pageStarts.length}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 shrink-0"
            style={{ width: `${viewportWidth}px`, maxWidth: "100%" }}
          >
            <MenuPreview />
          </div>
        )}
      </div>
    </div>
  );
}
