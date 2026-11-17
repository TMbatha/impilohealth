'use strict';

const { ResultSet } = require('../../domain');
const ResultSetDto = require('../dto/ResultSetDto');
const { appError } = require('../errors');

const ANALYTES = ['HBA1C', 'FPG', 'TC', 'LDL', 'HDL', 'TG'];

const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** Accepts form-ish input and returns clean ResultSet props (values only for provided analytes). */
function cleanInput(input = {}) {
  const values = {};
  for (const code of ANALYTES) {
    const v = num(input.values ? input.values[code] : input[code]);
    if (v !== undefined) values[code] = v;
  }
  const bp = input.bloodPressure || {};
  const systolic = num(bp.systolic ?? input.systolic);
  const diastolic = num(bp.diastolic ?? input.diastolic);
  return {
    collectionDate: input.collectionDate,
    values,
    heightM: num(input.heightM) ?? null,
    weightKg: num(input.weightKg) ?? null,
    bloodPressure: systolic !== undefined || diastolic !== undefined ? { systolic, diastolic } : null,
    guidance: typeof input.guidance === 'string' ? input.guidance : undefined,
  };
}

function validate(props) {
  if (!props.collectionDate || !/^\d{4}-\d{2}-\d{2}$/.test(props.collectionDate)) {
    throw appError('INVALID', 'Collection date is required (YYYY-MM-DD)');
  }
  if (Object.keys(props.values).length === 0) throw appError('INVALID', 'Enter at least one lab value');
  for (const [code, v] of Object.entries(props.values)) {
    if (!Number.isFinite(v) || v <= 0) throw appError('INVALID', `${code} must be a positive number`);
  }
}

/** Clinician-side create / update / withdraw / delete for result sets. */
class ResultSetAdminService {
  constructor(resultRepo, memberRepo, reviewService) {
    this.repo = resultRepo;
    this.members = memberRepo;
    this.review = reviewService;
  }

  get(id) {
    const rs = this.repo.find(id);
    if (!rs) throw appError('NOT_FOUND', `Result set ${id} not found`);
    return rs;
  }

  list() {
    return this.repo.findAll().map((rs) => ({
      id: rs.id,
      memberId: rs.memberId,
      memberName: rs.memberName,
      collectionDate: rs.collectionDate,
      state: rs.state,
      urgent: ResultSetDto.queueItem(rs).urgent,
      releasedBy: rs.releasedBy,
      releasedAt: rs.releasedAt,
      deletable: rs.isDeletable(),
    }));
  }

  nextId() {
    const max = this.repo.findAll().reduce((m, rs) => Math.max(m, Number(String(rs.id).replace(/\D/g, '')) || 0), 0);
    return `rs${max + 1}`;
  }

  /** Raw editable form of one result set (for the edit screen). */
  raw(id) {
    const rs = this.get(id);
    return { ...rs.toProps(), deletable: rs.isDeletable() };
  }

  create(input, by = null) {
    const member = this.members.find(input.memberId);
    if (!member) throw appError('INVALID', 'Choose a member');
    const props = cleanInput(input);
    validate(props);
    const rs = this.build({
      ...props,
      id: this.nextId(),
      memberId: member.id,
      memberName: member.name,
      state: 'awaiting_review',
      guidance: props.guidance || '',
    });
    rs.record('created', by);
    this.repo.save(rs);
    return this.review.detail(rs.id);
  }

  update(id, input, by = null) {
    const current = this.get(id);
    current.assertEditable();
    const props = cleanInput(input);
    validate(props);
    const rs = this.build({
      ...current.toProps(),
      ...props,
      guidance: props.guidance ?? current.guidance,
    });
    rs.record('corrected', by);
    this.repo.save(rs);
    return this.review.detail(id);
  }

  saveDraft(id, body, by = null) {
    const rs = this.get(id);
    rs.saveDraft(body, by);
    this.repo.save(rs);
    return this.review.detail(id);
  }

  withdraw(id, clinicianName, reason) {
    const rs = this.get(id);
    rs.withdraw(clinicianName, reason);
    this.repo.save(rs);
    return this.review.detail(id);
  }

  remove(id) {
    const rs = this.get(id);
    rs.assertDeletable();
    this.repo.delete(id);
    return { id, deleted: true };
  }

  build(props) {
    try {
      return new ResultSet(props);
    } catch (e) {
      throw appError(e.code === 'INVALID' || !e.code ? 'INVALID' : e.code, e.message);
    }
  }
}

module.exports = ResultSetAdminService;
