import type { WebInfoBarBlock as WebInfoBarBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";

interface Props {
  block: WebInfoBarBlockType;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
}

const ICON_MAP: Record<string, string> = {
  clock: "🕐",
  phone: "📞",
  location: "📍",
  wifi: "📶",
  info: "ℹ️",
  star: "⭐",
};

export default function WebInfoBarBlock({ block, colors, fonts, contentPaddingX }: Props) {
  if (block.items.length === 0) return null;

  return (
    <div
      style={{
        padding: `12px ${contentPaddingX}px`,
        display: "flex",
        flexDirection: block.layout === "column" ? "column" : "row",
        flexWrap: "wrap",
        gap: block.layout === "column" ? 8 : 16,
        justifyContent: "center",
      }}
    >
      {block.items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: fonts.body,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          <span>{ICON_MAP[item.icon] || "•"}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
