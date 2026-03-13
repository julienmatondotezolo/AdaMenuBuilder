import type { WebCategoryNavBlock as WebCategoryNavBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData } from "../../../types/menu";

interface Props {
  block: WebCategoryNavBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
}

export default function WebCategoryNavBlock({ block, menuData, colors, fonts, contentPaddingX }: Props) {
  const categories = menuData.categories;

  const baseStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    padding: `12px ${contentPaddingX}px`,
    overflowX: "auto",
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    ...(block.sticky ? { position: "sticky" as const, top: 0, zIndex: 10, backgroundColor: colors.background } : {}),
  };

  const pillStyle = (active: boolean): React.CSSProperties => {
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
      };
    }
    if (block.style === "tabs") {
      return {
        padding: "8px 16px",
        borderBottom: active ? `2px solid ${colors.primary}` : "2px solid transparent",
        color: active ? colors.primary : colors.muted,
        whiteSpace: "nowrap",
        cursor: "pointer",
        background: "none",
        border: "none",
        borderBottomStyle: "solid",
        borderBottomWidth: 2,
        borderBottomColor: active ? colors.primary : "transparent",
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
    };
  };

  return (
    <div style={baseStyle}>
      {categories.map((cat, i) => (
        <button key={cat.id} style={pillStyle(i === 0)}>
          {cat.name}
        </button>
      ))}
    </div>
  );
}
