import { useState, useEffect, useRef } from "react";
import type { ColorScheme, FontScheme, QrOrderConfig, OrderMode } from "../../../types/template";
import type { CartItem } from "./WebCartBar";

const KDS_API_URL = import.meta.env.VITE_KDS_API_URL || "https://api-kds.adasystems.app";

interface Props {
  cart: CartItem[];
  colors: ColorScheme;
  fonts: FontScheme;
  qrOrderConfig: QrOrderConfig;
  borderRadius: number;
  contentPaddingX: number;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onClose: () => void;
  onClearCart?: () => void;
  menuId?: string;
  restaurantId?: string;
  tableNumber?: string;
  fullscreen?: boolean;
  t?: (key: string) => string;
}

type OrderStatus = "idle" | "sending" | "success" | "error";

// KDS status steps in order
const STATUS_STEPS = ["new", "preparing", "ready", "completed"] as const;
type KdsStatus = typeof STATUS_STEPS[number];

const STATUS_LABELS: Record<KdsStatus, { en: string; fr: string; nl: string }> = {
  new:       { en: "Order Received",  fr: "Commande reçue",     nl: "Bestelling ontvangen" },
  preparing: { en: "Preparing",       fr: "En préparation",     nl: "In bereiding" },
  ready:     { en: "Ready",           fr: "Prêt",               nl: "Klaar" },
  completed: { en: "Completed",       fr: "Terminé",            nl: "Afgerond" },
};

// localStorage key for persisting active order
const ACTIVE_ORDER_KEY = "adakds_active_order";

interface ActiveOrder {
  orderId: string;
  orderNumber: string;
  kdsStatus: KdsStatus;
  menuId?: string;
  tableNumber?: string;
  placedAt: number;
}

function getActiveOrder(menuId?: string, tableNumber?: string): ActiveOrder | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_KEY);
    if (!raw) return null;
    const order: ActiveOrder = JSON.parse(raw);
    // Only restore if same menu + table context
    if (order.menuId !== menuId || order.tableNumber !== tableNumber) return null;
    // Expire after 4 hours
    if (Date.now() - order.placedAt > 4 * 60 * 60 * 1000) {
      localStorage.removeItem(ACTIVE_ORDER_KEY);
      return null;
    }
    return order;
  } catch {
    return null;
  }
}

function saveActiveOrder(order: ActiveOrder) {
  try { localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify(order)); } catch {}
}

function clearActiveOrder() {
  try { localStorage.removeItem(ACTIVE_ORDER_KEY); } catch {}
}

