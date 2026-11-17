'use strict';

/**
 * The API, defined once and framework-free. Express (server) and the in-browser backend
 * (GitHub Pages) both call dispatch(), so the two can never drift apart.
 */
const { statusOf } = require('../../application/errors');

const CLINICIAN = 'Dr A. Naidoo';
const memberOf = (q) => (q && q.memberId) || 'm1';

// [method, pattern, handler(ctx, params, body, query), okStatus]
const ROUTES = [
  ['GET', '/api/queue', (c) => c.reviewService.getQueue()],

  ['GET', '/api/result-sets', (c) => c.adminService.list()],
  ['POST', '/api/result-sets', (c, p, b) => c.adminService.create(b, CLINICIAN), 201],
  ['GET', '/api/result-sets/:id', (c, p) => c.reviewService.detail(p.id)],
  ['GET', '/api/result-sets/:id/raw', (c, p) => c.adminService.raw(p.id)],
  ['PUT', '/api/result-sets/:id', (c, p, b) => c.adminService.update(p.id, b, CLINICIAN)],
  ['PATCH', '/api/result-sets/:id/guidance', (c, p, b) => c.adminService.saveDraft(p.id, b.body, CLINICIAN)],
  ['DELETE', '/api/result-sets/:id', (c, p) => c.adminService.remove(p.id)],
  ['POST', '/api/result-sets/:id/release', (c, p, b) => c.reviewService.release(p.id, b.body ?? b, b.clinicianName || b.doctor || null)],
  ['POST', '/api/result-sets/:id/withdraw', (c, p, b) => c.adminService.withdraw(p.id, b.clinicianName || CLINICIAN, b.reason || '')],

  ['GET', '/api/members', (c) => c.memberService.list()],
  ['POST', '/api/members', (c, p, b) => c.memberService.create(b), 201],
  ['GET', '/api/members/:id', (c, p) => c.memberService.get(p.id)],
  ['PUT', '/api/members/:id', (c, p, b) => c.memberService.update(p.id, b)],

  // Member-facing: released only, via MemberResultsService
  ['GET', '/api/member/results', (c, p, b, q) => c.memberResultsService.findForMember(memberOf(q))],
  ['GET', '/api/member/messages', (c, p, b, q) => c.smsService.forMember(memberOf(q))],
  ['GET', '/api/member/results/:id', (c, p, b, q) => c.memberResultsService.findOne(memberOf(q), p.id)],
].map(([method, pattern, handler, ok = 200]) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
  return { method, re, keys, handler, ok };
});

/** -> { status, body } */
function dispatch(ctx, method, path, body = {}, query = {}) {
  const route = ROUTES.find((r) => r.method === method.toUpperCase() && r.re.test(path));
  if (!route) return { status: 404, body: { error: `Cannot ${method} ${path}` } };
  const m = path.match(route.re);
  const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
  try {
    const out = route.handler(ctx, params, body || {}, query || {});
    if (out === null || out === undefined) return { status: 404, body: { error: 'Not found' } };
    return { status: route.ok, body: out };
  } catch (error) {
    return { status: statusOf(error), body: { error: error.message || 'Request failed', code: error.code } };
  }
}

const isMutation = (method) => method.toUpperCase() !== 'GET';

module.exports = { dispatch, isMutation };
