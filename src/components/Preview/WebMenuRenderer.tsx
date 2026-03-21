import { useRef, useState, useEffect, useCallback } from "react";
import type { WebLayout, WebBlock, ColorScheme, FontScheme, QrOrderConfig } from "../../types/template";
import type { MenuData, MenuItem } from "../../types/menu";
import WebHeroBlock from "./webBlocks/WebHeroBlock";
import WebCategoryNavBlock from "./webBlocks/WebCategoryNavBlock";
import WebMenuSectionBlock from "./webBlocks/WebMenuSectionBlock";
import WebFeaturedSpotlightBlock from "./webBlocks/WebFeaturedSpotlightBlock";
import WebImageBannerBlock from "./webBlocks/WebImageBannerBlock";
import WebInfoBarBlock from "./webBlocks/WebInfoBarBlock";
import WebSearchBlock from "./webBlocks/WebSearchBlock";
import WebFooterBlock from "./webBlocks/WebFooterBlock";
import WebCartBar, { type CartItem } from "./webBlocks/WebCartBar";
import WebCartView from "./webBlocks/WebCartView";
import WebLanguageSwitcher from "./webBlocks/WebLanguageSwitcher";
import { loadTemplateFonts } from "../../data/fonts";

interface Props {
  webLayout: WebLayout;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName?: string;
  mode?: "mobile" | "desktop";
  qrOrderConfig?: QrOrderConfig;
  menuId?: string;
  restaurantId?: string;
  tableNumber?: string;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
  fullscreen?: boolean;
  t?: (key: string) => string;
}

function RenderBlock({
  block,
  menuData,
  colors,
  fonts,
  spacing,
  borderRadius,
  scrollContainer,
  templateName,
  searchQuery,
  onSearchChange,
  orderingEnabled,
  cart,
  onAddToCart,
  onUpdateQuantity,
  t,
}: {
  block: WebBlock;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  spacing: WebLayout["spacing"];
  borderRadius: number;
  scrollContainer: HTMLDivElement | null;
  templateName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  orderingEnabled: boolean;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  t?: (key: string) => string;
}) {
  switch (block.type) {
    case "hero":
      return <WebHeroBlock block={block} menuData={menuData} colors={colors} fonts={fonts} templateName={templateName} />;
    case "category-nav":
      return <WebCategoryNavBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} scrollContainer={scrollContainer} />;
    case "menu-section":
      return <WebMenuSectionBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} searchQuery={searchQuery} orderingEnabled={orderingEnabled} cart={cart} onAddToCart={onAddToCart} onUpdateQuantity={onUpdateQuantity} t={t} />;
    case "featured-spotlight":
      return <WebFeaturedSpotlightBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} orderingEnabled={orderingEnabled} cart={cart} onAddToCart={onAddToCart} onUpdateQuantity={onUpdateQuantity} />;
    case "image-banner":
      return <WebImageBannerBlock block={block} colors={colors} />;
    case "info-bar":
      return <WebInfoBarBlock block={block} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    case "search":
      return <WebSearchBlock block={block} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} borderRadius={borderRadius} searchQuery={searchQuery} onSearchChange={onSearchChange} t={t} />;
    case "footer":
      return <WebFooterBlock block={block} menuData={menuData} colors={colors} fonts={fonts} contentPaddingX={spacing.contentPaddingX} />;
    default:
      return null;
  }
}

