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
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  SkeletonCard,
} from "ada-design-system";
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
      return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">My Menus</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/templates")}>
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button size="sm" onClick={() => { setSelectedTemplateId(templates?.[0]?.id || ""); setShowNewMenu(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Menu
          </Button>
        </div>
      </header>

      {/* Create menu dialog */}
      <Dialog open={showNewMenu} onOpenChange={setShowNewMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Menu</DialogTitle>
            <DialogDescription>Give your menu a name and choose a template to start.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="menu-title">Menu Title</Label>
              <Input
                id="menu-title"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Summer Dinner Menu"
                onKeyDown={(e) => e.key === "Enter" && handleCreateMenu()}
              />
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.format.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreateMenu}>Create Menu</Button>
              <Button variant="outline" onClick={() => setShowNewMenu(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!menus ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : menus.length === 0 ? (
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No menus yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create your first menu to get started</p>
              <Button size="sm" className="mt-6" onClick={() => { setSelectedTemplateId(templates?.[0]?.id || ""); setShowNewMenu(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Menu
              </Button>
            </CardContent>
          </Card>
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

            {/* New menu card */}
            <Card
              className="cursor-pointer border-2 border-dashed transition-colors hover:border-primary/40"
              onClick={() => { setSelectedTemplateId(templates?.[0]?.id || ""); setShowNewMenu(true); }}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Plus className="w-8 h-8 text-muted-foreground/40" />
                <span className="text-sm font-medium text-muted-foreground">New Menu</span>
              </CardContent>
            </Card>
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
    <Card
      className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
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

      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground truncate">{menu.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {templateName && <span>{templateName} · </span>}
              {formatDate(menu.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Badge variant={menu.status === "published" ? "default" : "secondary"}>
              {menu.status === "published" ? "Published" : "Draft"}
            </Badge>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleDropdown(); }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {isDropdownOpen && (
                <Card className="absolute right-0 top-8 z-50 w-36 py-1 shadow-lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <button onClick={onEdit} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={onDuplicate} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </Card>
              )}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          {menu.data.categories.length} categories · {menu.data.categories.reduce((sum, c) => sum + c.items.length, 0)} items · {menu.pages.length} {menu.pages.length === 1 ? "page" : "pages"}
        </p>
      </CardContent>
    </Card>
  );
}
