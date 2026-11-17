'use strict';

const ThresholdSet = require('../thresholds/ThresholdSet');
const Trend = require('../analyte/Trend');

const round = (n, dp) => Math.round(n * 10 ** dp) / 10 ** dp;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

class TrendService {
  constructor(thresholds = ThresholdSet.default) {
    this.thresholds = thresholds;
  }

  /**
   * -> { direction, delta, pctDelta }. No previous -> 'first'. |delta| <= tolerance -> 'unchanged'.
   * For 'higher'-is-better analytes (HDL) up is improved; otherwise down is improved.
   */
  trend(code, current, prev) {
    if (!isNum(current) || !isNum(prev)) return Trend.first().toJSON();
    const analyte = this.thresholds.analyte(code);
    const tolerance = analyte ? analyte.tolerance : 0;
    const higherIsBetter = analyte ? analyte.direction === 'higher' : false;

    // Round before comparing so 5.8 - 6.1 = -0.29999... doesn't leak into the UI or the tolerance check.
    const delta = round(current - prev, 2);
    const pctDelta = prev === 0 ? null : round((delta / prev) * 100, 1);

    let direction;
    if (Math.abs(delta) <= tolerance) direction = Trend.DIRECTIONS.UNCHANGED;
    else if ((delta > 0) === higherIsBetter) direction = Trend.DIRECTIONS.IMPROVED;
    else direction = Trend.DIRECTIONS.WORSENED;

    return new Trend(direction, delta, pctDelta).toJSON();
  }
}

module.exports = TrendService;
