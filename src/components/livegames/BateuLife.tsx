// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlatformData, fmtMZN, voucherLabel, worldRoute, type PlatformData } from "./world/platformSync";
import { LifeEngine, OUTFITS, FURNITURE, SKIN_TONES, type LifeScene, type FurnitureItem } from "./life/engine";
import { Coins, Users, Send, Store, Armchair, Gift, Gamepad2, Home, MapPin, X, Sparkles, Shirt, Trash2 } from "lucide-react";

// ============================================================
// BATEU LIFE — o mundo social da plataforma (estilo Avakin Life)
// Avatar com capulana, praça com amigos ao vivo, quarto decorável,
// baús com cupões reais, palco de sorteios e portal de mini-jogos.
// ============================================================

interface Props {
  onScore?: (name: string, score: number) => void;
  onNavigate?: (route: string) => void;
  liveCode?: string;
}

const LS_KEY = "bateu_life_v1";

interface Profile {
  uid: string;
  name: string;
  skin: number;
  outfit: number;
  owned: string[];       // ids de roupas
  furnitureOwned: string[]; // kinds de mobília
  coins: number;
  room: FurnitureItem[];
  lastDaily: string;
  vouchers: Array<{ id: string; code: string; label: string }>;
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }

function newProfile(name: string, skin: number, outfit: number): Profile {
  return {
    uid: "bl_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    name: name.slice(0, 14), skin, outfit,
    owned: ["capulana-classica", "capulana-verde"],
    furnitureOwned: ["planta", "tapete"],
    coins: 80, room: [], lastDaily: "", vouchers: [],
  };
}

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    if (!p?.name || !p?.uid) return null;
    return p;
  } catch { return null; }
}

const EMOTES = ["👋", "❤️", "😂", "💃", "🔥"];

const PORTAL_GAMES = [
  { id: "ludo", label: "Ludo", emoji: "🎲" },
  { id: "capulanaquiz", label: "Quiz Capulana", emoji: "🧠" },
  { id: "dominoes", label: "Dominó", emoji: "🁣" },
  { id: "snakesladders", label: "Cobras e Escadas", emoji: "🐍" },
  { id: "tictactoepro", label: "Jogo do Galo", emoji: "⭕" },
  { id: "uno", label: "UNO", emoji: "🃏" },
  { id: "checkers", label: "Damas", emoji: "⚫" },
  { id: "bingo", label: "Bingo", emoji: "🎱" },
];

const POI_LABELS: Record<string, string> = {
  palco: "🎁 Palco dos Sorteios",
  loja: "🛍️ Entrar na Loja de Moda",
  mobilia: "🪑 Entrar na Loja de Mobília",
  portal: "🕹️ Portal dos Jogos",
  casa: "🏠 Entrar no Meu Quarto",
  bau0: "💰 Abrir Baú",
  bau1: "💰 Abrir Baú",
  bau2: "💰 Abrir Baú",
  fonte: "⛲ Fazer um pedido ✨",
  saida: "🚪 Voltar à Praça",
};

