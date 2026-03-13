import type { WebSearchBlock as WebSearchBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";

interface Props {
  block: WebSearchBlockType;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
}

export default function WebSearchBlock({ block, colors, fonts, contentPaddingX, borderRadius }: Props) {
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
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.muted,
          }}
        >
          {block.placeholder || "Search menu..."}
        </span>
      </div>
    </div>
  );
}
