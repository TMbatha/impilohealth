// Single API client for web and mobile. Same origin as the Express server.
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Clinician
  queue: () => request('GET', '/api/queue'),
  staffDetail: (id) => request('GET', `/api/result-sets/${encodeURIComponent(id)}`),
  release: (id, body, clinicianName) =>
    request('POST', `/api/result-sets/${encodeURIComponent(id)}/release`, { body, clinicianName }),
  // Member: released only; detail returns null when not released (404)
  memberResults: () => request('GET', '/api/member/results'),
  memberResult: (id) => request('GET', `/api/member/results/${encodeURIComponent(id)}`),
};
