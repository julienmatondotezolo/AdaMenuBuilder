import type { ColorScheme, FontScheme } from "../../../types/template";
import { useTranslation } from "../../../i18n";
import { LANGUAGES } from "../../../i18n/LanguageContext";

interface Props {
  colors: ColorScheme;
  fonts: FontScheme;
  contentPaddingX: number;
  t: (key: string) => string;
}

export default function WebLanguageSwitcher({ colors, fonts, contentPaddingX, t }: Props) {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      style={{
        padding: `20px ${contentPaddingX}px 32px`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          fontWeight: 600,
          color: colors.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 10,
        }}
      >
        {t("qrMenu.language")}
      </div>
      <div
        style={{
          display: "inline-flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={(e) => {
                e.stopPropagation();
                setLanguage(lang.code);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                backgroundColor: isActive ? colors.primary : colors.muted + "15",
                color: isActive ? "#fff" : colors.text,
                border: isActive ? "none" : `1px solid ${colors.muted}30`,
                cursor: "pointer",
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.15s",
              }}
            >
              {lang.nativeLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
