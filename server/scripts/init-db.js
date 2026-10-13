// Creates the database (if needed), applies the schema and seeds demo patients.
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_PATIENTS } from './seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
};
const dbName = process.env.PGDATABASE || 'retina_dr';

async function main() {
  const admin = new pg.Client({ ...base, database: 'postgres' });
  try {
    await admin.connect();
  } catch (err) {
    console.error(`\nCould not connect to PostgreSQL at ${base.host}:${base.port} as "${base.user}".`);
    console.error(`${err.message}\nCheck PGPASSWORD / PGPORT in server/.env\n`);
    process.exit(1);
  }
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database ${dbName}`);
  }
  await admin.end();

  const db = new pg.Client({ ...base, database: dbName });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'src', 'schema.sql'), 'utf8'));

  let added = 0;
  for (const p of SEED_PATIENTS) {
    const cols = Object.keys(p);
    const r = await db.query(
      `INSERT INTO patients (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (mrn) DO NOTHING`,
      cols.map((c) => p[c]),
    );
    added += r.rowCount;
  }
  console.log(`Schema ready. Seeded ${added} new demo patient(s).`);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
