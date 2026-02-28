import { AlertTriangle, ArrowRight, Plus, X } from "lucide-react";

interface OverflowDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  pageIndex: number;
  overflowPx: number;
  availablePages: { id: string; index: number; name: string }[];
  onKeep: () => void;
  onMoveToPage: (pageId: string) => void;
  onCreateNewPage: () => void;
}

export default function OverflowDialog({
  open,
  onClose,
  categoryName,
  pageIndex,
  overflowPx,
  availablePages,
  onKeep,
  onMoveToPage,
  onCreateNewPage,
}: OverflowDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl border border-border p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "hsl(38 92% 50% / 0.12)" }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: "#b45309" }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Page Overflow</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>{categoryName}</strong> on Page {pageIndex + 1} causes
              content to overflow by <strong>{overflowPx}px</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors shrink-0"
            onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(224 71% 4%)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {/* Move to existing page */}
          {availablePages.map((p) => (
            <button
              key={p.id}
              onClick={() => onMoveToPage(p.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground transition-colors text-left"
              style={{
                backgroundColor: "hsl(232 100% 66% / 0.06)",
                border: "1px solid hsl(232 100% 66% / 0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "hsl(232 100% 66% / 0.06)";
              }}
            >
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
              Move to Page {p.index + 1} — {p.name}
            </button>
          ))}

          {/* Create new page */}
          <button
            onClick={onCreateNewPage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-foreground transition-colors text-left"
            style={{
              backgroundColor: "hsl(142 71% 45% / 0.06)",
              border: "1px solid hsl(142 71% 45% / 0.15)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(142 71% 45% / 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(142 71% 45% / 0.06)";
            }}
          >
            <Plus className="w-4 h-4 shrink-0" style={{ color: "hsl(142 71% 45%)" }} />
            Create new page & move there
          </button>

          {/* Keep anyway */}
          <button
            onClick={onKeep}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground transition-colors"
            style={{ border: "1px solid hsl(220 13% 91%)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "hsl(220 14% 96%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
            }}
          >
            Keep on this page anyway
          </button>
        </div>
      </div>
    </div>
  );
}
