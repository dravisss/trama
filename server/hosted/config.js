/**
 * Hosted (public, account-less) configuration. Every value can be overridden
 * through the environment so the same image runs in QA and in production.
 */
import { resolve } from "node:path";

export function loadHostedConfig(env = process.env, { root } = {}) {
  const int = (name, fallback) => {
    if (env[name] === undefined || env[name] === "") return fallback;
    const value = Number(env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const dataRoot = resolve(env.TRAMA_DATA_ROOT || env.LOOPVIEWER_DATA_ROOT || resolve(root, "data", "hosted"));
  const publicUrl = String(env.TRAMA_PUBLIC_URL || `http://localhost:${int("PORT", 4180)}`).replace(/\/+$/, "");
  return {
    root,
    dataRoot,
    publicUrl,
    host: env.HOST || "0.0.0.0",
    port: int("PORT", 4180),
    productName: env.TRAMA_PRODUCT_NAME || "Trama",
    contact: env.TRAMA_CONTACT || "",
    // Trust proxy headers only when a reverse proxy is in front. Behind
    // Cloudflare use TRAMA_CLIENT_IP_HEADER=cf-connecting-ip (Cloudflare
    // overwrites it; X-Forwarded-For can be spoofed by the client).
    trustProxy: env.TRAMA_TRUST_PROXY === "1",
    clientIpHeader: String(env.TRAMA_CLIENT_IP_HEADER || "x-forwarded-for").toLowerCase(),
    limits: {
      jsonBytes: int("TRAMA_MAX_JSON_BYTES", 4 * 1024 * 1024),
      assetBytes: int("TRAMA_MAX_ASSET_BYTES", 8 * 1024 * 1024),
      workspaceBytes: int("TRAMA_MAX_WORKSPACE_BYTES", 64 * 1024 * 1024),
      mapsPerWorkspace: int("TRAMA_MAX_MAPS", 200),
      presentationsPerWorkspace: int("TRAMA_MAX_PRESENTATIONS", 200),
      viewsPerWorkspace: int("TRAMA_MAX_VIEWS", 400),
      assetsPerWorkspace: int("TRAMA_MAX_ASSETS", 300),
      versionsPerRecord: int("TRAMA_VERSION_RETENTION", 40),
      openStores: int("TRAMA_OPEN_STORES", 64)
    },
    rateLimits: {
      // Requests per minute per client IP.
      read: int("TRAMA_RATE_READ", 1200),
      write: int("TRAMA_RATE_WRITE", 600),
      // Workspace creations per hour per client IP (a workshop may share one NAT).
      create: int("TRAMA_RATE_CREATE", 120)
    },
    retention: {
      // Workspaces nobody opened for this long are removed by the sweeper.
      inactiveDays: int("TRAMA_RETENTION_DAYS", 365),
      // Workspaces that were created but never edited are removed sooner.
      untouchedDays: int("TRAMA_UNTOUCHED_DAYS", 14),
      sweepMinutes: int("TRAMA_SWEEP_MINUTES", 360)
    }
  };
}
