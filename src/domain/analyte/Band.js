'use strict';

/**
 * A reference-range band. Convention: min inclusive, max exclusive, null = unbounded.
 */
class Band {
  constructor({ code, label = '', min = null, max = null }) {
    if (!code) throw new Error('Band requires a code');
    this.code = code;
    this.label = label;
    this.min = min;
    this.max = max;
    Object.freeze(this);
  }

  contains(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    if (this.min !== null && value < this.min) return false;
    if (this.max !== null && value >= this.max) return false;
    return true;
  }
}

Band.UNCLASSIFIED = new Band({ code: 'UNCLASSIFIED', label: 'Could not be classified' });

/** Finds the first band containing value, or UNCLASSIFIED. */
Band.find = (bands, value) => bands.find((b) => b.contains(value)) || Band.UNCLASSIFIED;

module.exports = Band;
