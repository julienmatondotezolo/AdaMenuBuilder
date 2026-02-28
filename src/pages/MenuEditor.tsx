import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "ada-design-system";
import { useMenuById, updateMenu, useTemplateById } from "../db/hooks";
import { useMenu } from "../context/MenuContext";
import Header from "../components/Header";
import EditorPanel from "../components/Editor/EditorPanel";
import PreviewPanel from "../components/Preview/PreviewPanel";

export default function MenuEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const menu = useMenuById(id);
  const { menuData, setMenuData, templateId, setTemplateId, pages, setPages } = useMenu();
  const [lastSaved, setLastSaved] = useState<string | undefined>(undefined);

  // Live-query the template — auto-updates when template changes
  const template = useTemplateById(templateId || undefined);

  // Load menu data from IndexedDB into context
  useEffect(() => {
    if (menu) {
      setMenuData(menu.data);
      setTemplateId(menu.templateId);
      setPages(menu.pages);
      setLastSaved(menu.updatedAt);
    }
  }, [menu?.id]);

  // Auto-save back to IndexedDB when menuData or pages change
  useEffect(() => {
    if (!id || !menu) return;
    const timeout = setTimeout(() => {
      const now = new Date().toISOString();
      updateMenu(id, { data: menuData, pages });
      setLastSaved(now);
    }, 500);
    return () => clearTimeout(timeout);
  }, [menuData, pages, id]);

  // Persist templateId changes to IndexedDB
  useEffect(() => {
    if (!id || !menu || !templateId || templateId === menu.templateId) return;
    const now = new Date().toISOString();
    updateMenu(id, { templateId });
    setLastSaved(now);
  }, [templateId, id]);

  if (!menu) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>Loading menu...</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Header template={template} lastSaved={lastSaved} />

      <main className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-[440px] shrink-0 border-r border-gray-200 bg-white">
          <EditorPanel />
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0 relative">
          <PreviewPanel template={template} />
        </div>
      </main>
    </div>
  );
}
