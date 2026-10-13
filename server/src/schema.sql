CREATE TABLE IF NOT EXISTS patients (
  id                    SERIAL PRIMARY KEY,
  mrn                   TEXT UNIQUE NOT NULL,
  full_name             TEXT NOT NULL,
  dob                   DATE NOT NULL,
  sex                   TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  phone                 TEXT,
  email                 TEXT,
  city                  TEXT,
  blood_group           TEXT,
  height_cm             NUMERIC(5,1),
  weight_kg             NUMERIC(5,1),

  diabetes_type         TEXT NOT NULL DEFAULT 'Type 2',
  diabetes_since_year   INT,
  hba1c                 NUMERIC(4,1),
  fasting_glucose       INT,
  bp_systolic           INT,
  bp_diastolic          INT,
  cholesterol           INT,
  smoking               TEXT NOT NULL DEFAULT 'Never',
  hypertension          BOOLEAN NOT NULL DEFAULT FALSE,
  on_insulin            BOOLEAN NOT NULL DEFAULT FALSE,
  medications           TEXT,
  allergies             TEXT,
  family_history        TEXT,

  previous_eye_treatment TEXT,
  symptoms              TEXT,
  referring_physician   TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS screenings (
  id                SERIAL PRIMARY KEY,
  patient_id        INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  screened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  eye               TEXT NOT NULL DEFAULT 'Right' CHECK (eye IN ('Right', 'Left')),
  visual_acuity     TEXT,
  notes             TEXT,

  image_path        TEXT NOT NULL,
  image_name        TEXT,

  prediction        TEXT NOT NULL,
  dr_detected       BOOLEAN NOT NULL,
  confidence        NUMERIC(7,6) NOT NULL,
  prob_dr           NUMERIC(7,6) NOT NULL,
  prob_no_dr        NUMERIC(7,6) NOT NULL,
  urgency           TEXT NOT NULL,
  followup          TEXT NOT NULL,
  model_name        TEXT NOT NULL DEFAULT 'ResNet-50 (transfer learning)',

  clinical_snapshot JSONB
);

CREATE INDEX IF NOT EXISTS screenings_patient_idx ON screenings (patient_id, screened_at DESC);
