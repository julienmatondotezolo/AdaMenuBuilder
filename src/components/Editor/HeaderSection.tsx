import { useState, useRef } from "react";
import { ChevronDown, Upload, Link, X } from "lucide-react";
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

  const inputClassName =
    "w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-primary/30";

  return (
    <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Menu Header
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-4 space-y-4 bg-white">
          {textFields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {label}
              </label>
              <input
                type="text"
                value={menuData[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                className={inputClassName}
              />
            </div>
          ))}

          {/* Highlight Image — upload or URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500">
                Highlight Image
              </label>
              <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md">
                <button
                  onClick={() => setImageMode("url")}
                  title="Enter URL"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    imageMode === "url"
                      ? "bg-white text-indigo-primary shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Link className="w-3 h-3" />
                  URL
                </button>
                <button
                  onClick={() => setImageMode("upload")}
                  title="Upload file"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    imageMode === "upload"
                      ? "bg-white text-indigo-primary shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>
            </div>

            {imageMode === "url" ? (
              <input
                type="text"
                value={menuData.highlightImage.startsWith("data:") ? "" : menuData.highlightImage}
                onChange={(e) => handleChange("highlightImage", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={inputClassName + " placeholder:text-gray-400"}
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
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-primary/40 hover:text-indigo-primary transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Choose image file
                </button>
              </div>
            )}

            {menuData.highlightImage && (
              <div className="mt-2 relative group">
                <img
                  src={menuData.highlightImage}
                  alt="Highlight preview"
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
