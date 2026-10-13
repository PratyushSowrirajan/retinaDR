import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { riskFactors } from './followup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, '..', 'uploads');

const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const ACCENT = '#0f766e';
const ALERT = '#b91c1c';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const val = (v, unit = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${unit}`);

export function buildReport(patient, screening, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `DR Screening Report - ${patient.full_name}` } });
  doc.pipe(res);
  const W = doc.page.width - 96;
  const left = 48;

  // Header
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(15).text('MEDVISION', left, 48, { continued: true });
  doc.font('Helvetica').fillColor(MUTED).text('  Eye & Diabetes Centre');
  doc.fontSize(8.5).fillColor(MUTED).text('123 Healthcare Avenue, MedCity  ·  +1 (555) 123-4567', left, 68);
  doc.fontSize(8.5).text(`Report no. SCR-${String(screening.id).padStart(5, '0')}`, left, 48, { width: W, align: 'right' });
  doc.text(fmtDateTime(screening.screened_at), left, 60, { width: W, align: 'right' });
  doc.moveTo(left, 90).lineTo(left + W, 90).strokeColor(INK).lineWidth(1).stroke();

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text('Diabetic Retinopathy Screening Report', left, 106);

  const section = (title, y) => {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(ACCENT).text(title.toUpperCase(), left, y, { characterSpacing: 1 });
    doc.moveTo(left, y + 14).lineTo(left + W, y + 14).strokeColor(LINE).lineWidth(0.8).stroke();
    return y + 22;
  };

  const grid = (rows, y, cols = 3) => {
    const colW = W / cols;
    rows.forEach(([label, value], i) => {
      const x = left + (i % cols) * colW;
      const yy = y + Math.floor(i / cols) * 32;
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), x, yy, { width: colW - 10, characterSpacing: 0.4 });
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(value, x, yy + 10, { width: colW - 10 });
    });
    return y + Math.ceil(rows.length / cols) * 32 + 4;
  };

  const age = Math.floor((Date.now() - new Date(patient.dob)) / 31557600000);
  let y = section('Patient', 140);
  y = grid(
    [
      ['Name', patient.full_name],
      ['MRN', patient.mrn],
      ['Age / Sex', `${age} yrs / ${patient.sex}`],
      ['Date of birth', fmtDate(patient.dob)],
      ['Contact', val(patient.phone)],
      ['Referring physician', val(patient.referring_physician)],
    ],
    y,
  );

  y = section('Clinical history', y + 6);
  const since = patient.diabetes_since_year;
  y = grid(
    [
      ['Diabetes', `${patient.diabetes_type}${since ? ` · since ${since} (${new Date().getFullYear() - since} yrs)` : ''}`],
      ['HbA1c', val(patient.hba1c, ' %')],
      ['Fasting glucose', val(patient.fasting_glucose, ' mg/dL')],
      ['Blood pressure', patient.bp_systolic ? `${patient.bp_systolic}/${patient.bp_diastolic} mmHg` : '—'],
      ['Cholesterol', val(patient.cholesterol, ' mg/dL')],
      ['Smoking', patient.smoking],
      ['Hypertension', patient.hypertension ? 'Yes' : 'No'],
      ['Insulin', patient.on_insulin ? 'Yes' : 'No'],
      ['Previous eye treatment', val(patient.previous_eye_treatment)],
    ],
    y,
  );
  if (patient.symptoms) {
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('REPORTED SYMPTOMS', left, y, { characterSpacing: 0.4 });
    doc.fontSize(10).fillColor(INK).text(patient.symptoms, left, y + 10, { width: W });
    y = doc.y + 8;
  }

  // Examination + image
  y = section('Examination', y + 6);
  const imgPath = path.join(UPLOADS, path.basename(screening.image_path));
  const boxW = 190;
  const boxH = 190;
  if (fs.existsSync(imgPath)) {
    try {
      doc.save().rect(left, y, boxW, boxH).fill('#000').restore();
      doc.image(imgPath, left, y, { fit: [boxW, boxH], align: 'center', valign: 'center' });
    } catch {
      doc.rect(left, y, boxW, boxH).strokeColor(LINE).stroke();
    }
  }
  const rx = left + boxW + 24;
  const rw = W - boxW - 24;
  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text('EYE SCREENED', rx, y, { characterSpacing: 0.4 });
  doc.fontSize(10).fillColor(INK).text(`${screening.eye} eye · fundus photograph`, rx, y + 10);
  doc.fontSize(7.5).fillColor(MUTED).text('VISUAL ACUITY', rx, y + 34, { characterSpacing: 0.4 });
  doc.fontSize(10).fillColor(INK).text(val(screening.visual_acuity), rx, y + 44);

  const pct = (n) => `${(Number(n) * 100).toFixed(1)}%`;
  doc.fontSize(7.5).fillColor(MUTED).text('AI FINDING', rx, y + 70, { characterSpacing: 0.4 });
  const dr = screening.dr_detected;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(dr ? ALERT : ACCENT).text(screening.prediction, rx, y + 81, { width: rw });
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(`Model confidence ${pct(screening.confidence)}`, rx, doc.y + 2);

  // probability bars
  const bar = (label, p, by, color) => {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label, rx, by, { width: 110 });
    doc.rect(rx + 112, by + 2, rw - 112 - 44, 6).fill(LINE);
    doc.rect(rx + 112, by + 2, Math.max(1, (rw - 112 - 44) * Number(p)), 6).fill(color);
    doc.font('Helvetica').fontSize(8).fillColor(INK).text(pct(p), rx + rw - 40, by, { width: 40, align: 'right' });
  };
  bar('Retinopathy', screening.prob_dr, y + 134, ALERT);
  bar('No retinopathy', screening.prob_no_dr, y + 152, ACCENT);
  y += boxH + 14;

  // Assessment
  y = section('Assessment & plan', y);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(screening.urgency === 'Urgent' ? ALERT : INK).text(`${screening.urgency} follow-up`, left, y);
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(screening.followup, left, doc.y + 2, { width: W });
  const risks = riskFactors(patient);
  if (risks.length) {
    doc.moveDown(0.5).fontSize(9).fillColor(MUTED).text(`Risk factors noted: ${risks.join(', ')}.`, left, doc.y, { width: W });
  }
  if (screening.notes) {
    doc.moveDown(0.5).fontSize(9).fillColor(MUTED).text('Clinician notes: ', left, doc.y, { continued: true }).fillColor(INK).text(screening.notes, { width: W });
  }

  // Footer
  const fy = doc.page.height - 130;
  doc.moveTo(left, fy).lineTo(left + W, fy).strokeColor(LINE).lineWidth(0.8).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`Analysis by ${screening.model_name}  ·  Generated ${fmtDateTime(new Date())}`, left, fy + 10, { width: W * 0.65 });
  doc.moveTo(left + W - 150, fy + 44).lineTo(left + W, fy + 44).strokeColor(MUTED).stroke();
  doc.fontSize(8).text('Reviewing ophthalmologist', left + W - 150, fy + 48, { width: 150, align: 'center' });

  doc.end();
}
