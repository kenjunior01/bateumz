-- ============================================================
-- Bateu — 2026-10-03
-- 1) SEGURANÇA: revogar EXECUTE público de RPCs de dinheiro
-- 2) Bónus de boas-vindas (endowment effect) via trigger em profiles
-- 3) Recompensa diária server-authoritative (anti-abuse)
-- 4) Seed da configuração da API de débito (MPesa/e-Mola) para o painel Admin
-- ============================================================

-- ---------- 1) SEGURANÇA CRÍTICA ----------
-- wallet_process_transaction é SECURITY DEFINER e sem REVOKE qualquer
-- utilizador autenticado podia creditar saldo ilimitado a si mesmo.
-- Edge functions usam service role (owner postgres) → continuam a funcionar.
REVOKE EXECUTE ON FUNCTION public.wallet_process_transaction(uuid, text, numeric, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_process_transaction FROM PUBLIC, anon, authenticated;

-- ---------- 2) BÓNUS DE BOAS-VINDAS ----------
-- Dispara quando o perfil é criado (logo após signup). Dá:
--   • 20 MZN de saldo de boas-vindas (endowment → primeira experiência de jogo sem fricção)
--   • 50 luck points registados
--   • Notificação de boas-vindas
CREATE OR REPLACE FUNCTION public.handle_welcome_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
BEGIN
  -- Idempotente: nunca dá bónus duas vezes
  IF EXISTS (SELECT 1 FROM public.luck_points WHERE user_id = NEW.user_id AND action = 'welcome_bonus') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(points), 0) + 1 INTO v_points FROM public.luck_points WHERE user_id = NEW.user_id AND action = 'welcome_bonus';

  -- Saldo de boas-vindas
  BEGIN
    PERFORM public.wallet_process_transaction(
      p_user_id        => NEW.user_id,
      p_type           => 'bonus',
      p_amount         => 20,
      p_direction      => 'credit',
      p_reference_type => 'welcome_bonus',
      p_reference_id   => NULL,
      p_description    => 'Bónus de boas-vindas Bateu'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se a carteira falhar, não bloquear o signup
    NULL;
  END;

  -- Luck points de boas-vindas
  INSERT INTO public.luck_points (user_id, points, action, description)
  VALUES (NEW.user_id, 50, 'welcome_bonus', 'Bónus de boas-vindas: 50 pontos da sorte');

  -- Notificação
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Bem-vindo ao Bateu!',
    'Ganhaste 20 MZN de bónus e 50 pontos da sorte. Começa a jogar agora!',
    'success'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_welcome_bonus ON public.profiles;
CREATE TRIGGER trg_welcome_bonus
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_welcome_bonus();

-- ---------- 3) RECOMPENSA DIÁRIA SERVER-AUTHORITATIVE ----------
-- Substitui o sistema localStorage (que prometia MZN sem creditar nada).
-- Regras: 1 claim / 24h; streak consecutivo reinicia se falhar 1 dia;
-- dias 1-7 pagam 5,10,15,25,40,60,100 MZN e depois ciclam.
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_streak integer := 1;
  v_amount numeric;
  v_day_index integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT MAX(created_at) INTO v_last
  FROM public.luck_points
  WHERE user_id = v_user AND action = 'daily_reward';

  -- Já reclamou nas últimas 20h → bloquear (janela diária generosa p/ fusos)
  IF v_last IS NOT NULL AND v_last > now() - interval '20 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed',
      'next_claim_at', to_char(v_last + interval '24 hours', 'YYYY-MM-DD"T"HH24:MI:SSZ'));
  END IF;

  -- Streak: reclamou ontem (24-48h) → continua; senão reinicia
  IF v_last IS NOT NULL AND v_last > now() - interval '48 hours' THEN
    SELECT COALESCE(
      (SELECT (description::jsonb->>'streak')::integer
       FROM public.luck_points
       WHERE user_id = v_user AND action = 'daily_reward'
       ORDER BY created_at DESC LIMIT 1), 0) + 1
    INTO v_streak;
  END IF;

  v_day_index := ((v_streak - 1) % 7);
  v_amount := (ARRAY[5,10,15,25,40,60,100])[v_day_index + 1];

  -- Registar (streak guardado no description jsonb p/ leitura futura)
  INSERT INTO public.luck_points (user_id, points, action, description)
  VALUES (v_user, v_amount::integer, 'daily_reward',
          jsonb_build_object('streak', v_streak, 'amount', v_amount)::text);

  -- Creditar saldo real
  PERFORM public.wallet_process_transaction(
    p_user_id        => v_user,
    p_type           => 'bonus',
    p_amount         => v_amount,
    p_direction      => 'credit',
    p_reference_type => 'daily_reward',
    p_reference_id   => NULL,
    p_description    => 'Recompensa diária — dia ' || v_streak
  );

  RETURN jsonb_build_object('ok', true, 'amount', v_amount, 'streak', v_streak);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_daily_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;

-- ---------- 4) CONFIG DA API DE DÉBITO (painel Admin) ----------
-- A edge function mobile-debit lê esta chave (service role) com fallback
-- aos segredos Deno.env. Só admins leem platform_settings (RLS 20260803).
INSERT INTO public.platform_settings (key, value)
VALUES (
  'debit_api',
  '{
    "mode": "gateway",
    "gateway_url": "",
    "gateway_key": "",
    "mpesa_sp_code": "",
    "mpesa_portal_key": "",
    "mpesa_public_key": "",
    "mpesa_base_url": "",
    "providers_enabled": { "mpesa": true, "emola": true, "conta_movel": false, "tkash": false },
    "configured_at": null
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
