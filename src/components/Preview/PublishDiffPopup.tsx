import { X, ArrowRight, Plus, Minus, Pencil } from "lucide-react";
import { Button } from "ada-design-system";
import type { MenuData, Category, MenuItem } from "../../types/menu";
import { useTranslation } from "../../i18n";

interface PublishDiffPopupProps {
  previousMenu: MenuData | null;
  currentMenu: MenuData;
  onConfirm: () => void;
  onCancel: () => void;
  publishing: boolean;
}

/** Format price as currency string */
function fmtPrice(p: number) {
  return p.toFixed(2).replace(/\.00$/, "");
}

/** Compute changes between two menu snapshots */
interface DiffResult {
  addedCategories: Category[];
  removedCategories: Category[];
  modifiedCategories: {
    name: string;
    oldName?: string;
    addedItems: MenuItem[];
    removedItems: MenuItem[];
    modifiedItems: { old: MenuItem; current: MenuItem }[];
  }[];
  titleChanged: boolean;
}

function computeDiff(prev: MenuData | null, current: MenuData): DiffResult {
  if (!prev) {
    return {
      addedCategories: current.categories,
      removedCategories: [],
      modifiedCategories: [],
      titleChanged: false,
    };
  }

  const prevCatMap = new Map(prev.categories.map((c) => [c.id, c]));
  const currCatMap = new Map(current.categories.map((c) => [c.id, c]));

  const addedCategories: Category[] = [];
  const removedCategories: Category[] = [];
  const modifiedCategories: DiffResult["modifiedCategories"] = [];

  // Find added and modified categories
  for (const cat of current.categories) {
    const prevCat = prevCatMap.get(cat.id);
    if (!prevCat) {
      addedCategories.push(cat);
      continue;
    }

    const prevItemMap = new Map(prevCat.items.map((i) => [i.id, i]));
    const currItemMap = new Map(cat.items.map((i) => [i.id, i]));

    const addedItems: MenuItem[] = [];
    const removedItems: MenuItem[] = [];
    const modifiedItems: { old: MenuItem; current: MenuItem }[] = [];

    for (const item of cat.items) {
      const prevItem = prevItemMap.get(item.id);
      if (!prevItem) {
        addedItems.push(item);
      } else if (
        prevItem.name !== item.name ||
        prevItem.price !== item.price ||
        prevItem.description !== item.description ||
        prevItem.featured !== item.featured
      ) {
        modifiedItems.push({ old: prevItem, current: item });
      }
    }

    for (const item of prevCat.items) {
      if (!currItemMap.has(item.id)) {
        removedItems.push(item);
      }
    }

    const nameChanged = prevCat.name !== cat.name;
    if (nameChanged || addedItems.length || removedItems.length || modifiedItems.length) {
      modifiedCategories.push({
        name: cat.name,
        oldName: nameChanged ? prevCat.name : undefined,
        addedItems,
        removedItems,
        modifiedItems,
      });
    }
  }

  // Find removed categories
  for (const cat of prev.categories) {
    if (!currCatMap.has(cat.id)) {
      removedCategories.push(cat);
    }
  }

  return {
    addedCategories,
    removedCategories,
    modifiedCategories,
    titleChanged: prev.title !== current.title,
  };
}

