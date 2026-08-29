export async function apiFetch(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || `Request failed: ${response.status}`);
    if (data && typeof data === "object") Object.assign(error, data);
    error.status = response.status;
    throw error;
  }
  return data;
}
