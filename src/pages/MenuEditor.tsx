import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toPng } from "html-to-image";
import { ArrowLeft, Loader2, X, FileText, Smartphone, Monitor, Copy, Check, Code } from "lucide-react";
import { Button, Label, cn } from "ada-design-system";
import { QRCodeSVG } from "qrcode.react";
import { useTemplateById } from "../db/hooks";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
import { db, type MenuDraft } from "../db/dexie";
import Header from "../components/Header";
import EditorPanel from "../components/Editor/EditorPanel";
import AIChatPanel from "../components/Editor/AIChatPanel";
import PreviewPanel, { type PreviewMode } from "../components/Preview/PreviewPanel";
import PublishDiffPopup from "../components/Preview/PublishDiffPopup";
import WebMenuRenderer from "../components/Preview/WebMenuRenderer";
import DeviceMockup from "../components/Preview/DeviceMockup";
import MenuPreview from "../components/Preview/MenuPreview";
import { fetchCompleteMenu, bulkPublishMenu, type BackendMenu } from "../services/menuApi";
import { syncTemplatesFromBackend } from "../services/templateSync";
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
  const [_backendMenu, setBackendMenu] = useState<BackendMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showDiffPopup, setShowDiffPopup] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [previousMenuData, setPreviousMenuData] = useState<MenuData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("paper");
  const initialized = useRef(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Live-query the template
  const template = useTemplateById(templateId || undefined);

  // Sync templates from backend if template is missing locally
  const templateSynced = useRef(false);
  useEffect(() => {
    if (!templateId || template || !token || templateSynced.current) return;
    templateSynced.current = true;

    // First check if any local template has this as a remoteId
    async function resolveTemplate() {
      const allTemplates = await db.templates.toArray();
      const match = allTemplates.find((t) =>
        t.remoteIds && Object.values(t.remoteIds).includes(templateId!)
      );
      if (match) {
        setTemplateId(match.id);
        return;
      }

      // Not found locally — sync from backend then try again
      await syncTemplatesFromBackend(token!);
      const synced = await db.templates.toArray();
      const syncedMatch = synced.find((t) =>
        t.remoteIds && Object.values(t.remoteIds).includes(templateId!)
      );
      if (syncedMatch) {
        setTemplateId(syncedMatch.id);
      }
    }

    resolveTemplate().catch(() => {});
  }, [templateId, template, token, setTemplateId]);

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

          // Still fetch backend menu for metadata + snapshot for diff
          try {
            const data = await fetchCompleteMenu(token!, restaurantId, id!);
            setBackendMenu(data);
            setPreviousMenuData(buildMenuData(data));
          } catch {}
          return;
        }

        // No local draft — fetch from backend
        const data = await fetchCompleteMenu(token!, restaurantId, id!);
        setBackendMenu(data);

        const built = buildMenuData(data);
        setPreviousMenuData(built);
        setMenuData(built);

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

  // Open diff popup before publishing
  const handlePublish = useCallback(() => {
    if (!id || !token || !restaurantId) return;
    setShowDiffPopup(true);
  }, [id, token, restaurantId]);

  // Capture a small thumbnail from the hidden off-screen preview
  const captureThumbnail = useCallback(async (): Promise<string | undefined> => {
    const container = thumbnailRef.current;
    const el = container?.querySelector<HTMLElement>("[data-menu-preview]");
    if (!el) return undefined;
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 0.5,
        cacheBust: true,
        skipFonts: true,
        filter: (node: HTMLElement) => {
          if (node instanceof HTMLElement && node.classList?.contains("pointer-events-none") && node.style?.outline) return false;
          return true;
        },
      });
      // Downscale to a small JPEG via canvas for smaller payload
      return new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 400;
          const scale = maxW / img.width;
          canvas.width = maxW;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = dataUrl;
      });
    } catch {
      return undefined;
    }
  }, []);

  // Actually publish after user confirms in diff popup
  const handleConfirmPublish = useCallback(async () => {
    if (!id || !token || !restaurantId) return;
    setPublishing(true);
    try {
      // Capture thumbnail before publishing
      const thumbnail = await captureThumbnail();

      // Use remote template ID for cross-machine compatibility
      const remoteTemplateId = template?.remoteIds?.[restaurantId] || templateId || undefined;

      const result = await bulkPublishMenu(token, restaurantId, id, {
        title: menuData.title,
        subtitle: menuData.subtitle || undefined,
        template_id: remoteTemplateId,
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
        thumbnail,
      });

      // Update local state with new backend category IDs
      const idMap = result.categoryIdMap;
      const updatedMenuData: MenuData = {
        ...menuData,
        categories: menuData.categories.map((cat) => ({
          ...cat,
          id: idMap[cat.id] || cat.id,
        })),
      };
      setMenuData(updatedMenuData);
      setPreviousMenuData(updatedMenuData);

      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          categoryIds: p.categoryIds.map((oldId) => idMap[oldId] || oldId),
        }))
      );

      // Clear local draft after successful publish
      await db.drafts.delete(id);
      setLastSaved(new Date().toISOString());
      setShowDiffPopup(false);
      setShowPublishSuccess(true);
    } catch (err: any) {
      alert(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }, [id, token, restaurantId, menuData, pages, templateId, captureThumbnail]);

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

      {/* Publish diff popup */}
      {showDiffPopup && (
        <PublishDiffPopup
          previousMenu={previousMenuData}
          currentMenu={menuData}
          onConfirm={handleConfirmPublish}
          onCancel={() => setShowDiffPopup(false)}
          publishing={publishing}
        />
      )}

      {/* Publish success popup */}
      {showPublishSuccess && id && (
        <PublishSuccessPopup
          menuId={id}
          primaryColor={template?.colors?.primary || "#4d6aff"}
          onClose={() => setShowPublishSuccess(false)}
        />
      )}

      {/* Hidden off-screen MenuPreview for thumbnail capture */}
      {template && (
        <div
          ref={thumbnailRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: `${mmToPx(template.format.width)}px`,
            pointerEvents: "none",
          }}
        >
          <MenuPreview template={template} />
        </div>
      )}
    </div>
  );
}

