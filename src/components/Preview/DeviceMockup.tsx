import { useRef, useEffect, useState } from "react";

interface Props {
  mode: "mobile" | "desktop";
  children: React.ReactNode;
}

const PHONE_W = 375;
const PHONE_H = 812;

const LAPTOP_SCREEN_W = 960;
const LAPTOP_SCREEN_H = 600;
const LAPTOP_BEZEL = 14;
const LAPTOP_BEZEL_TOP = 28;
const LAPTOP_TITLE_BAR_H = 32;
const LAPTOP_BASE_H = 14;
const LAPTOP_FOOT_H = 6;
const LAPTOP_TOTAL_W = LAPTOP_SCREEN_W + LAPTOP_BEZEL * 2;
const LAPTOP_TOTAL_H = LAPTOP_SCREEN_H + LAPTOP_BEZEL_TOP + LAPTOP_BEZEL + LAPTOP_BASE_H + LAPTOP_FOOT_H;

export default function DeviceMockup({ mode, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Phone dimensions for scaling
  const phoneBezelX = 16;
  const phoneBezelTop = 40;
  const phoneBezelBottom = 24;
  const phoneTotalW = PHONE_W + phoneBezelX * 2;
  const phoneTotalH = PHONE_H + phoneBezelTop + phoneBezelBottom;

  const totalW = mode === "mobile" ? phoneTotalW : LAPTOP_TOTAL_W;
  const totalH = mode === "mobile" ? phoneTotalH : LAPTOP_TOTAL_H;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const pad = 32;
      const sx = (el.clientWidth - pad) / totalW;
      const sy = (el.clientHeight - pad) / totalH;
      setScale(Math.min(sx, sy, 1));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [totalW, totalH]);

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
            padding: `${phoneBezelTop}px ${phoneBezelX}px ${phoneBezelBottom}px`,
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

  // Desktop — laptop device with browser inside
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Laptop lid / screen housing */}
        <div
          style={{
            width: LAPTOP_TOTAL_W,
            height: LAPTOP_SCREEN_H + LAPTOP_BEZEL_TOP + LAPTOP_BEZEL,
            background: "#1a1a1a",
            borderRadius: "12px 12px 0 0",
            padding: `${LAPTOP_BEZEL_TOP}px ${LAPTOP_BEZEL}px ${LAPTOP_BEZEL}px`,
            boxShadow: "0 -2px 20px rgba(0,0,0,0.12)",
            position: "relative",
          }}
        >
          {/* Webcam dot */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#333",
              boxShadow: "inset 0 0 2px rgba(255,255,255,0.15)",
            }}
          />
          {/* Screen area with browser chrome inside */}
          <div
            style={{
              width: LAPTOP_SCREEN_W,
              height: LAPTOP_SCREEN_H,
              borderRadius: 4,
              overflow: "hidden",
              backgroundColor: "#fff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Browser title bar */}
            <div
              style={{
                height: LAPTOP_TITLE_BAR_H,
                background: "#e8e8e8",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Traffic lights */}
              <div style={{ display: "flex", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#ff5f57" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#febc2e" }} />
                <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#28c840" }} />
              </div>
              {/* Address bar */}
              <div
                style={{
                  flex: 1,
                  height: 20,
                  borderRadius: 5,
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  fontSize: 10,
                  color: "#999",
                  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                menu.restaurant.com
              </div>
            </div>
            {/* Browser content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {children}
            </div>
          </div>
        </div>

        {/* Hinge */}
        <div
          style={{
            width: LAPTOP_TOTAL_W + 40,
            height: LAPTOP_BASE_H,
            background: "linear-gradient(to bottom, #2a2a2a 0%, #3a3a3a 100%)",
            borderRadius: "0 0 2px 2px",
          }}
        />
        {/* Base / foot */}
        <div
          style={{
            width: LAPTOP_TOTAL_W + 80,
            height: LAPTOP_FOOT_H,
            background: "linear-gradient(to bottom, #d4d4d4, #e8e8e8)",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        />
      </div>
    </div>
  );
}
