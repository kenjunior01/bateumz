-- Bateu Mundo Aberto GO — geolocalização do conteúdo da plataforma
-- Aplica-se no Supabase Dashboard → SQL Editor (segura: só acrescenta colunas).
-- Objetivo: anúncios (Prestações + Alienação) aparecem no mapa do jogo na
-- localização real; sorteios e concursos têm âmbito "nacional" ou "provincia".

-- 1) Coordenadas opcionais nos anúncios
ALTER TABLE public.prestacao_products ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.prestacao_products ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE public.alienacao_assets ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.alienacao_assets ADD COLUMN IF NOT EXISTS lng double precision;

-- 2) Âmbito geográfico de sorteios e concursos
--    map_scope: 'nacional' (todo o país) | 'provincia' (apenas uma província)
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS map_scope text NOT NULL DEFAULT 'nacional';
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS map_scope text NOT NULL DEFAULT 'nacional';
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS province text;

-- 3) Índices parciais para busca por caixa (bounding box) no jogo
CREATE INDEX IF NOT EXISTS idx_prest_geo ON public.prestacao_products (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alien_geo ON public.alienacao_assets (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raffles_scope ON public.raffles (map_scope, status);
CREATE INDEX IF NOT EXISTS idx_contests_scope ON public.contests (map_scope, status);

-- 4) Cupões: garantir tabela + redenção (a lib src/lib/vouchers.ts já os usa)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','fixed')),
  value numeric NOT NULL DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  max_uses int DEFAULT 0,
  current_uses int DEFAULT 0,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid,
  raffle_id uuid,
  region text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id uuid,
  raffle_id uuid,
  discount_applied numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.increment_voucher_uses(p_voucher_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.vouchers SET current_uses = COALESCE(current_uses,0) + 1 WHERE id = p_voucher_id;
$$;

-- 5) RLS básico dos cupões (se ainda não existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vouchers' AND policyname = 'vouchers_read_active') THEN
    CREATE POLICY vouchers_read_active ON public.vouchers FOR SELECT USING (is_active = true OR auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vouchers' AND policyname = 'vouchers_admin_write') THEN
    CREATE POLICY vouchers_admin_write ON public.vouchers FOR ALL USING (auth.role() = 'service_role' OR auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voucher_redemptions' AND policyname = 'vredemptions_user_write') THEN
    CREATE POLICY vredemptions_user_write ON public.voucher_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voucher_redemptions' AND policyname = 'vredemptions_read') THEN
    CREATE POLICY vredemptions_read ON public.voucher_redemptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.vouchers TO anon, authenticated;
GRANT INSERT ON public.voucher_redemptions TO authenticated;
