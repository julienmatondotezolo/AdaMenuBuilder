import { useState } from "react";
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
} from "lucide-react";
import { Button, Badge } from "ada-design-system";
import { useTemplates, deleteTemplate, duplicateTemplate, createTemplate } from "../db/hooks";
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
  marginTop: 48,
  marginBottom: 24,
  marginLeft: 32,
  marginRight: 32,
  categoryGap: 40,
  itemGap: 24,
};

const DEFAULT_PAGE_VARIANT = {
  id: "content",
  name: "Content",
  header: { show: true, style: "centered" as const, showSubtitle: true, showEstablished: true, showDivider: true },
  body: { columns: 1, categoryStyle: "lines" as const, itemAlignment: "center" as const, pricePosition: "below" as const, separatorStyle: "line" as const, showDescriptions: true, showFeaturedBadge: true },
  highlight: { show: false, position: "none" as const },
};

export default function TemplateGallery() {
  const templates = useTemplates();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState<string>("A4");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const format: PageFormat = newFormat === "CUSTOM"
      ? { type: "CUSTOM", width: 210, height: 297 }
      : PAGE_FORMATS[newFormat as keyof typeof PAGE_FORMATS];

    const now = new Date().toISOString();
    const template: MenuTemplate = {
      id: `tpl-${crypto.randomUUID()}`,
      name: newName.trim(),
      description: "",
      isBuiltIn: false,
      format,
      orientation: "portrait",
      colors: DEFAULT_COLORS,
      fonts: { heading: "serif", body: "sans-serif" },
      spacing: DEFAULT_SPACING,
      pageVariants: [{ ...DEFAULT_PAGE_VARIANT, id: `var-${crypto.randomUUID()}` }],
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <LayoutTemplate className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Templates</h1>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Create dialog */}
        {showCreate && (
          <div className="mb-8 p-6 rounded-xl border border-border bg-card">
            <h2 className="text-sm font-bold text-foreground mb-4">Create New Template</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Elegant Bistro"
                  className="w-full h-10 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground outline-none px-3"
                  style={{ border: "1px solid hsl(220 13% 91%)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Page Format</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["A4", "A5", "DL", "LONG", "CUSTOM"] as const).map((fmt) => {
                    const isSelected = newFormat === fmt;
                    const dims = fmt !== "CUSTOM" ? PAGE_FORMATS[fmt] : null;
                    return (
                      <button
                        key={fmt}
                        onClick={() => setNewFormat(fmt)}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors text-center"
                        style={{
                          borderColor: isSelected ? "hsl(232 80% 62%)" : "hsl(220 13% 91%)",
                          backgroundColor: isSelected ? "hsl(232 80% 62% / 0.05)" : "",
                        }}
                      >
                        {/* Mini page preview */}
                        <div
                          className="border rounded-sm"
                          style={{
                            width: fmt === "DL" ? 18 : fmt === "LONG" ? 20 : fmt === "A5" ? 24 : 28,
                            height: fmt === "DL" ? 38 : fmt === "LONG" ? 54 : fmt === "A5" ? 36 : 40,
                            borderColor: isSelected ? "hsl(232 80% 62%)" : "hsl(220 13% 91%)",
                            backgroundColor: isSelected ? "hsl(232 80% 62% / 0.1)" : "white",
                          }}
                        />
                        <span className="text-xs font-semibold" style={{ color: isSelected ? "hsl(232 80% 62%)" : "" }}>{fmt}</span>
                        {dims && (
                          <span className="text-[9px] text-muted-foreground">
                            {dims.width}×{dims.height}mm
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleCreate}>Create</Button>
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        {/* Template grid */}
        {!templates ? (
          <div className="text-center py-20 text-muted-foreground">Loading...</div>
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
              />
            ))}

            {/* Create card */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border bg-card/50 transition-colors"
              style={{ minHeight: "220px" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(232 80% 62%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
            >
              <Plus className="w-8 h-8 text-muted-foreground/40" />
              <span className="text-sm font-medium text-muted-foreground">New Template</span>
            </button>
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
}

function TemplateCard({ template, isDropdownOpen, onToggleDropdown, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  return (
    <div
      className="relative rounded-xl border border-border bg-card overflow-hidden transition-shadow cursor-pointer"
      style={{ minHeight: "220px" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
      onClick={onEdit}
    >
      {/* Template preview — mini page shapes */}
      <div className="h-36 bg-gradient-to-br from-muted/40 to-muted/60 flex items-center justify-center gap-2 px-6">
        {template.pageVariants.slice(0, 4).map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-sm shadow-sm border border-border flex flex-col items-center justify-center p-1"
            style={{
              width: template.format.type === "DL" ? 28 : template.format.type === "LONG" ? 30 : 36,
              height: template.format.type === "DL" ? 60 : template.format.type === "LONG" ? 80 : template.format.type === "A5" ? 52 : 56,
            }}
          >
            <span className="text-[6px] text-muted-foreground/60 font-medium truncate w-full text-center">{v.name}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="p-4">
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
            <Badge
              className="text-[10px] px-1.5 py-0 rounded-full"
              style={{ backgroundColor: "hsl(220 14% 96%)", color: "hsl(220 9% 46%)" }}
            >
              {template.format.type}
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
                  {!template.isBuiltIn && (
                    <button
                      onClick={onDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                      style={{ color: "hsl(0 84% 60%)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "hsl(0 84% 60% / 0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
