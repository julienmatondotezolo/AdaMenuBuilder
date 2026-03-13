import type { WebFooterBlock as WebFooterBlockType } from "../../../types/template";
import type { ColorScheme, FontScheme } from "../../../types/template";
import type { MenuData } from "../../../types/menu";

interface Props {
  block: WebFooterBlockType;
  menuData: MenuData;
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
}

export default function WebFooterBlock({ block, menuData, colors, fonts, contentPaddingX }: Props) {
  return (
    <div
      style={{
        padding: `24px ${contentPaddingX}px`,
        textAlign: "center",
        borderTop: `1px solid ${colors.muted}20`,
      }}
    >
      <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
        {menuData.restaurantName}
      </div>
      {block.showAddress && (
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 4 }}>
          123 Example Street, City
        </div>
      )}
      {block.showPhone && (
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 4 }}>
          +1 (555) 123-4567
        </div>
      )}
      {block.customText && (
        <div style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8 }}>
          {block.customText}
        </div>
      )}
    </div>
  );
}
