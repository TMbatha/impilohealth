'use strict';

const round = (n, dp) => Math.round(n * 10 ** dp) / 10 ** dp;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Above this triglyceride level the Friedewald LDL estimate is invalid and must not be shown. */
const LDL_TG_LIMIT = 4.5;

/**
 * derive({ heightM, weightKg, TC, HDL, TG }) -> { bmi, nonHdl, tcHdlRatio, ldlCalculable }
 * Missing inputs give null. Missing TG gives ldlCalculable: false (we can't prove it's safe).
 */
function derive(v = {}) {
  const { heightM, weightKg, TC, HDL, TG } = v;
  return {
    bmi: isNum(heightM) && isNum(weightKg) && heightM > 0 ? round(weightKg / (heightM * heightM), 1) : null,
    nonHdl: isNum(TC) && isNum(HDL) ? round(TC - HDL, 2) : null,
    tcHdlRatio: isNum(TC) && isNum(HDL) && HDL > 0 ? round(TC / HDL, 2) : null,
    ldlCalculable: isNum(TG) && TG <= LDL_TG_LIMIT,
  };
}

module.exports = { derive, LDL_TG_LIMIT };
