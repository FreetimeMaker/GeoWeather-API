-- ============================================
-- USERS TABLE (linked to Supabase auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username varchar(255) UNIQUE NOT NULL,
  name varchar(255),
  subscription_tier varchar(50) DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TRIGGER: updated_at auto-update
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_users_updated_at ON public.users;

CREATE TRIGGER trg_update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- SELECT: User darf nur seine eigene Zeile sehen
CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- UPDATE: User darf nur seine eigene Zeile ändern
CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Nur Service Role darf neue User anlegen
CREATE POLICY "Service role can insert users"
ON public.users
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- DELETE: Standardmäßig NICHT erlaubt
-- Falls du willst:
-- REVOKE DELETE ON public.users FROM authenticated;

-- ============================================
-- OPTIONAL: Admin Policy (z. B. für Dashboard)
-- ============================================

CREATE POLICY "Admins have full access"
ON public.users
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username
  ON public.users(username);
