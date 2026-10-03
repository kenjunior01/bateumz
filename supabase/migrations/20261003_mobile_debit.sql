-- ============================================================
-- Bateu — Mobile Debit Pay (MPesa / e-Mola) — 2026-10-03
-- Transações de débito direto via API (C2B push)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mobile_debit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mpesa', 'emola', 'conta_movel', 'tkash')),
  phone TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  reference TEXT NOT NULL,
  provider_txn_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled', 'timeout')),
  status_detail TEXT,
  gateway_mode TEXT DEFAULT 'gateway',
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_debit_user ON public.mobile_debit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_debit_status ON public.mobile_debit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mobile_debit_reference ON public.mobile_debit_transactions(reference);

-- Impede que o utilizador veja transações de outros
ALTER TABLE public.mobile_debit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own debit transactions"
  ON public.mobile_debit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- service_role (Edge Function) tem acesso total por defeito.
