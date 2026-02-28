import { useState, useRef, useEffect } from "react";
import {
  Eye,
  Download,
  Rocket,
  Loader2,
  Pencil,
  Check,
  X,
  Clock,
} from "lucide-react";
import { Button, cn } from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";
import type { MenuTemplate } from "../types/template";

interface HeaderProps {
  template?: MenuTemplate;
  lastSaved?: string; // ISO string
}

export default function Header({ template, lastSaved }: HeaderProps) {
  const { menuData, setMenuData, orientation, columnCount, layoutDirection } = useMenu();
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(menuData.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const handleStartEdit = () => {
    setEditValue(menuData.title || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) {
      setMenuData((prev) => ({ ...prev, title: trimmed }));
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") handleCancelEdit();
  };

  // Format last saved timestamp
  const formatSaved = (iso: string | undefined) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return null;
    }
  };

  const savedText = formatSaved(lastSaved);

  return (
    <header className="h-14 flex items-center px-4 bg-background border-b border-border shrink-0 z-20">
      {/* LEFT — empty spacer for balance */}
      <div className="flex-1" />

      {/* CENTER — Menu name + edit + saved */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="font-semibold text-foreground text-sm bg-transparent outline-none text-center px-2 py-0.5 rounded-md"
                style={{
                  border: "1px solid hsl(232 100% 66% / 0.5)",
                  minWidth: "120px",
                  maxWidth: "300px",
                }}
              />
              <button
                onClick={handleSaveEdit}
                className="w-6 h-6 flex items-center justify-center rounded-md text-primary transition-colors"
                style={{ backgroundColor: "hsl(232 100% 66% / 0.1)" }}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground transition-colors"
                style={{ backgroundColor: "hsl(220 14% 93%)" }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <span className="font-semibold text-foreground text-sm">
                {menuData.title || "Untitled Menu"}
              </span>
              <button
                onClick={handleStartEdit}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "hsl(220 14% 93%)";
                  e.currentTarget.style.color = "hsl(224 71% 4%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "";
                  e.currentTarget.style.color = "";
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        {savedText && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Saved: {savedText}
            </span>
          </div>
        )}
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
