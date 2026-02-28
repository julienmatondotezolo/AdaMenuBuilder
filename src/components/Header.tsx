import { useState } from "react";
import {
  Eye,
  Download,
  Rocket,
  Loader2,
} from "lucide-react";
import { Button } from "ada-design-system";
import { downloadMenuPdf } from "../utils/downloadMenuPdf";
import { useMenu } from "../context/MenuContext";

export default function Header() {
  const { menuData, orientation, columnCount, layoutDirection } = useMenu();
  const [downloading, setDownloading] = useState(false);

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
      {/* LEFT — spacer */}
      <div className="flex-1" />

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