// ── Publish success popup ────────────────────────────────────────────────────

function PublishSuccessPopup({
  menuId,
  primaryColor,
  onClose,
}: {
  menuId: string;
  primaryColor: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const qrUrl = `${window.location.origin}/qr/${menuId}`;
  const embedUrl = `${window.location.origin}/embed/${menuId}`;
  const embedCode = `<iframe src="${embedUrl}" style="width:100%;height:600px;border:none;border-radius:8px;" allow="fullscreen" loading="lazy"></iframe>`;

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Menu Published</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your menu is now live and accessible
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="bg-white rounded-xl p-5"
              style={{ border: `2px solid ${primaryColor}20` }}
            >
              <QRCodeSVG
                value={qrUrl}
                size={180}
                level="H"
                fgColor={primaryColor}
                bgColor="#ffffff"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan to view your menu
            </p>
          </div>

          {/* QR URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Menu URL</Label>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg border border-border px-3 py-2.5">
              <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
                {qrUrl}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 shrink-0"
                onClick={() => handleCopy(qrUrl, setCopied)}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Embed</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Embed code */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Code className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">Embed on your website</Label>
            </div>
            <div className="relative bg-muted/30 rounded-lg border border-border px-3 py-2.5">
              <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all leading-relaxed pr-8">
                {embedCode}
              </pre>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 h-7 w-7 shrink-0"
                onClick={() => handleCopy(embedCode, setCopiedEmbed)}
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Paste this code into your website. The menu automatically adapts to mobile and desktop screens.
            </p>
          </div>
        </div>
      </div>
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

function getLocalizedDescription(descriptions: { language: string; description: string }[], lang = "en"): string {
  if (!descriptions || descriptions.length === 0) return "";
  const match = descriptions.find((d) => d.language === lang);
  return match?.description || descriptions[0]?.description || "";
}

function mapBackendItem(item: any) {
  return {
    id: item.id,
    name: getLocalizedName(item.names),
    price: parseFloat(item.price) || 0,
    description: getLocalizedDescription(item.descriptions, "en"),
    featured: item.featured || false,
  };
}

function buildMenuData(data: any): MenuData {
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

  return {
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
  };
}
