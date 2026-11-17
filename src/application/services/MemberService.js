'use strict';

const { Member } = require('../../domain');
const { appError } = require('../errors');

const view = (m) => ({ id: m.id, name: m.name, riskCategory: m.riskCategory, phone: m.phone });

class MemberService {
  constructor(memberRepo, resultRepo) {
    this.members = memberRepo;
    this.results = resultRepo;
  }

  list() {
    return this.members.findAll().map((m) => ({
      ...view(m),
      resultCount: this.results.findByMember(m.id).length,
    }));
  }

  get(id) {
    const m = this.members.find(id);
    if (!m) throw appError('NOT_FOUND', `Member ${id} not found`);
    return view(m);
  }

  phoneFor(id) {
    const m = this.members.find(id);
    return m ? m.phone : null;
  }

  create(input = {}) {
    const max = this.members.findAll().reduce((n, m) => Math.max(n, Number(String(m.id).replace(/\D/g, '')) || 0), 0);
    const member = this.build({ id: `m${max + 1}`, name: input.name, riskCategory: input.riskCategory || undefined, phone: input.phone || null });
    this.members.save(member);
    return view(member);
  }

  update(id, input = {}) {
    const current = this.members.find(id);
    if (!current) throw appError('NOT_FOUND', `Member ${id} not found`);
    const changes = {};
    for (const k of ['name', 'riskCategory', 'phone']) if (input[k] !== undefined) changes[k] = input[k] === '' && k === 'phone' ? null : input[k];
    let updated;
    try { updated = current.with(changes); } catch (e) { throw appError('INVALID', e.message); }
    this.members.save(updated);
    // Keep the denormalised name on result sets in step
    for (const rs of this.results.findByMember(id)) { rs.memberName = updated.name; this.results.save(rs); }
    return view(updated);
  }

  build(props) {
    try { return new Member(props); } catch (e) { throw appError('INVALID', e.message); }
  }
}

module.exports = MemberService;
