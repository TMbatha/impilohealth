'use strict';

/**
 * A measured value for an analyte. Validates the unit against the analyte definition at
 * construction, so a value in the wrong unit can never enter the system.
 */
class AnalyteValue {
  constructor(analyte, value, unit = analyte.unit) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${analyte.code}: value must be a finite number, got ${value}`);
    }
    if (unit !== analyte.unit) {
      throw new Error(`${analyte.code}: expected unit ${analyte.unit}, got ${unit}`);
    }
    this.analyte = analyte;
    this.code = analyte.code;
    this.value = value;
    this.unit = unit;
    Object.freeze(this);
  }
}

module.exports = AnalyteValue;
