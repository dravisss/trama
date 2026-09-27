import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Capability tokens. Possessing the edit token is the only authorization in
 * the account-less model, so tokens are long, random and never stored in
 * plain text. Share tokens are read-only and stored as-is so editors can see
 * them again.
 */
export const EDIT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
export const WORKSPACE_ID_PATTERN = /^[a-f0-9]{24}$/;

export function createEditToken() {
  return randomBytes(24).toString("base64url"); // 32 chars, 192 bits
}

export function createShareToken() {
  return randomBytes(16).toString("base64url"); // 22 chars, 128 bits
}

export function createWorkspaceId() {
  return randomBytes(12).toString("hex");
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Accept a bare token, `/w/<token>`, or a full workspace URL. */
export function extractEditToken(value) {
  const text = String(value || "").trim();
  if (EDIT_TOKEN_PATTERN.test(text)) return text;
  const match = text.match(/\/w\/([A-Za-z0-9_-]{32,64})(?:[/?#]|$)/);
  return match ? match[1] : null;
}
