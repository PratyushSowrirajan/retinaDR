import test from 'node:test';
import assert from 'node:assert/strict';
import { followupPlan, riskFactors } from '../src/followup.js';

const healthy = { hba1c: 6.5, bp_systolic: 120, bp_diastolic: 78, cholesterol: 180, smoking: 'Never', diabetes_since_year: new Date().getFullYear() - 2 };
const highRisk = { hba1c: 9.1, bp_systolic: 156, bp_diastolic: 96, cholesterol: 252, smoking: 'Current', diabetes_since_year: 2009 };

test('riskFactors lists nothing for a well-controlled patient', () => {
  assert.deepEqual(riskFactors(healthy), []);
});

test('riskFactors flags HbA1c, BP, cholesterol, smoking and diabetes duration', () => {
  const f = riskFactors(highRisk);
  assert.equal(f.length, 5);
  assert.ok(f.some((x) => x.startsWith('HbA1c')));
  assert.ok(f.includes('current smoker'));
});

test('DR detected with several risk factors is Urgent', () => {
  assert.equal(followupPlan(true, highRisk).urgency, 'Urgent');
});

test('DR detected with few risk factors is Priority', () => {
  assert.equal(followupPlan(true, healthy).urgency, 'Priority');
});

test('No DR with several risk factors is re-screened in 6 months', () => {
  const p = followupPlan(false, highRisk);
  assert.equal(p.urgency, 'Routine');
  assert.match(p.followup, /6 months/);
});

test('No DR with a healthy profile is annual screening', () => {
  const p = followupPlan(false, healthy);
  assert.equal(p.urgency, 'Routine');
  assert.match(p.followup, /annual/i);
});
