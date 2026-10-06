// ============================================================
// BATEU WORLD — MMO 3D da plataforma (estilo Hordes.io) · v3
// Níveis, poderes por classe, missões/saga/desafios, PvP com
// roubo de cupões e pontos, Banco de Pontos (moeda da
// plataforma), descobertas, partículas e transições.
// v3: HUD em vidro, barras de chefe e buffs, rastreador de
// objetivos, banners cinematográficos, emotes, áudio sintetizado
// e ecrã de criação redesenhado.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Sparkles, ArrowUp, User, ScrollText, Trophy, MessageSquare,
  X, Copy, Coins, Heart, Zap, Crown, ExternalLink, Check, Wifi, Users,
  Landmark, Map, Shield, Flame, Volume2, VolumeX, MapPin, Smile, Target,
} from "lucide-react";
import confetti from "canvas-confetti";
import { WorldEngine, SKILLS, LANDMARKS, PVP_SAFE_RADIUS } from "./worldEngine";
import { worldAudio } from "./worldAudio";
import {
  fetchPlatformData, upsertCharacter, setCharacterOffline,
  worldRoute, fmtMZN, voucherLabel, MODALITY_LABEL, exchangeWorldPoints,
  type PlatformData,
} from "./platformSync";

// @ts-nocheck

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
  onNavigate?: (route: string) => void;
}

interface Char {
  uid: string;
  name: string;
  classId: number;
  level: number;
  xp: number;
  gold: number;
  points: number;      // pontos de atributo
  allocAtk: number;
  allocHp: number;
  allocSpd: number;
  kills: number;
  deaths: number;
  streak: number;
  lastDaily: string;
  vouchers: { id: string; code: string; label: string }[];
  quests: { date: string; kills: number; chest: number; visit: number; steal: number; cK: boolean; cC: boolean; cV: boolean; cS: boolean };
  // v2
  pts: number;         // Pontos de Troféu (economia do mundo)
  discoveries: string[];
  sagaIdx: number;
  saga: { kills: number; bosses: number; chests: number; steals: number; discovers: number };
  chal: { date: string; c1: boolean; c2: boolean };
  stolenFrom: number;
  lostTo: number;
  shieldUntil: number;
}

const LS_KEY = "bateu_world_char_v3";
const LS_KEY_V2 = "bateu_world_char_v2";
const CLASSES = [
  { name: "Guerreiro", emoji: "⚔️", color: "#ef4444", grad: "from-red-500 to-rose-600", desc: "Combate corpo a corpo, vida alta" },
  { name: "Mago", emoji: "🔮", color: "#8b5cf6", grad: "from-violet-500 to-purple-600", desc: "Explosões arcanas e meteoros" },
  { name: "Arqueiro", emoji: "🏹", color: "#22c55e", grad: "from-green-500 to-emerald-600", desc: "Chuvas de flechas e esquivas" },
  { name: "Curandeiro", emoji: "🌿", color: "#06b6d4", grad: "from-cyan-500 to-teal-600", desc: "Cura-se enquanto fere os inimigos" },
];

const TITLES: { lvl: number; title: string }[] = [
  { lvl: 1, title: "Novato" }, { lvl: 3, title: "Aprendiz" }, { lvl: 5, title: "Caçador" },
  { lvl: 8, title: "Guerreiro" }, { lvl: 12, title: "Veterano" }, { lvl: 16, title: "Elite" },
  { lvl: 20, title: "Campeão" }, { lvl: 26, title: "Mestre" }, { lvl: 33, title: "Grão-Mestre" },
  { lvl: 40, title: "Lenda do Mundo" },
];

function titleFor(level: number): string {
  let t = TITLES[0].title;
  for (const tt of TITLES) if (level >= tt.lvl) t = tt.title;
  return t;
}

function xpNeeded(level: number): number {
  return Math.round(80 * Math.pow(level, 1.45));
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function newChar(name: string, classId: number): Char {
  return {
    uid: "bw_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    name: name.slice(0, 14), classId, level: 1, xp: 0, gold: 50, points: 0,
    allocAtk: 0, allocHp: 0, allocSpd: 0,
    kills: 0, deaths: 0, streak: 0,
    lastDaily: "", vouchers: [],
    quests: { date: todayStr(), kills: 0, chest: 0, visit: 0, steal: 0, cK: false, cC: false, cV: false, cS: false },
    pts: 0, discoveries: [], sagaIdx: 0,
    saga: { kills: 0, bosses: 0, chests: 0, steals: 0, discovers: 0 },
    chal: { date: todayStr(), c1: false, c2: false },
    stolenFrom: 0, lostTo: 0, shieldUntil: 0,
  };
}

function migrateV2(old: any): Char {
  const c = newChar(old.name || "Herói", old.classId ?? 0);
  Object.assign(c, {
    uid: old.uid, level: old.level ?? 1, xp: old.xp ?? 0, gold: old.gold ?? 50,
    points: old.points ?? 0, allocAtk: old.allocAtk ?? 0, allocHp: old.allocHp ?? 0,
    allocSpd: old.allocSpd ?? 0, kills: old.kills ?? 0, deaths: old.deaths ?? 0,
    streak: old.streak ?? 0, lastDaily: old.lastDaily ?? "",
    vouchers: Array.isArray(old.vouchers) ? old.vouchers : [],
  });
  if (old.quests?.date === todayStr()) {
    c.quests = { ...c.quests, ...old.quests, steal: 0, cS: false };
  }
  return c;
}

function loadChar(): Char | null {
  try {
    let raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem(LS_KEY_V2);
      if (oldRaw) {
        const c = migrateV2(JSON.parse(oldRaw));
        localStorage.setItem(LS_KEY, JSON.stringify(c));
        return c;
      }
      return null;
    }
    const c = JSON.parse(raw) as Char;
    if (!c?.name || !c?.uid) return null;
    if (c.quests?.date !== todayStr()) {
      c.quests = { date: todayStr(), kills: 0, chest: 0, visit: 0, steal: 0, cK: false, cC: false, cV: false, cS: false };
    }
    if (c.chal?.date !== todayStr()) {
      c.chal = { date: todayStr(), c1: false, c2: false };
    }
    c.saga = c.saga || { kills: 0, bosses: 0, chests: 0, steals: 0, discovers: 0 };
    c.discoveries = c.discoveries || [];
    c.pts = c.pts || 0;
    return c;
  } catch { return null; }
}

function calcStats(c: Char) {
  const baseAtk = [12, 11, 10, 9][c.classId] ?? 11;
  return {
    atk: baseAtk + c.allocAtk + Math.floor((c.level - 1) * 1.2),
    maxHp: 100 + (c.level - 1) * 10 + c.allocHp * 12,
    spd: 6 + c.allocSpd * 0.6,
  };
}

const CLS_NAMES = ["Guerreiro", "Mago", "Arqueiro", "Curandeiro"];
const CLS_EMOJIS = ["⚔️", "🔮", "🏹", "🌿"];

// ── Saga: cadeia de missões permanente ──────────────────────
const SAGA: { title: string; desc: string; prog: (c: Char) => number; goal: number; reward: string; apply: (c: Char) => void }[] = [
  { title: "1 · Primeiros Passos", desc: "Derrota 5 inimigos", prog: (c) => c.saga.kills, goal: 5, reward: "+100 ouro · +10 pts", apply: (c) => { c.gold += 100; c.pts += 10; } },
  { title: "2 · Explorador", desc: "Descobre 3 marcos do mundo", prog: (c) => c.saga.discovers, goal: 3, reward: "+80 XP · +15 pts", apply: (c) => { c.xp += 80; c.pts += 15; } },
  { title: "3 · Caçador de Bugs", desc: "Derrota 20 inimigos", prog: (c) => c.saga.kills, goal: 20, reward: "+250 ouro · +20 pts", apply: (c) => { c.gold += 250; c.pts += 20; } },
  { title: "4 · Tesoureiro", desc: "Abre 3 baús de cupões", prog: (c) => c.saga.chests, goal: 3, reward: "+150 XP · +25 pts", apply: (c) => { c.xp += 150; c.pts += 25; } },
  { title: "5 · Face a Face", desc: "Derrota 1 chefe (Bug Rei ou Rainha)", prog: (c) => c.saga.bosses, goal: 1, reward: "+500 ouro · +40 pts", apply: (c) => { c.gold += 500; c.pts += 40; } },
  { title: "6 · Sangue Frio", desc: "Rouba pontos/cupões a 1 jogador", prog: (c) => c.saga.steals, goal: 1, reward: "+200 XP · +30 pts", apply: (c) => { c.xp += 200; c.pts += 30; } },
  { title: "7 · Veterano", desc: "Alcança o nível 8", prog: (c) => c.level, goal: 8, reward: "+400 ouro · +40 pts", apply: (c) => { c.gold += 400; c.pts += 40; } },
  { title: "8 · Cartógrafo", desc: "Descobre 7 marcos do mundo", prog: (c) => c.saga.discovers, goal: 7, reward: "+300 XP · +50 pts", apply: (c) => { c.xp += 300; c.pts += 50; } },
  { title: "9 · Conquistador", desc: "Derrota 2 chefes", prog: (c) => c.saga.bosses, goal: 2, reward: "+800 ouro · +80 pts", apply: (c) => { c.gold += 800; c.pts += 80; } },
  { title: "10 · Lenda do Mundo", desc: "Alcança o nível 15", prog: (c) => c.level, goal: 15, reward: "+1500 ouro · +150 pts", apply: (c) => { c.gold += 1500; c.pts += 150; } },
];

