import type { ShapePreset } from "../types/template";

export interface ShapePresetDef {
  id: ShapePreset;
  label: string;
  viewBox: string;
  /** SVG path `d` — null for basic shapes (circle/ellipse/rect) */
  path: string | null;
  defaultWidth: number;
  defaultHeight: number;
}

export const SHAPE_PRESETS: ShapePresetDef[] = [
  // Organic blobs (like the gold blobs in "Tambwe Decor" menu)
  {
    id: "blob1",
    label: "Blob 1",
    viewBox: "0 0 200 200",
    path: "M44.7,-76.4C58.8,-69.2,71.8,-58.2,79.6,-44.3C87.4,-30.5,90,-13.8,88.5,2.3C87.1,18.3,81.5,33.7,72.1,46.3C62.7,58.9,49.5,68.7,35.1,75.1C20.7,81.5,5.2,84.5,-10.2,83.3C-25.6,82.2,-40.9,76.8,-53.6,67.8C-66.3,58.7,-76.4,46,-82.3,31.2C-88.2,16.4,-89.9,-0.4,-86.4,-15.8C-82.9,-31.2,-74.2,-45.2,-62.2,-53.5C-50.2,-61.8,-34.9,-64.4,-20.8,-70.9C-6.7,-77.4,6.2,-87.8,20.3,-87.7C34.4,-87.6,49.7,-77,44.7,-76.4Z",
    defaultWidth: 180,
    defaultHeight: 180,
  },
  {
    id: "blob2",
    label: "Blob 2",
    viewBox: "0 0 200 200",
    path: "M39.9,-65.7C53.4,-60.3,67,-51.6,74.8,-39.2C82.6,-26.8,84.6,-10.7,82.5,4.4C80.4,19.5,74.2,33.7,65,44.8C55.8,55.9,43.5,63.9,30.1,69.3C16.7,74.7,2.1,77.5,-13.2,76.7C-28.6,75.9,-44.7,71.5,-56.2,62.1C-67.7,52.7,-74.5,38.3,-78.6,23C-82.7,7.6,-84.1,-8.7,-80,-22.9C-75.9,-37.1,-66.4,-49.2,-54.2,-55.3C-42,-61.4,-27.2,-61.5,-13.4,-64.8C0.4,-68.2,13.2,-74.8,26.4,-71.1C39.7,-67.5,53.4,-53.5,39.9,-65.7Z",
    defaultWidth: 180,
    defaultHeight: 180,
  },
  {
    id: "blob3",
    label: "Blob 3",
    viewBox: "0 0 200 200",
    path: "M47.7,-79.1C62.3,-72.2,75,-59.6,82.2,-44.6C89.4,-29.6,91.1,-12.2,88.7,4C86.3,20.2,79.8,35.3,70.2,47.7C60.6,60.1,47.9,69.8,33.9,75.6C19.8,81.4,4.4,83.3,-10.5,81.1C-25.4,78.9,-39.8,72.6,-52.4,63.3C-65,54,-75.8,41.7,-81.2,27.3C-86.6,12.9,-86.6,-3.7,-82.7,-18.9C-78.9,-34.1,-71.2,-47.9,-59.7,-56.3C-48.2,-64.7,-32.9,-67.7,-18.7,-72.4C-4.4,-77.2,8.9,-83.7,22.6,-83.5C36.3,-83.3,50.4,-76.4,47.7,-79.1Z",
    defaultWidth: 180,
    defaultHeight: 180,
  },
  {
    id: "blob4",
    label: "Blob 4",
    viewBox: "0 0 200 200",
    path: "M42.4,-72.3C55.8,-64.9,67.8,-54.6,76,-41.7C84.2,-28.8,88.6,-13.3,87.6,1.5C86.6,16.3,80.3,30.3,71.3,42.3C62.3,54.3,50.6,64.3,37.4,70.9C24.2,77.4,9.4,80.6,-4.9,79.4C-19.1,78.1,-32.7,72.5,-45.1,64.5C-57.4,56.5,-68.5,46.1,-75,33C-81.5,19.9,-83.4,4.2,-80.8,-10.2C-78.2,-24.6,-71.1,-37.7,-60.8,-47.7C-50.5,-57.7,-37,-64.5,-23.7,-70.3C-10.4,-76.2,2.7,-81.1,16.2,-81.3C29.6,-81.5,43.5,-77,42.4,-72.3Z",
    defaultWidth: 180,
    defaultHeight: 180,
  },
  // Basic shapes
  {
    id: "circle",
    label: "Circle",
    viewBox: "0 0 200 200",
    path: null,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    id: "ellipse",
    label: "Ellipse",
    viewBox: "0 0 200 100",
    path: null,
    defaultWidth: 160,
    defaultHeight: 80,
  },
  {
    id: "rectangle",
    label: "Rectangle",
    viewBox: "0 0 200 200",
    path: null,
    defaultWidth: 160,
    defaultHeight: 100,
  },
];

export function getShapePreset(id: ShapePreset): ShapePresetDef | undefined {
  return SHAPE_PRESETS.find((s) => s.id === id);
}
