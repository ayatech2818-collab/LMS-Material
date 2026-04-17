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
      -- 1. Add title column to tasks
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title TEXT;

      -- 2. Add revision tracking
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS revision_target_status public.task_status;

      -- 3. Create videos storage bucket
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('videos', 'videos', false) ON CONFLICT DO NOTHING;

      -- 4. Enable RLS on remaining tables
      ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.hierarchies ENABLE ROW LEVEL SECURITY;

      -- 5. RLS Policies for tasks
      DROP POLICY IF EXISTS "Admins full access on tasks" ON public.tasks;
      CREATE POLICY "Admins full access on tasks"
      ON public.tasks FOR ALL
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

      DROP POLICY IF EXISTS "Users can read assigned tasks" ON public.tasks;
      CREATE POLICY "Users can read assigned tasks"
      ON public.tasks FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.task_assignments
          WHERE task_assignments.task_id = tasks.id
          AND task_assignments.user_id = auth.uid()
        )
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('qc', 'admin')
      );

      -- 6. RLS for hierarchies
      DROP POLICY IF EXISTS "Everyone can read hierarchies" ON public.hierarchies;
      CREATE POLICY "Everyone can read hierarchies"
      ON public.hierarchies FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admins manage hierarchies" ON public.hierarchies;
      CREATE POLICY "Admins manage hierarchies"
      ON public.hierarchies FOR ALL
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
    `);
    console.log("Migration executed successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

runSQL();
