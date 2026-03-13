import { useRef, useEffect, useState } from "react";

interface Props {
  mode: "mobile" | "desktop";
  children: React.ReactNode;
}

const PHONE_W = 375;
const PHONE_H = 812;
const LAPTOP_W = 1024;
const LAPTOP_H = 640;

export default function DeviceMockup({ mode, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const deviceW = mode === "mobile" ? PHONE_W : LAPTOP_W;
  const deviceH = mode === "mobile" ? PHONE_H : LAPTOP_H;

  // Bezel adds padding around the viewport
  const bezelX = mode === "mobile" ? 16 : 20;
  const bezelTop = mode === "mobile" ? 40 : 24;
  const bezelBottom = mode === "mobile" ? 24 : 24;
  const totalW = deviceW + bezelX * 2;
  const totalH = deviceH + bezelTop + bezelBottom + (mode === "desktop" ? 40 : 0); // 40 for laptop base

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
            width: totalW,
            height: totalH,
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
              width: deviceW,
              height: deviceH,
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

  // Desktop / laptop
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
        {/* Screen bezel */}
        <div
          style={{
            width: totalW,
            height: deviceH + bezelTop + bezelBottom,
            background: "#1a1a1a",
            borderRadius: "16px 16px 0 0",
            padding: `${bezelTop}px ${bezelX}px ${bezelBottom}px`,
            boxShadow: "0 -2px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              width: deviceW,
              height: deviceH,
              borderRadius: 4,
              overflow: "hidden",
              backgroundColor: "#fff",
            }}
          >
            {children}
          </div>
        </div>
        {/* Laptop base / hinge */}
        <div
          style={{
            width: totalW + 60,
            height: 14,
            background: "linear-gradient(to bottom, #2a2a2a, #333)",
            borderRadius: "0 0 2px 2px",
          }}
        />
        <div
          style={{
            width: totalW + 120,
            height: 8,
            background: "#e0e0e0",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
      </div>
    </div>
  );
}
