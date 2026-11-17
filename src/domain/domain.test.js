'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('./index');

test('classify: min inclusive, max exclusive', () => {
  assert.equal(d.classify('HBA1C', 5.69).band, 'HBA1C_NORMAL');
  assert.equal(d.classify('HBA1C', 5.7).band, 'HBA1C_INTERMEDIATE');
  assert.equal(d.classify('HBA1C', 6.5).band, 'HBA1C_DIABETES_RANGE');
  assert.equal(d.classify('HDL', 1.2).band, 'HDL_BORDERLINE');
  const c = d.classify('HBA1C', 5.8);
  assert.deepEqual([c.label, c.low, c.high, c.flagged], ['Raised, above the usual range', 5.7, 6.5, false]);
});

test('classify: flags and unclassified never throw', () => {
  assert.equal(d.classify('HDL', 0.6).flagged, true);
  assert.equal(d.classify('TC', 16).flagged, true);
  assert.equal(d.classify('NOPE', 1).band, 'UNCLASSIFIED');
  assert.equal(d.classify('HBA1C', NaN).band, 'UNCLASSIFIED');
});

test('isCritical', () => {
  assert.equal(d.isCritical('TG', 10), false);
  assert.equal(d.isCritical('TG', 10.1), true);
  assert.equal(d.isCritical('FPG', 11.1), true);
  assert.equal(d.isCritical('HBA1C', 9.9), false);
  assert.equal(d.isCritical('BP', { systolic: 180, diastolic: 80 }), true);
  assert.equal(d.isCritical('BP', { systolic: 150, diastolic: 110 }), true);
  assert.equal(d.isCritical('BP', { systolic: 179, diastolic: 109 }), false);
});

test('blood pressure: higher of systolic/diastolic category', () => {
  assert.deepEqual(
    [d.classifyBloodPressure({ systolic: 145, diastolic: 85 }).band, d.classifyBloodPressure({ systolic: 145, diastolic: 85 }).drivenBy],
    ['BP_GRADE_1', 'systolic'],
  );
  assert.equal(d.classifyBloodPressure({ systolic: 118, diastolic: 101 }).band, 'BP_GRADE_2');
  assert.equal(d.classifyBloodPressure({ systolic: 138, diastolic: 86 }).band, 'BP_HIGH_NORMAL');
  assert.equal(d.classifyBloodPressure({ systolic: 132, diastolic: 82 }).band, 'BP_HIGH_NORMAL');
  assert.equal(d.classifyBloodPressure({ systolic: 200, diastolic: 70 }).band, 'BP_GRADE_3');
});

test('derive: ldlCalculable is TG <= 4.5', () => {
  assert.deepEqual(d.derive({ heightM: 1.64, weightKg: 74.8, TC: 5.1, HDL: 1.2, TG: 1.6 }),
    { bmi: 27.8, nonHdl: 3.9, tcHdlRatio: 4.25, ldlCalculable: true });
  assert.equal(d.derive({ TG: 4.5 }).ldlCalculable, true);
  assert.equal(d.derive({ TG: 4.51 }).ldlCalculable, false);
  assert.equal(d.derive({}).ldlCalculable, false);
});

test('trend', () => {
  assert.deepEqual(d.trend('HBA1C', 5.8, 6.1), { direction: 'improved', delta: -0.3, pctDelta: -4.9 });
  assert.equal(d.trend('HBA1C', 5.8, undefined).direction, 'first');
  assert.equal(d.trend('HBA1C', 6.0, 6.1).direction, 'unchanged');
  assert.equal(d.trend('FPG', 6.2, 5.9).direction, 'unchanged'); // exactly tolerance, despite FP noise
  assert.equal(d.trend('HDL', 1.2, 1.0).direction, 'improved');
  assert.equal(d.trend('HDL', 1.0, 1.2).direction, 'worsened');
  assert.equal(d.trend('LDL', 3.7, 3.1).direction, 'worsened');
});

test('pathwayStatus: worst wins', () => {
  assert.equal(d.pathwayStatus(['HBA1C_NORMAL', 'FPG_NORMAL']), 'within_range');
  assert.equal(d.pathwayStatus(['HBA1C_INTERMEDIATE', 'FPG_NORMAL']), 'borderline');
  assert.equal(d.pathwayStatus(['HDL_VERY_LOW', 'TC_ABOVE_TARGET']), 'out_of_range');
  assert.equal(d.pathwayStatus(['HDL_LOW']), 'borderline');
  assert.equal(d.pathwayStatus([{ band: 'FPG_DIABETES_RANGE', critical: true }]), 'urgent');
  assert.equal(d.pathwayStatus(['TG_CRITICAL']), 'urgent');
});

test('AnalyteValue rejects wrong unit', () => {
  assert.throws(() => new d.ResultSet({ id: 'x', memberId: 'm', values: { FPG: { value: 100, unit: 'mg/dL' } } }), /expected unit/);
});

