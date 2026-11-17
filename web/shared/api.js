// Single API client for web and mobile.
// - With the Express server (npm start): real HTTP calls to /api/...
// - On GitHub Pages (static hosting, no server): the same backend runs in the browser
//   (shared/backend.js), with state saved in this browser. Force it with ?static=1.
export const STATIC_MODE = /\.github\.io$/.test(location.hostname) || new URLSearchParams(location.search).has('static');

let backendReady = null;
function backend() {
  if (!backendReady) {
    backendReady = new Promise((resolve, reject) => {
      if (globalThis.FXBackend) return resolve(globalThis.FXBackend);
      const s = document.createElement('script');
      s.src = new URL('./backend.js', import.meta.url).href;
      s.onload = () => resolve(globalThis.FXBackend);
      s.onerror = () => reject(new Error('Could not load the offline backend'));
      document.head.appendChild(s);
    });
  }
  return backendReady;
}

async function request(method, path, body) {
  let status;
  let data;
  if (STATIC_MODE) {
    const res = (await backend()).request(method, path, body);
    status = res.status;
    data = res.body;
  } else {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    status = res.status;
    data = await res.json().catch(() => ({}));
  }
  if (status === 404 && method === 'GET') return null;
  if (status >= 400) throw new Error((data && data.error) || `Request failed (${status})`);
  return data;
}

export const api = {
  // Clinician
  queue: () => request('GET', '/api/queue'),
  staffDetail: (id) => request('GET', `/api/result-sets/${encodeURIComponent(id)}`),
  release: (id, body, clinicianName) =>
    request('POST', `/api/result-sets/${encodeURIComponent(id)}/release`, { body, clinicianName }),
  // Clinician CRUD
  allResultSets: () => request('GET', '/api/result-sets'),
  rawResultSet: (id) => request('GET', `/api/result-sets/${encodeURIComponent(id)}/raw`),
  createResultSet: (data) => request('POST', '/api/result-sets', data),
  updateResultSet: (id, data) => request('PUT', `/api/result-sets/${encodeURIComponent(id)}`, data),
  saveDraft: (id, body) => request('PATCH', `/api/result-sets/${encodeURIComponent(id)}/guidance`, { body }),
  withdraw: (id, reason, clinicianName) => request('POST', `/api/result-sets/${encodeURIComponent(id)}/withdraw`, { reason, clinicianName }),
  deleteResultSet: (id) => request('DELETE', `/api/result-sets/${encodeURIComponent(id)}`),
  members: () => request('GET', '/api/members'),
  createMember: (data) => request('POST', '/api/members', data),
  updateMember: (id, data) => request('PUT', `/api/members/${encodeURIComponent(id)}`, data),
  // Member: released only; detail returns null when not released (404)
  memberResults: () => request('GET', '/api/member/results'),
  memberMessages: () => request('GET', '/api/member/messages'),
  memberResult: (id) => request('GET', `/api/member/results/${encodeURIComponent(id)}`),
  // GitHub Pages only: wipe this browser's demo data back to the seed
  resetDemo: () => request('POST', '/api/demo/reset'),
};