export default function WebCartView({ cart, colors, fonts, qrOrderConfig, borderRadius, contentPaddingX, onUpdateQuantity, onClose, onClearCart, menuId, restaurantId, tableNumber, fullscreen, t }: Props) {
  const currency = qrOrderConfig.currency || "\u20AC";
  const enabledModes = (Object.keys(qrOrderConfig.modes) as OrderMode[]).filter((m) => qrOrderConfig.modes[m]);
  const [selectedMode, setSelectedMode] = useState<OrderMode | null>(enabledModes[0] ?? null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("idle");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [orderError, setOrderError] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [kdsStatus, setKdsStatus] = useState<KdsStatus>("new");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore active order from localStorage on mount
  useEffect(() => {
    const active = getActiveOrder(menuId, tableNumber);
    if (active && active.kdsStatus !== "completed") {
      setOrderId(active.orderId);
      setOrderNumber(active.orderNumber);
      setKdsStatus(active.kdsStatus);
      setOrderStatus("success");
    }
  }, [menuId, tableNumber]);

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const tr = (key: string, fallback: string) => t ? t(key) : fallback;

  const ORDER_MODE_LABELS: Record<OrderMode, { label: string; icon: string }> = {
    "takeaway":    { label: tr("qrMenu.takeaway", "Takeaway"),  icon: "M20 7H4a1 1 0 0 0-1 1v1a4 4 0 0 0 2 3.46V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.54A4 4 0 0 0 21 9V8a1 1 0 0 0-1-1ZM7 3h10M12 3v4" },
    "send-to-kds": { label: tr("qrMenu.dineIn", "Dine In"),     icon: "M3 2l1.578 4.735A2 2 0 0 0 6.476 8H17.52a2 2 0 0 0 1.9-1.265L21 2M12 8v13M5 21h14M7.5 8l-.5 6M16.5 8l.5 6" },
    "delivery":    { label: tr("qrMenu.delivery", "Delivery"),   icon: "M14 18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18h6a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M17 18a2 2 0 1 1-4 0M7 18a2 2 0 1 1-4 0" },
  };

  const modeToCustomerType: Record<OrderMode, string> = {
    "send-to-kds": "dine_in",
    "takeaway": "takeaway",
    "delivery": "delivery",
  };

  // Poll for order status updates
  useEffect(() => {
    if (orderStatus !== "success" || !orderId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${KDS_API_URL}/api/v1/orders/${orderId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status && STATUS_STEPS.includes(data.status)) {
          setKdsStatus(data.status);
          // Update persisted status
          if (data.status === "completed") {
            clearActiveOrder();
          } else {
            const active = getActiveOrder(menuId, tableNumber);
            if (active) {
              saveActiveOrder({ ...active, kdsStatus: data.status });
            }
          }
        }
        // Stop polling when completed
        if (data.status === "completed" || data.status === "cancelled") {
          if (data.status === "cancelled") clearActiveOrder();
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore polling errors */ }
    };

    poll(); // immediate first check
    pollRef.current = setInterval(poll, 5000); // every 5s

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderStatus, orderId]);

  const handlePlaceOrder = async () => {
    if (!restaurantId) {
      setOrderError(tr("qrMenu.orderErrorNoRestaurant", "Restaurant not configured for ordering."));
      setOrderStatus("error");
      return;
    }

    setOrderStatus("sending");
    setOrderError("");

    try {
      const customerType = selectedMode ? modeToCustomerType[selectedMode] : "dine_in";
      const displayName = customerName.trim() || (tableNumber ? `Table ${tableNumber}` : "Guest");
      const genOrderNumber = `QR-${Date.now().toString().slice(-6)}`;

      const body = {
        source: "qr_code",
        order_number: genOrderNumber,
        customer_name: displayName,
        customer_type: customerType,
        special_instructions: specialInstructions.trim() || undefined,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          estimated_time: 10,
        })),
      };

      const res = await fetch(`${KDS_API_URL}/api/v1/restaurants/${restaurantId}/orders/incoming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || `Order failed (${res.status})`);
      }

      const data = await res.json();
      const newOrderNumber = data.order?.order_number || "";
      const newOrderId = data.order?.id || "";
      setOrderNumber(newOrderNumber);
      setOrderId(newOrderId);
      setKdsStatus("new");
      setOrderStatus("success");
      onClearCart?.();

      // Persist active order to localStorage
      saveActiveOrder({
        orderId: newOrderId,
        orderNumber: newOrderNumber,
        kdsStatus: "new",
        menuId,
        tableNumber,
        placedAt: Date.now(),
      });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Failed to place order");
      setOrderStatus("error");
    }
  };

  // ─── Order Tracking Screen ─────────────────────────────────────────────
  if (orderStatus === "success") {
    const currentStepIndex = STATUS_STEPS.indexOf(kdsStatus);

    return (
      <div style={{
        position: fullscreen ? "fixed" : "absolute",
        inset: 0,
        backgroundColor: colors.background,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: `20px ${contentPaddingX}px 16px`,
          borderBottom: `1px solid ${colors.muted}20`,
          flexShrink: 0,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: colors.text }}>
            {tr("qrMenu.orderTracking", "Order Tracking")}
          </div>
          {orderNumber && (
            <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.primary, marginTop: 4 }}>
              #{orderNumber}
            </div>
          )}
          {tableNumber && (
            <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {tr("qrMenu.table", "Table")} {tableNumber}
            </div>
          )}
        </div>

        {/* Status tracker */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `32px ${contentPaddingX}px`,
          gap: 0,
        }}>
          {STATUS_STEPS.map((step, i) => {
            const isActive = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const isLast = i === STATUS_STEPS.length - 1;
            const label = STATUS_LABELS[step];
            const displayLabel = tr(`qrMenu.status_${step}`, label.en);

            return (
              <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Step indicator + connector line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: isActive ? colors.primary : colors.muted + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                    boxShadow: isCurrent ? `0 0 0 4px ${colors.primary}25` : "none",
                  }}>
                    {isActive ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.muted + "40" }} />
                    )}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2,
                      height: 40,
                      backgroundColor: i < currentStepIndex ? colors.primary : colors.muted + "20",
                      transition: "all 0.3s",
                    }} />
                  )}
                </div>

                {/* Label */}
                <div style={{ paddingTop: 5 }}>
                  <div style={{
                    fontFamily: fonts.body,
                    fontSize: 15,
                    fontWeight: isCurrent ? 700 : 500,
                    color: isActive ? colors.text : colors.muted,
                    transition: "all 0.3s",
                  }}>
                    {displayLabel}
                  </div>
                  {isCurrent && step !== "completed" && (
                    <div style={{
                      fontFamily: fonts.body,
                      fontSize: 12,
                      color: colors.primary,
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: colors.primary,
                        animation: "pulse 1.5s ease-in-out infinite",
                      }} />
                      {tr("qrMenu.statusCurrent", "Current status")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pulse animation */}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

        {/* Bottom button */}
        <div style={{
          padding: `12px ${contentPaddingX}px 24px`,
          borderTop: `1px solid ${colors.muted}20`,
          flexShrink: 0,
        }}>
          {kdsStatus === "completed" ? (
            <button
              onClick={(e) => { e.stopPropagation(); clearActiveOrder(); setOrderStatus("idle"); onClose(); }}
              style={{
                width: "100%",
                padding: "15px 24px",
                backgroundColor: colors.primary,
                color: "#fff",
                border: "none",
                borderRadius: borderRadius || 12,
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {tr("qrMenu.newOrder", "Place New Order")}
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                width: "100%",
                padding: "15px 24px",
                backgroundColor: colors.muted + "20",
                color: colors.text,
                border: "none",
                borderRadius: borderRadius || 12,
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {tr("qrMenu.backToMenu", "Back to Menu")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Cart View ─────────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: borderRadius || 8,
    border: `1px solid ${colors.muted}30`,
    backgroundColor: colors.muted + "08",
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      position: fullscreen ? "fixed" : "absolute",
      inset: 0,
      backgroundColor: colors.background,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `16px ${contentPaddingX}px`,
        borderBottom: `1px solid ${colors.muted}20`,
        flexShrink: 0,
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: colors.muted + "15",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <div style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: colors.text }}>
            {tr("qrMenu.yourOrder", "Your Order")}
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
            {totalItems} {totalItems === 1 ? tr("qrMenu.item", "item") : tr("qrMenu.items", "items")}
            {tableNumber && ` · ${tr("qrMenu.table", "Table")} ${tableNumber}`}
          </div>
        </div>
      </div>

      {/* Cart items */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: `12px ${contentPaddingX}px`,
        scrollbarWidth: "none" as const,
      }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }}>{tr("qrMenu.cartEmpty", "Your cart is empty")}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: `1px solid ${colors.muted}15`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.text }}>
                    {item.name}
                  </div>
                  <div style={{ fontFamily: fonts.body, fontSize: 13, color: colors.price || colors.primary, fontWeight: 600, marginTop: 2 }}>
                    {currency}{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Quantity controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: borderRadius || 8,
                      backgroundColor: colors.muted + "15",
                      color: colors.text,
                      border: `1px solid ${colors.muted}30`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {item.quantity === 1 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    ) : "-"}
                  </button>
                  <span style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: colors.text, minWidth: 20, textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: borderRadius || 8,
                      backgroundColor: colors.primary,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order mode selection */}
        {cart.length > 0 && enabledModes.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              {tr("qrMenu.orderType", "Order Type")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {enabledModes.map((mode) => {
                const isActive = selectedMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={(e) => { e.stopPropagation(); setSelectedMode(mode); }}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      borderRadius: borderRadius || 10,
                      backgroundColor: isActive ? colors.primary + "12" : colors.muted + "08",
                      border: `2px solid ${isActive ? colors.primary : colors.muted + "20"}`,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isActive ? colors.primary : colors.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ORDER_MODE_LABELS[mode].icon} />
                    </svg>
                    <span style={{
                      fontFamily: fonts.body,
                      fontSize: 11,
                      fontWeight: 600,
                      color: isActive ? colors.primary : colors.text,
                    }}>
                      {ORDER_MODE_LABELS[mode].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Customer name (optional) */}
        {cart.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {tr("qrMenu.customerName", "Your Name")} <span style={{ fontWeight: 400, textTransform: "none" }}>({tr("qrMenu.optional", "optional")})</span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={tr("qrMenu.customerNamePlaceholder", "Enter your name...")}
              style={inputStyle}
            />
          </div>
        )}

        {/* Special instructions */}
        {cart.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              {tr("qrMenu.specialInstructions", "Special Instructions")} <span style={{ fontWeight: 400, textTransform: "none" }}>({tr("qrMenu.optional", "optional")})</span>
            </div>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder={tr("qrMenu.specialInstructionsPlaceholder", "Allergies, preferences...")}
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
        )}
      </div>

      {/* Bottom: total + place order */}
      {cart.length > 0 && (
        <div style={{
          padding: `12px ${contentPaddingX}px 24px`,
          borderTop: `1px solid ${colors.muted}20`,
          flexShrink: 0,
        }}>
          {/* Error message */}
          {orderStatus === "error" && orderError && (
            <div style={{
              padding: "10px 14px",
              marginBottom: 12,
              borderRadius: borderRadius || 8,
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              fontFamily: fonts.body,
              fontSize: 13,
              fontWeight: 500,
            }}>
              {orderError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }}>{tr("qrMenu.total", "Total")}</span>
            <span style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: colors.text }}>
              {currency}{totalPrice.toFixed(2)}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handlePlaceOrder(); }}
            disabled={orderStatus === "sending"}
            style={{
              width: "100%",
              padding: "15px 24px",
              backgroundColor: orderStatus === "sending" ? colors.muted : colors.primary,
              color: "#fff",
              border: "none",
              borderRadius: borderRadius || 12,
              cursor: orderStatus === "sending" ? "not-allowed" : "pointer",
              fontFamily: fonts.body,
              fontSize: 16,
              fontWeight: 700,
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
              opacity: orderStatus === "sending" ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            {orderStatus === "sending"
              ? tr("qrMenu.sendingOrder", "Sending Order...")
              : tr("qrMenu.placeOrder", "Place Order")}
          </button>
        </div>
      )}
    </div>
  );
}
