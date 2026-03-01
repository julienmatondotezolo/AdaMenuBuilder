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
  const now = new Date().toISOString();
  await db.templates.update(id, { ...updates, updatedAt: now });

  // Propagate to all menus using this template
  const menusUsingTemplate = await db.menus.where("templateId").equals(id).toArray();
  if (menusUsingTemplate.length === 0) return;

  // If page variants changed, clean up orphaned variant references in menus
  const newVariantIds = updates.pageVariants?.map((v) => v.id);

  for (const menu of menusUsingTemplate) {
    const menuUpdates: Partial<Menu> = { updatedAt: now };

    if (newVariantIds) {
      // Remove pages whose variantId no longer exists, or remap to first available
      const validPages = menu.pages.filter((p) => newVariantIds.includes(p.variantId));
      if (validPages.length !== menu.pages.length) {
        menuUpdates.pages = validPages.length > 0
          ? validPages
          : [{ id: `page-${uid()}`, variantId: newVariantIds[0], categoryIds: [] }];
      }
    }

    await db.menus.update(menu.id, menuUpdates);
  }
}

export async function deleteTemplate(id: string) {
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

/* ── Template Export / Import ────────────────────────────────────────── */

/** Export a template as a JSON blob (strips internal IDs, adds export metadata) */
export async function exportTemplate(id: string): Promise<string | undefined> {
  const tpl = await db.templates.get(id);
  if (!tpl) return undefined;

  const exportData = {
    _format: "ada-menu-template",
    _version: 1,
    _exportedAt: new Date().toISOString(),
    name: tpl.name,
    description: tpl.description,
    format: tpl.format,
    orientation: tpl.orientation,
    colors: tpl.colors,
    fonts: tpl.fonts,
    spacing: tpl.spacing,
    pageVariants: tpl.pageVariants.map((v) => ({
      name: v.name,
      header: v.header,
      body: v.body,
      highlight: v.highlight,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/** Download a template as a .json file */
export async function downloadTemplate(id: string): Promise<void> {
  const json = await exportTemplate(id);
  if (!json) return;

  const tpl = await db.templates.get(id);
  const filename = `${(tpl?.name ?? "template").toLowerCase().replace(/\s+/g, "-")}.adamenu-template.json`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a template from a JSON string; returns the new template ID */
export async function importTemplate(jsonString: string): Promise<MenuTemplate> {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON file");
  }

  // Validate format
  if (data._format !== "ada-menu-template") {
    throw new Error("Not a valid AdaMenu template file");
  }

  const now = new Date().toISOString();

  const template: MenuTemplate = {
    id: `tpl-${uid()}`,
    name: (data.name as string) || "Imported Template",
    description: (data.description as string) || "",
    isBuiltIn: false,
    format: data.format as MenuTemplate["format"],
    orientation: (data.orientation as "portrait" | "landscape") || "portrait",
    colors: data.colors as MenuTemplate["colors"],
    fonts: data.fonts as MenuTemplate["fonts"],
    spacing: data.spacing as MenuTemplate["spacing"],
    pageVariants: ((data.pageVariants as Array<Record<string, unknown>>) || []).map((v) => ({
      id: `var-${uid()}`,
      name: (v.name as string) || "Page",
      header: v.header as MenuTemplate["pageVariants"][0]["header"],
      body: v.body as MenuTemplate["pageVariants"][0]["body"],
      highlight: v.highlight as MenuTemplate["pageVariants"][0]["highlight"],
    })),
    createdAt: now,
    updatedAt: now,
  };

  // Ensure at least one variant
  if (template.pageVariants.length === 0) {
    template.pageVariants = [{
      id: `var-${uid()}`,
      name: "Content",
      header: { show: true, style: "centered", showSubtitle: true, showEstablished: true, showDivider: true },
      body: { columns: 1, categoryStyle: "lines", itemAlignment: "center", pricePosition: "below", separatorStyle: "line", showDescriptions: true, showFeaturedBadge: true },
      highlight: { show: false, position: "none", height: 80, marginTop: 12, marginBottom: 0, marginLeft: 0, marginRight: 0 },
    }];
  }

  await db.templates.add(template);
  return template;
}

/** Import a template from a File object */
export async function importTemplateFromFile(file: File): Promise<MenuTemplate> {
  const text = await file.text();
  return importTemplate(text);
}
