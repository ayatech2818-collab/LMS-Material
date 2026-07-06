// Applies sql/aggregation-rpcs.sql to the database (creates the dashboard aggregation
// functions). Idempotent — every function uses CREATE OR REPLACE. Run: node run-aggregation-rpcs.mjs
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
    const sql = readFileSync(new URL('./sql/aggregation-rpcs.sql', import.meta.url), 'utf8');
    await client.query(sql);
    console.log('Aggregation RPCs created/replaced successfully.');
  } catch (err) {
    console.error('Error applying aggregation RPCs:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
