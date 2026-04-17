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

async function run() {
  await client.connect();
  console.log("Adding password column...");
  try {
    await client.query("ALTER TABLE public.profiles ADD COLUMN password TEXT;");
    console.log("Success.");
  } catch(e) {
    console.log("Error or already exists:", e.message);
  }
  
  // Set explicit default passwords for existing users just to be safe
  await client.query("UPDATE public.profiles SET password = 'Playstation123!' WHERE password IS NULL;");
  
  process.exit(0);
}
run();
