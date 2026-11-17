'use strict';

const express = require('express');
const InMemoryResultSetRepository = require('../repositories/InMemoryResultSetRepository');
const { SeedBuilder } = require('../seed/SeedBuilder');
const ReviewService = require('../../application/services/ReviewService');
const MemberResultsService = require('../../application/services/MemberResultsService');

const repository = new InMemoryResultSetRepository(SeedBuilder.createDemoSeed());
const reviewService = new ReviewService(repository);
const memberResultsService = new MemberResultsService(repository);

const router = express.Router();

router.get('/api/queue', (req, res) => {
  res.json(reviewService.getQueue());
});

router.get('/api/result-sets/:id', (req, res) => {
  const detail = reviewService.detail(req.params.id);
  if (!detail) return res.status(404).json({ error: 'Result set not found' });
  return res.json(detail);
});

router.post('/api/result-sets/:id/release', (req, res) => {
  try {
    const payload = req.body || {};
    const result = reviewService.release(req.params.id, payload.body ?? payload, payload.clinicianName || payload.doctor || null);
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message || 'Unable to release result set' });
  }
});

router.get('/api/member/results', (req, res) => {
  const memberId = req.query.memberId || 'm1';
  res.json(memberResultsService.findForMember(memberId));
});

router.get('/api/member/results/:id', (req, res) => {
  const memberId = req.query.memberId || 'm1';
  const result = memberResultsService.findOne(memberId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Result not found' });
  return res.json(result);
});

module.exports = router;
