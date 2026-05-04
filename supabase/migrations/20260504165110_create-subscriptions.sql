-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier varchar(50) NOT NULL,
  payment_method varchar(255),
  payment_type varchar(50) DEFAULT 'one_time',
  original_price decimal(10, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

-- ============================================
-- TRIGGER: updated_at auto-update
-- ============================================

CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_subscriptions_updated_at ON public.subscriptions;

CREATE TRIGGER trg_update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- SELECT: User sieht nur eigene Subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: User darf nur eigene Subscriptions anlegen
CREATE POLICY "Users can insert own subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User darf nur eigene Subscriptions ändern
CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User darf nur eigene Subscriptions löschen
CREATE POLICY "Users can delete own subscriptions"
ON public.subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- INDEXE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON public.subscriptions(is_active);