export default function BateuLife({ onScore, onNavigate }: Props) {
  const [phase, setPhase] = useState<"boot" | "create" | "world">("boot");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pickSkin, setPickSkin] = useState(0);
  const [pickOutfit, setPickOutfit] = useState(0);

  const [scene, setScene] = useState<LifeScene>("praca");
  const [nearPoi, setNearPoi] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "shop" | "palco" | "portal" | "reward">(null);
  const [shopTab, setShopTab] = useState<"moda" | "mobilia">("moda");
  const [platform, setPlatform] = useState<PlatformData | null>(null);
  const [reward, setReward] = useState<null | { kind: "coins" | "voucher"; text: string; sub?: string }>(null);
  const [openedChests, setOpenedChests] = useState<string[]>([]);
  const [decorate, setDecorate] = useState<string | null>(null);
  const [online, setOnline] = useState(1);
  const [chatMsgs, setChatMsgs] = useState<Array<{ id: string; n: string; m: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; good?: boolean }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LifeEngine | null>(null);
  const channelRef = useRef<any>(null);
  const profRef = useRef<Profile | null>(null);
  const toastId = useRef(0);

  profRef.current = profile;

  const pushToast = useCallback((text: string, good = true) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, good }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const save = useCallback((p: Profile) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }, []);

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      save(next);
      return next;
    });
  }, [save]);

  const go = useCallback((route: string) => {
    if (onNavigate) onNavigate(route);
    else window.location.href = route;
  }, [onNavigate]);

  // ── Boot ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = loadProfile();
      if (saved) { setProfile(saved); setPhase("world"); }
      else setPhase("create");
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // ── Dados da plataforma (sorteios/cupões reais) ────────────
  useEffect(() => {
    if (phase !== "world") return;
    fetchPlatformData().then(setPlatform).catch(() => {});
  }, [phase]);

  // ── Motor + rede ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "world" || !canvasRef.current || !profile) return;
    const p = profile;

    const engine = new LifeEngine({
      canvas: canvasRef.current,
      name: p.name, skin: p.skin, outfit: p.outfit,
      onEvent: (e) => {
        if (e.type === "nearPoi") setNearPoi(e.poi ?? null);
        if (e.type === "tap" && e.tile && engine.getDecorate() && engine.scene === "quarto") {
          const kind = engine.getDecorate();
          const tile = e.tile;
          if (kind === "__remover") {
            const me = profRef.current; if (!me) return;
            const hit = me.room.find((f) => f.x === tile.x && f.y === tile.y);
            if (hit) {
              const room = me.room.filter((f) => f !== hit);
              const next = { ...me, room };
              setProfile(next); save(next); engine.setFurniture(room);
              engine.setDecorate(null); setDecorate(null);
              pushToast("📦 Móvel guardado no inventário");
            }
            return;
          }
          if (kind) {
            const me = profRef.current; if (!me) return;
            if (me.room.some((f) => f.x === tile.x && f.y === tile.y)) { pushToast("Já há móvel aqui!", false); return; }
            const item: FurnitureItem = { id: "f_" + Math.random().toString(36).slice(2, 8), kind, x: tile.x, y: tile.y };
            const room = [...me.room, item];
            const next = { ...me, room };
            setProfile(next); save(next); engine.setFurniture(room);
            engine.setDecorate(null); setDecorate(null);
            pushToast("✨ Móvel colocado!");
          }
        }
      },
    });
    engine.setFurniture(p.room);
    engine.start();
    engineRef.current = engine;

    // rede: presença + posições + chat (Supabase Realtime)
    let posTimer: any = null;
    try {
      const ch = supabase.channel("bateu-life-v1", { config: { presence: { key: p.uid } } });
      ch.on("presence", { event: "sync" }, () => {
        const st = ch.presenceState();
        setOnline(Math.max(1, Object.keys(st).length));
      });
      ch.on("broadcast", { event: "life" }, ({ payload }: any) => {
        if (!payload || payload.id === p.uid) return;
        if (payload.t === "pos") engine.applyRemote(payload.id, { x: payload.x, y: payload.y, name: payload.n, skin: payload.s, outfit: payload.o });
        else if (payload.t === "chat") {
          setChatMsgs((m) => [...m.slice(-30), { id: payload.id, n: payload.n, m: payload.m }]);
          engine.applyRemote(payload.id, { bubble: payload.m });
        } else if (payload.t === "emote") engine.applyRemote(payload.id, { emote: payload.e });
        else if (payload.t === "bye") engine.removeRemote(payload.id);
      });
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") ch.track({ n: p.name });
      });
      channelRef.current = ch;
      posTimer = setInterval(() => {
        const pos = engine.getSelfPos();
        ch.send({ type: "broadcast", event: "life", payload: { t: "pos", id: p.uid, n: p.name, x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100, s: p.skin, o: p.outfit } });
      }, 250);
    } catch { /* rede indisponível — mundo local continua */ }

    return () => {
      clearInterval(posTimer);
      try {
        channelRef.current?.send({ type: "broadcast", event: "life", payload: { t: "bye", id: p.uid } });
        channelRef.current?.unsubscribe();
      } catch { /* ignore */ }
      channelRef.current = null;
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // atualiza visual do avatar quando muda de roupa
  useEffect(() => {
    if (engineRef.current && profile) {
      // recria avatar barato: atualiza via novo motor não é preciso — engine lê profile na renderização do jogador
    }
  }, [profile?.outfit, profile?.skin]);

  const enterWorld = (p: Profile) => { setProfile(p); save(p); setPhase("world"); };

  // ── Ações ──────────────────────────────────────────────────
  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMsgs((m) => [...m.slice(-30), { id: profile?.uid || "eu", n: profile?.name || "Eu", m: msg }]);
    engineRef.current?.say(msg);
    try { channelRef.current?.send({ type: "broadcast", event: "life", payload: { t: "chat", id: profile?.uid, n: profile?.name, m: msg.slice(0, 60) } }); } catch { /* ignore */ }
    setChatInput("");
  };

  const doEmote = (e: string) => {
    engineRef.current?.setEmote(e);
    try { channelRef.current?.send({ type: "broadcast", event: "life", payload: { t: "emote", id: profile?.uid, e } }); } catch { /* ignore */ }
  };

  const claimDaily = () => {
    if (!profile) return;
    if (profile.lastDaily === todayStr()) { pushToast("O bónus de hoje já foi reclamado!", false); return; }
    update((p) => ({ ...p, coins: p.coins + 60, lastDaily: todayStr() }));
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
    pushToast("💸 Bónus diário: +60 moedas!");
  };

  const buyOutfit = (id: string, price: number) => {
    if (!profile) return;
    if (profile.owned.includes(id)) {
      const idx = OUTFITS.findIndex((o) => o.id === id);
      update((p) => ({ ...p, outfit: idx }));
      pushToast("👕 Roupa equipada!");
      return;
    }
    if (profile.coins < price) { pushToast("Moedas insuficientes! Abre baús e joga.", false); return; }
    const idx = OUTFITS.findIndex((o) => o.id === id);
    update((p) => ({ ...p, coins: p.coins - price, owned: [...p.owned, id], outfit: idx }));
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
    pushToast("🛍️ Comprou e vestiu!");
  };

  const buyFurniture = (kind: string, price: number) => {
    if (!profile) return;
    if (profile.furnitureOwned.includes(kind)) { pushToast("Já tens este móvel — vai decorar o quarto!", false); return; }
    if (profile.coins < price) { pushToast("Moedas insuficientes!", false); return; }
    update((p) => ({ ...p, coins: p.coins - price, furnitureOwned: [...p.furnitureOwned, kind] }));
    pushToast("🪑 Móvel comprado! Decora o teu quarto.");
  };

  const openChest = (chestId: string) => {
    if (!profile) return;
    if (openedChests.includes(chestId)) { pushToast("Este baú já foi aberto — volta amanhã!", false); return; }
    setOpenedChests((c) => [...c, chestId]);
    const vouchers = platform?.vouchers ?? [];
    if (vouchers.length > 0 && Math.random() < 0.55) {
      const v = vouchers[Math.floor(Math.random() * vouchers.length)];
      const label = voucherLabel(v);
      update((p) => ({ ...p, vouchers: [...p.vouchers, { id: v.id, code: v.code, label }] }));
      setReward({ kind: "voucher", text: `Cupão ${label}`, sub: `Código: ${v.code} — usa na Feira Bateu!` });
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    } else {
      const coins = 20 + Math.floor(Math.random() * 41);
      update((p) => ({ ...p, coins: p.coins + coins }));
      setReward({ kind: "coins", text: `+${coins} moedas!`, sub: "Usa na Loja de Moda ou de Mobília" });
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
    }
    setPanel("reward");
  };

  const poiAction = () => {
    switch (nearPoi) {
      case "loja": setShopTab("moda"); setPanel("shop"); break;
      case "mobilia": setShopTab("mobilia"); setPanel("shop"); break;
      case "palco": setPanel("palco"); break;
      case "portal": setPanel("portal"); break;
      case "casa": switchScene("quarto"); break;
      case "saida": switchScene("praca"); break;
      case "bau0": openChest("bau0"); break;
      case "bau1": openChest("bau1"); break;
      case "bau2": openChest("bau2"); break;
      case "fonte":
        doEmote("✨");
        pushToast("⛲ Pediu um desejo na fonte…");
        break;
    }
  };

  const switchScene = (s: LifeScene) => {
    engineRef.current?.setScene(s);
    setScene(s);
  };

  const startDecorate = (kind: string | null) => {
    engineRef.current?.setDecorate(kind);
    setDecorate(kind);
  };

  const removeFurnitureAt = () => startDecorate("__remover");

  // ── Render ─────────────────────────────────────────────────
  if (phase === "boot") {
    return (
      <div className="w-full h-[72vh] min-h-[540px] rounded-2xl bg-gradient-to-br from-fuchsia-950 via-purple-950 to-cyan-950 flex flex-col items-center justify-center gap-4" data-testid="bateu-life-root">
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-6xl">🏙️</motion.div>
        <p className="font-display text-2xl font-black text-white">BATEU LIFE</p>
        <p className="text-white/60 text-sm">A entrar no mundo social…</p>
      </div>
    );
  }

  if (phase === "create") {
    return (
      <div className="w-full h-[72vh] min-h-[540px] rounded-2xl bg-gradient-to-br from-fuchsia-950 via-purple-950 to-cyan-950 relative overflow-hidden" data-testid="bateu-life-root">
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 75% 15%, #22d3ee 0%, transparent 45%), radial-gradient(circle at 15% 85%, #e879f9 0%, transparent 40%)" }} />
        <div className="relative h-full overflow-y-auto p-5 md:p-8 flex flex-col items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-4xl md:text-5xl mb-1">🏙️</p>
            <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white">BATEU LIFE</h2>
            <p className="text-white/70 text-sm">O teu avatar, a tua vida, prémios reais da plataforma</p>
          </div>
          <div>
            <p className="text-white/80 text-xs font-bold mb-1.5 text-center">Escolhe o teu tom de pele</p>
            <div className="flex gap-2 justify-center">
              {SKIN_TONES.map((c, i) => (
                <button key={c} data-testid="life-skin-opt" onClick={() => setPickSkin(i)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform ${pickSkin === i ? "border-cyan-300 scale-110" : "border-white/20"}`}
                  style={{ background: c }} aria-label={`Tom ${i + 1}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/80 text-xs font-bold mb-1.5 text-center">Capulana inicial (grátis)</p>
            <div className="flex gap-2 justify-center">
              {OUTFITS.filter((o) => o.price === 0).map((o) => {
                const idx = OUTFITS.indexOf(o);
                return (
                  <button key={o.id} data-testid="life-outfit-opt" onClick={() => setPickOutfit(idx)}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-bold text-white transition-transform ${pickOutfit === idx ? "border-cyan-300 scale-105" : "border-white/20"}`}
                    style={{ background: `linear-gradient(135deg, ${o.base}, ${o.band})` }}>
                    {o.name}
                  </button>
                );
              })}
            </div>
          </div>
          <input
            data-testid="life-create-name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) enterWorld(newProfile(nameInput, pickSkin, pickOutfit)); }}
            placeholder="Nome do teu avatar"
            maxLength={14}
            className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-center placeholder:text-white/40 outline-none focus:border-cyan-300"
          />
          <button
            data-testid="life-enter-btn"
            disabled={!nameInput.trim()}
            onClick={() => nameInput.trim() && enterWorld(newProfile(nameInput, pickSkin, pickOutfit))}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-black disabled:opacity-40 shadow-lg shadow-fuchsia-500/30"
          >
            ENTRAR NO MUNDO ▶
          </button>
          <p className="text-white/40 text-[10px] text-center max-w-xs">Praça social ao vivo · quarto decorável · baús com cupões reais · palco de sorteios · portal de mini-jogos</p>
        </div>
      </div>
    );
  }

  const dailyReady = profile && profile.lastDaily !== todayStr();

  return (
    <div className="w-full h-[72vh] min-h-[540px] rounded-2xl overflow-hidden relative bg-black" data-testid="bateu-life-root">
      <canvas ref={canvasRef} data-testid="life-canvas" className="absolute inset-0 w-full h-full touch-none" />

      {/* HUD topo */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none z-20">
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-amber-300 font-black text-xs flex items-center gap-1" data-testid="life-coins">
              <Coins className="h-3.5 w-3.5" /> {profile?.coins ?? 0}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur text-emerald-300 font-bold text-xs flex items-center gap-1" data-testid="life-online">
              <Users className="h-3.5 w-3.5" /> {online} online
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur text-white/90 font-bold text-[11px] w-fit">
            {profile?.name} · {scene === "praca" ? "Praça Central" : "Meu Quarto"}
          </span>
          {dailyReady && (
            <button onClick={claimDaily} data-testid="life-daily" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-[11px] w-fit animate-pulse shadow-lg">
              🎁 BÓNUS DIÁRIO +60
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button onClick={() => setPanel("portal")} className="h-9 w-9 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-lg" title="Portal dos Jogos">🕹️</button>
          <button onClick={() => setPanel("palco")} className="h-9 w-9 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-lg" title="Palco dos Sorteios">🎁</button>
          <button onClick={() => setPanel("shop")} data-testid="life-shop-btn" className="h-9 w-9 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-lg" title="Lojas">🛍️</button>
        </div>
      </div>

      {/* Emotes */}
      <div className="absolute top-16 right-2 flex flex-col gap-1.5 z-20">
        {EMOTES.map((e) => (
          <button key={e} data-testid="life-emote" onClick={() => doEmote(e)} className="h-9 w-9 rounded-full bg-black/50 backdrop-blur text-lg hover:scale-110 transition-transform">{e}</button>
        ))}
      </div>

      {/* Joystick virtual */}
      <JoyStick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />

      {/* Botão de ação contextual */}
      <AnimatePresence>
        {nearPoi && (
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            onClick={poiAction}
            data-testid="life-action-btn"
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-black text-sm shadow-xl shadow-fuchsia-500/40 z-20"
          >
            {POI_LABELS[nearPoi] || "Interagir"} ▶
          </motion.button>
        )}
      </AnimatePresence>

      {/* Barra inferior: chat + quarto */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[min(560px,94%)] z-20">
        {chatOpen && (
          <div className="mb-1.5 max-h-24 overflow-y-auto rounded-lg bg-black/45 backdrop-blur px-2.5 py-1.5 space-y-0.5" data-testid="life-chat-log">
            {chatMsgs.length === 0 && <p className="text-white/50 text-[10px]">Conversa com quem estiver na praça 💬</p>}
            {chatMsgs.map((m, i) => (
              <p key={i} className="text-[11px] text-white"><span className="font-bold text-cyan-300">{m.n}:</span> {m.m}</p>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button onClick={() => setChatOpen((o) => !o)} className="h-9 px-2 rounded-lg bg-black/60 backdrop-blur text-white text-xs">💬</button>
          {scene === "praca" ? (
            <button onClick={() => switchScene("quarto")} data-testid="life-goto-room" className="h-9 px-3 rounded-lg bg-black/60 backdrop-blur text-white font-bold text-xs whitespace-nowrap">🏠 Quarto</button>
          ) : (
            <button onClick={() => switchScene("praca")} data-testid="life-goto-plaza" className="h-9 px-3 rounded-lg bg-black/60 backdrop-blur text-white font-bold text-xs whitespace-nowrap">⛲ Praça</button>
          )}
          {scene === "quarto" && (
            <>
              <button onClick={() => startDecorate(decorate ? null : "planta")} data-testid="life-decorate-btn" className={`h-9 px-3 rounded-lg font-bold text-xs whitespace-nowrap ${decorate ? "bg-fuchsia-500 text-white" : "bg-black/60 backdrop-blur text-white"}`}>🪑 Decorar</button>
              <button onClick={removeFurnitureAt} className="h-9 px-3 rounded-lg bg-black/60 backdrop-blur text-white font-bold text-xs"><Trash2 className="h-3.5 w-3.5 inline" /></button>
            </>
          )}
          <div className="flex-1 relative">
            <input
              data-testid="life-chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
              placeholder="Diz olá à praça…"
              maxLength={60}
              className="w-full h-9 pl-3 pr-9 rounded-lg bg-black/60 backdrop-blur text-white text-xs placeholder:text-white/40 outline-none border border-white/10 focus:border-cyan-300/60"
            />
            <button onClick={sendChat} data-testid="life-chat-send" className="absolute right-1 top-1 h-7 w-7 rounded-md bg-gradient-to-r from-fuchsia-500 to-cyan-500 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Inventário de decoração (quarto) */}
      {decorate && decorate !== "__remover" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/80 backdrop-blur rounded-xl p-3 w-[min(420px,92%)]">
          <p className="text-white font-bold text-xs mb-2">Escolhe o móvel a colocar ({FURNITURE.find((f) => f.kind === decorate)?.name})</p>
          <div className="grid grid-cols-4 gap-1.5">
            {FURNITURE.filter((f) => profile?.furnitureOwned.includes(f.kind)).map((f) => (
              <button key={f.kind} onClick={() => startDecorate(f.kind)} className={`rounded-lg p-2 text-center ${decorate === f.kind ? "bg-fuchsia-500/40 border border-fuchsia-300" : "bg-white/5 border border-white/10"}`}>
                <span className="text-xl block">{f.emoji}</span>
                <span className="text-[9px] text-white/70">{f.name}</span>
              </button>
            ))}
          </div>
          <button onClick={() => startDecorate(null)} className="mt-2 w-full py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold">Cancelar</button>
        </div>
      )}

      {/* Toasts */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 space-y-1.5 w-[min(360px,90%)]">
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-lg px-3 py-2 text-xs font-bold text-center backdrop-blur ${t.good ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"}`}>
            {t.text}
          </motion.div>
        ))}
      </div>

      {/* ── Painéis ── */}
      <AnimatePresence>
        {panel === "shop" && profile && (
          <PanelShell title="🛍️ Lojas Bateu" onClose={() => setPanel(null)} testid="life-panel-shop">
            <div className="flex gap-1.5 mb-3">
              <button onClick={() => setShopTab("moda")} className={`flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${shopTab === "moda" ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white/70"}`}><Shirt className="h-3.5 w-3.5" /> Moda</button>
              <button onClick={() => setShopTab("mobilia")} className={`flex-1 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${shopTab === "mobilia" ? "bg-cyan-500 text-white" : "bg-white/10 text-white/70"}`}><Armchair className="h-3.5 w-3.5" /> Mobília</button>
            </div>
            {shopTab === "moda" ? (
              <div className="grid grid-cols-2 gap-2">
                {OUTFITS.map((o) => {
                  const owned = profile.owned.includes(o.id);
                  const equipped = OUTFITS[profile.outfit]?.id === o.id;
                  return (
                    <div key={o.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="h-10 rounded-lg mb-1.5" style={{ background: `linear-gradient(135deg, ${o.base}, ${o.band})` }} />
                      <p className="text-white font-bold text-[11px] leading-tight">{o.name}</p>
                      <button data-testid="life-shop-buy" onClick={() => buyOutfit(o.id, o.price)}
                        className={`mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-black ${equipped ? "bg-emerald-500/80 text-white" : owned ? "bg-white/15 text-white" : profile.coins >= o.price ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black" : "bg-white/10 text-white/50"}`}>
                        {equipped ? "✓ VESTIDA" : owned ? "VESTIR" : `${o.price} moedas`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {FURNITURE.map((f) => {
                  const owned = profile.furnitureOwned.includes(f.kind);
                  return (
                    <div key={f.kind} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="text-2xl mb-1">{f.emoji}</div>
                      <p className="text-white font-bold text-[11px] leading-tight">{f.name}</p>
                      <button onClick={() => buyFurniture(f.kind, f.price)}
                        className={`mt-1.5 w-full py-1.5 rounded-lg text-[10px] font-black ${owned ? "bg-white/15 text-white" : profile.coins >= f.price ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white" : "bg-white/10 text-white/50"}`}>
                        {owned ? "✓ NO INVENTÁRIO" : `${f.price} moedas`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </PanelShell>
        )}

        {panel === "palco" && (
          <PanelShell title="🎁 Palco dos Sorteios" onClose={() => setPanel(null)} testid="life-panel-palco">
            <p className="text-white/60 text-xs mb-3">Sorteios REAIS da plataforma — participa e pode ser teu!</p>
            <div className="space-y-2">
              {(platform?.raffles ?? []).slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-xl shrink-0">🎫</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs truncate">{r.title}</p>
                    <p className="text-white/60 text-[10px] truncate">{r.prizeTitle} · {fmtMZN(r.prizeValue)}</p>
                    <p className="text-amber-300 text-[10px] font-bold">Bilhete: {fmtMZN(r.ticketPrice)}</p>
                  </div>
                  <button onClick={() => go(worldRoute("raffle", r))} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black shrink-0">PARTICIPAR</button>
                </div>
              ))}
              {(!platform || platform.raffles.length === 0) && <p className="text-white/40 text-xs text-center py-6">A carregar sorteios…</p>}
            </div>
            <p className="text-white/40 text-[10px] mt-3 text-center">{platform?.live ? "🟢 Ligado aos sorteios reais da plataforma" : "🟡 Modo demonstração (sem ligação à base)"}</p>
          </PanelShell>
        )}

        {panel === "portal" && (
          <PanelShell title="🕹️ Portal dos Jogos" onClose={() => setPanel(null)} testid="life-panel-portal">
            <p className="text-white/60 text-xs mb-3">Todos os jogos da plataforma dentro do Bateu Life:</p>
            <div className="grid grid-cols-2 gap-2">
              {PORTAL_GAMES.map((g) => (
                <button key={g.id} onClick={() => go(`/lives?game=${g.id}`)}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-cyan-300/60 transition-colors">
                  <span className="text-2xl block mb-1">{g.emoji}</span>
                  <span className="text-white font-bold text-xs">{g.label}</span>
                </button>
              ))}
            </div>
          </PanelShell>
        )}

        {panel === "reward" && reward && (
          <PanelShell title="✨ Recompensa!" onClose={() => { setPanel(null); setReward(null); }} testid="life-panel-reward">
            <div className="text-center py-4">
              <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-6xl mb-3">
                {reward.kind === "coins" ? "💰" : "🎟️"}
              </motion.div>
              <p className="text-white font-black text-xl">{reward.text}</p>
              {reward.sub && <p className="text-white/60 text-xs mt-1.5">{reward.sub}</p>}
              <button onClick={() => { setPanel(null); setReward(null); }} className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-black text-sm">RECOLHER</button>
            </div>
          </PanelShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Joystick virtual ────────────────────────────────────────
function JoyStick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activeId = useRef<number | null>(null);

  const handle = (e: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / max, dy / max);
  };

  const stop = () => {
    activeId.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      data-testid="life-joy"
      className="absolute bottom-16 left-4 w-28 h-28 rounded-full bg-black/35 backdrop-blur border border-white/15 z-20 touch-none"
      onPointerDown={(e) => { activeId.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); handle(e); }}
      onPointerMove={(e) => { if (activeId.current === e.pointerId) handle(e); }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 shadow-lg" />
    </div>
  );
}

// ── Contentor de painéis ────────────────────────────────────
function PanelShell({ title, children, onClose, testid }: { title: string; children: React.ReactNode; onClose: () => void; testid?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-3" onClick={onClose}>
      <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        data-testid={testid}
        className="w-[min(480px,96%)] max-h-[82%] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950 border border-white/15 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-white font-black text-base">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
