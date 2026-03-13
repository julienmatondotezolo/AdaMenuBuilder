import type { WebFeaturedSpotlightBlock as WebFeaturedSpotlightBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData } from "../../../types/menu";

interface Props {
  block: WebFeaturedSpotlightBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
}

export default function WebFeaturedSpotlightBlock({ block, menuData, colors, fonts, contentPaddingX, borderRadius }: Props) {
  const featured = menuData.categories
    .flatMap((c) => c.items)
    .filter((i) => i.featured)
    .slice(0, block.maxItems);

  if (featured.length === 0) return null;

  return (
    <div style={{ padding: `0 ${contentPaddingX}px` }}>
      <h3 style={{ fontFamily: fonts.heading, fontSize: 12, fontWeight: 700, color: colors.primary, marginBottom: 12, marginTop: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Featured
      </h3>
      <div
        style={{
          display: block.layout === "grid" ? "grid" : "flex",
          ...(block.layout === "grid"
            ? { gridTemplateColumns: "1fr 1fr", gap: 12 }
            : { gap: 12, overflowX: "auto" }),
        }}
      >
        {featured.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: colors.primary + "10",
              borderRadius,
              padding: 16,
              border: `1px solid ${colors.primary}20`,
              ...(block.layout === "horizontal" ? { minWidth: 200, flex: "0 0 auto" } : {}),
            }}
          >
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: colors.text }}>
              {item.name}
            </div>
            {item.description && (
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 1.4 }}>
                {item.description}
              </div>
            )}
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: colors.price || colors.primary, marginTop: 8 }}>
              €{item.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
