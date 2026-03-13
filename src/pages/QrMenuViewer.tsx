import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "ada-design-system";
import { db } from "../db/dexie";
import type { Menu } from "../types/menu";
import type { MenuTemplate } from "../types/template";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import { API_URL } from "../config/api";

/**
 * Public QR menu viewer — no auth required.
 * Loads menu + template and renders the QR ordering experience.
 * First tries local IndexedDB, falls back to backend API.
 */
export default function QrMenuViewer() {
  const { menuId } = useParams<{ menuId: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [template, setTemplate] = useState<MenuTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuId) {
      setError("No menu ID provided.");
      setLoading(false);
      return;
    }

    async function loadMenu() {
      try {
        // Try local IndexedDB first
        const localMenu = await db.menus.get(menuId!);
        if (localMenu) {
          setMenu(localMenu);
          const localTemplate = await db.templates.get(localMenu.templateId);
          if (localTemplate) {
            setTemplate(localTemplate);
            setLoading(false);
            return;
          }
        }

        // Fall back to backend API (for public access)
        const res = await fetch(`${API_URL}/api/v1/public/menus/${menuId}`);
        if (!res.ok) {
          setError("Menu not found.");
          setLoading(false);
          return;
        }
        const { data } = await res.json();
        if (data?.menu) setMenu(data.menu);
        if (data?.template) setTemplate(data.template);
        if (!data?.menu) setError("Menu not found.");
      } catch {
        setError("Failed to load menu.");
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [menuId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#fafafa" }}>
        <Spinner />
      </div>
    );
  }

  if (error || !menu || !template) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#fafafa", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {error || "Menu not found"}
          </h2>
          <p style={{ fontSize: 14, color: "#888" }}>
            This menu may have been removed or is not available.
          </p>
        </div>
      </div>
    );
  }

  const webLayout = template.webLayoutQr || template.webLayoutMobile;
  const qrOrderConfig = template.qrOrderConfig;

  if (!webLayout) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#fafafa", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Menu Preview</h2>
          <p style={{ fontSize: 14, color: "#888" }}>
            This menu doesn't have a web layout configured yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <WebMenuRenderer
        webLayout={webLayout}
        menuData={menu.data}
        colors={template.colors}
        fonts={template.fonts}
        templateName={template.name}
        mode="mobile"
        qrOrderConfig={qrOrderConfig}
      />
    </div>
  );
}