// ── Banco de Pontos: trocas ─────────────────────────────────
const EXCHANGES = [
  { id: "gold", cost: 20, emoji: "💰", title: "200 de Ouro", desc: "Ouro na hora para equipar o herói" },
  { id: "shield", cost: 30, emoji: "🛡️", title: "Escudo 10 min", desc: "Protege-te de roubos PvP" },
  { id: "ticket", cost: 60, emoji: "🎫", title: "Bilhete de Sorteio", desc: "Participa num sorteio real da plataforma" },
  { id: "voucher", cost: 120, emoji: "🎟️", title: "Cupão Real", desc: "Um cupão de desconto verdadeiro para as compras" },
  { id: "cash", cost: 250, emoji: "💵", title: "10 MT na Carteira", desc: "Moeda real da plataforma — requer conta com carteira" },
];

export default function BateuWorld({ onScore, onNavigate }: Props) {
  const [phase, setPhase] = useState<"boot" | "create" | "world">("boot");
  const [char, setChar] = useState<Char | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pickClass, setPickClass] = useState(0);
  const [platform, setPlatform] = useState<PlatformData | null>(null);
  const [bootMsg, setBootMsg] = useState("A preparar o mundo...");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const charRef = useRef<Char | null>(null);
  const platformRef = useRef<PlatformData | null>(null);
  const scoreRef = useRef(onScore);
  scoreRef.current = onScore;

  // HUD
  const [hud, setHud] = useState({ hp: 100, maxHp: 100, hit: 0 });
  const [near, setNear] = useState<string | null>(null);
  const [online, setOnline] = useState(1);
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: string }[]>([]);
  const [panel, setPanel] = useState<"none" | "char" | "quests" | "rank" | "bank">("none");
  const [questTab, setQuestTab] = useState<"daily" | "saga" | "chal">("daily");
  const [card, setCard] = useState<{ kind: string; id: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<{ n: string; m: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [deathFx, setDeathFx] = useState(false);
  const [skillState, setSkillState] = useState<{ locked: boolean; cd: number }>({ locked: true, cd: 0 });
  const [skillCds, setSkillCds] = useState([0, 0, 0]);

  // v3 — HUD cinematográfico
  const [muted, setMuted] = useState(worldAudio.isMuted);
  const [bossBar, setBossBar] = useState<{ name: string; pct: number } | null>(null);
  const [buffs, setBuffs] = useState({ atk: 0, hot: 0 });
  const [banner, setBanner] = useState<{ kind: "discover" | "levelup"; emoji: string; title: string; sub: string } | null>(null);
  const [emoteOpen, setEmoteOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const bannerTimer = useRef<any>(null);

  const EMOTES = ["👋", "😄", "❤️", "😤", "🎉", "🙏"];
  const TIPS = [
    "💡 Aproxima-te de um baú e prime E (ou toca no botão) para abrir",
    "⚔️ Clique no mundo = atacar. Perto de jogadores = PvP com roubo!",
    "🗺️ Explore o mapa para descobrir 11 marcos — cada um dá XP e pontos",
    "🏦 Reúne Pontos de Troféu e troca por cupões ou moeda real no Banco",
    "👑 Os chefes Bug Rei e Rainha Sombria guardam os cantos do mapa",
    "🛡️ Foste roubado? Tens 3 minutos de escudo — usa bem o tempo",
    "❤️ A Fonte da Vida (junto ao Banco) cura-te de graça",
    "🔥 Entra todos os dias: o streak aumenta o bónus de presença",
  ];

  const toastId = useRef(0);
  const pushToast = useCallback((msg: string, tone = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // ── v3: banner cinematográfico (descoberta / level-up) ─────
  const showBanner = useCallback((b: { kind: "discover" | "levelup"; emoji: string; title: string; sub: string }) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner(b);
    bannerTimer.current = setTimeout(() => setBanner(null), b.kind === "levelup" ? 1900 : 2600);
  }, []);

  // v3: desbloquear áudio no primeiro gesto + atalho M para mute
  useEffect(() => {
    const unlock = () => { worldAudio.ensure(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "m") setMuted(worldAudio.toggleMute());
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // v3: polling de chefe + buffs (300ms)
  useEffect(() => {
    if (phase !== "world") return;
    const iv = setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      const bb = eng.getBossBar?.() || null;
      setBossBar(bb ? { name: bb.name, pct: bb.pct } : null);
      const bf = eng.getBuffs?.() || { atk: 0, hot: 0 };
      setBuffs(bf);
    }, 300);
    return () => clearInterval(iv);
  }, [phase]);

  // v3: dicas rotativas
  useEffect(() => {
    if (phase !== "world") return;
    const iv = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Boot ───────────────────────────────────────────────────
  useEffect(() => {
    const c = loadChar();
    if (c) { persist(c); setChar(c); setPhase("world"); }
    else setPhase("create");
    let alive = true;
    (async () => {
      setBootMsg("A carregar sorteios, feira e cupões...");
      const data = await fetchPlatformData();
      if (!alive) return;
      platformRef.current = data;
      setPlatform(data);
      const eng = engineRef.current;
      if (eng) {
        eng.spawnPlatformObjects({
          raffles: data.raffles.map((r) => ({ id: r.id, title: r.title, prizeTitle: r.prizeTitle })),
          contests: data.contests.map((x) => ({ id: x.id, title: x.title, prize: x.prize })),
          vouchers: data.vouchers.map((v) => ({ id: v.id, code: v.code, label: voucherLabel(v) })),
          assets: data.assets.map((a) => ({ id: a.id, title: a.title, value: a.value, modality: a.modality })),
        });
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Persistência ───────────────────────────────────────────
  const persist = useCallback((c: Char) => {
    charRef.current = c;
    try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!char) return;
    charRef.current = char;
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(char)); } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [char]);

  // Sincronização com a base a cada 20s
  useEffect(() => {
    if (phase !== "world" || !char) return;
    const iv = setInterval(() => {
      const c = charRef.current;
      if (!c) return;
      const s = calcStats(c);
      upsertCharacter({
        guest_id: c.uid, name: c.name, class_id: c.classId, level: c.level, xp: c.xp,
        gold: c.gold, hp: s.maxHp, max_hp: s.maxHp, atk: s.atk, spd: Math.round(s.spd),
        total_kills: c.kills, is_online: true,
      });
    }, 20000);
    return () => {
      clearInterval(iv);
      const c = charRef.current;
      if (c) setCharacterOffline(c.uid);
    };
  }, [phase, char?.uid]);

  // ── Subida de nível ────────────────────────────────────────
  const applyXp = useCallback((p: Char, addXp: number): Char => {
    let { level, points } = p;
    let xp = p.xp + addXp;
    let leveled = false;
    while (xp >= xpNeeded(level) && level < 60) {
      xp -= xpNeeded(level);
      level += 1;
      points += 3;
      leveled = true;
    }
    if (leveled) {
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 }, colors: ["#f43f5e", "#fbbf24", "#38bdf8"] });
      pushToast(`🎉 Subiste para o nível ${level}! ${titleFor(level)} · +3 pontos`, "good");
      showBanner({ kind: "levelup", emoji: "⚡", title: `NÍVEL ${level}`, sub: `${titleFor(level)} · +3 pontos de atributo` });
      engineRef.current?.levelFx();
      scoreRef.current?.("Bateu World", level * 1000);
      setTimeout(() => {
        const s = calcStats({ ...p, level });
        engineRef.current?.syncStats(s, level);
        engineRef.current?.healFull();
      }, 30);
    }
    return { ...p, xp, level, points };
  }, [pushToast, showBanner]);

  // ── Entrada no mundo ───────────────────────────────────────
  const enterWorld = useCallback((c: Char) => {
    const today = todayStr();
    if (c.lastDaily !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      c.streak = c.lastDaily === yesterday ? c.streak + 1 : 1;
      c.lastDaily = today;
      const bonus = 150 + c.streak * 50;
      c.gold += bonus;
      c.pts += 5;
      setTimeout(() => pushToast(`🔥 Presença diária: +${bonus} ouro · +5 pts (streak ${c.streak})`, "good"), 900);
    }
    persist(c);
    setChar(c);
    setPhase("world");
  }, [persist, pushToast]);

  // ── Ações do Banco de Pontos ───────────────────────────────
  const doExchange = useCallback(async (id: string) => {
    const c = charRef.current;
    if (!c) return;
    const ex = EXCHANGES.find((e) => e.id === id);
    if (!ex) return;
    if (c.pts < ex.cost) {
      pushToast(`Pontos insuficientes — precisas de ${ex.cost} pts`, "info");
      return;
    }
    setChar((p) => {
      if (!p || p.pts < ex.cost) return p;
      const n = { ...p, pts: p.pts - ex.cost };
      if (id === "gold") { n.gold += 200; pushToast("💰 +200 de ouro no ponto!", "good"); }
      if (id === "shield") {
        const until = Date.now() + 600000;
        n.shieldUntil = until;
        engineRef.current?.setShield(600000);
        pushToast("🛡️ Escudo ativo durante 10 minutos!", "good");
      }
      if (id === "ticket") {
        pushToast("🎫 Bilhete garantido! Boa sorte no sorteio.", "good");
        setTimeout(() => go("/sorteios"), 800);
      }
      if (id === "voucher") {
        const pd = platformRef.current;
        const avail = (pd?.vouchers || []).filter((v) => !p.vouchers.find((x) => x.id === v.id));
        if (avail.length > 0) {
          const v = avail[Math.floor(Math.random() * avail.length)];
          const label = voucherLabel(v);
          n.vouchers = [...p.vouchers, { id: v.id, code: v.code, label }];
          pushToast(`🎟️ Cupão real ${v.code} é teu!`, "good");
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } else {
          n.gold += 300;
          pushToast("Sem cupões novos disponíveis — +300 de ouro como alternativa!", "info");
        }
      }
      if (id === "cash") {
        (async () => {
          const res = await exchangeWorldPoints(ex.cost, p.uid);
          if (res === "ok") pushToast("💵 10 MT creditados na tua carteira!", "good");
          else if (res === "no-auth") {
            pushToast("Entra na tua conta Bateu para receber moeda real — o pedido ficou registado.", "info");
            n.gold += 100; // compensação local enquanto não há conta
          } else {
            pushToast("Conversão em fila — o saldo será creditado na tua conta.", "info");
          }
        })();
      }
      return n;
    });
  }, [pushToast]);

  // ── Motor 3D ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "world" || !canvasRef.current || !char || engineRef.current) return;
    const c = charRef.current!;

    const eng = new WorldEngine(canvasRef.current, {
      name: c.name, classId: c.classId, level: c.level, uid: c.uid,
      stats: calcStats(c),
      onEvent: (ev) => {
        const cur = charRef.current;
        if (!cur) return;
        switch (ev.type) {
          case "hp":
            setHud({ hp: Math.round(ev.hp), maxHp: Math.round(ev.maxHp), hit: ev.hit ? Date.now() : 0 });
            break;
          case "gain": {
            setChar((p) => {
              if (!p) return p;
              const n = { ...p, xp: p.xp + ev.xp, gold: p.gold + ev.gold };
              return applyXp(n, 0);
            });
            break;
          }
          case "kill": {
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date === todayStr()) q.kills += 1; else { q.date = todayStr(); q.kills = 1; }
              const saga = { ...p.saga, kills: p.saga.kills + 1 };
              if (ev.boss) saga.bosses += 1;
              return applyXp({ ...p, kills: p.kills + 1, pts: p.pts + (ev.pts || 1), quests: q, saga }, 0);
            });
            if (ev.boss) pushToast(`👑 Derrotaste o ${ev.name}! +${ev.pts} pts`, "good");
            break;
          }
          case "near":
            setNear(ev.label);
            break;
          case "open":
            handleOpen(ev.kind, ev.id);
            break;
          case "quest":
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date !== todayStr()) { q.date = todayStr(); q.kills = 0; q.chest = 0; q.visit = 0; q.steal = 0; }
              const saga = { ...p.saga };
              if (ev.kind === "chest") { q.chest += 1; saga.chests += 1; }
              if (ev.kind === "visit") q.visit += 1;
              return { ...p, quests: q, saga };
            });
            break;
          case "discover": {
            setChar((p) => {
              if (!p) return p;
              if (p.discoveries.includes(ev.id)) return p;
              const n = applyXp({ ...p, pts: p.pts + 10, discoveries: [...p.discoveries, ev.id], saga: { ...p.saga, discovers: p.saga.discovers + 1 } }, ev.xp);
              return n;
            });
            showBanner({ kind: "discover", emoji: ev.emoji, title: ev.name, sub: "Descoberta! +60 XP · +10 pts" });
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.55 }, colors: ["#fbbf24", "#38bdf8"] });
            break;
          }
          case "skill2": {
            if (!ev.ok) {
              if (ev.reason === "locked") pushToast(`Poder desbloqueia no nível ${ev.lvl}`, "info");
              else if (ev.reason === "cd") setSkillCds((s) => s.map((v, i) => (i === ev.slot ? Math.max(v, ev.remain) : v)));
            } else {
              setSkillCds((s) => s.map((v, i) => (i === ev.slot ? ev.cd : v)));
            }
            break;
          }
          case "pvphitby":
            pushToast(`⚔️ ${ev.name} atacou-te (-${ev.dmg})!`, "bad");
            break;
          case "pvp": {
            if (ev.action === "steal") {
              setChar((p) => {
                if (!p) return p;
                const n = { ...p, pts: p.pts + (ev.pts || 0), stolenFrom: p.stolenFrom + 1, saga: { ...p.saga, steals: p.saga.steals + 1 } };
                const q = { ...p.quests };
                if (q.date === todayStr()) q.steal += 1; else { q.date = todayStr(); q.steal = 1; }
                n.quests = q;
                if (ev.coupon) n.vouchers = [...p.vouchers, ev.coupon];
                return n;
              });
              pushToast(`💀 Roubaste ${ev.pts} pts a ${ev.victim}${ev.coupon ? ` + cupão ${ev.coupon.code}!` : "!"}`, "good");
              worldAudio.play("steal");
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ["#f43f5e", "#fbbf24"] });
            } else if (ev.action === "death") {
              // Fui roubado — calcula perdas e transmite
              setChar((p) => {
                if (!p) return p;
                const stolenPts = Math.min(p.pts, Math.max(10, Math.ceil(p.pts * 0.25)));
                let coupon = null;
                if (p.vouchers.length > 0 && Math.random() < 0.35) {
                  coupon = p.vouchers[Math.floor(Math.random() * p.vouchers.length)];
                }
                const n: Char = {
                  ...p,
                  pts: p.pts - stolenPts,
                  vouchers: coupon ? p.vouchers.filter((v) => v.id !== coupon.id) : p.vouchers,
                  lostTo: p.lostTo + 1,
                  deaths: p.deaths + 1,
                  shieldUntil: Date.now() + 180000,
                };
                engineRef.current?.setShield(180000);
                engineRef.current?.broadcastPvpDeath(ev.killerId, ev.by, stolenPts, coupon);
                return n;
              });
              setDeathFx(true);
              pushToast(`💀 ${ev.by} derrotou-te e roubou-te pontos/cupões! Proteção de 3 min ativa.`, "bad");
              setTimeout(() => setDeathFx(false), 1600);
            } else if (ev.action === "feed") {
              pushToast(`⚔️ ${ev.kn} roubou ${ev.vn}... o mundo é perigoso!`, "info");
            }
            break;
          }
          case "notify":
            pushToast(ev.msg, ev.tone);
            break;
          case "chat":
            setChatMsgs((m) => [...m.slice(-30), { n: ev.name, m: ev.msg }]);
            break;
          case "online":
            setOnline(Math.max(1, ev.count));
            break;
          case "playerjoin":
            if (ev.name) pushToast(`👋 ${String(ev.name).slice(0, 12)} entrou no mundo`, "info");
            break;
          case "death":
            setDeathFx(true);
            pushToast(`💀 Foste derrotado por ${ev.by}...`, "bad");
            setChar((p) => (p ? { ...p, deaths: p.deaths + 1 } : p));
            setTimeout(() => setDeathFx(false), 1600);
            break;
        }
      },
    });
    engineRef.current = eng;
    (window as any).__bw = eng; // debug hook
    if (platformRef.current) {
      eng.spawnPlatformObjects({
        raffles: platformRef.current.raffles.map((r) => ({ id: r.id, title: r.title, prizeTitle: r.prizeTitle })),
        contests: platformRef.current.contests.map((x) => ({ id: x.id, title: x.title, prize: x.prize })),
        vouchers: platformRef.current.vouchers.map((v) => ({ id: v.id, code: v.code, label: voucherLabel(v) })),
        assets: platformRef.current.assets.map((a) => ({ id: a.id, title: a.title, value: a.value, modality: a.modality })),
      });
    }

    return () => {
      eng.dispose();
      engineRef.current = null;
    };
  }, [phase, char?.uid]);

  const handleOpen = useCallback((kind: string, id: string) => {
    const c = charRef.current;
    if (kind === "voucher") {
      const pd = platformRef.current;
      const v = pd?.vouchers.find((x) => x.id === id);
      if (v && c && !c.vouchers.find((x) => x.id === v.id)) {
        const label = voucherLabel(v);
        setChar((p) => (p ? { ...p, vouchers: [...p.vouchers, { id: v.id, code: v.code, label }], gold: p.gold + 25 } : p));
        setCard({ kind, id });
        pushToast(`🎟️ Cupão ${v.code} guardado no teu perfil!`, "good");
      } else if (v) {
        setCard({ kind, id });
      } else {
        setChar((p) => (p ? { ...p, gold: p.gold + 60 } : p));
        pushToast("💰 Baú aberto: +60 ouro!", "good");
      }
      return;
    }
    if (kind === "bank") { setPanel("bank"); return; }
    setCard({ kind, id });
  }, [pushToast]);

  // cooldown dos poderes
  useEffect(() => {
    if (!skillCds.some((c) => c > 0)) return;
    const t = setTimeout(() => setSkillCds((s) => s.map((v) => Math.max(0, v - 1))), 1000);
    return () => clearTimeout(t);
  }, [skillCds]);

  // sincroniza stats com o motor
  useEffect(() => {
    if (!char || phase !== "world") return;
    const s = calcStats(char);
    engineRef.current?.syncStats(s, char.level);
  }, [char?.allocAtk, char?.allocHp, char?.allocSpd, char?.level, phase]);

  // minimapa
  useEffect(() => {
    if (phase !== "world") return;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const cv = document.getElementById("bw-minimap") as HTMLCanvasElement | null;
      const eng = engineRef.current;
      if (!cv || !eng) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const d = eng.getMinimap();
      const S = 100;
      const toMap = (x: number, z: number) => [S / 2 + (x / 320) * S, S / 2 + (z / 320) * S];
      ctx.clearRect(0, 0, S, S);
      ctx.fillStyle = "rgba(10,14,25,0.85)";
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = "rgba(120,140,180,0.4)";
      ctx.strokeRect(1, 1, S - 2, S - 2);
      ctx.fillStyle = "rgba(120,140,180,0.5)";
      ctx.fillRect(S / 2 - 1, 4, 2, S - 8);
      ctx.fillRect(4, S / 2 - 1, S - 8, 2);
      // marcos/descobertas
      for (const m of d.marks || []) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = m.found ? "#fbbf24" : "rgba(160,170,190,0.5)";
        ctx.font = "7px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(m.found ? "★" : "·", mx, my + 2);
      }
      for (const p of d.pois) {
        const [mx, my] = toMap(p.x, p.z);
        ctx.fillStyle = { raffle: "#c084fc", asset: "#fbbf24", contest: "#f59e0b", voucher: "#f87171", games: "#38bdf8", bank: "#fde047" }[p.k] || "#fff";
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, 7); ctx.fill();
      }
      for (const m of d.mobs) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = ["#4ade80", "#f97316", "#a855f7", "#38bdf8", "#f43f5e"][m.t] || "#fff";
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      }
      for (const pl of d.players) {
        const [mx, my] = toMap(pl.x, pl.z);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath(); ctx.arc(mx, my, 2, 0, 7); ctx.fill();
      }
      const [px, py] = toMap(d.px, d.pz);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(px, py - 4); ctx.lineTo(px + 3, py + 3); ctx.lineTo(px - 3, py + 3);
      ctx.closePath(); ctx.fill();
    };
    const iv = setInterval(draw, 220);
    return () => { alive = false; clearInterval(iv); };
  }, [phase]);

  // ── Ações ──────────────────────────────────────────────────
  const allocate = (kind: "atk" | "hp" | "spd") => {
    setChar((p) => {
      if (!p || p.points <= 0) return p;
      const n = { ...p, points: p.points - 1 };
      if (kind === "atk") n.allocAtk += 1;
      if (kind === "hp") n.allocHp += 1;
      if (kind === "spd") n.allocSpd += 1;
      return n;
    });
  };

  const claimQuest = (k: "K" | "C" | "V" | "S") => {
    setChar((p) => {
      if (!p) return p;
      const q = { ...p.quests };
      const key = k === "K" ? "cK" : k === "C" ? "cC" : k === "V" ? "cV" : "cS";
      if (q[key]) return p;
      const done = k === "K" ? q.kills >= 10 : k === "C" ? q.chest >= 1 : k === "V" ? q.visit >= 1 : q.steal >= 1;
      if (!done) return p;
      q[key] = true;
      let { gold, xp } = p;
      if (k === "K") { gold += 250; }
      if (k === "C") { xp += 120; }
      if (k === "V") { xp += 80; }
      if (k === "S") { gold += 150; }
      const n = applyXp({ ...p, gold, xp, quests: q }, 0);
      pushToast(k === "K" ? "✅ Missão: +250 ouro" : k === "S" ? "✅ Missão de ladrão: +150 ouro" : "✅ Missão concluída: +XP", "good");
      return n;
    });
  };

  const claimChallenge = (c: 1 | 2) => {
    setChar((p) => {
      if (!p || p.chal.date !== todayStr()) return p;
      if (c === 1 && p.chal.c1) return p;
      if (c === 2 && p.chal.c2) return p;
      const can1 = p.quests.kills >= 25;
      const can2 = p.quests.steal >= 2;
      if (c === 1 && !can1) return p;
      if (c === 2 && !can2) return p;
      const n = { ...p, chal: { ...p.chal, ["c" + c]: true } };
      if (c === 1) { n.gold += 400; n.pts += 15; pushToast("🏅 Desafio do Caçador: +400 ouro · +15 pts", "good"); }
      if (c === 2) { n.gold += 300; n.pts += 25; pushToast("🏅 Desafio do Ladrão: +300 ouro · +25 pts", "good"); }
      return n;
    });
  };

  const claimSaga = () => {
    setChar((p) => {
      if (!p) return p;
      const step = SAGA[p.sagaIdx];
      if (!step) return p;
      if (step.prog(p) < step.goal) return p;
      const n: Char = { ...p, sagaIdx: p.sagaIdx + 1, saga: { ...p.saga } };
      step.apply(n);
      confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors: ["#f43f5e", "#fbbf24", "#38bdf8"] });
      pushToast(`📜 SAGA — ${step.title} concluída! ${step.reward}`, "good");
      return applyXp(n, 0);
    });
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMsgs((m) => [...m.slice(-30), { n: charRef.current?.name || "Eu", m: msg }]);
    engineRef.current?.sendChat(msg);
    setChatInput("");
  };

  const go = (route: string) => {
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  };

  const copyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      pushToast("📋 Código copiado!", "good");
    } catch { /* ignore */ }
  };

  // ── Render ─────────────────────────────────────────────────
  if (phase === "boot") {
    return (
      <div className="relative z-10 w-full aspect-[4/3] md:aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 60%, rgba(244,63,94,0.12) 0%, transparent 55%), radial-gradient(circle at 30% 30%, rgba(56,189,248,0.1) 0%, transparent 45%)" }} />
        <motion.div className="text-5xl" animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>🌍</motion.div>
        <p className="font-display font-bold text-xl bg-gradient-to-r from-rose-300 to-amber-200 bg-clip-text text-transparent">Bateu World</p>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {bootMsg}
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-400 to-amber-300" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      </div>
    );
  }

  if (phase === "create") {
    const sel = CLASSES[pickClass];
    return (
      <div className="relative z-10 w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden text-white bg-slate-950" data-testid="bateu-create">
        {/* fundo animado v3 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{ background: [
            "radial-gradient(circle at 70% 20%, #f43f5e 0%, transparent 45%), radial-gradient(circle at 20% 80%, #38bdf8 0%, transparent 40%)",
            "radial-gradient(circle at 30% 70%, #8b5cf6 0%, transparent 45%), radial-gradient(circle at 80% 30%, #fbbf24 0%, transparent 40%)",
            "radial-gradient(circle at 70% 20%, #f43f5e 0%, transparent 45%), radial-gradient(circle at 20% 80%, #38bdf8 0%, transparent 40%)",
          ] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        {/* estrelas decorativas */}
        {[[12, 18], [30, 8], [55, 14], [78, 22], [88, 60], [8, 70], [45, 82], [70, 88]].map(([l, t], i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/70"
            style={{ left: `${l}%`, top: `${t}%` }}
            animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.6, 1] }}
            transition={{ duration: 2.4 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

        <div className="relative h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center gap-3 md:gap-4">
          <div className="text-center">
            <motion.div
              className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/30 to-amber-500/30 border border-white/20 text-3xl shadow-lg shadow-rose-500/20"
              animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >🌍</motion.div>
            <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-rose-300 via-amber-200 to-sky-300 bg-clip-text text-transparent">BATEU WORLD 3D</h2>
            <p className="text-white/70 text-xs md:text-sm mt-0.5">O MMO da plataforma — luta, sobe de nível, rouba cupões e troca pontos por moeda real</p>
          </div>

          {/* classes com anel de seleção v3 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full max-w-lg">
            {CLASSES.map((cl, i) => (
              <motion.button
                key={cl.name}
                onClick={() => { setPickClass(i); worldAudio.play("click"); }}
                whileTap={{ scale: 0.94 }}
                className={`relative rounded-2xl border-2 p-3 text-center transition-all overflow-hidden ${pickClass === i ? "border-white/70 bg-white/15 scale-[1.04]" : "border-white/15 bg-white/5 hover:border-white/40"}`}
              >
                {pickClass === i && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${cl.color}55 0%, transparent 70%)` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <motion.div
                  className={`relative text-3xl mb-1 ${pickClass === i ? "" : "opacity-80"}`}
                  animate={pickClass === i ? { scale: [1, 1.14, 1] } : {}}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >{cl.emoji}</motion.div>
                <p className="relative font-bold text-sm">{cl.name}</p>
                <p className="relative text-[10px] text-white/60 leading-tight mt-0.5">{cl.desc}</p>
                <div className="relative mt-1.5 flex justify-center gap-1">
                  {[0, 1, 2].map((s) => (
                    <span key={s} className={`h-1 w-4 rounded-full ${s === 0 ? "bg-rose-400" : s === 1 ? "bg-emerald-400" : "bg-sky-400"} ${pickClass === i ? "" : "opacity-40"}`} />
                  ))}
                </div>
              </motion.button>
            ))}
          </div>

          <motion.div
            key={sel.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-center text-[11px] text-white/80 backdrop-blur"
          >
            <b style={{ color: sel.color }}>{sel.emoji} {sel.name}</b> — 3 poderes próprios que desbloqueiam nos níveis 3, 7 e 12
          </motion.div>

          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) enterWorld(newChar(nameInput, pickClass)); }}
            placeholder="Nome do teu herói"
            maxLength={14}
            className="w-full max-w-lg rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center font-bold placeholder:text-white/40 outline-none focus:border-rose-400 transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => nameInput.trim() && enterWorld(newChar(nameInput, pickClass))}
            className="relative w-full max-w-lg overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3.5 font-display font-black text-lg shadow-lg shadow-rose-500/30"
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative">ENTRAR NO MUNDO →</span>
          </motion.button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-lg text-[11px] text-white/70">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">⚔️ 3 poderes por classe</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">💀 Rouba cupões no PvP</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🏦 Pontos → moeda real</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🗺️ 11 descobertas</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = char ? calcStats(char) : { atk: 0, maxHp: 100, spd: 6 };
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const xpPct = char ? Math.min(100, (char.xp / xpNeeded(char.level)) * 100) : 0;
  const q = char?.quests;
  const mySkills = SKILLS[char!.classId] || [];
  const shieldActive = (char?.shieldUntil || 0) > Date.now();

  // Dados do card aberto
  let cardData: React.ReactNode = null;
  if (card && platform) {
    if (card.kind === "raffle") {
      const r = platform.raffles.find((x) => x.id === card.id);
      if (r) cardData = (
        <>
          <div className="text-4xl mb-2">🎁</div>
          <h3 className="font-display font-black text-lg">{r.title}</h3>
          <p className="text-sm text-muted-foreground">Prémio: <b className="text-foreground">{r.prizeTitle}</b></p>
          <p className="text-sm text-muted-foreground">Valor: <b className="text-emerald-400">{fmtMZN(r.prizeValue)}</b> · Bilhete: <b>{fmtMZN(r.ticketPrice)}</b></p>
          <button onClick={() => go(worldRoute("raffle", r))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 font-bold text-white hover:bg-rose-400">
            <ExternalLink className="h-4 w-4" /> Participar no Sorteio
          </button>
        </>
      );
    } else if (card.kind === "contest") {
      const c = platform.contests.find((x) => x.id === card.id);
      if (c) cardData = (
        <>
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="font-display font-black text-lg">{c.title}</h3>
          {c.prize && <p className="text-sm text-muted-foreground">Prémio: <b className="text-amber-400">{c.prize}</b></p>}
          {c.description && <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{c.description}</p>}
          <button onClick={() => go(worldRoute("contest", c))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-bold text-white hover:bg-amber-400">
            <ExternalLink className="h-4 w-4" /> Ver Concurso
          </button>
        </>
      );
    } else if (card.kind === "asset") {
      const a = platform.assets.find((x) => x.id === card.id);
      if (a) cardData = (
        <>
          <div className="text-4xl mb-2">🛒</div>
          <h3 className="font-display font-black text-lg">{a.title}</h3>
          <p className="text-sm text-muted-foreground">{MODALITY_LABEL[a.modality] || a.modality} · <b className="text-emerald-400">{fmtMZN(a.value)}</b></p>
          {a.city && <p className="text-xs text-muted-foreground">📍 {a.city}{a.province ? `, ${a.province}` : ""}</p>}
          <button onClick={() => go(worldRoute("asset", a))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-bold text-white hover:bg-emerald-400">
            <ExternalLink className="h-4 w-4" /> Ver / Comprar
          </button>
        </>
      );
    } else if (card.kind === "voucher") {
      const v = platform.vouchers.find((x) => x.id === card.id);
      if (v) {
        const mine = char?.vouchers.find((x) => x.id === v.id);
        cardData = (
          <>
            <div className="text-4xl mb-2">🎟️</div>
            <h3 className="font-display font-black text-lg">Cupão {voucherLabel(v)}</h3>
            <div className="my-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rose-400/60 bg-rose-500/10 px-4 py-3">
              <span className="font-mono font-black tracking-wider text-rose-300">{v.code}</span>
              <button onClick={() => copyCode(v.code)} className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{mine ? "✅ Guardado no teu perfil — usa-o nas compras da plataforma!" : "Guardado no teu perfil de herói."}</p>
          </>
        );
      }
    } else if (card.kind === "games") {
      cardData = (
        <>
          <div className="text-4xl mb-2">🌀</div>
          <h3 className="font-display font-black text-lg">Jogos da Plataforma</h3>
          <p className="text-sm text-muted-foreground">Roleta, Millionaire, quiz e mais de 80 jogos para jogar com amigos.</p>
          <button onClick={() => go("/lives")} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-bold text-white hover:bg-sky-400">
            <ExternalLink className="h-4 w-4" /> Abrir Jogos
          </button>
        </>
      );
    }
  }

  return (
    <div className="relative z-10 w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden bg-slate-900 select-none" data-testid="bateu-world">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* flash de dano / morte */}
      <AnimatePresence>
        {hud.hit > 0 && (
          <motion.div key={`hit-${hud.hit}`} className="pointer-events-none absolute inset-0 bg-red-600/25" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }} />
        )}
        {/* v3: vinheta permanente subtil para foco */}
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 90px 20px rgba(2,6,23,0.55)" }} />
        {deathFx && (
          <motion.div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-red-950/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.p className="font-display text-3xl md:text-4xl font-black text-red-300 drop-shadow-[0_0_18px_rgba(248,113,113,0.8)]" initial={{ scale: 0.6, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
              💀 Derrotado
            </motion.p>
            <motion.p className="text-xs font-bold text-white/70" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}>
              A renascer na Praça Bateu...
            </motion.p>
          </motion.div>
        )}
        {/* v3: banner cinematográfico (descoberta / level-up) */}
        <AnimatePresence>
          {banner && (
            <motion.div
              key={`banner-${banner.title}`}
              className="pointer-events-none absolute left-0 right-0 top-[26%] z-30 flex flex-col items-center"
              initial={{ opacity: 0, y: 26, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <motion.div
                className={`flex items-center gap-3 rounded-2xl border px-6 py-3 shadow-2xl backdrop-blur-md ${banner.kind === "levelup" ? "border-amber-300/60 bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25" : "border-sky-300/60 bg-gradient-to-r from-sky-500/25 via-cyan-400/20 to-sky-500/25"}`}
                animate={{ boxShadow: banner.kind === "levelup" ? ["0 0 24px rgba(251,191,36,0.35)", "0 0 48px rgba(251,191,36,0.6)", "0 0 24px rgba(251,191,36,0.35)"] : ["0 0 24px rgba(56,189,248,0.35)", "0 0 48px rgba(56,189,248,0.6)", "0 0 24px rgba(56,189,248,0.35)"] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <motion.span className="text-4xl" animate={{ rotate: banner.kind === "discover" ? [0, -12, 12, 0] : [0, 8, -8, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                  {banner.emoji}
                </motion.span>
                <div className="text-center">
                  <p className={`font-display text-xl font-black tracking-wide ${banner.kind === "levelup" ? "text-amber-200" : "text-sky-200"}`}>{banner.title}</p>
                  <p className="text-[11px] font-bold text-white/80">{banner.sub}</p>
                </div>
              </motion.div>
              {/* raios laterais */}
              <motion.div
                className="mt-1 h-px w-2/3"
                style={{ background: banner.kind === "levelup" ? "linear-gradient(90deg, transparent, #fbbf24, transparent)" : "linear-gradient(90deg, transparent, #38bdf8, transparent)" }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* v3: barra de CHEFE / guardião */}
      <AnimatePresence>
        {bossBar && (
          <motion.div
            key="bossbar"
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="pointer-events-none absolute left-1/2 top-14 z-20 w-[260px] -translate-x-1/2"
            data-testid="bw-bossbar"
          >
            <div className="rounded-xl border border-red-500/40 bg-black/70 px-3 py-1.5 backdrop-blur">
              <div className="mb-1 flex items-center justify-between text-[10px] font-black">
                <span className="flex items-center gap-1 text-red-300"><Crown className="h-3 w-3" /> {bossBar.name}</span>
                <span className="text-white/60">{Math.ceil(bossBar.pct * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-400" animate={{ width: `${bossBar.pct * 100}%` }} transition={{ duration: 0.25 }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD topo-esquerda v3 (vidro + anel de classe + buffs) */}
      <div className="pointer-events-none absolute left-2 top-2 w-[214px] rounded-2xl border border-white/15 bg-black/55 p-2.5 text-white shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: CLASSES[char!.classId]?.color + "33", border: `1.5px solid ${CLASSES[char!.classId]?.color}` }}>
            {CLS_EMOJIS[char!.classId]}
            {char!.points > 0 && <motion.span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{char!.name} <span className="text-white/60">· Nv{char!.level}</span></p>
            <p className="text-[9px] font-bold tracking-wide text-amber-300/90 -mt-0.5">{titleFor(char!.level)}</p>
            {/* HP com brilho v3 */}
            <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400" animate={{ width: `${hpPct}%` }} transition={{ duration: 0.3 }} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
              {hpPct < 30 && <motion.div className="absolute inset-0 rounded-full bg-red-500/40" animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 0.9, repeat: Infinity }} />}
            </div>
            <div className="relative mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" animate={{ width: `${xpPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{hud.hp}/{hud.maxHp}</span>
          <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" />{char!.gold}</span>
          <span className="inline-flex items-center gap-1 font-black text-yellow-300">🏆 {char!.pts}</span>
        </div>
        {/* v3: chips de buffs ativos */}
        {(shieldActive || buffs.atk > 0 || buffs.hot > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {shieldActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/25 px-1.5 py-0.5 text-[9px] font-bold text-sky-200">
                <Shield className="h-2.5 w-2.5" /> Escudo {Math.ceil(((char!.shieldUntil || 0) - Date.now()) / 60000)}m
              </span>
            )}
            {buffs.atk > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-500/25 px-1.5 py-0.5 text-[9px] font-bold text-red-200">
                <Swords className="h-2.5 w-2.5" /> +50% {Math.ceil(buffs.atk / 1000)}s
              </span>
            )}
            {buffs.hot > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                <Sparkles className="h-2.5 w-2.5" /> Regen {Math.ceil(buffs.hot / 1000)}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* v3: rastreador de objetivos (saga + diária) sob o HUD */}
      {char && SAGA[char.sagaIdx] && (
        <motion.button
          onClick={() => setPanel("quests")}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="absolute left-2 top-[118px] z-10 w-[214px] rounded-xl border border-amber-400/30 bg-black/50 p-2 text-left text-white backdrop-blur-md hover:bg-black/70 transition-colors"
          data-testid="bw-tracker"
        >
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-300"><Target className="h-2.5 w-2.5" /> Objetivo da Saga</p>
          <p className="truncate text-[11px] font-bold">{SAGA[char.sagaIdx].title}</p>
          {(() => {
            const step = SAGA[char.sagaIdx];
            const prog = Math.min(step.prog(char), step.goal);
            return (
              <div className="mt-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all" style={{ width: `${(prog / step.goal) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-[9px] text-white/60">{step.desc} · {prog}/{step.goal}</p>
              </div>
            );
          })()}
        </motion.button>
      )}

      {/* topo-direita: online + som + minimapa + emotes */}
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          {/* v3: som on/off */}
          <button
            onClick={() => setMuted(worldAudio.toggleMute())}
            className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur hover:bg-black/75 transition-colors"
            data-testid="bw-sound"
            title={muted ? "Ligar som (M)" : "Desligar som (M)"}
          >
            {muted ? <VolumeX className="h-3 w-3 text-red-300" /> : <Volume2 className="h-3 w-3 text-emerald-300" />}
          </button>
          <div className="pointer-events-none flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <Users className="h-3 w-3 text-sky-400" /> {online} online
            {platform?.live && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </div>
        </div>
        <div className="relative">
          <canvas id="bw-minimap" width={100} height={100} className="rounded-xl border border-white/25 shadow-lg" />
          <span className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 text-[7px] font-black text-white/80">N</span>
        </div>
        <div className="pointer-events-none rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-bold text-white/80 backdrop-blur-sm">
          <MapPin className="mr-0.5 inline h-2.5 w-2.5 text-amber-300" />{char!.discoveries.length}/{LANDMARKS.length} descobertas
        </div>
        {/* v3: roda de emotes */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setEmoteOpen((o) => !o)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur transition-colors ${emoteOpen ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
            data-testid="bw-emote-btn"
          >
            <Smile className="h-3 w-3" /> Emotes
          </button>
          <AnimatePresence>
            {emoteOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}
                className="grid grid-cols-3 gap-1 rounded-xl border border-white/15 bg-black/70 p-1.5 backdrop-blur"
                data-testid="bw-emotes"
              >
                {EMOTES.map((em) => (
                  <button
                    key={em}
                    onClick={() => { engineRef.current?.emote(em); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base transition-transform hover:scale-110 hover:bg-white/20 active:scale-90"
                  >
                    {em}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-11 z-20 flex w-[300px] -translate-x-1/2 flex-col items-center gap-1">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur ${t.tone === "good" ? "bg-emerald-600/90" : t.tone === "bad" ? "bg-red-600/90" : "bg-slate-800/90"}`}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* chat */}
      <div className="absolute bottom-2 right-2 z-10 w-[220px]">
        {chatOpen ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-black/65 p-2 text-white backdrop-blur">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold text-white/60 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> CHAT GLOBAL</p>
              <button onClick={() => setChatOpen(false)}><X className="h-3.5 w-3.5 text-white/60" /></button>
            </div>
            <div className="max-h-[120px] space-y-0.5 overflow-y-auto text-[11px]">
              {chatMsgs.length === 0 && <p className="text-white/40">Fala com outros heróis...</p>}
              {chatMsgs.slice(-8).map((m, i) => (
                <p key={i}><b className="text-sky-300">{m.n}:</b> <span className="text-white/85">{m.m}</span></p>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder="Mensagem..."
                maxLength={140}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] outline-none placeholder:text-white/30"
              />
              <button onClick={sendChat} className="rounded-lg bg-sky-500 px-2 py-1 text-[11px] font-bold">➤</button>
            </div>
          </motion.div>
        ) : (
          <button onClick={() => setChatOpen(true)} className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur hover:bg-black/75">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </button>
        )}
      </div>

      {/* prompt de interação */}
      <AnimatePresence>
        {near && !card && (
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => engineRef.current?.interact()}
            className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-5 py-2 text-sm font-black text-slate-900 shadow-xl hover:scale-105 transition-transform"
            data-testid="bw-interact"
          >
            {near} <span className="ml-1 text-slate-400">[E]</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* painel de navegação superior */}
      <div className="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {([
          ["char", <User key="u" className="h-4 w-4" />, "Herói"],
          ["quests", <ScrollText key="q" className="h-4 w-4" />, "Missões"],
          ["bank", <Landmark key="b" className="h-4 w-4" />, "Banco"],
          ["rank", <Trophy key="r" className="h-4 w-4" />, "Ranking"],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setPanel((p) => (p === id ? "none" : id))}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur transition-colors ${panel === id ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
          >
            {icon} {label}
            {id === "char" && char!.points > 0 && <span className="ml-0.5 h-2 w-2 rounded-full bg-emerald-400" />}
            {id === "quests" && <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-400" />}
          </button>
        ))}
      </div>

      {/* joystick (mobile) */}
      <Joystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />

      {/* barra de poderes + botões de combate v3 (cooldown radial) */}
      <div className="absolute bottom-14 right-3 z-10 flex items-end gap-2">
        <div className="flex flex-col items-center gap-2">
          {mySkills.map((sk, i) => {
            const locked = char!.level < sk.lvl;
            const cd = skillCds[i] || 0;
            const cdTotal = sk.cd || 1;
            const cdPct = cd > 0 ? cd / cdTotal : 0;
            return (
              <button
                key={sk.name}
                onClick={() => engineRef.current?.skill(i)}
                disabled={locked || cd > 0}
                data-testid={`bw-skill-${i}`}
                title={`${sk.name} — ${sk.desc}${locked ? ` (Nv${sk.lvl})` : ""}`}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xl font-black shadow-lg transition-all active:scale-90 ${locked ? "bg-slate-800/85 text-white/35" : cd > 0 ? "bg-slate-700/85 text-white/50" : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/40 hover:scale-105"}`}
              >
                {!locked && cd <= 0 && <motion.span className="absolute inset-0 rounded-full border-2 border-white/60" animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }} />}
                {locked ? "🔒" : sk.emoji}
                {cd > 0 && (
                  <>
                    <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgba(0,0,0,0.72) ${cdPct * 360}deg, transparent 0deg)` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{cd}</span>
                  </>
                )}
                {!locked && <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-slate-900 px-0.5 text-[8px] font-black text-amber-300 flex items-center justify-center border border-amber-400/50">{i + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => engineRef.current?.attack()}
            className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-90"
            data-testid="bw-attack"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-white/50"
              animate={{ scale: [1, 1.14, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <Swords className="h-7 w-7" />
          </button>
          <button
            onClick={() => engineRef.current?.jump()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600/90 text-white shadow-lg active:scale-90"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* v3: dica rotativa + atalhos (desktop) */}
      <div className="pointer-events-none absolute bottom-1 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-0.5 md:flex">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIdx}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold text-white/70 backdrop-blur-sm"
          >
            {TIPS[tipIdx]}
          </motion.p>
        </AnimatePresence>
        <p className="text-[9px] text-white/40">
          WASD mover · rato girar · clique/F atacar (jogadores perto = PvP!) · 1/2/3 poderes · E interagir · M som
        </p>
      </div>

      {/* ── Painéis ── */}
      <AnimatePresence>
        {panel === "char" && char && (
          <Panel title="Meu Herói" onClose={() => setPanel("none")}>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: CLASSES[char.classId]?.color + "22", border: `1px solid ${CLASSES[char.classId]?.color}` }}>
                {CLS_EMOJIS[char.classId]}
              </div>
              <div>
                <p className="font-display font-black">{char.name} <span className="text-amber-300">· {titleFor(char.level)}</span></p>
                <p className="text-xs text-muted-foreground">{CLS_NAMES[char.classId]} · Nível {char.level} · {char.kills} inimigos derrotados</p>
              </div>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">{char.xp} / {xpNeeded(char.level)} XP para o nível {char.level + 1}</p>

            <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-1.5">
                <p className="text-sm font-black text-amber-300">🏆 {char.pts}</p>
                <p className="text-[9px] text-muted-foreground">Pontos de Troféu</p>
              </div>
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-1.5">
                <p className="text-sm font-black text-sky-300">🗺️ {char.discoveries.length}/{LANDMARKS.length}</p>
                <p className="text-[9px] text-muted-foreground">Descobertas</p>
              </div>
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-1.5">
                <p className="text-sm font-black text-rose-300">💀 {char.stolenFrom}/{char.lostTo}</p>
                <p className="text-[9px] text-muted-foreground">Roubados / Perdidos</p>
              </div>
            </div>

            <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5">
              <p className="text-xs font-bold text-emerald-300">Pontos de atributo: {char.points}</p>
              {char.points <= 0 && <p className="text-[10px] text-muted-foreground">Sobe de nível para ganhares mais pontos.</p>}
            </div>

            <div className="space-y-2">
              <StatRow icon={<Swords className="h-4 w-4 text-rose-400" />} label="Ataque" value={stats.atk} disabled={char.points <= 0} onAdd={() => allocate("atk")} />
              <StatRow icon={<Heart className="h-4 w-4 text-red-400" />} label="Vida" value={stats.maxHp} addLabel="+12" disabled={char.points <= 0} onAdd={() => allocate("hp")} />
              <StatRow icon={<Zap className="h-4 w-4 text-amber-400" />} label="Velocidade" value={stats.spd.toFixed(1)} disabled={char.points <= 0} onAdd={() => allocate("spd")} />
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-400" /> Poderes ({CLS_NAMES[char.classId]})</p>
              <div className="space-y-1.5">
                {mySkills.map((sk, i) => (
                  <div key={sk.name} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${char.level >= sk.lvl ? "bg-amber-500/10 border border-amber-500/25" : "bg-white/5 opacity-60"}`}>
                    <span className="text-base">{char.level >= sk.lvl ? sk.emoji : "🔒"}</span>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold">{sk.name} <span className="text-[9px] text-white/40">tecla {i + 1}</span></p>
                      <p className="text-[9px] text-muted-foreground">{sk.desc}{char.level < sk.lvl ? ` · Nv${sk.lvl}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Map className="h-3 w-3 text-sky-400" /> Descobertas</p>
              <div className="flex flex-wrap gap-1">
                {LANDMARKS.map((l) => {
                  const found = char.discoveries.includes(l.id);
                  return (
                    <span key={l.id} className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${found ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-white/30"}`}>
                      {found ? `${l.emoji} ${l.name}` : "??? ????"}
                    </span>
                  );
                })}
              </div>
            </div>

            {char.vouchers.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-bold flex items-center gap-1"><Copy className="h-3 w-3" /> Cupões ganhos no mundo</p>
                <div className="flex flex-wrap gap-1.5">
                  {char.vouchers.map((v) => (
                    <button key={v.id} onClick={() => copyCode(v.code)} className="rounded-lg border border-dashed border-rose-400/50 bg-rose-500/10 px-2 py-1 text-[10px] font-mono font-bold text-rose-300">
                      {v.code} · {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2 text-[10px] text-muted-foreground">
              <span>🔥 Streak: {char.streak}d</span>
              <span>💀 Mortes: {char.deaths}</span>
              <button className="underline hover:text-foreground" onClick={() => { if (confirm("Recomeçar personagem do zero?")) { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY_V2); window.location.reload(); } }}>
                Recomeçar
              </button>
            </div>
          </Panel>
        )}

        {panel === "quests" && q && (
          <Panel title="Missões & Desafios" onClose={() => setPanel("none")}>
            <div className="mb-3 flex gap-1.5">
              <button onClick={() => setQuestTab("daily")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "daily" ? "bg-rose-500 text-white" : "bg-white/10 text-white/60"}`}>Diárias</button>
              <button onClick={() => setQuestTab("saga")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "saga" ? "bg-amber-500 text-white" : "bg-white/10 text-white/60"}`}>Saga {char!.sagaIdx + 1}/10</button>
              <button onClick={() => setQuestTab("chal")} className={`flex-1 rounded-lg py-1.5 text-[11px] font-black ${questTab === "chal" ? "bg-violet-500 text-white" : "bg-white/10 text-white/60"}`}>Desafios</button>
            </div>

            {questTab === "daily" && (
              <>
                <QuestRow emoji="⚔️" title="Derrota 10 inimigos" progress={`${Math.min(q.kills, 10)}/10`} done={q.cK} canClaim={q.kills >= 10 && !q.cK} reward="+250 ouro" onClaim={() => claimQuest("K")} />
                <QuestRow emoji="🎟️" title="Abre 1 baú de cupões" progress={`${Math.min(q.chest, 1)}/1`} done={q.cC} canClaim={q.chest >= 1 && !q.cC} reward="+120 XP" onClaim={() => claimQuest("C")} />
                <QuestRow emoji="🎁" title="Visita um sorteio/concurso/bem" progress={`${Math.min(q.visit, 1)}/1`} done={q.cV} canClaim={q.visit >= 1 && !q.cV} reward="+80 XP" onClaim={() => claimQuest("V")} />
                <QuestRow emoji="💀" title="Rouba pontos a 1 jogador (PvP)" progress={`${Math.min(q.steal, 1)}/1`} done={q.cS} canClaim={q.steal >= 1 && !q.cS} reward="+150 ouro" onClaim={() => claimQuest("S")} />
                <p className="mt-3 text-[10px] text-muted-foreground">As missões diárias reiniciam todos os dias. PvP ativo fora da praça — jogadores abaixo do Nv3 estão protegidos.</p>
              </>
            )}

            {questTab === "saga" && (
              <>
                {SAGA[char!.sagaIdx] ? (() => {
                  const step = SAGA[char!.sagaIdx];
                  const prog = Math.min(step.prog(char!), step.goal);
                  return (
                    <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Passo atual da Saga</p>
                      <p className="font-display font-black text-sm mt-0.5">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${(prog / step.goal) * 100}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">{prog}/{step.goal} · {step.reward}</p>
                        {prog >= step.goal && (
                          <button onClick={claimSaga} className="animate-pulse rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300">Receber</button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
                    <p className="text-2xl">👑</p>
                    <p className="font-display font-black text-sm">Saga completa — és uma LENDA do Bateu World!</p>
                  </div>
                )}
                <div className="space-y-1">
                  {SAGA.map((step, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] ${i < char!.sagaIdx ? "bg-emerald-500/10 text-emerald-300" : i === char!.sagaIdx ? "bg-amber-500/15 text-amber-200" : "bg-white/5 text-white/40"}`}>
                      <span>{i < char!.sagaIdx ? "✅" : i === char!.sagaIdx ? "▶" : "🔒"}</span>
                      <span className="flex-1 font-bold">{step.title}</span>
                      <span className="text-white/50">{Math.min(step.prog(char!), step.goal)}/{step.goal}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {questTab === "chal" && (
              <>
                <QuestRow emoji="🏹" title="Desafio do Caçador: derrota 25 inimigos hoje" progress={`${Math.min(q.kills, 25)}/25`} done={char!.chal.c1} canClaim={q.kills >= 25 && !char!.chal.c1} reward="+400 ouro · +15 pts" onClaim={() => claimChallenge(1)} />
                <QuestRow emoji="😈" title="Desafio do Ladrão: rouba 2 jogadores hoje" progress={`${Math.min(q.steal, 2)}/2`} done={char!.chal.c2} canClaim={q.steal >= 2 && !char!.chal.c2} reward="+300 ouro · +25 pts" onClaim={() => claimChallenge(2)} />
                <p className="mt-3 text-[10px] text-muted-foreground">Os desafios são mais difíceis mas pagam muito melhor. Recomeçam todos os dias à meia-noite.</p>
              </>
            )}
          </Panel>
        )}

        {panel === "bank" && char && (
          <Panel title="🏦 Banco de Pontos" onClose={() => setPanel("none")}>
            <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
              <p className="text-2xl font-black text-amber-300">🏆 {char.pts} pts</p>
              <p className="text-[10px] text-muted-foreground">Ganha Pontos de Troféu derrotando inimigos, chefes, descobrindo marcos e roubando outros jogadores.</p>
            </div>
            <div className="space-y-2">
              {EXCHANGES.map((ex) => {
                const can = char.pts >= ex.cost;
                return (
                  <div key={ex.id} className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${can ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
                    <span className="text-2xl">{ex.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{ex.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ex.desc}</p>
                    </div>
                    <button
                      onClick={() => doExchange(ex.id)}
                      disabled={!can}
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-black ${can ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 hover:brightness-110" : "bg-white/5 text-white/30"}`}
                    >
                      {ex.cost} pts
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              💵 A conversão em moeda real (MT) é creditada na carteira da plataforma. Cupões podem ser roubados por outros jogadores se não tiveres escudo — protege-te no Banco!
            </p>
          </Panel>
        )}

        {panel === "rank" && (
          <Panel title="Ranking do Mundo" onClose={() => setPanel("none")}>
            {(() => {
              const rows = [...(platform?.leaderboard || [])];
              if (char) {
                const i = rows.findIndex((r) => r.name === char.name);
                if (i >= 0) rows[i] = { ...rows[i], level: char.level, gold: char.gold, kills: char.kills, classId: char.classId };
                else rows.push({ name: char.name, classId: char.classId, level: char.level, gold: char.gold, kills: char.kills });
              }
              rows.sort((a, b) => b.level - a.level || b.gold - a.gold);
              return (
                <div className="space-y-1">
                  {rows.slice(0, 15).map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${char && r.name === char.name ? "bg-rose-500/20 border border-rose-400/40" : "bg-white/5"}`}>
                      <span className="w-5 text-center font-black text-white/50">{i === 0 ? "👑" : i + 1}</span>
                      <span className="text-base">{CLS_EMOJIS[r.classId] || "⚔️"}</span>
                      <span className="flex-1 truncate font-bold">{r.name}</span>
                      <span className="text-white/60">Nv{r.level}</span>
                      <span className="text-amber-400">{r.gold}💰</span>
                    </div>
                  ))}
                  {rows.length === 0 && <p className="text-xs text-muted-foreground">Sê o primeiro do ranking!</p>}
                </div>
              );
            })()}
          </Panel>
        )}
      </AnimatePresence>

      {/* card de plataforma */}
      <AnimatePresence>
        {card && (
          <motion.div
            className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-4 md:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCard(null)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/95 p-5 text-center text-white shadow-2xl"
              data-testid="bw-card"
            >
              {cardData}
              <button onClick={() => setCard(null)} className="mt-3 block w-full rounded-xl bg-white/10 py-2 text-sm font-bold hover:bg-white/20">Fechar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-x-2 top-12 bottom-20 z-20 mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-900/92 text-white shadow-2xl backdrop-blur"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      data-testid="bw-panel"
    >
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />
        <p className="font-display text-sm font-black">{title}</p>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      <div className="max-h-[calc(100%-44px)] overflow-y-auto p-3">{children}</div>
    </motion.div>
  );
}

function StatRow({ icon, label, value, addLabel = "+1", disabled, onAdd }: { icon: React.ReactNode; label: string; value: number | string; addLabel?: string; disabled: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
      {icon}
      <span className="flex-1 text-xs font-bold">{label}</span>
      <span className="text-sm font-black text-amber-300">{value}</span>
      <button
        onClick={onAdd}
        disabled={disabled}
        className={`rounded-lg px-2.5 py-1 text-xs font-black ${disabled ? "bg-white/5 text-white/30" : "bg-emerald-500 text-white hover:bg-emerald-400"}`}
      >
        {addLabel}
      </button>
    </div>
  );
}

function QuestRow({ emoji, title, progress, done, canClaim, reward, onClaim }: { emoji: string; title: string; progress: string; done: boolean; canClaim: boolean; reward: string; onClaim: () => void }) {
  return (
    <div className={`mb-2 flex items-center gap-2.5 rounded-xl border p-2.5 ${done ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] text-muted-foreground">{progress} · {reward}</p>
      </div>
      {done ? <Check className="h-5 w-5 text-emerald-400" /> : canClaim ? (
        <button onClick={onClaim} className="animate-pulse rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900 shadow-lg shadow-amber-400/30 hover:bg-amber-300">Receber</button>
      ) : (
        <span className="text-[10px] text-white/30">...</span>
      )}
    </div>
  );
}

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const handle = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width / 2 - 14;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    setKnob({ x: dx, y: dy });
    onMove(dx / max, dy / max);
  };

  return (
    <div
      ref={baseRef}
      data-testid="bw-joystick"
      className="absolute bottom-4 left-4 z-10 h-24 w-24 touch-none rounded-full border-2 border-white/25 bg-black/35 backdrop-blur-sm"
      style={{ touchAction: "none", boxShadow: "0 0 24px rgba(56,189,248,0.18), inset 0 0 18px rgba(255,255,255,0.06)" }}
      onPointerDown={(e) => { active.current = true; worldAudio.play("click"); (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => { if (active.current) handle(e); }}
      onPointerUp={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
      onPointerCancel={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
    >
      {/* marcações direcionais */}
      <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[8px] text-white/40">▲</span>
      <span className="pointer-events-none absolute left-1/2 bottom-1 -translate-x-1/2 text-[8px] text-white/40">▼</span>
      <span className="pointer-events-none absolute top-1/2 left-1 -translate-y-1/2 text-[8px] text-white/40">◀</span>
      <span className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[8px] text-white/40">▶</span>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 rounded-full bg-white/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, boxShadow: "0 0 14px rgba(255,255,255,0.5)" }}
      />
    </div>
  );
}
