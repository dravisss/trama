/**
 * Fixed-window, in-memory rate limiter keyed by client and bucket. A single
 * VPS process is the deployment target, so no shared store is needed.
 */
export class RateLimiter {
  constructor() {
    this.windows = new Map();
    this.sweeper = setInterval(() => this.prune(), 60_000);
    this.sweeper.unref();
  }

  /**
   * @returns {{ allowed: boolean, retryAfter: number, remaining: number }}
   */
  hit(key, limit, windowMs, now = Date.now()) {
    if (!limit) return { allowed: true, retryAfter: 0, remaining: Infinity };
    let entry = this.windows.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, entry);
    }
    entry.count += 1;
    const allowed = entry.count <= limit;
    return {
      allowed,
      retryAfter: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000),
      remaining: Math.max(0, limit - entry.count)
    };
  }

  prune(now = Date.now()) {
    for (const [key, entry] of this.windows) if (now >= entry.resetAt) this.windows.delete(key);
  }

  close() {
    clearInterval(this.sweeper);
  }
}
