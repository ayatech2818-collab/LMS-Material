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

async function migrate() {
  try {
    await client.connect();
    console.log("Connected to database.");

    await client.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;`);
    console.log("✅ Added 'phone' column");

    await client.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password TEXT;`);
    console.log("✅ Added 'plain_password' column");

    console.log("\n🎉 Migration complete!");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

migrate();
