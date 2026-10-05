// Bateu Mundo Aberto — núcleo do jogo (tipos, catálogos, spawn determinístico, save)
// Jogo de mundo aberto com mapa REAL (Leaflet/OSM ou Mapbox opcional), GPS ou joystick,
// sincronizado com a plataforma (sorteios, feira, arena, missões).

// ---------- RNG determinístico ----------
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Classes (continuidade com a plataforma) ----------
export interface OWClass {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  atk: number;
  def: number;
  hpBonus: number;
}

export const OW_CLASSES: OWClass[] = [
  { id: "guerreiro", name: "Guerreiro", emoji: "⚔️", color: "#f97316", desc: "Vida alta e golpes fortes. Domina o combate corpo a corpo.", atk: 12, def: 8, hpBonus: 30 },
  { id: "mago", name: "Mago", emoji: "🧙", color: "#a855f7", desc: "Dano mágico devastador e sorte com baús encantados.", atk: 16, def: 4, hpBonus: 0 },
  { id: "arqueiro", name: "Arqueiro", emoji: "🏹", color: "#22c55e", desc: "Ataques críticos à distância. Caçador nato de criaturas.", atk: 14, def: 5, hpBonus: 10 },
  { id: "assassino", name: "Assassino", emoji: "🗡️", color: "#ef4444", desc: "Velocidade extrema. Chance dobrada de captura e fuga.", atk: 15, def: 3, hpBonus: 5 },
];

export const classById = (id: string) => OW_CLASSES.find((c) => c.id === id) || OW_CLASSES[0];

// ---------- Criaturas (tema africano/MZ) ----------
export type Rarity = "comum" | "raro" | "epico" | "lendario";

export interface OWCreature {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  hp: number;
  atk: number;
  gold: number;
  xp: number;
}

export const RARITY_META: Record<Rarity, { label: string; color: string; captureChance: number; weight: number }> = {
  comum: { label: "Comum", color: "#94a3b8", captureChance: 0.65, weight: 58 },
  raro: { label: "Raro", color: "#38bdf8", captureChance: 0.4, weight: 27 },
  epico: { label: "Épico", color: "#c084fc", captureChance: 0.22, weight: 11 },
  lendario: { label: "Lendário", color: "#fbbf24", captureChance: 0.1, weight: 4 },
};

export const CREATURES: OWCreature[] = [
  { id: "macaco", name: "Macaco Esperto", emoji: "🐒", rarity: "comum", hp: 40, atk: 6, gold: 18, xp: 14 },
  { id: "javali", name: "Javali Selvagem", emoji: "🐗", rarity: "comum", hp: 55, atk: 8, gold: 22, xp: 16 },
  { id: "aguia", name: "Águia Real", emoji: "🦅", rarity: "comum", hp: 45, atk: 9, gold: 20, xp: 18 },
  { id: "crocodilo", name: "Crocodilo do Zambeze", emoji: "🐊", rarity: "raro", hp: 90, atk: 13, gold: 55, xp: 40 },
  { id: "leao", name: "Leão da Savana", emoji: "🦁", rarity: "raro", hp: 110, atk: 16, gold: 70, xp: 50 },
  { id: "bufalo", name: "Búfalo Furioso", emoji: "🐃", rarity: "raro", hp: 100, atk: 12, gold: 60, xp: 45 },
  { id: "elefante", name: "Elefante Ancião", emoji: "🐘", rarity: "epico", hp: 180, atk: 20, gold: 150, xp: 110 },
  { id: "rinoceronte", name: "Rinoceronte Blindado", emoji: "🦏", rarity: "epico", hp: 210, atk: 24, gold: 180, xp: 130 },
  { id: "hipopotamo", name: "Hipopótamo Real", emoji: "🦛", rarity: "epico", hp: 195, atk: 22, gold: 165, xp: 120 },
  { id: "dragao", name: "Dragão do Índico", emoji: "🐉", rarity: "lendario", hp: 380, atk: 34, gold: 500, xp: 350 },
];

export const creatureById = (id: string) => CREATURES.find((c) => c.id === id) || CREATURES[0];

