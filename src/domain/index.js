'use strict';

/**
 * The domain's public surface. Application code imports from here and nowhere else in src/domain.
 *
 *   const domain = require('../../domain');
 *   const dto = domain.classifyResultSet(resultSet, previousResultSet);
 */

const ThresholdSet = require('./thresholds/ThresholdSet');
const ClassificationService = require('./services/ClassificationService');
const CriticalValueService = require('./services/CriticalValueService');
const TrendService = require('./services/TrendService');
const { derive } = require('./resultset/DerivedValues');
const ResultSet = require('./resultset/ResultSet');
const ResultSetState = require('./resultset/ResultSetState');
const Member = require('./member/Member');
const RiskCategory = require('./member/RiskCategory');

const thresholds = ThresholdSet.default;
const classification = new ClassificationService(thresholds);
const critical = new CriticalValueService(thresholds);
const trends = new TrendService(thresholds);

const LDL_NOT_CALCULABLE = Object.freeze({
  band: 'LDL_NOT_CALCULABLE',
  label: 'LDL not calculable at this triglyceride level',
});

/** Accepts a ResultSet instance or a plain raw object with the same field names. */
function valuesOf(rs) {
  if (!rs) return {};
  if (typeof rs.values === 'function') return rs.values();
  const out = {};
  for (const [code, v] of Object.entries(rs.values || {})) out[code] = v !== null && typeof v === 'object' ? v.value : v;
  return out;
}

function derivedFor(rs) {
  const v = valuesOf(rs);
  return derive({ heightM: rs.heightM, weightKg: rs.weightKg, TC: v.TC, HDL: v.HDL, TG: v.TG });
}

/**
 * Runs classification, critical checks, derived values and trends over one result set,
 * returning the agreed DTO shape (see brief). `previous` may be null.
 *
 * Safety: when TG > 4.5 the LDL row carries value: null and band LDL_NOT_CALCULABLE —
 * a calculated LDL never leaves the domain in that case. Same for the previous visit's LDL
 * when computing the trend.
 */
function classifyResultSet(raw, previous = null) {
  const current = valuesOf(raw);
  const prior = valuesOf(previous);
  const derived = derivedFor(raw);
  const priorLdlOk = previous ? derivedFor(previous).ldlCalculable : false;

  const pathways = thresholds.pathways().map((name) => {
    const analytes = thresholds.analyteCodes()
      .filter((code) => thresholds.analyte(code).pathway === name && current[code] !== undefined)
      .map((code) => {
        const analyte = thresholds.analyte(code);
        const value = current[code];

        if (code === 'LDL' && !derived.ldlCalculable) {
          return {
            code, value: null, unit: analyte.unit, ...LDL_NOT_CALCULABLE,
            low: null, high: null, flagged: false, flags: [], critical: false, trend: null,
          };
        }

        const c = classification.classify(code, value);
        const prev = code === 'LDL' && !priorLdlOk ? undefined : prior[code];
        return {
          code, value, unit: analyte.unit,
          band: c.band, label: c.label, low: c.low, high: c.high,
          flagged: c.flagged, flags: c.flags,
          critical: critical.isCritical(code, value),
          trend: trends.trend(code, value, prev),
        };
      });

    const status = classification.pathwayStatus(
      analytes.filter((a) => a.band !== LDL_NOT_CALCULABLE.band).map((a) => ({ band: a.band, critical: a.critical })),
    );
    return { name, status, analytes };
  }).filter((p) => p.analytes.length > 0);

  const bp = raw.bloodPressure
    ? { ...classification.classifyBloodPressure(raw.bloodPressure), critical: critical.isCritical('BP', raw.bloodPressure) }
    : null;

  const bmiBand = derived.bmi === null ? null : classification.classifyBmi(derived.bmi).band;

  return {
    id: raw.id,
    collectionDate: raw.collectionDate,
    state: raw.state,
    memberName: raw.memberName || null,
    pathways,
    derived: { ...derived, bmiBand },
    bloodPressure: bp,
    urgent: pathways.some((p) => p.status === 'urgent') || Boolean(bp && bp.critical),
    guidance: raw.guidance || '',
    releasedBy: raw.releasedBy || null,
    releasedAt: raw.releasedAt || null,
  };
}

module.exports = {
  // Contract functions
  classify: (code, value) => classification.classify(code, value),
  isCritical: (code, value) => critical.isCritical(code, value),
  derive,
  trend: (code, current, prev) => trends.trend(code, current, prev),
  pathwayStatus: (bands) => classification.pathwayStatus(bands),
  classifyBloodPressure: (bp) => classification.classifyBloodPressure(bp),
  classifyBmi: (bmi) => classification.classifyBmi(bmi),
  // One-line hand-over for Hlamulo
  classifyResultSet,
  // Model
  ResultSet,
  ResultSetState,
  DomainError: ResultSet.DomainError,
  Member,
  RiskCategory,
  thresholdsVersion: thresholds.version,
};
