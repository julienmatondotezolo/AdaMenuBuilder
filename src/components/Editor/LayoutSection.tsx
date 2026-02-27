import { useState } from "react";
import type React from "react";
import { ChevronDown, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { useMenu } from "../../context/MenuContext";
import type { LayoutDirection } from "../../types/menu";

const columnOptions = [1, 2, 3, 4];

function ZShapeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="10" height="10" rx="2" className="fill-current opacity-80" />
      <rect x="16" y="2" width="10" height="10" rx="2" className="fill-current opacity-80" />
      <rect x="2" y="16" width="10" height="10" rx="2" className="fill-current opacity-40" />
      <rect x="16" y="16" width="10" height="10" rx="2" className="fill-current opacity-40" />
      {/* Arrow: right across top row */}
      <path d="M13 7 L15 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrow: diagonal down-left */}
      <path d="M15 9 L13 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrow: right across bottom row */}
      <path d="M13 21 L15 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NShapeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="10" height="10" rx="2" className="fill-current opacity-80" />
      <rect x="16" y="2" width="10" height="10" rx="2" className="fill-current opacity-40" />
      <rect x="2" y="16" width="10" height="10" rx="2" className="fill-current opacity-80" />
      <rect x="16" y="16" width="10" height="10" rx="2" className="fill-current opacity-40" />
      {/* Arrow: down col 1 */}
      <path d="M7 13 L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrow: diagonal up-right to col 2 top */}
      <path d="M9 15 L19 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arrow: down col 2 */}
      <path d="M21 13 L21 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const directionOptions: { id: LayoutDirection; label: string; description: string; Icon: () => React.ReactElement }[] = [
  {
    id: "Z",
    label: "Z-shape",
    description: "Row-first",
    Icon: ZShapeIcon,
  },
  {
    id: "N",
    label: "N-shape",
    description: "Column-first",
    Icon: NShapeIcon,
  },
];

export default function LayoutSection() {
  const {
    orientation,
    setOrientation,
    setViewport,
    columnCount,
    setColumnCount,
    layoutDirection,
    setLayoutDirection,
  } = useMenu();

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Layout
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 py-4 space-y-4 bg-white">
          {/* Orientation */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Orientation</span>
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md">
              <button
                onClick={() => { setOrientation("portrait"); setViewport("paper"); }}
                title="Portrait"
                className={`flex items-center justify-center px-2 py-1 rounded transition-all ${
                  orientation === "portrait"
                    ? "bg-white text-indigo-primary shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <RectangleVertical className="w-3.5 h-3.5" />
                <span className="ml-1.5 text-xs font-medium">Portrait</span>
              </button>
              <button
                onClick={() => { setOrientation("landscape"); setViewport("paper"); }}
                title="Landscape"
                className={`flex items-center justify-center px-2 py-1 rounded transition-all ${
                  orientation === "landscape"
                    ? "bg-white text-indigo-primary shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span className="ml-1.5 text-xs font-medium">Landscape</span>
              </button>
            </div>
          </div>

          {/* Column count */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Columns</span>
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md">
              {columnOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setColumnCount(n)}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-semibold rounded transition-all ${
                    columnCount === n
                      ? "bg-white text-indigo-primary shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Layout direction — only meaningful when columnCount > 1 */}
          {columnCount > 1 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-gray-500">Direction</span>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {directionOptions.map(({ id, label, description, Icon }) => {
                  const isActive = layoutDirection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setLayoutDirection(id)}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border text-center transition-all ${
                        isActive
                          ? "border-indigo-primary bg-indigo-primary/5 text-indigo-primary"
                          : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                      }`}
                    >
                      <Icon />
                      <div>
                        <p className="text-[11px] font-semibold leading-tight">{label}</p>
                        <p className="text-[10px] opacity-70 leading-tight">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
