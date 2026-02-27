import { useState, useRef, useEffect } from "react";
import {
  Search,
  Eye,
  Download,
  Rocket,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button, AdaLogo } from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";

export default function Header() {
  const { menuData, orientation, columnCount, layoutDirection } = useMenu();
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <header className="h-14 flex items-center px-4 bg-background border-b border-border shrink-0 z-20">
      {/* LEFT — Logo + Editing label */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <AdaLogo className="w-7 h-7" />
          <span className="font-semibold text-foreground text-sm tracking-tight whitespace-nowrap">
            Menu Builder{" "}
            <span className="text-primary font-bold">AI</span>
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Menu name dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 text-sm hover:bg-muted/50 rounded-md px-2 py-1 transition-colors min-w-0"
          >
            <span className="text-muted-foreground shrink-0">Editing:</span>
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {menuData.title || "Untitled Menu"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent menus
              </div>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors font-medium text-foreground">
                {menuData.title || "Untitled Menu"}
              </button>
              <div className="border-t border-border my-1" />
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-muted-foreground">
                + New menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CENTER — Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="flex items-center gap-2 w-full max-w-sm h-9 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:border-input">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search menu items..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* RIGHT — Actions */}
      <div className="flex items-center gap-2 shrink-0">
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
