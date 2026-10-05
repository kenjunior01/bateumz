// Bateu Mundo Aberto — jogo de mundo aberto sobre mapa REAL (Leaflet), GPS ou joystick.
// Explora a tua cidade, derrota criaturas, abre baús de sorteio e visita portais da plataforma.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins, Ticket, Heart, Store, Trophy, Gamepad2, Navigation, Joystick, X, ChevronRight, Sparkles, WifiOff,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Geolocation } from "@capacitor/geolocation";
import {
  OW_CLASSES, classById, CREATURES, creatureById, RARITY_META,
  spawnCell, nearbyCells, haversineM, CELL,
  loadChar, saveChar, todayStr, freshQuests, xpForLevel, maxHpFor, atkFor,
  OW_QUESTS, DEFAULT_POS,
  type OWChar, type OWEntity, type OWQuestDef,
} from "./openworld/core";
import { fetchReal, scopeForCell } from "./openworld/live";
import { detectProvince, type RealEnt } from "./openworld/geo";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

// ---------- dados ao vivo da plataforma ----------
interface LiveRaffle { id: string; slug?: string; title: string; prize_title?: string; ticket_price?: number; image_url?: string; end_date?: string; total_tickets?: number; sold_tickets?: number }
interface LiveContest { id: string; title: string; image_url?: string; status?: string }
interface LiveTournament { id: string; name: string; prize_description?: string; prize_value?: number; currency?: string; end_date?: string }

interface BattleState {
  entityKey: string;
  creatureId: string;
  cHp: number;
  cMaxHp: number;
  pHp: number;
  pMaxHp: number;
  log: string[];
  over: "win" | "lose" | null;
  canCapture: boolean;
}

const PORTAL_META: Record<string, { emoji: string; label: string; to: string; desc: string }> = {
  feira: { emoji: "🛒", label: "Portal da Feira", to: "/marketplace", desc: "Feira de Vendas da plataforma" },
  arena: { emoji: "🏆", label: "Portal da Arena", to: "/esports", desc: "Arena de Torneios" },
  arcade: { emoji: "🕹️", label: "Portal Arcade", to: "/jogos", desc: "83 jogos da plataforma" },
};

const CHEST_LOOT: Record<number, { gold: [number, number]; ticketChance: number }> = {
  1: { gold: [20, 45], ticketChance: 0.12 },
  2: { gold: [45, 90], ticketChance: 0.3 },
  3: { gold: [90, 160], ticketChance: 0.55 },
};

const MB_TOKEN = (import.meta.env?.VITE_MAPBOX_TOKEN as string | undefined) || "";

