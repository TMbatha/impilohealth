'use strict';

const Analyte = require('../analyte/Analyte');
const Band = require('../analyte/Band');
const raw = require('./thresholds.json');

/** Read-only view over thresholds.json. */
class ThresholdSet {
  constructor(config) {
    this.version = config.version;
    this.riskCategory = config.riskCategory;
    this.analytes = {};
    for (const [code, def] of Object.entries(config.analytes)) this.analytes[code] = new Analyte(code, def);
    this.bmiBands = config.bmi.map((b) => new Band({ ...b, label: b.label || b.code }));
    this.bloodPressure = config.bloodPressure;
    this.critical = config.critical;
    Object.freeze(this.analytes);
    Object.freeze(this);
  }

  analyte(code) {
    return this.analytes[code] || null;
  }

  analyteCodes() {
    return Object.keys(this.analytes);
  }

  /** Pathway names in the order they first appear in thresholds.json. */
  pathways() {
    return [...new Set(Object.values(this.analytes).map((a) => a.pathway))];
  }
}

ThresholdSet.default = new ThresholdSet(raw);

module.exports = ThresholdSet;
