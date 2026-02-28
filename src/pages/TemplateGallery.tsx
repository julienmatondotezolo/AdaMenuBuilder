import { useState, useRef } from "react";
import { uid } from "../utils/uid";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  MoreVertical,
  Copy,
  Trash2,
  Pencil,
  Lock,
  LayoutTemplate,
  Download,
  Upload,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  SkeletonCard,
  cn,
} from "ada-design-system";
import { useTemplates, deleteTemplate, duplicateTemplate, createTemplate, downloadTemplate, importTemplateFromFile } from "../db/hooks";
import type { MenuTemplate, PageFormat } from "../types/template";
import { PAGE_FORMATS } from "../types/template";

const DEFAULT_COLORS = {
  primary: "hsl(232 80% 62%)",
  background: "#ffffff",
  text: "hsl(224 71% 4%)",
  accent: "hsl(232 80% 62%)",
  muted: "hsl(220 9% 46%)",
};

const DEFAULT_SPACING = {
  marginTop: 48, marginBottom: 24, marginLeft: 32, marginRight: 32, categoryGap: 40, itemGap: 24,
};

const DEFAULT_PAGE_VARIANT = {
  id: "content",
  name: "Content",
  header: { show: true, style: "centered" as const, showSubtitle: true, showEstablished: true, showDivider: true },
  body: { columns: 1, categoryStyle: "lines" as const, itemAlignment: "center" as const, pricePosition: "below" as const, separatorStyle: "line" as const, showDescriptions: true, showFeaturedBadge: true },
  highlight: { show: false, position: "none" as const, height: 200, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 },
};

const FORMAT_PREVIEWS: Record<string, { w: number; h: number }> = {
  A4: { w: 28, h: 40 },
  A5: { w: 24, h: 36 },
  DL: { w: 18, h: 38 },
  LONG: { w: 20, h: 54 },
  CUSTOM: { w: 26, h: 38 },
};

export default function TemplateGallery() {
  const templates = useTemplates();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState<string>("A4");
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const format: PageFormat = newFormat === "CUSTOM"
      ? { type: "CUSTOM", width: 210, height: 297 }
      : PAGE_FORMATS[newFormat as keyof typeof PAGE_FORMATS];

    const now = new Date().toISOString();
    const template: MenuTemplate = {
      id: `tpl-${uid()}`,
      name: newName.trim(),
      description: "",
      isBuiltIn: false,
      format,
      orientation: "portrait",
      colors: DEFAULT_COLORS,
      fonts: { heading: "serif", body: "sans-serif" },
      spacing: DEFAULT_SPACING,
      pageVariants: [{ ...DEFAULT_PAGE_VARIANT, id: `var-${uid()}` }],
      createdAt: now,
      updatedAt: now,
    };
    await createTemplate(template);
    setShowCreate(false);
    setNewName("");
    navigate(`/templates/${template.id}/edit`);
  };

  const handleDuplicate = async (id: string) => {
    setOpenDropdown(null);
    await duplicateTemplate(id);
  };

  const handleDelete = async (id: string) => {
    setOpenDropdown(null);
    try {
      if (confirm("Delete this template?")) await deleteTemplate(id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cannot delete");
    }
  };

  const handleExport = async (id: string) => {
    setOpenDropdown(null);
    await downloadTemplate(id);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const tpl = await importTemplateFromFile(file);
      navigate(`/templates/${tpl.id}/edit`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Import failed");
    }
    // Reset input so same file can be imported again
    if (importInputRef.current) importInputRef.current.value = "";
  };

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <LayoutTemplate className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Templates</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.adamenu-template.json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </header>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>Choose a name and page format for your template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Elegant Bistro"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Page Format</Label>
              <div className="grid grid-cols-5 gap-2">
                {(["A4", "A5", "DL", "LONG", "CUSTOM"] as const).map((fmt) => {
                  const isSelected = newFormat === fmt;
                  const dims = fmt !== "CUSTOM" ? PAGE_FORMATS[fmt] : null;
                  const preview = FORMAT_PREVIEWS[fmt];
                  return (
                    <button
                      key={fmt}
                      onClick={() => setNewFormat(fmt)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-center",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                      )}
                    >
                      <div
                        className={cn("border-2 rounded-sm transition-colors", isSelected ? "border-primary bg-primary/10" : "border-border bg-white")}
                        style={{ width: preview.w, height: preview.h }}
                      />
                      <span className={cn("text-xs font-semibold", isSelected && "text-primary")}>{fmt}</span>
                      {dims && <span className="text-[9px] text-muted-foreground">{dims.width}×{dims.height}mm</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate}>Create Template</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!templates ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                isDropdownOpen={openDropdown === tpl.id}
                onToggleDropdown={() => setOpenDropdown(openDropdown === tpl.id ? null : tpl.id)}
                onEdit={() => navigate(`/templates/${tpl.id}/edit`)}
                onDuplicate={() => handleDuplicate(tpl.id)}
                onDelete={() => handleDelete(tpl.id)}
                onExport={() => handleExport(tpl.id)}
              />
            ))}

            {/* Create card */}
            <Card
              className="cursor-pointer border-2 border-dashed transition-colors hover:border-primary/40"
              onClick={() => setShowCreate(true)}
            >
              <CardContent className="flex flex-col items-center justify-center gap-3 py-20">
                <Plus className="w-8 h-8 text-muted-foreground/40" />
                <span className="text-sm font-medium text-muted-foreground">New Template</span>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Template Card ───────────────────────────────────────────────────── */

interface TemplateCardProps {
  template: MenuTemplate;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function TemplateCard({ template, isDropdownOpen, onToggleDropdown, onEdit, onDuplicate, onDelete, onExport }: TemplateCardProps) {
  return (
    <Card className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md" onClick={onEdit}>
      {/* Preview — mini page shapes */}
      <div className="h-36 bg-gradient-to-br from-muted/40 to-muted/60 flex items-center justify-center gap-2 px-6">
        {template.pageVariants.slice(0, 4).map((v) => {
          const preview = FORMAT_PREVIEWS[template.format.type] || FORMAT_PREVIEWS.A4;
          return (
            <div
              key={v.id}
              className="bg-white rounded-sm shadow-sm border border-border flex flex-col items-center justify-center p-1"
              style={{ width: preview.w + 8, height: preview.h + 16 }}
            >
              <span className="text-[6px] text-muted-foreground/60 font-medium truncate w-full text-center">{v.name}</span>
            </div>
          );
        })}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate">{template.name}</h3>
              {template.isBuiltIn && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {template.description || `${template.format.type} · ${template.pageVariants.length} page variants`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <Badge variant="secondary">{template.format.type}</Badge>
            <div className="relative">
              <Button variant="ghost" size="icon-sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleDropdown(); }}>
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
                  <button onClick={onExport} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                    <Download className="w-3 h-3" /> Export
                  </button>
                  {!template.isBuiltIn && (
                    <button onClick={onDelete} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
