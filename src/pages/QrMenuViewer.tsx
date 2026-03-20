import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Spinner } from "ada-design-system";
import { db } from "../db/dexie";
import type { MenuData } from "../types/menu";
import type { WebLayout, ColorScheme, FontScheme, QrOrderConfig } from "../types/template";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import { useTranslation } from "../i18n";
import { API_URL } from "../config/api";

interface QrMenuData {
  menuData: MenuData;
  webLayout: WebLayout;
  colors: ColorScheme;
  fonts: FontScheme;
  templateName: string;
  qrOrderConfig?: QrOrderConfig;
  restaurantId?: string;
}

/**
 * Public QR menu viewer — no auth required.
 * Loads menu + template and renders the QR ordering experience.
 * First tries local IndexedDB, falls back to backend API.
 */
export default function QrMenuViewer() {
  const { menuId } = useParams<{ menuId: string }>();
  const [searchParams] = useSearchParams();
  const rawTable = searchParams.get("table")?.trim();
  const tableNumber = rawTable || undefined;
  const { t } = useTranslation();
  const [data, setData] = useState<QrMenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuId) {
      setError("no_id");
      setLoading(false);
      return;
    }

    if (!tableNumber) {
      setError("no_table");
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
                restaurantId: (localMenu as any).restaurantId,
              });
              setLoading(false);
              return;
            }
          }
        }

        // Fall back to backend API (for public access)
        const res = await fetch(`${API_URL}/api/v1/public/menus/${menuId}`);
        if (!res.ok) {
          setError("not_found");
          setLoading(false);
          return;
        }
        const json = await res.json();
        const menu = json.data?.menu;
        const tpl = json.data?.template;

        if (!menu || !tpl) {
          setError("not_found");
          setLoading(false);
          return;
        }

        const webLayout = tpl.webLayoutQr || tpl.webLayoutMobile;
        if (!webLayout) {
          setError("no_layout");
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
          restaurantId: menu.restaurantId,
        });
      } catch {
        setError("failed");
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
    const isNoTable = error === "no_table";
    const errorMessage = isNoTable
      ? t("qrMenu.noTableSelected")
      : error === "no_layout"
        ? t("qrMenu.noWebLayout")
        : error === "failed"
          ? t("qrMenu.failedToLoad")
          : t("qrMenu.menuNotFound");

    const subtitle = isNoTable
      ? t("qrMenu.scanTableQr")
      : t("qrMenu.menuUnavailable");

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#fafafa", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          {isNoTable && (
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M12 7h.01M12 12h.01M17 7h.01M17 12h.01M7 17h.01M12 17h.01M17 17h.01" />
              </svg>
            </div>
          )}
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#333" }}>
            {errorMessage}
          </h2>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.5 }}>
            {subtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden" }}>
      <WebMenuRenderer
        webLayout={data.webLayout}
        menuData={data.menuData}
        colors={data.colors}
        fonts={data.fonts}
        templateName={data.templateName}
        mode="mobile"
        qrOrderConfig={data.qrOrderConfig}
        menuId={menuId}
        restaurantId={data.restaurantId}
        tableNumber={tableNumber}
        fullscreen
        t={t}
      />
    </div>
  );
}
