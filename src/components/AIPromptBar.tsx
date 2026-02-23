import { Sparkles, ArrowUp } from "lucide-react";

export default function AIPromptBar() {
  return (
    <div className="h-14 flex items-center gap-3 px-4 bg-white border-t border-gray-200 shrink-0 z-20">
      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-primary text-white text-xs font-semibold rounded-lg shrink-0 hover:bg-indigo-hover transition-colors">
        <Sparkles className="w-3.5 h-3.5" />
        MAGIC PROMPT
      </button>

      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Ask AI to adjust prices, change the theme, or suggest descriptions..."
          className="w-full py-1.5 px-3 text-sm bg-transparent border-none focus:outline-none placeholder:text-gray-400 text-gray-700"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-400">
          Press{" "}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
            ↵
          </kbd>{" "}
          to apply
        </span>
        <button className="w-8 h-8 flex items-center justify-center bg-indigo-primary text-white rounded-lg hover:bg-indigo-hover transition-colors">
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
