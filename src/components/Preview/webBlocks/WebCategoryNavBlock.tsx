import { useState, useEffect } from "react";
import type { WebCategoryNavBlock as WebCategoryNavBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData } from "../../../types/menu";

interface Props {
  block: WebCategoryNavBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  scrollContainer: HTMLDivElement | null;
}

export default function WebCategoryNavBlock({ block, menuData, colors, fonts, contentPaddingX, scrollContainer }: Props) {
  const categories = menuData.categories;
  const [activeCatId, setActiveCatId] = useState<string>(categories[0]?.id ?? "");

  // Track which category is in view while scrolling
  useEffect(() => {
    if (!scrollContainer) return;
    const handleScroll = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      let closest = categories[0]?.id ?? "";
      let closestDist = Infinity;
      for (const cat of categories) {
        const el = scrollContainer.querySelector(`[data-category-id="${cat.id}"]`) as HTMLElement | null;
        if (!el) continue;
        const dist = Math.abs(el.getBoundingClientRect().top - containerTop - 60);
        if (dist < closestDist) {
          closestDist = dist;
          closest = cat.id;
        }
      }
      setActiveCatId(closest);
    };
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollContainer, categories]);

  const handleClick = (catId: string) => {
    if (!scrollContainer) return;
    const el = scrollContainer.querySelector(`[data-category-id="${catId}"]`) as HTMLElement | null;
    if (!el) return;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const offset = elTop - containerTop + scrollContainer.scrollTop - 50; // 50px offset for sticky nav
    scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
  };

  const baseStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    padding: `12px ${contentPaddingX}px`,
    overflowX: "auto",
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    scrollbarWidth: "none",
    backgroundColor: colors.background,
  };

  const itemStyle = (active: boolean): React.CSSProperties => {
    if (block.style === "pills") {
      return {
        padding: "6px 14px",
        borderRadius: 20,
        backgroundColor: active ? colors.primary : colors.muted + "20",
        color: active ? colors.background : colors.text,
        whiteSpace: "nowrap",
        cursor: "pointer",
        border: "none",
        transition: "all 0.15s",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
      };
    }
    if (block.style === "tabs") {
      return {
        padding: "8px 16px",
        color: active ? colors.primary : colors.muted,
        whiteSpace: "nowrap",
        cursor: "pointer",
        background: "none",
        border: "none",
        borderBottom: `2px solid ${active ? colors.primary : "transparent"}`,
        transition: "all 0.15s",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
      };
    }
    // anchors
    return {
      padding: "6px 0",
      color: active ? colors.primary : colors.muted,
      whiteSpace: "nowrap",
      cursor: "pointer",
      background: "none",
      border: "none",
      textDecoration: active ? "underline" : "none",
      textUnderlineOffset: "4px",
      transition: "all 0.15s",
      fontFamily: "inherit",
      fontSize: "inherit",
      fontWeight: "inherit",
    };
  };

  return (
    <div style={baseStyle}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          style={itemStyle(cat.id === activeCatId)}
          onClick={(e) => { e.stopPropagation(); handleClick(cat.id); }}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
