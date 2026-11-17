'use strict';

const { ResultSet, Member, RiskCategory } = require('../../domain');

class SeedBuilder {
  constructor(memberId = 'm1', memberName = 'Lerato M. (demo)', riskCategory = RiskCategory.MODERATE, phone = '+27821234821') {
    this.member = new Member({ id: memberId, name: memberName, riskCategory, phone });
    this.results = [];
  }

  addResult(props) {
    const result = new ResultSet({
      memberId: this.member.id,
      memberName: this.member.name,
      ...props,
    });
    this.results.push(result);
    return this;
  }

  build() {
    return [...this.results];
  }

  static createDemoSeed() {
    const builder = new SeedBuilder();

    builder.addResult({
      id: 'rs1',
      collectionDate: '2026-08-17',
      state: 'released',
      values: {
        HBA1C: 6.1,
        FPG: 6.4,
        TC: 5.8,
        LDL: 3.7,
        HDL: 1.0,
        TG: 2.1,
      },
      heightM: 1.64,
      weightKg: 79,
      bloodPressure: { systolic: 138, diastolic: 86 },
      guidance: 'Follow-up in three months to review blood sugar and vascular risk.',
      releasedBy: 'Dr A. Naidoo',
      releasedAt: '2026-08-20T09:00:00.000Z',
    });

    builder.addResult({
      id: 'rs2',
      collectionDate: '2026-11-17',
      state: 'awaiting_review',
      values: {
        HBA1C: 5.8,
        FPG: 5.9,
        TC: 5.1,
        LDL: 3.1,
        HDL: 1.2,
        TG: 1.6,
      },
      heightM: 1.64,
      weightKg: 74.8,
      bloodPressure: { systolic: 132, diastolic: 82 },
      guidance: 'draft',
    });

    return builder.build();
  }
}

SeedBuilder.demoMembers = () => [new SeedBuilder().member];

module.exports = { SeedBuilder, createDemoSeed: SeedBuilder.createDemoSeed };
