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

/** Seed built-in templates on first load (fallback — backend sync overwrites these) */
export async function seedDefaults() {
  for (const tpl of BUILT_IN_TEMPLATES) {
    const existing = await db.templates.get(tpl.id);
    if (!existing) {
      await db.templates.add({ ...tpl, builtInVersion: 1 });
    }
  }

  const menuCount = await db.menus.count();
  if (menuCount === 0) {
    await db.menus.add(createSampleMenu(LUMIERE_TEMPLATE.id));
  }
}
