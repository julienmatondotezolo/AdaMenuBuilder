import type { WebMenuSectionBlock as WebMenuSectionBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData, Category, MenuItem } from "../../../types/menu";
import type { CartItem } from "./WebCartBar";

interface Props {
  block: WebMenuSectionBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  borderRadius: number;
  searchQuery?: string;
  orderingEnabled?: boolean;
  cart?: CartItem[];
  onAddToCart?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, delta: number) => void;
}

function QuantityControls({ item, cart, colors, fonts, borderRadius, onAdd, onUpdate }: {
  item: MenuItem;
  cart: CartItem[];
  colors: ColorScheme;
  fonts: FontScheme;
  borderRadius: number;
  onAdd: () => void;
  onUpdate: (delta: number) => void;
}) {
  const cartItem = cart.find((c) => c.id === item.id);
  const qty = cartItem?.quantity || 0;

  if (qty === 0) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        style={{
          width: 30,
          height: 30,
          borderRadius: borderRadius || 8,
          backgroundColor: colors.primary,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        +
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate(-1); }}
        style={{
          width: 28,
          height: 28,
          borderRadius: borderRadius || 8,
          backgroundColor: colors.muted + "20",
          color: colors.text,
          border: `1px solid ${colors.muted}30`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        -
      </button>
      <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text, minWidth: 18, textAlign: "center" }}>
        {qty}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate(1); }}
        style={{
          width: 28,
          height: 28,
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
    </div>
  );
}

function CompactItem({ item, colors, fonts, block, borderRadius, orderingEnabled, cart, onAdd, onUpdate }: {
  item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType; borderRadius: number;
  orderingEnabled?: boolean; cart?: CartItem[]; onAdd?: () => void; onUpdate?: (delta: number) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${colors.muted}20`, gap: 12 }}>
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
        {block.pricePosition !== "right" && (
          <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.price || colors.primary, marginTop: 4 }}>
            €{item.price}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {block.pricePosition === "right" && (
          <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.price || colors.primary, whiteSpace: "nowrap" }}>
            €{item.price}
          </span>
        )}
        {orderingEnabled && cart && onAdd && onUpdate && (
          <QuantityControls item={item} cart={cart} colors={colors} fonts={fonts} borderRadius={borderRadius} onAdd={onAdd} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

function CardItem({ item, colors, fonts, block, borderRadius, orderingEnabled, cart, onAdd, onUpdate }: {
  item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType; borderRadius: number;
  orderingEnabled?: boolean; cart?: CartItem[]; onAdd?: () => void; onUpdate?: (delta: number) => void;
}) {
  return (
    <div style={{ backgroundColor: colors.muted + "10", borderRadius, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0 }}>
          {item.name}
          {item.featured && (
            <span style={{ marginLeft: 6, fontSize: 10, color: colors.primary, fontWeight: 600 }}>FEATURED</span>
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.price || colors.primary, whiteSpace: "nowrap" }}>
            €{item.price}
          </span>
          {orderingEnabled && cart && onAdd && onUpdate && (
            <QuantityControls item={item} cart={cart} colors={colors} fonts={fonts} borderRadius={borderRadius} onAdd={onAdd} onUpdate={onUpdate} />
          )}
        </div>
      </div>
      {item.description && (
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 1.4 }}>
          {item.description}
        </div>
      )}
    </div>
  );
}

function DetailedItem({ item, colors, fonts, block, borderRadius, orderingEnabled, cart, onAdd, onUpdate }: {
  item: MenuItem; colors: ColorScheme; fonts: FontScheme; block: WebMenuSectionBlockType; borderRadius: number;
  orderingEnabled?: boolean; cart?: CartItem[]; onAdd?: () => void; onUpdate?: (delta: number) => void;
}) {
  return (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${colors.muted}15` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        {orderingEnabled && cart && onAdd && onUpdate && (
          <div style={{ marginLeft: 12, flexShrink: 0 }}>
            <QuantityControls item={item} cart={cart} colors={colors} fonts={fonts} borderRadius={borderRadius} onAdd={onAdd} onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryBlock({ category, block, colors, fonts, borderRadius, orderingEnabled, cart, onAddToCart, onUpdateQuantity }: {
  category: Category; block: WebMenuSectionBlockType; colors: ColorScheme; fonts: FontScheme; borderRadius: number;
  orderingEnabled?: boolean; cart?: CartItem[]; onAddToCart?: (item: MenuItem) => void; onUpdateQuantity?: (itemId: string, delta: number) => void;
}) {
  return (
    <div data-category-id={category.id}>
      <h3 style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 12, marginTop: 0 }}>
        {category.name}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: block.itemStyle === "card" ? 10 : 0 }}>
        {category.items.map((item) => {
          const itemProps = {
            item,
            colors,
            fonts,
            block,
            borderRadius,
            orderingEnabled,
            cart,
            onAdd: () => onAddToCart?.(item),
            onUpdate: (delta: number) => onUpdateQuantity?.(item.id, delta),
          };
          if (block.itemStyle === "card") return <CardItem key={item.id} {...itemProps} />;
          if (block.itemStyle === "detailed") return <DetailedItem key={item.id} {...itemProps} />;
          return <CompactItem key={item.id} {...itemProps} />;
        })}
      </div>
    </div>
  );
}

export default function WebMenuSectionBlock({ block, menuData, colors, fonts, contentPaddingX, borderRadius, searchQuery, orderingEnabled, cart, onAddToCart, onUpdateQuantity }: Props) {
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
          <CategoryBlock
            key={cat.id}
            category={cat}
            block={block}
            colors={colors}
            fonts={fonts}
            borderRadius={borderRadius}
            orderingEnabled={orderingEnabled}
            cart={cart}
            onAddToCart={onAddToCart}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>
    </div>
  );
}
