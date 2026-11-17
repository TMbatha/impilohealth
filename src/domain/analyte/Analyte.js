'use strict';

const Band = require('./Band');

/** Definition of a measurable analyte (HbA1c, LDL, ...) as configured in thresholds.json. */
class Analyte {
  constructor(code, def) {
    this.code = code;
    this.unit = def.unit;
    this.direction = def.direction; // 'lower' = lower is better, 'higher' = higher is better
    this.tolerance = def.tolerance || 0;
    this.pathway = def.pathway;
    this.bands = (def.bands || []).map((b) => new Band(b));
    this.flags = def.flags || [];
    Object.freeze(this);
  }

  bandFor(value) {
    return Band.find(this.bands, value);
  }

  /** Returns codes of every flag whose `below`/`above` limit the value crosses. */
  flagsFor(value) {
    return this.flags
      .filter((f) => (f.below !== undefined && value < f.below) || (f.above !== undefined && value > f.above))
      .map((f) => f.code);
  }
}

module.exports = Analyte;
