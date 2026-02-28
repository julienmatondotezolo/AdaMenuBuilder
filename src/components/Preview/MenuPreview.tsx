import { useMenu } from "../../context/MenuContext";

export default function MenuPreview() {
  const { menuData, hoveredId, setHover, clearHover, dragState, columnCount, layoutDirection, selectedItemId, selectItem } = useMenu();

  const isActiveDrag = dragState.activeId !== null;

  const getCategoryHighlight = (categoryId: string) => {
    if (dragState.activeId === categoryId) return "drag-active";
    if (
      dragState.overId === categoryId &&
      dragState.activeId !== categoryId
    )
      return "drag-over";
    if (
      isActiveDrag &&
      dragState.activeType === "item" &&
      dragState.overId === categoryId
    )
      return "drag-over";
    if (!isActiveDrag && hoveredId === categoryId) return "hovered";
    return "none";
  };

  const getItemHighlight = (itemId: string) => {
    if (dragState.activeId === itemId) return "drag-active";
    if (dragState.overId === itemId && dragState.activeId !== itemId)
      return "drag-over";
    if (selectedItemId === itemId) return "selected";
    if (!isActiveDrag && hoveredId === itemId) return "hovered";
    return "none";
  };

  const categoryHighlightClass = (state: string) => {
    if (state === "drag-active")
      return "bg-primary/8 ring-2 ring-primary/40 p-3 -mx-3 rounded-lg";
    if (state === "drag-over")
      return "bg-primary/5 ring-1 ring-primary/30 p-3 -mx-3 rounded-lg";
    if (state === "hovered")
      return "bg-primary/5 ring-1 ring-primary/20 p-3 -mx-3 rounded-lg";
    return "";
  };

  const itemHighlightClass = (state: string) => {
    if (state === "drag-active")
      return "bg-primary/10 ring-2 ring-primary/40 px-2 rounded-md";
    if (state === "drag-over")
      return "bg-primary/8 ring-1 ring-primary/30 px-2 rounded-md";
    if (state === "selected")
      return "preview-item-selected px-2 py-1 rounded-md";
    if (state === "hovered")
      return "bg-primary/8 ring-1 ring-primary/20 px-2 rounded-md";
    return "";
  };

  return (
    <div
      data-menu-preview
      className="bg-white font-serif text-foreground min-h-full"
    >
      {/* Header section */}
      <div className="text-center pt-12 pb-8 px-8">
        {/* Small caps category label */}
        <p className="text-[10px] tracking-[0.4em] text-primary uppercase font-sans font-semibold mb-4">
          {menuData.subtitle || "DINNER SELECTION"}
        </p>

        {/* Restaurant name — large elegant serif */}
        <h1 className="text-4xl font-light italic text-foreground leading-tight tracking-wide">
          {menuData.restaurantName}
        </h1>

        {/* Established */}
        {menuData.established && (
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase font-sans mt-2">
            EST. {menuData.established}
          </p>
        )}

        {/* Horizontal divider */}
        <div className="flex items-center justify-center mt-5">
          <span className="w-16 h-px bg-border" />
        </div>
      </div>

      {/* Categories layout */}
      {columnCount > 1 ? (
        layoutDirection === "Z" ? (
          // Z-shape: row-first
          <div className="px-8 pb-10 space-y-0">
            {Array.from(
              { length: Math.ceil(menuData.categories.length / columnCount) },
              (_, rowIdx) => {
                const rowCats = menuData.categories.slice(
                  rowIdx * columnCount,
                  rowIdx * columnCount + columnCount,
                );
                return (
                  <div
                    key={rowIdx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                      gap: "0 2rem",
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
          // N-shape: column-first
          <div
            className="px-8 pb-10"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
              gap: "0 2rem",
              alignItems: "start",
            }}
          >
            {Array.from({ length: columnCount }, (_, i) => i + 1).map((col) => (
              <div key={col}>
                {menuData.categories
                  .filter((cat) => (cat.column ?? 1) === col)
                  .map((category) => renderCategory(category))}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="px-8 pb-10">
          {menuData.categories.map((category) => renderCategory(category))}
        </div>
      )}

      {/* Featured image section at bottom */}
      {menuData.highlightImage && (
        <div className="mx-5 mb-6 relative overflow-hidden rounded-md">
          <img
            src={menuData.highlightImage}
            alt={menuData.highlightTitle}
            className="w-full object-cover"
            style={{ height: "200px" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-[8px] tracking-[0.25em] text-white/70 uppercase font-sans font-semibold mb-0.5">
              {menuData.highlightLabel}
            </p>
            <p className="text-base font-light italic text-white">
              {menuData.highlightTitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  function renderCategory(category: (typeof menuData.categories)[number]) {
    const catState = getCategoryHighlight(category.id);
    return (
      <div
        key={category.id}
        data-category-id={category.id}
        className={`mb-10 transition-all duration-200 ${categoryHighlightClass(catState)}`}
        onMouseEnter={() =>
          !isActiveDrag && setHover(category.id, "category")
        }
        onMouseLeave={() => clearHover(category.id)}
      >
        {/* Category name with decorative lines */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="flex-1 max-w-20 h-px bg-primary/30" />
          <h2 className="text-[11px] tracking-[0.35em] text-primary uppercase font-sans font-semibold whitespace-nowrap">
            {category.name}
          </h2>
          <span className="flex-1 max-w-20 h-px bg-primary/30" />
        </div>

        {/* Items */}
        <div className="space-y-6">
          {category.items.map((item) => {
            const itemState = getItemHighlight(item.id);
            return (
              <div
                key={item.id}
                data-item-id={item.id}
                className={`text-center transition-all duration-200 py-1 cursor-pointer ${itemHighlightClass(itemState)}`}
                onClick={() => selectItem(item.id)}
                onMouseEnter={() =>
                  !isActiveDrag && setHover(item.id, "item")
                }
                onMouseLeave={() => clearHover(item.id)}
              >
                {/* Item name — bold, centered */}
                <p className="text-sm font-sans font-bold tracking-[0.1em] text-foreground uppercase">
                  {item.name}
                </p>

                {/* Description — italic, muted */}
                {item.description && (
                  <p className="text-xs text-muted-foreground italic mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Price */}
                <p className="text-xs font-sans text-primary font-semibold mt-1.5">
                  ${item.price}
                </p>
              </div>
            );
          })}

          {category.items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground/50 italic font-sans py-4">
              No items in this category yet
            </p>
          )}
        </div>
      </div>
    );
  }
}
