import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Rocket, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "idle" | "flying" | "cashed" | "crashed";

/** Ponto de crash com distribuição estilo crash game (1% instantâneo, mediana ~2x). */
function rollCrashPoint(): number {
  const r = Math.random();
  if (r < 0.01) return 1.0;
  return Math.max(1, Math.floor((0.99 / (1 - r)) * 100) / 100);
}

export default function CrashGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<Phase>("idle");
  const [mult, setMult] = useState(1);
  const [crashAt, setCrashAt] = useState(2);
  const [cashedAt, setCashedAt] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const betRef = useRef(bet);
  betRef.current = bet;
  const crashRef = useRef(2);
  crashRef.current = crashAt;

  const tick = useCallback((t: number) => {
    if (!startRef.current) startRef.current = t;
    const elapsed = (t - startRef.current) / 1000;
    const m = Math.pow(1.0718, elapsed * 10) ; // curva exponencial suave
    const current = Math.max(1, Math.round(m * 100) / 100);
    if (current >= crashRef.current) {
      setMult(crashRef.current);
      setPhase("crashed");
      setHistory((h) => [crashRef.current, ...h].slice(0, 12));
      addPayout("Crash", betRef.current, 0);
      setWallet(getWallet());
      onScore?.("Crash", 0);
      return;
    }
    setMult(current);
    if (phaseRef.current === "flying") rafRef.current = requestAnimationFrame(tick);
  }, [onScore]);

  const launch = useCallback(() => {
    if (!placeBet(bet)) return;
    setWallet(getWallet());
    const cp = rollCrashPoint();
    setCrashAt(cp);
    setMult(1);
    setCashedAt(0);
    startRef.current = 0;
    setPhase("flying");
    rafRef.current = requestAnimationFrame(tick);
  }, [bet, tick]);

  const cashout = useCallback(() => {
    if (phaseRef.current !== "flying") return;
    cancelAnimationFrame(rafRef.current);
    const payout = Math.round(betRef.current * mult);
    addPayout("Crash", betRef.current, payout);
    setWallet(getWallet());
    setCashedAt(mult);
    setPhase("cashed");
    setHistory((h) => [mult, ...h].slice(0, 12));
    onScore?.("Crash", Math.max(1, Math.round((payout - betRef.current) / 10)));
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 }, colors: ["#22c55e", "#fbbf24"] });
  }, [mult, onScore]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const pot = Math.round(bet * mult);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Rocket className="h-6 w-6 text-rose-400" /> CRASH Bateu
        </h2>
        <p className="text-xs text-muted-foreground">O multiplicador sobe… levanta antes do foguetão explodir!</p>
      </div>

      <div className="relative mx-auto max-w-md h-56 rounded-2xl border border-border bg-gradient-to-b from-slate-900/80 to-slate-950/95 overflow-hidden">
        {/* grelha */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "36px 28px",
        }} />
        <AnimatePresence>
          {phase === "flying" && (
            <motion.div
              className="absolute z-10"
              initial={{ left: "6%", top: "82%" }}
              animate={{ left: `${Math.min(86, 6 + mult * 9)}%`, top: `${Math.max(8, 82 - (mult - 1) * 16)}%` }}
              transition={{ duration: 0.12, ease: "linear" }}
            >
              <Rocket className="h-7 w-7 text-amber-400 -rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
        {phase === "crashed" && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="text-6xl">💥</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={Math.floor(mult * 10)}
                initial={{ scale: 1.15, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "block text-6xl font-black tabular-nums",
                  phase === "crashed" && "text-red-500",
                  phase === "cashed" && "text-emerald-400",
                  phase === "flying" && "text-amber-300",
                  phase === "idle" && "text-muted-foreground"
                )}
              >
                {mult.toFixed(2)}×
              </motion.span>
            </AnimatePresence>
            {phase === "idle" && <p className="text-xs text-muted-foreground mt-2">Lança para começar</p>}
            {phase === "cashed" && <p className="text-sm font-bold text-emerald-400 mt-1">Levantaste a {cashedAt.toFixed(2)}× — +{fmtCoins(Math.round(bet * cashedAt))}</p>}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => (
            <span key={i} className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border",
              h >= 2 ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/5"
            )}>
              {h.toFixed(2)}×
            </span>
          ))}
        </div>
      )}

      {phase === "flying" ? (
        <Button onClick={cashout} className="w-full h-12 text-base font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 shadow-lg shadow-emerald-500/25 animate-pulse">
          <TrendingUp className="mr-2 h-5 w-5" /> Levantar {fmtCoins(pot)} moedas
        </Button>
      ) : (
        <Button onClick={launch} disabled={wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 shadow-lg shadow-rose-500/25">
          <RotateCcw className="mr-2 h-5 w-5" /> {phase === "idle" ? "Lançar Foguetão" : "Nova Ronda"} — {fmtCoins(bet)} moedas
        </Button>
      )}

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "flying"} gameName="Crash" />
    </div>
  );
}
