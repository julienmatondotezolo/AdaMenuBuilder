import type { ColorScheme, FontScheme } from "../../../types/template";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  cart: CartItem[];
  colors: ColorScheme;
  fonts: FontScheme;
  currency: string;
  borderRadius: number;
  contentPaddingX: number;
  onViewCart: () => void;
}

export default function WebCartBar({ cart, colors, fonts, currency, borderRadius, contentPaddingX, onViewCart }: Props) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (totalItems === 0) return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `12px ${contentPaddingX}px`,
        paddingBottom: 20,
        zIndex: 30,
        backgroundColor: colors.background,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onViewCart(); }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          backgroundColor: colors.primary,
          color: "#fff",
          border: "none",
          borderRadius: borderRadius || 12,
          cursor: "pointer",
          fontFamily: fonts.body,
          boxShadow: "0 -2px 16px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Cart icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            View Cart ({totalItems})
          </span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700 }}>
          {currency}{totalPrice.toFixed(2)}
        </span>
      </button>
    </div>
  );
}
