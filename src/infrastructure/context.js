'use strict';

/**
 * Wires repositories and services together. Used by the Express server (one long-lived
 * context) and by the in-browser backend for GitHub Pages (rebuilt from saved state).
 */
const { ResultSet, Member } = require('../domain');
const InMemoryResultSetRepository = require('./repositories/InMemoryResultSetRepository');
const InMemoryMemberRepository = require('./repositories/InMemoryMemberRepository');
const { SeedBuilder } = require('./seed/SeedBuilder');
const ReviewService = require('../application/services/ReviewService');
const MemberResultsService = require('../application/services/MemberResultsService');
const SmsNotificationService = require('../application/services/SmsNotificationService');
const ResultSetAdminService = require('../application/services/ResultSetAdminService');
const MemberService = require('../application/services/MemberService');

function createContext(state = null) {
  const results = state ? state.results.map((p) => new ResultSet(p)) : SeedBuilder.createDemoSeed();
  const members = state ? state.members.map((p) => new Member(p)) : SeedBuilder.demoMembers();

  const repository = new InMemoryResultSetRepository(results);
  const memberRepository = new InMemoryMemberRepository(members);
  const memberService = new MemberService(memberRepository, repository);
  const smsService = new SmsNotificationService((memberId) => memberService.phoneFor(memberId));
  if (state && Array.isArray(state.outbox)) smsService.outbox = state.outbox;
  const reviewService = new ReviewService(repository, smsService);
  const memberResultsService = new MemberResultsService(repository);
  const adminService = new ResultSetAdminService(repository, memberRepository, reviewService);

  return { repository, memberRepository, memberService, smsService, reviewService, memberResultsService, adminService };
}

/** Plain JSON snapshot of a context, for saving. */
function serialize(ctx) {
  return {
    results: ctx.repository.findAll().map((rs) => rs.toProps()),
    members: ctx.memberRepository.findAll().map((m) => ({ id: m.id, name: m.name, riskCategory: m.riskCategory, phone: m.phone })),
    outbox: ctx.smsService.outbox,
  };
}

module.exports = { createContext, serialize };
