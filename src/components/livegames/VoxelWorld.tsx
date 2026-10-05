import { useState, useEffect, useRef, useCallback, type PointerEvent as RPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, X, Coins, Heart, Ticket, Volume2, VolumeX,
  Hammer, HelpCircle, Backpack, Sun, Moon, Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";

// ============================================================
// MUNDO VOXEL BATEU — mundo aberto estilo Minecraft (canvas 2D)
// Integrado com a plataforma: baús -> bilhetes de sorteio,
// portais -> jogos / mercado, recursos -> economia do RPG.
// ============================================================

interface Props {
  playerName: string;
  classColor: string;
  level: number;
  atk: number;
  onReward: (r: { gold?: number; xp?: number; kills?: number; msg?: string }) => void;
  notify: (msg: string) => void;
  onExit: () => void;
}

interface Mob { kind: "zombie" | "pig"; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; onGround: boolean; t: number; burn: number; dead?: boolean }
interface Part { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; grav: number; }
interface FloatTxt { x: number; y: number; text: string; life: number; color: string; }

// ---- Dados ao vivo da plataforma (sincronização total) ----
interface LiveRaffle { id: string; title: string; slug: string | null; prize_title: string | null; ticket_price: number | null; image_url: string | null; end_date: string | null; total_tickets: number | null; sold_tickets: number | null; raffle_type: string | null; points_cost: number | null; }
interface LiveContest { id: string; title: string; image_url: string | null; status: string; }
interface LiveTournament { id: string; name: string; prize_description: string | null; prize_value: number | null; currency: string | null; end_date: string; }
function fmtCountdown(date: string | null): string | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "terminou";
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function fmtMzn(v: number | null): string { return v == null ? "—" : `${v} MT`; }

// ---- Blocos ----
const W = 180, H = 80;
const B = { AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, LOG: 6, LEAF: 7, COAL: 8, IRON: 9, GOLD: 10, DIAMOND: 11, CHEST: 12, PORTAL_G: 13, PORTAL_M: 14, TORCH: 15, BEDROCK: 16, PLANK: 17, BILLBOARD: 18, STALL: 19, COLISEUM: 20, QUESTBOARD: 21 } as const;

const SOLID = new Set<number>([B.GRASS, B.DIRT, B.STONE, B.SAND, B.LOG, B.LEAF, B.COAL, B.IRON, B.GOLD, B.DIAMOND, B.CHEST, B.PORTAL_G, B.PORTAL_M, B.BEDROCK, B.PLANK, B.BILLBOARD, B.STALL, B.COLISEUM, B.QUESTBOARD]);

const HARDNESS: Record<number, number> = {
  [B.GRASS]: 0.5, [B.DIRT]: 0.5, [B.SAND]: 0.4, [B.STONE]: 1.6, [B.LOG]: 0.9,
  [B.LEAF]: 0.15, [B.COAL]: 2.0, [B.IRON]: 2.4, [B.GOLD]: 2.8, [B.DIAMOND]: 3.2,
  [B.TORCH]: 0.1, [B.PLANK]: 0.7,
};

const DROPS: Record<number, string> = {
  [B.GRASS]: "terra", [B.DIRT]: "terra", [B.SAND]: "areia", [B.STONE]: "pedra",
  [B.LOG]: "madeira", [B.LEAF]: "folhas", [B.COAL]: "carvao", [B.IRON]: "ferro",
  [B.GOLD]: "ouro", [B.DIAMOND]: "diamante", [B.TORCH]: "tocha", [B.PLANK]: "tabuas",
};

const RES_META: { id: string; label: string; color: string }[] = [
  { id: "terra", label: "Terra", color: "#8a5a2b" },
  { id: "areia", label: "Areia", color: "#e7d8a8" },
  { id: "madeira", label: "Madeira", color: "#6b4423" },
  { id: "folhas", label: "Folhas", color: "#2f8f2f" },
  { id: "pedra", label: "Pedra", color: "#9a9a9a" },
  { id: "carvao", label: "Carvão", color: "#333" },
  { id: "ferro", label: "Ferro", color: "#d8a878" },
  { id: "ouro", label: "Ouro", color: "#f5c542" },
  { id: "diamante", label: "Diamante", color: "#59e3e3" },
  { id: "tocha", label: "Tocha", color: "#ffb347" },
  { id: "tabuas", label: "Tábuas", color: "#b4832f" },
];
const RES_IDS = RES_META.map(r => r.id);
const PLACEABLE = new Set(["terra", "areia", "pedra", "madeira", "tocha", "tabuas"]);
const PLACE_BLOCK: Record<string, number> = { terra: B.DIRT, areia: B.SAND, pedra: B.STONE, madeira: B.LOG, tocha: B.TORCH, tabuas: B.PLANK };
const PRICES: Record<string, number> = { terra: 2, areia: 4, folhas: 2, madeira: 8, tabuas: 4, pedra: 12, carvao: 18, ferro: 45, ouro: 90, diamante: 220 };

const PICKS = [
  { name: "Mão", mult: 1 },
  { name: "Picareta de Madeira", mult: 1.7 },
  { name: "Picareta de Pedra", mult: 2.4 },
  { name: "Picareta de Ferro", mult: 3.3 },
  { name: "Picareta de Diamante", mult: 4.6 },
];

interface Craft { id: string; name: string; desc: string; cost: Record<string, number>; out?: Record<string, number>; pick?: number; heal?: number; sword?: boolean; }
const CRAFTS: Craft[] = [
  { id: "planks", name: "Tábuas x2", desc: "Material de construção", cost: { madeira: 1 }, out: { tabuas: 2 } },
  { id: "torches", name: "Tochas x4", desc: "Iluminam a noite", cost: { madeira: 1, carvao: 1 }, out: { tocha: 4 } },
  { id: "pick1", name: "Picareta de Madeira", desc: "Minera 70% mais rápido", cost: { madeira: 3 }, pick: 1 },
  { id: "pick2", name: "Picareta de Pedra", desc: "Minera 2.4x mais rápido", cost: { pedra: 3, madeira: 2 }, pick: 2 },
  { id: "pick3", name: "Picareta de Ferro", desc: "Minera 3.3x mais rápido", cost: { ferro: 3, madeira: 2 }, pick: 3 },
  { id: "pick4", name: "Picareta de Diamante", desc: "Minera 4.6x mais rápido", cost: { diamante: 3, madeira: 2 }, pick: 4 },
  { id: "potion", name: "Poção de Vida", desc: "Cura 50 HP imediatamente", cost: { folhas: 3, carvao: 1 }, heal: 50 },
  { id: "sword", name: "Espada de Ferro", desc: "Dano x1.8 no mundo + 50 XP no RPG", cost: { ferro: 5, madeira: 1 }, sword: true },
];

// ---- Cores médias (partículas + minimapa) ----
const AVG: Record<number, string> = {
  [B.GRASS]: "#57a83f", [B.DIRT]: "#8a5a2b", [B.STONE]: "#8f8f8f", [B.SAND]: "#e7d8a8",
  [B.WATER]: "#3b82f6", [B.LOG]: "#6b4423", [B.LEAF]: "#2f8f2f", [B.COAL]: "#555",
  [B.IRON]: "#c89878", [B.GOLD]: "#e8b83a", [B.DIAMOND]: "#59e3e3", [B.CHEST]: "#c47f1a",
  [B.PORTAL_G]: "#8b5cf6", [B.PORTAL_M]: "#ec4899", [B.TORCH]: "#ffb347", [B.BEDROCK]: "#3a3a3a", [B.PLANK]: "#b4832f",
  [B.BILLBOARD]: "#b4703a", [B.STALL]: "#e2453f", [B.COLISEUM]: "#d9c48e", [B.QUESTBOARD]: "#6e4f28",
};

// ---- Texturas 8x8 procedurais ----
function mkTex(seed: number, draw: (px: (x: number, y: number, c: string) => void, rnd: () => number) => void): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = 8; c.height = 8;
  const g = c.getContext("2d")!;
  let s = seed || 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const px = (x: number, y: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  draw(px, rnd);
  return c;
}

function speckle(px: (x: number, y: number, c: string) => void, rnd: () => number, base: string, dark: string, light: string, n = 10) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(x, y, base);
  for (let i = 0; i < n; i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), dark);
  for (let i = 0; i < Math.floor(n / 2); i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), light);
}

function oreTex(seed: number, col: string, colDark: string): HTMLCanvasElement {
  return mkTex(seed, (px, rnd) => {
    speckle(px, rnd, "#9a9a9a", "#7d7d7d", "#b5b5b5", 8);
    const spots = [[1, 2], [4, 1], [5, 4], [2, 5], [6, 6]];
    for (const [ox, oy] of spots) { px(ox, oy, col); px(ox + 1 > 7 ? ox : ox + 1, oy, colDark); }
  });
}

function buildTextures(): Record<number, HTMLCanvasElement> {
  const t: Record<number, HTMLCanvasElement> = {};
  t[B.GRASS] = mkTex(11, (px, rnd) => {
    speckle(px, rnd, "#8a5a2b", "#754a20", "#9c6a35", 8);
    for (let x = 0; x < 8; x++) { px(x, 0, "#6fbf4a"); px(x, 1, "#5ea83c"); if (rnd() > 0.6) px(x, 2, "#5ea83c"); }
  });
  t[B.DIRT] = mkTex(12, (px, rnd) => speckle(px, rnd, "#8a5a2b", "#754a20", "#9c6a35", 10));
  t[B.STONE] = mkTex(13, (px, rnd) => speckle(px, rnd, "#9a9a9a", "#7d7d7d", "#b5b5b5", 10));
  t[B.SAND] = mkTex(14, (px, rnd) => speckle(px, rnd, "#e7d8a8", "#d6c48e", "#f2e6bd", 8));
  t[B.LOG] = mkTex(15, (px, rnd) => {
    speckle(px, rnd, "#6b4423", "#5a3818", "#7d5230", 6);
    for (let y = 0; y < 8; y++) { px(2, y, "#543314"); px(6, y, "#543314"); }
  });
  t[B.LEAF] = mkTex(16, (px, rnd) => {
    speckle(px, rnd, "#2f8f2f", "#267026", "#3fae3f", 12);
    for (let i = 0; i < 3; i++) px(Math.floor(rnd() * 8), Math.floor(rnd() * 8), "#1d5c1d");
  });
  t[B.COAL] = oreTex(17, "#2f2f2f", "#1a1a1a");
  t[B.IRON] = oreTex(18, "#e0b090", "#c89878");
  t[B.GOLD] = oreTex(19, "#f5c542", "#d9a520");
  t[B.DIAMOND] = oreTex(20, "#6ce8e8", "#3cc4c4");
  t[B.CHEST] = mkTex(21, (px, rnd) => {
    speckle(px, rnd, "#92400e", "#7a3508", "#a85419", 6);
    for (let x = 0; x < 8; x++) px(x, 3, "#5f2a05");
    px(3, 2, "#f5c542"); px(4, 2, "#f5c542"); px(3, 3, "#d9a520"); px(4, 3, "#d9a520"); px(3, 4, "#f5c542"); px(4, 4, "#d9a520");
  });
  t[B.PLANK] = mkTex(22, (px, rnd) => {
    speckle(px, rnd, "#b4832f", "#9a6f24", "#c89542", 6);
    for (let x = 0; x < 8; x++) { px(x, 2, "#8a611e"); px(x, 5, "#8a611e"); }
  });
  t[B.BEDROCK] = mkTex(23, (px, rnd) => speckle(px, rnd, "#3a3a3a", "#2a2a2a", "#4a4a4a", 12));
  t[B.BILLBOARD] = mkTex(24, (px, rnd) => {
    // moldura de madeira + papel branco com linhas vermelhas (mural de sorteios)
    speckle(px, rnd, "#8a5a2b", "#754a20", "#9c6a35", 5);
    for (let x = 1; x < 7; x++) for (let y = 1; y < 7; y++) px(x, y, "#f5f0e0");
    px(2, 2, "#e2453f"); px(3, 2, "#e2453f"); px(4, 2, "#e2453f"); px(5, 2, "#e2453f");
    px(2, 4, "#c9b896"); px(3, 4, "#c9b896"); px(4, 4, "#c9b896"); px(5, 4, "#c9b896");
  });
  t[B.STALL] = mkTex(25, (px, rnd) => {
    // toldo listrado vermelho/branco da feira
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) px(x, y, x % 2 === 0 ? "#e2453f" : "#f7f3ea");
    for (let x = 0; x < 8; x++) px(x, 7, "#6b4423");
  });
  t[B.COLISEUM] = mkTex(26, (px, rnd) => {
    // arenito com arco do coliseu
    speckle(px, rnd, "#d9c48e", "#c4ad72", "#e8d8a4", 8);
    for (let y = 2; y < 8; y++) { px(3, y, "#7a6338"); px(4, y, "#7a6338"); }
    px(2, 5, "#7a6338"); px(5, 5, "#7a6338"); px(2, 6, "#7a6338"); px(5, 6, "#7a6338");
  });
  t[B.QUESTBOARD] = mkTex(27, (px, rnd) => {
    // madeira escura com "!" dourado (quadro de missões)
    speckle(px, rnd, "#5a3f1e", "#4a3316", "#6e4f28", 6);
    px(3, 1, "#fbbf24"); px(4, 1, "#fbbf24"); px(3, 2, "#fbbf24"); px(4, 2, "#fbbf24"); px(3, 3, "#fbbf24"); px(4, 3, "#fbbf24"); px(3, 5, "#fbbf24"); px(4, 5, "#fbbf24");
  });
  return t;
}

