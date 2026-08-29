import { designTokens, resolveFoundationColor } from "../design-system/tokens.js";

const colors = designTokens.foundation.color;

export const matchaTheme = {
  colors: {
    primary: resolveFoundationColor("productPrimary"),
    secondary: resolveFoundationColor("muted"),
    tertiary: resolveFoundationColor("moss600"),
    neutral: resolveFoundationColor("neutral"),
    surface: resolveFoundationColor("paperEditorial"),
    line: resolveFoundationColor("canvasLine")
  },
  nodePalette: [
    ["#526653", "#F2F0E6"], ["#667762", "#E8ECDF"], ["#76836F", "#F5F1E5"],
    ["#596B57", "#E4EADB"], [colors.muted, "#F1EEE3"], ["#485C4C", "#E9E7DC"],
    ["#6A7865", "#EEF0E7"], ["#5D705A", "#F4F0E4"], ["#71806A", "#E5E9DF"]
  ],
  nodeSize: 90,
  fontFamily: "Noto Sans, system-ui, sans-serif",
  annotationFontFamily: "Noto Sans, system-ui, sans-serif"
};
