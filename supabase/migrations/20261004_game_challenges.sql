-- =============================================================
-- GAME CHALLENGES UNIVERSAL — Desafios 1v1 em qualquer jogo
-- Suporta convidados (guest_id texto), sem dependencia de auth.users
-- =============================================================

CREATE TABLE IF NOT EXISTS game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Jogo
  game_id TEXT NOT NULL,
  game_label TEXT NOT NULL,

  -- Desafiante
  challenger_id TEXT NOT NULL,
  challenger_name TEXT NOT NULL,

  -- Desafiado (null = desafio aberto)
  challenged_id TEXT,
  challenged_name TEXT,

  -- Estado: open -> accepted -> done / declined / cancelled
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'done', 'declined', 'cancelled')),
  challenger_score INTEGER NOT NULL DEFAULT 0,
  challenged_score INTEGER NOT NULL DEFAULT 0,
  winner_side TEXT CHECK (winner_side IN ('challenger', 'challenged', 'draw')),

  -- Recompensa virtual (moedas de jogo, sem dinheiro real)
  stake_coins INTEGER NOT NULL DEFAULT 50,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_challenges_status ON game_challenges (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_challenges_players ON game_challenges (challenger_id, challenged_id);
CREATE INDEX IF NOT EXISTS idx_game_challenges_game ON game_challenges (game_id);

-- RLS: qualquer pessoa (incl. anon/invitation) pode ver e jogar
ALTER TABLE game_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_challenges_read" ON game_challenges;
CREATE POLICY "game_challenges_read" ON game_challenges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "game_challenges_insert" ON game_challenges;
CREATE POLICY "game_challenges_insert" ON game_challenges
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "game_challenges_update" ON game_challenges;
CREATE POLICY "game_challenges_update" ON game_challenges
  FOR UPDATE USING (true) WITH CHECK (true);
