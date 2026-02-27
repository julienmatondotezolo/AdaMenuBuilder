import { Monitor, Tablet, Smartphone, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "ada-design-system";
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
  { id: "paper", label: "QR Code", icon: QrCode, width: 794 },
];

export default function PreviewPanel() {
  const { viewport, setViewport } = useMenu();

  const isPaper = viewport === "paper";
  const activeViewport = viewports.find((v) => v.id === viewport);
  const viewportWidth = activeViewport?.width ?? 1024;

  return (
    <div className="absolute inset-0 flex bg-muted">
      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {isPaper ? (
          <PdfViewer />
        ) : (
          <div className="h-full overflow-auto p-10 flex justify-center items-start">
            <div
              className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-300 shrink-0"
              style={{ width: `${viewportWidth}px`, maxWidth: "100%" }}
            >
              <MenuPreview />
            </div>
          </div>
        )}
      </div>

      {/* Vertical viewport toolbar — right side */}
      <div className="flex flex-col items-center gap-2 p-3 shrink-0">
        {viewports.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewport(id)}
            title={label}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150",
              viewport === id
                ? "bg-warning text-warning-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
