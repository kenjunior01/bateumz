import re

def gen():
    with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx.bak', 'r') as f:
        original = f.read()

    render_blocks = []
    for m in re.finditer(r'\{active === "(\w+)" && \((\s*<motion\.div[^>]*>.*?</motion\.div>)\s*\)\)', original, re.DOTALL):
        game_id = m.group(1)
        content = m.group(2).strip()
        render_blocks.append((game_id, content))

    render_map = dict(render_blocks)

    MOZ_GAMES = ["mexerica", "urusse", "capulanaquiz", "chigogo", "ntchuva", "djikota", "uri", "bicho"]

    game_cat = {}
    cat_games = {
        "popular": ["wheel", "tap", "quiz", "emoji", "millionaire", "kahoot", "bingo", "mystery", "keyword", "challenge", "punishment", "slotsvs"],
        "tabuleiro": ["checkers", "ludo", "connect4", "battleship", "dominoes", "tictactoe", "tictactoepro", "uno"],
        "acao": ["snakebattle", "spaceshooter", "ballbreaker", "pongvs", "cannonbattle", "whackamole", "reactionrace", "towerstack", "hotpotato", "chaos"],
        "puzzle": ["memory", "colorsequence", "patternmemory", "wordscramble", "spotdifference", "numbertetris", "match4", "memorycards", "colorcatch", "colormatch", "targettap", "mazerace"],
        "quiz": ["quiz", "millionaire", "kahoot", "triviaflash", "boknowledge", "guessEmoji", "capulanaquiz", "quickdraw", "wordchain"],
        "versus": ["vsduel", "speed", "numguess", "rps", "quickmath", "diceluel", "guessnumber100", "chigogo", "ntchuva", "djikota", "uri", "urusse", "mexerica"],
    }

    for gid in MOZ_GAMES:
        game_cat[gid] = "mocambicano"
    for cat, games in cat_games.items():
        for g in games:
            if g not in game_cat:
                game_cat[g] = cat

    games_match = re.search(r'const GAMES:.*?= \[([\s\S]*?)\];', original)
    games_entries = []
    if games_match:
        for entry_match in re.finditer(r'\{ id: "(\w+)", label: "([^"]+)", icon: (\w+), emoji: "([^"]+)", desc: "([^"]+)", grad: "([^"]+)" \}', games_match.group(1)):
            games_entries.append({
                'id': entry_match.group(1),
                'label': entry_match.group(2),
                'icon': entry_match.group(3),
                'emoji': entry_match.group(4),
                'desc': entry_match.group(5),
                'grad': entry_match.group(6),
            })

    lines = []
    for g in games_entries:
        c = game_cat.get(g['id'], 'popular')
        mz = 'true' if g['id'] in MOZ_GAMES else 'false'
        gid = g['id']
        glab = g['label']
        gico = g['icon']
        gemo = g['emoji']
        gdsc = g['desc']
        ggrd = g['grad']
        lines.append(f'  {{ id: "{gid}", label: "{glab}", icon: {gico}, emoji: "{gemo}", desc: "{gdsc}", grad: "{ggrd}", cat: "{c}" as const, moz: {mz} }}')

    print(f'Found {len(games_entries)} games, {len(render_map)} render blocks')
    missing = [g['id'] for g in games_entries if g['id'] not in render_map]
    if missing:
        print(f'WARNING: Missing renders for: {missing}')

    game_renders = []
    for g in games_entries:
        gid = g['id']
        if gid in render_map:
            game_renders.append(f'              {{active === "{gid}" && (\n                {render_map[gid]}\n              )}}')
        else:
            print(f'  MISSING render for {gid}')

    moz_cards = []
    for g in games_entries:
        if g['id'] in MOZ_GAMES:
            gid = g['id']
            glab = g['label']
            gemo = g['emoji']
            gdsc = g['desc']
            moz_cards.append(f'''            <button\n              key="{gid}"\n              onClick={{() => handleSelectGame("{gid}" as GameId)}}\n              className="flex-shrink-0 w-36 sm:w-44 rounded-2xl border-2 border-[#009140]/30 bg-gradient-to-br from-[#009140]/10 to-[#FFD700]/5 p-3 text-left hover:border-[#FFD700] hover:shadow-lg hover:shadow-[#009140]/10 transition-all group"\n            >\n              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{gemo}</div>\n              <p className="font-display text-xs font-bold text-foreground leading-tight">{glab}</p>\n              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{gdsc}</p>\n              <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] text-[9px] font-bold">MO\u00c7AMBIQUE</span>\n            </button>''')

    with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
        f.write(HEADER)
        f.write('\n'.join(lines))
        f.write(ARRAY_FOOTER)
        f.write(COMPONENT_PART1)
        f.write('\n'.join(moz_cards))
        f.write(COMPONENT_PART2)
        f.write('\n'.join(game_renders))
        f.write(COMPONENT_PART3)

    print('Done!')

