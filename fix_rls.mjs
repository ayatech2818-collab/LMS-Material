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
    await client.query(`
      DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

      CREATE OR REPLACE FUNCTION public.get_user_role()
      RETURNS user_role AS $$
        SELECT role FROM public.profiles WHERE id = auth.uid();
      $$ LANGUAGE sql SECURITY DEFINER;

      CREATE POLICY "Admins have full access to profiles" 
      ON public.profiles FOR ALL 
      USING ( public.get_user_role() = 'admin' );
    `);
    console.log("RLS infinite recursion fixed.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

runSQL();
