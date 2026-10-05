// ============================================================
// BATEU WORLD — Sincronização com a plataforma
// O mundo 3D espelha conteúdo REAL: sorteios ativos, concursos,
// cupões públicos, bens em alienação (Feira) e ranking global.
// Se a base falhar, devolve fallbacks para o mundo nunca ficar vazio.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export interface WorldRaffle {
  id: string;
  slug?: string | null;
  title: string;
  prizeTitle: string;
  prizeValue: number;
  ticketPrice: number;
  image?: string | null;
  province?: string | null;
}

export interface WorldContest {
  id: string;
  title: string;
  description?: string | null;
  prize?: string | null;
}

export interface WorldVoucher {
  id: string;
  code: string;
  type: "percentage" | "fixed" | string;
  value: number;
  validUntil?: string | null;
}

export interface WorldAsset {
  id: string;
  title: string;
  category: string;
  modality: string;
  value: number;
  image?: string | null;
  province?: string | null;
  city?: string | null;
}

export interface LeaderboardRow {
  name: string;
  classId: number;
  level: number;
  gold: number;
  kills: number;
}

export interface PlatformData {
  raffles: WorldRaffle[];
  contests: WorldContest[];
  vouchers: WorldVoucher[];
  assets: WorldAsset[];
  leaderboard: LeaderboardRow[];
  online: number;
  live: boolean; // true se os dados vieram da base real
}

// ─── Rotas da plataforma ─────────────────────────────────────

export function worldRoute(kind: "raffle" | "contest" | "asset" | "games", item: { id: string; slug?: string | null }): string {
  if (kind === "raffle") return `/raffle/${item.slug || item.id}`;
  if (kind === "contest") return `/concursos/${item.id}`;
  if (kind === "asset") return `/alienacao/${item.id}`;
  return "/lives";
}

// ─── Fallbacks (mundo nunca vazio) ───────────────────────────

const FALLBACK_RAFFLES: WorldRaffle[] = [
  { id: "demo-r1", title: "Sorteio da Semana", prizeTitle: "Telemóvel Premium", prizeValue: 45000, ticketPrice: 50 },
  { id: "demo-r2", title: "Mega Sorteio Bateu", prizeTitle: "Gerador Solar", prizeValue: 80000, ticketPrice: 100 },
  { id: "demo-r3", title: "Sorteio Relâmpago", prizeTitle: "Panela Elétrica", prizeValue: 12000, ticketPrice: 25 },
];

const FALLBACK_CONTESTS: WorldContest[] = [
  { id: "demo-c1", title: "Concurso de Talentos", prize: "50.000 MT" },
  { id: "demo-c2", title: "Melhor Negócio Local", prize: "30.000 MT" },
];

const FALLBACK_VOUCHERS: WorldVoucher[] = [
  { id: "demo-v1", code: "BATEU-BOAS-VINDAS", type: "percentage", value: 10 },
  { id: "demo-v2", code: "BATEU-MUNDO-25", type: "fixed", value: 25 },
];

const FALLBACK_ASSETS: WorldAsset[] = [
  { id: "demo-a1", title: "Toyota Hilux 2018", category: "viaturas", modality: "venda_direta", value: 1850000, city: "Maputo" },
  { id: "demo-a2", title: "Loja no Baixa", category: "imoveis", modality: "leasing", value: 6500000, city: "Matola" },
  { id: "demo-a3", title: "Gerador 50kVA", category: "equipamentos", modality: "rent_to_own", value: 320000, city: "Beira" },
];

// ─── Formatadores ────────────────────────────────────────────

export function fmtMZN(v: number): string {
  return new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(v) + " MT";
}

export function voucherLabel(v: WorldVoucher): string {
  return v.type === "percentage" ? `-${v.value}%` : `-${fmtMZN(v.value)}`;
}

export const MODALITY_LABEL: Record<string, string> = {
  venda_direta: "À VENDA",
  leasing: "LEASING",
  rent_to_own: "RENT-TO-OWN",
  leilao: "LEILÃO",
};

// ─── Fetch principal ─────────────────────────────────────────