HEADER = r'''import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, Brain, Package, RotateCcw, Sparkles, Trophy, Users, Plus, Copy, Check, Search, Vote, Play, Square, Lock, Loader2, Gamepad2, Skull, Swords, Pencil, Bomb, Hash, SmilePlus, Shuffle, Flame, Heart, Grid3X3, Anchor, Dices, CircleDot, LayoutGrid, Target, Palette, Map, Crosshair, Layers, ChevronLeft, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import TapBattle from "@/components/livegames/TapBattle";
import QuizBattle from "@/components/livegames/QuizBattle";
import MysteryBox from "@/components/livegames/MysteryBox";
import KeywordHunt from "@/components/livegames/KeywordHunt";
import EmojiBattle from "@/components/livegames/EmojiBattle";
import PrizeWheel, { DEFAULT_WHEEL_PRIZES, WheelPrize } from "@/components/livegames/PrizeWheel";
import EnhancedMillionaireGame from "@/components/livegames/EnhancedMillionaireGame";
import KahootMultiplayerQuiz from "@/components/livegames/KahootMultiplayerQuiz";
import LiveBingo from "@/components/livegames/LiveBingo";
import ChallengeRoulette from "@/components/livegames/ChallengeRoulette";
import VSDuelArena from "@/components/livegames/VSDuelArena";
import SpeedReaction from "@/components/livegames/SpeedReaction";
import TruthOrDare from "@/components/livegames/TruthOrDare";
import MemoryChallenge from "@/components/livegames/MemoryChallenge";
import PunishmentWheel from "@/components/livegames/PunishmentWheel";
import BattleOfKnowledge from "@/components/livegames/BattleOfKnowledge";
import GuessTheEmoji from "@/components/livegames/GuessTheEmoji";
import QuickDrawChallenge from "@/components/livegames/QuickDrawChallenge";
import HotPotatoGame from "@/components/livegames/HotPotatoGame";
import NumberGuessBattle from "@/components/livegames/NumberGuessBattle";
import ChaosChallenge from "@/components/livegames/ChaosChallenge";
import CheckersGame from "@/components/livegames/CheckersGame";
import LudoGame from "@/components/livegames/LudoGame";
import ConnectFourGame from "@/components/livegames/ConnectFourGame";
import BattleshipGame from "@/components/livegames/BattleshipGame";
import TicTacToeVS from "@/components/livegames/TicTacToeVS";
import UnoCardGame from "@/components/livegames/UnoCardGame";
import SnakeBattle from "@/components/livegames/SnakeBattle";
import RockPaperScissors from "@/components/livegames/RockPaperScissors";
import ColorSequence from "@/components/livegames/ColorSequence";
import SpaceShooter from "@/components/livegames/SpaceShooter";
import BallBreaker from "@/components/livegames/BallBreaker";
import ReactionRace from "@/components/livegames/ReactionRace";
import QuickMath from "@/components/livegames/QuickMath";
import MemoryCardsVS from "@/components/livegames/MemoryCardsVS";
import WordScramble from "@/components/livegames/WordScramble";
import TicTacToePro from "@/components/livegames/TicTacToePro";
import GuessNumber100 from "@/components/livegames/GuessNumber100";
import ColorMatch from "@/components/livegames/ColorMatch";
import TargetTap from "@/components/livegames/TargetTap";
import DiceDuel from "@/components/livegames/DiceDuel";
import PatternMemory from "@/components/livegames/PatternMemory";
import TriviaFlash from "@/components/livegames/TriviaFlash";
import Dominoes from "@/components/livegames/Dominoes";
import MazeRace from "@/components/livegames/MazeRace";
import SlotsVS from "@/components/livegames/SlotsVS";
import Match4Grid from "@/components/livegames/Match4Grid";
import TowerStack from "@/components/livegames/TowerStack";
import CannonBattle from "@/components/livegames/CannonBattle";
import SpotDifference from "@/components/livegames/SpotDifference";
import WordChain from "@/components/livegames/WordChain";
import NumberTetris from "@/components/livegames/NumberTetris";
import PongVS from "@/components/livegames/PongVS";
import WhackAMole from "@/components/livegames/WhackAMole";
import ColorCatch from "@/components/livegames/ColorCatch";
import MexericaGame from "@/components/livegames/MexericaGame";
import UrusseGame from "@/components/livegames/UrusseGame";
import CapulanaQuiz from "@/components/livegames/CapulanaQuiz";
import ChigogoGame from "@/components/livegames/ChigogoGame";
import NtchuvaGame from "@/components/livegames/NtchuvaGame";
import DjikotaGame from "@/components/livegames/DjikotaGame";
import UriGame from "@/components/livegames/UriGame";
import BichoGame from "@/components/livegames/BichoGame";
import LiveLeaderboard, { LeaderEntry } from "@/components/livegames/LiveLeaderboard";
import LiveControlPanel from "@/components/livegames/LiveControlPanel";
import LiveGameSettings, { DEFAULT_CONFIG, LiveGameConfig, CompanyBranding, DEFAULT_BRANDING } from "@/components/livegames/LiveGameSettings";
import { publish, subscribe, readLatest } from "@/lib/liveBus";
import { ParticleBackground } from "@/components/effects";
import { appendHistory } from "@/lib/liveHistory";
import { useToast } from "@/hooks/use-toast";
import AmbassadorPanel from "@/components/ambassadors/AmbassadorPanel";
import { useAuth } from "@/contexts/AuthContext";
import { getGameManagerPath } from "@/lib/game-manager-paths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GameId = "wheel" | "tap" | "quiz" | "mystery" | "keyword" | "emoji" | "millionaire" | "kahoot" | "bingo" | "challenge" | "vsduel" | "speed" | "truthordare" | "memory" | "punishment" | "boknowledge" | "guessEmoji" | "quickdraw" | "hotpotato" | "numguess" | "chaos" | "checkers" | "ludo" | "connect4" | "battleship" | "tictactoe" | "uno" | "snakebattle" | "rps" | "colorsequence" | "spaceshooter" | "ballbreaker" | "reactionrace" | "quickmath" | "memorycards" | "wordscramble" | "tictactoepro" | "guessnumber100" | "colormatch" | "targettap" | "diceluel" | "patternmemory" | "triviaflash" | "dominoes" | "mazerace" | "slotsvs" | "match4" | "towerstack" | "cannonbattle" | "spotdifference" | "wordchain" | "numbertetris" | "pongvs" | "whackamole" | "colorcatch" | "mexerica" | "urusse" | "capulanaquiz" | "chigogo" | "ntchuva" | "djikota" | "uri" | "bicho";

type CatId = "todos" | "mocambicano" | "popular" | "tabuleiro" | "acao" | "puzzle" | "quiz" | "versus";

interface SavedWheelGame {
  id: string;
  name: string;
  is_published?: boolean;
  segment_count?: number;
  rotation_duration?: number;
  wheel_background_color?: string;
  wheel_border_color?: string;
  spin_cost?: number;
  sound_enabled?: boolean;
  particle_effects?: boolean;
  background_image_url?: string;
  background_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  default_effect?: string;
}

const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string; cat: CatId; moz: boolean }[] = [
'''

