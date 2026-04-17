import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.yzjjwhenniaucguvzgvj.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Ayatech2818@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    await client.connect();
    
    // Attempt an insert to trigger handle_new_user and catch the exact error
    await client.query(`
      INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data) 
      VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'test@test.com', '{}');
    `);
    
    console.log("Insert successful.");
  } catch (err) {
    console.error("Exact DB Error:", err);
  } finally {
    await client.end();
  }
}

runTest();
