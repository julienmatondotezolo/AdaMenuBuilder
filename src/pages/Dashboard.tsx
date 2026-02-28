import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MoreVertical,
  FileText,
  Copy,
  Trash2,
  Pencil,
  LayoutTemplate,
} from "lucide-react";
import { Button, Badge } from "ada-design-system";
import { useMenus, useTemplates, deleteMenu, duplicateMenu, createMenu } from "../db/hooks";
import type { Menu, MenuData } from "../types/menu";

const emptyMenuData: MenuData = {
  title: "",
  restaurantName: "",
  subtitle: "",
  established: "",
  highlightImage: "",
  highlightLabel: "",
  highlightTitle: "",
  lastEditedBy: "",
  lastEditedTime: "",
  categories: [],
};

export default function Dashboard() {
  const menus = useMenus();
  const templates = useTemplates();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const handleCreateMenu = async () => {
    if (!newTitle.trim() || !selectedTemplateId) return;
    const template = templates?.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    const now = new Date().toISOString();
    const menu: Menu = {
      id: `menu-${crypto.randomUUID()}`,
      title: newTitle.trim(),
      templateId: selectedTemplateId,
      status: "draft",
      data: { ...emptyMenuData, title: newTitle.trim() },
      pages: [
        { id: `page-${crypto.randomUUID()}`, variantId: template.pageVariants[0]?.id || "cover", categoryIds: [] },
      ],
      createdAt: now,
      updatedAt: now,
    };
    await createMenu(menu);
    setShowNewMenu(false);
    setNewTitle("");
    navigate(`/menus/${menu.id}/edit`);
  };

  const handleDuplicate = async (id: string) => {
    setOpenDropdown(null);
    await duplicateMenu(id);
  };

  const handleDelete = async (id: string) => {
    setOpenDropdown(null);
    if (confirm("Delete this menu? This cannot be undone.")) {
      await deleteMenu(id);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">My Menus</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/templates")}
            className="flex items-center gap-2"
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedTemplateId(templates?.[0]?.id || "");
              setShowNewMenu(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Menu
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* New menu dialog */}
        {showNewMenu && (
          <div className="mb-8 p-6 rounded-xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-4">Create New Menu</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Menu Title</label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Summer Dinner Menu"
                  className="w-full h-10 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateMenu()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full h-10 rounded-lg text-sm bg-background text-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                >
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.format.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleCreateMenu}>Create</Button>
                <Button variant="outline" size="sm" onClick={() => setShowNewMenu(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Menu grid */}
        {!menus ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
        ) : menus.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No menus yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Create your first menu to get started</p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => {
                setSelectedTemplateId(templates?.[0]?.id || "");
                setShowNewMenu(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                templateName={templates?.find((t) => t.id === menu.templateId)?.name}
                isDropdownOpen={openDropdown === menu.id}
                onToggleDropdown={() => setOpenDropdown(openDropdown === menu.id ? null : menu.id)}
                onEdit={() => navigate(`/menus/${menu.id}/edit`)}
                onDuplicate={() => handleDuplicate(menu.id)}
                onDelete={() => handleDelete(menu.id)}
                formatDate={formatDate}
              />
            ))}

            {/* Create new card */}
            <button
              onClick={() => {
                setSelectedTemplateId(templates?.[0]?.id || "");
                setShowNewMenu(true);
              }}
              className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border bg-card/50 transition-colors"
              style={{ minHeight: "200px" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(232 80% 62%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
            >
              <Plus className="w-8 h-8 text-muted-foreground/40" />
              <span className="text-sm font-medium text-muted-foreground">New Menu</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Menu Card ───────────────────────────────────────────────────────── */

interface MenuCardProps {
  menu: Menu;
  templateName?: string;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}

function MenuCard({ menu, templateName, isDropdownOpen, onToggleDropdown, onEdit, onDuplicate, onDelete, formatDate }: MenuCardProps) {
  return (
    <div
      className="relative rounded-xl border border-border bg-card overflow-hidden transition-shadow cursor-pointer"
      style={{ minHeight: "200px" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
      onClick={onEdit}
    >
      {/* Preview area */}
      <div className="h-32 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[8px] tracking-[0.3em] text-primary/60 uppercase font-semibold">
            {menu.data.subtitle || "MENU"}
          </p>
          <p className="text-lg font-light italic text-foreground/70 mt-1">
            {menu.data.restaurantName || menu.title}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground truncate">{menu.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {templateName && <span>{templateName} · </span>}
              {formatDate(menu.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Badge
              className="text-[10px] px-1.5 py-0"
              style={
                menu.status === "published"
                  ? { backgroundColor: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }
                  : { backgroundColor: "hsl(220 14% 96%)", color: "hsl(220 9% 46%)" }
              }
            >
              {menu.status === "published" ? "Published" : "Draft"}
            </Badge>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleDropdown(); }}
                className="p-1 rounded-md transition-colors text-muted-foreground"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220 14% 96%)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isDropdownOpen && (
                <div
                  className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-border bg-card shadow-lg py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={onEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220 14% 96%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={onDuplicate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(220 14% 96%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                  >
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                    style={{ color: "hsl(0 84% 60%)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-muted-foreground/60">
            {menu.data.categories.length} categories · {menu.data.categories.reduce((sum, c) => sum + c.items.length, 0)} items · {menu.pages.length} {menu.pages.length === 1 ? "page" : "pages"}
          </span>
        </div>
      </div>
    </div>
  );
}
