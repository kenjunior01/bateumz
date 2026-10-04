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
}

export const SAVE_KEY = "bateu_openworld_save";
export const DEFAULT_POS = { lat: -25.9692, lng: 32.5732 }; // Maputo

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadChar(): OWChar | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as OWChar;
    if (!c || c.v !== 1 || !c.name) return null;
    return c;
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

export function maxHpFor(level: number, classId: string): number {
  return 80 + level * 12 + classById(classId).hpBonus;
}

export function atkFor(level: number, classId: string): number {
  const c = classById(classId);
  return Math.round(c.atk + level * 2.2);
}
