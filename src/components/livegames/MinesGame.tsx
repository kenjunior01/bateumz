import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Bomb, Gem, RotateCcw, Pickaxe, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import {
  getWallet, placeBet, addPayout, fmtCoins,
} from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const GRID = 25; // 5x5
const MINE_OPTIONS = [3, 5, 10] as const;

/** Multiplicador progressivo estilo "Mines" — casa (fair) com 99% RTP. */
function multiplier(mines: number, gems: number): number {
  if (gems === 0) return 1;
  let m = 1;
  for (let i = 0; i < gems; i++) {
    m *= GRID / (GRID - mines - i);
  }
  return Math.max(1, m * 0.99);
}

export default function MinesGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [mines, setMines] = useState<(typeof MINE_OPTIONS)[number]>(5);
  const [board, setBoard] = useState<boolean[]>(() => Array(GRID).fill(false)); // true = bomba
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "playing" | "busted" | "won">("idle");
  const [netWin, setNetWin] = useState(0);

  const gemsFound = useMemo(() => {
    let n = 0;
    revealed.forEach((i) => { if (!board[i]) n++; });
    return n;
  }, [revealed, board]);

  const currentMult = multiplier(mines, gemsFound);
  const nextMult = multiplier(mines, gemsFound + 1);
  const potential = Math.round(bet * currentMult);

  const start = useCallback(() => {
    if (!placeBet(bet)) return;
    const b = Array(GRID).fill(false);
    let placed = 0;
    while (placed < mines) {
      const i = Math.floor(Math.random() * GRID);
      if (!b[i]) { b[i] = true; placed++; }
    }
    setBoard(b);
    setRevealed(new Set());
    setNetWin(0);
    setWallet(getWallet());
    setPhase("playing");
  }, [bet, mines]);

  const cashout = useCallback(() => {
    if (phase !== "playing" || gemsFound === 0) return;
    const payout = Math.round(bet * currentMult);
    addPayout("Mines", bet, payout);
    setWallet(getWallet());
    setNetWin(payout - bet);
    setPhase("won");
    onScore?.("Mines", Math.max(1, Math.round((payout - bet) / 10)));
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#22c55e", "#a855f7", "#fbbf24"] });
  }, [phase, gemsFound, bet, currentMult, onScore]);

  const reveal = useCallback((i: number) => {
    if (phase !== "playing" || revealed.has(i)) return;
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
    if (board[i]) {
      addPayout("Mines", bet, 0);
      setWallet(getWallet());
      setPhase("busted");
      onScore?.("Mines", 0);
    } else if (next.size === GRID - mines) {
      // todas as gemas encontradas
      const payout = Math.round(bet * multiplier(mines, gemsFound + 1));
      addPayout("Mines", bet, payout);
      setWallet(getWallet());
      setNetWin(payout - bet);
      setPhase("won");
      onScore?.("Mines", Math.max(1, Math.round((payout - bet) / 10)));
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    }
  }, [phase, revealed, board, bet, mines, gemsFound, onScore]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Bomb className="h-6 w-6 text-orange-400" /> MINES Bateu
        </h2>
        <p className="text-xs text-muted-foreground">Encontra as gemas, evita as bombas e levanta antes de explodir!</p>
      </div>

      <div className="flex gap-2 justify-center">
        {MINE_OPTIONS.map((m) => (
          <button
            key={m}
            disabled={phase === "playing"}
            onClick={() => setMines(m)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold border transition-all disabled:opacity-50",
              mines === m
                ? "bg-gradient-to-r from-orange-500 to-red-500 border-transparent text-white shadow-lg shadow-orange-500/25"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            💣 {m} bombas
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
        {board.map((isBomb, i) => {
          const isRevealed = revealed.has(i);
          const showAll = phase === "busted";
          return (
            <motion.button
              key={i}
              whileTap={phase === "playing" ? { scale: 0.9 } : undefined}
              onClick={() => reveal(i)}
              disabled={phase !== "playing"}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-2xl font-black transition-all border",
                !isRevealed && !showAll && "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 hover:from-slate-600 cursor-pointer",
                !isRevealed && showAll && (isBomb ? "bg-red-950/60 border-red-800/40" : "bg-slate-800/40 border-border opacity-60"),
                isRevealed && !isBomb && "bg-emerald-500/15 border-emerald-500/40",
                isRevealed && isBomb && "bg-red-500/25 border-red-500"
              )}
            >
              <AnimatePresence>
                {(isRevealed || (showAll && isBomb)) && (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    {isBomb ? "💥" : <Gem className="h-6 w-6 text-emerald-400" />}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {phase === "playing" && gemsFound > 0 && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Actual</p>
            <p className="text-lg font-black text-emerald-400">{currentMult.toFixed(2)}×</p>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Próximo</p>
            <p className="text-lg font-black text-amber-400">{nextMult.toFixed(2)}×</p>
          </div>
          <Button onClick={cashout} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 font-black shadow-lg shadow-emerald-500/25">
            <Pickaxe className="mr-1 h-4 w-4" /> Levantar {fmtCoins(potential)}
          </Button>
        </div>
      )}

      {(phase === "busted" || phase === "won") && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-center rounded-xl border p-3 font-bold",
            phase === "won" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400"
          )}
        >
          {phase === "won" ? `🎉 Levantaste ${fmtCoins(bet + netWin)} moedas (+${fmtCoins(netWin)})!` : "💥 BOOM! Perdeste a aposta — tenta outra vez!"}
        </motion.div>
      )}

      {phase !== "playing" ? (
        <Button onClick={start} disabled={wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 shadow-lg shadow-orange-500/25">
          <RotateCcw className="mr-2 h-5 w-5" />
          {phase === "idle" ? "Começar Ronda" : "Jogar Outra Vez"} — {fmtCoins(bet)} moedas
        </Button>
      ) : (
        <div className="text-center text-xs text-muted-foreground">Clica numa célula para revelar • Gemas: {gemsFound}</div>
      )}

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "playing"} gameName="Mines" />
    </div>
  );
}