const rs1 = { id: 'rs1', memberId: 'm1', memberName: 'Lerato M. (demo)', collectionDate: '2026-08-17', state: 'released',
  values: { HBA1C: 6.1, FPG: 6.4, TC: 5.8, LDL: 3.7, HDL: 1.0, TG: 2.1 }, heightM: 1.64, weightKg: 79,
  bloodPressure: { systolic: 138, diastolic: 86 }, guidance: 'g', releasedBy: 'Dr A. Naidoo', releasedAt: '2026-08-20T09:00:00.000Z' };
const rs2 = { id: 'rs2', memberId: 'm1', memberName: 'Lerato M. (demo)', collectionDate: '2026-11-17', state: 'awaiting_review',
  values: { HBA1C: 5.8, FPG: 5.9, TC: 5.1, LDL: 3.1, HDL: 1.2, TG: 1.6 }, heightM: 1.64, weightKg: 74.8,
  bloodPressure: { systolic: 132, diastolic: 82 }, guidance: 'draft' };

test('classifyResultSet: demo data, DTO shape', () => {
  const dto = d.classifyResultSet(new d.ResultSet(rs2), new d.ResultSet(rs1));
  assert.equal(dto.id, 'rs2');
  assert.equal(dto.state, 'awaiting_review');
  assert.deepEqual(dto.pathways.map((p) => p.name), ['Metabolic', 'Cardiovascular']);
  const hba1c = dto.pathways[0].analytes.find((a) => a.code === 'HBA1C');
  assert.equal(hba1c.band, 'HBA1C_INTERMEDIATE');
  assert.deepEqual(hba1c.trend, { direction: 'improved', delta: -0.3, pctDelta: -4.9 });
  assert.equal(dto.pathways[0].analytes.find((a) => a.code === 'FPG').band, 'FPG_NORMAL');
  assert.equal(dto.pathways[1].analytes.find((a) => a.code === 'LDL').band, 'LDL_ABOVE_TARGET');
  assert.equal(dto.derived.bmi, 27.8);
  assert.equal(dto.derived.ldlCalculable, true);
  assert.equal(dto.bloodPressure.band, 'BP_HIGH_NORMAL');
  assert.equal(dto.urgent, false);
  // plain raw objects work too
  assert.deepEqual(d.classifyResultSet(rs2, rs1).pathways, dto.pathways);
});

test('classifyResultSet: no LDL number leaves the domain when TG > 4.5', () => {
  const dto = d.classifyResultSet({ ...rs2, values: { ...rs2.values, TG: 5.0 } }, rs1);
  const ldl = dto.pathways[1].analytes.find((a) => a.code === 'LDL');
  assert.equal(dto.derived.ldlCalculable, false);
  assert.equal(ldl.value, null);
  assert.equal(ldl.label, 'LDL not calculable at this triglyceride level');
  assert.equal(ldl.trend, null);
});

test('ResultSet gate and release', () => {
  const rs = new d.ResultSet(rs2);
  assert.equal(rs.isVisibleToMember(), false);
  rs.release('Final guidance', 'Dr A. Naidoo');
  assert.equal(rs.isVisibleToMember(), true);
  assert.equal(rs.guidance, 'Final guidance');
  assert.equal(rs.releasedBy, 'Dr A. Naidoo');
  assert.ok(rs.releasedAt);
  assert.throws(() => rs.release('again', 'Dr X'), (e) => e.code === 'ALREADY_RELEASED');
});

test('CRUD rules: draft, withdraw, delete', () => {
  const draft = new d.ResultSet(rs2);
  assert.equal(draft.isDeletable(), true);
  draft.saveDraft('Updated draft');
  assert.equal(draft.guidance, 'Updated draft');
  draft.release('Final', 'Dr A. Naidoo');
  assert.throws(() => draft.saveDraft('x'), (e) => e.code === 'NOT_EDITABLE');
  assert.throws(() => draft.assertDeletable(), (e) => e.code === 'NOT_DELETABLE');
  draft.withdraw('Dr A. Naidoo', 'Lab error');
  assert.equal(draft.isVisibleToMember(), false);
  assert.equal(draft.isDeletable(), false, 'once released, never deletable even after withdrawal');
  assert.deepEqual(draft.history.map((h) => h.action), ['draft_saved', 'released', 'withdrawn']);

  const seeded = new d.ResultSet(rs1);
  assert.equal(seeded.isDeletable(), false, 'seeded released sets carry their release in history');
  seeded.withdraw('Dr A. Naidoo');
  assert.equal(seeded.isDeletable(), false);
  assert.throws(() => new d.ResultSet(rs2).withdraw('Dr A. Naidoo'), (e) => e.code === 'NOT_RELEASED');
});

test('Member validates phone and supports updates', () => {
  const m = new d.Member({ id: 'm9', name: 'Test', phone: '+27 82 123 4567' });
  assert.equal(m.phone, '+27821234567');
  assert.equal(m.with({ name: 'Renamed' }).name, 'Renamed');
  assert.throws(() => new d.Member({ id: 'm9', name: 'X', phone: 'abc' }), /Invalid phone/);
  assert.throws(() => new d.Member({ id: 'm9', name: '' }), /requires a name/);
});
