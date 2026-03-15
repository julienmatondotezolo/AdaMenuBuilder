import type { WebSearchBlock as WebSearchBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";

interface Props {
  block: WebSearchBlockType;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  t?: (key: string) => string;
}

export default function WebSearchBlock({ block, colors, fonts, contentPaddingX, borderRadius, searchQuery, onSearchChange, t }: Props) {
  return (
    <div style={{ padding: `0 ${contentPaddingX}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius,
          backgroundColor: colors.muted + "15",
          border: `1px solid ${colors.muted}25`,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.muted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={(t ? t("qrMenu.searchMenu") : null) || block.placeholder || "Search menu..."}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.text,
          }}
        />
        {searchQuery && (
          <button
            onClick={(e) => { e.stopPropagation(); onSearchChange(""); }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
