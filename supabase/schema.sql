-- ============================================================================
-- ITALINK - SUPABASE DATABASE SCHEMA
-- Zero-Manual Cloud Synchronization with Strict Row Level Security (RLS)
-- ============================================================================

-- 1. Create table for user study progress
CREATE TABLE IF NOT EXISTS public.user_study_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  progress JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create index on user_id for fast queries
CREATE INDEX IF NOT EXISTS idx_user_study_progress_user_id 
ON public.user_study_progress (user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;

-- 4. Create Strict RLS Policies
-- Authenticated users can ONLY select their own rows
DROP POLICY IF EXISTS "Users can read own progress" ON public.user_study_progress;
CREATE POLICY "Users can read own progress"
ON public.user_study_progress
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Authenticated users can ONLY insert their own rows
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_study_progress;
CREATE POLICY "Users can insert own progress"
ON public.user_study_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Authenticated users can ONLY update their own rows
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_study_progress;
CREATE POLICY "Users can update own progress"
ON public.user_study_progress
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Authenticated users can delete their own rows (e.g. account wipe)
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_study_progress;
CREATE POLICY "Users can delete own progress"
ON public.user_study_progress
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- 5. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_study_progress;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_study_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
