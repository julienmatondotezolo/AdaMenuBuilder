import { db } from "../db/dexie";
import { uid } from "../utils/uid";
import { getTemplateHash } from "../db/hooks";
import { fetchRestaurants } from "./templateApi";
import { API_URL } from "../config/api";
import type { MenuTemplate } from "../types/template";

interface RemoteTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  project_json: Record<string, unknown>;
  is_default: boolean;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RemoteBuiltIn {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  format: MenuTemplate["format"];
  orientation: "portrait" | "landscape";
  colors: MenuTemplate["colors"];
  fonts: MenuTemplate["fonts"];
  spacing: MenuTemplate["spacing"];
  page_variants: MenuTemplate["pageVariants"];
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sync built-in templates from backend into local IndexedDB.
 * Only updates local built-in templates if the backend version is newer.
 */
export async function syncBuiltInTemplates(token: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/v1/built-in-templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { data } = await res.json() as { data: RemoteBuiltIn[] };
    if (!data?.length) return;

    for (const remote of data) {
      const local = await db.templates.get(remote.id);
      const now = new Date().toISOString();

      const template: MenuTemplate = {
        id: remote.id,
        name: remote.name,
        description: remote.description || "",
        thumbnail: remote.thumbnail || undefined,
        isBuiltIn: true,
        format: remote.format,
        orientation: remote.orientation,
        colors: remote.colors,
        fonts: remote.fonts,
        spacing: remote.spacing,
        pageVariants: remote.page_variants,
        builtInVersion: remote.version,
        createdAt: remote.created_at,
        updatedAt: now,
      };

      if (!local) {
        await db.templates.add(template);
      } else if (local.isBuiltIn) {
        // Only overwrite if backend version is newer and no local changes
        const localVersion = local.builtInVersion || 1;
        if (remote.version > localVersion && !local.hasLocalChanges) {
          await db.templates.put(template);
        }
      }
    }
  } catch (err) {
    console.warn("Built-in template sync failed:", err);
  }
}

/**
 * Sync published templates from backend into local IndexedDB.
 * - Fetches all published templates from all user's restaurants
 * - Imports remote templates not found locally
 * - Updates publish status of local templates that exist remotely
 */
export async function syncTemplatesFromBackend(token: string): Promise<void> {
  // Sync built-in templates first
  await syncBuiltInTemplates(token);

  // 1. Fetch restaurants
  const restaurants = await fetchRestaurants(token);
  if (restaurants.length === 0) return;

  // 2. Fetch all remote templates across restaurants
  const remoteByName = new Map<string, { template: RemoteTemplate; restaurants: Map<string, string> }>();

  for (const r of restaurants) {
    try {
      const res = await fetch(`${API_URL}/api/v1/restaurants/${r.id}/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;
      const { data } = await res.json() as { data: RemoteTemplate[] };
      for (const tpl of data || []) {
        const existing = remoteByName.get(tpl.name);
        if (existing) {
          existing.restaurants.set(r.id, tpl.id);
        } else {
          remoteByName.set(tpl.name, {
            template: tpl,
            restaurants: new Map([[r.id, tpl.id]]),
          });
        }
      }
    } catch {
      // Skip failed restaurant fetches
    }
  }

  // 3. Get all local templates
  const localTemplates = await db.templates.toArray();
  const localByName = new Map(localTemplates.map((t) => [t.name, t]));

  // 4. Import remote templates not found locally
  for (const [name, remote] of remoteByName) {
    const local = localByName.get(name);
    if (local) {
      // Update publish tracking on local template
      const remoteIds: Record<string, string> = {};
      for (const [rid, tid] of remote.restaurants) {
        remoteIds[rid] = tid;
      }
      await db.templates.update(local.id, {
        publishedAt: remote.template.updated_at,
        publishedHash: getTemplateHash(local),
        remoteIds,
      });
    } else {
      // Import from remote — reconstruct local template from project_json
      const pj = remote.template.project_json as Record<string, unknown>;
      if (!pj || pj._format !== "ada-menu-template") continue;

      const now = new Date().toISOString();
      const remoteIds: Record<string, string> = {};
      for (const [rid, tid] of remote.restaurants) {
        remoteIds[rid] = tid;
      }

      const template: MenuTemplate = {
        id: `tpl-${uid()}`,
        name,
        description: remote.template.description || "",
        thumbnail: remote.template.thumbnail || undefined,
        isBuiltIn: false,
        format: pj.format as MenuTemplate["format"],
        orientation: (pj.orientation as "portrait" | "landscape") || "portrait",
        colors: pj.colors as MenuTemplate["colors"],
        fonts: pj.fonts as MenuTemplate["fonts"],
        spacing: pj.spacing as MenuTemplate["spacing"],
        previewMenuId: pj.previewMenuId as string | undefined,
        pageVariants: ((pj.pageVariants as Array<Record<string, unknown>>) || []).map((v) => ({
          id: `var-${uid()}`,
          name: (v.name as string) || "Page",
          header: v.header as MenuTemplate["pageVariants"][0]["header"],
          body: v.body as MenuTemplate["pageVariants"][0]["body"],
          highlight: v.highlight as MenuTemplate["pageVariants"][0]["highlight"],
          extraBodies: v.extraBodies as MenuTemplate["pageVariants"][0]["extraBodies"],
          sectionOrder: v.sectionOrder as MenuTemplate["pageVariants"][0]["sectionOrder"],
          decorations: v.decorations as MenuTemplate["pageVariants"][0]["decorations"],
        })),
        publishedAt: remote.template.updated_at,
        remoteIds,
        createdAt: remote.template.created_at,
        updatedAt: now,
      };

      // Compute hash after creation so it matches the imported content
      template.publishedHash = getTemplateHash(template);

      await db.templates.add(template);
    }
  }
}
