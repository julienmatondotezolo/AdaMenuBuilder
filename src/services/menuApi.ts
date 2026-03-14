import { API_URL } from "../config/api";

export interface BackendMenu {
  id: string;
  restaurant_id: string;
  title: string;
  subtitle: string | null;
  template_id: string | null;
  status: "draft" | "published";
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateMenuPayload {
  title: string;
  subtitle?: string;
  template_id?: string;
  status?: "draft" | "published";
}

/** List menus for a restaurant */
export async function fetchMenus(token: string, restaurantId: string): Promise<BackendMenu[]> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch menus");
  const data = await res.json();
  return data.data || [];
}

/** Create a menu */
export async function createBackendMenu(token: string, restaurantId: string, payload: CreateMenuPayload): Promise<BackendMenu> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create menu");
  }
  const data = await res.json();
  return data.data;
}

/** Update a menu */
export async function updateBackendMenu(
  token: string,
  restaurantId: string,
  menuId: string,
  updates: Partial<CreateMenuPayload>,
): Promise<BackendMenu> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus/${menuId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update menu");
  }
  const data = await res.json();
  return data.data;
}

/** Delete a menu */
export async function deleteBackendMenu(token: string, restaurantId: string, menuId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus/${menuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to delete menu");
  }
}

/** Get complete menu (nested categories, items, pages) */
export async function fetchCompleteMenu(token: string, restaurantId: string, menuId: string) {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus/${menuId}/complete`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch complete menu");
  const data = await res.json();
  return data.data;
}

/** Bulk publish — single request to replace all categories, items, and pages */
export async function bulkPublishMenu(
  token: string,
  restaurantId: string,
  menuId: string,
  payload: {
    title: string;
    subtitle?: string;
    template_id?: string;
    status: string;
    categories: {
      id: string;
      name: string;
      items: {
        name: string;
        price: number;
        description?: string;
        featured?: boolean;
      }[];
    }[];
    pages: { variant_id: string; category_ids: string[] }[];
    thumbnail?: string;
  }
): Promise<{ categoryIdMap: Record<string, string> }> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/menus/${menuId}/bulk`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to publish menu");
  }

  const data = await res.json();
  return data.data;
}
