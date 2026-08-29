export class InteractionMetrics {
  constructor(limit = 120) {
    this.limit = limit;
    this.active = null;
    this.completed = [];
  }

  begin(type, targetId = null) {
    this.active = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      targetId,
      startedAt: now(),
      previews: 0,
      commits: 0,
      cancels: 0,
      frames: 0,
      maxPreviewMs: 0
    };
    return this.active.id;
  }

  preview(startedAt = now()) {
    if (!this.active) return;
    this.active.previews += 1;
    this.active.frames += 1;
    this.active.maxPreviewMs = Math.max(this.active.maxPreviewMs, now() - startedAt);
  }

  finish(status = "commit") {
    if (!this.active) return null;
    if (status === "commit") this.active.commits += 1;
    if (status === "cancel") this.active.cancels += 1;
    const result = {
      ...this.active,
      status,
      durationMs: now() - this.active.startedAt
    };
    this.completed.push(result);
    if (this.completed.length > this.limit) this.completed.shift();
    this.active = null;
    return result;
  }

  snapshot() {
    return {
      active: this.active ? { ...this.active } : null,
      completed: this.completed.map(item => ({ ...item }))
    };
  }
}

function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
