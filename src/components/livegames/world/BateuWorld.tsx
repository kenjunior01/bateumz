// ============================================================
// BATEU WORLD — MMO 3D da plataforma (estilo Hordes.io)
// Entrada em 10 segundos: nome + classe → mundo aberto 3D.
// Sincronizado com a plataforma: sorteios, concursos, cupões e
// bens da Feira aparecem no mundo; progresso persistente.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Sparkles, ArrowUp, User, ScrollText, Trophy, MessageSquare,
  X, Copy, Coins, Heart, Zap, Crown, ExternalLink, Check, Wifi, Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { WorldEngine } from "./worldEngine";
import {
  fetchPlatformData, upsertCharacter, setCharacterOffline,
  worldRoute, fmtMZN, voucherLabel, MODALITY_LABEL,
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
  points: number;
  allocAtk: number;
  allocHp: number;
  allocSpd: number;
  kills: number;
  deaths: number;
  streak: number;
  lastDaily: string;
  vouchers: { id: string; code: string; label: string }[];
  quests: { date: string; kills: number; chest: number; visit: number; cK: boolean; cC: boolean; cV: boolean };
}

const LS_KEY = "bateu_world_char_v2";
const CLASSES = [
  { name: "Guerreiro", emoji: "⚔️", color: "#ef4444", grad: "from-red-500 to-rose-600", desc: "Combate corpo a corpo, vida alta" },
  { name: "Mago", emoji: "🔮", color: "#8b5cf6", grad: "from-violet-500 to-purple-600", desc: "Bolas de fogo à distância" },
  { name: "Arqueiro", emoji: "🏹", color: "#22c55e", grad: "from-green-500 to-emerald-600", desc: "Flechas rápidas e precisas" },
  { name: "Curandeiro", emoji: "🌿", color: "#06b6d4", grad: "from-cyan-500 to-teal-600", desc: "Onda vital: cura-te e fere inimigos" },
];

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
    quests: { date: todayStr(), kills: 0, chest: 0, visit: 0, cK: false, cC: false, cV: false },
  };
}

function loadChar(): Char | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Char;
    if (!c?.name || !c?.uid) return null;
    if (c.quests?.date !== todayStr()) {
      c.quests = { date: todayStr(), kills: 0, chest: 0, visit: 0, cK: false, cC: false, cV: false };
    }
    return c;
  } catch { return null; }
}

function calcStats(c: Char) {
  const baseAtk = [12, 11, 10, 9][c.classId] ?? 11;
  return {
    atk: baseAtk + c.allocAtk + Math.floor((c.level - 1) * 1.2),
    maxHp: 100 + (c.level - 1) * 8 + c.allocHp * 10,
    spd: 6 + c.allocSpd * 0.6,
  };
}

const CLS_NAMES = ["Guerreiro", "Mago", "Arqueiro", "Curandeiro"];
const CLS_EMOJIS = ["⚔️", "🔮", "🏹", "🌿"];

