import React, { useState } from 'react';
import { api } from './api.js';
import PatientForm, { EMPTY_PATIENT } from './PatientForm.jsx';

export function NewPatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_PATIENT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(await api.createPatient(form));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>New patient</h2>
          <button type="button" className="icon" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <PatientForm value={form} onChange={setForm} />
        </div>
        <div className="modal-foot">
          {error && <span className="err">{error}</span>}
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Register patient'}</button>
        </div>
      </form>
    </div>
  );
}

export default function Patients({ patients, refresh, openPatient }) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const shown = patients.filter((p) => `${p.full_name} ${p.mrn}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h1>Patients</h1>
          <p className="sub">{patients.length} registered</p>
        </div>
        <div className="row">
          <input className="search" placeholder="Search name or MRN" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="primary" onClick={() => setAdding(true)}>+ New patient</button>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>MRN</th><th>Name</th><th>Age / Sex</th><th>Diabetes</th><th>HbA1c</th><th>Last screening</th><th /></tr>
        </thead>
        <tbody>
          {shown.map((p) => (
            <tr key={p.id} onClick={() => openPatient(p.id)}>
              <td className="mono">{p.mrn}</td>
              <td><b>{p.full_name}</b></td>
              <td>{p.age} · {p.sex}</td>
              <td>{p.diabetes_type}</td>
              <td>{p.hba1c ? `${p.hba1c}%` : '—'}</td>
              <td>
                {p.last_screening ? (
                  <span className={`chip ${p.last_screening.dr_detected ? 'bad' : 'good'}`}>
                    {p.last_screening.dr_detected ? 'DR detected' : 'No DR'}
                  </span>
                ) : (
                  <span className="muted">Not screened</span>
                )}
              </td>
              <td className="arrow">→</td>
            </tr>
          ))}
          {!shown.length && (
            <tr><td colSpan="7" className="empty">No patients found.</td></tr>
          )}
        </tbody>
      </table>

      {adding && (
        <NewPatientModal
          onClose={() => setAdding(false)}
          onCreated={async (p) => {
            await refresh();
            setAdding(false);
            openPatient(p.id);
          }}
        />
      )}
    </section>
  );
}
