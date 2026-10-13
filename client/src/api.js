async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {}
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  patients: () => request('/api/patients'),
  patient: (id) => request(`/api/patients/${id}`),
  createPatient: (data) => request('/api/patients', json('POST', data)),
  updatePatient: (id, data) => request(`/api/patients/${id}`, json('PUT', data)),
  screenings: (patientId) => request(`/api/patients/${patientId}/screenings`),
  screen: (formData) => request('/api/screenings', { method: 'POST', body: formData }),
  reportUrl: (screeningId) => `/api/screenings/${screeningId}/report`,
};
