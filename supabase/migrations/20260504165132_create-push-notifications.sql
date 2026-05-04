-- ============================================
-- PUSH NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  event_type varchar(100),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TRIGGER: updated_at auto-update
-- ============================================

CREATE OR REPLACE FUNCTION public.update_push_notifications_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_push_notifications_updated_at ON public.push_notifications;

CREATE TRIGGER trg_update_push_notifications_updated_at
BEFORE UPDATE ON public.push_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_push_notifications_updated_at();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- SELECT: User sieht nur eigene Notifications
CREATE POLICY "Users can view own notifications"
ON public.push_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: User darf nur eigene Notifications anlegen
CREATE POLICY "Users can insert own notifications"
ON public.push_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User darf nur eigene Notifications ändern
CREATE POLICY "Users can update own notifications"
ON public.push_notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User darf nur eigene Notifications löschen
CREATE POLICY "Users can delete own notifications"
ON public.push_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- INDEXE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_push_notifications_user
  ON public.push_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_push_unread
  ON public.push_notifications(user_id)
  WHERE read_at IS NULL;
