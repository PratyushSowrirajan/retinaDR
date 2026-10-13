import 'dotenv/config';
import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'retina_dr',
});

export const query = (text, params) => pool.query(text, params);