export default function WebMenuRenderer({ webLayout, menuData, colors, fonts, templateName, mode, qrOrderConfig, menuId, restaurantId, tableNumber, selectedBlockId, onSelectBlock, fullscreen, t }: Props) {
  const { blocks, spacing, borderRadius } = webLayout;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(() => {
    // Auto-open cart if there's an active (non-completed) order in localStorage
    try {
      const raw = localStorage.getItem("adakds_active_order");
      if (raw) {
        const order = JSON.parse(raw);
        if (order.menuId === menuId && order.tableNumber === tableNumber
            && order.kdsStatus !== "completed"
            && Date.now() - order.placedAt < 4 * 60 * 60 * 1000) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  const orderingEnabled = qrOrderConfig?.enabled ?? false;
  const currency = qrOrderConfig?.currency ?? "€";

  // Load template fonts (for public pages like embed/QR that don't go through the editor)
  useEffect(() => {
    loadTemplateFonts(fonts.heading, fonts.body);
  }, [fonts.heading, fonts.body]);

  useEffect(() => {
    setScrollContainer(scrollRef.current);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 200);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => c.id === itemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0);
    });
  }, []);

  const handleViewCart = useCallback(() => {
    setShowCart(true);
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const hasStickyNav = blocks.some((b) => b.type === "category-nav" && b.sticky);

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: showCart ? "hidden" : "auto",
        overflowX: "hidden",
        backgroundColor: colors.background,
        position: "relative",
        WebkitOverflowScrolling: "touch",
        ...(webLayout.showScrollbar ? {} : { scrollbarWidth: "none" as const }),
      }}
    >
      {hasStickyNav && (
        <style>{`.web-menu-sticky-nav { position: -webkit-sticky; position: sticky; top: 0; z-index: 10; }`}</style>
      )}
      {/* Cart view overlay */}
      {showCart && orderingEnabled && qrOrderConfig && (
        <WebCartView
          cart={cart}
          colors={colors}
          fonts={fonts}
          qrOrderConfig={qrOrderConfig}
          borderRadius={borderRadius}
          contentPaddingX={spacing.contentPaddingX}
          onUpdateQuantity={handleUpdateQuantity}
          onClose={() => setShowCart(false)}
          onClearCart={handleClearCart}
          menuId={menuId}
          restaurantId={restaurantId}
          tableNumber={tableNumber}
          fullscreen={fullscreen}
          t={t}
        />
      )}
      <div
        style={{
          maxWidth: mode === "desktop" ? "100%" : spacing.contentMaxWidth,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: spacing.sectionGap,
          paddingBottom: orderingEnabled && cart.length > 0 ? 80 : undefined,
        }}
      >
        {blocks.map((block) => {
          const isSticky = block.type === "category-nav" && block.sticky;
          return (
          <div
            key={block.id}
            className={isSticky ? "web-menu-sticky-nav" : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock?.(block.id);
            }}
            style={{
              backgroundColor: isSticky ? colors.background : undefined,
              cursor: onSelectBlock ? "pointer" : "default",
              outline: selectedBlockId === block.id ? `2px solid ${colors.primary}` : "none",
              outlineOffset: -2,
              borderRadius: selectedBlockId === block.id ? 4 : 0,
              transition: "outline 0.15s",
            }}
          >
            <RenderBlock
              block={block}
              menuData={menuData}
              colors={colors}
              fonts={fonts}
              spacing={spacing}
              borderRadius={borderRadius}
              scrollContainer={scrollContainer}
              templateName={templateName}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              orderingEnabled={orderingEnabled}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              t={t}
            />
          </div>
          );
        })}
      </div>

      {/* Language switcher — only in fullscreen (QR/embed) */}
      {t && (
        <WebLanguageSwitcher
          colors={colors}
          fonts={fonts}
          contentPaddingX={spacing.contentPaddingX}
          t={t}
        />
      )}

      {/* Cart bottom bar */}
      {orderingEnabled && (
        <WebCartBar
          cart={cart}
          colors={colors}
          fonts={fonts}
          currency={currency}
          borderRadius={borderRadius}
          contentPaddingX={spacing.contentPaddingX}
          onViewCart={handleViewCart}
          t={t}
        />
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={(e) => { e.stopPropagation(); scrollToTop(); }}
          style={{
            position: "fixed",
            bottom: orderingEnabled && cart.length > 0 ? `calc(80px + env(safe-area-inset-bottom, 0px))` : 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.primary,
            color: colors.background,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            transition: "opacity 0.2s",
            zIndex: 20,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
