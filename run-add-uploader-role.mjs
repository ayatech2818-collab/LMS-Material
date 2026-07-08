// Applies sql/add-uploader-role.sql to the database (uploader role + video_uploads table +
// RLS). Safe to re-run regardless of prior state. Run: node run-add-uploader-role.mjs
import pg from 'pg';
import { readFileSync } from 'fs';
const { Client } = pg;

const client = new Client({
  host: 'db.yzjjwhenniaucguvzgvj.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Ayatech2818@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    const sql = readFileSync(new URL('./sql/add-uploader-role.sql', import.meta.url), 'utf8');
    await client.query(sql);
    console.log('Uploader role migration applied successfully.');
  } catch (err) {
    console.error('Error applying uploader role migration:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
