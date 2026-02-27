import { Platform } from "react-native";

// AuraMap brand colors
export const Colors = {
  primary: "#00BFA6", // Deep teal
  accent: "#FFB74D", // Warm amber
  background: "#121212",
  surface: "rgba(20, 20, 20, 0.97)",
  text: "#FFFFFF",
  textSecondary: "#999999",
  textMuted: "#666666",
  error: "#FF6B6B",
  success: "#81C784",
  info: "#4FC3F7",
  divider: "rgba(255,255,255,0.08)",

  light: {
    text: "#11181C",
    background: "#fff",
    tint: "#00BFA6",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: "#00BFA6",
  },
  dark: {
    text: "#ECEDEE",
    background: "#121212",
    tint: "#00BFA6",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#00BFA6",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
