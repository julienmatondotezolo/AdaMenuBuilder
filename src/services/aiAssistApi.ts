import { API_URL } from "../config/api";

export interface AIAction {
  type:
    | "create_category"
    | "update_category"
    | "delete_category"
    | "create_item"
    | "update_item"
    | "delete_item"
    | "update_menu";
  categoryId?: string;
  categoryName?: string;
  itemId?: string;
  name?: string;
  addToPageId?: string;
  item?: {
    name: string;
    price: number;
    description?: string;
    featured?: boolean;
  };
  updates?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  status?: "pending" | "accepted" | "rejected";
}

export interface AIAssistResponse {
  message: string;
  actions: AIAction[];
}

export async function sendAIMessage(
  token: string,
  message: string,
  menuData: unknown,
  menuId?: string,
  pages?: unknown[],
  chatHistory?: ChatMessage[]
): Promise<AIAssistResponse> {
  const res = await fetch(`${API_URL}/api/v1/ai/menu-assist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, menuData, menuId, pages, chatHistory }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "AI request failed" }));
    throw new Error(err.message || "AI request failed");
  }

  return res.json();
}

export async function loadChatHistory(
  token: string,
  menuId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${API_URL}/api/v1/ai/menu-assist/history/${menuId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const { data } = await res.json();
  return (data || []).map((msg: any) => {
    let content = msg.content;

    // Handle legacy assistant messages saved as raw JSON
    if (msg.role === "assistant" && content.startsWith("{")) {
      try {
        const parsed = JSON.parse(content);
        content = parsed.message || content;
      } catch {
        // Not JSON, use as-is
      }
    }

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      content,
      // History messages are display-only — no actions to apply/reject
    };
  });
}

export async function clearChatHistory(
  token: string,
  menuId: string
): Promise<void> {
  await fetch(`${API_URL}/api/v1/ai/menu-assist/history/${menuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
