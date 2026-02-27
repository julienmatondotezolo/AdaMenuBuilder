import { useState, useCallback, useRef } from "react";
import { Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/TextLayer.css";
import { useMenu } from "../../context/MenuContext";
import { usePdfUrl } from "../../hooks/usePdfUrl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionHighlight {
  categoryId: string;
  pageIndex: number;
  /** Distance from page top in native PDF points (scale = 1). */
  yTopPt: number;
  /** Height in native PDF points. */
  heightPt: number;
}

// Matches react-pdf's PageCallback type
interface PageCallbackLike {
  width: number;
  originalWidth: number;
}

// ─── Highlight overlay ────────────────────────────────────────────────────────

interface OverlayProps {
  pageIndex: number;
  highlights: SectionHighlight[];
  scale: number;
}

function HighlightOverlay({ pageIndex: _pageIndex, highlights, scale }: OverlayProps) {
  const { hoveredId, setHover, clearHover } = useMenu();

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {highlights.map((h) => (
        <div
          key={h.categoryId}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: Math.round(h.yTopPt * scale),
            height: Math.round(h.heightPt * scale),
          }}
          className={`pointer-events-auto transition-colors duration-150 cursor-pointer ${
            hoveredId === h.categoryId
              ? "bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/30"
              : "hover:bg-indigo-500/8"
          }`}
          onMouseEnter={() => setHover(h.categoryId, "category")}
          onMouseLeave={() => clearHover(h.categoryId)}
        />
      ))}
    </div>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function PdfViewer() {
  const {
    menuData,
    columnCount,
    layoutDirection,
    orientation,
  } = useMenu();

  const { url, isLoading: isPdfGenerating } = usePdfUrl({
    menuData,
    columnCount,
    layoutDirection,
    orientation,
  });

  const [numPages, setNumPages] = useState(0);
  const [highlights, setHighlights] = useState<SectionHighlight[]>([]);
  // Map from pageIndex → rendered scale (renderedWidth / nativePdfWidth)
  const [pageScales, setPageScales] = useState<Map<number, number>>(new Map());

  // Debounce container-width measurement for the Page width prop
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);

  const onContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    const measure = () =>
      setPageWidth(Math.max(node.clientWidth - 64, 200));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(
    async (pdfDoc: PDFDocumentProxy) => {
      setNumPages(pdfDoc.numPages);
      setHighlights([]);
      setPageScales(new Map());

      const categoryIds = menuData.categories.map((c) => c.id);

      // Fetch all named destinations in one call
      const dests = await pdfDoc.getDestinations();

      const raw: Array<{
        categoryId: string;
        pageIndex: number;
        yFromBottom: number;
      }> = [];

      for (const categoryId of categoryIds) {
        const dest = dests[categoryId];
        if (!Array.isArray(dest) || dest.length < 4) continue;

        const [pageRef, , , yFromBottom] = dest as [
          { num: number; gen: number },
          unknown,
          unknown,
          number,
        ];
        try {
          const pageIndex = await pdfDoc.getPageIndex(pageRef);
          raw.push({ categoryId, pageIndex, yFromBottom: yFromBottom ?? 0 });
        } catch {
          // Named destination has no valid page reference
        }
      }

      // Group by page, sort top-to-bottom (higher yFromBottom = higher on page)
      const byPage = new Map<number, typeof raw>();
      for (const s of raw) {
        if (!byPage.has(s.pageIndex)) byPage.set(s.pageIndex, []);
        byPage.get(s.pageIndex)!.push(s);
      }

      const result: SectionHighlight[] = [];

      for (const [pageIndex, sections] of byPage.entries()) {
        sections.sort((a, b) => b.yFromBottom - a.yFromBottom);

        const page = await pdfDoc.getPage(pageIndex + 1);
        const vp = page.getViewport({ scale: 1 });
        const nativeHeight = vp.height;

        for (let i = 0; i < sections.length; i++) {
          const s = sections[i];
          const yTopPt = nativeHeight - s.yFromBottom;
          const yBottomPt =
            i + 1 < sections.length
              ? nativeHeight - sections[i + 1].yFromBottom
              : nativeHeight;
          result.push({
            categoryId: s.categoryId,
            pageIndex,
            yTopPt,
            heightPt: yBottomPt - yTopPt,
          });
        }
      }

      setHighlights(result);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [menuData.categories],
  );

  const onPageRenderSuccess = useCallback(
    (pageIndex: number, page: PageCallbackLike) => {
      if (!page.originalWidth) return;
      const scale = page.width / page.originalWidth;
      setPageScales((prev) => new Map(prev).set(pageIndex, scale));
    },
    [],
  );

  return (
    <div
      ref={onContainerRef}
      className="h-full overflow-auto bg-gray-100 flex flex-col items-center"
    >
      {/* Generating overlay */}
      {isPdfGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 z-20 pointer-events-none">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-md text-sm text-gray-600">
            <svg className="animate-spin w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Updating PDF…
          </div>
        </div>
      )}

      {url ? (
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-64 text-sm text-gray-400">
              Loading document…
            </div>
          }
          error={
            <div className="flex items-center justify-center h-64 text-sm text-red-400">
              Failed to load PDF.
            </div>
          }
          className="flex flex-col items-center gap-5 py-8 w-full"
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-md shadow-md"
              style={{ width: pageWidth }}
            >
              <Page
                pageIndex={i}
                width={pageWidth}
                renderTextLayer
                renderAnnotationLayer={false}
                onRenderSuccess={(page) =>
                  onPageRenderSuccess(i, page as unknown as PageCallbackLike)
                }
              />
              <HighlightOverlay
                pageIndex={i}
                highlights={highlights.filter((h) => h.pageIndex === i)}
                scale={pageScales.get(i) ?? 1}
              />
            </div>
          ))}
        </Document>
      ) : (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
          Preparing PDF…
        </div>
      )}
    </div>
  );
}
