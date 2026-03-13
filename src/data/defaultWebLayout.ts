import { uid } from "../utils/uid";
import type { WebLayout } from "../types/template";

export function createDefaultWebLayout(): WebLayout {
  return {
    blocks: [
      {
        id: `wb-${uid()}`,
        type: "hero",
        height: 200,
        textAlign: "center",
        backgroundOverlayOpacity: 0.4,
      },
      {
        id: `wb-${uid()}`,
        type: "category-nav",
        style: "pills",
        sticky: true,
      },
      {
        id: `wb-${uid()}`,
        type: "menu-section",
        columns: 1,
        itemStyle: "compact",
        pricePosition: "right",
      },
      {
        id: `wb-${uid()}`,
        type: "footer",
        showAddress: true,
        showPhone: true,
        customText: "",
      },
    ],
    spacing: {
      sectionGap: 24,
      contentPaddingX: 16,
      contentMaxWidth: 640,
    },
    borderRadius: 8,
    showScrollbar: false,
  };
}