ARRAY_FOOTER = r'''];

const CAT_LABELS: Record<CatId, string> = {
  todos: "Todos",
  mocambicano: "Mo\u00e7ambicanos",
  popular: "Popular",
  tabuleiro: "Tabuleiro",
  acao: "A\u00e7\u00e3o",
  puzzle: "Puzzle",
  quiz: "Quiz",
  versus: "Versus",
};

const CAT_LIST: CatId[] = ["todos", "mocambicano", "popular", "tabuleiro", "acao", "puzzle", "quiz", "versus"];

const genCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const LiveHub = () => {
  const { toast: uiToast } = useToast();
  const { user, role } = useAuth();
  const spinWheelManagerPath = getGameManagerPath(role, "spin-wheel");
  const [active, setActive] = useState<GameId>(() => {
    try { return (localStorage.getItem("liveActiveGame") as GameId) || "wheel"; } catch { return "wheel"; }
  });
  const [cat, setCat] = useState<CatId>("todos");
  const [showGame, setShowGame] = useState(false);
  const [config, setConfig] = useState<LiveGameConfig>(() => {
    try {
      const s = localStorage.getItem("liveGameConfig");
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    try {
      const s = localStorage.getItem("liveBranding");
      return s ? { ...DEFAULT_BRANDING, ...JSON.parse(s) } : DEFAULT_BRANDING;
    } catch { return DEFAULT_BRANDING; }
  });
  const [wheelPrizes, setWheelPrizes] = useState<WheelPrize[]>(() => {
    try {
      const s = localStorage.getItem("liveWheelPrizes");
      return s ? JSON.parse(s) : DEFAULT_WHEEL_PRIZES;
    } catch { return DEFAULT_WHEEL_PRIZES; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>(() => {
    try {
      const s = localStorage.getItem("liveLeaderboard");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [savedGames, setSavedGames] = useState<SavedWheelGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    localStorage.setItem("liveBranding", JSON.stringify(branding));
  }, [branding]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", branding.primaryColor);
    root.style.setProperty("--theme-secondary", branding.secondaryColor);
    root.style.setProperty("--theme-accent", branding.accentColor);
    root.style.setProperty("--theme-background", branding.backgroundColor);
    root.style.setProperty("--theme-text", branding.textColor);
  }, [branding]);

  useEffect(() => {
    if (!user) return;
    const loadSavedGames = async () => {
      setLoadingGames(true);
      try {
        const { data, error } = await supabase
          .from("spin_wheel_games")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setSavedGames(data || []);
      } catch (error) {
        console.error("Error loading saved games:", error);
        toast.error("Erro ao carregar jogos salvos");
      } finally {
        setLoadingGames(false);
      }
    };
    loadSavedGames();
  }, [user]);

  const [isLive, setIsLive] = useState<boolean>(() => {
    try { return localStorage.getItem("liveActive") === "1"; } catch { return false; }
  });
  const [liveCode, setLiveCode] = useState<string>(() => {
    try { return localStorage.getItem("liveCurrentCode") || ""; } catch { return ""; }
  });
  const [startedAt, setStartedAt] = useState<number>(() => {
    try { return Number(localStorage.getItem("liveStartedAt") || 0); } catch { return 0; }
  });
  const winnersRef = useRef<{ name: string; meta?: string; at: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLive || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isLive, startedAt]);

  useEffect(() => {
    try { localStorage.setItem("liveGameConfig", JSON.stringify(config)); } catch {}
    publish({ type: "config", payload: config });
  }, [config]);
  useEffect(() => {
    try { localStorage.setItem("liveWheelPrizes", JSON.stringify(wheelPrizes)); } catch {}
    publish({ type: "wheelPrizes", payload: wheelPrizes });
  }, [wheelPrizes]);
  useEffect(() => {
    try { localStorage.setItem("liveLeaderboard", JSON.stringify(leaderboard)); } catch {}
    publish({ type: "leaderboard", payload: leaderboard });
    if (isLive) {
      const myScore = leaderboard.filter((e) => e.game === active).reduce((a, b) => a + b.score, 0);
      publish({
        type: "roundState",
        payload: { game: active, phase: "running", timeLeft: 0, score: myScore, at: Date.now() },
      });
    }
  }, [leaderboard, isLive, active]);
  useEffect(() => {
    try { localStorage.setItem("liveActiveGame", active); } catch {}
    publish({ type: "activeGame", payload: active });
    if (isLive) publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: Date.now() } });
  }, [active, isLive]);

  useEffect(() => {
    const unsub = subscribe((evt) => {
      if (evt.type === "activeGame" && (evt.payload as GameId) !== active) {
        setActive(evt.payload as GameId);
      }
    });
    const latest = readLatest<string>("activeGame");
    if (latest && latest !== active) setActive(latest as GameId);
    return unsub;
  }, []);

  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name) return;
    if (isLive) {
      setLeaderboard((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
      ]);
    }
  };

  const broadcastWinner = (name: string, meta?: string) => {
    if (!isLive) return;
    const w = { name, meta, at: Date.now() };
    winnersRef.current = [...winnersRef.current, w];
    publish({ type: "winner", payload: w });
  };

  const resetConfig = () => { setConfig(DEFAULT_CONFIG); setWheelPrizes(DEFAULT_WHEEL_PRIZES); };

  const startLive = () => {
    const code = genCode();
    const now = Date.now();
    setLiveCode(code);
    setStartedAt(now);
    setIsLive(true);
    setLeaderboard([]);
    winnersRef.current = [];
    try {
      localStorage.setItem("liveCurrentCode", code);
      localStorage.setItem("liveStartedAt", String(now));
      localStorage.setItem("liveActive", "1");
    } catch {}
    publish({ type: "liveCode", payload: code });
    publish({ type: "liveStarted", payload: { code, at: now } });
    publish({ type: "roundState", payload: { game: active, phase: "running", timeLeft: 0, at: now } });
    (toast as any)({ title: "Live iniciada", description: `C\u00f3digo gerado: ${code}` });
  };

  const [endOpen, setEndOpen] = useState(false);
  const [endCountdown, setEndCountdown] = useState(3);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!endOpen) return;
    setEndCountdown(3);
    const t = setInterval(() => {
      setEndCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [endOpen]);

  const requestEndLive = () => {
    if (!isLive || !liveCode || ending) return;
    setEndOpen(true);
  };

  const confirmEndLive = () => {
    if (ending || endCountdown > 0) return;
    setEnding(true);
    const endedAt = Date.now();
    appendHistory({
      code: liveCode,
      startedAt: startedAt || endedAt,
      endedAt,
      durationSec: Math.max(1, Math.floor((endedAt - (startedAt || endedAt)) / 1000)),
      activeGame: active,
      winners: winnersRef.current,
      leaderboard,
    });
    publish({ type: "liveEnded", payload: { code: liveCode, at: endedAt } });
    publish({ type: "roundState", payload: { game: active, phase: "ended", timeLeft: 0, at: endedAt } });
    publish({ type: "liveCode", payload: "" });
    setIsLive(false);
    setLiveCode("");
    setStartedAt(0);
    setElapsed(0);
    try {
      localStorage.removeItem("liveCurrentCode");
      localStorage.removeItem("liveStartedAt");
      localStorage.setItem("liveActive", "0");
    } catch {}
    (toast as any)({ title: "Live encerrada", description: "Vencedores e ranking guardados no hist\u00f3rico." });
    setEndOpen(false);
    setEnding(false);
  };

  const copyCode = async () => {
    if (!liveCode) return;
    await navigator.clipboard.writeText(`${window.location.origin}/lives?code=${liveCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const activeMeta = GAMES.find((g) => g.id === active);

  const filteredGames = cat === "todos" ? GAMES : GAMES.filter((g) => g.cat === cat);
  const mozGames = GAMES.filter((g) => g.moz);

  const handleSelectGame = (id: GameId) => {
    setActive(id);
    setShowGame(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[#009140]/20 via-background to-[#FFD700]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,145,64,0.15),transparent_50%)]" />
        <ParticleBackground preset="stars" count={20} className="absolute inset-0 pointer-events-none" />
        <div className="relative container mx-auto px-4 py-5 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#009140]/20 to-[#FFD700]/20 border border-[#009140]/30 text-[11px] font-bold text-[#009140] mb-2">
                <span className="h-2 w-2 rounded-full bg-[#009140] animate-pulse" />
                JOGOS AO VIVO
              </div>
              <h1 className="font-display text-2xl md:text-4xl font-bold">
                Jogos para a sua <span className="bg-gradient-to-r from-[#009140] to-[#FFD700] bg-clip-text text-transparent">Live</span>
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-lg">
                Animes a tua audi\u00eancia com jogos interativos, quizzes e desafios em tempo real.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-2">
              {isLive ? (
                <>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">AO VIVO \u00b7 {fmtTime(elapsed)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">C\u00f3digo:</span>
                    <span className="font-mono text-sm font-bold text-primary">{liveCode}</span>
                    <button onClick={copyCode} className="p-1 rounded hover:bg-secondary" aria-label="Copiar">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button onClick={requestEndLive} disabled={ending} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50">
                    <Square className="h-3.5 w-3.5 fill-current" /> Encerrar
                  </button>
                </>
              ) : (
                <button onClick={startLive} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#009140] to-[#009140]/80 text-white text-sm font-bold shadow-lg shadow-[#009140]/30 hover:shadow-xl transition-all">
                  <Play className="h-4 w-4 fill-current" /> Iniciar Live
                </button>
              )}
              <LiveGameSettings
                config={config}
                onChange={setConfig}
                branding={branding}
                onBrandingChange={setBranding}
              />
            </motion.div>
          </div>

          {activeMeta && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border px-4 py-2">
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${activeMeta.grad} flex items-center justify-center text-base`}>{activeMeta.emoji}</div>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Jogo ativo</p>
                <p className="text-sm font-bold leading-tight">{activeMeta.label}</p>
              </div>
              {showGame && (
                <button
                  onClick={() => setShowGame(false)}
                  className="ml-2 p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {!isLive && (
        <div className="container mx-auto px-3 sm:px-4 pt-2">
          <div className="rounded-xl bg-gradient-to-r from-[#009140]/5 to-[#FFD700]/5 border border-[#009140]/20 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#FFD700]" />
            <span>Joga livremente! <strong className="text-foreground">Inicia uma Live</strong> para gravar pontua\u00e7\u00f5es e vencedores.</span>
          </div>
        </div>
      )}

      <section className="container mx-auto px-3 sm:px-4 pt-3 md:pt-6">
        <MobileDiscoveryHeader
          title="Jogos da Live"
          searchValue=""
          onSearchChange={() => {}}
          searchPlaceholder="Procurar jogo..."
          categories={GAMES.map((g) => ({ id: g.id, label: g.label, icon: g.emoji }))}
          activeCategory={active}
          onCategoryChange={(id) => handleSelectGame(id as GameId)}
        />

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div>
            {!showGame && (
              <>
                <div className="hidden md:block mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-5 w-5 text-[#FF6B35]" />
                    <h2 className="font-display text-lg font-bold">Jogos Mo\u00e7ambicanos</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] text-[10px] font-bold">NOVOS</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
'''

