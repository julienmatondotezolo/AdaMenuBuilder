import { useEffect } from "react";
import { useMenu } from "../../context/MenuContext";
import type { MenuTemplate } from "../../types/template";
import { loadTemplateFonts } from "../../data/fonts";

interface MenuPreviewProps {
  template?: MenuTemplate;
}

export default function MenuPreview({ template }: MenuPreviewProps) {
  const { menuData, hoveredId, setHover, clearHover, dragState, columnCount, layoutDirection, selectedItemId, selectItem } = useMenu();

  // Load template fonts
  useEffect(() => {
    if (template) {
      loadTemplateFonts(template.fonts.heading, template.fonts.body);
    }
  }, [template?.fonts.heading, template?.fonts.body]);

  const isActiveDrag = dragState.activeId !== null;

  // Template-derived styles (fallback to defaults if no template)
  const colors = template?.colors ?? {
    primary: "hsl(232 80% 62%)",
    background: "#ffffff",
    text: "hsl(224 71% 4%)",
    accent: "hsl(232 80% 62%)",
    muted: "hsl(220 9% 46%)",
  };
  const fonts = template?.fonts ?? { heading: "serif", body: "sans-serif" };
  const spacing = template?.spacing ?? {
    marginTop: 48, marginBottom: 24, marginLeft: 32, marginRight: 32, categoryGap: 40, itemGap: 24,
  };

  // Use first page variant with header enabled, or first variant overall
  const variant = template?.pageVariants.find(v => v.header.show) ?? template?.pageVariants[0];
  const headerConfig = variant?.header ?? { show: true, style: "centered" as const, showSubtitle: true, showEstablished: true, showDivider: true };
  const bodyConfig = variant?.body ?? { columns: 1, categoryStyle: "lines" as const, itemAlignment: "center" as const, pricePosition: "below" as const, separatorStyle: "line" as const, showDescriptions: true, showFeaturedBadge: true };
  const highlightConfig = variant?.highlight ?? { show: true, position: "bottom" as const, height: 200, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 };

  const getCategoryHighlight = (categoryId: string) => {
    if (dragState.activeId === categoryId) return "drag-active";
    if (dragState.overId === categoryId && dragState.activeId !== categoryId) return "drag-over";
    if (isActiveDrag && dragState.activeType === "item" && dragState.overId === categoryId) return "drag-over";
    if (!isActiveDrag && hoveredId === categoryId) return "hovered";
    return "none";
  };

  const getItemHighlight = (itemId: string) => {
    if (dragState.activeId === itemId) return "drag-active";
    if (dragState.overId === itemId && dragState.activeId !== itemId) return "drag-over";
    if (selectedItemId === itemId) return "selected";
    if (!isActiveDrag && hoveredId === itemId) return "hovered";
    return "none";
  };

  const categoryHighlightClass = (state: string) => {
    if (state === "drag-active") return "bg-primary/8 ring-2 ring-primary/40 p-3 -mx-3 rounded-lg";
    if (state === "drag-over") return "bg-primary/5 ring-1 ring-primary/30 p-3 -mx-3 rounded-lg";
    if (state === "hovered") return "bg-primary/5 ring-1 ring-primary/20 p-3 -mx-3 rounded-lg";
    return "";
  };

  const itemHighlightClass = (state: string) => {
    if (state === "drag-active") return "bg-primary/10 ring-2 ring-primary/40 px-2 rounded-md";
    if (state === "drag-over") return "bg-primary/8 ring-1 ring-primary/30 px-2 rounded-md";
    if (state === "selected") return "preview-item-selected px-2 py-1 rounded-md";
    if (state === "hovered") return "preview-item-hovered px-2 rounded-md";
    return "";
  };

  const effectiveColumns = bodyConfig.columns > 1 ? bodyConfig.columns : columnCount;
  const isCenter = bodyConfig.itemAlignment === "center";

  return (
    <div
      data-menu-preview
      className="min-h-full"
      style={{
        fontFamily: fonts.body,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header section */}
      {headerConfig.show && (
        <div style={{
          textAlign: headerConfig.style === "left" ? "left" : "center",
          paddingTop: `${spacing.marginTop}px`,
          paddingBottom: "32px",
          paddingLeft: `${spacing.marginLeft}px`,
          paddingRight: `${spacing.marginRight}px`,
        }}>
          {headerConfig.showSubtitle && (
            <p style={{
              fontSize: "10px",
              letterSpacing: "0.4em",
              color: colors.primary,
              textTransform: "uppercase",
              fontWeight: 600,
              fontFamily: fonts.body,
              marginBottom: "16px",
            }}>
              {menuData.subtitle || "DINNER SELECTION"}
            </p>
          )}

          <h1 style={{
            fontFamily: fonts.heading,
            fontSize: "2.25rem",
            fontWeight: 300,
            fontStyle: "italic",
            letterSpacing: "0.05em",
            lineHeight: 1.2,
            color: colors.text,
          }}>
            {menuData.restaurantName}
          </h1>

          {headerConfig.showEstablished && menuData.established && (
            <p style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: colors.muted,
              textTransform: "uppercase",
              fontFamily: fonts.body,
              marginTop: "8px",
            }}>
              EST. {menuData.established}
            </p>
          )}

          {headerConfig.showDivider && (
            <div style={{
              display: "flex",
              justifyContent: headerConfig.style === "left" ? "flex-start" : "center",
              marginTop: "20px",
            }}>
              <span style={{ width: "64px", height: "1px", backgroundColor: colors.muted, opacity: 0.3 }} />
            </div>
          )}
        </div>
      )}

      {/* Highlight image — top position */}
      {highlightConfig.show && highlightConfig.position === "top" && menuData.highlightImage && renderHighlight()}

      {/* Categories layout */}
      <div style={{
        paddingLeft: `${spacing.marginLeft}px`,
        paddingRight: `${spacing.marginRight}px`,
        paddingBottom: `${spacing.marginBottom}px`,
      }}>
        {effectiveColumns > 1 ? (
          layoutDirection === "Z" ? (
            <div>
              {Array.from(
                { length: Math.ceil(menuData.categories.length / effectiveColumns) },
                (_, rowIdx) => {
                  const rowCats = menuData.categories.slice(
                    rowIdx * effectiveColumns,
                    rowIdx * effectiveColumns + effectiveColumns,
                  );
                  return (
                    <div
                      key={rowIdx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
                        gap: `0 ${spacing.categoryGap * 0.6}px`,
                        alignItems: "start",
                      }}
                    >
                      {rowCats.map((category) => renderCategory(category))}
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
                gap: `0 ${spacing.categoryGap * 0.6}px`,
                alignItems: "start",
              }}
            >
              {Array.from({ length: effectiveColumns }, (_, i) => i + 1).map((col) => (
                <div key={col}>
                  {menuData.categories
                    .filter((cat) => (cat.column ?? 1) === col)
                    .map((category) => renderCategory(category))}
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            {menuData.categories.map((category) => renderCategory(category))}
          </div>
        )}
      </div>

      {/* Highlight image — bottom position */}
      {highlightConfig.show && highlightConfig.position !== "top" && menuData.highlightImage && renderHighlight()}
    </div>
  );

  function renderHighlight() {
    return (
      <div style={{
        marginTop: `${highlightConfig.marginTop ?? 12}px`,
        marginBottom: `${highlightConfig.marginBottom ?? 0}px`,
        marginLeft: `${(highlightConfig.marginLeft ?? 0) + spacing.marginLeft}px`,
        marginRight: `${(highlightConfig.marginRight ?? 0) + spacing.marginRight}px`,
      }}>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: "4px" }}>
          <img
            src={menuData.highlightImage}
            alt={menuData.highlightTitle}
            style={{ width: "100%", objectFit: "cover", height: `${highlightConfig.height ?? 200}px` }}
          />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "12px 16px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          }}>
            <p style={{
              fontSize: "8px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase", fontFamily: fonts.body, fontWeight: 600, marginBottom: "2px",
            }}>
              {menuData.highlightLabel}
            </p>
            <p style={{
              fontSize: "16px", color: "white", fontStyle: "italic", fontFamily: fonts.heading, fontWeight: 300,
            }}>
              {menuData.highlightTitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderCategory(category: (typeof menuData.categories)[number]) {
    const catState = getCategoryHighlight(category.id);
    return (
      <div
        key={category.id}
        data-category-id={category.id}
        className={`transition-all duration-200 ${categoryHighlightClass(catState)}`}
        style={{ marginBottom: `${spacing.categoryGap}px` }}
        onMouseEnter={() => !isActiveDrag && setHover(category.id, "category")}
        onMouseLeave={() => clearHover(category.id)}
      >
        {/* Category header */}
        <div style={{
          textAlign: isCenter ? "center" : "left",
          marginBottom: `${spacing.itemGap * 0.6}px`,
          display: bodyConfig.categoryStyle === "lines" && isCenter ? "flex" : "block",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}>
          {bodyConfig.categoryStyle === "lines" && isCenter && (
            <span style={{ flex: 1, maxWidth: "80px", height: "1px", backgroundColor: colors.primary, opacity: 0.3 }} />
          )}
          <h2 style={{
            fontSize: bodyConfig.categoryStyle === "bold" ? "13px" : "11px",
            letterSpacing: "0.35em",
            color: colors.primary,
            textTransform: "uppercase",
            fontWeight: bodyConfig.categoryStyle === "bold" ? 800 : 600,
            whiteSpace: "nowrap",
            fontFamily: bodyConfig.categoryStyle === "bold" ? fonts.heading : fonts.body,
            borderBottom: bodyConfig.categoryStyle === "bold" ? `2px solid ${colors.primary}` : "none",
            paddingBottom: bodyConfig.categoryStyle === "bold" ? "8px" : "0",
            display: "inline-block",
          }}>
            {category.name}
          </h2>
          {bodyConfig.categoryStyle === "lines" && isCenter && (
            <span style={{ flex: 1, maxWidth: "80px", height: "1px", backgroundColor: colors.primary, opacity: 0.3 }} />
          )}
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.itemGap}px` }}>
          {category.items.map((item) => {
            const itemState = getItemHighlight(item.id);
            return (
              <div
                key={item.id}
                data-item-id={item.id}
                className={`transition-all duration-200 py-1 cursor-pointer ${itemHighlightClass(itemState)}`}
                style={{ textAlign: isCenter ? "center" : "left" }}
                onClick={() => selectItem(item.id)}
                onMouseEnter={() => !isActiveDrag && setHover(item.id, "item")}
                onMouseLeave={() => clearHover(item.id)}
              >
                {/* Item name row */}
                <div style={{
                  display: bodyConfig.pricePosition === "right" ? "flex" : "block",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: isCenter ? "center" : "flex-start" }}>
                    <p style={{
                      fontSize: "14px",
                      fontFamily: fonts.body,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: colors.text,
                      textTransform: "uppercase",
                    }}>
                      {item.name}
                    </p>
                    {bodyConfig.pricePosition === "inline" && (
                      <span style={{ fontSize: "12px", color: colors.primary, fontWeight: 600 }}>€{item.price}</span>
                    )}
                    {item.featured && bodyConfig.showFeaturedBadge && (
                      <span style={{ fontSize: "10px", color: colors.accent }}>★</span>
                    )}
                  </div>
                  {bodyConfig.pricePosition === "right" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, marginLeft: "8px" }}>
                      {bodyConfig.separatorStyle === "dotted" && (
                        <span style={{ flex: 1, borderBottom: `1px dotted ${colors.muted}66`, minWidth: "16px" }} />
                      )}
                      {bodyConfig.separatorStyle === "line" && (
                        <span style={{ flex: 1, height: "1px", backgroundColor: `${colors.muted}33`, minWidth: "16px" }} />
                      )}
                      <span style={{ fontSize: "12px", color: colors.primary, fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {bodyConfig.showDescriptions && item.description && (
                  <p style={{
                    fontSize: "12px",
                    color: colors.muted,
                    fontStyle: "italic",
                    marginTop: "4px",
                    lineHeight: 1.5,
                    maxWidth: isCenter ? "320px" : undefined,
                    marginLeft: isCenter ? "auto" : undefined,
                    marginRight: isCenter ? "auto" : undefined,
                    fontFamily: fonts.body,
                  }}>
                    {item.description}
                  </p>
                )}

                {/* Price — below position */}
                {bodyConfig.pricePosition === "below" && (
                  <p style={{
                    fontSize: "12px",
                    color: colors.primary,
                    fontWeight: 600,
                    marginTop: "6px",
                  }}>
                    €{item.price}
                  </p>
                )}
              </div>
            );
          })}

          {category.items.length === 0 && (
            <p style={{
              textAlign: "center",
              fontSize: "12px",
              color: `${colors.muted}80`,
              fontStyle: "italic",
              padding: "16px 0",
            }}>
              No items in this category yet
            </p>
          )}
        </div>
      </div>
    );
  }
}