// ---------- Entidades do mapa ----------
export type EntityKind = "creature" | "chest" | "crystal" | "portal";

export interface OWEntity {
  key: string; // cellKey:index — estável entre sessões
  kind: EntityKind;
  lat: number;
  lng: number;
  creatureId?: string;
  portalId?: "feira" | "arena" | "arcade";
  tier?: number; // 1-3 (baús/cristais)
}

// Célula ≈ 0.0022° (~240m). Cada célula gera 2-4 entidades determinísticas.
export const CELL = 0.0022;

export function spawnCell(cx: number, cy: number): OWEntity[] {
  const rng = mulberry32(hashStr(`bateu-ow-${cx}:${cy}`));
  const n = 2 + Math.floor(rng() * 3);
  const out: OWEntity[] = [];
  for (let i = 0; i < n; i++) {
    const roll = rng();
    const lat = +(cy * CELL + rng() * CELL).toFixed(6);
    const lng = +(cx * CELL + rng() * CELL).toFixed(6);
    const key = `${cx}:${cy}:${i}`;
    if (roll < 0.34) {
      // criatura — raridade ponderada
      const w = rng() * 100;
      let rar: Rarity = "comum";
      if (w > 96) rar = "lendario";
      else if (w > 85) rar = "epico";
      else if (w > 58) rar = "raro";
      const pool = CREATURES.filter((c) => c.rarity === rar);
      out.push({ key, kind: "creature", lat, lng, creatureId: pool[Math.floor(rng() * pool.length)].id });
    } else if (roll < 0.62) {
      out.push({ key, kind: "crystal", lat, lng, tier: 1 + Math.floor(rng() * 3) });
    } else if (roll < 0.86) {
      out.push({ key, kind: "chest", lat, lng, tier: 1 + Math.floor(rng() * 3) });
    } else {
      const portals: Array<"feira" | "arena" | "arcade"> = ["feira", "arena", "arcade"];
      out.push({ key, kind: "portal", lat, lng, portalId: portals[Math.floor(rng() * 3)] });
    }
  }
  return out;
}

// células visíveis num raio (3x3 por omissão)
export function nearbyCells(lat: number, lng: number, radius = 1): Array<{ cx: number; cy: number }> {
  const cx = Math.floor(lng / CELL);
  const cy = Math.floor(lat / CELL);
  const out: Array<{ cx: number; cy: number }> = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) out.push({ cx: cx + dx, cy: cy + dy });
  return out;
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- Save ----------
export interface OWQuestState { id: string; progress: number; claimed: boolean }

// Pontos de atributo (3 por nível)
export interface OWPts { atk: number; def: number; vit: number; luk: number }
// Itens consumíveis da loja
export interface OWItems { pocao: number; elixir: number; faixa: number }
// Melhorias de equipamento (níveis 0-10)
export interface OWUpg { arma: number; armadura: number }

export interface OWChar {
  v: 1;
  name: string;
  classId: string;
  level: number;
  xp: number;
  gold: number;
  tickets: number;
  hp: number;
  pos: { lat: number; lng: number };
  mode: "gps" | "joystick";
  captured: Record<string, number>;
  stats: { kills: number; chests: number; crystals: number; portals: number; captured: number };
  questDate: string;
  quests: OWQuestState[];
  loot: Record<string, number>; // entityKey → expira em ts (coletados/derrotados)
  createdAt: number;
  // ---- progressão v2 (campos novos, retro-compatível) ----
  pts: OWPts;           // pontos distribuídos
  items: OWItems;       // inventário de consumíveis
  upg: OWUpg;           // nível da arma/armadura
  ach: string[];        // conquistas desbloqueadas
  streak: number;       // dias seguidos de bónus
  lastBonus: string | null; // último dia de bónus recebido (YYYY-MM-DD)
  realFinds: number;    // ofertas reais descobertas
}

export const SAVE_KEY = "bateu_openworld_save";
export const DEFAULT_POS = { lat: -25.9692, lng: 32.5732 }; // Maputo

