'use strict';

const RiskCategory = require('./RiskCategory');

class Member {
  constructor({ id, name, riskCategory = RiskCategory.MODERATE }) {
    if (!id) throw new Error('Member requires an id');
    if (!Object.values(RiskCategory).includes(riskCategory)) throw new Error(`Bad risk category: ${riskCategory}`);
    this.id = id;
    this.name = name;
    this.riskCategory = riskCategory;
    Object.freeze(this);
  }
}

module.exports = Member;