function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, ms);
    Promise.resolve(p).then((v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } }).catch(() => { if (!done) { done = true; clearTimeout(t); resolve(fallback); } });
  });
}

export async function fetchPlatformData(): Promise<PlatformData> {
  return withTimeout(fetchPlatformDataInner(), 8000, {
    raffles: FALLBACK_RAFFLES,
    contests: FALLBACK_CONTESTS,
    vouchers: FALLBACK_VOUCHERS,
    assets: FALLBACK_ASSETS,
    leaderboard: [],
    online: 1,
    live: false,
  });
}

async function fetchPlatformDataInner(): Promise<PlatformData> {
  const out: PlatformData = {
    raffles: FALLBACK_RAFFLES,
    contests: FALLBACK_CONTESTS,
    vouchers: FALLBACK_VOUCHERS,
    assets: FALLBACK_ASSETS,
    leaderboard: [],
    online: 1,
    live: false,
  };

  try {
    const [r, c, v, a, lb] = await Promise.all([
      sb.from("raffles").select("id,slug,title,prize_title,prize_value,ticket_price,image_url,province").eq("status", "active").order("created_at", { ascending: false }).limit(10),
      sb.from("contests").select("id,title,description,prize_description").in("status", ["active", "voting"]).order("created_at", { ascending: false }).limit(6),
      sb.from("vouchers").select("id,code,type,value,valid_until").eq("is_active", true).gte("valid_until", new Date().toISOString()).limit(10),
      sb.from("alienacao_assets").select("id,title,category,modality,asset_value,images,province,city").eq("status", "disponivel").order("featured", { ascending: false }).limit(8),
      sb.from("rpg_characters").select("name,class_id,level,gold,total_kills").order("level", { ascending: false }).limit(20),
    ]);

    let live = false;

    if (r.data && r.data.length > 0) {
      out.raffles = r.data.map((x: any) => ({
        id: x.id, slug: x.slug, title: x.title || "Sorteio",
        prizeTitle: x.prize_title || "Prémio surpresa",
        prizeValue: Number(x.prize_value || 0),
        ticketPrice: Number(x.ticket_price || 0),
        image: x.image_url, province: x.province,
      }));
      live = true;
    }
    if (c.data && c.data.length > 0) {
      out.contests = c.data.map((x: any) => ({ id: x.id, title: x.title || "Concurso", description: x.description, prize: x.prize_description }));
      live = true;
    }
    if (v.data && v.data.length > 0) {
      out.vouchers = v.data.map((x: any) => ({ id: x.id, code: x.code, type: x.type, value: Number(x.value || 0), validUntil: x.valid_until }));
      live = true;
    }
    if (a.data && a.data.length > 0) {
      out.assets = a.data.map((x: any) => ({
        id: x.id, title: x.title || "Bem", category: x.category, modality: x.modality,
        value: Number(x.asset_value || 0),
        image: Array.isArray(x.images) && x.images.length > 0 ? x.images[0] : null,
        province: x.province, city: x.city,
      }));
      live = true;
    }
    if (lb.data && lb.data.length > 0) {
      out.leaderboard = lb.data.map((x: any) => ({ name: x.name || "Anónimo", classId: x.class_id ?? 0, level: x.level ?? 1, gold: x.gold ?? 0, kills: x.total_kills ?? 0 }));
    }

    out.live = live;
  } catch (e) {
    console.warn("[BateuWorld] Platform sync fallback:", e);
  }

  return out;
}

// ─── Persistência do personagem (tabela rpg_characters) ──────

export interface CharRow {
  guest_id: string;
  name: string;
  class_id: number;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  max_hp: number;
  atk: number;
  spd: number;
  total_kills: number;
  is_online: boolean;
}

export async function upsertCharacter(row: CharRow): Promise<boolean> {
  try {
    const { error } = await sb.from("rpg_characters").upsert(row, { onConflict: "guest_id" });
    return !error;
  } catch {
    return false;
  }
}

export async function setCharacterOffline(guestId: string): Promise<void> {
  try {
    await sb.from("rpg_characters").update({ is_online: false, last_online: new Date().toISOString() }).eq("guest_id", guestId);
  } catch {
    /* silencioso */
  }
}