// ---- Geração do mundo ----
const SEED = 1337;
function hashN(x: number, seed: number) { const s = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x: number, seed: number) { const i = Math.floor(x), f = x - i; const a = hashN(i, seed), b = hashN(i + 1, seed); const u = f * f * (3 - 2 * f); return a + (b - a) * u; }

function surfaceHeight(x: number): number {
  const h = 46 + Math.sin(x * 0.06) * 6 + Math.sin(x * 0.15 + 2) * 3 + (vnoise(x * 0.08, SEED) - 0.5) * 8;
  return Math.max(24, Math.min(64, Math.round(h)));
}

interface WorldMeta { chestX: number[]; portalGX: number; portalMX: number; merchantX: number; spawnX: number; billboardX: number; feiraX: number; arenaX: number; questX: number; }

function genWorld(): { data: Uint8Array; meta: WorldMeta } {
  const d = new Uint8Array(W * H);
  const waterLevel = 44;
  for (let x = 0; x < W; x++) {
    const sh = surfaceHeight(x);
    for (let y = 0; y < H; y++) {
      const i = y * W + x;
      if (y >= 74) { d[i] = B.BEDROCK; continue; }
      if (y < sh) { d[i] = y >= waterLevel && y < waterLevel + 2 && sh < waterLevel + 2 ? B.SAND : B.AIR; continue; }
      if (y === sh) d[i] = sh <= waterLevel + 1 ? B.SAND : B.GRASS;
      else if (y < sh + 5) d[i] = B.DIRT;
      else {
        d[i] = B.STONE;
        const r = hashN(x * 31 + y * 17, SEED + 5);
        if (y > 62 && r < 0.012) d[i] = B.DIAMOND;
        else if (y > 56 && r < 0.03) d[i] = B.GOLD;
        else if (y > 48 && r < 0.07) d[i] = B.IRON;
        else if (r < 0.12) d[i] = B.COAL;
      }
    }
    // água em depressões
    if (sh > waterLevel) for (let y = waterLevel; y < sh; y++) { if (d[y * W + x] === B.AIR) d[y * W + x] = B.WATER; }
  }
  // árvores
  for (let x = 3; x < W - 3; x++) {
    const sh = surfaceHeight(x);
    if (d[sh * W + x] !== B.GRASS) continue;
    if (hashN(x, SEED + 9) < 0.085 && d[(sh - 1) * W + x] === B.AIR) {
      const th = 4 + Math.floor(hashN(x, SEED + 11) * 2);
      for (let k = 1; k <= th; k++) d[(sh - k) * W + x] = B.LOG;
      for (let ly = sh - th - 2; ly <= sh - th + 1; ly++) {
        const half = ly >= sh - th ? 1 : 2;
        for (let lx = x - half; lx <= x + half; lx++) {
          if (lx < 0 || lx >= W || ly < 0) continue;
          const ii = ly * W + lx;
          if (d[ii] === B.AIR) d[ii] = B.LEAF;
        }
      }
      x += 2;
    }
  }
  const meta: WorldMeta = { chestX: [Math.round(W / 2) - 5, Math.round(W / 2) + 5, 26, 92, 152], portalGX: Math.round(W / 2) - 9, portalMX: Math.round(W / 2) + 9, merchantX: Math.round(W / 2) + 2, spawnX: Math.round(W / 2), billboardX: Math.round(W / 2) - 16, feiraX: Math.round(W / 2) + 16, arenaX: 40, questX: 140 };
  // estruturas especiais sobre a superfície
  const put = (x: number, block: number) => {
    const sx = Math.max(1, Math.min(W - 2, x));
    const sh = surfaceHeight(sx);
    d[(sh - 1) * W + sx] = block;
    // plataforma
    if (d[sh * W + sx] === B.AIR || d[sh * W + sx] === B.WATER) d[sh * W + sx] = B.STONE;
  };
  put(meta.spawnX, B.AIR); // limpa spawn
  d[(surfaceHeight(meta.spawnX) - 1) * W + meta.spawnX] = B.AIR;
  put(meta.portalGX, B.PORTAL_G);
  put(meta.portalMX, B.PORTAL_M);
  meta.chestX.forEach(cx => put(cx, B.CHEST));
  put(meta.billboardX, B.BILLBOARD);
  put(meta.feiraX, B.STALL);
  put(meta.arenaX, B.COLISEUM);
  put(meta.questX, B.QUESTBOARD);
  return { data: d, meta };
}

// ---- Persistência ----
interface VSave {
  inv: Record<string, number>; edits: Record<string, number>; tickets: number;
  pick: number; sword: boolean; hp: number; day: number; tod: number;
  x: number; y: number; chests: Record<string, number>; kills: number; mined: number; sessionGold: number; sessionXp: number;
  dayKills: number; dayMined: number; pquestDate: string; pqChest: boolean; pqKill: boolean; pqMine: boolean; pqMarket: boolean; pqJogos: boolean;
}
const SAVE_KEY = "bateu_voxel_save_v1";

function defaultSave(): VSave {
  const inv: Record<string, number> = {}; RES_IDS.forEach(r => { inv[r] = 0; });
  return { inv, edits: {}, tickets: 0, pick: 0, sword: false, hp: 100, day: 1, tod: 0.32, x: 0, y: 0, chests: {}, kills: 0, mined: 0, sessionGold: 0, sessionXp: 0, dayKills: 0, dayMined: 0, pquestDate: "", pqChest: false, pqKill: false, pqMine: false, pqMarket: false, pqJogos: false };
}

function loadSave(): VSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw) as VSave;
    const d = defaultSave();
    return { ...d, ...s, inv: { ...d.inv, ...(s.inv || {}) } };
  } catch { return defaultSave(); }
}

// ---- Áudio sintetizado (sem assets) ----
function makeSfx(mutedRef: { current: boolean }) {
  let ctx: AudioContext | null = null;
  const ensure = () => { if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { ctx = null; } } return ctx; };
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) => {
    if (mutedRef.current) return;
    const c = ensure(); if (!c) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch { /* ignore */ }
  };
  return {
    mine: () => tone(160 + Math.random() * 40, 0.06, "square", 0.05),
    breakB: () => tone(90, 0.14, "square", 0.09, -30),
    collect: () => { tone(660, 0.07, "sine", 0.08); setTimeout(() => tone(880, 0.09, "sine", 0.08), 60); },
    place: () => tone(220, 0.08, "square", 0.06),
    hurt: () => tone(140, 0.18, "sawtooth", 0.1, -60),
    kill: () => { tone(440, 0.08, "square", 0.07); setTimeout(() => tone(330, 0.12, "square", 0.07), 70); },
    chest: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, "sine", 0.09), i * 110)); },
    craft: () => { tone(392, 0.1, "sine", 0.08); setTimeout(() => tone(523, 0.14, "sine", 0.08), 90); },
  };
}

// ============================================================
// COMPONENTE
// ============================================================

const NIGHT_A = 0.58, NIGHT_B = 0.94;
const isNightT = (tod: number) => tod > NIGHT_A && tod < NIGHT_B;
const nightAmount = (tod: number) => {
  if (tod <= 0.5) return 0;
  if (tod < NIGHT_A) return ((tod - 0.5) / (NIGHT_A - 0.5)) * 0.62;
  if (tod < NIGHT_B) return 0.62;
  return Math.max(0, 0.62 * (1 - (tod - NIGHT_B) / (1 - NIGHT_B)));
};