// hidrata campos v2 em saves antigos (sem migração destrutiva)
export function hydrateChar(c: Partial<OWChar> & { name: string; classId: string; level: number }): OWChar {
  return {
    v: 1,
    xp: 0, gold: 100, tickets: 1, hp: maxHpFor(c.level, c.classId),
    pos: { ...DEFAULT_POS }, mode: "joystick",
    captured: {}, stats: { kills: 0, chests: 0, crystals: 0, portals: 0, captured: 0 },
    questDate: todayStr(), quests: freshQuests(), loot: {}, createdAt: Date.now(),
    pts: { atk: 0, def: 0, vit: 0, luk: 0 },
    items: { pocao: 1, elixir: 0, faixa: 1 },
    upg: { arma: 0, armadura: 0 },
    ach: [], streak: 0, lastBonus: null, realFinds: 0,
    ...c,
    pts: { atk: 0, def: 0, vit: 0, luk: 0, ...(c.pts || {}) },
    items: { pocao: 0, elixir: 0, faixa: 0, ...(c.items || {}) },
    upg: { arma: 0, armadura: 0, ...(c.upg || {}) },
    stats: { kills: 0, chests: 0, crystals: 0, portals: 0, captured: 0, ...(c.stats || {}) },
  } as OWChar;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadChar(): OWChar | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as OWChar;
    if (!c || !c.name || !c.classId) return null;
    return hydrateChar(c);
  } catch {
    return null;
  }
}

export function saveChar(c: OWChar) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(c)); } catch { /* quota */ }
}

// ---------- Missões diárias ----------
export interface OWQuestDef { id: string; name: string; desc: string; emoji: string; target: number; type: "kill" | "gold_earn" | "chest" | "capture" | "portal"; rewardGold: number; rewardXp: number; rewardTicket?: number }

export const OW_QUESTS: OWQuestDef[] = [
  { id: "cacador", name: "Caçador do Bairro", desc: "Derrota 3 criaturas", emoji: "⚔️", target: 3, type: "kill", rewardGold: 60, rewardXp: 40 },
  { id: "riqueza", name: "Colecionador de Ouro", desc: "Ganha 200 ouro explorando", emoji: "💰", target: 200, type: "gold_earn", rewardGold: 40, rewardXp: 60 },
  { id: "tesourheiro", name: "Caça-Tesouros", desc: "Abre 2 baús escondidos", emoji: "🎁", target: 2, type: "chest", rewardGold: 50, rewardXp: 30, rewardTicket: 1 },
  { id: "domador", name: "Domador", desc: "Captura 1 criatura", emoji: "🐾", target: 1, type: "capture", rewardGold: 80, rewardXp: 50 },
  { id: "explorador", name: "Explorador Urbano", desc: "Visita 2 portais da plataforma", emoji: "🌀", target: 2, type: "portal", rewardGold: 70, rewardXp: 45, rewardTicket: 1 },
];

export function freshQuests(): OWQuestState[] {
  return OW_QUESTS.map((q) => ({ id: q.id, progress: 0, claimed: false }));
}

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

// ---------- Ranks / títulos por nível ----------
export const RANKS: Array<{ min: number; title: string; emoji: string; color: string }> = [
  { min: 1, title: "Novato", emoji: "🌱", color: "#94a3b8" },
  { min: 5, title: "Explorador", emoji: "🧭", color: "#38bdf8" },
  { min: 10, title: "Caçador", emoji: "🐾", color: "#22c55e" },
  { min: 15, title: "Veterano", emoji: "🛡️", color: "#a855f7" },
  { min: 22, title: "Elite", emoji: "⭐", color: "#f59e0b" },
  { min: 30, title: "Lenda", emoji: "🔥", color: "#ef4444" },
  { min: 40, title: "Mítico", emoji: "🐉", color: "#e879f9" },
];

export function rankFor(level: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.min) r = x;
  return r;
}

// ---------- Pontos de atributo ----------
export const PTS_PER_LEVEL = 3;

