export interface BlockMeasurement {
  top: number;
  height: number;
  pageBreakBefore: boolean;
}

/**
 * Given a list of measured content blocks and the available page height,
 * returns an array of pixel offsets where each page starts.
 *
 * A new page is started when:
 *  - A block would be cut by the current page bottom (overflow)
 *  - A block has `pageBreakBefore` set (explicit break)
 *
 * Blocks taller than a single page are allowed to occupy the full page
 * without triggering an infinite loop of breaks.
 *
 * `pageMargin` reserves space at the top of every page after the first,
 * reducing the usable content area on those pages.
 */
export function calculatePageBreaks(
  blocks: BlockMeasurement[],
  pageHeight: number,
  totalContentHeight: number,
  pageMargin: number = 0,
): number[] {
  if (blocks.length === 0) return [0];

  const pageStarts: number[] = [0];

  for (const block of blocks) {
    const currentPageStart = pageStarts[pageStarts.length - 1];
    const isFirstPage = pageStarts.length === 1;
    const effectiveHeight = isFirstPage ? pageHeight : pageHeight - pageMargin;
    const currentPageBottom = currentPageStart + effectiveHeight;
    const blockBottom = block.top + block.height;

    if (block.pageBreakBefore && block.top > currentPageStart) {
      pageStarts.push(block.top);
      continue;
    }

    if (blockBottom > currentPageBottom && block.top > currentPageStart) {
      pageStarts.push(block.top);
    }
  }

  return pageStarts;
}

/**
 * Derive per-page heights from page-start offsets.
 * Each page extends from its start to the next page's start (or total
 * content height for the last page).
 */
export function pageHeightsFromBreaks(
  pageStarts: number[],
  pageHeight: number,
  totalContentHeight: number,
): number[] {
  return pageStarts.map((start, i) => {
    const nextStart =
      i < pageStarts.length - 1 ? pageStarts[i + 1] : totalContentHeight;
    return Math.min(nextStart - start, pageHeight);
  });
}
