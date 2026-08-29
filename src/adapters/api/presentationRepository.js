/**
 * API adapter for the PresentationRepository port.
 *
 * Presentation writes are serialized per record so a failed request can be
 * retried without allowing a later draft to overtake an earlier revision.
 */
export function createApiPresentationRepository({ fetcher, isAvailable = () => true } = {}) {
  if (typeof fetcher !== "function") {
    throw new TypeError("createApiPresentationRepository requires a fetcher");
  }

  const saveQueues = new Map();

  function enqueue(key, operation) {
    const previous = saveQueues.get(key) || Promise.resolve();
    const task = previous.catch(() => null).then(operation);
    saveQueues.set(key, task);
    return task.finally(() => {
      if (saveQueues.get(key) === task) saveQueues.delete(key);
    });
  }

  function create({ title, presentation } = {}) {
    if (!isAvailable()) return Promise.resolve(null);
    return enqueue("create", () => fetcher("/api/presentations", {
      method: "POST",
      body: { title, presentation }
    }));
  }

  function update({ id, title, presentation, expected_revision } = {}) {
    if (!isAvailable()) return Promise.resolve(null);
    return enqueue(`update:${id}`, () => fetcher(`/api/presentations/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        title,
        presentation,
        ...(expected_revision !== undefined ? { expected_revision } : {})
      }
    }));
  }

  return {
    create,
    update,
    clear() {
      saveQueues.clear();
    }
  };
}
