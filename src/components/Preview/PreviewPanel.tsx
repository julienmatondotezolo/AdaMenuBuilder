import { Monitor, Tablet, Smartphone, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import MenuPreview from "./MenuPreview";
import PdfViewer from "./PdfViewer";
import type { Viewport } from "../../types/menu";

interface ViewportOption {
  id: Viewport;
  label: string;
  icon: LucideIcon;
  width: number;
}

const viewports: ViewportOption[] = [
  { id: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
  { id: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1024 },
  { id: "paper", label: "Paper", icon: FileText, width: 794 },
];

export default function PreviewPanel() {
  const { viewport, setViewport } = useMenu();

  const isPaper = viewport === "paper";
  const activeViewport = viewports.find((v) => v.id === viewport);
  const viewportWidth = activeViewport?.width ?? 1024;

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <h2 className="text-sm font-semibold text-gray-600">Live Preview</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {viewports.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewport(id)}
                title={label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewport === id
                    ? "bg-white text-indigo-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {isPaper ? (
          <PdfViewer />
        ) : (
          <div className="h-full overflow-auto p-10 flex justify-center items-start">
            <div
              className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 shrink-0"
              style={{ width: `${viewportWidth}px`, maxWidth: "100%" }}
            >
              <MenuPreview />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
