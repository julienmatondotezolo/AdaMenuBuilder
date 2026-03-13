import type { WebLayout, WebBlock, ColorScheme, FontScheme } from "../../types/template";
import type { MenuData } from "../../types/menu";
import WebHeroBlock from "./webBlocks/WebHeroBlock";
import WebCategoryNavBlock from "./webBlocks/WebCategoryNavBlock";
import WebMenuSectionBlock from "./webBlocks/WebMenuSectionBlock";
import WebFeaturedSpotlightBlock from "./webBlocks/WebFeaturedSpotlightBlock";
import WebImageBannerBlock from "./webBlocks/WebImageBannerBlock";
import WebInfoBarBlock from "./webBlocks/WebInfoBarBlock";
import WebFooterBlock from "./webBlocks/WebFooterBlock";

interface Props {
  webLayout: WebLayout;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
}

function renderBlock(
  block: WebBlock,
  menuData: MenuData,
  colors: ColorScheme,
  fonts: FontScheme,
  spacing: WebLayout["spacing"],
  borderRadius: number,
) {
  switch (block.type) {
    case "hero":
      return <WebHeroBlock block={block} menuData={menuData} colors={colors} fonts={fonts} />;
    case "category-nav":
      return <WebCategoryNavBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    case "menu-section":
      return <WebMenuSectionBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} />;
    case "featured-spotlight":
      return <WebFeaturedSpotlightBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} />;
    case "image-banner":
      return <WebImageBannerBlock block={block} colors={colors} />;
    case "info-bar":
      return <WebInfoBarBlock block={block} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    case "footer":
      return <WebFooterBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    default:
      return null;
  }
}

export default function WebMenuRenderer({ webLayout, menuData, colors, fonts, selectedBlockId, onSelectBlock }: Props) {
  const { blocks, spacing, borderRadius } = webLayout;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: colors.background,
        ...(webLayout.showScrollbar ? {} : { scrollbarWidth: "none" as const }),
      }}
    >
      <div
        style={{
          maxWidth: spacing.contentMaxWidth,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: spacing.sectionGap,
        }}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock?.(block.id);
            }}
            style={{
              position: "relative",
              cursor: onSelectBlock ? "pointer" : "default",
              outline: selectedBlockId === block.id ? `2px solid ${colors.primary}` : "none",
              outlineOffset: -2,
              borderRadius: selectedBlockId === block.id ? 4 : 0,
              transition: "outline 0.15s",
            }}
          >
            {renderBlock(block, menuData, colors, fonts, spacing, borderRadius)}
          </div>
        ))}
      </div>
    </div>
  );
}