export const ATTR_META: Record<keyof OWPts, { name: string; emoji: string; color: string; desc: string }> = {
  atk: { name: "Força", emoji: "⚔️", color: "#ef4444", desc: "+2.5 de ataque" },
  def: { name: "Defesa", emoji: "🛡️", color: "#38bdf8", desc: "+1.5 de defesa" },
  vit: { name: "Vitalidade", emoji: "❤️", color: "#22c55e", desc: "+10 de vida máx." },
  luk: { name: "Sorte", emoji: "🍀", color: "#fbbf24", desc: "+1% captura e loot" },
};

export function ptsFreeFor(c: OWChar): number {
  const spent = c.pts.atk + c.pts.def + c.pts.vit + c.pts.luk;
  return Math.max(0, (c.level - 1) * PTS_PER_LEVEL - spent);
}

// ---------- Loja (consumíveis + equipamento) ----------
export interface OWItemDef { id: keyof OWItems; name: string; emoji: string; price: number; desc: string; color: string }

export const OW_ITEMS: OWItemDef[] = [
  { id: "pocao", name: "Poção de Vida", emoji: "🧪", price: 45, desc: "Recupera 60 HP — usa em batalha ou no mapa.", color: "#22c55e" },
  { id: "elixir", name: "Elixir Total", emoji: "⚗️", price: 110, desc: "Restaura toda a vida instantaneamente.", color: "#38bdf8" },
  { id: "faixa", name: "Faixa Fortalecida", emoji: "🎀", price: 70, desc: "Próxima captura com chance ×1.8.", color: "#fbbf24" },
];

export const MAX_UPG = 10;
export function upgCost(nv: number): number {
  return Math.round(120 * Math.pow(1.65, nv));
}
export const UPG_META: Record<keyof OWUpg, { name: string; emoji: string; color: string; desc: string }> = {
  arma: { name: "Arma", emoji: "🗡️", color: "#ef4444", desc: "+3 de ataque por nível" },
  armadura: { name: "Armadura", emoji: "🥋", color: "#38bdf8", desc: "+2 de defesa por nível" },
};

// ---------- Habilidades de classe ----------
export interface OWSkill { name: string; emoji: string; mult: number; pierce?: boolean; crit?: boolean; leech?: number; desc: string; cd: number }

export const SKILLS: Record<string, OWSkill> = {
  guerreiro: { name: "Golpe Brutal", emoji: "💥", mult: 2.2, desc: "Dano ×2.2 — atinge em cheio.", cd: 3 },
  mago: { name: "Chama Arcana", emoji: "🔥", mult: 2.0, pierce: true, desc: "Dano ×2.0 que ignora parte da defesa.", cd: 3 },
  arqueiro: { name: "Flecha Precisa", emoji: "🎯", mult: 2.0, crit: true, desc: "Crítico garantido — dano ×2.", cd: 3 },
  assassino: { name: "Lâmina Sombria", emoji: "🌙", mult: 1.7, leech: 0.35, desc: "Dano ×1.7 e cura 35% do dano.", cd: 3 },
};

export function skillFor(classId: string): OWSkill {
  return SKILLS[classId] || SKILLS.guerreiro;
}

// ---------- Conquistas ----------
export interface OWAch { id: string; name: string; desc: string; emoji: string; gold: number; xp: number; tickets?: number; check: (c: OWChar) => boolean }

