import { Sparkles, ArrowUp } from "lucide-react";
import { Button, Input } from "ada-design-system";

export default function AIPromptBar() {
  return (
    <div className="h-14 flex items-center gap-3 px-4 bg-background border-t border-border shrink-0 z-20">
      <Button size="sm" className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
        MAGIC PROMPT
      </Button>

      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Ask AI to adjust prices, change the theme, or suggest descriptions..."
          className="w-full bg-transparent border-none focus:ring-0 focus:border-none shadow-none"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">
            ↵
          </kbd>{" "}
          to apply
        </span>
        <Button size="icon" className="w-8 h-8">
          <ArrowUp className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
