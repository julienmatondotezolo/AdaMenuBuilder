import { useRef, useEffect, useState } from "react";

interface Props {
  mode: "mobile" | "desktop";
  children: React.ReactNode;
}

const PHONE_W = 375;
const PHONE_H = 812;

export default function DeviceMockup({ mode, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Phone dimensions for scaling
  const bezelX = 16;
  const bezelTop = 40;
  const bezelBottom = 24;
  const phoneTotalW = PHONE_W + bezelX * 2;
  const phoneTotalH = PHONE_H + bezelTop + bezelBottom;

  useEffect(() => {
    if (mode !== "mobile") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const pad = 32;
      const sx = (el.clientWidth - pad) / phoneTotalW;
      const sy = (el.clientHeight - pad) / phoneTotalH;
      setScale(Math.min(sx, sy, 1));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, phoneTotalW, phoneTotalH]);

  if (mode === "mobile") {
    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: phoneTotalW,
            height: phoneTotalH,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            background: "#1a1a1a",
            borderRadius: 44,
            padding: `${bezelTop}px ${bezelX}px ${bezelBottom}px`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
            position: "relative",
          }}
        >
          {/* Notch pill */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 90,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#2a2a2a",
            }}
          />
          {/* Screen */}
          <div
            style={{
              width: PHONE_W,
              height: PHONE_H,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop — browser-like frame that fills available space
  const titleBarH = 36;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      {/* Browser title bar */}
      <div
        style={{
          height: titleBarH,
          background: "#e8e8e8",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#28c840" }} />
        </div>
        {/* Address bar */}
        <div
          style={{
            flex: 1,
            height: 22,
            borderRadius: 6,
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            fontSize: 11,
            color: "#999",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          menu.restaurant.com
        </div>
      </div>
      {/* Content area — fills remaining space */}
      <div style={{ flex: 1, overflow: "hidden", backgroundColor: "#fff" }}>
        {children}
      </div>
    </div>
  );
}
