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
    return this;
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
