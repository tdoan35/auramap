import { Platform } from "react-native";

// AuraMap design tokens — matches auramap_design.pen
export const Colors = {
  accent: "#0EA5E9", // Cyan — primary accent per design
  accentLight: "#E0F2FE", // Light cyan bg
  accentMuted: "#7DD3FC", // Muted cyan

  bgPrimary: "#FFFFFF",
  bgSurface: "#F4F4F5",

  textPrimary: "#18181B",
  textSecondary: "#71717A",
  textTertiary: "#A1A1AA",
  textDisabled: "#D4D4D8",
  textInverted: "#FFFFFF",

  borderSubtle: "#E4E4E7",
  borderStrong: "#D4D4D8",

  error: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",

  // Map-specific
  locationBlue: "#4285F4",
  startGreen: "#22C55E",
  endRed: "#EF4444",
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
