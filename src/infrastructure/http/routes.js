'use strict';

const express = require('express');
const InMemoryResultSetRepository = require('../repositories/InMemoryResultSetRepository');
const InMemoryMemberRepository = require('../repositories/InMemoryMemberRepository');
const { SeedBuilder } = require('../seed/SeedBuilder');
const ReviewService = require('../../application/services/ReviewService');
const MemberResultsService = require('../../application/services/MemberResultsService');
const SmsNotificationService = require('../../application/services/SmsNotificationService');
const ResultSetAdminService = require('../../application/services/ResultSetAdminService');
const MemberService = require('../../application/services/MemberService');
const { statusOf } = require('../../application/errors');

const repository = new InMemoryResultSetRepository(SeedBuilder.createDemoSeed());
const memberRepository = new InMemoryMemberRepository(SeedBuilder.demoMembers());
const memberService = new MemberService(memberRepository, repository);
const smsService = new SmsNotificationService((memberId) => memberService.phoneFor(memberId));
const reviewService = new ReviewService(repository, smsService);
const memberResultsService = new MemberResultsService(repository);
const adminService = new ResultSetAdminService(repository, memberRepository, reviewService);

const CLINICIAN = 'Dr A. Naidoo';
const router = express.Router();

/** Runs a handler and maps thrown domain/application errors to HTTP status codes. */
const handle = (fn, okStatus = 200) => (req, res) => {
  try {
    const out = fn(req, res);
    if (out === null || out === undefined) return res.status(404).json({ error: 'Not found' });
    return res.status(okStatus).json(out);
  } catch (error) {
    return res.status(statusOf(error)).json({ error: error.message || 'Request failed', code: error.code });
  }
};

// ---------- Clinician: review ----------
router.get('/api/queue', handle(() => reviewService.getQueue()));

// ---------- Clinician: result set CRUD ----------
router.get('/api/result-sets', handle(() => adminService.list()));
router.post('/api/result-sets', handle((req) => adminService.create(req.body || {}, CLINICIAN), 201));
router.get('/api/result-sets/:id', handle((req) => reviewService.detail(req.params.id)));
router.get('/api/result-sets/:id/raw', handle((req) => adminService.raw(req.params.id)));
router.put('/api/result-sets/:id', handle((req) => adminService.update(req.params.id, req.body || {}, CLINICIAN)));
router.patch('/api/result-sets/:id/guidance', handle((req) => adminService.saveDraft(req.params.id, (req.body || {}).body, CLINICIAN)));
router.delete('/api/result-sets/:id', handle((req) => adminService.remove(req.params.id)));

router.post('/api/result-sets/:id/release', handle((req) => {
  const payload = req.body || {};
  return reviewService.release(req.params.id, payload.body ?? payload, payload.clinicianName || payload.doctor || null);
}));
router.post('/api/result-sets/:id/withdraw', handle((req) => {
  const payload = req.body || {};
  return adminService.withdraw(req.params.id, payload.clinicianName || CLINICIAN, payload.reason || '');
}));

// ---------- Clinician: member CRUD ----------
router.get('/api/members', handle(() => memberService.list()));
router.post('/api/members', handle((req) => memberService.create(req.body || {}), 201));
router.get('/api/members/:id', handle((req) => memberService.get(req.params.id)));
router.put('/api/members/:id', handle((req) => memberService.update(req.params.id, req.body || {})));

// ---------- Member (released only, via MemberResultsService) ----------
router.get('/api/member/results', handle((req) => memberResultsService.findForMember(req.query.memberId || 'm1')));
router.get('/api/member/messages', handle((req) => smsService.forMember(req.query.memberId || 'm1')));
router.get('/api/member/results/:id', handle((req) => memberResultsService.findOne(req.query.memberId || 'm1', req.params.id)));

module.exports = router;
