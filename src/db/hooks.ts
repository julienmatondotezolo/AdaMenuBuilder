import { uid } from "../utils/uid";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./dexie";
import type { Menu } from "../types/menu";
import type { MenuTemplate } from "../types/template";

/* ── Menu hooks ──────────────────────────────────────────────────────── */

export function useMenus() {
  return useLiveQuery(() => db.menus.orderBy("updatedAt").reverse().toArray(), []);
}

export function useMenuById(id: string | undefined) {
  return useLiveQuery(() => (id ? db.menus.get(id) : undefined), [id]);
}

export async function createMenu(menu: Menu) {
  await db.menus.add(menu);
  return menu;
}

export async function updateMenu(id: string, updates: Partial<Menu>) {
  await db.menus.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteMenu(id: string) {
  await db.menus.delete(id);
}

export async function duplicateMenu(id: string): Promise<Menu | undefined> {
  const original = await db.menus.get(id);
  if (!original) return undefined;

  const now = new Date().toISOString();
  const copy: Menu = {
    ...original,
    id: `menu-${uid()}`,
    title: `${original.title} (Copy)`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    pages: original.pages.map((p) => ({ ...p, id: `page-${uid()}` })),
  };
  await db.menus.add(copy);
  return copy;
}

/* ── Template hooks ──────────────────────────────────────────────────── */

export function useTemplates() {
  return useLiveQuery(() => db.templates.orderBy("updatedAt").reverse().toArray(), []);
}

export function useTemplateById(id: string | undefined) {
  return useLiveQuery(() => (id ? db.templates.get(id) : undefined), [id]);
}

export async function createTemplate(template: MenuTemplate) {
  await db.templates.add(template);
  return template;
}

export async function updateTemplate(id: string, updates: Partial<MenuTemplate>) {
  await db.templates.update(id, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTemplate(id: string) {
  const tpl = await db.templates.get(id);
  if (tpl?.isBuiltIn) throw new Error("Cannot delete built-in templates");
  await db.templates.delete(id);
}

export async function duplicateTemplate(id: string): Promise<MenuTemplate | undefined> {
  const original = await db.templates.get(id);
  if (!original) return undefined;

  const now = new Date().toISOString();
  const copy: MenuTemplate = {
    ...original,
    id: `tpl-${uid()}`,
    name: `${original.name} (Copy)`,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
    pageVariants: original.pageVariants.map((v) => ({ ...v, id: `var-${uid()}` })),
  };
  await db.templates.add(copy);
  return copy;
}