COMPONENT_PART2 = r'''
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  {CAT_LIST.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                        cat === c
                          ? "bg-gradient-to-r from-[#009140] to-[#FFD700] text-white shadow-lg shadow-[#009140]/20"
                          : "bg-card border border-border text-muted-foreground hover:border-[#009140]/40 hover:text-foreground"
                      }`}
                    >
                      {CAT_LABELS[c]}
                    </button>
                  ))}
                </div>

                <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredGames.map((g) => {
                    const isActive = active === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleSelectGame(g.id)}
                        className={`text-left rounded-2xl border-2 p-4 transition-all group ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : g.moz
                            ? "border-[#009140]/30 bg-gradient-to-br from-[#009140]/5 to-[#FFD700]/5 hover:border-[#009140]/60 hover:shadow-lg hover:shadow-[#009140]/10"
                            : "border-border bg-card hover:border-primary/40 hover:shadow-md"
                        }`}
                      >
                        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} mb-2 group-hover:scale-110 transition-transform`}>
                          <g.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm font-bold leading-tight">{g.label}</p>
                          {g.moz && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] font-bold flex-shrink-0">MZ</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{g.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <AnimatePresence mode="wait">
'''

COMPONENT_PART3 = r'''
            </AnimatePresence>
          </div>

          <aside className="space-y-4">
            <LiveControlPanel
              liveCode={liveCode}
              entries={leaderboard}
              onClear={() => setLeaderboard([])}
              onResetConfig={resetConfig}
            />
            <LiveLeaderboard entries={leaderboard} onClear={() => setLeaderboard([])} />
            {user && (
              <AmbassadorPanel
                businessUserId={user.id}
                businessName={user.email?.split("@")[0] || "esta empresa"}
                liveCode={liveCode}
                compact
              />
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">Dicas para a sua Live</h3>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Configure os pr\u00e9mios e probabilidades antes de come\u00e7ar.</li>
                <li>Partilhe o c\u00f3digo da live para os participantes.</li>
                <li>Use o leaderboard para coroar o vencedor no fim.</li>
                <li>Vincule um sorteio para distribuir pr\u00e9mios reais.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-[#009140]/10 to-[#FFD700]/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-[#009140]" />
                <h3 className="font-display text-sm font-bold">Modo Multi-jogador</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Tap Battle e Quiz Battle suportam 1v1 ou contra bot, perfeito para desafios entre o anfitri\u00e3o e convidados.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
      <BottomTabBar />

      <AnimatePresence>
        {endOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !ending && setEndOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <Square className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Encerrar a Live?</h3>
                  <p className="text-xs text-muted-foreground">O c\u00f3digo <span className="font-mono font-bold text-foreground">{liveCode}</span> ser\u00e1 invalidado e o ranking ser\u00e1 arquivado no hist\u00f3rico.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 border border-border p-4 mb-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Confirma\u00e7\u00e3o dispon\u00edvel em</p>
                <p className={`font-mono text-3xl font-bold ${endCountdown === 0 ? "text-destructive" : "text-primary"}`}>
                  {endCountdown > 0 ? `${endCountdown}s` : "Pronto"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => !ending && setEndOpen(false)}
                  disabled={ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-foreground text-sm font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmEndLive}
                  disabled={endCountdown > 0 || ending}
                  className="flex-1 px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ending ? "A encerrar..." : "Encerrar Live"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveHub;
'''

gen()