export default function BateuWorld({ onScore, onNavigate }: Props) {
  const [phase, setPhase] = useState<"boot" | "create" | "world">("boot");
  const [saved, setSaved] = useState<Char | null>(null);
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
  const [panel, setPanel] = useState<"none" | "char" | "quests" | "rank">("none");
  const [card, setCard] = useState<{ kind: string; id: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<{ n: string; m: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [deathFx, setDeathFx] = useState(false);
  const [skillState, setSkillState] = useState<{ locked: boolean; cd: number }>({ locked: true, cd: 0 });

  const toastId = useRef(0);
  const pushToast = useCallback((msg: string, tone = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  // ── Boot ───────────────────────────────────────────────────
  useEffect(() => {
    const c = loadChar();
    setSaved(c);
    if (c) { persist(c); setChar(c); }
    setPhase(c ? "world" : "create");
    let alive = true;
    (async () => {
      setBootMsg("A carregar sorteios, feira e cupões...");
      const data = await fetchPlatformData();
      if (!alive) return;
      platformRef.current = data;
      setPlatform(data);
      // se o motor já arrancou, povoa o mundo agora
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

  // ── Entrada no mundo ───────────────────────────────────────
  const enterWorld = useCallback((c: Char) => {
    // bónus diário
    const today = todayStr();
    if (c.lastDaily !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      c.streak = c.lastDaily === yesterday ? c.streak + 1 : 1;
      c.lastDaily = today;
      const bonus = 150 + c.streak * 50;
      c.gold += bonus;
      setTimeout(() => pushToast(`🔥 Presença diária: +${bonus} ouro (streak ${c.streak})`, "good"), 900);
    }
    persist(c);
    setChar(c);
    setPhase("world");
  }, [persist, pushToast]);

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
          case "ready":
            break;
          case "hp":
            setHud({ hp: Math.round(ev.hp), maxHp: Math.round(ev.maxHp), hit: ev.hit ? Date.now() : 0 });
            break;
          case "gain": {
            // ganho de xp/ouro via orbes
            setChar((p) => {
              if (!p) return p;
              let { xp, gold, level, points } = p;
              xp += ev.xp;
              gold += ev.gold;
              let leveled = false;
              while (xp >= xpNeeded(level)) {
                xp -= xpNeeded(level);
                level += 1;
                points += 3;
                leveled = true;
              }
              if (leveled) {
                confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors: ["#f43f5e", "#fbbf24", "#38bdf8"] });
                pushToast(`🎉 Subiste para o nível ${level}! +3 pontos`, "good");
                scoreRef.current?.("Bateu World", level * 1000);
                setTimeout(() => {
                  const s = calcStats({ ...p, level });
                  engineRef.current?.syncStats(s, level);
                  engineRef.current?.healFull();
                }, 30);
              }
              return { ...p, xp, gold, level, points };
            });
            break;
          }
          case "kill": {
            setChar((p) => {
              if (!p) return p;
              const q = { ...p.quests };
              if (q.date === todayStr()) q.kills += 1; else { q.date = todayStr(); q.kills = 1; }
              return { ...p, kills: p.kills + 1, quests: q };
            });
            if (ev.boss) pushToast(`👑 Derrotaste o ${ev.name}!`, "good");
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
              if (q.date !== todayStr()) { q.date = todayStr(); q.kills = 0; q.chest = 0; q.visit = 0; }
              if (ev.kind === "chest") q.chest += 1;
              if (ev.kind === "visit") q.visit += 1;
              return { ...p, quests: q };
            });
            break;
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
          case "skill":
            if (!ev.ok) {
              if (ev.reason === "locked") pushToast("A habilidade desbloqueia no nível 3", "info");
              else if (ev.reason === "cd") setSkillState({ locked: false, cd: ev.remain });
            } else {
              setSkillState({ locked: false, cd: 8 });
            }
            break;
        }
      },
    });
    engineRef.current = eng;
    (window as any).__bw = eng; // debug hook
    // Povoar o mundo com conteúdo real da plataforma (após construção)
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

  // cooldown da habilidade
  useEffect(() => {
    if (skillState.cd <= 0) return;
    const t = setTimeout(() => setSkillState((s) => ({ ...s, cd: s.cd - 1 })), 1000);
    return () => clearTimeout(t);
  }, [skillState.cd]);

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
    setCard({ kind, id });
  }, [pushToast]);

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
      for (const p of d.pois) {
        const [mx, my] = toMap(p.x, p.z);
        ctx.fillStyle = { raffle: "#c084fc", asset: "#fbbf24", contest: "#f59e0b", voucher: "#f87171", games: "#38bdf8" }[p.k] || "#fff";
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, 7); ctx.fill();
      }
      for (const m of d.mobs) {
        const [mx, my] = toMap(m.x, m.z);
        ctx.fillStyle = ["#4ade80", "#f97316", "#a855f7"][m.t];
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

  const claimQuest = (k: "K" | "C" | "V") => {
    setChar((p) => {
      if (!p) return p;
      const q = { ...p.quests };
      const key = k === "K" ? "cK" : k === "C" ? "cC" : "cV";
      if (q[key]) return p;
      const done = k === "K" ? q.kills >= 10 : k === "C" ? q.chest >= 1 : q.visit >= 1;
      if (!done) return p;
      q[key] = true;
      const reward = k === "K" ? { gold: 250, xp: 0 } : k === "C" ? { gold: 0, xp: 120 } : { gold: 0, xp: 80 };
      let { gold, xp, level, points } = p;
      gold += reward.gold;
      xp += reward.xp;
      let leveled = false;
      while (xp >= xpNeeded(level)) { xp -= xpNeeded(level); level++; points += 3; leveled = true; }
      if (leveled) pushToast(`🎉 Nível ${level}!`, "good");
      pushToast(k === "K" ? "✅ Missão concluída: +250 ouro" : "✅ Missão concluída: +XP", "good");
      return { ...p, gold, xp, level, points, quests: q };
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
      <div className="relative z-10 w-full aspect-[4/3] md:aspect-video rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-5xl animate-bounce">🌍</div>
        <p className="font-display font-bold text-xl">Bateu World</p>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {bootMsg}
        </div>
      </div>
    );
  }

  if (phase === "create") {
    return (
      <div className="relative z-10 w-full aspect-[4/3] md:aspect-video rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden text-white">
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 70% 20%, #f43f5e 0%, transparent 45%), radial-gradient(circle at 20% 80%, #38bdf8 0%, transparent 40%)" }} />
        <div className="relative h-full overflow-y-auto p-5 md:p-8 flex flex-col items-center justify-center gap-5">
          <div className="text-center">
            <p className="text-4xl md:text-5xl mb-1">🌍</p>
            <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight">BATEU WORLD</h2>
            <p className="text-white/70 text-sm">MMO 3D da plataforma — entra, luta, cresce e ganha prémios reais</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full max-w-md">
            {CLASSES.map((cl, i) => (
              <button
                key={cl.name}
                onClick={() => setPickClass(i)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${pickClass === i ? "border-rose-400 bg-white/10 scale-105" : "border-white/15 bg-white/5 hover:border-white/40"}`}
              >
                <div className="text-3xl mb-1">{cl.emoji}</div>
                <p className="font-bold text-sm">{cl.name}</p>
                <p className="text-[10px] text-white/60 leading-tight mt-0.5">{cl.desc}</p>
              </button>
            ))}
          </div>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) enterWorld(newChar(nameInput, pickClass)); }}
            placeholder="Nome do teu herói"
            maxLength={14}
            className="w-full max-w-md rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-center font-bold placeholder:text-white/40 outline-none focus:border-rose-400"
          />
          <button
            onClick={() => nameInput.trim() && enterWorld(newChar(nameInput, pickClass))}
            className="w-full max-w-md rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3.5 font-display font-black text-lg shadow-lg shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            ENTRAR NO MUNDO →
          </button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-md text-[11px] text-white/70">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🎁 Sorteios reais no mundo</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🛒 Bens à venda na Feira</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">🎟️ Cupões para apanhar</div>
            <div className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">👥 Jogadores em tempo real</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = char ? calcStats(char) : { atk: 0, maxHp: 100, spd: 6 };
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const xpPct = char ? Math.min(100, (char.xp / xpNeeded(char.level)) * 100) : 0;
  const q = char?.quests;

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
        {deathFx && (
          <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-red-950/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="font-display text-3xl font-black text-red-300">💀 Derrotado</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD topo-esquerda */}
      <div className="pointer-events-none absolute left-2 top-2 w-[190px] rounded-xl bg-black/55 backdrop-blur-sm p-2.5 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ background: CLASSES[char!.classId]?.color + "33", border: `1px solid ${CLASSES[char!.classId]?.color}` }}>
            {CLS_EMOJIS[char!.classId]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{char!.name} <span className="text-white/60">· Nv{char!.level}</span></p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-400 transition-all" style={{ width: `${hpPct}%` }} />
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/80">
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" />{hud.hp}/{hud.maxHp}</span>
          <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3 text-amber-400" />{char!.gold}</span>
          {char!.points > 0 && <span className="rounded-full bg-emerald-500/90 px-1.5 font-bold text-white">+{char!.points} pts</span>}
        </div>
      </div>

      {/* topo-direita: online + minimapa */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
        <div className="pointer-events-none flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          <Users className="h-3 w-3 text-sky-400" /> {online} online
          {platform?.live && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </div>
        <canvas id="bw-minimap" width={100} height={100} className="rounded-lg border border-white/20 shadow-lg" />
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

      {/* painel de navegação inferior-esquerda */}
      <div className="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {([
          ["char", <User key="u" className="h-4 w-4" />, "Herói"],
          ["quests", <ScrollText key="q" className="h-4 w-4" />, "Missões"],
          ["rank", <Trophy key="r" className="h-4 w-4" />, "Ranking"],
        ] as const).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setPanel((p) => (p === id ? "none" : id))}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold backdrop-blur transition-colors ${panel === id ? "bg-white text-slate-900" : "bg-black/55 text-white hover:bg-black/75"}`}
          >
            {icon} {label}
            {id === "char" && char!.points > 0 && <span className="ml-0.5 h-2 w-2 rounded-full bg-emerald-400" />}
            {id === "quests" && q && (!q.cK || !q.cC || !q.cV) && (q.kills >= 10 || q.chest >= 1 || q.visit >= 1) && <span className="ml-0.5 h-2 w-2 rounded-full bg-amber-400" />}
          </button>
        ))}
      </div>

      {/* joystick (mobile) */}
      <Joystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />

      {/* botões de combate (direita) */}
      <div className="absolute bottom-16 right-3 z-10 flex flex-col items-center gap-2">
        <button
          onClick={() => engineRef.current?.skill()}
          disabled={skillState.cd > 0}
          className={`relative flex h-12 w-12 items-center justify-center rounded-full text-xl font-black shadow-lg transition-all active:scale-90 ${skillState.locked || skillState.cd > 0 ? "bg-slate-700/80 text-white/40" : "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/40"}`}
          title={skillState.locked ? "Desbloqueia no nível 3" : "Habilidade especial"}
        >
          <Sparkles className="h-5 w-5" />
          {skillState.cd > 0 && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-sm">{skillState.cd}</span>}
        </button>
        <button
          onClick={() => engineRef.current?.attack()}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-90"
          data-testid="bw-attack"
        >
          <Swords className="h-7 w-7" />
        </button>
        <button
          onClick={() => engineRef.current?.jump()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600/90 text-white shadow-lg active:scale-90"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      {/* dicas desktop */}
      <div className="pointer-events-none absolute bottom-1 left-1/2 hidden -translate-x-1/2 text-[10px] text-white/40 md:block">
        WASD mover · rato girar · clique/F atacar · E interagir · espaço saltar
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
                <p className="font-display font-black">{char.name}</p>
                <p className="text-xs text-muted-foreground">{CLS_NAMES[char.classId]} · Nível {char.level} · {char.kills} bugs derrotados</p>
              </div>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">{char.xp} / {xpNeeded(char.level)} XP para o nível {char.level + 1}</p>

            <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5">
              <p className="text-xs font-bold text-emerald-300">Pontos disponíveis: {char.points}</p>
              {char.points <= 0 && <p className="text-[10px] text-muted-foreground">Sobe de nível para ganhares mais pontos.</p>}
            </div>

            <div className="space-y-2">
              <StatRow icon={<Swords className="h-4 w-4 text-rose-400" />} label="Ataque" value={stats.atk} disabled={char.points <= 0} onAdd={() => allocate("atk")} />
              <StatRow icon={<Heart className="h-4 w-4 text-red-400" />} label="Vida" value={stats.maxHp} addLabel="+10" disabled={char.points <= 0} onAdd={() => allocate("hp")} />
              <StatRow icon={<Zap className="h-4 w-4 text-amber-400" />} label="Velocidade" value={stats.spd.toFixed(1)} disabled={char.points <= 0} onAdd={() => allocate("spd")} />
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
              <button className="underline hover:text-foreground" onClick={() => { if (confirm("Recomeçar personagem do zero?")) { localStorage.removeItem(LS_KEY); window.location.reload(); } }}>
                Recomeçar
              </button>
            </div>
          </Panel>
        )}

        {panel === "quests" && q && (
          <Panel title="Missões Diárias" onClose={() => setPanel("none")}>
            <QuestRow emoji="⚔️" title="Derrota 10 Bugs" progress={`${Math.min(q.kills, 10)}/10`} done={q.cK} canClaim={q.kills >= 10 && !q.cK} reward="+250 ouro" onClaim={() => claimQuest("K")} />
            <QuestRow emoji="🎟️" title="Abre 1 baú de cupões" progress={`${Math.min(q.chest, 1)}/1`} done={q.cC} canClaim={q.chest >= 1 && !q.cC} reward="+120 XP" onClaim={() => claimQuest("C")} />
            <QuestRow emoji="🎁" title="Visita um sorteio/concurso/bem" progress={`${Math.min(q.visit, 1)}/1`} done={q.cV} canClaim={q.visit >= 1 && !q.cV} reward="+80 XP" onClaim={() => claimQuest("V")} />
            <p className="mt-3 text-[10px] text-muted-foreground">As missões reiniciam todos os dias. Volta amanhã para mais recompensas!</p>
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
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
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
        <button onClick={onClaim} className="rounded-lg bg-amber-400 px-3 py-1 text-[11px] font-black text-slate-900 hover:bg-amber-300">Receber</button>
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
      style={{ touchAction: "none" }}
      onPointerDown={(e) => { active.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => { if (active.current) handle(e); }}
      onPointerUp={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
      onPointerCancel={() => { active.current = false; setKnob({ x: 0, y: 0 }); onMove(0, 0); }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 rounded-full bg-white/80 shadow-lg"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
