'use strict';

/**
 * In-browser backend for GitHub Pages (no server available). Runs the same domain rules,
 * services and route table as the Express server. State is kept in localStorage so a
 * release survives refreshes and is seen by other tabs (web app + mobile app).
 *
 * Bundled into web/shared/backend.js by `npm run build:static`.
 */
const { createContext, serialize } = require('../infrastructure/context');
const { dispatch, isMutation } = require('../infrastructure/http/routeTable');

const KEY = 'fx-health-demo-state-v1';
let memoryState = null; // fallback when storage is blocked

function load() {
  try {
    const raw = globalThis.localStorage && globalThis.localStorage.getItem(KEY);
    if (raw) return createContext(JSON.parse(raw));
  } catch (e) { /* corrupted or blocked: fall through */ }
  return createContext(memoryState);
}

function save(ctx) {
  const state = serialize(ctx);
  memoryState = state;
  try { globalThis.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}

function request(method, path, body) {
  const [pathname, qs] = path.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  if (pathname === '/api/demo/reset' && method.toUpperCase() === 'POST') {
    memoryState = null;
    try { globalThis.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return { status: 200, body: { reset: true } };
  }
  const ctx = load();
  const res = dispatch(ctx, method, pathname, body ? JSON.parse(JSON.stringify(body)) : {}, query);
  if (isMutation(method) && res.status < 400) save(ctx);
  return JSON.parse(JSON.stringify(res));
}

module.exports = { request };
