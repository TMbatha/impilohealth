'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const InMemoryResultSetRepository = require('../infrastructure/repositories/InMemoryResultSetRepository');
const { SeedBuilder } = require('../infrastructure/seed/SeedBuilder');
const ReviewService = require('./services/ReviewService');
const MemberResultsService = require('./services/MemberResultsService');

const repository = new InMemoryResultSetRepository(SeedBuilder.createDemoSeed());
const reviewService = new ReviewService(repository);
const memberResultsService = new MemberResultsService(repository);

test('queue includes only awaiting review items', () => {
  const queue = reviewService.getQueue();

  assert.deepEqual(queue, [{
    id: 'rs2',
    memberName: 'Lerato M. (demo)',
    collectionDate: '2026-11-17',
    urgent: false,
  }]);
});

test('release updates the result set and exposes member detail', () => {
  const repo = new InMemoryResultSetRepository(SeedBuilder.createDemoSeed());
  const review = new ReviewService(repo);
  const members = new MemberResultsService(repo);

  const release = review.release('rs2', 'Final guidance for the clinician.', 'Dr B. Sikhakhane');

  assert.deepEqual(release, {
    body: 'Final guidance for the clinician.',
    clinicianName: 'Dr B. Sikhakhane',
  });

  const memberResults = members.findForMember('m1');
  assert.equal(memberResults.length, 2);
  assert.equal(memberResults[0].state, 'released');
  assert.equal(memberResults[0].guidance, 'Final guidance for the clinician.');
});

test('member detail is hidden until released', () => {
  const repo = new InMemoryResultSetRepository(SeedBuilder.createDemoSeed());
  const members = new MemberResultsService(repo);

  const hidden = members.findOne('m1', 'rs2');
  assert.equal(hidden, null);

  const detail = members.findOne('m1', 'rs1');
  assert.equal(detail.id, 'rs1');
  assert.equal(detail.memberName, 'Lerato M. (demo)');
});
