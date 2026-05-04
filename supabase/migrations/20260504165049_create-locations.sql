-- ============================================
-- LOCATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TRIGGER: updated_at auto-update
-- ============================================

CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_locations_updated_at ON public.locations;

CREATE TRIGGER trg_update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_locations_updated_at();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- SELECT: User sieht nur eigene Locations
CREATE POLICY "Users can view own locations"
ON public.locations
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: User darf nur eigene Locations anlegen
CREATE POLICY "Users can insert own locations"
ON public.locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: User darf nur eigene Locations ändern
CREATE POLICY "Users can update own locations"
ON public.locations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: User darf nur eigene Locations löschen
CREATE POLICY "Users can delete own locations"
ON public.locations
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- INDEXE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_locations_user_id
  ON public.locations(user_id);

CREATE INDEX IF NOT EXISTS idx_locations_coords
  ON public.locations(latitude, longitude);
