'use strict';

const ThresholdSet = require('../thresholds/ThresholdSet');
const Band = require('../analyte/Band');
const { toBp } = require('./CriticalValueService');

const STATUS = Object.freeze({
  WITHIN_RANGE: 'within_range',
  BORDERLINE: 'borderline',
  OUT_OF_RANGE: 'out_of_range',
  URGENT: 'urgent',
});

const OUT_OF_RANGE_SUFFIXES = ['DIABETES_RANGE', 'VERY_LOW'];
// Checked after OUT_OF_RANGE, so HDL_VERY_LOW never falls through to the LOW match.
const BORDERLINE_SUFFIXES = ['INTERMEDIATE', 'IFG', 'ABOVE_TARGET', 'LOW', 'BORDERLINE'];
const URGENT_SUFFIXES = ['CRITICAL'];

const endsWithAny = (code, suffixes) => suffixes.some((s) => code === s || code.endsWith(`_${s}`));

class ClassificationService {
  constructor(thresholds = ThresholdSet.default) {
    this.thresholds = thresholds;
  }

  /** -> { band, label, low, high, flagged, flags } — never throws, UNCLASSIFIED on miss. */
  classify(code, value) {
    const analyte = this.thresholds.analyte(code);
    if (!analyte || typeof value !== 'number' || !Number.isFinite(value)) {
      return { band: Band.UNCLASSIFIED.code, label: Band.UNCLASSIFIED.label, low: null, high: null, flagged: false, flags: [] };
    }
    const band = analyte.bandFor(value);
    const flags = analyte.flagsFor(value);
    return { band: band.code, label: band.label, low: band.min, high: band.max, flagged: flags.length > 0, flags };
  }

  classifyBmi(bmi) {
    const band = Band.find(this.thresholds.bmiBands, bmi);
    return { band: band.code, low: band.min, high: band.max };
  }

  /**
   * Blood pressure: classify systolic and diastolic separately and take the HIGHER category.
   * Max is exclusive (same convention as every other band): 145/85 -> BP_GRADE_1 (systolic-driven).
   */
  classifyBloodPressure(input) {
    const { systolic, diastolic } = toBp(input);
    const cats = this.thresholds.bloodPressure;
    const indexFor = (v, key) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) return -1;
      const i = cats.findIndex((c) => c[key] === null || v < c[key]);
      return i === -1 ? cats.length - 1 : i;
    };
    const sysIdx = indexFor(systolic, 'sysMax');
    const diaIdx = indexFor(diastolic, 'diaMax');
    if (sysIdx === -1 && diaIdx === -1) {
      return { band: Band.UNCLASSIFIED.code, systolic, diastolic, drivenBy: null };
    }
    const idx = Math.max(sysIdx, diaIdx);
    const drivenBy = sysIdx === diaIdx ? 'both' : sysIdx > diaIdx ? 'systolic' : 'diastolic';
    return { band: cats[idx].code, systolic, diastolic, drivenBy };
  }

  /**
   * Worst analyte wins. Accepts band codes (strings) or objects { band, critical }.
   * critical/CRITICAL band -> urgent; DIABETES_RANGE/VERY_LOW -> out_of_range;
   * INTERMEDIATE/IFG/ABOVE_TARGET/LOW/BORDERLINE -> borderline; else within_range.
   */
  pathwayStatus(bands) {
    const items = (bands || []).map((b) => (typeof b === 'string' ? { band: b, critical: false } : b || {}));
    if (items.some((i) => i.critical || (i.band && endsWithAny(i.band, URGENT_SUFFIXES)))) return STATUS.URGENT;
    if (items.some((i) => i.band && endsWithAny(i.band, OUT_OF_RANGE_SUFFIXES))) return STATUS.OUT_OF_RANGE;
    if (items.some((i) => i.band && endsWithAny(i.band, BORDERLINE_SUFFIXES))) return STATUS.BORDERLINE;
    return STATUS.WITHIN_RANGE;
  }
}

ClassificationService.STATUS = STATUS;

module.exports = ClassificationService;
