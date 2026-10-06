-- ============================================================
-- Bateu World v6 — Super-sincronização com a conta
-- 1. world_vouchers: cupões ganhos no mundo 3D guardados na
--    CONTA do utilizador (sobrevivem a roubo no dispositivo
--    e ficam visíveis em qualquer dispositivo).
-- 2. world_progress: colunas extra para espelhar o estado
--    completo do herói (ouro, xp, avatar, defesa).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.world_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id text,
  code text NOT NULL,
  label text,
  stolen_at timestamptz,          -- preenchido se for roubado no PvP
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, voucher_id, code)
);

ALTER TABLE public.world_vouchers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_vouchers' AND policyname = 'world_vouchers_owner_read') THEN
    CREATE POLICY world_vouchers_owner_read ON public.world_vouchers
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_vouchers' AND policyname = 'world_vouchers_owner_write') THEN
    CREATE POLICY world_vouchers_owner_write ON public.world_vouchers
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_world_vouchers_user ON public.world_vouchers(user_id);

-- ============================================================
-- world_progress: espelho completo do herói v6
-- ============================================================
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS gold integer DEFAULT 0;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS deaths integer DEFAULT 0;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS def integer DEFAULT 0;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS avatar jsonb;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS vouchers_count integer DEFAULT 0;
ALTER TABLE public.world_progress ADD COLUMN IF NOT EXISTS waves_best integer DEFAULT 0;

-- ============================================================
-- v6: registo do roubo de cupões no PvP (para o ladrão receber
-- o cupão REAL na conta dele) — função idempotente
-- ============================================================
CREATE OR REPLACE FUNCTION public.world_steal_voucher(
  p_victim_guest text,
  p_code text,
  p_label text,
  p_voucher_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thief uuid;
  v_victim uuid;
BEGIN
  SELECT auth.uid() INTO v_thief;
  IF v_thief IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- o dono anterior (se identificado) perde a posse na conta
  SELECT user_id INTO v_victim FROM public.world_progress
    WHERE guest_id = p_victim_guest AND user_id IS NOT NULL LIMIT 1;

  IF v_victim IS NOT NULL THEN
    UPDATE public.world_vouchers
       SET stolen_at = now()
     WHERE user_id = v_victim AND code = p_code AND stolen_at IS NULL;
  END IF;

  -- o ladrão recebe o cupão na conta dele
  INSERT INTO public.world_vouchers (user_id, voucher_id, code, label)
  VALUES (v_thief, p_voucher_id, p_code, p_label)
  ON CONFLICT (user_id, voucher_id, code) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;