/** Renders a single side of the menu (previous or current) */
function MenuSide({
  menu,
  label,
  diff,
  side,
}: {
  menu: MenuData | null;
  label: string;
  diff: DiffResult;
  side: "previous" | "current";
}) {
  if (!menu) {
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {label}
        </div>
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
          {label}
        </div>
      </div>
    );
  }

  const addedCatIds = new Set(diff.addedCategories.map((c) => c.id));
  const removedCatIds = new Set(diff.removedCategories.map((c) => c.id));
  // modifiedCatNames available via diff.modifiedCategories if needed

  const categories = menu.categories;

  return (
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {label}
      </div>
      <div className="space-y-3">
        {/* Title */}
        <div
          className={`text-sm font-bold ${
            diff.titleChanged
              ? side === "current"
                ? "text-blue-600"
                : "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {menu.title || "Untitled Menu"}
        </div>

        {/* Categories */}
        {categories.map((cat) => {
          const isAdded = addedCatIds.has(cat.id);
          const isRemoved = removedCatIds.has(cat.id);
          const mod = diff.modifiedCategories.find(
            (m) => m.name === cat.name || m.oldName === cat.name
          );

          // Build item-level highlight sets for this category
          const addedItemIds = new Set(mod?.addedItems.map((i) => i.id));
          const removedItemIds = new Set(mod?.removedItems.map((i) => i.id));
          const modifiedItemIds = new Set(mod?.modifiedItems.map((m) => m.current.id));
          const modifiedOldItemIds = new Set(mod?.modifiedItems.map((m) => m.old.id));

          let catBg = "";
          if (isAdded && side === "current") catBg = "bg-green-50 border-green-200";
          else if (isRemoved && side === "previous") catBg = "bg-red-50 border-red-200";

          return (
            <div
              key={cat.id}
              className={`rounded-lg border p-3 ${catBg || "border-border"}`}
            >
              {/* Category header */}
              <div className="flex items-center gap-1.5 mb-2">
                {isAdded && side === "current" && (
                  <Plus className="w-3 h-3 text-green-600 shrink-0" />
                )}
                {isRemoved && side === "previous" && (
                  <Minus className="w-3 h-3 text-red-600 shrink-0" />
                )}
                {mod?.oldName && (
                  <Pencil className="w-3 h-3 text-blue-600 shrink-0" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    isAdded && side === "current"
                      ? "text-green-700"
                      : isRemoved && side === "previous"
                        ? "text-red-700 line-through"
                        : mod?.oldName
                          ? "text-blue-700"
                          : "text-foreground"
                  }`}
                >
                  {cat.name}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {cat.items.length} items
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const itemAdded = addedItemIds.has(item.id);
                  const itemRemoved = removedItemIds.has(item.id);
                  const itemModified =
                    side === "current"
                      ? modifiedItemIds.has(item.id)
                      : modifiedOldItemIds.has(item.id);

                  let itemClass = "text-muted-foreground";
                  if (itemAdded && side === "current") itemClass = "text-green-700 bg-green-50/50";
                  else if (itemRemoved && side === "previous") itemClass = "text-red-700 bg-red-50/50 line-through";
                  else if (itemModified) itemClass = "text-blue-700 bg-blue-50/50";

                  return (
                    <div
                      key={item.id}
                      className={`flex items-baseline justify-between text-[11px] px-1.5 py-0.5 rounded ${itemClass}`}
                    >
                      <span className="truncate mr-2">{item.name}</span>
                      <span className="shrink-0 tabular-nums">{fmtPrice(item.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PublishDiffPopup({
  previousMenu,
  currentMenu,
  onConfirm,
  onCancel,
  publishing,
}: PublishDiffPopupProps) {
  const { t } = useTranslation();
  const diff = computeDiff(previousMenu, currentMenu);
  const hasChanges =
    !previousMenu ||
    diff.addedCategories.length > 0 ||
    diff.removedCategories.length > 0 ||
    diff.modifiedCategories.length > 0 ||
    diff.titleChanged;

  const totalChanges =
    diff.addedCategories.length +
    diff.removedCategories.length +
    diff.modifiedCategories.reduce(
      (sum, m) => sum + m.addedItems.length + m.removedItems.length + m.modifiedItems.length + (m.oldName ? 1 : 0),
      0
    ) +
    (diff.titleChanged ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">{t("publishDiff.reviewChanges")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {previousMenu
                ? `${totalChanges} ${totalChanges !== 1 ? t("publishDiff.changes") : t("publishDiff.change")} ${t("publishDiff.sinceLastPublish")}`
                : t("publishDiff.firstPublish")}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Side-by-side content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!hasChanges && previousMenu ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              {t("publishDiff.noChanges")}
            </div>
          ) : (
            <div className="flex gap-4">
              <MenuSide
                menu={previousMenu}
                label={t("publishDiff.previouslyPublished")}
                diff={diff}
                side="previous"
              />
              <div className="flex flex-col items-center justify-start pt-8 shrink-0">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <MenuSide
                menu={currentMenu}
                label={t("publishDiff.currentVersion")}
                diff={diff}
                side="current"
              />
            </div>
          )}

          {/* Legend */}
          {hasChanges && previousMenu && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-200" />
                {t("publishDiff.added")}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-200" />
                {t("publishDiff.removed")}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-200" />
                {t("publishDiff.modified")}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={publishing}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={publishing}>
            {publishing ? t("menuEditor.publishing") : t("publishDiff.confirmAndPublish")}
          </Button>
        </div>
      </div>
    </div>
  );
}
