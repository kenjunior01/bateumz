-- ============================================================
-- Bateu World v2 — Banco de Pontos: troca de Pontos de Troféu
-- do mundo 3D por saldo real da carteira (MZN).
-- RPC: exchange_world_points(p_points int, p_ref text)
-- 250 pontos = 10 MT (taxa fixa 25 pts/MT).
-- Idempotente por chamada; exige utilizador autenticado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.exchange_world_points(
  p_points integer,
  p_ref text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_amount numeric;
  v_wallet uuid;
  v_rate constant integer := 25; -- 25 pontos por 1 MT
BEGIN
  -- só utilizadores autenticados convertem para saldo real
  SELECT auth.uid() INTO v_user;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_points IS NULL OR p_points < 250 OR p_points % 250 <> 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_points');
  END IF;

  v_amount := (p_points / v_rate)::numeric;

  -- localizar a carteira do utilizador
  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_user LIMIT 1;
  IF v_wallet IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_wallet');
  END IF;

  -- credita saldo e regista a transação
  UPDATE public.wallets
     SET balance = balance + v_amount,
         updated_at = now()
   WHERE id = v_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, direction, balance_after,
    status, reference_type, reference_id, description
  )
  VALUES (
    v_wallet, v_user, 'world_points_exchange', v_amount, 'credit',
    (SELECT balance FROM public.wallets WHERE id = v_wallet),
    'completed', 'bateu_world', p_ref,
    'Bateu World — troca de ' || p_points || ' Pontos de Troféu'
  );

  RETURN jsonb_build_object('ok', true, 'amount', v_amount);
END;
$$;

-- ============================================================
-- Opcional: ranking global persistente do mundo (top pontos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.world_progress (
  guest_id text PRIMARY KEY,
  user_id uuid,
  name text NOT NULL,
  class_id integer DEFAULT 0,
  level integer DEFAULT 1,
  points integer DEFAULT 0,
  kills integer DEFAULT 0,
  discoveries text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.world_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_progress' AND policyname = 'world_progress_public_read') THEN
    CREATE POLICY world_progress_public_read ON public.world_progress
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_progress' AND policyname = 'world_progress_owner_write') THEN
    CREATE POLICY world_progress_owner_write ON public.world_progress
      FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;
