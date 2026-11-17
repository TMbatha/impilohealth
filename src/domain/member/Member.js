'use strict';

const RiskCategory = require('./RiskCategory');

const PHONE = /^\+?\d{9,15}$/;

class Member {
  constructor({ id, name, riskCategory = RiskCategory.MODERATE, phone = null }) {
    if (!id) throw new Error('Member requires an id');
    if (!name || !String(name).trim()) throw new Error('Member requires a name');
    if (!Object.values(RiskCategory).includes(riskCategory)) throw new Error(`Bad risk category: ${riskCategory}`);
    const cleanPhone = phone ? String(phone).replace(/[\s-]/g, '') : null;
    if (cleanPhone && !PHONE.test(cleanPhone)) throw new Error(`Invalid phone number: ${phone}`);
    this.id = id;
    this.name = String(name).trim();
    this.riskCategory = riskCategory;
    this.phone = cleanPhone;
    Object.freeze(this);
  }

  with(changes) {
    return new Member({ ...this, ...changes, id: this.id });
  }
}

module.exports = Member;
