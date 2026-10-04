// =============================================================
// DESAFIOS UNIVERSAIS DE JOGOS — 1v1 em qualquer jogo da plataforma
// Funciona com conta ou como convidado (id local persistente).
// Supabase primeiro; fallback localStorage se a tabela não existir.
// =============================================================
import { supabase } from "@/integrations/supabase/client";

export interface GameChallenge {
  id: string;
  game_id: string;
  game_label: string;
  challenger_id: string;
  challenger_name: string;
  challenged_id: string | null;
  challenged_name: string | null;
  status: "open" | "accepted" | "done" | "declined" | "cancelled";
  challenger_score: number;
  challenged_score: number;
  winner_side: "challenger" | "challenged" | "draw" | null;
  stake_coins: number;
  created_at: string;
}

const LS_KEY = "bateu_game_challenges_v1";

// ---- Identidade local do jogador (guest-friendly) ----
export function getPlayerIdentity(): { id: string; name: string } {
  let id = localStorage.getItem("bateu_player_id");
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("bateu_player_id", id);
  }
  let name = localStorage.getItem("bateu_player_name");
  if (!name) {
    name = "Jogador" + Math.floor(1000 + Math.random() * 9000);
    localStorage.setItem("bateu_player_name", name);
  }
  return { id, name };
}

export function setPlayerName(name: string) {
  const clean = name.trim().slice(0, 20);
  if (clean) localStorage.setItem("bateu_player_name", clean);
}

// ---- Fallback local ----
function lsAll(): GameChallenge[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsSave(list: GameChallenge[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 100)));
}

// ---- API ----
export async function createChallenge(opts: {
  gameId: string;
  gameLabel: string;
  opponentName?: string;
  stakeCoins?: number;
}): Promise<GameChallenge> {
  const me = getPlayerIdentity();
  let opponentId: string | null = null;
  if (opts.opponentName) {
    // Se o nome do oponente coincide com um desafio em aberto direcionado, mantém só o nome
    opponentId = "named:" + opts.opponentName.toLowerCase();
  }
  const ch: GameChallenge = {
    id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    game_id: opts.gameId,
    game_label: opts.gameLabel,
    challenger_id: me.id,
    challenger_name: me.name,
    challenged_id: opponentId,
    challenged_name: opts.opponentName || null,
    status: "open",
    challenger_score: 0,
    challenged_score: 0,
    winner_side: null,
    stake_coins: opts.stakeCoins ?? 50,
    created_at: new Date().toISOString(),
  };
  try {
    const { error } = await (supabase as any).from("game_challenges").insert({
      game_id: ch.game_id, game_label: ch.game_label,
      challenger_id: ch.challenger_id, challenger_name: ch.challenger_name,
      challenged_id: ch.challenged_id, challenged_name: ch.challenged_name,
      status: ch.status, stake_coins: ch.stake_coins,
    });
    if (error) throw error;
  } catch {
    const list = lsAll();
    list.unshift(ch);
    lsSave(list);
  }
  return ch;
}

export async function listChallenges(): Promise<GameChallenge[]> {
  const me = getPlayerIdentity();
  try {
    const { data, error } = await (supabase as any)
      .from("game_challenges")
      .select("*")
      .in("status", ["open", "accepted"])
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return (data || []).map(normalize);
  } catch {
    const list = lsAll().filter((c) => c.status === "open" || c.status === "accepted");
    // Só mostra desafios abertos a todos, direcionados a mim, ou criados por mim
    return list.filter((c) =>
      !c.challenged_name ||
      c.challenged_id === "named:" + me.name.toLowerCase() ||
      c.challenger_id === me.id
    );
  }
}

function normalize(r: any): GameChallenge {
  return {
    id: r.id, game_id: r.game_id, game_label: r.game_label,
    challenger_id: r.challenger_id, challenger_name: r.challenger_name,
    challenged_id: r.challenged_id, challenged_name: r.challenged_name,
    status: r.status, challenger_score: r.challenger_score ?? 0,
    challenged_score: r.challenged_score ?? 0,
    winner_side: r.winner_side, stake_coins: r.stake_coins ?? 50,
    created_at: r.created_at,
  };
}

export async function acceptChallenge(id: string): Promise<void> {
  const me = getPlayerIdentity();
  try {
    await (supabase as any).from("game_challenges").update({
      status: "accepted", challenged_id: me.id, challenged_name: me.name, updated_at: new Date().toISOString(),
    }).eq("id", id);
  } catch {
    const list = lsAll();
    const c = list.find((x) => x.id === id);
    if (c) { c.status = "accepted"; c.challenged_id = me.id; c.challenged_name = me.name; lsSave(list); }
  }
}

export async function reportChallengeScore(id: string, side: "challenger" | "challenged", score: number): Promise<void> {
  const col = side === "challenger" ? "challenger_score" : "challenged_score";
  try {
    // Busca atual para decidir vencedor quando os dois lados têm score
    const { data } = await (supabase as any).from("game_challenges").select("*").eq("id", id).single();
    if (data) {
      const row = normalize(data);
      const scores: any = { challenger_score: row.challenger_score, challenged_score: row.challenged_score, status: "done" };
      scores[col] = score;
      const a = scores.challenger_score, b = scores.challenged_score;
      scores.winner_side = a === b ? "draw" : a > b ? "challenger" : "challenged";
      await (supabase as any).from("game_challenges").update({ ...scores, updated_at: new Date().toISOString() }).eq("id", id);
      return;
    }
    throw new Error("no row");
  } catch {
    const list = lsAll();
    const c = list.find((x) => x.id === id);
    if (c) {
      if (side === "challenger") c.challenger_score = score; else c.challenged_score = score;
      c.status = "done";
      c.winner_side = c.challenger_score === c.challenged_score ? "draw"
        : c.challenger_score > c.challenged_score ? "challenger" : "challenged";
      lsSave(list);
    }
  }
}

export async function cancelChallenge(id: string): Promise<void> {
  try {
    await (supabase as any).from("game_challenges").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
  } catch {
    const list = lsAll();
    const c = list.find((x) => x.id === id);
    if (c) { c.status = "cancelled"; lsSave(list); }
  }
}

// Conclui o meu lado: se o desafio está "accepted" e ainda não reportei, reporta.
// Devolve o estado final para a UI mostrar o resultado.
export async function finishMySide(ch: GameChallenge, myScore: number): Promise<GameChallenge | null> {
  const me = getPlayerIdentity();
  const side: "challenger" | "challenged" = ch.challenger_id === me.id ? "challenger" : "challenged";
  await reportChallengeScore(ch.id, side, myScore);
  const all = await listChallenges();
  return all.find((x) => x.id === ch.id) ?? null;
}

export function mySide(ch: GameChallenge): "challenger" | "challenged" {
  const me = getPlayerIdentity();
  return ch.challenger_id === me.id ? "challenger" : "challenged";
}
