import React from 'react';

export const EMPTY_PATIENT = {
  full_name: '', dob: '', sex: 'Male', phone: '', email: '', city: '', blood_group: '', height_cm: '', weight_kg: '',
  diabetes_type: 'Type 2', diabetes_since_year: '', hba1c: '', fasting_glucose: '', bp_systolic: '', bp_diastolic: '',
  cholesterol: '', smoking: 'Never', hypertension: false, on_insulin: false, medications: '', allergies: '',
  family_history: '', previous_eye_treatment: '', symptoms: '', referring_physician: '',
};

// Normalise a patient row from the API into form-friendly values.
export function toForm(p) {
  const f = { ...EMPTY_PATIENT };
  Object.keys(f).forEach((k) => {
    if (p[k] !== null && p[k] !== undefined) f[k] = p[k];
  });
  if (f.dob) f.dob = String(f.dob).slice(0, 10);
  return f;
}

export function bmi(h, w) {
  const m = Number(h) / 100;
  return m && Number(w) ? (Number(w) / (m * m)).toFixed(1) : null;
}

function Field({ label, wide, children }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function PatientForm({ value, onChange }) {
  const set = (k) => (e) => {
    const t = e.target;
    onChange({ ...value, [k]: t.type === 'checkbox' ? t.checked : t.value });
  };
  const input = (k, props = {}) => <input value={value[k] ?? ''} onChange={set(k)} {...props} />;
  const select = (k, options) => (
    <select value={value[k] ?? ''} onChange={set(k)}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
  const b = bmi(value.height_cm, value.weight_kg);

  return (
    <div className="form-sections">
      <fieldset>
        <legend>Demographics</legend>
        <div className="grid">
          <Field label="Full name" wide>{input('full_name', { required: true })}</Field>
          <Field label="Date of birth">{input('dob', { type: 'date', required: true })}</Field>
          <Field label="Sex">{select('sex', ['Male', 'Female', 'Other'])}</Field>
          <Field label="Phone">{input('phone')}</Field>
          <Field label="Email">{input('email', { type: 'email' })}</Field>
          <Field label="City">{input('city')}</Field>
          <Field label="Blood group">{select('blood_group', ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])}</Field>
          <Field label="Height (cm)">{input('height_cm', { type: 'number', step: '0.1' })}</Field>
          <Field label="Weight (kg)">{input('weight_kg', { type: 'number', step: '0.1' })}</Field>
          <Field label="BMI"><input value={b ?? '—'} readOnly className="readonly" /></Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Diabetes &amp; systemic health</legend>
        <div className="grid">
          <Field label="Diabetes type">{select('diabetes_type', ['Type 1', 'Type 2', 'Gestational', 'Other'])}</Field>
          <Field label="Diagnosed in (year)">{input('diabetes_since_year', { type: 'number', min: 1950, max: new Date().getFullYear() })}</Field>
          <Field label="HbA1c (%)">{input('hba1c', { type: 'number', step: '0.1' })}</Field>
          <Field label="Fasting glucose (mg/dL)">{input('fasting_glucose', { type: 'number' })}</Field>
          <Field label="BP systolic (mmHg)">{input('bp_systolic', { type: 'number' })}</Field>
          <Field label="BP diastolic (mmHg)">{input('bp_diastolic', { type: 'number' })}</Field>
          <Field label="Total cholesterol (mg/dL)">{input('cholesterol', { type: 'number' })}</Field>
          <Field label="Smoking">{select('smoking', ['Never', 'Former', 'Current'])}</Field>
          <label className="check"><input type="checkbox" checked={!!value.hypertension} onChange={set('hypertension')} /> Hypertension</label>
          <label className="check"><input type="checkbox" checked={!!value.on_insulin} onChange={set('on_insulin')} /> On insulin</label>
          <Field label="Current medications" wide>{input('medications')}</Field>
          <Field label="Allergies">{input('allergies')}</Field>
          <Field label="Family history">{input('family_history')}</Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>Eye history</legend>
        <div className="grid">
          <Field label="Previous eye treatment" wide>{input('previous_eye_treatment')}</Field>
          <Field label="Reported symptoms" wide>{input('symptoms')}</Field>
          <Field label="Referring physician">{input('referring_physician')}</Field>
        </div>
      </fieldset>
    </div>
  );
}
