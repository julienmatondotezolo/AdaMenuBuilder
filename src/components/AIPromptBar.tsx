import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button, cn } from "ada-design-system";
import { useMenu } from "../context/MenuContext";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

interface AIPromptBarProps {
  menuId?: string;
}

export default function AIPromptBar({ menuId: _menuId }: AIPromptBarProps) {
  const { token } = useAuth();
  const { t } = useTranslation();
  const { aiMode, setAiMode, setPendingAiMessage } = useMenu();
  const [input, setInput] = useState("");
  const [loading, _setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }, [input]);

  // ── Speech Recognition ──
  const toggleSpeech = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = ""; // auto-detect language
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    let finalTranscript = input;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, input]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleSend = async () => {
    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const trimmed = input.trim();
    if (!trimmed || loading || !token) return;

    if (aiMode) {
      // Already in AI mode — AIChatPanel is mounted, dispatch directly
      window.dispatchEvent(
        new CustomEvent("ai-prompt-send", { detail: { message: trimmed } })
      );
    } else {
      // Not in AI mode — store message for AIChatPanel to pick up after mount
      setPendingAiMessage(trimmed);
      setAiMode(true);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-3 bg-card border border-border rounded-xl shadow-lg px-4 py-2.5">
      <button
        onClick={toggleSpeech}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-0.5 transition-all",
          isListening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-primary text-primary-foreground hover:opacity-90"
        )}
      >
        {isListening ? (
          <MicOff className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
      </button>

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t("aiChat.promptPlaceholder")}
          className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
          style={{ maxHeight: 100 }}
          disabled={loading}
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0 mb-0.5">
        {!aiMode && (
          <button
            onClick={() => setAiMode(true)}
            title="Open AI Chat"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}
        <Button
          size="icon"
          className="w-8 h-8"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
