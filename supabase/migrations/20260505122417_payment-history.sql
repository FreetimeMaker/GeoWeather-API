-- ============================================
-- 1) Add payment_history column to subscriptions
-- ============================================

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_history jsonb NOT NULL DEFAULT '[]'::jsonb;


-- ============================================
-- 2) RPC function to append entries to payment_history
-- ============================================

CREATE OR REPLACE FUNCTION public.append_payment_history(
    sub_id uuid,
    entry jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE public.subscriptions
    SET payment_history = COALESCE(payment_history, '[]'::jsonb) || entry,
        updated_at = now()
    WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 3) Allow authenticated users to use the RPC
-- ============================================

GRANT EXECUTE ON FUNCTION public.append_payment_history(uuid, jsonb)
TO authenticated;
