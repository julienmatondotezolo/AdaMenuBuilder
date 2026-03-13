import type { WebImageBannerBlock as WebImageBannerBlockType } from "../../../types/template";
import type { ColorScheme } from "../../../types/template";

interface Props {
  block: WebImageBannerBlockType;
  colors: ColorScheme;
}

export default function WebImageBannerBlock({ block, colors }: Props) {
  if (!block.imageUrl) {
    return (
      <div
        style={{
          height: block.height,
          backgroundColor: colors.muted + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.muted,
          fontSize: 13,
          fontStyle: "italic",
        }}
      >
        Image banner — set an image URL
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: block.height,
        overflow: "hidden",
      }}
    >
      <img
        src={block.imageUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: block.objectFit,
          display: "block",
        }}
      />
    </div>
  );
}
