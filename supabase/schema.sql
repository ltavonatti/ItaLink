-- ============================================================================
-- PASSO ITALIAN - SUPABASE DATABASE SCHEMA
-- Zero-Manual Cloud Synchronization with Row Level Security (RLS)
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

-- 4. Create RLS Policies
-- Users can read their own study progress
CREATE POLICY "Users can read own progress"
ON public.user_study_progress
FOR SELECT
USING (auth.uid()::text = user_id OR user_id = id);

-- Users can insert their own study progress
CREATE POLICY "Users can insert own progress"
ON public.user_study_progress
FOR INSERT
WITH CHECK (auth.uid()::text = user_id OR user_id = id);

-- Users can update their own study progress
CREATE POLICY "Users can update own progress"
ON public.user_study_progress
FOR UPDATE
USING (auth.uid()::text = user_id OR user_id = id);

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

