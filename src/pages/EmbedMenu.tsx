import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { MenuData } from "../types/menu";
import type { WebLayout, ColorScheme, FontScheme } from "../types/template";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import { useTranslation } from "../i18n";
import { API_URL } from "../config/api";

interface EmbedData {
  menuData: MenuData;
  webLayoutMobile?: WebLayout;
  webLayoutDesktop?: WebLayout;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName: string;
}

/**
 * Public embed page — no auth, no chrome.
 * Fetches published menu from the public API and renders the web layout.
 * Responsive: desktop layout on wide screens, mobile layout on narrow.
 */
export default function EmbedMenu() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<EmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Track viewport for responsive layout switching
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!menuId) {
      setError("No menu ID provided.");
      setLoading(false);
      return;
    }

    async function loadMenu() {
      try {
        const res = await fetch(`${API_URL}/api/v1/public/menus/${menuId}`);
        if (!res.ok) {
          setError("Menu not found or not published.");
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

        if (!tpl.webLayoutMobile && !tpl.webLayoutDesktop) {
          setError("This menu doesn't have a web layout configured.");
          setLoading(false);
          return;
        }

        setData({
          menuData: menu.data,
          webLayoutMobile: tpl.webLayoutMobile,
          webLayoutDesktop: tpl.webLayoutDesktop,
          colors: tpl.colors,
          fonts: tpl.fonts,
          templateName: tpl.name || menu.title || "Menu",
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#888", fontSize: 14 }}>Loading menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#888", fontSize: 14 }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Pick the right layout based on viewport, with fallback
  const mode = isMobile ? "mobile" : "desktop";
  const activeLayout = isMobile
    ? (data.webLayoutMobile || data.webLayoutDesktop)
    : (data.webLayoutDesktop || data.webLayoutMobile);

  if (!activeLayout) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#888", fontSize: 14 }}>No layout available for this view.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", overflow: "auto" }}>
      <WebMenuRenderer
        webLayout={activeLayout}
        menuData={data.menuData}
        colors={data.colors}
        fonts={data.fonts}
        templateName={data.templateName}
        mode={mode}
        fullscreen
        t={t}
      />
    </div>
  );
}
