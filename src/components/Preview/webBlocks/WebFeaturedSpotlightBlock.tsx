import type { WebFeaturedSpotlightBlock as WebFeaturedSpotlightBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData, MenuItem } from "../../../types/menu";
import type { CartItem } from "./WebCartBar";

interface Props {
  block: WebFeaturedSpotlightBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
  orderingEnabled?: boolean;
  cart?: CartItem[];
  onAddToCart?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, delta: number) => void;
}

export default function WebFeaturedSpotlightBlock({ block, menuData, colors, fonts, contentPaddingX, borderRadius, orderingEnabled, cart, onAddToCart, onUpdateQuantity }: Props) {
  const featured = menuData.categories
    .flatMap((c) => c.items)
    .filter((i) => i.featured)
    .slice(0, block.maxItems);

  if (featured.length === 0) return null;

  return (
    <div style={{ padding: `0 ${contentPaddingX}px` }}>
      <h3 style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 12, marginTop: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Top Sellers
      </h3>
      <div
        style={{
          display: block.layout === "grid" ? "grid" : "flex",
          ...(block.layout === "grid"
            ? { gridTemplateColumns: "1fr 1fr", gap: 12 }
            : { gap: 12, overflowX: "auto", scrollbarWidth: "none" as const }),
        }}
      >
        {featured.map((item) => {
          const cartItem = cart?.find((c) => c.id === item.id);
          const qty = cartItem?.quantity || 0;

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: colors.muted + "08",
                borderRadius,
                border: `1px solid ${colors.muted}15`,
                overflow: "hidden",
                ...(block.layout === "horizontal" ? { minWidth: 160, flex: "0 0 auto" } : {}),
              }}
            >
              {/* Placeholder image area */}
              <div style={{
                width: "100%",
                height: 100,
                backgroundColor: colors.muted + "15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.muted + "40"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4, lineHeight: 1.3 }}>
                  {item.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: colors.price || colors.primary }}>
                    €{item.price}
                  </span>
                  {orderingEnabled && cart && onAddToCart && onUpdateQuantity && (
                    qty === 0 ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: borderRadius || 8,
                          backgroundColor: colors.primary,
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        +
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }}
                          style={{ width: 24, height: 24, borderRadius: borderRadius || 8, backgroundColor: colors.muted + "20", color: colors.text, border: `1px solid ${colors.muted}30`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, lineHeight: 1 }}
                        >-</button>
                        <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.text, minWidth: 14, textAlign: "center" }}>{qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }}
                          style={{ width: 24, height: 24, borderRadius: borderRadius || 8, backgroundColor: colors.primary, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, lineHeight: 1 }}
                        >+</button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
