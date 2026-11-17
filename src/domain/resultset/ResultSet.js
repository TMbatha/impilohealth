'use strict';

const ResultSetState = require('./ResultSetState');
const AnalyteValue = require('../analyte/AnalyteValue');
const ThresholdSet = require('../thresholds/ThresholdSet');

class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

/**
 * Aggregate root: one blood draw for one member.
 *
 * new ResultSet({
 *   id, memberId, memberName, collectionDate, state,
 *   values: { HBA1C: 5.8, LDL: { value: 3.1, unit: 'mmol/L' }, ... },
 *   heightM, weightKg, bloodPressure: { systolic, diastolic },
 *   guidance, releasedBy, releasedAt
 * })
 *
 * Every value is wrapped in an AnalyteValue, so a wrong unit or unknown analyte throws here.
 */
class ResultSet {
  constructor(props, thresholds = ThresholdSet.default) {
    if (!props || !props.id) throw new DomainError('INVALID', 'ResultSet requires an id');
    if (!props.memberId) throw new DomainError('INVALID', 'ResultSet requires a memberId');
    const state = props.state || ResultSetState.AWAITING_REVIEW;
    if (!Object.values(ResultSetState).includes(state)) throw new DomainError('INVALID', `Bad state: ${state}`);

    this.id = props.id;
    this.memberId = props.memberId;
    this.memberName = props.memberName || null;
    this.collectionDate = props.collectionDate;
    this.state = state;
    this.heightM = props.heightM ?? null;
    this.weightKg = props.weightKg ?? null;
    this.bloodPressure = props.bloodPressure || null;
    this.guidance = props.guidance || '';
    this.releasedBy = props.releasedBy || null;
    this.releasedAt = props.releasedAt || null;
    this.history = Array.isArray(props.history) ? [...props.history] : [];
    // Seeded/imported released sets get their release on record, so it can't be forgotten later.
    if (state === ResultSetState.RELEASED && !this.history.some((h) => h.action === 'released')) {
      this.history.push({ action: 'released', by: this.releasedBy, at: this.releasedAt, note: '' });
    }

    this.analyteValues = {};
    for (const [code, input] of Object.entries(props.values || {})) {
      const analyte = thresholds.analyte(code);
      if (!analyte) throw new DomainError('INVALID', `Unknown analyte: ${code}`);
      const { value, unit } = typeof input === 'object' && input !== null ? input : { value: input, unit: undefined };
      this.analyteValues[code] = new AnalyteValue(analyte, value, unit);
    }
  }

  /** The member gate. Nothing reaches a member unless this is true. */
  isVisibleToMember() {
    return this.state === ResultSetState.RELEASED;
  }

  isAwaitingReview() {
    return this.state === ResultSetState.AWAITING_REVIEW;
  }

  release(body, clinicianName, at = new Date()) {
    if (!this.isAwaitingReview()) throw new DomainError('ALREADY_RELEASED', `Result set ${this.id} is already released`);
    if (!clinicianName || !String(clinicianName).trim()) throw new DomainError('INVALID', 'Release requires a clinician name');
    if (typeof body === 'string' && body.trim()) this.guidance = body;
    if (!this.guidance.trim()) throw new DomainError('INVALID', 'Release requires guidance text');
    this.state = ResultSetState.RELEASED;
    this.releasedBy = String(clinicianName).trim();
    this.releasedAt = (at instanceof Date ? at : new Date(at)).toISOString();
    this.record('released', this.releasedBy, this.releasedAt);
    return this;
  }

  /** Lab values, measures and guidance may only change before release. */
  assertEditable() {
    if (!this.isAwaitingReview()) {
      throw new DomainError('NOT_EDITABLE', `Result set ${this.id} is released; withdraw it before editing`);
    }
  }

  saveDraft(body, by = null) {
    this.assertEditable();
    if (typeof body !== 'string') throw new DomainError('INVALID', 'Guidance must be text');
    this.guidance = body;
    this.record('draft_saved', by);
    return this;
  }

  /**
   * Clinical records are never hard-deleted once a member has seen them. Withdrawal hides
   * the result from the member again and keeps an audit entry of who did it and why.
   */
  withdraw(clinicianName, reason = '', at = new Date()) {
    if (!this.isVisibleToMember()) throw new DomainError('NOT_RELEASED', `Result set ${this.id} is not released`);
    if (!clinicianName || !String(clinicianName).trim()) throw new DomainError('INVALID', 'Withdrawal requires a clinician name');
    this.state = ResultSetState.AWAITING_REVIEW;
    this.record('withdrawn', String(clinicianName).trim(), at, reason);
    this.releasedBy = null;
    this.releasedAt = null;
    return this;
  }

  isDeletable() {
    return !this.isVisibleToMember() && !this.history.some((h) => h.action === 'released' || h.action === 'withdrawn');
  }

  /** Only never-released entries (data-entry mistakes) can be deleted. */
  assertDeletable() {
    if (!this.isDeletable()) {
      throw new DomainError('NOT_DELETABLE', `Result set ${this.id} has been released to the member; withdraw it instead`);
    }
  }

  record(action, by = null, at = new Date(), note = '') {
    this.history.push({ action, by, at: (at instanceof Date ? at : new Date(at)).toISOString(), note: note || '' });
  }

  /** Raw props, for rebuilding after a correction. */
  toProps() {
    return {
      id: this.id, memberId: this.memberId, memberName: this.memberName, collectionDate: this.collectionDate,
      state: this.state, values: this.values(), heightM: this.heightM, weightKg: this.weightKg,
      bloodPressure: this.bloodPressure, guidance: this.guidance, releasedBy: this.releasedBy,
      releasedAt: this.releasedAt, history: this.history,
    };
  }

  /** Plain numbers keyed by analyte code: { HBA1C: 5.8, ... } */
  values() {
    const out = {};
    for (const [code, av] of Object.entries(this.analyteValues)) out[code] = av.value;
    return out;
  }
}

ResultSet.DomainError = DomainError;

module.exports = ResultSet;
