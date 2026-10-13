import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import PatientForm, { toForm } from './PatientForm.jsx';
import { NewPatientModal } from './Patients.jsx';

const pct = (n) => `${(Number(n) * 100).toFixed(1)}%`;
const when = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Result({ s }) {
  return (
    <div className={`result ${s.dr_detected ? 'bad' : 'good'}`}>
      <div className="result-top">
        <div>
          <div className="label">AI finding</div>
          <div className="finding">{s.prediction}</div>
          <div className="conf">Model confidence {pct(s.confidence)}</div>
        </div>
        <span className={`chip ${s.urgency === 'Urgent' ? 'bad' : s.urgency === 'Priority' ? 'warn' : 'good'}`}>{s.urgency}</span>
      </div>
      <div className="bars">
        <div className="bar"><span>Retinopathy</span><i><b style={{ width: pct(s.prob_dr) }} className="bad" /></i><em>{pct(s.prob_dr)}</em></div>
        <div className="bar"><span>No retinopathy</span><i><b style={{ width: pct(s.prob_no_dr) }} className="good" /></i><em>{pct(s.prob_no_dr)}</em></div>
      </div>
      <p className="followup">{s.followup}</p>
      <a className="primary link" href={api.reportUrl(s.id)}>Download report (PDF)</a>
    </div>
  );
}

export default function Screening({ patients, selectedId, setSelectedId, refresh }) {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [history, setHistory] = useState([]);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [eye, setEye] = useState('Right');
  const [acuity, setAcuity] = useState('');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  // Load the full record whenever a patient is selected, and auto-populate every field.
  useEffect(() => {
    setResult(null);
    setError('');
    if (!selectedId) {
      setForm(null);
      setSaved(null);
      setHistory([]);
      return;
    }
    let live = true;
    (async () => {
      const [p, h] = await Promise.all([api.patient(selectedId), api.screenings(selectedId)]);
      if (!live) return;
      const f = toForm(p);
      setForm(f);
      setSaved(f);
      setHistory(h);
    })().catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, [selectedId]);

  const dirty = useMemo(() => form && saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const patient = patients.find((p) => String(p.id) === String(selectedId));

  const pick = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setResult(null);
    setError('');
    setPreview(URL.createObjectURL(f));
  };
  const clearImage = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = async () => {
    setSaving(true);
    try {
      const p = await api.updatePatient(selectedId, form);
      const f = toForm(p);
      setForm(f);
      setSaved(f);
      refresh();
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const run = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    try {
      if (dirty) await save();
      const fd = new FormData();
      fd.append('patient_id', selectedId);
      fd.append('eye', eye);
      fd.append('visual_acuity', acuity);
      fd.append('notes', notes);
      fd.append('image', file);
      const s = await api.screen(fd);
      setResult(s);
      setHistory(await api.screenings(selectedId));
      refresh();
    } catch (e) {
      setError(e.message);
    }
    setRunning(false);
  };

  return (
    <div className="split">
      <section className="card">
        <div className="card-head">
          <div>
            <h1>Patient</h1>
            <p className="sub">Select a patient to load their record</p>
          </div>
          <button className="ghost" onClick={() => setAdding(true)}>+ New</button>
        </div>

        <select className="picker" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Select patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.mrn} — {p.full_name}</option>
          ))}
        </select>

        {patient && form ? (
          <>
            <div className="summary">
              <div className="avatar">{patient.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
              <div>
                <b>{patient.full_name}</b>
                <span>{patient.mrn} · {patient.age} yrs · {patient.sex} · {patient.diabetes_type}</span>
              </div>
            </div>
            <PatientForm value={form} onChange={setForm} />
            {dirty && (
              <div className="savebar">
                <span>Unsaved changes</span>
                <button className="ghost" onClick={() => setForm(saved)}>Discard</button>
                <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            )}
          </>
        ) : (
          <div className="placeholder">No patient selected</div>
        )}
      </section>

      <div className="stack">
        <section className="card">
          <div className="card-head">
            <div>
              <h1>Retinal image</h1>
              <p className="sub">Upload a fundus photograph for analysis</p>
            </div>
          </div>

          {preview ? (
            <div className="preview">
              <img src={preview} alt="Fundus preview" />
              <button className="ghost" onClick={clearImage}>Remove</button>
            </div>
          ) : (
            <div
              className={`drop${drag ? ' over' : ''}`}
              onClick={() => inputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
              <b>Drop image here or click to browse</b>
              <span>JPG or PNG</span>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} />

          <div className="grid three">
            <label className="field"><span>Eye</span>
              <select value={eye} onChange={(e) => setEye(e.target.value)}><option>Right</option><option>Left</option></select>
            </label>
            <label className="field"><span>Visual acuity</span>
              <input placeholder="e.g. 6/9" value={acuity} onChange={(e) => setAcuity(e.target.value)} />
            </label>
            <label className="field wide"><span>Clinician notes</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>

          {error && <div className="err block">{error}</div>}
          <button className="primary big" disabled={!selectedId || !file || running} onClick={run}>
            {running ? (<><span className="spin" /> Analysing…</>) : 'Run analysis'}
          </button>
          {!selectedId && <p className="hint">Select a patient first.</p>}
          {selectedId && !file && <p className="hint">Add a retinal image to continue.</p>}
        </section>

        {result && <section className="card"><Result s={result} /></section>}

        {history.length > 0 && (
          <section className="card">
            <div className="card-head"><div><h1>History</h1><p className="sub">{history.length} screening{history.length > 1 ? 's' : ''}</p></div></div>
            <ul className="history">
              {history.map((h) => (
                <li key={h.id}>
                  <img src={h.image_path} alt="" />
                  <div>
                    <b>{h.prediction}</b>
                    <span>{when(h.screened_at)} · {h.eye} eye · {pct(h.confidence)}</span>
                  </div>
                  <a href={api.reportUrl(h.id)}>Report ↓</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {adding && (
        <NewPatientModal
          onClose={() => setAdding(false)}
          onCreated={async (p) => {
            await refresh();
            setAdding(false);
            setSelectedId(String(p.id));
          }}
        />
      )}
    </div>
  );
}
