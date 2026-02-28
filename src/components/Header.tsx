import { useState } from "react";
import {
  Eye,
  Download,
  Rocket,
  Loader2,
  LayoutTemplate,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  Button,
  Badge,
  cn,
} from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";
import { useTemplates } from "../db/hooks";
import type { MenuTemplate } from "../types/template";

interface HeaderProps {
  template?: MenuTemplate;
}

export default function Header({ template }: HeaderProps) {
  const { menuData, orientation, columnCount, layoutDirection, templateId, setTemplateId } = useMenu();
  const [downloading, setDownloading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const templates = useTemplates();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMenuPdf(
        menuData.restaurantName,
        menuData,
        orientation,
        columnCount,
        layoutDirection,
      );
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    setShowTemplatePicker(false);
  };

  return (
    <header className="h-14 flex items-center px-4 bg-background border-b border-border shrink-0 z-20">
      {/* LEFT — Template selector */}
      <div className="flex-1 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-left",
              showTemplatePicker
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            <LayoutTemplate className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground truncate block max-w-[160px]">
                {template?.name || "No template"}
              </span>
              {template && (
                <span className="text-[9px] text-muted-foreground">
                  {template.format.type} · {template.pageVariants.length} variants
                </span>
              )}
            </div>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform",
              showTemplatePicker && "rotate-180"
            )} />
          </button>

          {/* Template dropdown */}
          {showTemplatePicker && templates && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTemplatePicker(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Choose Template
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto py-1">
                  {templates.map((tpl) => {
                    const isActive = tpl.id === templateId;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                          isActive ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                      >
                        {/* Color preview dots */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <div className="w-5 h-5 rounded border border-border/60" style={{ backgroundColor: tpl.colors.background }}>
                            <div className="w-2 h-2 rounded-full mt-1.5 ml-1.5" style={{ backgroundColor: tpl.colors.primary }} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">{tpl.name}</span>
                            <Badge variant="secondary" className="text-[8px] px-1 py-0 shrink-0">{tpl.format.type}</Badge>
                          </div>
                          {tpl.description && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{tpl.description}</p>
                          )}
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CENTER — Menu name */}
      <div className="flex items-center justify-center">
        <span className="font-semibold text-foreground text-sm">
          {menuData.title || "Untitled Menu"}
        </span>
      </div>

      {/* RIGHT — Actions */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloading ? "Generating…" : "Download"}
        </Button>

        <Button size="sm" className="flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Publish
        </Button>
      </div>
    </header>
  );
}
