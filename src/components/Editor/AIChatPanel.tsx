import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import {
  Loader2,
  Check,
  XCircle,
  Sparkles,
  Trash,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button, cn } from "ada-design-system";
import { useMenu } from "../../context/MenuContext";
import { useAuth } from "../../context/AuthContext";
import {
  sendAIMessage,
  loadChatHistory,
  clearChatHistory,
  type AIAction,
  type ChatMessage,
} from "../../services/aiAssistApi";
import AIPromptBar from "../AIPromptBar";

interface AIChatPanelProps {
  menuId?: string;
}

export default function AIChatPanel({ menuId }: AIChatPanelProps) {
  const { token } = useAuth();
  const {
    menuData,
    setMenuData,
    pages,
    setPages,
    addCategory,
    removeCategory,
    updateCategory,
    addItem,
    removeItem,
    updateItem,
    setAiModifiedIds,
    setAiMode,
    selectItem,
    pendingAiMessage,
    setPendingAiMessage,
    aiPreviewData,
    setAiPreview,
  } = useMenu();

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [previewingMsgIndex, setPreviewingMsgIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  // Load chat history from DB on mount
  useEffect(() => {
    if (!token || !menuId || historyLoaded) return;
    (async () => {
      const history = await loadChatHistory(token, menuId);
      if (history.length > 0) setMessages(history);
      setHistoryLoaded(true);
    })();
  }, [token, menuId, historyLoaded]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for messages sent from the prompt bar
  const sendMessageDirect = useRef<((msg: string) => void) | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message && sendMessageDirect.current) {
        sendMessageDirect.current(detail.message);
      }
    };
    window.addEventListener("ai-prompt-send", handler);
    return () => window.removeEventListener("ai-prompt-send", handler);
  }, []);

  // ── Send message (from input or direct) ──
  const doSend = useCallback(async (message: string) => {
    if (!message || loading || !token) return;

    // Clear AI preview and auto-reject any pending AI responses before sending new message
    setPreviewingMsgIndex(null);
    setAiPreview(null);
    const updatedHistory = messagesRef.current.map((m) =>
      m.status === "pending" ? { ...m, status: "rejected" as const } : m
    );
    setMessages(updatedHistory);

    const userMsg: ChatMessage = { role: "user", content: message };
    const historyForApi = [...updatedHistory, userMsg];
    setMessages(historyForApi);
    setLoading(true);

    try {
      const response = await sendAIMessage(token, message, menuData, menuId, pages, historyForApi);

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.message,
        actions: response.actions,
        status: response.actions.length > 0 ? "pending" : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: err.message || "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, token, menuData, menuId, pages]);

  // Wire up direct send ref
  sendMessageDirect.current = doSend;

  // Consume pending message from prompt bar (sent before AI mode was active)
  useEffect(() => {
    if (!historyLoaded || !pendingAiMessage || !token || loading) return;

    const message = pendingAiMessage;
    setPendingAiMessage(null);

    // Auto-reject any pending AI responses
    const updatedHistory = messagesRef.current.map((m) =>
      m.status === "pending" ? { ...m, status: "rejected" as const } : m
    );

    // Add user message bubble
    const userMsg: ChatMessage = { role: "user", content: message };
    const historyForApi = [...updatedHistory, userMsg];
    setMessages(historyForApi);
    setLoading(true);

    // Call AI API
    sendAIMessage(token, message, menuData, menuId, pages, historyForApi)
      .then((response) => {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: response.message,
          actions: response.actions,
          status: response.actions.length > 0 ? "pending" : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err: any) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: err.message || "Something went wrong." },
        ]);
      })
      .finally(() => setLoading(false));
  }, [historyLoaded, pendingAiMessage]);

  // ── Apply actions with skeleton + page assignment ──
  const applyActions = useCallback(
    (actions: AIAction[]) => {
      const newCategoryMap = new Map<string, string>();
      const modifiedIds = new Set<string>();
      const newCategoryIdsForPages = new Map<string, string>(); // catId → pageId
      let zoomToItemId: string | null = null; // Track item to zoom to

      // Check if this is only item creates/updates (no category-only or delete or menu actions)
      const itemOnlyActions = actions.every(
        (a) => a.type === "create_item" || a.type === "update_item"
      );

      for (const action of actions) {
        switch (action.type) {
          case "create_category": {
            if (action.name) {
              const catId = addCategory(action.name);
              newCategoryMap.set(action.name, catId);
              modifiedIds.add(catId);
              if (action.addToPageId) {
                newCategoryIdsForPages.set(catId, action.addToPageId);
              } else if (pages.length === 1) {
                newCategoryIdsForPages.set(catId, pages[0].id);
              }
            }
            break;
          }
          case "update_category": {
            if (action.categoryId && action.updates) {
              updateCategory(action.categoryId, action.updates as any);
              modifiedIds.add(action.categoryId);
            }
            break;
          }
          case "delete_category": {
            if (action.categoryId) {
              modifiedIds.add(action.categoryId);
              removeCategory(action.categoryId);
            }
            break;
          }
          case "create_item": {
            let targetCatId = action.categoryId;
            if (targetCatId === "new" && action.categoryName) {
              const existing = newCategoryMap.get(action.categoryName);
              if (existing) {
                targetCatId = existing;
              } else {
                targetCatId = addCategory(action.categoryName);
                newCategoryMap.set(action.categoryName, targetCatId);
                modifiedIds.add(targetCatId);
                if (action.addToPageId) {
                  newCategoryIdsForPages.set(targetCatId, action.addToPageId);
                } else if (pages.length === 1) {
                  newCategoryIdsForPages.set(targetCatId, pages[0].id);
                }
              }
            }
            if (targetCatId && action.item) {
              const itemId = addItem(targetCatId, action.item);
              modifiedIds.add(itemId);
              if (itemOnlyActions) zoomToItemId = itemId;
            }
            break;
          }
          case "update_item": {
            if (action.categoryId && action.itemId && action.updates) {
              updateItem(action.categoryId, action.itemId, action.updates as any);
              modifiedIds.add(action.itemId);
              if (itemOnlyActions) zoomToItemId = action.itemId;
            }
            break;
          }
          case "delete_item": {
            if (action.categoryId && action.itemId) {
              modifiedIds.add(action.itemId);
              removeItem(action.categoryId, action.itemId);
            }
            break;
          }
          case "update_menu": {
            if (action.updates) {
              setMenuData((prev) => ({ ...prev, ...action.updates }));
            }
            break;
          }
        }
      }

      // Assign new categories to pages
      if (newCategoryIdsForPages.size > 0) {
        setPages((prev) =>
          prev.map((page) => {
            const newCatIds: string[] = [];
            newCategoryIdsForPages.forEach((pageId, catId) => {
              if (pageId === page.id) newCatIds.push(catId);
            });
            if (newCatIds.length === 0) return page;
            return { ...page, categoryIds: [...page.categoryIds, ...newCatIds] };
          })
        );
      }

      setAiModifiedIds(modifiedIds);
      setTimeout(() => setAiModifiedIds(new Set()), 5000);

      // Zoom to the last created/updated item in the preview
      if (zoomToItemId) {
        // Small delay to let the DOM render the new item
        setTimeout(() => selectItem(zoomToItemId), 100);
        // Deselect after 5 seconds
        setTimeout(() => selectItem(null), 5100);
      }
    },
    [addCategory, removeCategory, updateCategory, addItem, removeItem, updateItem, setMenuData, setAiModifiedIds, selectItem, pages, setPages]
  );

  // Compute a preview of menuData + pages with actions applied (without mutating state)
  const computePreviewData = useCallback(
    (actions: AIAction[]) => {
      let preview = JSON.parse(JSON.stringify(menuData)) as typeof menuData;
      let previewPages = JSON.parse(JSON.stringify(pages)) as typeof pages;
      let nextId = 1;
      const newIds = new Set<string>();

      for (const action of actions) {
        switch (action.type) {
          case "create_category": {
            if (action.name) {
              const catId = `preview-cat-${nextId++}`;
              preview.categories.push({
                id: catId,
                name: action.name,
                items: [],
              });
              newIds.add(catId);
              // Assign to target page or last page, or create new page
              const targetPageId = action.addToPageId;
              if (targetPageId) {
                previewPages = previewPages.map((p) =>
                  p.id === targetPageId ? { ...p, categoryIds: [...p.categoryIds, catId] } : p
                );
              } else if (previewPages.length > 0) {
                const lastIdx = previewPages.length - 1;
                previewPages[lastIdx] = {
                  ...previewPages[lastIdx],
                  categoryIds: [...previewPages[lastIdx].categoryIds, catId],
                };
              }
            }
            break;
          }
          case "update_category": {
            if (action.categoryId && action.updates) {
              preview.categories = preview.categories.map((c) =>
                c.id === action.categoryId ? { ...c, ...(action.updates as any) } : c
              );
              newIds.add(action.categoryId);
            }
            break;
          }
          case "delete_category": {
            if (action.categoryId) {
              preview.categories = preview.categories.filter((c) => c.id !== action.categoryId);
              previewPages = previewPages.map((p) => ({
                ...p,
                categoryIds: p.categoryIds.filter((id) => id !== action.categoryId),
              }));
            }
            break;
          }
          case "create_item": {
            let targetCatId = action.categoryId;
            if (targetCatId === "new" && action.categoryName) {
              const existing = preview.categories.find((c) => c.name === action.categoryName);
              if (existing) {
                targetCatId = existing.id;
              } else {
                const newCatId = `preview-cat-${nextId++}`;
                preview.categories.push({ id: newCatId, name: action.categoryName, items: [] });
                newIds.add(newCatId);
                // Assign new category to a page
                if (previewPages.length > 0) {
                  const lastIdx = previewPages.length - 1;
                  previewPages[lastIdx] = {
                    ...previewPages[lastIdx],
                    categoryIds: [...previewPages[lastIdx].categoryIds, newCatId],
                  };
                }
                targetCatId = newCatId;
              }
            }
            if (targetCatId && action.item) {
              const itemId = `preview-item-${nextId++}`;
              newIds.add(itemId);
              preview.categories = preview.categories.map((c) =>
                c.id === targetCatId
                  ? {
                      ...c,
                      items: [
                        ...c.items,
                        {
                          id: itemId,
                          name: action.item!.name,
                          price: action.item!.price,
                          description: action.item!.description || "",
                          featured: action.item!.featured || false,
                        },
                      ],
                    }
                  : c
              );
            }
            break;
          }
          case "update_item": {
            if (action.categoryId && action.itemId && action.updates) {
              preview.categories = preview.categories.map((c) =>
                c.id === action.categoryId
                  ? {
                      ...c,
                      items: c.items.map((item) =>
                        item.id === action.itemId ? { ...item, ...(action.updates as any) } : item
                      ),
                    }
                  : c
              );
              newIds.add(action.itemId);
            }
            break;
          }
          case "delete_item": {
            if (action.categoryId && action.itemId) {
              preview.categories = preview.categories.map((c) =>
                c.id === action.categoryId
                  ? { ...c, items: c.items.filter((item) => item.id !== action.itemId) }
                  : c
              );
            }
            break;
          }
          case "update_menu": {
            if (action.updates) {
              preview = { ...preview, ...(action.updates as any) };
            }
            break;
          }
        }
      }

      return { menuData: preview, pages: previewPages, newIds };
    },
    [menuData, pages]
  );

  const handlePreview = useCallback(
    (msgIndex: number) => {
      if (previewingMsgIndex === msgIndex) {
        // Toggle off
        setPreviewingMsgIndex(null);
        setAiPreview(null);
        return;
      }
      const msg = messages[msgIndex];
      if (!msg?.actions) return;
      const result = computePreviewData(msg.actions);
      setAiPreview(result.menuData, result.pages, result.newIds);
      setPreviewingMsgIndex(msgIndex);
    },
    [messages, computePreviewData, previewingMsgIndex, setAiPreview]
  );

  const handleAccept = useCallback(
    (msgIndex: number) => {
      setPreviewingMsgIndex(null);
      setAiPreview(null);
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIndex ? { ...m, status: "accepted" as const } : m))
      );
      const msg = messages[msgIndex];
      if (msg?.actions) applyActions(msg.actions);
    },
    [messages, applyActions, setAiPreview]
  );

  const handleReject = useCallback((msgIndex: number) => {
    setPreviewingMsgIndex(null);
    setAiPreview(null);
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, status: "rejected" as const } : m))
    );
  }, [setAiPreview]);

  const handleClearHistory = useCallback(async () => {
    if (!token || !menuId) return;
    setMessages([]);
    await clearChatHistory(token, menuId);
  }, [token, menuId]);

  // ── Render helpers ──

  const getActionLabel = (type: string) => {
    switch (type) {
      case "create_category":
      case "create_item":
        return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">Create</span>;
      case "update_category":
      case "update_item":
      case "update_menu":
        return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600">Update</span>;
      case "delete_category":
      case "delete_item":
        return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-500">Delete</span>;
      default:
        return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Action</span>;
    }
  };

  /** Resolve a category ID to its name */
  const resolveCategoryName = (catId?: string) => {
    if (!catId) return "Unknown";
    const cat = menuData.categories.find((c) => c.id === catId);
    return cat?.name || "Unknown category";
  };

  /** Resolve an item ID to its name */
  const resolveItemName = (catId?: string, itemId?: string) => {
    if (!catId || !itemId) return "Unknown";
    const cat = menuData.categories.find((c) => c.id === catId);
    const item = cat?.items.find((i) => i.id === itemId);
    return item?.name || "Unknown item";
  };

  const renderActionDetail = (action: AIAction) => {
    const updates = action.updates as Record<string, any> | undefined;
    const oldValues = action.oldValues as Record<string, any> | undefined;

    switch (action.type) {
      case "create_category":
        return (
          <span className="text-primary font-medium">{action.name}</span>
        );

      case "update_category": {
        const catName = resolveCategoryName(action.categoryId);
        return (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground mb-0.5">{catName}</div>
            {updates?.name && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="line-through text-muted-foreground">{oldValues?.name || catName}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary font-medium">{updates.name}</span>
              </div>
            )}
          </div>
        );
      }

      case "delete_category": {
        const catName = resolveCategoryName(action.categoryId);
        return (
          <span className="line-through text-muted-foreground">{catName}</span>
        );
      }

      case "create_item": {
        const inCategory = action.categoryId && action.categoryId !== "new"
          ? resolveCategoryName(action.categoryId)
          : action.categoryName || "New category";
        return (
          <div>
            <span className="text-primary font-medium">{action.item?.name}</span>
            {action.item?.price != null && (
              <span className="text-primary font-medium ml-1.5">€{action.item.price}</span>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">in {inCategory}</div>
          </div>
        );
      }

      case "update_item": {
        const itemName = resolveItemName(action.categoryId, action.itemId);
        const changes: React.ReactNode[] = [];

        if (updates?.name) {
          changes.push(
            <div key="name" className="flex items-center gap-1.5 flex-wrap">
              <span className="line-through text-muted-foreground">{oldValues?.name || itemName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-medium">{updates.name as string}</span>
            </div>
          );
        }
        if (updates?.price !== undefined) {
          changes.push(
            <div key="price" className="flex items-center gap-1.5">
              <span className="line-through text-muted-foreground">€{oldValues?.price ?? "?"}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-medium">€{updates.price as number}</span>
            </div>
          );
        }
        if (updates?.description !== undefined) {
          changes.push(
            <div key="desc" className="flex items-center gap-1.5 flex-wrap">
              <span className="line-through text-muted-foreground text-[11px] truncate max-w-[120px]">
                {(oldValues?.description as string) || "(empty)"}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary text-[11px] truncate max-w-[120px]">{updates.description as string}</span>
            </div>
          );
        }

        if (changes.length === 0) {
          return <span>Update "{itemName}"</span>;
        }

        return (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground mb-0.5">{itemName}</div>
            {changes}
          </div>
        );
      }

      case "delete_item": {
        const itemName = resolveItemName(action.categoryId, action.itemId);
        const cat = menuData.categories.find((c) => c.id === action.categoryId);
        const item = cat?.items.find((i) => i.id === action.itemId);
        return (
          <div className="flex items-center gap-1.5">
            <span className="line-through text-muted-foreground">{itemName}</span>
            {item?.price != null && (
              <span className="line-through text-muted-foreground">€{item.price}</span>
            )}
          </div>
        );
      }

      case "update_menu": {
        const changes: React.ReactNode[] = [];
        if (updates?.title) {
          changes.push(
            <div key="title" className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">Title:</span>
              <span className="line-through text-muted-foreground">{(oldValues?.title as string) || menuData.title}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-medium">{updates.title as string}</span>
            </div>
          );
        }
        if (updates?.subtitle) {
          changes.push(
            <div key="subtitle" className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground">Subtitle:</span>
              <span className="line-through text-muted-foreground">{(oldValues?.subtitle as string) || menuData.subtitle}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-primary font-medium">{updates.subtitle as string}</span>
            </div>
          );
        }
        return changes.length > 0 ? <div className="space-y-0.5">{changes}</div> : <span>Update menu</span>;
      }

      default:
        return <span>{action.type}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Menu Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            title="Clear history"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setAiMode(false)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Editor
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm font-medium">How can I help with your menu?</p>
            <p className="text-xs mt-2 max-w-[300px] leading-relaxed opacity-70">
              Try: "Add a desserts category with 3 items" or "Translate everything to French" or "Make all pasta prices €14"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Actions with old→new values */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide opacity-60 mb-1.5">
                    Proposed changes
                  </div>
                  {msg.actions.map((action, j) => (
                    <div
                      key={j}
                      className={cn(
                        "flex items-start gap-2 text-xs px-2.5 py-2 rounded-lg",
                        msg.status === "accepted"
                          ? "bg-emerald-500/10"
                          : msg.status === "rejected"
                            ? "bg-red-500/10 opacity-50"
                            : "bg-background/60"
                      )}
                    >
                      <span className="shrink-0 mt-0.5">{getActionLabel(action.type)}</span>
                      <div className="min-w-0 flex-1">{renderActionDetail(action)}</div>
                    </div>
                  ))}

                  {msg.status === "pending" && (
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => handleAccept(i)}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1.5 px-3",
                          previewingMsgIndex === i && "bg-amber-500/10 border-amber-500/40 text-amber-600"
                        )}
                        onClick={() => handlePreview(i)}
                      >
                        {previewingMsgIndex === i ? (
                          <><EyeOff className="w-3.5 h-3.5" /> Stop</>
                        ) : (
                          <><Eye className="w-3.5 h-3.5" /> Preview</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => handleReject(i)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {msg.status === "accepted" && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-emerald-500/20 text-emerald-600 text-xs">
                      <Check className="w-3.5 h-3.5" />
                      Changes applied
                    </div>
                  )}

                  {msg.status === "rejected" && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20 text-red-400 text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      Changes rejected
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — same prompt bar as preview */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <AIPromptBar menuId={menuId} />
      </div>
    </div>
  );
}
