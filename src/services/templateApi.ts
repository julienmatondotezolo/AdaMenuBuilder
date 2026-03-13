import { API_URL } from '../config/api';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
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