export default function OpenWorldGame({ onScore }: Props) {
  const navigate = useNavigate();
  const [char, setChar] = useState<OWChar | null>(() => loadChar());
  const [screen, setScreen] = useState<"create" | "game">(() => (loadChar() ? "game" : "create"));
  const [name, setName] = useState("");
  const [pickClass, setPickClass] = useState("guerreiro");

  // HUD / modais
  const [modal, setModal] = useState<null | "quests" | "sorteios" | "feira" | "arena" | "bestiario" | "perfil" | "perto">(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const toastId = useRef(1);

  // mapa
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const avatarRef = useRef<L.Marker | null>(null);
  const entMarkers = useRef<Map<string, L.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(17);

  // GPS / joystick
  const watchId = useRef<string | number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"off" | "asking" | "on" | "denied">("off");
  const joyRef = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef<{ lat: number; lng: number }>(char?.pos || DEFAULT_POS);
  const charRef = useRef<OWChar | null>(char);
  charRef.current = char;
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const battleRef = useRef<BattleState | null>(null);
  battleRef.current = battle;

  // dados ao vivo
  const [liveRaffles, setLiveRaffles] = useState<LiveRaffle[]>([]);
  const [liveContests, setLiveContests] = useState<LiveContest[]>([]);
  const [liveTours, setLiveTours] = useState<LiveTournament[]>([]);
  const [liveErr, setLiveErr] = useState<string | null>(null);

  // entidades REAIS da plataforma no mapa (anúncios, sorteios, concursos, cupões)
  const [realFixed, setRealFixed] = useState<RealEnt[]>([]);
  const [realScope, setRealScope] = useState<RealEnt[]>([]);
  const [realSheet, setRealSheet] = useState<RealEnt | null>(null);
  const realFixedRef = useRef<RealEnt[]>([]);
  realFixedRef.current = realFixed;
  const realScopeRef = useRef<RealEnt[]>([]);
  realScopeRef.current = realScope;
  const realMarkers = useRef<Map<string, { m: L.Marker; ent: RealEnt }>>(new Map());
  const openRealSheetRef = useRef<(e: RealEnt) => void>(() => { });

  const notify = useCallback((msg: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-3), { id, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // ---------- persistência + missões ----------
  const persist = useCallback((c: OWChar) => {
    const clean = { ...c };
    const now = Date.now();
    for (const k of Object.keys(clean.loot)) if (clean.loot[k] < now) delete clean.loot[k];
    saveChar(clean);
  }, []);

  const advanceQuest = useCallback((type: OWQuestDef["type"], n: number) => {
    const c = charRef.current;
    if (!c) return;
    const today = todayStr();
    const quests = c.questDate === today ? [...c.quests] : freshQuests();
    let changed = false;
    OW_QUESTS.forEach((def, i) => {
      if (def.type === type && quests[i] && !quests[i].claimed && quests[i].progress < def.target) {
        quests[i] = { ...quests[i], progress: Math.min(def.target, quests[i].progress + n) };
        if (quests[i].progress >= def.target) notify(`📜 Missão completa: ${def.name}! Vai ao Quadro receber.`);
        changed = true;
      }
    });
    if (changed) {
      const nc = { ...c, quests, questDate: today };
      charRef.current = nc;
      setChar(nc);
    }
  }, [notify]);

  const gainRewards = useCallback((gold: number, xp: number, tickets = 0) => {
    const c = charRef.current;
    if (!c) return;
    let level = c.level;
    let nxp = c.xp + xp;
    let leveled = false;
    while (nxp >= xpForLevel(level)) { nxp -= xpForLevel(level); level++; leveled = true; }
    const nc: OWChar = {
      ...c,
      level,
      xp: nxp,
      gold: c.gold + gold,
      tickets: c.tickets + tickets,
      hp: leveled ? maxHpFor(level, c.classId) : c.hp,
    };
    charRef.current = nc;
    setChar(nc);
    if (leveled) {
      notify(`⬆️ Nível ${level}! Novo poder desbloqueado.`);
      try { onScore?.("Mundo Aberto Bateu", level); } catch { /* noop */ }
    }
    if (gold > 0) advanceQuest("gold_earn", gold);
  }, [advanceQuest, notify, onScore]);

  // manter hp coerente com nível
  useEffect(() => {
    if (char && char.hp > maxHpFor(char.level, char.classId)) {
      setChar((c) => (c ? { ...c, hp: maxHpFor(c.level, c.classId) } : c));
    }
  }, [char?.level]); // eslint-disable-line react-hooks/exhaustive-deps

  // salvar (debounce leve via effect)
  useEffect(() => {
    if (char) persist(char);
  }, [char, persist]);

  // ---------- marcadores de entidades ----------
  const refreshEntities = useCallback(() => {
    const map = mapRef.current;
    const c = charRef.current;
    if (!map || !c) return;
    const now = Date.now();
    const wanted = new Map<string, OWEntity>();
    for (const { cx, cy } of nearbyCells(c.pos.lat, c.pos.lng, 1)) {
      for (const e of spawnCell(cx, cy)) {
        if (c.loot[e.key] && c.loot[e.key] > now) continue;
        wanted.set(e.key, e);
      }
    }
    // remover os que já não pertencem
    for (const [k, m] of entMarkers.current) {
      if (!wanted.has(k)) { m.remove(); entMarkers.current.delete(k); }
    }
    // adicionar novos
    for (const [k, e] of wanted) {
      if (entMarkers.current.has(k)) continue;
      let html = "";
      let size = 34;
      if (e.kind === "creature" && e.creatureId) {
        const cr = creatureById(e.creatureId);
        const rm = RARITY_META[cr.rarity];
        size = cr.rarity === "lendario" ? 46 : cr.rarity === "epico" ? 42 : 36;
        html = `<div class="ow-ent" style="border-color:${rm.color};box-shadow:0 0 10px ${rm.color}66">${cr.emoji}</div>`;
      } else if (e.kind === "chest") {
        html = `<div class="ow-ent" style="border-color:#fbbf24;box-shadow:0 0 10px #fbbf2466">${e.tier === 3 ? "🧰" : "🎁"}</div>`;
      } else if (e.kind === "crystal") {
        html = `<div class="ow-ent" style="border-color:#38bdf8;box-shadow:0 0 8px #38bdf866">💎</div>`;
        size = 30;
      } else {
        const pm = PORTAL_META[e.portalId || "feira"];
        html = `<div class="ow-ent ow-portal" style="border-color:#a855f7;box-shadow:0 0 12px #a855f788">${pm.emoji}</div>`;
        size = 40;
      }
      const icon = L.divIcon({ html, className: "ow-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
      const mk = L.marker([e.lat, e.lng], { icon }).addTo(map);
      mk.on("click", () => interact(e));
      entMarkers.current.set(k, mk);
    }
  }, []);

  // ---------- marcadores de entidades REAIS da plataforma ----------
  const refreshReal = useCallback(() => {
    const map = mapRef.current;
    const c = charRef.current;
    if (!map || !c) return;
    const wanted = new Map<string, RealEnt>();
    // anúncios com coordenada real (até 2,5 km)
    for (const e of realFixedRef.current) {
      const d = haversineM(c.pos.lat, c.pos.lng, e.lat, e.lng);
      if (d <= 2500) wanted.set(`fixed:${e.key}`, { ...e, key: `fixed:${e.key}` });
    }
    // nacionais/por província — colocados por célula (1-2 por célula, estável por dia)
    for (const { cx, cy } of nearbyCells(c.pos.lat, c.pos.lng, 1)) {
      for (const e of scopeForCell(cx, cy, realScopeRef.current)) {
        wanted.set(e.key, e);
      }
    }
    for (const [k, v] of realMarkers.current) {
      if (!wanted.has(k)) { v.m.remove(); realMarkers.current.delete(k); }
    }
    for (const [k, e] of wanted) {
      if (realMarkers.current.has(k)) continue;
      const icon = L.divIcon({
        html: `<div class="ow-ent ow-real" style="border-color:${e.color};box-shadow:0 0 12px ${e.color}88">${e.emoji}</div>`,
        className: "ow-icon", iconSize: [40, 40], iconAnchor: [20, 20],
      });
      const mk = L.marker([e.lat, e.lng], { icon, zIndexOffset: 500 }).addTo(map);
      mk.on("click", () => openRealSheetRef.current(e));
      realMarkers.current.set(k, { m: mk, ent: e });
    }
  }, []);

  // ---------- interacção com entidade ----------
  const distTo = (e: OWEntity) => haversineM(posRef.current.lat, posRef.current.lng, e.lat, e.lng);

  const collectEntity = useCallback((e: OWEntity) => {
    setChar((c) => {
      if (!c) return c;
      return { ...c, loot: { ...c.loot, [e.key]: Date.now() + 24 * 3600_000 } };
    });
    const map = mapRef.current;
    const mk = entMarkers.current.get(e.key);
    if (map && mk) { mk.remove(); entMarkers.current.delete(e.key); }
  }, []);

  const interact = useCallback((e: OWEntity) => {
    const c = charRef.current;
    if (!c) return;
    const d = distTo(e);
    if (d > 140) { notify(`📍 Muito longe (${Math.round(d)}m) — aproxima-te primeiro!`); return; }

    if (e.kind === "creature" && e.creatureId) {
      const cr = creatureById(e.creatureId);
      const pMax = maxHpFor(c.level, c.classId);
      const startHp = Math.min(c.hp, pMax);
      setBattle({
        entityKey: e.key, creatureId: cr.id, cHp: cr.hp, cMaxHp: cr.hp,
        pHp: Math.max(8, startHp), pMaxHp: pMax, log: [`⚔️ Um ${cr.name} selvagem aparece!`], over: null, canCapture: false,
      });
    } else if (e.kind === "chest") {
      const tier = e.tier || 1;
      const loot = CHEST_LOOT[tier] || CHEST_LOOT[1];
      const gold = Math.round(loot.gold[0] + Math.random() * (loot.gold[1] - loot.gold[0]));
      const ticket = Math.random() < loot.ticketChance ? 1 : 0;
      collectEntity(e);
      gainRewards(gold, 8 + tier * 4, ticket);
      advanceQuest("chest", 1);
      notify(`🎁 Baú ${tier === 3 ? "lendário" : tier === 2 ? "prateado" : "comum"}: +${gold} ouro${ticket ? " +1 🎟️ bilhete de sorteio!" : "!"}`);
    } else if (e.kind === "crystal") {
      const tier = e.tier || 1;
      const gold = 8 + Math.floor(Math.random() * (8 + tier * 6));
      collectEntity(e);
      gainRewards(gold, 5 + tier * 3);
      notify(`💎 Cristal de energia: +${gold} ouro!`);
    } else if (e.kind === "portal") {
      const pm = PORTAL_META[e.portalId || "feira"];
      advanceQuest("portal", 1);
      gainRewards(15, 12);
      notify(`${pm.emoji} ${pm.label} aberto — +15 ouro, +12 XP`);
      setTimeout(() => navigate(pm.to), 450);
    }
  }, [advanceQuest, collectEntity, gainRewards, navigate, notify]);

  const interactRef = useRef(interact);
  interactRef.current = interact;

  // ---------- entidades REAIS: ficha + recompensa de descoberta ----------
  const openRealSheet = useCallback((e: RealEnt) => {
    setModal(null);
    setRealSheet(e);
  }, []);
  openRealSheetRef.current = openRealSheet;

  const claimVisit = useCallback((e: RealEnt) => {
    const c = charRef.current;
    if (!c) return;
    const stamp = `v:${e.key.split("@")[0]}`;
    const now = Date.now();
    if (c.loot[stamp] && c.loot[stamp] > now) { notify("✅ Já registaste esta oferta hoje — volta amanhã!"); return; }
    const d = haversineM(posRef.current.lat, posRef.current.lng, e.lat, e.lng);
    if (d > 300) { notify(`📍 Aproxima-te primeiro (estás a ${Math.round(d)}m)!`); return; }
    setChar((ch) => (ch ? { ...ch, loot: { ...ch.loot, [stamp]: now + 24 * 3600_000 } } : ch));
    gainRewards(10, 6);
    notify(`${e.emoji} Descoberta registada: +10 ouro, +6 XP!`);
  }, [gainRewards, notify]);

  // ---------- fetch do conteúdo real (renova a cada 90s) ----------
  useEffect(() => {
    if (screen !== "game") return;
    let alive = true;
    const load = async () => {
      const p = posRef.current;
      const cap = detectProvince(p.lat, p.lng);
      try {
        const r = await fetchReal(p.lat, p.lng, cap?.slug || null);
        if (!alive) return;
        setRealFixed(r.fixed);
        setRealScope(r.scoped);
      } catch { /* sem rede — mantém os anteriores */ }
    };
    load();
    const iv = window.setInterval(load, 90_000);
    return () => { alive = false; window.clearInterval(iv); };
  }, [screen]);

  useEffect(() => { refreshReal(); }, [realFixed, realScope, refreshReal]);

  // ---------- batalha ----------
  const attack = useCallback(() => {
    const b = battleRef.current;
    const c = charRef.current;
    if (!b || b.over || !c) return;
    const cr = creatureById(b.creatureId);
    const cls = classById(c.classId);
    const pAtk = atkFor(c.level, c.classId);
    const critChance = cls.id === "arqueiro" ? 0.25 : 0.15;
    const crit = Math.random() < critChance;
    const dmg = Math.max(3, Math.round(pAtk * (0.85 + Math.random() * 0.35) * (crit ? 2 : 1)));
    const cHp = Math.max(0, b.cHp - dmg);
    const log = [...b.log.slice(-5), `${crit ? "💥 CRÍTICO! " : "🗡️ "}Causas ${dmg} de dano ao ${cr.name}.`];
    if (cHp <= 0) {
      const gold = cr.gold + Math.floor(Math.random() * 10);
      log.push(`🎉 ${cr.name} derrotado! +${gold} ouro`);
      const nb: BattleState = { ...b, cHp, log, over: "win" };
      battleRef.current = nb;
      setBattle(nb);
      gainRewards(gold, cr.xp);
      advanceQuest("kill", 1);
      setChar((ch) => (ch ? { ...ch, stats: { ...ch.stats, kills: ch.stats.kills + 1 }, loot: { ...ch.loot, [b.entityKey]: Date.now() + 24 * 3600_000 } } : ch));
      const mk = entMarkers.current.get(b.entityKey);
      if (mk) { mk.remove(); entMarkers.current.delete(b.entityKey); }
      return;
    }
    const cAtk = cr.atk;
    const def = cls.def;
    const dmgTaken = Math.max(2, Math.round(cAtk * (0.75 + Math.random() * 0.5) * (1 - def / (def + 34))));
    const pHp = Math.max(0, b.pHp - dmgTaken);
    log.push(`🛡️ ${cr.name} contra-ataca: -${dmgTaken} HP`);
    if (pHp <= 0) {
      log.push("😵 Foste derrotado! Recuperas num ponto seguro…");
      const nb2: BattleState = { ...b, cHp, pHp, log, over: "lose" };
      battleRef.current = nb2;
      setBattle(nb2);
      setChar((ch) => (ch ? { ...ch, hp: Math.round(maxHpFor(ch.level, ch.classId) * 0.35) } : ch));
      notify("🩹 Curado parcialmente. Treina mais e volta!");
      return;
    }
    const nb3: BattleState = { ...b, cHp, pHp, log };
    battleRef.current = nb3;
    setBattle(nb3);
  }, [advanceQuest, gainRewards, notify]);

  const tryCapture = useCallback(() => {
    const b = battleRef.current;
    const c = charRef.current;
    if (!b || b.over !== "win" || !c) return;
    const cr = creatureById(b.creatureId);
    const cls = classById(c.classId);
    let chance = RARITY_META[cr.rarity].captureChance;
    if (cls.id === "assassino") chance = Math.min(0.95, chance * 1.6);
    const ok = Math.random() < chance;
    if (ok) {
      const nc: OWChar = {
        ...c,
        captured: { ...c.captured, [cr.id]: (c.captured[cr.id] || 0) + 1 },
        stats: { ...c.stats, captured: c.stats.captured + 1 },
      };
      charRef.current = nc;
      setChar(nc);
      advanceQuest("capture", 1);
      gainRewards(30, 20);
      const nb: BattleState = { ...b, log: [...b.log, `🐾 Lançaste a faixa de captura… ${cr.name} foi CAPTURADO!`] };
      battleRef.current = nb;
      setBattle(nb);
      notify(`🐾 ${cr.name} capturado! Vê no teu Bestiário.`);
    } else {
      const nb2: BattleState = { ...b, log: [...b.log, "🐾 A criatura escapou da faixa! Tenta noutra batalha."] };
      battleRef.current = nb2;
      setBattle(nb2);
    }
  }, [advanceQuest, gainRewards, notify]);

  const closeBattle = useCallback(() => {
    const b = battleRef.current;
    if (b && b.over === "win") collectEntity({ key: b.entityKey, kind: "creature", lat: 0, lng: 0 } as OWEntity);
    battleRef.current = null;
    setBattle(null);
  }, [collectEntity]);

  // ---------- GPS ----------
  const startGps = useCallback(async () => {
    setGpsStatus("asking");
    try {
      // permissões nativas (APK); em web ignora
      if ((Geolocation as unknown as { requestPermissions?: () => Promise<unknown> }).requestPermissions) {
        await Geolocation.requestPermissions();
      }
      if (watchId.current != null) {
        try { await Geolocation.clearWatch({ id: String(watchId.current) }); } catch { /* noop */ }
        watchId.current = null;
      }
      watchId.current = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 12000 }, (pos, err) => {
        if (err || !pos) {
          setGpsStatus((s) => (s === "on" ? s : "denied"));
          return;
        }
        setGpsStatus("on");
        setAccuracy(pos.coords.accuracy ?? null);
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        posRef.current = { lat, lng };
        setChar((c) => (c ? { ...c, pos: { lat, lng }, mode: "gps" } : c));
      });
      notify("🛰️ GPS ligado — anda no mundo real para explorar!");
    } catch {
      setGpsStatus("denied");
      notify("📡 Sem GPS — usa o joystick do explorador!");
    }
  }, [notify]);

  const stopGps = useCallback(async () => {
    if (watchId.current != null) {
      try { await Geolocation.clearWatch({ id: String(watchId.current) }); } catch { /* noop */ }
      watchId.current = null;
    }
    setGpsStatus("off");
  }, []);

  const setMode = useCallback(async (mode: "gps" | "joystick") => {
    setChar((c) => (c ? { ...c, mode } : c));
    if (mode === "gps") await startGps();
    else { await stopGps(); notify("🕹️ Modo Explorador: usa o joystick para andar no mapa!"); }
  }, [notify, startGps, stopGps]);

  // joystick loop
  useEffect(() => {
    if (!char || char.mode !== "joystick") return;
    let raf = 0;
    let last = performance.now();
    const SPEED = 7; // m/s — exploração rápida e divertida
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const j = joyRef.current;
      const c = charRef.current;
      if (j && c && (j.x !== 0 || j.y !== 0)) {
        const meters = SPEED * dt;
        const latRad = (c.pos.lat * Math.PI) / 180;
        const dLat = (-j.y * meters) / 111320;
        const dLng = (j.x * meters) / (111320 * Math.max(0.2, Math.cos(latRad)));
        const lat = c.pos.lat + dLat;
        const lng = c.pos.lng + dLng;
        posRef.current = { lat, lng };
        setChar((ch) => (ch ? { ...ch, pos: { lat, lng } } : ch));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [char?.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- mapa Leaflet ----------
  useEffect(() => {
    if (screen !== "game" || !wrapRef.current || mapRef.current) return;
    const c = charRef.current;
    const start = c?.pos || DEFAULT_POS;
    posRef.current = start;
    const map = L.map(wrapRef.current, { zoomControl: false, attributionControl: true });
    map.setView([start.lat, start.lng], 17);
    mapRef.current = map;

    const tileUrl = MB_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MB_TOKEN}`
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    const attrib = MB_TOKEN
      ? '© <a href="https://www.mapbox.com/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>';
    L.tileLayer(tileUrl, { maxZoom: 20, minZoom: 5, attribution: attrib }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("zoomend", () => setZoom(map.getZoom()));
    setMapReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
      avatarRef.current = null;
      entMarkers.current.forEach((m) => m.remove());
      entMarkers.current.clear();
      realMarkers.current.forEach((v) => v.m.remove());
      realMarkers.current.clear();
      setMapReady(false);
    };
  }, [screen]);

  // avatar + follow + entidades
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !char) return;
    const cls = classById(char.classId);
    const icon = L.divIcon({
      html: `<div class="ow-avatar" style="--owc:${cls.color}">${cls.emoji}</div>`,
      className: "ow-icon", iconSize: [44, 44], iconAnchor: [22, 22],
    });
    if (!avatarRef.current) {
      avatarRef.current = L.marker([char.pos.lat, char.pos.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      avatarRef.current.setLatLng([char.pos.lat, char.pos.lng]);
      avatarRef.current.setIcon(icon);
    }
    map.setView([char.pos.lat, char.pos.lng], map.getZoom(), { animate: true, duration: 0.35 });
    refreshEntities();
    refreshReal();
  }, [char?.pos.lat, char?.pos.lng, char?.classId, mapReady, refreshReal]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS inicial se modo gps
  useEffect(() => {
    if (char?.mode === "gps" && gpsStatus === "off") startGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char?.mode]);

  useEffect(() => () => { if (watchId.current != null) { try { Geolocation.clearWatch({ id: String(watchId.current) }); } catch { /* noop */ } } }, []);

  // ---------- dados ao vivo da plataforma ----------
  const fetchLive = useCallback(async (kind: "sorteios" | "feira" | "arena") => {
    try {
      if (kind === "sorteios") {
        const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from("raffles")
          .select("id,slug,title,prize_title,ticket_price,image_url,end_date,total_tickets,sold_tickets")
          .eq("status", "active").order("end_date", { ascending: true }).limit(6);
        if (error) throw error;
        setLiveRaffles((data || []) as LiveRaffle[]);
      } else if (kind === "feira") {
        const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from("contests")
          .select("id,title,image_url,status").in("status", ["active", "voting"]).order("created_at", { ascending: false }).limit(4);
        if (error) throw error;
        setLiveContests((data || []) as LiveContest[]);
      } else {
        const { data, error } = await (supabase as unknown as { from: (t: string) => any }).from("tournaments")
          .select("id,name,prize_description,prize_value,currency,end_date")
          .eq("status", "active").order("end_date", { ascending: true }).limit(5);
        if (error) throw error;
        setLiveTours((data || []) as LiveTournament[]);
      }
      setLiveErr(null);
    } catch { setLiveErr("Sem ligação à plataforma — verifica a internet"); }
  }, []);

  useEffect(() => {
    if (modal === "sorteios") fetchLive("sorteios");
    else if (modal === "feira") fetchLive("feira");
    else if (modal === "arena") fetchLive("arena");
  }, [modal, fetchLive]);

  // ---------- criação de personagem ----------
  const createChar = useCallback(() => {
    const nm = name.trim().slice(0, 16) || `Explorador${Math.floor(Math.random() * 999)}`;
    const cls = classById(pickClass);
    const c: OWChar = {
      v: 1, name: nm, classId: cls.id, level: 1, xp: 0, gold: 100, tickets: 1,
      hp: maxHpFor(1, cls.id), pos: { ...DEFAULT_POS }, mode: "joystick",
      captured: {}, stats: { kills: 0, chests: 0, crystals: 0, portals: 0, captured: 0 },
      questDate: todayStr(), quests: freshQuests(), loot: {}, createdAt: Date.now(),
    };
    setChar(c);
    saveChar(c);
    setScreen("game");
    notify(`🌍 Bem-vindo, ${nm}! Explora o mapa, derrota criaturas e conquista prémios reais!`);
  }, [name, pickClass, notify]);

  const claimQuest = useCallback((def: OWQuestDef) => {
    const c = charRef.current;
    if (!c) return;
    const st = c.quests.find((q) => q.id === def.id);
    if (!st || st.claimed || st.progress < def.target) return;
    const nc: OWChar = { ...c, quests: c.quests.map((q) => (q.id === def.id ? { ...q, claimed: true } : q)) };
    charRef.current = nc;
    setChar(nc);
    gainRewards(def.rewardGold, def.rewardXp, def.rewardTicket || 0);
    notify(`✅ Recompensa recebida: +${def.rewardGold} ouro${def.rewardTicket ? " +1 🎟️" : ""}!`);
  }, [gainRewards, notify]);

  if (screen === "create" || !char) {
    return (
      <div className="w-full min-h-[540px] h-[calc(100svh-215px)] rounded-xl overflow-hidden border border-border bg-gradient-to-b from-[#0b1020] via-[#101830] to-[#0b1020] relative flex flex-col items-center justify-start overflow-y-auto p-4">
        <div className="text-center mt-4 mb-3">
          <div className="text-4xl mb-1">🌍</div>
          <h2 className="text-2xl font-black text-white">BATEU MUNDO ABERTO</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Explora o mapa REAL da tua cidade, derrota criaturas, abre baús de sorteio
            e troca bilhetes por prémios verdadeiros da plataforma!
          </p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Nome do teu herói</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} maxLength={16}
              placeholder="Ex.: Kunta, Zeca, rainhaD…"
              className="w-full mt-1 px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white text-sm outline-none focus:border-emerald-400/60"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Escolhe a tua classe</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {OW_CLASSES.map((cl) => (
                <button key={cl.id} onClick={() => setPickClass(cl.id)}
                  className={`p-3 rounded-xl border text-left transition ${pickClass === cl.id ? "border-white/60 bg-white/10 scale-[1.02]" : "border-white/10 bg-black/30 hover:bg-white/5"}`}
                  style={pickClass === cl.id ? { borderColor: cl.color, boxShadow: `0 0 14px ${cl.color}55` } : undefined}>
                  <div className="text-2xl">{cl.emoji}</div>
                  <div className="font-black text-white text-sm">{cl.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cl.desc}</div>
                  <div className="flex gap-2 mt-1 text-[9px] font-bold">
                    <span className="text-red-300">⚔ {cl.atk}</span>
                    <span className="text-sky-300">🛡 {cl.def}</span>
                    <span className="text-green-300">❤ +{cl.hpBonus}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={createChar}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base shadow-lg shadow-emerald-900/40">
            🚀 COMEÇAR AVENTURA
          </motion.button>
          <p className="text-[10px] text-center text-muted-foreground">
            📍 Usamos a tua localização só durante o jogo (modo GPS) ou podes andar com o joystick. Os mapas são OpenStreetMap/Mapbox.
          </p>
        </div>
      </div>
    );
  }

  const cls = classById(char.classId);
  const pMax = maxHpFor(char.level, char.classId);
  const xpNeed = xpForLevel(char.level);
  const capturedTotal = Object.values(char.captured).reduce((a, b) => a + b, 0);

  return (
    <div className="relative w-full h-[calc(100svh-215px)] min-h-[460px] max-h-[820px] rounded-xl overflow-hidden border border-border select-none bg-[#0b1020]">
      {/* mapa */}
      <div ref={wrapRef} className="absolute inset-0 z-0" data-testid="ow-map" />

      {/* toasts */}
      <div className="absolute top-14 inset-x-0 z-[900] flex flex-col items-center gap-1 pointer-events-none px-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="px-3 py-1.5 rounded-lg bg-black/80 border border-white/15 text-white text-[11px] font-bold text-center max-w-[92%]">
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HUD topo */}
      <div className="absolute top-0 inset-x-0 p-2 flex items-center gap-1.5 z-[800] pointer-events-none">
        <button onClick={() => setModal("perfil")} data-testid="hud-perfil" className="pointer-events-auto flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/70 border border-white/15 text-white">
          <span className="text-lg">{cls.emoji}</span>
          <div className="text-left leading-none">
            <div className="text-[10px] font-black truncate max-w-[90px]">{char.name}</div>
            <div className="text-[9px] font-bold" style={{ color: cls.color }}>Nível {char.level}</div>
          </div>
        </button>
        <div className="px-2 py-1.5 rounded-lg bg-black/70 border border-red-500/30 flex items-center gap-1">
          <Heart className="h-3 w-3 text-red-400" />
          <div className="w-12 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(char.hp / pMax) * 100}%` }} />
          </div>
          <span className="text-[9px] text-white font-bold">{char.hp}</span>
        </div>
        <div className="flex-1" />
        <div className="px-2 py-1.5 rounded-lg bg-black/70 border border-yellow-500/30 flex items-center gap-1 text-[10px] font-black text-yellow-300">
          <Coins className="h-3 w-3" /> {char.gold}
        </div>
        <button onClick={() => navigate("/marketplace")} className="pointer-events-auto px-2 py-1.5 rounded-lg bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] font-black flex items-center gap-1">
          <Ticket className="h-3 w-3" /> {char.tickets}
        </button>
      </div>

      {/* barra XP */}
      <div className="absolute top-11 inset-x-0 px-2 z-[800] pointer-events-none">
        <div className="h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${Math.min(100, (char.xp / xpNeed) * 100)}%` }} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white border border-white/10">
            {gpsStatus === "on" ? `🛰️ GPS ${accuracy ? `±${Math.round(accuracy)}m` : ""}` : char.mode === "gps" ? "🛰️ GPS a ligar…" : "🕹️ Explorador"}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-white border border-white/10">🔍 zoom {zoom}</span>
        </div>
      </div>

      {/* dock inferior de atalhos */}
      <div className="absolute bottom-0 inset-x-0 z-[800] p-2 flex items-center justify-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-black/75 border border-white/15 pointer-events-auto overflow-x-auto max-w-full">
          <DockBtn emoji="📍" label="Perto" tid="dock-perto" onClick={() => setModal("perto")} />
          <DockBtn emoji="📜" label="Missões" tid="dock-quests" onClick={() => setModal("quests")} />
          <DockBtn emoji="🎁" label="Sorteios" tid="dock-sorteios" onClick={() => setModal("sorteios")} />
          <DockBtn emoji="🛒" label="Feira" tid="dock-feira" onClick={() => setModal("feira")} />
          <DockBtn emoji="🏆" label="Arena" tid="dock-arena" onClick={() => setModal("arena")} />
          <DockBtn emoji="📖" label="Bestiário" tid="dock-bestiario" onClick={() => setModal("bestiario")} />
          <button onClick={() => setMode(char.mode === "gps" ? "joystick" : "gps")}
            className="flex flex-col items-center px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-white active:scale-95">
            {char.mode === "gps" ? <Joystick className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
            <span className="text-[8px] font-black">{char.mode === "gps" ? "JOYSTICK" : "GPS"}</span>
          </button>
        </div>
      </div>

      {/* joystick */}
      {char.mode === "joystick" && (
        <JoystickPad onVec={(x, y) => { joyRef.current = { x, y }; }} />
      )}

      {/* ---------- MODAIS ---------- */}
      <AnimatePresence>
        {battle && (
          <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-3">
            <motion.div initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl bg-[#101830] border border-white/15 p-4 shadow-2xl">
              {(() => {
                const cr = creatureById(battle.creatureId);
                const rm = RARITY_META[cr.rarity];
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{cr.emoji}</span>
                        <div>
                          <div className="font-black text-white text-sm">{cr.name}</div>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${rm.color}22`, color: rm.color }}>{rm.label}</span>
                        </div>
                      </div>
                      <button onClick={closeBattle} className="p-1.5 rounded-lg bg-white/10 text-white"><X className="h-4 w-4" /></button>
                    </div>
                    <HpBar label={cr.name} hp={battle.cHp} max={battle.cMaxHp} color="#ef4444" />
                    <HpBar label={`${cls.emoji} ${char.name}`} hp={battle.pHp} max={battle.pMaxHp} color="#22c55e" />
                    <div className="h-20 overflow-y-auto mt-2 rounded-lg bg-black/40 border border-white/10 p-2 space-y-0.5">
                      {battle.log.map((l, i) => <div key={i} className="text-[10px] text-white/85">{l}</div>)}
                    </div>
                    {battle.over === null && (
                      <motion.button whileTap={{ scale: 0.96 }} onClick={attack}
                        className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-base">
                        ⚔️ ATACAR
                      </motion.button>
                    )}
                    {battle.over === "win" && (
                      <div className="mt-3 space-y-2">
                        {!battle.canCapture && !battle.log.some((l) => l.includes("CAPTURADO") || l.includes("escapou")) && (
                          <motion.button whileTap={{ scale: 0.96 }} onClick={tryCapture}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm">
                            🐾 TENTAR CAPTURAR
                          </motion.button>
                        )}
                        <button onClick={closeBattle} className="w-full py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-black text-sm">
                          CONTINUAR A EXPLORAR →
                        </button>
                      </div>
                    )}
                    {battle.over === "lose" && (
                      <button onClick={closeBattle} className="w-full mt-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white font-black text-sm">
                        😵 RECUPERAR E VOLTAR
                      </button>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}

        {modal && (
          <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-3"
            onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md max-h-[78%] overflow-y-auto rounded-2xl bg-[#101830] border border-white/15 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-white text-sm">
                  {modal === "quests" && "📜 Quadro de Missões de Hoje"}
                  {modal === "perto" && "📍 Perto de ti — da plataforma"}
                  {modal === "sorteios" && "🎁 Mural de Sorteios — ao vivo"}
                  {modal === "feira" && "🛒 Feira de Vendas da Plataforma"}
                  {modal === "arena" && "🏆 Arena de Torneios"}
                  {modal === "bestiario" && "📖 O teu Bestiário"}
                  {modal === "perfil" && "🧭 Painel do Aventureiro"}
                </h3>
                <button onClick={() => setModal(null)} data-testid="modal-close" className="p-1.5 rounded-lg bg-white/10 text-white"><X className="h-4 w-4" /></button>
              </div>

              {modal === "perto" && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">Ofertas, sorteios, concursos e cupões REAIS da plataforma perto de ti. Toca para abrir a ficha.</p>
                  {[...realFixed.map((e) => ({ e, d: haversineM(char.pos.lat, char.pos.lng, e.lat, e.lng) })),
                    ...realScope.map((e) => ({ e, d: haversineM(char.pos.lat, char.pos.lng, e.lat, e.lng) }))]
                    .sort((a, b) => a.d - b.d).slice(0, 12).map(({ e, d }) => (
                      <button key={e.key} data-testid={`perto-${e.kind}`} onClick={() => openRealSheet(e)}
                        className="w-full p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-left active:scale-[0.99]">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl overflow-hidden shrink-0" style={{ background: `${e.color}22`, border: `1px solid ${e.color}55` }}>
                          {e.img ? <img src={e.img} alt="" className="w-full h-full object-cover" /> : e.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black text-white truncate">{e.title}</div>
                          <div className="text-[10px] font-bold truncate" style={{ color: e.color }}>{e.sub}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-black text-white/80">{d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`}</div>
                          <ChevronRight className="h-3.5 w-3.5 text-white/40 inline" />
                        </div>
                      </button>
                    ))}
                  {realFixed.length === 0 && realScope.length === 0 && (
                    <div className="p-3 rounded-xl bg-black/20 border border-white/10 text-center">
                      <p className="text-[11px] text-white/80 font-bold">Ainda não há ofertas perto de ti.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Vende na Feira com localização no mapa, ou publica sorteios e concursos — aparecem aqui e no mapa do jogo!</p>
                      <button onClick={() => navigate("/marketplace")} className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-black">Abrir Sorteios</button>
                    </div>
                  )}
                </div>
              )}

              {modal === "quests" && (
                <div className="space-y-2">
                  {OW_QUESTS.map((def) => {
                    const st = char.quests.find((q) => q.id === def.id) || { id: def.id, progress: 0, claimed: false };
                    const done = st.progress >= def.target;
                    return (
                      <div key={def.id} className="p-2.5 rounded-xl bg-black/30 border border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{def.emoji}</span>
                          <div className="flex-1">
                            <div className="text-[12px] font-black text-white">{def.name}</div>
                            <div className="text-[10px] text-muted-foreground">{def.desc}</div>
                          </div>
                          {st.claimed ? <span className="text-[10px] font-black text-emerald-400">✅ Recebido</span>
                            : done ? <button onClick={() => claimQuest(def)} className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black">RECEBER</button>
                              : <span className="text-[10px] font-bold text-white/70">{st.progress}/{def.target}</span>}
                        </div>
                        <div className="h-1 mt-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (st.progress / def.target) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground text-center pt-1">Missões renovam todos os dias. Prémios em ouro, XP e bilhetes de sorteio real!</p>
                </div>
              )}

              {modal === "sorteios" && (
                <div className="space-y-2">
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/15 border border-red-400/30 text-[11px] text-red-200 flex items-center gap-1.5"><WifiOff className="h-3.5 w-3.5" /> {liveErr}</div>}
                  {liveRaffles.length === 0 && !liveErr && <p className="text-[11px] text-muted-foreground text-center py-3">A carregar sorteios reais…</p>}
                  {liveRaffles.map((r) => (
                    <button key={r.id} onClick={() => navigate(`/raffle/${r.slug || r.id}`)} className="w-full p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-left active:scale-[0.99]">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : "🎁"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-white truncate">{r.prize_title || r.title}</div>
                        <div className="text-[10px] text-amber-300 font-bold">{r.ticket_price ? `${r.ticket_price} MT por bilhete` : "Participa agora"}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                    </button>
                  ))}
                  <button onClick={() => navigate("/marketplace")} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm">
                    🎟️ Usar os meus {char.tickets} bilhete{char.tickets !== 1 ? "s" : ""} → Sorteios
                  </button>
                </div>
              )}

              {modal === "feira" && (
                <div className="space-y-2">
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/15 border border-red-400/30 text-[11px] text-red-200"><WifiOff className="h-3.5 w-3.5 inline mr-1" />{liveErr}</div>}
                  {liveContests.length === 0 && !liveErr && <p className="text-[11px] text-muted-foreground text-center py-3">A carregar a feira…</p>}
                  {liveContests.map((ct) => (
                    <button key={ct.id} onClick={() => navigate(`/concursos/${ct.id}`)} className="w-full p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-left">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {ct.image_url ? <img src={ct.image_url} alt="" className="w-full h-full object-cover" /> : "🖼️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-white truncate">{ct.title}</div>
                        <div className="text-[10px] text-fuchsia-300 font-bold">Concurso ativo</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                    </button>
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => navigate("/marketplace")} className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-center active:scale-[0.98]">
                      <div className="text-2xl">🎡</div><div className="text-[10px] font-black text-white">Rodas da Sorte</div>
                    </button>
                    <button onClick={() => navigate("/marketplace")} className="p-2.5 rounded-xl bg-black/30 border border-white/10 text-center active:scale-[0.98]">
                      <div className="text-2xl">🧠</div><div className="text-[10px] font-black text-white">Quem Quer Ser Milionário</div>
                    </button>
                  </div>
                </div>
              )}

              {modal === "arena" && (
                <div className="space-y-2">
                  {liveErr && <div className="p-2 rounded-lg bg-red-500/15 border border-red-400/30 text-[11px] text-red-200"><WifiOff className="h-3.5 w-3.5 inline mr-1" />{liveErr}</div>}
                  {liveTours.length === 0 && !liveErr && <p className="text-[11px] text-muted-foreground text-center py-3">A carregar torneios…</p>}
                  {liveTours.map((t) => (
                    <button key={t.id} onClick={() => navigate("/esports")} className="w-full p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 text-left">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-sky-500/30 to-blue-600/30 flex items-center justify-center text-xl shrink-0">🏆</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-white truncate">{t.name}</div>
                        <div className="text-[10px] text-sky-300 font-bold">{t.prize_description || (t.prize_value ? `${t.prize_value} ${t.currency || "MT"}` : "Com prémios")}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
                    </button>
                  ))}
                  <button onClick={() => navigate("/esports")} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-sm">
                    🏆 Abrir Arena de Torneios
                  </button>
                </div>
              )}

              {modal === "bestiario" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <Stat label="Criaturas capturadas" value={capturedTotal} emoji="🐾" />
                    <Stat label="Vitórias em batalha" value={char.stats.kills} emoji="⚔️" />
                    <Stat label="Baús abertos" value={char.stats.chests} emoji="🎁" />
                    <Stat label="Portais visitados" value={char.stats.portals} emoji="🌀" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {CREATURES.map((cr) => {
                      const have = char.captured[cr.id] || 0;
                      const rm = RARITY_META[cr.rarity];
                      return (
                        <div key={cr.id} className={`p-2 rounded-xl border ${have ? "bg-black/30" : "bg-black/10 opacity-50"}`} style={{ borderColor: have ? `${rm.color}66` : "rgba(255,255,255,0.08)" }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">{have ? cr.emoji : "❓"}</span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-white truncate">{have ? cr.name : "???"}</div>
                              <div className="text-[8px] font-bold" style={{ color: rm.color }}>{rm.label}{have ? ` · x${have}` : ""}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {modal === "perfil" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ background: `${cls.color}22`, border: `1.5px solid ${cls.color}` }}>{cls.emoji}</div>
                    <div>
                      <div className="font-black text-white">{char.name}</div>
                      <div className="text-[11px] font-bold" style={{ color: cls.color }}>{cls.name} · Nível {char.level}</div>
                      <div className="text-[10px] text-muted-foreground">Membro desde {new Date(char.createdAt).toLocaleDateString("pt-PT")}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat label="Ouro" value={char.gold} emoji="💰" />
                    <Stat label="Bilhetes" value={char.tickets} emoji="🎟️" />
                    <Stat label="Capturas" value={capturedTotal} emoji="🐾" />
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/15 border border-emerald-400/30">
                    <div className="text-[11px] font-black text-emerald-300 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Liga a toda a plataforma</div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button onClick={() => navigate("/marketplace")} className="p-2 rounded-lg bg-black/30 border border-white/10 active:scale-95"><Store className="h-4 w-4 text-white mx-auto" /><div className="text-[9px] font-bold text-white mt-1">Feira</div></button>
                      <button onClick={() => navigate("/esports")} className="p-2 rounded-lg bg-black/30 border border-white/10 active:scale-95"><Trophy className="h-4 w-4 text-white mx-auto" /><div className="text-[9px] font-bold text-white mt-1">Arena</div></button>
                      <button onClick={() => navigate("/jogos")} className="p-2 rounded-lg bg-black/30 border border-white/10 active:scale-95"><Gamepad2 className="h-4 w-4 text-white mx-auto" /><div className="text-[9px] font-bold text-white mt-1">Jogos</div></button>
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm("Recomeçar do zero? O teu progresso neste jogo será apagado.")) { localStorage.removeItem("bateu_openworld_save"); setChar(null); setScreen("create"); } }}
                    className="w-full py-2 rounded-lg bg-red-500/15 border border-red-400/30 text-red-300 text-[11px] font-black">
                    Recomeçar aventura
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {realSheet && (
          <motion.div key="real" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-3"
            onClick={(e) => { if (e.target === e.currentTarget) setRealSheet(null); }}>
            <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="w-full max-w-md rounded-2xl bg-[#101830] border border-white/15 overflow-hidden shadow-2xl" data-testid="real-sheet">
              <div className="h-28 relative shrink-0" style={{ background: `linear-gradient(135deg, ${realSheet.color}44, rgba(16,24,48,0.9))` }}>
                {realSheet.img ? <img src={realSheet.img} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl">{realSheet.emoji}</div>}
                <button onClick={() => setRealSheet(null)} data-testid="real-close" className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white"><X className="h-4 w-4" /></button>
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black text-black" style={{ background: realSheet.color }}>
                  {realSheet.kind === "listing" ? "FEIRA · À VENDA" : realSheet.kind === "raffle" ? "SORTEIO REAL" : realSheet.kind === "contest" ? "CONCURSO REAL" : "CUPÃO DE DESCONTO"}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <div className="font-black text-white text-base leading-tight">{realSheet.title}</div>
                <div className="text-[12px] font-bold" style={{ color: realSheet.color }}>{realSheet.sub}</div>
                <div className="text-[11px] text-muted-foreground">
                  📍 {(() => {
                    const d = haversineM(posRef.current.lat, posRef.current.lng, realSheet.lat, realSheet.lng);
                    return d < 1000 ? `${Math.round(d)}m de ti` : `${(d / 1000).toFixed(1)}km de ti`;
                  })()}
                </div>
                {realSheet.kind === "coupon" && realSheet.code && (
                  <button onClick={() => { try { navigator.clipboard?.writeText(realSheet.code!); notify("📋 Código copiado!"); } catch { /* noop */ } }}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-400/60 text-purple-200 font-black tracking-widest text-sm active:scale-[0.99]">
                    {realSheet.code} · TOCA PARA COPIAR
                  </button>
                )}
                <button onClick={() => navigate(realSheet.to)} data-testid="real-open"
                  className="w-full py-3 rounded-xl text-white font-black text-sm shadow-lg active:scale-[0.99]"
                  style={{ background: `linear-gradient(90deg, ${realSheet.color}, ${realSheet.color}cc)` }}>
                  {realSheet.kind === "listing" ? "🛒 Ver na Feira →" : realSheet.kind === "raffle" ? "🎟️ Participar no Sorteio →" : realSheet.kind === "contest" ? "🏆 Participar no Concurso →" : "🎟️ Usar nos Sorteios →"}
                </button>
                <button onClick={() => claimVisit(realSheet)} data-testid="real-visit"
                  className="w-full py-2 rounded-xl bg-white/10 border border-white/15 text-white font-black text-[11px]">
                  👀 Marcar visita (+10 ouro, +6 XP)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* estilos do jogo */}
      <style>{`
        .ow-icon { background: transparent !important; border: none !important; }
        .ow-ent { width: 100%; height: 100%; border-radius: 9999px; border: 2px solid; background: rgba(10,14,28,0.88);
          display: flex; align-items: center; justify-content: center; font-size: 17px; }
        .ow-portal { animation: owspin 4s linear infinite; }
        @keyframes owspin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        .ow-real { animation: owreal 2.2s ease-in-out infinite; }
        @keyframes owreal { 0%,100% { transform: scale(1);} 50% { transform: scale(1.14);} }
        .ow-avatar { width: 100%; height: 100%; border-radius: 9999px; border: 2.5px solid var(--owc, #22c55e);
          background: rgba(10,14,28,0.9); display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 0 0 3px rgba(255,255,255,0.08), 0 0 16px var(--owc, #22c55e);
          animation: owpulse 1.6s ease-in-out infinite; }
        @keyframes owpulse { 0%,100% { transform: scale(1);} 50% { transform: scale(1.08);} }
        .leaflet-container { background: #0b1020; font-family: inherit; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.6) !important; color: #94a3b8 !important; font-size: 8px !important; }
        .leaflet-control-attribution a { color: #60a5fa !important; }
        .leaflet-bar a { background: #101830 !important; color: #fff !important; border-color: rgba(255,255,255,0.15) !important; }
      `}</style>
    </div>
  );
}

// ---------- sub-componentes ----------
function DockBtn({ emoji, label, tid, onClick }: { emoji: string; label: string; tid?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid={tid} className="flex flex-col items-center px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white active:scale-95">
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[8px] font-black mt-0.5">{label}</span>
    </button>
  );
}

function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  return (
    <div className="mt-1.5">
      <div className="flex justify-between text-[9px] font-bold text-white/70 mb-0.5">
        <span className="truncate max-w-[70%]">{label}</span><span>{hp}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, (hp / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number | string; emoji: string }) {
  return (
    <div className="p-2 rounded-xl bg-black/30 border border-white/10">
      <div className="text-lg">{emoji}</div>
      <div className="text-sm font-black text-white">{value}</div>
      <div className="text-[8px] text-muted-foreground font-bold uppercase">{label}</div>
    </div>
  );
}

function JoystickPad({ onVec }: { onVec: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef(false);

  const upd = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const maxR = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
    setKnob({ x: dx, y: dy });
    const dead = 6;
    const nx = Math.abs(dx) < dead ? 0 : dx / maxR;
    const ny = Math.abs(dy) < dead ? 0 : dy / maxR;
    onVec(nx, ny);
  };

  const stop = () => { active.current = false; setKnob({ x: 0, y: 0 }); onVec(0, 0); };

  return (
    <div
      ref={ref}
      data-testid="joystick"
      className="absolute left-3 bottom-16 z-[850] w-[104px] h-[104px] rounded-full bg-black/55 border border-white/25 touch-none backdrop-blur-[2px]"
      onPointerDown={(e) => { active.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); upd(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (active.current) upd(e.clientX, e.clientY); }}
      onPointerUp={stop} onPointerCancel={stop} onPointerLeave={() => { if (active.current) stop(); }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/40 pointer-events-none">EXPLORAR</div>
      <div className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-white/40 shadow-lg pointer-events-none transition-transform"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)`, left: "calc(50% - 22px)", top: "calc(50% - 22px)" }} />
    </div>
  );
}

