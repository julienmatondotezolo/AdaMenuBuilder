import type { WebHeroBlock as WebHeroBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData } from "../../../types/menu";

interface Props {
  block: WebHeroBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName?: string;
}

export default function WebHeroBlock({ block, menuData, colors, fonts, templateName }: Props) {
  const displayName = menuData.title || menuData.restaurantName || templateName || "Menu";

  return (
    <div
      style={{
        position: "relative",
        height: block.height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: block.textAlign === "left" ? "flex-start" : block.textAlign === "right" ? "flex-end" : "center",
        padding: "24px 20px",
        overflow: "hidden",
        background: block.backgroundImageUrl
          ? `url(${block.backgroundImageUrl}) center/cover no-repeat`
          : colors.primary,
      }}
    >
      {block.backgroundImageUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0," + block.backgroundOverlayOpacity + ")",
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1, textAlign: block.textAlign }}>
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 700,
            color: block.backgroundImageUrl ? "#ffffff" : colors.background,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </h1>
        {menuData.subtitle && (
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: block.backgroundImageUrl ? "rgba(255,255,255,0.85)" : colors.background + "cc",
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            {menuData.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
