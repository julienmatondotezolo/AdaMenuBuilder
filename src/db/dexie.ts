import Dexie, { type Table } from "dexie";
import type { Menu } from "../types/menu";
import type { MenuTemplate } from "../types/template";
import { BUILT_IN_TEMPLATES, LUMIERE_TEMPLATE } from "../data/builtInTemplates";
import { createSampleMenu } from "../data/sampleMenu";

class AdaMenuDB extends Dexie {
  menus!: Table<Menu, string>;
  templates!: Table<MenuTemplate, string>;

  constructor() {
    super("AdaMenuDB");

    this.version(1).stores({
      menus: "id, templateId, status, updatedAt",
      templates: "id, isBuiltIn, updatedAt",
    });
  }
}

export const db = new AdaMenuDB();

/** Seed/refresh built-in templates on every load (fallback — backend sync can override) */
export async function seedDefaults() {
  for (const tpl of BUILT_IN_TEMPLATES) {
    const existing = await db.templates.get(tpl.id);
    if (!existing) {
      await db.templates.add({ ...tpl, builtInVersion: 1 });
    } else if (existing.isBuiltIn && !existing.hasLocalChanges) {
      // Keep built-in templates fresh, but don't overwrite local edits
      await db.templates.put({ ...tpl, builtInVersion: existing.builtInVersion || 1, updatedAt: new Date().toISOString() });
    }
  }

  const menuCount = await db.menus.count();
  if (menuCount === 0) {
    await db.menus.add(createSampleMenu(LUMIERE_TEMPLATE.id));
  }
}
