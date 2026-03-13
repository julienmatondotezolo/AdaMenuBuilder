import { API_URL } from '../config/api';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

export interface PublishStatus {
  [restaurantId: string]: {
    id: string;
    is_default: boolean;
    updated_at: string;
  };
}

/** Fetch restaurants the user has access to (via menu backend) */
export async function fetchRestaurants(token: string): Promise<Restaurant[]> {
  const res = await fetch(`${API_URL}/api/v1/restaurants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch restaurants');
  const data = await res.json();
  return data.restaurants || [];
}

/** Fetch publish status of a template by name across all restaurants */
export async function fetchPublishStatus(token: string, templateName: string): Promise<PublishStatus> {
  const res = await fetch(`${API_URL}/api/v1/templates/publish-status?name=${encodeURIComponent(templateName)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data.status || {};
}

/** Publish a template to a restaurant */
export async function publishTemplate(
  token: string,
  restaurantId: string,
  payload: {
    name: string;
    description?: string;
    thumbnail?: string;
    project_json: Record<string, unknown>;
    is_default?: boolean;
    published_by?: string;
  }
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to publish template');
  }
}

/** Update an existing published template */
export async function updatePublishedTemplate(
  token: string,
  restaurantId: string,
  templateId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/templates/${templateId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update template');
  }
}

/** Unpublish (delete) a template from a restaurant */
export async function unpublishTemplate(
  token: string,
  restaurantId: string,
  templateId: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/templates/${templateId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to unpublish template');
  }
}

/** Set or unset default flag on a published template */
export async function setTemplateDefault(
  token: string,
  restaurantId: string,
  templateId: string,
  isDefault: boolean
): Promise<void> {
  if (isDefault) {
    const res = await fetch(`${API_URL}/api/v1/restaurants/${restaurantId}/templates/${templateId}/set-default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to set default');
    }
  } else {
    await updatePublishedTemplate(token, restaurantId, templateId, { is_default: false });
  }
}
