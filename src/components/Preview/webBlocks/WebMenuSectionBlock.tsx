import type { WebMenuSectionBlock as WebMenuSectionBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData, Category, MenuItem } from "../../../types/menu";

interface Props {
  block: WebMenuSectionBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
  searchQuery?: string;
}

function CompactItem({ item, colors, fonts, block }: { item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${colors.muted}20` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>
          {item.name}
          {item.featured && (
            <span style={{ marginLeft: 6, fontSize: 10, color: colors.primary, fontWeight: 600 }}>FEATURED</span>
          )}
        </div>
        {item.description && (
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 1.4 }}>
            {item.description}
          </div>
        )}
      </div>
      {block.pricePosition === "right" && (
        <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.price || colors.primary, marginLeft: 12, whiteSpace: "nowrap" }}>
          €{item.price}
        </span>
      )}
    </div>
  );
}

function CardItem({ item, colors, fonts, block, borderRadius }: { item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType; borderRadius: number }) {
  return (
    <div style={{ backgroundColor: colors.muted + "10", borderRadius, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>
          {item.name}
          {item.featured && (
            <span style={{ marginLeft: 6, fontSize: 10, color: colors.primary, fontWeight: 600 }}>FEATURED</span>
          )}
        </span>
        <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.price || colors.primary, whiteSpace: "nowrap" }}>
          €{item.price}
        </span>
      </div>
      {item.description && (
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 1.4 }}>
          {item.description}
        </div>
      )}
    </div>
  );
}

function DetailedItem({ item, colors, fonts, block }: { item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType }) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${colors.muted}15` }}>
      <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: colors.text }}>
        {item.name}
        {item.featured && (
          <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", borderRadius: 4, backgroundColor: colors.primary + "15", color: colors.primary, fontWeight: 600 }}>
            FEATURED
          </span>
        )}
      </div>
      {item.description && (
        <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 1.5 }}>
          {item.description}
        </div>
      )}
      <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: colors.price || colors.primary, marginTop: 6 }}>
        €{item.price}
      </div>
    </div>
  );
}

function CategoryBlock({ category, block, colors, fonts, borderRadius }: { category: Category; block: WebMenuSectionBlockType; colors: ColorScheme; fonts: FontScheme; borderRadius: number }) {
  return (
    <div data-category-id={category.id}>
      <h3 style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 12, marginTop: 0 }}>
        {category.name}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: block.itemStyle === "card" ? 10 : 0 }}>
        {category.items.map((item) => {
          if (block.itemStyle === "card") return <CardItem key={item.id} item={item} colors={colors} fonts={fonts} block={block} borderRadius={borderRadius} />;
          if (block.itemStyle === "detailed") return <DetailedItem key={item.id} item={item} colors={colors} fonts={fonts} block={block} />;
          return <CompactItem key={item.id} item={item} colors={colors} fonts={fonts} block={block} />;
        })}
      </div>
    </div>
  );
}

export default function WebMenuSectionBlock({ block, menuData, colors, fonts, contentPaddingX, borderRadius, searchQuery }: Props) {
  const q = (searchQuery || "").toLowerCase().trim();

  // Filter categories and items by search query
  const filteredCategories = q
    ? menuData.categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q)
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : menuData.categories;

  if (q && filteredCategories.length === 0) {
    return (
      <div style={{ padding: `16px ${contentPaddingX}px`, textAlign: "center" }}>
        <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }}>
          No items found for "{searchQuery}"
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: `0 ${contentPaddingX}px` }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: block.columns === 2 ? "1fr 1fr" : "1fr",
          gap: 32,
        }}
      >
        {filteredCategories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} block={block} colors={colors} fonts={fonts} borderRadius={borderRadius} />
        ))}
      </div>
    </div>
  );
}
