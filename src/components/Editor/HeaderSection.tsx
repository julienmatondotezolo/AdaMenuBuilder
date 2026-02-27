import { useState, useRef } from "react";
import { ChevronDown, Upload, Link, X } from "lucide-react";
import { Button, Input, Label, Card, CardContent, cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import type { MenuData } from "../../types/menu";

const textFields: { key: keyof MenuData; label: string }[] = [
  { key: "restaurantName", label: "Restaurant Name" },
  { key: "subtitle", label: "Subtitle" },
  { key: "established", label: "Established" },
  { key: "highlightLabel", label: "Highlight Label" },
  { key: "highlightTitle", label: "Highlight Title" },
];

type ImageInputMode = "url" | "upload";

export default function HeaderSection() {
  const { menuData, setMenuData } = useMenu();
  const [isOpen, setIsOpen] = useState(false);
  const [imageMode, setImageMode] = useState<ImageInputMode>(
    menuData.highlightImage && !menuData.highlightImage.startsWith("data:") ? "url" : "url",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof MenuData, value: string) => {
    setMenuData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleChange("highlightImage", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    handleChange("highlightImage", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="mb-6">
      <Button
        variant="ghost"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors rounded-t-lg rounded-b-none"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Menu Header
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <CardContent className="px-4 py-4 space-y-4">
          {textFields.map(({ key, label }) => (
            <div key={key}>
              <Label className="block text-xs font-medium text-muted-foreground mb-1">
                {label}
              </Label>
              <Input
                type="text"
                value={menuData[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          {/* Highlight Image — upload or URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="block text-xs font-medium text-muted-foreground">
                Highlight Image
              </Label>
              <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-md">
                <Button
                  variant={imageMode === "url" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setImageMode("url")}
                  title="Enter URL"
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                >
                  <Link className="w-3 h-3" />
                  URL
                </Button>
                <Button
                  variant={imageMode === "upload" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setImageMode("upload")}
                  title="Upload file"
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </Button>
              </div>
            </div>

            {imageMode === "url" ? (
              <Input
                type="text"
                value={menuData.highlightImage.startsWith("data:") ? "" : menuData.highlightImage}
                onChange={(e) => handleChange("highlightImage", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-dashed hover:border-primary/40 hover:text-primary"
                >
                  <Upload className="w-4 h-4" />
                  Choose image file
                </Button>
              </div>
            )}

            {menuData.highlightImage && (
              <div className="mt-2 relative group">
                <img
                  src={menuData.highlightImage}
                  alt="Highlight preview"
                  className="w-full h-24 object-cover rounded-lg border border-border"
                />
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={clearImage}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
