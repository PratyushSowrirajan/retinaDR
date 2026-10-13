import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import Screening from './Screening.jsx';
import Patients from './Patients.jsx';

export default function App() {
  const [tab, setTab] = useState('screening');
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setPatients(await api.patients());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openPatient = (id) => {
    setSelectedId(String(id));
    setTab('screening');
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <b>MedVision</b>
          <span>Retina Screening</span>
        </div>
        <nav>
          <button className={tab === 'screening' ? 'on' : ''} onClick={() => setTab('screening')}>Screening</button>
          <button className={tab === 'patients' ? 'on' : ''} onClick={() => setTab('patients')}>Patients</button>
        </nav>
      </header>

      <main>
        {error && (
          <div className="banner">
            Cannot reach the server — {error}. Make sure the API and PostgreSQL are running.
          </div>
        )}
        {tab === 'screening' ? (
          <Screening patients={patients} selectedId={selectedId} setSelectedId={setSelectedId} refresh={refresh} />
        ) : (
          <Patients patients={patients} refresh={refresh} openPatient={openPatient} />
        )}
      </main>
    </>
  );
}
