import { designTokens, resolveToken } from "./tokens.js";

const TOKEN_NAME = /^(?:[a-z][A-Za-z0-9]*|\d+)$/;

export function flattenTokens(value, prefix = []) {
  const entries = [];
  for (const [key, child] of Object.entries(value || {})) {
    if (!TOKEN_NAME.test(key)) throw new Error(`Invalid design token segment: ${key}`);
    const path = [...prefix, key];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      entries.push(...flattenTokens(child, path));
    } else {
      entries.push({ path: path.join("."), value: child });
    }
  }
  return entries;
}

export function validateDesignTokens(tokens = designTokens) {
  const entries = flattenTokens(tokens);
  const paths = new Set(entries.map(entry => entry.path));
  for (const entry of entries) {
    if (entry.value === undefined || entry.value === null || entry.value === "") {
      throw new Error(`Design token ${entry.path} has no value`);
    }
    if (typeof entry.value === "string" && entry.value.startsWith("$")) {
      const reference = entry.value.slice(1);
      if (!paths.has(reference)) throw new Error(`Design token ${entry.path} references missing ${reference}`);
      resolveToken(entry.value);
    }
  }
  return { entries, count: entries.length };
}

export function tokenPathToCssVar(path) {
  return `--lv-${path.replaceAll(".", "-")}`;
}
