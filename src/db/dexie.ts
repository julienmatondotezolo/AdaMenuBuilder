import Dexie, { type Table } from "dexie";
import type { Menu } from "../types/menu";
import type { MenuTemplate } from "../types/template";
import { LUMIERE_TEMPLATE } from "../data/builtInTemplates";
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

/** Seed built-in templates on first load */
export async function seedDefaults() {
  const templateCount = await db.templates.count();
  if (templateCount === 0) {
    await db.templates.add(LUMIERE_TEMPLATE);
  }

  const menuCount = await db.menus.count();
  if (menuCount === 0) {
    await db.menus.add(createSampleMenu(LUMIERE_TEMPLATE.id));
  }
}
