import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import type { MenuData, Orientation, LayoutDirection } from "../types/menu";
import MenuDocument from "../components/Preview/MenuDocument";

export async function downloadMenuPdf(
  restaurantName: string = "Menu",
  menuData: MenuData,
  orientation: Orientation = "portrait",
  columnCount: number = 1,
  layoutDirection: LayoutDirection = "Z",
): Promise<void> {
  const doc = createElement(MenuDocument, {
    menuData,
    columnCount,
    layoutDirection,
    orientation,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  const safeName = restaurantName.replace(/[^a-zA-Z0-9]+/g, "-");
  anchor.href = url;
  anchor.download = `${safeName}-Menu.pdf`;
  anchor.click();

  URL.revokeObjectURL(url);
}
