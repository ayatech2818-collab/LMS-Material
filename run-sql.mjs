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

async function runSQL() {
  try {
    await client.connect();
    await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`);
    await client.query(`DROP FUNCTION IF EXISTS public.handle_new_user;`);
    console.log("Trigger dropped completely.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

runSQL();
