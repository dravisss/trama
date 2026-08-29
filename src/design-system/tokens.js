/**
 * Framework-agnostic source of truth for the LoopViewer product visual system.
 *
 * Map Style Packs are deliberately not represented here: these tokens belong to
 * the application chrome and publication profiles, not to authored canvas data.
 */

export const DESIGN_SYSTEM_SCHEMA_VERSION = "1.0.0";
export const DESIGN_SYSTEM_THEME = "matcha";

export const designTokens = Object.freeze({
  foundation: {
    color: {
      forest950: "#183326",
      forest900: "#203D2D",
      forest800: "#2F5037",
      productPrimary: "#2B3A2E",
      forestMuted: "#7A8A72",
      moss600: "#6F9A5B",
      moss500: "#83A96C",
      accent: "#3F6F78",
      accentStrong: "#315A62",
      sage200: "#DFE8D3",
      sage100: "#EDF1E5",
      neutral: "#ECE8DB",
      paper: "#FFFDF5",
      paperWarm: "#F8F5EB",
      paperEditorial: "#F7F3E7",
      canvas: "#FBFAF4",
      ink: "#20382A",
      muted: "#637065",
      line: "#DED9CA",
      lineStrong: "#C9C4B5",
      canvasLine: "#D8D4C7",
      editorialLineStrong: "#C8C5B8",
      editorialTones: {
        tone122a20: "#122a20",
        tone193527: "#193527",
        tone1d3828: "#1d3828",
        tone24452f: "#24452f",
        tone25352a: "#25352a",
        tone28422f: "#28422f",
        tone29342b: "#29342b",
        tone2f4435: "#2f4435",
        tone2f4736: "#2f4736",
        tone2f5137: "#2f5137",
        tone314a38: "#314a38",
        tone31583b: "#31583b",
        tone334b38: "#334b38",
        tone335d3e: "#335d3e",
        tone35513b: "#35513b",
        tone38503e: "#38503e",
        tone395640: "#395640",
        tone3d5d42: "#3d5d42",
        tone416f49: "#416f49",
        tone45604a: "#45604a",
        tone45614b: "#45614b",
        tone46613f: "#46613f",
        tone4b624f: "#4b624f",
        tone4f7c49: "#4f7c49",
        tone507d4e: "#507d4e",
        tone526257: "#526257",
        tone536256: "#536256",
        tone596452: "#596452",
        tone5d8b51: "#5d8b51",
        tone5d9250: "#5d9250",
        tone5f785f: "#5f785f",
        tone5f9755: "#5f9755",
        tone628b54: "#628b54",
        tone638b51: "#638b51",
        tone657266: "#657266",
        tone679258: "#679258",
        tone69776c: "#69776c",
        tone6c7d6e: "#6c7d6e",
        tone6c9a5b: "#6c9a5b",
        tone6d8f5d: "#6d8f5d",
        tone6e7e70: "#6e7e70",
        tone6f7568: "#6f7568",
        tone6f9d5e: "#6f9d5e",
        tone709c62: "#709c62",
        tone718070: "#718070",
        tone718071: "#718071",
        tone718072: "#718072",
        tone738274: "#738274",
        tone748274: "#748274",
        tone778575: "#778575",
        tone7a8a72: "#7a8a72",
        tone7a8979: "#7a8979",
        tone7b382f: "#7b382f",
        tone7b8779: "#7b8779",
        tone819080: "#819080",
        tone81a573: "#81a573",
        tone83a277: "#83a277",
        tone83a773: "#83a773",
        tone8a5149: "#8a5149",
        tone8d3d35: "#8d3d35",
        tone9b5b4d: "#9b5b4d",
        tone9ca69a: "#9ca69a",
        tone9cb896: "#9cb896",
        tonea04e44: "#a04e44",
        tonea06b49: "#a06b49",
        tonea8bea0: "#a8bea0",
        toneaab9a3: "#aab9a3",
        toneaac19f: "#aac19f",
        toneb5c7ac: "#b5c7ac",
        toneb9b7aa: "#b9b7aa",
        tonec6d0b9: "#c6d0b9",
        tonec7867e: "#c7867e",
        toned6dfca: "#d6dfca",
        tonee8ecdf: "#e8ecdf",
        tonee0eed9: "#e0eed9",
        tonee1edd8: "#e1edd8",
        tonee1eedb: "#e1eedb",
        tonee2edd9: "#e2edd9",
        tonee2efdc: "#e2efdc",
        tonee3eedc: "#e3eedc",
        tonee5efde: "#e5efde",
        tonee6f0df: "#e6f0df",
        tonee9f1e3: "#e9f1e3",
        toneedf3e6: "#edf3e6",
        toneedf4e7: "#edf4e7",
        toneeef3e7: "#eef3e7",
        toneeff5e9: "#eff5e9",
        tonef0f4e8: "#f0f4e8",
        tonef0f4e9: "#f0f4e9",
        tonef0f5e9: "#f0f5e9",
        tonef1efe4: "#f1efe4",
        tonef1f6ea: "#f1f6ea",
        tonef3f0e5: "#f3f0e5",
        tonef3f1e7: "#f3f1e7",
        tonef5f2e8: "#f5f2e8",
        tonef6f2e7: "#f6f2e7",
        tonef6f4eb: "#f6f4eb",
        tonef7f4e9: "#f7f4e9",
        tonef8f5e9: "#f8f5e9",
        tonef8f6eb: "#f8f6eb",
        tonef8f7ef: "#f8f7ef",
        tonef8f8ef: "#f8f8ef",
        tonefaf7ed: "#faf7ed",
        tonefaf8f0: "#faf8f0",
        tonefaf9f2: "#faf9f2",
        tonefbefeb: "#fbefeb",
        tonefbf8ef: "#fbf8ef",
        tonefbf9f1: "#fbf9f1",
        tonefbfaf2: "#fbfaf2",
        tonefffdf6: "#fffdf6",
        tonefffef9: "#fffef9",
        tonefffefb: "#fffefb"
      },
      blue: "#26789B",
      danger: "#99594B",
      dangerAccessible: "#8C4F43",
      white: "#FFFFFF",
      black: "#162019",
      presentBackground: "#15241B",
      presentSurface: "#20382A"
    },
    spacing: {
      1: "4px",
      2: "6px",
      3: "8px",
      4: "10px",
      5: "12px",
      6: "14px",
      7: "16px",
      8: "20px",
      9: "24px",
      10: "30px",
      11: "36px",
      12: "48px"
    },
    radius: {
      sm: "9px",
      md: "14px",
      lg: "20px",
      pill: "999px"
    },
    shadow: {
      sm: "0 7px 20px rgba(29, 53, 38, .07)",
      md: "0 12px 28px rgba(29, 53, 38, .10)",
      lg: "0 24px 64px rgba(29, 53, 38, .14)"
    },
    typography: {
      displayFamily: '"Noto Serif", Georgia, serif',
      bodyFamily: '"Noto Sans", system-ui, sans-serif',
      codeFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      bodySize: "13px",
      bodyLineHeight: "1.5",
      labelSize: "11px",
      metaSize: "9px"
    },
    motion: {
      fast: "120ms",
      normal: "220ms",
      slow: "380ms",
      easeStandard: "cubic-bezier(.22, .8, .28, 1)"
    },
    zIndex: {
      base: 0,
      canvas: 1,
      panel: 10,
      sticky: 20,
      navigation: 25,
      overlay: 50,
      dialog: 70,
      tooltip: 80
    },
    breakpoint: {
      compact: "1180px",
      tablet: "820px",
      mobile: "720px"
    }
  },
  semantic: {
    color: {
      bg: {
        app: "$foundation.color.paperWarm",
        surface: "$foundation.color.paper",
        subtle: "$foundation.color.sage100",
        canvas: "$foundation.color.canvas",
        present: "$foundation.color.presentBackground"
      },
      text: {
        primary: "$foundation.color.ink",
        strong: "$foundation.color.forest950",
        muted: "$foundation.color.muted",
        inverse: "$foundation.color.paper",
        link: "$foundation.color.blue",
        danger: "$foundation.color.dangerAccessible",
        success: "$foundation.color.forest800"
      },
      border: {
        default: "$foundation.color.line",
        strong: "$foundation.color.lineStrong",
        focus: "$foundation.color.moss600"
      },
      action: {
        primary: "$foundation.color.forest900",
        primaryHover: "$foundation.color.forest800",
        accent: "$foundation.color.moss600",
        danger: "$foundation.color.danger"
      },
      focus: {
        ring: "rgba(111, 154, 91, .52)"
      }
    },
    density: {
      comfortable: {
        controlHeight: "44px",
        panelPadding: "$foundation.spacing.9",
        controlGap: "$foundation.spacing.5"
      },
      compact: {
        controlHeight: "36px",
        panelPadding: "$foundation.spacing.7",
        controlGap: "$foundation.spacing.3"
      },
      immersive: {
        controlHeight: "40px",
        panelPadding: "$foundation.spacing.8",
        controlGap: "$foundation.spacing.4"
      }
    }
  },
  component: {
    button: {
      heightSm: "32px",
      heightMd: "36px",
      heightTouch: "44px",
      radius: "$foundation.radius.sm",
      paddingInline: "$foundation.spacing.6"
    },
    field: {
      height: "36px",
      heightTouch: "44px",
      radius: "$foundation.radius.sm"
    },
    panel: {
      radius: "$foundation.radius.md",
      paddingCompact: "$foundation.spacing.7",
      paddingComfortable: "$foundation.spacing.9"
    },
    toolbar: {
      gap: "$foundation.spacing.3",
      radius: "$foundation.radius.md"
    },
    tooltip: {
      maxWidth: "260px"
    },
    dialog: {
      maxWidth: "560px"
    },
    story: {
      ink: "#20382a",
      muted: "#6a756b",
      line: "#ded9ca",
      lineStrong: "#c8c3b4",
      paper: "#fffdf5",
      wash: "#f5f3e9",
      sage: "#e9efdf",
      moss: "#6f9a5b",
      forest: "#274936",
      danger: "#a25248",
      shadow: "0 12px 28px rgba(31, 56, 41, .08)"
    }
  }
});

export function getToken(path) {
  return path.split(".").reduce((value, key) => value?.[key], designTokens);
}

export function resolveToken(value, seen = new Set()) {
  if (typeof value !== "string" || !value.startsWith("$")) return value;
  const path = value.slice(1);
  if (seen.has(path)) throw new Error(`Circular design token reference: ${path}`);
  const next = getToken(path);
  if (next === undefined) throw new Error(`Unknown design token reference: ${path}`);
  return resolveToken(next, new Set([...seen, path]));
}

export function resolveFoundationColor(name) {
  return resolveToken(designTokens.foundation.color[name]);
}

/**
 * Concrete defaults used by product controls. Keeping these values here makes
 * component code consume the same token contract as the CSS and publications.
 */
export const designSystemDefaults = Object.freeze({
  editorCanvas: resolveToken("$foundation.color.paper"),
  editorNodeFill: resolveToken("$foundation.color.editorialTones.tonee8ecdf"),
  editorNodeText: resolveToken("$foundation.color.productPrimary"),
  editorRelation: resolveToken("$foundation.color.editorialTones.tone7a8a72")
});
