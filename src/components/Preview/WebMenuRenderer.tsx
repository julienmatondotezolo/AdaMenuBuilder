import { useRef, useState, useEffect } from "react";
import type { WebLayout, WebBlock, ColorScheme, FontScheme } from "../../types/template";
import type { MenuData } from "../../types/menu";
import WebHeroBlock from "./webBlocks/WebHeroBlock";
import WebCategoryNavBlock from "./webBlocks/WebCategoryNavBlock";
import WebMenuSectionBlock from "./webBlocks/WebMenuSectionBlock";
import WebFeaturedSpotlightBlock from "./webBlocks/WebFeaturedSpotlightBlock";
import WebImageBannerBlock from "./webBlocks/WebImageBannerBlock";
import WebInfoBarBlock from "./webBlocks/WebInfoBarBlock";
import WebSearchBlock from "./webBlocks/WebSearchBlock";
import WebFooterBlock from "./webBlocks/WebFooterBlock";

interface Props {
  webLayout: WebLayout;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName?: string;
  mode?: "mobile" | "desktop";
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
}

function RenderBlock({
  block,
  menuData,
  colors,
  fonts,
  spacing,
  borderRadius,
  scrollContainer,
  templateName,
}: {
  block: WebBlock;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  spacing: WebLayout["spacing"];
  borderRadius: number;
  scrollContainer: HTMLDivElement | null;
  templateName?: string;
}) {
  switch (block.type) {
    case "hero":
      return <WebHeroBlock block={block} menuData={menuData} colors={colors} fonts={fonts} templateName={templateName} />;
    case "category-nav":
      return <WebCategoryNavBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} scrollContainer={scrollContainer} />;
    case "menu-section":
      return <WebMenuSectionBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} />;
    case "featured-spotlight":
      return <WebFeaturedSpotlightBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} />;
    case "image-banner":
      return <WebImageBannerBlock block={block} colors={colors} />;
    case "info-bar":
      return <WebInfoBarBlock block={block} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    case "search":
      return <WebSearchBlock block={block} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} />;
    case "footer":
      return <WebFooterBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    default:
      return null;
  }
}

export default function WebMenuRenderer({ webLayout, menuData, colors, fonts, templateName, mode, selectedBlockId, onSelectBlock }: Props) {
  const { blocks, spacing, borderRadius } = webLayout;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 200);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: colors.background,
        position: "relative",
        ...(webLayout.showScrollbar ? {} : { scrollbarWidth: "none" as const }),
      }}
    >
      <div
        style={{
          maxWidth: mode === "desktop" ? "100%" : spacing.contentMaxWidth,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: spacing.sectionGap,
        }}
      >
        {blocks.map((block) => {
          const isSticky = block.type === "category-nav" && block.sticky;
          return (
          <div
            key={block.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock?.(block.id);
            }}
            style={{
              position: isSticky ? "sticky" : "relative",
              top: isSticky ? 0 : undefined,
              zIndex: isSticky ? 10 : undefined,
              backgroundColor: isSticky ? colors.background : undefined,
              cursor: onSelectBlock ? "pointer" : "default",
              outline: selectedBlockId === block.id ? `2px solid ${colors.primary}` : "none",
              outlineOffset: -2,
              borderRadius: selectedBlockId === block.id ? 4 : 0,
              transition: "outline 0.15s",
            }}
          >
            <RenderBlock
              block={block}
              menuData={menuData}
              colors={colors}
              fonts={fonts}
              spacing={spacing}
              borderRadius={borderRadius}
              scrollContainer={scrollRef.current}
              templateName={templateName}
            />
          </div>
          );
        })}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={(e) => { e.stopPropagation(); scrollToTop(); }}
          style={{
            position: "sticky",
            bottom: 16,
            float: "right",
            marginRight: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.primary,
            color: colors.background,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            transition: "opacity 0.2s",
            zIndex: 20,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
