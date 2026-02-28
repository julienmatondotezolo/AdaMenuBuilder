import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "ada-design-system";
import { useMenuById, updateMenu } from "../db/hooks";
import { useMenu } from "../context/MenuContext";
import Header from "../components/Header";
import EditorPanel from "../components/Editor/EditorPanel";
import PreviewPanel from "../components/Preview/PreviewPanel";

export default function MenuEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const menu = useMenuById(id);
  const { menuData, setMenuData } = useMenu();

  // Load menu data from IndexedDB into context
  useEffect(() => {
    if (menu) {
      setMenuData(menu.data);
    }
  }, [menu?.id]);

  // Auto-save back to IndexedDB when menuData changes
  useEffect(() => {
    if (!id || !menu) return;
    const timeout = setTimeout(() => {
      updateMenu(id, { data: menuData });
    }, 500);
    return () => clearTimeout(timeout);
  }, [menuData, id]);

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
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Editor Panel — same width as original develop branch */}
        <div className="w-[440px] shrink-0 border-r border-gray-200 bg-white">
          <EditorPanel />
        </div>

        {/* Preview */}
        <div className="flex-1 min-w-0 relative">
          <PreviewPanel />
        </div>
      </main>
    </div>
  );
}
