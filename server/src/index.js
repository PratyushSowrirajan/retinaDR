import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from './db.js';
import { classifyRetina } from './model.js';
import { followupPlan } from './followup.js';
import { buildReport } from './report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

const PATIENT_FIELDS = [
  'full_name', 'dob', 'sex', 'phone', 'email', 'city', 'blood_group', 'height_cm', 'weight_kg',
  'diabetes_type', 'diabetes_since_year', 'hba1c', 'fasting_glucose', 'bp_systolic', 'bp_diastolic',
  'cholesterol', 'smoking', 'hypertension', 'on_insulin', 'medications', 'allergies', 'family_history',
  'previous_eye_treatment', 'symptoms', 'referring_physician',
];
const clean = (v) => (v === '' || v === undefined ? null : v);

const PATIENT_SELECT = `SELECT p.*, date_part('year', age(p.dob))::int AS age,
  (SELECT row_to_json(s) FROM (
     SELECT id, screened_at, prediction, dr_detected, confidence, urgency
     FROM screenings WHERE patient_id = p.id ORDER BY screened_at DESC LIMIT 1) s) AS last_screening,
  (SELECT count(*)::int FROM screenings WHERE patient_id = p.id) AS screening_count
  FROM patients p`;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/patients', wrap(async (_req, res) => {
  const { rows } = await query(`${PATIENT_SELECT} ORDER BY p.full_name`);
  res.json(rows);
}));

app.get('/api/patients/:id', wrap(async (req, res) => {
  const { rows } = await query(`${PATIENT_SELECT} WHERE p.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Patient not found' });
  res.json(rows[0]);
}));

app.post('/api/patients', wrap(async (req, res) => {
  const b = req.body;
  if (!b.full_name || !b.dob || !b.sex) return res.status(400).json({ error: 'Name, date of birth and sex are required' });
  const { rows: [{ next }] } = await query(`SELECT COALESCE(MAX(substring(mrn from '[0-9]+$')::int), 1000) + 1 AS next FROM patients`);
  const mrn = `MV-${next}`;
  const cols = PATIENT_FIELDS.filter((f) => b[f] !== undefined);
  const { rows } = await query(
    `INSERT INTO patients (mrn, ${cols.join(', ')}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`,
    [mrn, ...cols.map((c) => clean(b[c]))],
  );
  const full = await query(`${PATIENT_SELECT} WHERE p.id = $1`, [rows[0].id]);
  res.status(201).json(full.rows[0]);
}));

app.put('/api/patients/:id', wrap(async (req, res) => {
  const b = req.body;
  const cols = PATIENT_FIELDS.filter((f) => b[f] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'Nothing to update' });
  const { rowCount } = await query(
    `UPDATE patients SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = now() WHERE id = $${cols.length + 1}`,
    [...cols.map((c) => clean(b[c])), req.params.id],
  );
  if (!rowCount) return res.status(404).json({ error: 'Patient not found' });
  const full = await query(`${PATIENT_SELECT} WHERE p.id = $1`, [req.params.id]);
  res.json(full.rows[0]);
}));

app.delete('/api/patients/:id', wrap(async (req, res) => {
  await query('DELETE FROM patients WHERE id = $1', [req.params.id]);
  res.status(204).end();
}));

app.get('/api/patients/:id/screenings', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM screenings WHERE patient_id = $1 ORDER BY screened_at DESC', [req.params.id]);
  res.json(rows);
}));

app.post('/api/screenings', upload.single('image'), wrap(async (req, res) => {
  const { patient_id, eye = 'Right', visual_acuity, notes } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Retinal image is required' });
  const { rows: [patient] } = await query('SELECT * FROM patients WHERE id = $1', [patient_id]);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const buffer = fs.readFileSync(req.file.path);
  const result = await classifyRetina(buffer, req.file.originalname, req.file.mimetype);
  const plan = followupPlan(result.drDetected, patient);
  const snapshot = {
    hba1c: patient.hba1c, bp: `${patient.bp_systolic}/${patient.bp_diastolic}`, cholesterol: patient.cholesterol,
    fasting_glucose: patient.fasting_glucose, smoking: patient.smoking,
  };

  const { rows } = await query(
    `INSERT INTO screenings (patient_id, eye, visual_acuity, notes, image_path, image_name, prediction, dr_detected,
       confidence, prob_dr, prob_no_dr, urgency, followup, clinical_snapshot)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [patient_id, eye, clean(visual_acuity), clean(notes), `/uploads/${req.file.filename}`, req.file.originalname,
      result.prediction, result.drDetected, result.confidence, result.probDr, result.probNo, plan.urgency, plan.followup,
      JSON.stringify(snapshot)],
  );
  res.status(201).json(rows[0]);
}));

app.get('/api/screenings/:id/report', wrap(async (req, res) => {
  const { rows: [s] } = await query('SELECT * FROM screenings WHERE id = $1', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Screening not found' });
  const { rows: [p] } = await query('SELECT * FROM patients WHERE id = $1', [s.patient_id]);
  const name = p.full_name.replace(/[^a-z0-9]+/gi, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="DR_Report_${name}_${s.id}.pdf"`);
  buildReport(p, s, res);
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
