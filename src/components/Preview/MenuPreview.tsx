import { useMenu } from "../../context/MenuContext";

export default function MenuPreview() {
  const { menuData, hoveredId, setHover, clearHover, columnCount } = useMenu();

  const categoriesByColumn: Record<number, typeof menuData.categories> = {};
  for (let i = 1; i <= columnCount; i++) {
    categoriesByColumn[i] = [];
  }
  for (const cat of menuData.categories) {
    const col = Math.min(cat.column ?? 1, columnCount);
    categoriesByColumn[col].push(cat);
  }

  const renderCategory = (category: (typeof menuData.categories)[number]) => (
    <div
      key={category.id}
      data-category-id={category.id}
      className={`mb-8 transition-all duration-200 rounded-lg ${
        hoveredId === category.id
          ? "bg-indigo-primary/5 ring-1 ring-indigo-primary/20 p-3 -mx-3"
          : ""
      }`}
      onMouseEnter={() => setHover(category.id, "category")}
      onMouseLeave={() => clearHover(category.id)}
    >
      <div className="text-center mb-5">
        <h2 className="text-2xl italic text-gray-900 mb-2">{category.name}</h2>
        <div className="flex items-center justify-center">
          <span className="flex-1 max-w-24 h-px bg-gray-200" />
          <span className="mx-3 w-1.5 h-1.5 rounded-full bg-gray-300" />
          <span className="flex-1 max-w-24 h-px bg-gray-200" />
        </div>
      </div>

      <div className="space-y-5">
        {category.items.map((item) => (
          <div
            key={item.id}
            data-item-id={item.id}
            className={`text-center transition-all duration-200 rounded-md py-1 ${
              hoveredId === item.id
                ? "bg-indigo-primary/8 ring-1 ring-indigo-primary/20 px-2"
                : ""
            }`}
            onMouseEnter={() => setHover(item.id, "item")}
            onMouseLeave={() => clearHover(item.id)}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs font-sans font-bold tracking-[0.15em] text-gray-900 uppercase">
                {item.name}
              </span>
              <span className="text-gray-300">—</span>
              <span className="text-sm font-sans text-gray-500 italic">
                ${item.price}
              </span>
            </div>
            {item.description && (
              <p className="text-xs text-gray-400 italic mt-1 max-w-sm mx-auto font-sans leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        ))}

        {category.items.length === 0 && (
          <p className="text-center text-xs text-gray-300 italic font-sans py-4">
            No items in this category yet
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      data-menu-preview
      className="bg-[#faf9f6] font-serif text-gray-900 min-h-full"
    >
      <div className="text-center pt-10 pb-6 px-6">
        <p className="text-[10px] tracking-[0.35em] text-gray-400 uppercase mb-3">
          EST. {menuData.established}
        </p>
        <h1 className="text-4xl font-semibold italic text-gray-900 leading-tight">
          {menuData.restaurantName}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="w-10 h-px bg-gray-300" />
          <p className="text-[10px] tracking-[0.3em] text-gray-400 uppercase font-sans font-semibold">
            {menuData.subtitle}
          </p>
          <span className="w-10 h-px bg-gray-300" />
        </div>
      </div>

      {menuData.highlightImage && (
        <div className="mx-6 mb-8 relative rounded-lg overflow-hidden shadow-md">
          <img
            src={menuData.highlightImage}
            alt={menuData.highlightTitle}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-5">
            <p className="text-[9px] tracking-[0.25em] text-white/70 uppercase font-sans font-semibold mb-0.5">
              {menuData.highlightLabel}
            </p>
            <p className="text-lg font-semibold italic text-white">
              {menuData.highlightTitle}
            </p>
          </div>
        </div>
      )}

      {columnCount > 1 ? (
        <div
          className="px-6 pb-10"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: "0 2rem",
            alignItems: "start",
          }}
        >
          {Array.from({ length: columnCount }, (_, i) => i + 1).map((col) => (
            <div key={col}>
              {categoriesByColumn[col].map(renderCategory)}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 pb-10">
          {menuData.categories.map(renderCategory)}
        </div>
      )}
    </div>
  );
}
