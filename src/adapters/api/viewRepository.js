/**
 * API adapter for the ViewRepository port.
 *
 * The adapter preserves the existing list-then-update flow, targets the
 * submitted view id, and serializes writes per view so a retry can continue
 * after a failed request without changing the SQLite schema.
 */
export function createApiViewRepository({ fetcher, isAvailable = () => true } = {}) {
  if (typeof fetcher !== "function") {
    throw new TypeError("createApiViewRepository requires a fetcher");
  }

  const updateQueues = new Map();

  function enqueue(key, operation) {
    const previous = updateQueues.get(key) || Promise.resolve();
    const task = previous.catch(() => null).then(operation);
    updateQueues.set(key, task);
    return task.finally(() => {
      if (updateQueues.get(key) === task) updateQueues.delete(key);
    });
  }

  function update(view) {
    if (!isAvailable()) return Promise.resolve(null);
    const key = view?.id || view?.map_id;
    return enqueue(key, async () => {
      const listed = await fetcher(`/api/maps/${encodeURIComponent(view.map_id)}/views`);
      const existing = listed.views?.find(item => item.id === view.id);
      const body = {
        map_id: view.map_id,
        title: view.title,
        settings: view.settings,
        rules: view.rules,
        style_source: view.style_source
      };
      return existing
        ? fetcher(`/api/views/${encodeURIComponent(existing.id)}`, { method: "PUT", body })
        : fetcher("/api/views", { method: "POST", body });
    });
  }

  function create(view) {
    if (!isAvailable()) return Promise.resolve(null);
    return enqueue(`create:${view?.map_id}`, () => fetcher("/api/views", {
      method: "POST",
      body: {
        map_id: view.map_id,
        title: view.title,
        settings: view.settings,
        rules: view.rules,
        style_source: view.style_source
      }
    }));
  }

  function remove(view) {
    if (!isAvailable()) return Promise.resolve(null);
    return enqueue(`delete:${view?.id}`, () => fetcher(`/api/views/${encodeURIComponent(view.id)}`, {
      method: "DELETE"
    }));
  }

  return {
    update,
    create,
    delete: remove,
    clear() {
      updateQueues.clear();
    }
  };
}