export const ACHIEVEMENTS: OWAch[] = [
  { id: "v1", name: "Primeira Vitória", desc: "Derrota a tua primeira criatura", emoji: "⚔️", gold: 30, xp: 20, check: (c) => c.stats.kills >= 1 },
  { id: "v10", name: "Caçador Dedicado", desc: "Derrota 10 criaturas", emoji: "🏹", gold: 80, xp: 60, check: (c) => c.stats.kills >= 10 },
  { id: "v25", name: "Guerreiro do Bairro", desc: "Derrota 25 criaturas", emoji: "🛡️", gold: 200, xp: 150, check: (c) => c.stats.kills >= 25 },
  { id: "cap1", name: "Domador Iniciante", desc: "Captura a tua primeira criatura", emoji: "🐾", gold: 50, xp: 40, check: (c) => c.stats.captured >= 1 },
  { id: "cap10", name: "Colecionador", desc: "Captura 10 criaturas", emoji: "📖", gold: 150, xp: 100, check: (c) => c.stats.captured >= 10 },
  { id: "lend", name: "Lenda Viva", desc: "Captura o Dragão do Índico", emoji: "🐉", gold: 300, xp: 200, tickets: 1, check: (c) => (c.captured["dragao"] || 0) >= 1 },
  { id: "bau10", name: "Caça-Tesouros", desc: "Abre 10 baús", emoji: "🎁", gold: 100, xp: 70, check: (c) => c.stats.chests >= 10 },
  { id: "por10", name: "Viajante de Portais", desc: "Visita 10 portais da plataforma", emoji: "🌀", gold: 150, xp: 90, check: (c) => c.stats.portals >= 10 },
  { id: "nv5", name: "Explorador de Rank", desc: "Atinge o nível 5", emoji: "🧭", gold: 100, xp: 0, check: (c) => c.level >= 5 },
  { id: "nv10", name: "Caçador de Rank", desc: "Atinge o nível 10", emoji: "🐾", gold: 250, xp: 0, tickets: 1, check: (c) => c.level >= 10 },
  { id: "nv20", name: "Elite do Mundo Aberto", desc: "Atinge o nível 20", emoji: "⭐", gold: 600, xp: 0, tickets: 2, check: (c) => c.level >= 20 },
  { id: "rico", name: "Milionário do Bairro", desc: "Acumula 1000 de ouro", emoji: "💰", gold: 0, xp: 80, tickets: 1, check: (c) => c.gold >= 1000 },
  { id: "real5", name: "Olho da Plataforma", desc: "Descobre 5 ofertas reais no mapa", emoji: "📍", gold: 120, xp: 60, check: (c) => c.realFinds >= 5 },
  { id: "streak3", name: "Hábito de Explorador", desc: "3 dias seguidos a jogar", emoji: "🔥", gold: 150, xp: 80, check: (c) => c.streak >= 3 },
  { id: "streak7", name: "Semana Completa", desc: "7 dias seguidos a jogar", emoji: "🗓️", gold: 400, xp: 200, tickets: 2, check: (c) => c.streak >= 7 },
];

// conquistas novas num personagem (não repetem)
export function newAchievements(c: OWChar): OWAch[] {
  const has = new Set(c.ach);
  return ACHIEVEMENTS.filter((a) => !has.has(a.id) && a.check(c));
}

// ---------- Bónus diário (streak) ----------
const STREAK_GOLD = [50, 80, 120, 160, 220, 280, 400];
export function streakReward(streak: number): { gold: number; xp: number; tickets: number } {
  const i = (Math.max(1, streak) - 1) % 7;
  const gold = STREAK_GOLD[i];
  const tickets = i === 4 ? 1 : i === 6 ? 2 : 0;
  return { gold, xp: 15 + i * 5, tickets };
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------- Escala de dificuldade (o mundo cresce contigo) ----------
export function scaleFor(level: number): { hpMul: number; atkMul: number; goldMul: number; xpMul: number } {
  return {
    hpMul: 1 + (level - 1) * 0.14,
    atkMul: 1 + (level - 1) * 0.11,
    goldMul: 1 + (level - 1) * 0.09,
    xpMul: 1 + (level - 1) * 0.1,
  };
}

export function maxHpFor(level: number, classId: string, vitPts = 0): number {
  return 80 + level * 12 + classById(classId).hpBonus + vitPts * 10;
}

export function atkFor(level: number, classId: string, atkPts = 0, armaNv = 0): number {
  const c = classById(classId);
  return Math.round(c.atk + level * 2.2 + atkPts * 2.5 + armaNv * 3);
}

export function defFor(level: number, classId: string, defPts = 0, armaduraNv = 0): number {
  const c = classById(classId);
  return Math.round(c.def + level * 1.1 + defPts * 1.5 + armaduraNv * 2);
}
