'use strict';

const ThresholdSet = require('../thresholds/ThresholdSet');

function crosses(rule, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (rule.above !== undefined && value > rule.above) return true;
  if (rule.atOrAbove !== undefined && value >= rule.atOrAbove) return true;
  if (rule.below !== undefined && value < rule.below) return true;
  if (rule.atOrBelow !== undefined && value <= rule.atOrBelow) return true;
  return false;
}

/** Normalises BP input: { systolic, diastolic } | { sys, dia } | [sys, dia]. */
function toBp(value) {
  if (Array.isArray(value)) return { systolic: value[0], diastolic: value[1] };
  if (value && typeof value === 'object') {
    return { systolic: value.systolic ?? value.sys, diastolic: value.diastolic ?? value.dia };
  }
  return { systolic: undefined, diastolic: undefined };
}

class CriticalValueService {
  constructor(thresholds = ThresholdSet.default) {
    this.critical = thresholds.critical;
  }

  /** isCritical('TG', 11) or isCritical('BP', { systolic: 185, diastolic: 90 }). */
  isCritical(code, value) {
    const rule = this.critical[code];
    if (!rule) return false;
    if (code === 'BP') {
      const { systolic, diastolic } = toBp(value);
      return (Number.isFinite(systolic) && systolic >= rule.sysAtOrAbove)
        || (Number.isFinite(diastolic) && diastolic >= rule.diaAtOrAbove);
    }
    return crosses(rule, value);
  }
}

CriticalValueService.toBp = toBp;

module.exports = CriticalValueService;