const SKY: [number, string, string][] = [
  [0.0, "#7ec8f5", "#cfeeff"], [0.45, "#5aa9f0", "#bfe3ff"],
  [0.55, "#f59e4b", "#ffd9a0"], [0.62, "#12163f", "#2a2450"],
  [0.9, "#10142f", "#241f45"], [0.97, "#e88a4a", "#ffc48a"], [1.0, "#7ec8f5", "#cfeeff"],
];
function hexLerp(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}
function skyColors(tod: number): [string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    if (tod >= SKY[i][0] && tod <= SKY[i + 1][0]) {
      const t = (tod - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0] || 1);
      return [hexLerp(SKY[i][1], SKY[i + 1][1], t), hexLerp(SKY[i][2], SKY[i + 1][2], t)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

export default function VoxelWorld({ playerName, classColor, level, atk, onReward, notify, onExit }: Props) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<HTMLCanvasElement | null>(null);
  const darkRef = useRef<HTMLCanvasElement | null>(null);

  // ---- refs do motor ----
  const worldRef = useRef<Uint8Array | null>(null);
  const metaRef = useRef<WorldMeta | null>(null);
  const texRef = useRef<Record<number, HTMLCanvasElement>>({});
  const saveRef = useRef<VSave>(defaultSave());

  const playerRef = useRef({ x: 90.5, y: 40, vx: 0, vy: 0, onGround: false, face: 1, anim: 0, iframes: 0, swing: 0, inWater: false });
  const mobsRef = useRef<Mob[]>([]);
  const partsRef = useRef<Part[]>([]);
  const floatsRef = useRef<FloatTxt[]>([]);
  const camRef = useRef({ x: 0, y: 0 });
  const tileRef = useRef(28);
  const viewRef = useRef({ w: 360, h: 500 });
  const keysRef = useRef({ l: false, r: false, jump: false });
  const joyRef = useRef({ x: 0, y: 0, active: false });
  const actRef = useRef({ mine: false, pointer: false });
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const mineRef = useRef<{ x: number; y: number; prog: number } | null>(null);
  const attackCdRef = useRef(0);
  const todRef = useRef(0.32);
  const dayRef = useRef(1);
  const pendRef = useRef({ gold: 0, xp: 0, kills: 0 });
  const sessRef = useRef({ gold: 0, xp: 0 });
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const hudTRef = useRef(0);
  const saveTRef = useRef(0);
  const mutedRef = useRef(false);
  const sfxRef = useRef(makeSfx(mutedRef));
  const propsRef = useRef({ playerName, classColor, level, atk, onReward, notify, onExit, navigate });
  propsRef.current = { playerName, classColor, level, atk, onReward, notify, onExit, navigate };

  // ---- estado UI ----
  const [inv, setInv] = useState<Record<string, number>>(() => saveRef.current.inv);
  const [hp, setHp] = useState(100);
  const maxHp = 100 + level * 12;
  const [tickets, setTickets] = useState(0);
  const [selSlot, setSelSlot] = useState(0);
  const [modal, setModal] = useState<null | "oficina" | "mercado" | "ajuda" | "sorteios" | "feira" | "arena" | "questboard">(null);
  const [muted, setMuted] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptKind, setPromptKind] = useState<null | "chest" | "portalG" | "portalM" | "merchant" | "billboard" | "stall" | "coliseum" | "questboard">(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; color: string }[]>([]);
  const [pickTier, setPickTier] = useState(0);
  const [hasSword, setHasSword] = useState(false);
  const [clock, setClock] = useState({ h: 8, day: 1 });
  const [sess, setSess] = useState({ gold: 0, xp: 0 });
  const toastId = useRef(0);
  const promptRef = useRef<{ kind: typeof promptKind; text: string | null }>({ kind: null, text: null });

  const maxHpRef = useRef(maxHp); maxHpRef.current = maxHp;

  const toast = useCallback((text: string, color = "#fbbf24") => {
    const id = ++toastId.current;
    setToasts(prev => [...prev.slice(-3), { id, text, color }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2600);
  }, []);

  const addPend = useCallback((gold = 0, xp = 0, kills = 0) => {
    pendRef.current.gold += gold; pendRef.current.xp += xp; pendRef.current.kills += kills;
    if (gold) { sessRef.current.gold += gold; }
    if (xp) { sessRef.current.xp += xp; }
  }, []);

  // ---- dados vivos da plataforma (sorteios, feira, torneios) ----
  const [liveRaffles, setLiveRaffles] = useState<LiveRaffle[] | null>(null);
  const [liveFeira, setLiveFeira] = useState<{ contests: LiveContest[]; wheels: number; mills: number } | null>(null);
  const [liveTours, setLiveTours] = useState<LiveTournament[] | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const xpOnceRef = useRef<Set<string>>(new Set());

  const grantVisitXp = useCallback((key: string, label: string) => {
    if (xpOnceRef.current.has(key)) return;
    xpOnceRef.current.add(key);
    addPend(0, 8); toast(`${label}: +8 XP por visitar!`, "#a78bfa");
  }, [addPend, toast]);

  // missões diárias ligadas à plataforma (reset por dia real)
  const ensurePqDay = useCallback(() => {
    const s = saveRef.current;
    const today = new Date().toDateString();
    if (s.pquestDate !== today) {
      s.pquestDate = today; s.dayKills = 0; s.dayMined = 0;
      s.pqChest = false; s.pqKill = false; s.pqMine = false; s.pqMarket = false; s.pqJogos = false;
    }
    return s;
  }, []);

  // missão de plataforma: recompensa + navegação
  const claimPq = useCallback((key: "pqMarket" | "pqJogos", gold: number, xp: number, route: string, label: string) => {
    const s = ensurePqDay();
    if (s[key]) return;
    s[key] = true;
    addPend(gold, xp);
    toast(`📜 Missão: ${label} +${gold} ouro`, "#4ade80");
    setModal(null);
    setTimeout(() => propsRef.current.navigate(route), 300);
  }, [addPend, toast, ensurePqDay]);

  const fetchLive = useCallback(async (kind: "sorteios" | "feira" | "arena") => {
    try {
      if (kind === "sorteios") {
        const { data, error } = await (supabase as any).from("raffles")
          .select("id,title,slug,prize_title,ticket_price,image_url,end_date,total_tickets,sold_tickets,raffle_type,points_cost")
          .eq("status", "active").order("end_date", { ascending: true }).limit(6);
        if (error) throw error;
        setLiveRaffles((data || []) as LiveRaffle[]);
      } else if (kind === "feira") {
        const [c, w, m] = await Promise.all([
          (supabase as any).from("contests").select("id,title,image_url,status").in("status", ["active", "voting"]).order("created_at", { ascending: false }).limit(4),
          (supabase as any).from("spin_wheel_games").select("id", { count: "exact", head: true }).eq("is_published", true),
          (supabase as any).from("millionaire_games").select("id", { count: "exact", head: true }).eq("is_published", true),
        ]);
        setLiveFeira({ contests: (c.data || []) as LiveContest[], wheels: w.count ?? 0, mills: m.count ?? 0 });
      } else {
        const { data, error } = await (supabase as any).from("tournaments")
          .select("id,name,prize_description,prize_value,currency,end_date")
          .eq("status", "active").order("end_date", { ascending: true }).limit(5);
        if (error) throw error;
        setLiveTours((data || []) as LiveTournament[]);
      }
      setLiveErr(null);
    } catch { setLiveErr("Sem ligação à plataforma — verifica a internet"); }
  }, []);

  // buscar dados quando um painel abre + XP de primeira visita
  useEffect(() => {
    if (modal === "sorteios") { fetchLive("sorteios"); grantVisitXp("sorteios", "🎁 Mural de Sorteios"); }
    else if (modal === "feira") { fetchLive("feira"); grantVisitXp("feira", "🛒 Feira de Vendas"); }
    else if (modal === "arena") { fetchLive("arena"); grantVisitXp("arena", "🏆 Arena de Torneios"); }
    else if (modal === "questboard") { grantVisitXp("questboard", "📜 Quadro de Missões"); }
  }, [modal, fetchLive, grantVisitXp]);

  // ---- helpers de mundo ----
  const getBlock = useCallback((x: number, y: number): number => {
    const w = worldRef.current; if (!w) return B.BEDROCK;
    if (y < 0) return B.AIR; if (y >= H) return B.BEDROCK;
    if (x < 0 || x >= W) return B.BEDROCK;
    return w[y * W + x];
  }, []);
  const setBlock = useCallback((x: number, y: number, b: number) => {
    const w = worldRef.current; if (!w || x < 0 || x >= W || y < 0 || y >= H) return;
    w[y * W + x] = b;
    saveRef.current.edits[`${x},${y}`] = b;
  }, []);
  const solidAt = useCallback((x: number, y: number) => SOLID.has(getBlock(Math.floor(x), Math.floor(y))), [getBlock]);

  const burst = useCallback((wx: number, wy: number, color: string, n = 8, grav = 26) => {
    for (let i = 0; i < n; i++) {
      partsRef.current.push({
        x: wx, y: wy, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color, size: 2 + Math.random() * 3, grav,
      });
    }
  }, []);
  const floatTxt = useCallback((wx: number, wy: number, text: string, color: string) => {
    floatsRef.current.push({ x: wx, y: wy, text, life: 1.1, color });
  }, []);

  // ---- interação (baús, portais, mercador) ----
  const openChest = useCallback((cx: number) => {
    const meta = metaRef.current; if (!meta) return;
    const id = `c${cx}`;
    const last = saveRef.current.chests[id] || 0;
    const now = Date.now();
    if (now - last < 86400000) {
      toast("Baú vazio — volta amanhã!", "#94a3b8"); sfxRef.current.place(); return;
    }
    saveRef.current.chests[id] = now;
    const lvl = propsRef.current.level;
    const tks = 1 + Math.floor(Math.random() * 3);
    const gold = 50 + lvl * 15 + Math.floor(Math.random() * 40);
    setTickets(t => t + tks); saveRef.current.tickets += tks;
    addPend(gold, 15 + lvl * 3);
    const qp = ensurePqDay();
    if (!qp.pqChest) { qp.pqChest = true; addPend(25, 0); toast("📜 Missão: baú aberto! +25 ouro", "#4ade80"); }
    floatTxt(cx + 0.5, surfaceHeight(cx) - 3, `+${tks} bilhetes`, "#fbbf24");
    floatTxt(cx + 0.5, surfaceHeight(cx) - 4, `+${gold} ouro`, "#fde047");
    if (Math.random() < 0.25) { saveRef.current.inv.diamante += 1; setInv(i => ({ ...i, diamante: (i.diamante || 0) + 1 })); floatTxt(cx + 0.5, surfaceHeight(cx) - 5, "+1 Diamante!", "#59e3e3"); }
    burst(cx + 0.5, surfaceHeight(cx) - 1.5, "#fbbf24", 16, 14);
    sfxRef.current.chest();
    confetti({ particleCount: 60, spread: 55, origin: { y: 0.4 }, colors: ["#fbbf24", "#f59e0b", "#59e3e3"] });
    toast(`${tks} bilhete${tks > 1 ? "s" : ""} de sorteio + ${gold} ouro!`, "#fbbf24");
    propsRef.current.notify(`🎁 Baú de Sorteio: +${tks} bilhetes!`);
  }, [addPend, toast, ensurePqDay]);

  const doAction = useCallback(() => {
    const p = playerRef.current; const meta = metaRef.current; if (!meta) return;
    // coisas próximas (prioridade)
    const near = (wx: number, range: number) => Math.abs(p.x + 0.3 - (wx + 0.5)) < range;
    if (near(meta.merchantX, 2.2)) { setModal("mercado"); sfxRef.current.place(); return; }
    if (near(meta.billboardX, 2.0)) { setModal("sorteios"); sfxRef.current.place(); return; }
    if (near(meta.feiraX, 2.0)) { setModal("feira"); sfxRef.current.place(); return; }
    if (near(meta.arenaX, 2.2)) { setModal("arena"); sfxRef.current.place(); return; }
    if (near(meta.questX, 2.0)) { setModal("questboard"); sfxRef.current.place(); return; }
    for (const cx of meta.chestX) {
      const sh = surfaceHeight(cx);
      if (near(cx, 1.9) && Math.abs((p.y - 0.9) - (sh - 1.5)) < 4) { openChest(cx); return; }
    }
    if (near(meta.portalGX, 2.0)) {
      addPend(0, 10); toast("Portal Arcade: +10 XP — vai jogar!", "#a78bfa");
      propsRef.current.notify("🕹 Portal do Arcade aberto!");
      setTimeout(() => propsRef.current.navigate("/jogos"), 350); return;
    }
    if (near(meta.portalMX, 2.0)) {
      addPend(0, 10); toast("Portal do Mercado: +10 XP", "#f472b6");
      propsRef.current.notify("🛒 Portal do Mercado aberto!");
      setTimeout(() => propsRef.current.navigate("/marketplace"), 350); return;
    }
    toast("Nada para interagir aqui", "#94a3b8");
  }, [openChest, toast, addPend]);

  const doBuild = useCallback(() => {
    const s = RES_IDS[selSlotRef.current] ?? "terra";
    if (!PLACEABLE.has(s)) { toast(`${RES_META.find(r => r.id === s)?.label} não é construível`, "#94a3b8"); return; }
    if ((saveRef.current.inv[s] || 0) <= 0) { toast(`Sem ${RES_META.find(r => r.id === s)?.label}`, "#94a3b8"); return; }
    const p = playerRef.current;
    let bx: number, by: number;
    if (aimRef.current) { bx = aimRef.current.x; by = aimRef.current.y; }
    else { bx = Math.floor(p.x + 0.3 + p.face * 1.1); by = Math.floor(p.y - 0.5); }
    if (getBlock(bx, by) !== B.AIR && getBlock(bx, by) !== B.WATER) return;
    // não construir dentro do jogador/mobs
    const overlaps = (ex: number, ey: number, ew: number, eh: number) =>
      bx + 1 > ex && bx < ex + ew && by + 1 > ey - eh && by < ey;
    if (overlaps(p.x - 0.3, p.y, 0.6, 1.75)) { toast("Bloqueado!", "#f87171"); return; }
    for (const m of mobsRef.current) if (overlaps(m.x - 0.3, m.y, 0.6, m.kind === "pig" ? 0.9 : 1.7)) return;
    // precisa apoio adjacente
    const adj = solidAt(bx - 1, by) || solidAt(bx + 1, by) || solidAt(bx, by + 1) || solidAt(bx, by - 1);
    if (!adj) { toast("Precisa de apoio adjacente", "#94a3b8"); return; }
    setBlock(bx, by, PLACE_BLOCK[s]);
    saveRef.current.inv[s] -= 1; setInv(i => ({ ...i, [s]: i[s] - 1 }));
    burst(bx + 0.5, by + 0.5, AVG[PLACE_BLOCK[s]] || "#888", 5, 20);
    sfxRef.current.place();
  }, [getBlock, setBlock, solidAt, toast, burst]);

  // ref do slot para callbacks estáveis
  const selSlotRef = useRef(0);
  selSlotRef.current = selSlot;

  const doAttack = useCallback(() => {
    if (attackCdRef.current > 0) return;
    attackCdRef.current = 0.45;
    const p = playerRef.current;
    p.swing = 0.25;
    const dmg = (propsRef.current.atk * 0.5 + 6) * (saveRef.current.sword ? 1.8 : 1);
    let hit = false;
    for (const m of mobsRef.current) {
      if (m.dead) continue;
      const dx = (m.x) - (p.x + 0.3);
      const dy = (m.y - 0.8) - (p.y - 0.8);
      if (Math.abs(dx) < 2.3 && Math.sign(dx) === p.face && Math.abs(dy) < 1.6) {
        m.hp -= dmg; hit = true;
        burst(m.x, m.y - 0.8, m.kind === "pig" ? "#f9a8d4" : "#4ade80", 6, 22);
        floatTxt(m.x, m.y - 2, `-${Math.round(dmg)}`, "#f87171");
        m.vx += p.face * 4;
        if (m.hp <= 0) {
          m.dead = true;
          if (m.kind === "zombie") {
            const gold = 12 + propsRef.current.level * 3, xp = 10 + propsRef.current.level * 2;
            addPend(gold, xp, 1);
            floatTxt(m.x, m.y - 2, `+${gold} ouro`, "#fde047");
            burst(m.x, m.y - 1, "#22c55e", 12, 18);
            saveRef.current.kills += 1;
            const qs = ensurePqDay(); qs.dayKills += 1;
            if (!qs.pqKill) { qs.pqKill = true; addPend(30, 0); toast("📜 Missão: zumbi derrotado! +30 ouro", "#4ade80"); }
          } else {
            const heal = Math.min(14, maxHpRef.current - hpRef.current);
            if (heal > 2) { hpRef.current += heal; setHp(hpRef.current); floatTxt(m.x, m.y - 1.5, `+${heal} HP`, "#f9a8d4"); }
            else { addPend(4, 2); floatTxt(m.x, m.y - 1.5, "+4 ouro", "#fde047"); }
            burst(m.x, m.y - 0.5, "#f9a8d4", 10, 16);
          }
          sfxRef.current.kill();
        }
      }
    }
    if (hit) sfxRef.current.mine();
  }, [addPend, burst, floatTxt]);

  const hpRef = useRef(100);
  hpRef.current = hp;

  const hurtPlayer = useCallback((dmg: number, fromX: number) => {
    const p = playerRef.current;
    if (p.iframes > 0) return;
    p.iframes = 0.9;
    hpRef.current = Math.max(0, hpRef.current - Math.round(dmg));
    setHp(hpRef.current);
    p.vx = Math.sign(p.x + 0.3 - fromX) * 7; p.vy = -5;
    sfxRef.current.hurt();
    burst(p.x + 0.3, p.y - 1, "#ef4444", 8, 20);
    if (hpRef.current <= 0) {
      // respawn
      const meta = metaRef.current!;
      const sh = surfaceHeight(meta.spawnX);
      p.x = meta.spawnX + 0.3; p.y = sh; p.vx = 0; p.vy = 0;
      hpRef.current = maxHpRef.current; setHp(hpRef.current);
      toast("Morreste! Voltaste ao spawn.", "#f87171");
      burst(p.x, p.y - 1, "#94a3b8", 14, 18);
    }
  }, [toast, burst]);

  // ---- motor: lógica ----
  const frontCell = useCallback((): { x: number; y: number } | null => {
    const p = playerRef.current;
    const bx = Math.floor(p.x + 0.3 + p.face * 0.95);
    for (const dy of [0.4, 1.2]) {
      const by = Math.floor(p.y - dy);
      const b = getBlock(bx, by);
      if (b !== B.AIR && b !== B.WATER && HARDNESS[b] !== undefined) return { x: bx, y: by };
    }
    return null;
  }, [getBlock]);

  const reachOf = useCallback((bx: number, by: number) => {
    const p = playerRef.current;
    const dx = bx + 0.5 - (p.x + 0.3), dy = by + 0.5 - (p.y - 0.9);
    return Math.sqrt(dx * dx + dy * dy) <= 4.8;
  }, []);

  const spawnT = useRef(0);
  const mineSndT = useRef(0);

  const updateMobs = useCallback((dt: number) => {
    const p = playerRef.current;
    const night = isNightT(todRef.current);
    const lvl = propsRef.current.level;
    const mobs = mobsRef.current;

    for (const m of mobs) {
      const distP = Math.abs(m.x - (p.x + 0.3));
      if (m.kind === "zombie") {
        // queima de dia
        if (!night) {
          m.burn += dt;
          if (m.burn > 0.8) { m.burn = 0; m.hp -= 9; burst(m.x, m.y - 1.2, "#f97316", 4, 8); if (m.hp <= 0) { m.dead = true; addPend(0, 4); } }
        }
        if (distP < 26) {
          const dir = Math.sign(p.x + 0.3 - m.x) || 1;
          m.vx = dir * 2.35;
          if (m.onGround && Math.abs(m.vx) < 0.2) m.vy = -10.5;
          // pula para subir blocos
          if (m.onGround && (solidAt(m.x + dir * 0.7, m.y - 0.4))) m.vy = -11;
          if (Math.abs(distP) < 0.95 && Math.abs((m.y) - (p.y)) < 1.7) hurtPlayer(6 + lvl * 0.9, m.x);
        } else { m.vx = 0; }
      } else {
        // porco: vagueia
        m.t -= dt;
        if (m.t <= 0) { m.t = 2 + Math.random() * 3; m.vx = (Math.random() - 0.5) * 2.4; if (Math.random() < 0.3 && m.onGround) m.vy = -7; }
        if (distP < 2 && Math.random() < 0.02) { m.vx = Math.sign(m.x - p.x) * 3; m.vy = m.onGround ? -6.5 : m.vy; }
      }
      // física
      m.vy = Math.min(22, m.vy + 30 * dt);
      const inW = getBlock(Math.floor(m.x), Math.floor(m.y - 0.5)) === B.WATER;
      if (inW) { m.vy = Math.min(2.2, m.vy); }
      let nx = m.x + m.vx * dt;
      const mh = m.kind === "pig" ? 0.95 : 1.7;
      if (solidAt(nx + (m.vx > 0 ? 0.3 : -0.3), m.y - 0.2) || solidAt(nx + (m.vx > 0 ? 0.3 : -0.3), m.y - mh * 0.6)) { nx = m.x; m.vx = 0; }
      m.x = Math.max(1, Math.min(W - 1, nx));
      let ny = m.y + m.vy * dt;
      if (m.vy > 0 && (solidAt(m.x - 0.25, ny) || solidAt(m.x + 0.25, ny))) { ny = Math.floor(ny); m.vy = 0; m.onGround = true; }
      else if (m.vy < 0 && (solidAt(m.x - 0.25, ny - mh) || solidAt(m.x + 0.25, ny - mh))) { ny = m.y; m.vy = 0; m.onGround = false; }
      else m.onGround = false;
      m.y = ny;
      m.t += dt; // anim timer
    }
    mobsRef.current = mobs.filter(m => !m.dead && Math.abs(m.x - p.x) < 60);
  }, [addPend, burst, getBlock, hurtPlayer, solidAt, ensurePqDay, toast]);

  const trySpawn = useCallback((dt: number) => {
    spawnT.current += dt;
    if (spawnT.current < 1.4) return;
    spawnT.current = 0;
    const p = playerRef.current;
    const night = isNightT(todRef.current);
    const mobs = mobsRef.current;
    const zCount = mobs.filter(m => m.kind === "zombie").length;
    const pCount = mobs.filter(m => m.kind === "pig").length;
    const side = Math.random() < 0.5 ? -1 : 1;
    const sx = Math.round(p.x + side * (11 + Math.random() * 9));
    if (sx < 3 || sx > W - 3) return;
    const sh = surfaceHeight(sx);
    if (getBlock(sx, sh - 1) !== B.AIR) return;
    if (night && zCount < Math.min(5, 1 + Math.floor(propsRef.current.level / 4))) {
      mobs.push({ kind: "zombie", x: sx + 0.2, y: sh, vx: 0, vy: 0, hp: 30 + propsRef.current.level * 6, maxHp: 30 + propsRef.current.level * 6, onGround: false, t: Math.random() * 3, burn: 0, dead: false } as Mob);
    } else if (!night && pCount < 3 && Math.random() < 0.55) {
      mobs.push({ kind: "pig", x: sx + 0.2, y: sh, vx: 0, vy: 0, hp: 16, maxHp: 16, onGround: false, t: Math.random() * 3, burn: 0, dead: false } as Mob);
    }
  }, [getBlock]);

  const updateMining = useCallback((dt: number) => {
    const pickMult = PICKS[saveRef.current.pick]?.mult ?? 1;
    let target: { x: number; y: number } | null = null;
    if (actRef.current.pointer && aimRef.current && reachOf(aimRef.current.x, aimRef.current.y)) target = aimRef.current;
    else if (actRef.current.mine) { const fc = frontCell(); if (fc && reachOf(fc.x, fc.y)) target = fc; }

    if (!target) { mineRef.current = null; return; }
    const b = getBlock(target.x, target.y);
    if (b === B.AIR || b === B.WATER || HARDNESS[b] === undefined) { mineRef.current = null; return; }

    const cur = mineRef.current;
    if (!cur || cur.x !== target.x || cur.y !== target.y) mineRef.current = { x: target.x, y: target.y, prog: 0 };
    const mr = mineRef.current!;
    mr.prog += (pickMult * dt) / HARDNESS[b];

    mineSndT.current -= dt;
    if (mineSndT.current <= 0) { mineSndT.current = 0.22; sfxRef.current.mine(); burst(target.x + 0.5, target.y + 0.5, AVG[b] || "#888", 2, 20); }

    if (mr.prog >= 1) {
      setBlock(target.x, target.y, B.AIR);
      const drop = DROPS[b];
      const xpMap: Record<number, number> = { [B.GRASS]: 1, [B.DIRT]: 1, [B.SAND]: 1, [B.LEAF]: 1, [B.LOG]: 1, [B.PLANK]: 1, [B.STONE]: 2, [B.COAL]: 3, [B.IRON]: 4, [B.GOLD]: 5, [B.DIAMOND]: 8 };
      addPend(0, xpMap[b] ?? 1);
      saveRef.current.mined += 1;
      const qs = ensurePqDay(); qs.dayMined += 1;
      if (!qs.pqMine && qs.dayMined >= 10) { qs.pqMine = true; addPend(40, 0); toast("📜 Missão: 10 blocos minerados! +40 ouro", "#4ade80"); }
      if (drop && (b !== B.LEAF || Math.random() < 0.6)) {
        saveRef.current.inv[drop] = (saveRef.current.inv[drop] || 0) + 1;
        setInv(i => ({ ...i, [drop]: (i[drop] || 0) + 1 }));
        floatTxt(target.x + 0.5, target.y - 0.2, `+1 ${RES_META.find(r => r.id === drop)?.label ?? drop}`, AVG[b] || "#fff");
        sfxRef.current.collect();
      }
      burst(target.x + 0.5, target.y + 0.5, AVG[b] || "#888", 9, 24);
      sfxRef.current.breakB();
      mineRef.current = null;
    }
  }, [addPend, burst, floatTxt, frontCell, getBlock, reachOf, setBlock]);

  const updatePrompt = useCallback(() => {
    const meta = metaRef.current; if (!meta) return;
    const p = playerRef.current;
    const near = (wx: number, range: number) => Math.abs(p.x + 0.3 - (wx + 0.5)) < range;
    let kind: typeof promptKind = null; let text: string | null = null;
    if (near(meta.merchantX, 2.2)) { kind = "merchant"; text = "Falar com o Mercador"; }
    else if (near(meta.billboardX, 2.0)) { kind = "billboard"; text = "Ver Sorteios ao Vivo"; }
    else if (near(meta.feiraX, 2.0)) { kind = "stall"; text = "Visitar a Feira de Vendas"; }
    else if (near(meta.arenaX, 2.2)) { kind = "coliseum"; text = "Ver Torneios da Plataforma"; }
    else if (near(meta.questX, 2.0)) { kind = "questboard"; text = "Ver Missões de Hoje"; }
    else {
      for (const cx of meta.chestX) {
        const sh = surfaceHeight(cx);
        if (near(cx, 1.9) && Math.abs((p.y - 0.9) - (sh - 1.5)) < 4) {
          kind = "chest";
          const opened = Date.now() - (saveRef.current.chests[`c${cx}`] || 0) < 86400000;
          text = opened ? "Baú de Sorteio — volta amanhã" : "Abrir Baú de Sorteio";
          break;
        }
      }
    }
    if (!kind && near(meta.portalGX, 2.0)) { kind = "portalG"; text = "Entrar no Portal Arcade"; }
    else if (!kind && near(meta.portalMX, 2.0)) { kind = "portalM"; text = "Entrar no Portal do Mercado"; }
    if (promptRef.current.kind !== kind || promptRef.current.text !== text) {
      promptRef.current = { kind, text };
      setPromptKind(kind); setPrompt(text);
    }
  }, []);

  const stepGame = useCallback((dt: number) => {
    const p = playerRef.current;
    // tempo
    todRef.current += dt / 240;
    if (todRef.current >= 1) { todRef.current = 0; dayRef.current += 1; ensurePqDay(); toast(`☀ Dia ${dayRef.current} — os baús de sorteio esperam por ti!`, "#fde047"); }

    // input -> velocidade
    const k = keysRef.current; const j = joyRef.current;
    let dir = 0;
    if (k.l || (j.active && j.x < -0.35)) dir -= 1;
    if (k.r || (j.active && j.x > 0.35)) dir += 1;
    const jumpHeld = k.jump || (j.active && j.y < -0.6);
    if (dir !== 0) p.face = dir;
    const inWater = getBlock(Math.floor(p.x + 0.3), Math.floor(p.y - 0.9)) === B.WATER;
    p.inWater = inWater;
    const speed = 6.2 * (inWater ? 0.55 : 1);
    p.vx = dir * speed;

    // física vertical
    if (jumpHeld) {
      if (inWater) p.vy = -4.2;
      else if (p.onGround) { p.vy = -12.6; sfxRef.current.place(); }
    }
    p.vy = Math.min(inWater ? 3.2 : 22, p.vy + (inWater ? 9 : 32) * dt);

    // colisão horizontal
    const pw = 0.3, ph = 1.75;
    let nx = p.x + p.vx * dt;
    if (p.vx !== 0) {
      const edge = nx + Math.sign(p.vx) * pw;
      const cx = Math.floor(edge);
      if (solidAt(cx, p.y - 0.15) || solidAt(cx, p.y - 0.9) || solidAt(cx, p.y - 1.6)) {
        nx = (p.vx > 0 ? cx - pw - 0.001 : cx + 1 + pw + 0.001);
        p.vx = 0;
      }
    }
    p.x = Math.max(1, Math.min(W - 1, nx));

    // colisão vertical
    let ny = p.y + p.vy * dt;
    if (p.vy > 0) {
      if (solidAt(p.x - pw + 0.06, ny) || solidAt(p.x + pw - 0.06, ny)) {
        ny = Math.floor(ny); p.vy = 0; p.onGround = true;
      } else p.onGround = false;
    } else if (p.vy < 0) {
      if (solidAt(p.x - pw + 0.06, ny - ph) || solidAt(p.x + pw - 0.06, ny - ph)) { ny = p.y; p.vy = 0; }
      p.onGround = false;
    }
    p.y = ny;
    if (dir !== 0 && p.onGround) p.anim += dt * 9; else if (p.onGround) p.anim = 0;

    // timers
    if (p.iframes > 0) p.iframes -= dt;
    if (p.swing > 0) p.swing -= dt;
    if (attackCdRef.current > 0) attackCdRef.current -= dt;

    updateMining(dt);
    updateMobs(dt);
    trySpawn(dt);

    // partículas
    const parts = partsRef.current;
    for (const pt of parts) { pt.life -= dt; pt.vy += pt.grav * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
    partsRef.current = parts.filter(pt => pt.life > 0);
    // textos flutuantes
    const fl = floatsRef.current;
    for (const f of fl) { f.life -= dt; f.y -= dt * 1.1; }
    floatsRef.current = fl.filter(f => f.life > 0);

    updatePrompt();
  }, [getBlock, solidAt, toast, updateMining, updateMobs, trySpawn, updatePrompt, ensurePqDay]);

  // ---- motor: render ----
  const starsRef = useRef<{ x: number; y: number; s: number; ph: number }[]>([]);
  const cloudsRef = useRef<{ x: number; y: number; w: number; s: number }[]>([]);
  const hillsRef = useRef<number[]>([]);

  const drawGame = useCallback((time: number) => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    // DPR adaptativo: dispositivos fracos (poucos núcleos) renderizam mais leve
    const cores = (navigator as any).hardwareConcurrency || 4;
    const dprCap = cores <= 4 ? 1.25 : 2;
    const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const TILE = tileRef.current;
    viewRef.current = { w: cw, h: ch };

    const p = playerRef.current;
    // câmara
    const targX = Math.max(0, Math.min(W - cw / TILE, p.x + 0.3 - cw / (2 * TILE)));
    const targY = Math.max(0, Math.min(H - ch / TILE, p.y - (ch / TILE) * 0.62));
    const cam = camRef.current;
    cam.x += (targX - cam.x) * Math.min(1, 0.14); cam.y += (targY - cam.y) * Math.min(1, 0.14);
    const sx = (wx: number) => (wx - cam.x) * TILE;
    const sy = (wy: number) => (wy - cam.y) * TILE;

    // céu
    const tod = todRef.current;
    const [top, bottom] = skyColors(tod);
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, top); grad.addColorStop(1, bottom);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cw, ch);

    // estrelas
    const na = nightAmount(tod);
    if (na > 0.04) {
      ctx.fillStyle = `rgba(255,255,255,${na * 0.9})`;
      for (const st of starsRef.current) {
        const tw = 0.5 + 0.5 * Math.sin(time * 2.2 + st.ph);
        ctx.globalAlpha = na * tw;
        ctx.fillRect(st.x * cw, st.y * ch * 0.7, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    // sol / lua
    const sunT = tod / 0.55;
    if (tod < 0.55 && sunT >= 0) {
      const sunX = cw * (0.06 + 0.88 * sunT), sunY = ch * (0.5 - 0.42 * Math.sin(Math.PI * Math.min(1, sunT)));
      ctx.fillStyle = "#fde047"; ctx.fillRect(sunX - 14, sunY - 14, 28, 28);
      ctx.fillStyle = "rgba(253,224,71,0.25)"; ctx.fillRect(sunX - 20, sunY - 20, 40, 40);
    }
    const moonT = (tod - NIGHT_A) / (NIGHT_B - NIGHT_A);
    if (tod > NIGHT_A && tod < NIGHT_B && moonT >= 0) {
      const mX = cw * (0.06 + 0.88 * moonT), mY = ch * (0.5 - 0.42 * Math.sin(Math.PI * moonT));
      ctx.fillStyle = "#e2e8f0"; ctx.fillRect(mX - 11, mY - 11, 22, 22);
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(mX - 4, mY - 6, 7, 7); ctx.fillRect(mX + 3, mY + 2, 5, 5);
    }

    // nuvens blocky
    ctx.fillStyle = `rgba(255,255,255,${0.8 - na * 0.55})`;
    for (const cl of cloudsRef.current) {
      const cxp = ((cl.x + time * cl.s) % (cw + 260)) - 130;
      ctx.fillRect(cxp, cl.y * ch, cl.w, 10);
      ctx.fillRect(cxp + 12, cl.y * ch - 8, cl.w * 0.6, 10);
    }

    // colinas parallax
    for (let layer = 0; layer < 2; layer++) {
      const fac = layer === 0 ? 0.22 : 0.45;
      const baseY = ch * (layer === 0 ? 0.62 : 0.72);
      const col = layer === 0 ? (na > 0.3 ? "#1d3325" : "#4c8f63") : (na > 0.3 ? "#16281d" : "#3b7a52");
      ctx.fillStyle = col;
      const off = cam.x * TILE * fac;
      for (let i = 0; i < hillsRef.current.length - 1; i++) {
        const hx = i * 34 - (off % (hillsRef.current.length * 34));
        const hh = hillsRef.current[i] * (layer === 0 ? 60 : 90);
        ctx.fillRect(hx, baseY - hh, 34, hh + ch);
      }
    }

    // blocos
    const x0 = Math.max(0, Math.floor(cam.x) - 1), x1 = Math.min(W - 1, Math.ceil(cam.x + cw / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y) - 1), y1 = Math.min(H - 1, Math.ceil(cam.y + ch / TILE) + 1);
    const tex = texRef.current;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const b = worldRef.current![y * W + x];
        if (b === B.AIR) continue;
        const px = Math.round(sx(x)), py = Math.round(sy(y));
        if (b === B.WATER) {
          ctx.fillStyle = "rgba(59,130,246,0.72)";
          ctx.fillRect(px, py, TILE, TILE);
          if (worldRef.current![(y - 1) * W + x] === B.AIR || y === 0) {
            ctx.fillStyle = "rgba(191,219,254,0.65)";
            ctx.fillRect(px, py + Math.sin(time * 2.4 + x * 0.9) * 2 + 2, TILE, 3);
          }
          continue;
        }
        if (b === B.TORCH) {
          ctx.fillStyle = "#7a4f21"; ctx.fillRect(px + TILE * 0.44, py + TILE * 0.3, TILE * 0.12, TILE * 0.7);
          const fl = 0.7 + 0.3 * Math.sin(time * 11 + x * 3.1);
          ctx.fillStyle = "#fbbf24"; ctx.fillRect(px + TILE * 0.36, py + TILE * 0.12, TILE * 0.28 * fl, TILE * 0.24);
          ctx.fillStyle = "#f59e0b"; ctx.fillRect(px + TILE * 0.4, py + TILE * 0.06, TILE * 0.2 * fl, TILE * 0.12);
          continue;
        }
        if (b === B.PORTAL_G || b === B.PORTAL_M) {
          ctx.fillStyle = b === B.PORTAL_G ? "#4c1d95" : "#831843";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = b === B.PORTAL_G ? "rgba(139,92,246,0.55)" : "rgba(236,72,153,0.55)";
          const pulse = 0.5 + 0.5 * Math.sin(time * 3 + x);
          ctx.fillRect(px + TILE * 0.15, py + TILE * 0.1, TILE * 0.7 * (0.6 + pulse * 0.4), TILE * 0.8);
          for (let i = 0; i < 3; i++) {
            const a = time * 2.4 + i * 2.09;
            ctx.fillStyle = b === B.PORTAL_G ? "#22d3ee" : "#f9a8d4";
            ctx.fillRect(px + TILE * 0.5 + Math.cos(a) * TILE * 0.3 - 2, py + TILE * 0.5 + Math.sin(a) * TILE * 0.3 - 2, 4, 4);
          }
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
          ctx.fillText(b === B.PORTAL_G ? "ARCADE" : "MERCADO", px + TILE / 2, py - 5);
          continue;
        }
        if (b === B.BILLBOARD || b === B.STALL || b === B.COLISEUM || b === B.QUESTBOARD) {
          const t = tex[b];
          if (t) ctx.drawImage(t, px, py, TILE, TILE);
          else { ctx.fillStyle = AVG[b] || "#888"; ctx.fillRect(px, py, TILE, TILE); }
          const pulse = 0.65 + 0.35 * Math.sin(time * 2.6 + x);
          const label = b === B.BILLBOARD ? "SORTEIOS" : b === B.STALL ? "FEIRA" : b === B.COLISEUM ? "TORNEIOS" : "MISSÕES";
          const lblCol = b === B.BILLBOARD ? "#fbbf24" : b === B.STALL ? "#f9a8d4" : b === B.COLISEUM ? "#7dd3fc" : "#86efac";
          ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
          ctx.fillStyle = `rgba(0,0,0,${0.55 * pulse})`;
          ctx.fillText(label, px + TILE / 2 + 1, py - 4);
          ctx.fillStyle = lblCol;
          ctx.globalAlpha = 0.75 + 0.25 * pulse;
          ctx.fillText(label, px + TILE / 2, py - 5);
          ctx.globalAlpha = 1;
          continue;
        }
        const t = tex[b];
        if (t) { ctx.drawImage(t, px, py, TILE, TILE); }
        else { ctx.fillStyle = AVG[b] || "#888"; ctx.fillRect(px, py, TILE, TILE); }
        if (b === B.GRASS && worldRef.current![(y - 1) * W + x] === B.AIR) {
          ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(px, py, TILE, TILE * 0.16);
        }
        if (b === B.CHEST) {
          const bl = Math.sin(time * 3 + x) > 0.85;
          if (bl) { ctx.fillStyle = "#fff"; ctx.fillRect(px + TILE * 0.7, py + TILE * 0.15, 4, 4); ctx.fillRect(px + TILE * 0.78, py + TILE * 0.3, 3, 3); }
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
          ctx.fillText("SORTEIO", px + TILE / 2, py - 4);
        }
      }
    }

    // rachaduras de mineração
    const mr = mineRef.current;
    if (mr) {
      const px = Math.round(sx(mr.x)), py = Math.round(sy(mr.y));
      const stage = Math.min(4, Math.floor(mr.prog * 5));
      ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = 1.5;
      for (let i = 0; i <= stage * 2; i++) {
        const seed = (mr.x * 7 + mr.y * 13 + i * 29);
        const a = (seed % 10) / 10, b2 = ((seed * 7) % 10) / 10;
        ctx.beginPath();
        ctx.moveTo(px + TILE * a, py + TILE * b2);
        ctx.lineTo(px + TILE * (a + 0.2 + (seed % 3) / 10), py + TILE * (b2 + 0.25));
        ctx.stroke();
      }
    }
    // contorno do alvo
    const aimNow = (actRef.current.pointer || actRef.current.mine) ? (actRef.current.pointer && aimRef.current ? aimRef.current : frontCell()) : (aimRef.current);
    if (aimNow && reachOf(aimNow.x, aimNow.y)) {
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(sx(aimNow.x)) + 1, Math.round(sy(aimNow.y)) + 1, TILE - 2, TILE - 2);
    }

    // ---- entidades ----
    // mercador NPC
    const meta = metaRef.current!;
    if (meta) {
      const mx = meta.merchantX + 0.5, mSh = surfaceHeight(meta.merchantX);
      const mpx = sx(mx), mpy = sy(mSh);
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(mpx - TILE * 0.32, mpy - TILE * 1.15, TILE * 0.64, TILE * 1.15);
      ctx.fillStyle = "#e8b58a"; ctx.fillRect(mpx - TILE * 0.22, mpy - TILE * 1.55, TILE * 0.44, TILE * 0.42);
      ctx.fillStyle = "#4a3120"; ctx.fillRect(mpx - TILE * 0.24, mpy - TILE * 1.62, TILE * 0.48, TILE * 0.14);
      ctx.fillStyle = "#fde047"; ctx.fillRect(mpx - TILE * 0.1, mpy - TILE * 1.42, TILE * 0.2, TILE * 0.14);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 9px system-ui"; ctx.textAlign = "center";
      ctx.fillText("MERCADOR", mpx, mpy - TILE * 1.78);
    }

    // mobs
    for (const m of mobsRef.current) {
      const mxp = sx(m.x), myp = sy(m.y);
      const wob = Math.sin(m.t * 8) * TILE * 0.08;
      if (m.kind === "zombie") {
        // pernas
        ctx.fillStyle = "#3b3b8f";
        ctx.fillRect(mxp - TILE * 0.26, myp - TILE * 0.75 + wob, TILE * 0.2, TILE * 0.75 - wob);
        ctx.fillRect(mxp + TILE * 0.06, myp - TILE * 0.75 - wob, TILE * 0.2, TILE * 0.75 + wob);
        // corpo
        ctx.fillStyle = "#2d7a7a"; ctx.fillRect(mxp - TILE * 0.3, myp - TILE * 1.35, TILE * 0.6, TILE * 0.62);
        // braços esticados
        ctx.fillStyle = "#4a8f4a";
        ctx.fillRect(mxp + (m.vx > 0 ? TILE * 0.15 : -TILE * 0.62), myp - TILE * 1.3, TILE * 0.48, TILE * 0.16);
        // cabeça
        ctx.fillStyle = "#57a05a"; ctx.fillRect(mxp - TILE * 0.26, myp - TILE * 1.85, TILE * 0.52, TILE * 0.5);
        ctx.fillStyle = "#123";
        const exo = m.vx > 0 ? TILE * 0.05 : -TILE * 0.16;
        ctx.fillRect(mxp - TILE * 0.14 + exo, myp - TILE * 1.68, TILE * 0.1, TILE * 0.09);
        ctx.fillRect(mxp + TILE * 0.06 + exo, myp - TILE * 1.68, TILE * 0.1, TILE * 0.09);
        // hp
        if (m.hp < m.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(mxp - TILE * 0.35, myp - TILE * 2.05, TILE * 0.7, 4);
          ctx.fillStyle = "#ef4444"; ctx.fillRect(mxp - TILE * 0.35, myp - TILE * 2.05, TILE * 0.7 * (m.hp / m.maxHp), 4);
        }
      } else {
        // porco
        ctx.fillStyle = "#f0a0b0"; ctx.fillRect(mxp - TILE * 0.42, myp - TILE * 0.62, TILE * 0.84, TILE * 0.5);
        ctx.fillStyle = "#f7b8c4"; ctx.fillRect(mxp + (m.vx > 0 ? TILE * 0.24 : -TILE * 0.46), myp - TILE * 0.72, TILE * 0.24, TILE * 0.32);
        ctx.fillStyle = "#d4839a"; ctx.fillRect(mxp + (m.vx > 0 ? TILE * 0.42 : -TILE * 0.42), myp - TILE * 0.6, TILE * 0.1, TILE * 0.08);
        ctx.fillStyle = "#e08898";
        ctx.fillRect(mxp - TILE * 0.28, myp - TILE * 0.14 + wob, TILE * 0.12, TILE * 0.14);
        ctx.fillRect(mxp + TILE * 0.16, myp - TILE * 0.14 - wob, TILE * 0.12, TILE * 0.14);
      }
    }

    // jogador (estilo Steve)
    const flick = p.iframes > 0 && Math.floor(time * 12) % 2 === 0;
    if (!flick) {
      const pxp = sx(p.x + 0.3), pyp = sy(p.y);
      const wobble = p.anim > 0 ? Math.sin(p.anim) * TILE * 0.1 : 0;
      // pernas
      ctx.fillStyle = "#31418f";
      ctx.fillRect(pxp - TILE * 0.22, pyp - TILE * 0.72 + wobble, TILE * 0.18, TILE * 0.72 - wobble);
      ctx.fillRect(pxp + TILE * 0.04, pyp - TILE * 0.72 - wobble, TILE * 0.18, TILE * 0.72 + wobble);
      // corpo (cor da classe)
      ctx.fillStyle = propsRef.current.classColor; ctx.fillRect(pxp - TILE * 0.26, pyp - TILE * 1.32, TILE * 0.52, TILE * 0.62);
      // braço traseiro
      ctx.fillStyle = "#e8b58a";
      ctx.fillRect(pxp - (p.face > 0 ? TILE * 0.38 : -TILE * 0.14), pyp - TILE * 1.28, TILE * 0.13, TILE * 0.5);
      // cabeça
      ctx.fillStyle = "#e8b58a"; ctx.fillRect(pxp - TILE * 0.24, pyp - TILE * 1.82, TILE * 0.48, TILE * 0.5);
      ctx.fillStyle = "#4a3120"; ctx.fillRect(pxp - TILE * 0.26, pyp - TILE * 1.88, TILE * 0.52, TILE * 0.16);
      ctx.fillStyle = "#123";
      const exOff = p.face > 0 ? TILE * 0.06 : -TILE * 0.16;
      ctx.fillRect(pxp - TILE * 0.13 + exOff, pyp - TILE * 1.64, TILE * 0.09, TILE * 0.08);
      ctx.fillRect(pxp + TILE * 0.06 + exOff, pyp - TILE * 1.64, TILE * 0.09, TILE * 0.08);
      // braço da frente + ferramenta
      const swinging = p.swing > 0 || mineRef.current;
      const armA = swinging ? Math.sin(time * 18) * 0.9 : 0;
      ctx.save();
      ctx.translate(pxp + (p.face > 0 ? TILE * 0.2 : -TILE * 0.2), pyp - TILE * 1.25);
      ctx.rotate(p.face > 0 ? armA : -armA);
      ctx.fillStyle = "#e8b58a"; ctx.fillRect(-TILE * 0.065, 0, TILE * 0.13, TILE * 0.5);
      if (saveRef.current.sword || mineRef.current) {
        ctx.fillStyle = saveRef.current.sword ? "#e5e7eb" : "#9a6f24";
        ctx.fillRect(-TILE * 0.05, -TILE * 0.42, TILE * 0.1, TILE * 0.44);
        ctx.fillStyle = saveRef.current.sword ? "#9ca3af" : "#6b4423";
        ctx.fillRect(-TILE * 0.075, -TILE * 0.06, TILE * 0.15, TILE * 0.1);
      }
      ctx.restore();
      // etiqueta de nome
      ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
      const label = `${propsRef.current.playerName} · Nv.${propsRef.current.level}`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(pxp - tw / 2 - 5, pyp - TILE * 2.14, tw + 10, 14);
      ctx.fillStyle = "#fff"; ctx.fillText(label, pxp, pyp - TILE * 2.14 + 11);
    }

    // partículas
    for (const pt of partsRef.current) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(sx(pt.x) - pt.size / 2, sy(pt.y) - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // textos flutuantes
    ctx.font = "bold 12px system-ui"; ctx.textAlign = "center";
    for (const f of floatsRef.current) {
      ctx.globalAlpha = Math.min(1, f.life / 0.5);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(f.text, sx(f.x) + 1, sy(f.y) + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx(f.x), sy(f.y));
    }
    ctx.globalAlpha = 1;

    // escurecimento noturno + luzes
    if (na > 0.02) {
      const dc = darkRef.current;
      if (dc) {
        if (dc.width !== Math.round(cw * dpr) || dc.height !== Math.round(ch * dpr)) { dc.width = Math.round(cw * dpr); dc.height = Math.round(ch * dpr); }
        const dctx = dc.getContext("2d");
        if (dctx) {
          dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          dctx.clearRect(0, 0, cw, ch);
          dctx.fillStyle = `rgba(8,10,30,${na})`;
          dctx.fillRect(0, 0, cw, ch);
          dctx.globalCompositeOperation = "destination-out";
          const hole = (hx: number, hy: number, r: number, str = 1) => {
            const g2 = dctx.createRadialGradient(hx, hy, r * 0.25, hx, hy, r);
            g2.addColorStop(0, `rgba(0,0,0,${str})`); g2.addColorStop(1, "rgba(0,0,0,0)");
            dctx.fillStyle = g2; dctx.fillRect(hx - r, hy - r, r * 2, r * 2);
          };
          hole(sx(p.x + 0.3), sy(p.y - 0.9), TILE * 4.6);
          // tochas visíveis
          for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
            if (worldRef.current![y * W + x] === B.TORCH) hole(sx(x + 0.5), sy(y + 0.5), TILE * 3.1, 0.9);
            if (worldRef.current![y * W + x] === B.PORTAL_G || worldRef.current![y * W + x] === B.PORTAL_M) hole(sx(x + 0.5), sy(y + 0.5), TILE * 2.6, 0.85);
          }
          dctx.globalCompositeOperation = "source-over";
          ctx.drawImage(dc, 0, 0, cw, ch);
        }
      }
      // tint azul da noite
      ctx.fillStyle = `rgba(30,40,90,${na * 0.18})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // overlay debaixo d'água
    if (p.inWater) { ctx.fillStyle = "rgba(30,80,180,0.22)"; ctx.fillRect(0, 0, cw, ch); }
  }, [frontCell, reachOf]);

  // ---- minimapa ----
  const drawMap = useCallback(() => {
    const mc = mapRef.current; if (!mc || !worldRef.current) return;
    const g = mc.getContext("2d"); if (!g) return;
    g.clearRect(0, 0, W, 40);
    for (let x = 0; x < W; x++) {
      let col = "#0000";
      for (let y = 8; y < H; y++) {
        const b = worldRef.current[y * W + x];
        if (b !== B.AIR) { col = AVG[b] || "#888"; g.fillStyle = col; g.fillRect(x, Math.min(38, (y - 8) / 2), 1, 1.5); break; }
      }
    }
    const meta = metaRef.current;
    if (meta) {
      g.fillStyle = "#fbbf24";
      meta.chestX.forEach(cx => { const sh = surfaceHeight(cx); g.fillRect(cx, Math.min(38, (sh - 8) / 2), 2, 2); });
      g.fillStyle = "#22d3ee"; g.fillRect(meta.portalGX, Math.min(38, (surfaceHeight(meta.portalGX) - 8) / 2), 2, 2);
      g.fillStyle = "#f472b6"; g.fillRect(meta.portalMX, Math.min(38, (surfaceHeight(meta.portalMX) - 8) / 2), 2, 2);
      g.fillStyle = "#fde047"; g.fillRect(meta.billboardX, Math.min(38, (surfaceHeight(meta.billboardX) - 8) / 2), 2, 2);
      g.fillStyle = "#fb7185"; g.fillRect(meta.feiraX, Math.min(38, (surfaceHeight(meta.feiraX) - 8) / 2), 2, 2);
      g.fillStyle = "#38bdf8"; g.fillRect(meta.arenaX, Math.min(38, (surfaceHeight(meta.arenaX) - 8) / 2), 2, 2);
      g.fillStyle = "#4ade80"; g.fillRect(meta.questX, Math.min(38, (surfaceHeight(meta.questX) - 8) / 2), 2, 2);
      g.fillStyle = "#fff"; g.fillRect(meta.merchantX, Math.min(38, (surfaceHeight(meta.merchantX) - 8) / 2), 2, 2);
    }
    const p = playerRef.current;
    g.fillStyle = "#ef4444"; g.fillRect(Math.round(p.x) - 1, Math.min(38, Math.round((p.y - 8) / 2)) - 1, 3, 3);
  }, []);

  // ---- loop principal ----
  useEffect(() => {
    // init mundo
    const { data, meta } = genWorld();
    worldRef.current = data; metaRef.current = meta;
    texRef.current = buildTextures();

    const save = loadSave();
    save.sessionGold = 0; save.sessionXp = 0;
    saveRef.current = save;
    for (const [k, v] of Object.entries(save.edits || {})) {
      const [ex, ey] = k.split(",").map(Number);
      if (!Number.isNaN(ex) && !Number.isNaN(ey) && ex >= 0 && ex < W && ey >= 0 && ey < H) data[ey * W + ex] = v as number;
    }
    todRef.current = save.tod ?? 0.32; dayRef.current = save.day ?? 1;
    setTickets(save.tickets || 0); setPickTier(save.pick || 0); setHasSword(!!save.sword);
    setInv({ ...save.inv });
    sessRef.current = { gold: 0, xp: 0 }; setSess({ gold: 0, xp: 0 });

    const p = playerRef.current;
    if (save.x > 0) { p.x = save.x; p.y = save.y; }
    else { p.x = meta.spawnX + 0.3; p.y = surfaceHeight(meta.spawnX); }
    const mh0 = 100 + propsRef.current.level * 12;
    hpRef.current = Math.max(10, Math.min(mh0, save.hp || mh0)); setHp(hpRef.current);

    // cenário
    let s = 99;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    starsRef.current = Array.from({ length: 80 }, () => ({ x: rnd(), y: rnd(), s: rnd() > 0.8 ? 2 : 1, ph: rnd() * 6.28 }));
    cloudsRef.current = Array.from({ length: 7 }, (_, i) => ({ x: rnd() * 900, y: 0.05 + rnd() * 0.28, w: 60 + rnd() * 90, s: 6 + rnd() * 10, i }));
    hillsRef.current = Array.from({ length: 40 }, () => 0.3 + rnd() * 0.7);
    camRef.current = { x: Math.max(0, p.x - 6), y: Math.max(0, p.y - 8) };

    // tamanho
    const measure = () => {
      const wrap = wrapRef.current; if (!wrap) return;
      const cw = wrap.clientWidth, chh = wrap.clientHeight;
      tileRef.current = Math.max(22, Math.min(34, Math.round(cw / 15)));
      viewRef.current = { w: cw, h: chh };
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);

    // teclado
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key.toLowerCase()) {
        case "a": case "arrowleft": keysRef.current.l = true; break;
        case "d": case "arrowright": keysRef.current.r = true; break;
        case "w": case "arrowup": case " ": keysRef.current.jump = true; e.preventDefault(); break;
        case "e": doActionRef.current(); break;
        case "b": doBuildRef.current(); break;
        case "f": doAttackRef.current(); break;
        case "escape": setModal(null); break;
      }
    };
    const ku = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case "a": case "arrowleft": keysRef.current.l = false; break;
        case "d": case "arrowright": keysRef.current.r = false; break;
        case "w": case "arrowup": case " ": keysRef.current.jump = false; break;
      }
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // loop
    let mapT = 0;
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const last = lastRef.current || ts;
      lastRef.current = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      const time = ts / 1000;
      stepGame(dt);
      drawGame(time);
      // HUD throttle
      hudTRef.current -= dt;
      if (hudTRef.current <= 0) {
        hudTRef.current = 0.3;
        const h = Math.floor(((todRef.current + 0.25) % 1) * 24);
        setClock(prev => (prev.h !== h || prev.day !== dayRef.current) ? { h, day: dayRef.current } : prev);
        setSess(prev => (prev.gold !== sessRef.current.gold || prev.xp !== sessRef.current.xp) ? { ...sessRef.current } : prev);
      }
      mapT -= dt;
      if (mapT <= 0) { mapT = 0.7; drawMap(); }
      // autosave
      saveTRef.current -= dt;
      if (saveTRef.current <= 0) { saveTRef.current = 10; saveAll(); }
    };
    rafRef.current = requestAnimationFrame(loop);

    const vis = () => { if (document.hidden) saveAll(); };
    document.addEventListener("visibilitychange", vis);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      document.removeEventListener("visibilitychange", vis);
      flushPend();
      saveAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- save & reward flush ----
  const saveAll = useCallback(() => {
    const p = playerRef.current;
    const s = saveRef.current;
    s.tod = todRef.current; s.day = dayRef.current; s.x = p.x; s.y = p.y; s.hp = hpRef.current;
    s.sessionGold = sessRef.current.gold; s.sessionXp = sessRef.current.xp;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* quota */ }
  }, []);

  const flushPend = useCallback(() => {
    const pd = pendRef.current;
    if (pd.gold || pd.xp || pd.kills) {
      pendRef.current = { gold: 0, xp: 0, kills: 0 };
      propsRef.current.onReward({ ...pd });
    }
  }, []);

  useEffect(() => {
    const iv = setInterval(flushPend, 2800);
    return () => clearInterval(iv);
  }, [flushPend]);

  // ---- canvas pointer ----
  const canvasPointer = useCallback((e: RPointerEvent<HTMLCanvasElement>, phase: "down" | "move" | "up") => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const wx = camRef.current.x + (e.clientX - rect.left) / tileRef.current;
    const wy = camRef.current.y + (e.clientY - rect.top) / tileRef.current;
    if (phase === "down") {
      canvas.setPointerCapture(e.pointerId);
      // atacar mob clicado?
      const hitMob = mobsRef.current.find(m =>
        Math.abs(m.x + 0.3 - wx) < 0.9 && wy > m.y - 2.1 && wy < m.y + 0.3 &&
        Math.abs(m.x - playerRef.current.x) < 3);
      if (hitMob) { doAttack(); return; }
      const cell = { x: Math.floor(wx), y: Math.floor(wy) };
      aimRef.current = cell;
      actRef.current.pointer = true;
    } else if (phase === "move") {
      if (actRef.current.pointer) aimRef.current = { x: Math.floor(wx), y: Math.floor(wy) };
      else aimRef.current = { x: Math.floor(wx), y: Math.floor(wy) };
    } else {
      actRef.current.pointer = false;
      aimRef.current = null;
    }
  }, [doAttack]);

  // ---- joystick ----
  const [joyUi, setJoyUi] = useState({ dx: 0, dy: 0, on: false });
  const joyAreaRef = useRef<HTMLDivElement | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const joyDown = (e: RPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const rect = joyAreaRef.current?.getBoundingClientRect();
    if (rect) joyCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joyRef.current.active = true; setJoyUi(j => ({ ...j, on: true }));
    joyMove(e);
  };
  const joyMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!joyRef.current.active) return;
    const dx = Math.max(-1, Math.min(1, (e.clientX - joyCenter.current.x) / 46));
    const dy = Math.max(-1, Math.min(1, (e.clientY - joyCenter.current.y) / 46));
    joyRef.current.x = dx; joyRef.current.y = dy;
    setJoyUi({ dx, dy, on: true });
  };
  const joyUp = () => {
    joyRef.current = { x: 0, y: 0, active: false };
    keysRef.current.jump = false;
    setJoyUi({ dx: 0, dy: 0, on: false });
  };

  // ---- craft & venda ----
  const canCraft = (c: Craft) => {
    if (c.pick !== undefined && c.pick !== saveRef.current.pick + 1) return false;
    if (c.sword && saveRef.current.sword) return false;
    return Object.entries(c.cost).every(([r, n]) => (saveRef.current.inv[r] || 0) >= n);
  };
  const doCraft = (c: Craft) => {
    if (!canCraft(c)) return;
    Object.entries(c.cost).forEach(([r, n]) => { saveRef.current.inv[r] -= n; });
    if (c.out) Object.entries(c.out).forEach(([r, n]) => { saveRef.current.inv[r] = (saveRef.current.inv[r] || 0) + n; });
    if (c.pick !== undefined) { saveRef.current.pick = c.pick; setPickTier(c.pick); }
    if (c.heal) { hpRef.current = Math.min(maxHpRef.current, hpRef.current + c.heal); setHp(hpRef.current); }
    if (c.sword) { saveRef.current.sword = true; setHasSword(true); addPend(0, 50); propsRef.current.notify("⚔ Espada de Ferro forjada! +50 XP"); }
    setInv({ ...saveRef.current.inv });
    sfxRef.current.craft();
    toast(`✓ ${c.name}`, "#4ade80");
  };
  const sellRes = (r: string, all: boolean) => {
    const have = saveRef.current.inv[r] || 0;
    if (have <= 0) return;
    const n = all ? have : 1;
    const gold = (PRICES[r] ?? 0) * n;
    saveRef.current.inv[r] -= n;
    addPend(gold, 0);
    setInv({ ...saveRef.current.inv });
    sfxRef.current.collect();
    toast(`+${gold} ouro (sessão) — vai para a carteira RPG`, "#fde047");
  };

  // refs para teclado (callbacks estáveis)
  const doActionRef = useRef(doAction); doActionRef.current = doAction;
  const doBuildRef = useRef(doBuild); doBuildRef.current = doBuild;
  const doAttackRef = useRef(doAttack); doAttackRef.current = doAttack;

  const night = isNightT(todRef.current);
  const selRes = RES_IDS[selSlot];
  const isPlaceable = PLACEABLE.has(selRes);

  return (
    <div ref={wrapRef} className="relative w-full h-[calc(100svh-215px)] min-h-[460px] max-h-[780px] rounded-xl overflow-hidden border border-border select-none touch-none bg-[#0b1020]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onContextMenu={e => e.preventDefault()}
        onPointerDown={e => canvasPointer(e, "down")}
        onPointerMove={e => canvasPointer(e, "move")}
        onPointerUp={e => canvasPointer(e, "up")}
        onPointerCancel={e => canvasPointer(e, "up")}
      />
      <canvas ref={darkRef} className="hidden" />

      {/* HUD topo */}
      <div className="absolute top-0 inset-x-0 p-2 flex items-center gap-1.5 pointer-events-none z-10">
        <button onClick={onExit} className="pointer-events-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/55 border border-white/15 text-white text-[11px] font-bold active:scale-95 transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Sair
        </button>
        <div className="px-2.5 py-1.5 rounded-lg bg-black/55 border border-white/15 text-white text-[11px] font-bold flex items-center gap-1">
          {night ? <Moon className="h-3.5 w-3.5 text-indigo-300" /> : <Sun className="h-3.5 w-3.5 text-amber-300" />}
          Dia {clock.day} · {String(clock.h).padStart(2, "0")}:00
        </div>
        <div className="flex-1" />
        <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-black flex items-center gap-1">
          <Ticket className="h-3.5 w-3.5" /> {tickets}
        </div>
        <button onClick={() => { const m = !muted; setMuted(m); mutedRef.current = m; }} className="pointer-events-auto p-2 rounded-lg bg-black/55 border border-white/15 text-white active:scale-95">
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* barra de vida + sessão + atalhos */}
      <div className="absolute top-11 inset-x-0 px-2 flex items-center gap-1.5 pointer-events-none z-10">
        <div className="px-2 py-1 rounded-lg bg-black/55 border border-white/15 flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-red-400" />
          <div className="w-14 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(hp / maxHp) * 100}%` }} />
          </div>
          <span className="text-[10px] text-white font-bold">{hp}</span>
        </div>
        {sess.gold > 0 && (
          <div className="px-2 py-1 rounded-lg bg-black/55 border border-yellow-500/30 flex items-center gap-1 text-[10px] font-bold text-yellow-300">
            <Coins className="h-3 w-3" /> +{sess.gold}
          </div>
        )}
        {sess.xp > 0 && <div className="px-2 py-1 rounded-lg bg-black/55 border border-blue-500/30 text-[10px] font-bold text-blue-300">+{sess.xp} XP</div>}
        <div className="flex-1" />
        <button onClick={() => setModal("oficina")} className="pointer-events-auto px-2 py-1 rounded-lg bg-black/55 border border-white/15 text-white text-[10px] font-bold flex items-center gap-1 active:scale-95">
          <Hammer className="h-3 w-3" /> {PICKS[pickTier].name.replace("Picareta de ", "")}{hasSword && " · ⚔"}
        </button>
        <button onClick={() => setModal("sorteios")} className="pointer-events-auto px-2 py-1 rounded-lg bg-black/55 border border-amber-500/40 text-amber-300 text-[10px] font-bold active:scale-95" aria-label="Sorteios ao vivo">🎁</button>
        <button onClick={() => setModal("arena")} className="pointer-events-auto px-2 py-1 rounded-lg bg-black/55 border border-sky-500/40 text-sky-300 text-[10px] font-bold active:scale-95" aria-label="Torneios">🏆</button>
        <button onClick={() => setModal("questboard")} className="pointer-events-auto px-2 py-1 rounded-lg bg-black/55 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold active:scale-95" aria-label="Missões">📜</button>
        <button onClick={() => setModal("ajuda")} className="pointer-events-auto p-1.5 rounded-lg bg-black/55 border border-white/15 text-white active:scale-95">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* minimapa */}
      <canvas ref={mapRef} width={W} height={40} className="absolute right-2 top-[86px] w-[132px] h-[29px] rounded-md border border-white/25 opacity-85 z-10" />

      {/* toasts */}
      <div className="absolute top-24 inset-x-0 flex flex-col items-center gap-1 pointer-events-none z-20">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="px-3 py-1.5 rounded-full bg-black/75 border text-[11px] font-bold" style={{ color: t.color, borderColor: `${t.color}55` }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* prompt de interação */}
      <AnimatePresence>
        {prompt && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute bottom-[112px] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 text-[11px] font-bold z-20 whitespace-nowrap">
            <span className="inline-block px-1.5 mr-1 rounded bg-amber-400/25 border border-amber-400/40">E / AÇÃO</span> {prompt}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA bilhetes */}
      {tickets > 0 && (
        <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={() => navigate("/sorteios")}
          className="absolute left-2 top-[124px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black shadow-lg shadow-amber-500/30 z-10 flex items-center gap-1 active:scale-95">
          <Ticket className="h-3.5 w-3.5" /> Usar {tickets} bilhete{tickets > 1 ? "s" : ""} → Sorteios
        </motion.button>
      )}

      {/* hotbar */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center z-20 pointer-events-none">
        <div className="flex gap-1 bg-black/55 rounded-xl p-1.5 border border-white/15 max-w-[96%] overflow-x-auto no-scrollbar pointer-events-auto">
          {RES_META.map((r, i) => (
            <button key={r.id} onClick={() => setSelSlot(i)}
              className={`relative w-9 h-9 rounded-lg border-2 flex flex-col items-center justify-center shrink-0 transition ${selSlot === i ? "border-white bg-white/15 scale-105" : "border-white/20 bg-black/30"}`}>
              <span className="w-4 h-4 rounded-sm border border-black/40" style={{ background: r.color }} />
              <span className="text-[9px] font-black text-white leading-none mt-0.5">{inv[r.id] || 0}</span>
              {selSlot === i && isPlaceable && <span className="absolute -top-1.5 -right-1.5 text-[7px] px-1 rounded bg-emerald-500 text-white font-black">B</span>}
            </button>
          ))}
        </div>
      </div>

      {/* joystick */}
      <div ref={joyAreaRef}
        className="absolute bottom-16 left-3 w-[104px] h-[104px] rounded-full bg-black/35 border border-white/20 z-20 touch-none"
        onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp}>
        <div className="absolute inset-0 grid place-items-center text-white/30 text-[9px] font-bold pointer-events-none">mover</div>
        <div className="absolute w-11 h-11 rounded-full bg-white/35 border-2 border-white/50 transition-transform pointer-events-none"
          style={{ left: 28 + joyUi.dx * 28, top: 28 + joyUi.dy * 28, transform: joyUi.on ? "scale(1.05)" : "scale(1)" }} />
      </div>

      {/* botões de ação */}
      <div className="absolute bottom-16 right-3 z-20 flex flex-col items-end gap-1.5">
        {isPlaceable && (
          <button onPointerDown={e => { e.preventDefault(); doBuild(); }}
            className="w-14 h-9 rounded-lg bg-emerald-600/85 border border-emerald-300/50 text-white text-[10px] font-black active:scale-95 flex items-center justify-center gap-1">
            <Backpack className="h-3.5 w-3.5" /> PÔR
          </button>
        )}
        <div className="flex gap-1.5">
          <button onPointerDown={e => { e.preventDefault(); doAttackRef.current(); }}
            className="w-14 h-14 rounded-full bg-red-600/85 border border-red-300/50 text-white text-[10px] font-black active:scale-95 flex flex-col items-center justify-center">
            <Sparkles className="h-4 w-4 mb-0.5" />ATACAR
          </button>
          <button onPointerDown={e => { e.preventDefault(); doActionRef.current(); }}
            className="w-14 h-14 rounded-full bg-amber-500/85 border border-amber-300/50 text-white text-[10px] font-black active:scale-95 flex flex-col items-center justify-center">
            AÇÃO
          </button>
        </div>
        <div className="flex gap-1.5">
          <button
            onPointerDown={e => { e.preventDefault(); actRef.current.mine = true; }}
            onPointerUp={() => { actRef.current.mine = false; }}
            onPointerLeave={() => { actRef.current.mine = false; }}
            onPointerCancel={() => { actRef.current.mine = false; }}
            className="w-14 h-14 rounded-full bg-sky-600/85 border border-sky-300/50 text-white text-[10px] font-black active:scale-95 flex flex-col items-center justify-center">
            <Hammer className="h-4 w-4 mb-0.5" />MINERAR
          </button>
          <button
            onPointerDown={e => { e.preventDefault(); keysRef.current.jump = true; }}
            onPointerUp={() => { keysRef.current.jump = false; }}
            onPointerLeave={() => { keysRef.current.jump = false; }}
            className="w-14 h-14 rounded-full bg-violet-600/85 border border-violet-300/50 text-white text-[10px] font-black active:scale-95 flex flex-col items-center justify-center">
            SALTAR
          </button>
        </div>
      </div>

      {/* dica desktop */}
      <div className="hidden md:block absolute bottom-2 left-3 text-[9px] text-white/50 font-medium z-10 pointer-events-none">
        A/D mover · Espaço saltar · E interagir · B construir · F atacar · Rato minerar
      </div>

      {/* ---- MODAIS ---- */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center p-3"
            onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[88%] overflow-y-auto rounded-2xl bg-card border border-border p-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm">
                  {modal === "oficina" && "🔨 Oficina de Craft"}
                  {modal === "mercado" && "💰 Mercador Voxel"}
                  {modal === "ajuda" && "🧱 Como jogar o Mundo Voxel"}
                  {modal === "sorteios" && "🎁 Mural de Sorteios — ao vivo"}
                  {modal === "feira" && "🛒 Feira de Vendas da Plataforma"}
                  {modal === "arena" && "🏆 Arena de Torneios"}
                  {modal === "questboard" && "📜 Missões de Hoje"}
                </p>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>

              {modal === "oficina" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Picareta atual: <b className="text-foreground">{PICKS[pickTier].name}</b></p>
                  {CRAFTS.map(c => {
                    const ok = canCraft(c);
                    return (
                      <div key={c.id} className={`p-2.5 rounded-xl border ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-muted/30"}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.desc}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {Object.entries(c.cost).map(([r, n]) => (
                                <span key={r} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${(saveRef.current.inv[r] || 0) >= n ? "border-emerald-500/40 text-emerald-400" : "border-red-500/30 text-red-400"}`}>
                                  {r} x{n} ({saveRef.current.inv[r] || 0})
                                </span>
                              ))}
                            </div>
                          </div>
                          <button onClick={() => doCraft(c)} disabled={!ok}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 ${ok ? "bg-emerald-500 text-white active:scale-95" : "bg-muted text-muted-foreground opacity-50"}`}>
                            {c.pick !== undefined && c.pick !== saveRef.current.pick + 1 ? "Bloqueada" : "Forjar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {modal === "mercado" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Vende recursos e o ouro vai direto para a tua carteira do RPG (aba Economia).</p>
                  {RES_META.filter(r => (PRICES[r.id] ?? 0) > 0).map(r => (
                    <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl border border-border bg-muted/30">
                      <span className="w-5 h-5 rounded-sm border border-black/40 shrink-0" style={{ background: r.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">{r.label} <span className="text-muted-foreground font-medium">x{inv[r.id] || 0}</span></p>
                        <p className="text-[10px] text-yellow-500 font-bold">{PRICES[r.id]} ouro /un</p>
                      </div>
                      <button onClick={() => sellRes(r.id, false)} disabled={!inv[r.id]}
                        className="px-2.5 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 text-[10px] font-black disabled:opacity-40">Vender 1</button>
                      <button onClick={() => sellRes(r.id, true)} disabled={!inv[r.id]}
                        className="px-2.5 py-1.5 rounded-lg bg-yellow-500 text-white text-[10px] font-black disabled:opacity-40 active:scale-95">Tudo</button>
                    </div>
                  ))}
                </div>
              )}

              {modal === "sorteios" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Sorteios reais da plataforma, sincronizados ao vivo. Os bilhetes dos baús dourados servem para participar!</p>
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">{liveErr}</div>}
                  {!liveRaffles && !liveErr && <p className="text-[11px] text-muted-foreground animate-pulse">A carregar sorteios ao vivo…</p>}
                  {liveRaffles && liveRaffles.length === 0 && <div className="p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground text-center">Sem sorteios ativos agora — volta em breve! 🎉</div>}
                  {liveRaffles?.map(r => {
                    const sold = r.sold_tickets ?? 0, total = r.total_tickets ?? 0;
                    const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                    const price = r.raffle_type === "free" ? "Grátis" : r.raffle_type === "points" ? `${r.points_cost ?? 0} pts` : fmtMzn(r.ticket_price);
                    const cd = fmtCountdown(r.end_date);
                    return (
                      <button key={r.id} onClick={() => { propsRef.current.notify(`🎁 ${r.title}`); setModal(null); setTimeout(() => propsRef.current.navigate(`/raffle/${r.slug || r.id}`), 300); }}
                        className="w-full text-left p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 active:scale-[0.98] transition-transform">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{r.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.prize_title}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-black text-amber-400">{price}</p>
                            {cd && <p className="text-[9px] text-muted-foreground">⏳ {cd}</p>}
                          </div>
                        </div>
                        {total > 0 && (
                          <div className="mt-1.5">
                            <div className="h-1.5 rounded-full bg-black/30 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${pct}%` }} /></div>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{sold}/{total} bilhetes · {pct}%</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <button onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate("/marketplace"), 300); }} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-black active:scale-95">Ver todos os sorteios →</button>
                </div>
              )}

              {modal === "feira" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Tudo o que a plataforma tem à venda e para jogar — direto do mundo.</p>
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">{liveErr}</div>}
                  {!liveFeira && !liveErr && <p className="text-[11px] text-muted-foreground animate-pulse">A abrir a feira…</p>}
                  {liveFeira && liveFeira.contests.length === 0 && <div className="p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground text-center">Sem concursos ativos agora.</div>}
                  {liveFeira?.contests.map(c => (
                    <button key={c.id} onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate(`/concursos/${c.id}`), 300); }}
                      className="w-full text-left p-2.5 rounded-xl border border-pink-500/30 bg-pink-500/5 flex items-center gap-2 active:scale-[0.98] transition-transform">
                      <span className="text-lg">🎪</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.status === "voting" ? "🗳 Em votação" : "🟢 Ativo"}</p>
                      </div>
                      <span className="text-[10px] font-black text-pink-400">Participar →</span>
                    </button>
                  ))}
                  {liveFeira && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate("/jogos"), 300); }} className="p-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 text-center active:scale-95">
                        <p className="text-lg">🎡</p><p className="text-[10px] font-bold">{liveFeira.wheels} Rodas da Sorte</p>
                      </button>
                      <button onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate("/jogos"), 300); }} className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center active:scale-95">
                        <p className="text-lg">💰</p><p className="text-[10px] font-bold">{liveFeira.mills} Jogos do Milionário</p>
                      </button>
                    </div>
                  )}
                  <button onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate("/marketplace"), 300); }} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-black active:scale-95">Abrir o Mercado completo →</button>
                </div>
              )}

              {modal === "arena" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">Torneios reais da plataforma com prémios — compete com outros jogadores!</p>
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">{liveErr}</div>}
                  {!liveTours && !liveErr && <p className="text-[11px] text-muted-foreground animate-pulse">A carregar torneios…</p>}
                  {liveTours && liveTours.length === 0 && <div className="p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground text-center">Sem torneios ativos — participa nos concursos! 🎪</div>}
                  {liveTours?.map(t => (
                    <button key={t.id} onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate(`/tournaments/${t.id}`), 300); }}
                      className="w-full text-left p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 active:scale-[0.98] transition-transform">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{t.prize_description || "Com prémio especial"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {t.prize_value != null && <p className="text-[10px] font-black text-yellow-400">{t.prize_value} {t.currency || "MT"}</p>}
                          <p className="text-[9px] text-muted-foreground">⏳ {fmtCountdown(t.end_date)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => { setModal(null); setTimeout(() => propsRef.current.navigate("/tournaments"), 300); }} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-black active:scale-95">Todos os torneios →</button>
                </div>
              )}

              {modal === "questboard" && (() => {
                const s = ensurePqDay();
                const quests = [
                  { icon: "🎁", label: "Abre um Baú de Sorteio", done: s.pqChest, reward: 25, hint: "baús dourados no minimapa" },
                  { icon: "⚔️", label: "Derrota 1 zumbi", done: s.pqKill, reward: 30, hint: "à noite eles surgem" },
                  { icon: "⛏️", label: `Minera 10 blocos (${Math.min(s.dayMined, 10)}/10)`, done: s.pqMine, reward: 40, hint: "qualquer bloco conta" },
                ];
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Missões de hoje — ligam o mundo à plataforma. Recomeçam a cada dia!</p>
                    {quests.map(q => (
                      <div key={q.label} className={`p-2.5 rounded-xl border ${q.done ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-muted/30"} flex items-center gap-2`}>
                        <span className="text-lg">{q.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold">{q.label}</p>
                          <p className="text-[10px] text-muted-foreground">{q.hint} · +{q.reward} ouro</p>
                        </div>
                        <span className={`text-[10px] font-black ${q.done ? "text-emerald-400" : "text-muted-foreground"}`}>{q.done ? "✓ Feita" : "…"}</span>
                      </div>
                    ))}
                    <p className="text-[10px] font-bold text-primary mt-1">🌐 Missões da plataforma:</p>
                    <button onClick={() => claimPq("pqMarket", 20, 10, "/marketplace", "Mercado visitado!")}
                      disabled={s.pqMarket}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2 active:scale-[0.98] transition-transform ${s.pqMarket ? "border-emerald-500/40 bg-emerald-500/10 opacity-70" : "border-pink-500/30 bg-pink-500/5"}`}>
                      <span className="text-lg">🛒</span>
                      <div className="flex-1"><p className="text-xs font-bold">Visita o Mercado da plataforma</p><p className="text-[10px] text-muted-foreground">vê os sorteios à venda · +20 ouro +10 XP</p></div>
                      <span className="text-[10px] font-black text-pink-400">{s.pqMarket ? "✓" : "Ir →"}</span>
                    </button>
                    <button onClick={() => claimPq("pqJogos", 20, 10, "/jogos", "Jogo jogado!")}
                      disabled={s.pqJogos}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2 active:scale-[0.98] transition-transform ${s.pqJogos ? "border-emerald-500/40 bg-emerald-500/10 opacity-70" : "border-violet-500/30 bg-violet-500/5"}`}>
                      <span className="text-lg">🕹</span>
                      <div className="flex-1"><p className="text-xs font-bold">Joga um jogo da plataforma</p><p className="text-[10px] text-muted-foreground">90+ jogos no Arcade · +20 ouro +10 XP</p></div>
                      <span className="text-[10px] font-black text-violet-400">{s.pqJogos ? "✓" : "Ir →"}</span>
                    </button>
                  </div>
                );
              })()}

              {modal === "ajuda" && (
                <div className="space-y-3 text-[11px] leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-muted/40">
                    <p className="font-bold text-xs mb-1">🎮 Controles</p>
                    <p className="text-muted-foreground"><b>Mover:</b> joystick ou A/D · <b>Saltar:</b> botão ou Espaço · <b>Minerar:</b> segurar bloco com o dedo/rato ou botão MINERAR · <b>Construir:</b> seleciona um recurso na hotbar e toca em PÔR · <b>Atacar:</b> botão ATACAR ou F · <b>Interagir:</b> botão AÇÃO ou E</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <p className="font-bold text-xs mb-1">🎟 Baús de Sorteio</p>
                    <p className="text-muted-foreground">Espalhados pelo mundo (dourados no minimapa). Dão <b>bilhetes de sorteio</b> + ouro todo dia. Usa os bilhetes em <b>Sorteios</b> para concorrer a prémios reais da plataforma.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25">
                    <p className="font-bold text-xs mb-1">🕹 Portais</p>
                    <p className="text-muted-foreground">O <b>Portal Arcade</b> leva-te aos jogos da plataforma e o <b>Portal do Mercado</b> à loja de vendas. Entrar dá XP para o teu personagem RPG.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <p className="font-bold text-xs mb-1">🌍 Mundo sincronizado com a plataforma</p>
                    <p className="text-muted-foreground">O <b>Mural de Sorteios</b> mostra os sorteios reais ao vivo (prémio, preço, contagem) — toca para participar. A <b>Feira</b> mostra o que a plataforma tem à venda (concursos, rodas, milionário). A <b>Arena</b> lista os torneios ativos com prémios. O <b>Quadro de Missões</b> dá ouro diário por jogar a plataforma inteira!</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                    <p className="font-bold text-xs mb-1">🌙 Ciclo dia/noite</p>
                    <p className="text-muted-foreground">À noite surgem <b>zumbis</b> — luta ou constrói abrigo com tábuas e torças. De dia caça <b>porcos</b> para recuperar vida. Derrotar zumbis dá ouro + XP + progresso nas quests.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <p className="font-bold text-xs mb-1">⛏ Economia</p>
                    <p className="text-muted-foreground">Minera madeira, pedra, ferro e diamantes. Vende ao <b>Mercador</b> perto do spawn ou forja picaretas melhores na <b>Oficina</b>. Tudo alimenta a economia do teu personagem na plataforma.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40">
                    <p className="font-bold text-xs mb-1">🚀 Em breve</p>
                    <p className="text-muted-foreground">Multijogador em tempo real no mesmo mundo · masmorras com bosses · biomas (deserto, neve) · montarias · casas visitáveis por amigos · leilões de terrenos.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




