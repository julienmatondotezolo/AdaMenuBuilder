import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "ada-design-system";
import { db } from "../db/dexie";
import type { MenuData } from "../types/menu";
import type { WebLayout, ColorScheme, FontScheme, QrOrderConfig } from "../types/template";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import { API_URL } from "../config/api";

interface QrMenuData {
  menuData: MenuData;
  webLayout: WebLayout;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName: string;
  qrOrderConfig?: QrOrderConfig;
}

/**
 * Public QR menu viewer — no auth required.
 * Loads menu + template and renders the QR ordering experience.
 * First tries local IndexedDB, falls back to backend API.
 */
export default function QrMenuViewer() {
  const { menuId } = useParams<{ menuId: string }>();
  const [data, setData] = useState<QrMenuData | null>(null);
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
          const localTemplate = await db.templates.get(localMenu.templateId);
          if (localTemplate) {
            const webLayout = localTemplate.webLayoutQr || localTemplate.webLayoutMobile;
            if (webLayout) {
              setData({
                menuData: localMenu.data,
                webLayout,
                colors: localTemplate.colors,
                fonts: localTemplate.fonts,
                templateName: localTemplate.name,
                qrOrderConfig: localTemplate.qrOrderConfig,
              });
              setLoading(false);
              return;
            }
          }
        }

        // Fall back to backend API (for public access)
        const res = await fetch(`${API_URL}/api/v1/public/menus/${menuId}`);
        if (!res.ok) {
          setError("Menu not found.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        const menu = json.data?.menu;
        const tpl = json.data?.template;

        if (!menu || !tpl) {
          setError("Menu not found.");
          setLoading(false);
          return;
        }

        const webLayout = tpl.webLayoutQr || tpl.webLayoutMobile;
        if (!webLayout) {
          setError("This menu doesn't have a web layout configured.");
          setLoading(false);
          return;
        }

        setData({
          menuData: menu.data,
          webLayout,
          colors: tpl.colors,
          fonts: tpl.fonts,
          templateName: tpl.name || menu.title || "Menu",
          qrOrderConfig: tpl.qrOrderConfig,
        });
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

  if (error || !data) {
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

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <WebMenuRenderer
        webLayout={data.webLayout}
        menuData={data.menuData}
        colors={data.colors}
        fonts={data.fonts}
        templateName={data.templateName}
        mode="mobile"
        qrOrderConfig={data.qrOrderConfig}
        fullscreen
      />
    </div>
  );
}
