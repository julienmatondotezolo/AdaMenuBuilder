import { uid } from "../utils/uid";
import type { WebLayout } from "../types/template";

export function createDefaultWebLayout(mode: "mobile" | "desktop"): WebLayout {
  return {
    blocks: [
      {
        id: `wb-${uid()}`,
        type: "hero",
        height: mode === "desktop" ? 260 : 200,
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
        columns: mode === "desktop" ? 2 : 1,
        itemStyle: mode === "desktop" ? "card" : "compact",
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
      sectionGap: mode === "desktop" ? 32 : 24,
      contentPaddingX: mode === "desktop" ? 32 : 16,
      contentMaxWidth: mode === "desktop" ? 1024 : 640,
    },
    borderRadius: 8,
    showScrollbar: false,
  };
}
