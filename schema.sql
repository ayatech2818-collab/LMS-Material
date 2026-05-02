-- Material Operations Dashboard Schema

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;
DROP TABLE IF EXISTS public.task_history CASCADE;
DROP TABLE IF EXISTS public.task_assignments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.hierarchies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_sub_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS hierarchy_type CASCADE;

-- 1. Create Enums

-- 1. Create Enums
CREATE TYPE user_role AS ENUM ('admin', 'qc', 'loader');
CREATE TYPE user_sub_role AS ENUM (
  'script_writer',
  'video_audio_generator',
  'video_editor'
);

CREATE TYPE task_status AS ENUM (
  'assigned',              -- Column 1: Waiting for Script Writer
  'script_generated',      -- Column 2: Script done, awaiting QC
  'script_approved',       -- Column 3: QC approved script
  'video_generated',       -- Column 4: Video done, awaiting Editor
  'video_edited',          -- Column 5: Editing done, awaiting Final QC
  'final_approved',        -- Column 6: Fully complete
  'needs_revision'         -- Rejected — sent back
);

CREATE TYPE hierarchy_type AS ENUM ('board', 'class', 'subject', 'chapter');

-- 2. Create Profiles Table (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        user_role NOT NULL,
  sub_role    user_sub_role,        -- NULL for admin/qc
  is_active   BOOLEAN DEFAULT true,
  avatar_url  TEXT,
  phone       TEXT,
  plain_password TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Turn on Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies: Admin can do all. Users can read/update their own.
CREATE POLICY "Admins have full access to profiles" 
ON public.profiles FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- 3. Trigger to automatically create a profile when a new user signs up
-- We will default them to an 'admin' role if no profiles exist, otherwise they would be standard.
-- But since the task requires Admin to create users, we will just use a simple insert.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  count_profiles INT;
  assigned_role user_role;
BEGIN
  -- Check if this is the first user. If yes, make them admin. Otherwise loader.
  SELECT COUNT(*) INTO count_profiles FROM public.profiles;
  IF count_profiles = 0 THEN
    assigned_role := 'admin';
  ELSE
    -- Defaulting to loader, but admin will edit this immediately
    assigned_role := 'loader';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', 'System User'), NEW.email, assigned_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Create remaining tables for later
CREATE TABLE public.hierarchies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        hierarchy_type NOT NULL,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.hierarchies(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(type, name, parent_id)
);

CREATE TABLE public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id        UUID NOT NULL REFERENCES public.hierarchies(id),
  class_id        UUID NOT NULL REFERENCES public.hierarchies(id),
  subject_id      UUID NOT NULL REFERENCES public.hierarchies(id),
  chapter_id      UUID NOT NULL REFERENCES public.hierarchies(id),
  current_status  task_status NOT NULL DEFAULT 'assigned',
  revision_target_status task_status DEFAULT NULL,
  revision_count  INT DEFAULT 0,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.task_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id),
  stage       task_status NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, stage)
);

CREATE TABLE public.task_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  changed_by      UUID NOT NULL REFERENCES public.profiles(id),
  previous_status task_status,
  new_status      task_status NOT NULL,
  action          TEXT NOT NULL,
  notes           TEXT,
  proof_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('scripts', 'scripts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
