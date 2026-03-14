import { API_URL } from "../config/api";

interface PublishMenuPayload {
  menu_id: string;
  restaurant_id: string;
  title: string;
  menu_data: Record<string, unknown>;
  template_data: Record<string, unknown>;
}

export async function publishMenu(token: string, payload: PublishMenuPayload) {
  const res = await fetch(`${API_URL}/api/v1/menus/publish`, {
    method: "POST",
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

  return res.json();
}

export async function unpublishMenu(token: string, menuId: string) {
  const res = await fetch(`${API_URL}/api/v1/menus/${menuId}/unpublish`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to unpublish menu");
  }
}

export async function getPublishStatus(token: string, menuId: string): Promise<{ published: boolean; updatedAt?: string; menuData?: Record<string, unknown> }> {
  const res = await fetch(`${API_URL}/api/v1/menus/${menuId}/publish-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to check publish status");
  }

  const json = await res.json();
  return {
    published: json.published,
    updatedAt: json.data?.updated_at,
    menuData: json.data?.menu_data || undefined,
  };
}
