import { Volume2, ArrowRight } from "lucide-react";
import { Button, Input } from "ada-design-system";

export default function AIPromptBar() {
  return (
    <div className="h-14 flex items-center gap-3 px-4 bg-background border-t border-border shrink-0 z-20">
      <Button size="sm" className="flex items-center gap-2 text-xs font-semibold shrink-0">
        <Volume2 className="w-3.5 h-3.5" />
        Speak
      </Button>

      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Change menu text — e.g. 'Make all pasta prices €14' or 'Translate descriptions to French'"
          className="w-full bg-transparent border-none focus:ring-0 focus:border-none shadow-none"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="icon" className="w-8 h-8">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
