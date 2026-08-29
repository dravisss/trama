/**
 * API adapter for the MapRepository port.
 *
 * The adapter preserves the existing map PUT contract and serializes writes
 * per map so an autosave cannot overtake an earlier request for the same
 * record. Availability remains an infrastructure concern: offline writes are
 * skipped just as they were before this adapter was extracted.
 */
export function createApiMapRepository({ fetcher, isAvailable = () => true } = {}) {
  if (typeof fetcher !== "function") {
    throw new TypeError("createApiMapRepository requires a fetcher");
  }

  const updateQueues = new Map();

  function update(map) {
    if (!isAvailable()) return Promise.resolve(null);

    const key = map?.id;
    const previous = updateQueues.get(key) || Promise.resolve();
    const task = previous.catch(() => null).then(() => fetcher(`/api/maps/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: {
        title: map.title || map.model?.title || map.id,
        description_md: map.description_md || map.model?.description || "",
        model: map.model
      }
    }));
    updateQueues.set(key, task);
    return task.finally(() => {
      if (updateQueues.get(key) === task) updateQueues.delete(key);
    });
  }

  return {
    update,
    clear() {
      updateQueues.clear();
    }
  };
}
