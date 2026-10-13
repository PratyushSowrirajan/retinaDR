// Turns the model output plus the patient's systemic risk into a follow-up plan.
export function riskFactors(p) {
  const f = [];
  if (p.hba1c != null && Number(p.hba1c) >= 8) f.push(`HbA1c ${p.hba1c}%`);
  if ((p.bp_systolic ?? 0) >= 140 || (p.bp_diastolic ?? 0) >= 90) f.push(`BP ${p.bp_systolic}/${p.bp_diastolic} mmHg`);
  if ((p.cholesterol ?? 0) >= 240) f.push(`cholesterol ${p.cholesterol} mg/dL`);
  if (p.smoking === 'Current') f.push('current smoker');
  if (p.diabetes_since_year && new Date().getFullYear() - p.diabetes_since_year >= 10) f.push('diabetes >10 years');
  return f;
}

export function followupPlan(drDetected, patient) {
  const risks = riskFactors(patient);
  if (drDetected) {
    if (risks.length >= 2) {
      return {
        urgency: 'Urgent',
        followup: 'Refer to a retina specialist within 2 weeks for dilated fundus examination and OCT. Intensify glycaemic and blood pressure control.',
      };
    }
    return {
      urgency: 'Priority',
      followup: 'Refer to an ophthalmologist within 4 weeks for dilated fundus examination. Review diabetic control with the treating physician.',
    };
  }
  if (risks.length >= 2) {
    return { urgency: 'Routine', followup: 'No retinopathy detected. Re-screen in 6 months given elevated systemic risk factors.' };
  }
  return { urgency: 'Routine', followup: 'No retinopathy detected. Continue annual retinal screening and maintain current diabetic control.' };
}
