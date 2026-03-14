import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, X, FileText, Smartphone, Monitor } from "lucide-react";
import { Button, cn } from "ada-design-system";
import { useTemplateById } from "../db/hooks";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
import { db, type MenuDraft } from "../db/dexie";
import Header from "../components/Header";
import EditorPanel from "../components/Editor/EditorPanel";
import AIChatPanel from "../components/Editor/AIChatPanel";
import PreviewPanel, { type PreviewMode } from "../components/Preview/PreviewPanel";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import DeviceMockup from "../components/Preview/DeviceMockup";
import MenuPreview from "../components/Preview/MenuPreview";
import { fetchCompleteMenu, bulkPublishMenu, type BackendMenu } from "../services/menuApi";
import type { MenuData } from "../types/menu";
import type { MenuTemplate } from "../types/template";
import { mmToPx } from "../types/template";

export default function MenuEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const restaurantId = searchParams.get("restaurant") || "";
  const navigate = useNavigate();
  const { token } = useAuth();
  const { menuData, setMenuData, templateId, setTemplateId, pages, setPages, selectItem, aiMode } = useMenu();
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);
  const [backendMenu, setBackendMenu] = useState<BackendMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("paper");
  const initialized = useRef(false);

  // Live-query the template
  const template = useTemplateById(templateId || undefined);

  // Load menu: try local draft first, then backend
  useEffect(() => {
    if (!id || !token || !restaurantId) {
      setError("Missing menu ID or restaurant");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Check for local draft first
        const draft = await db.drafts.get(id!);
        if (draft) {
          setMenuData(draft.data);
          setTemplateId(draft.templateId);
          setPages(draft.pages);
          setLastSaved(draft.updatedAt);
          initialized.current = true;
          setLoading(false);

          // Still fetch backend menu for metadata
          try {
            const data = await fetchCompleteMenu(token!, restaurantId, id!);
            setBackendMenu(data);
          } catch {}
          return;
        }

        // No local draft — fetch from backend
        const data = await fetchCompleteMenu(token!, restaurantId, id!);
        setBackendMenu(data);

        const categories = (data.categories || []).map((cat: any) => ({
          id: cat.id,
          name: getLocalizedName(cat.names),
          items: [
            ...(cat.items || []).map(mapBackendItem),
            ...(cat.subcategories || []).flatMap((sub: any) =>
              (sub.items || []).map(mapBackendItem)
            ),
          ],
        }));

        setMenuData({
          title: data.title || "",
          restaurantName: "",
          subtitle: data.subtitle || "",
          established: "",
          highlightImage: "",
          highlightLabel: "",
          highlightTitle: "",
          lastEditedBy: "",
          lastEditedTime: "",
          categories,
        });

        if (data.template_id) {
          setTemplateId(data.template_id);
        }

        if (data.pages && data.pages.length > 0) {
          setPages(data.pages.map((p: any) => ({
            id: p.id,
            variantId: p.variant_id,
            categoryIds: p.category_ids || [],
          })));
        }

        setLastSaved(data.updated_at);
        initialized.current = true;
      } catch (err: any) {
        setError(err.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, token, restaurantId]);

  // Auto-save draft to IndexedDB on changes
  useEffect(() => {
    if (!initialized.current || !id || !restaurantId) return;
    const timeout = setTimeout(() => {
      const now = new Date().toISOString();
      const draft: MenuDraft = {
        id,
        restaurantId,
        data: menuData,
        pages,
        templateId,
        updatedAt: now,
      };
      db.drafts.put(draft);
      setLastSaved(now);
    }, 500);
    return () => clearTimeout(timeout);
  }, [menuData, pages, templateId, id, restaurantId]);

  // Publish: push all data to backend
  const handlePublish = useCallback(async () => {
    if (!id || !token || !restaurantId) return;
    setPublishing(true);
    try {
      // Single bulk request replaces all categories, items, and pages
      const result = await bulkPublishMenu(token, restaurantId, id, {
        title: menuData.title,
        subtitle: menuData.subtitle || undefined,
        template_id: templateId || undefined,
        status: "published",
        categories: menuData.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          items: cat.items.map((item) => ({
            name: item.name,
            price: item.price,
            description: item.description || undefined,
            featured: item.featured || false,
          })),
        })),
        pages: pages.map((p) => ({
          variant_id: p.variantId,
          category_ids: p.categoryIds,
        })),
      });

      // Update local state with new backend category IDs
      const idMap = result.categoryIdMap;
      setMenuData((prev) => ({
        ...prev,
        categories: prev.categories.map((cat) => ({
          ...cat,
          id: idMap[cat.id] || cat.id,
        })),
      }));

      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          categoryIds: p.categoryIds.map((oldId) => idMap[oldId] || oldId),
        }))
      );

      // Clear local draft after successful publish
      await db.drafts.delete(id);
      setLastSaved(new Date().toISOString());
    } catch (err: any) {
      alert(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }, [id, token, restaurantId, menuData, pages, templateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Full-screen preview overlay
  if (showPreview) {
    return (
      <FullScreenPreview
        previewMode={previewMode}
        onModeChange={setPreviewMode}
        onClose={() => setShowPreview(false)}
        menuData={menuData}
        template={template}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header
        template={template}
        lastSaved={lastSaved}
        onPreview={() => { selectItem(null); setShowPreview(true); }}
        onPublish={handlePublish}
        publishing={publishing}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel — Editor or AI Chat */}
        <div
          className="w-[440px] shrink-0 bg-white"
          style={{ boxShadow: "2px 0 8px rgba(0,0,0,0.06)" }}
        >
          {aiMode ? <AIChatPanel menuId={id} /> : <EditorPanel />}
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0 relative">
          <PreviewPanel
            template={template}
            menuId={id}
            previewData={menuData}
            previewMode={previewMode}
            onPreviewModeChange={setPreviewMode}
          />
        </div>
      </main>
    </div>
  );
}

// ── Full-screen preview ─────────────────────────────────────────────────────

const PREVIEW_MODES = [
  { id: "paper" as PreviewMode, label: "Paper", icon: FileText },
  { id: "mobile" as PreviewMode, label: "Mobile", icon: Smartphone },
  { id: "desktop" as PreviewMode, label: "Desktop", icon: Monitor },
];

function FullScreenPreview({
  previewMode,
  onModeChange,
  onClose,
  menuData,
  template,
}: {
  previewMode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  onClose: () => void;
  menuData: MenuData;
  template?: MenuTemplate;
}) {
  const activeWebLayout =
    previewMode === "desktop"
      ? template?.webLayoutDesktop
      : template?.webLayoutMobile;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with view switcher */}
      <header className="h-12 flex items-center justify-between px-4 bg-background border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Preview: {menuData.title || "Menu"}
        </span>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {PREVIEW_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                previewMode === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Preview content */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-muted p-6">
        {previewMode === "paper" && template && (
          <div
            className="bg-white shadow-xl"
            style={{ width: `${mmToPx(template.format.width)}px` }}
          >
            <MenuPreview template={template} />
          </div>
        )}

        {(previewMode === "mobile" || previewMode === "desktop") && (
          <>
            {activeWebLayout && template ? (
              <DeviceMockup mode={previewMode}>
                <WebMenuRenderer
                  webLayout={activeWebLayout}
                  menuData={menuData}
                  colors={template.colors}
                  fonts={template.fonts}
                  templateName={template.name}
                  mode={previewMode}
                />
              </DeviceMockup>
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No {previewMode} web layout configured.</p>
                <p className="text-xs mt-1">Set it up in the Template Editor first.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocalizedName(names: { language: string; name: string }[], lang = "en"): string {
  if (!names || names.length === 0) return "";
  const match = names.find((n) => n.language === lang);
  return match?.name || names[0]?.name || "";
}

function mapBackendItem(item: any) {
  return {
    id: item.id,
    name: getLocalizedName(item.names),
    price: parseFloat(item.price) || 0,
    description: getLocalizedName(item.descriptions, "en"),
    featured: item.featured || false,
  };
}
