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

async function getCredentials() {
  await client.connect();
  try {
    const { rows } = await client.query("SELECT full_name, email, role, sub_role, password FROM public.profiles;");
    console.table(rows);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
getCredentials();
