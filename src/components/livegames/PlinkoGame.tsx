import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { CircleDot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const BUCKETS = [8, 3, 1.2, 0.6, 0.4, 0.6, 1.2, 3, 8];

interface Drop { id: number; path: number[]; final: number; }

const ROWS = BUCKETS.length - 1; // 8 níveis de pinos

export default function PlinkoGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [results, setResults] = useState<{ id: number; mult: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);

  const drop = useCallback(() => {
    if (busy || !placeBet(bet)) return;
    setWallet(getWallet());
    setBusy(true);
    const id = ++idRef.current;
    const path: number[] = [];
    for (let i = 0; i < ROWS; i++) path.push(Math.random() < 0.5 ? 0 : 1);
    const final = path.reduce((a, b) => a + b, 0);
    const mult = BUCKETS[final];
    setDrops((d) => [...d, { id, path, final }].slice(-4));
    // pagamento no fim da animação (~1.8s)
    setTimeout(() => {
      const payout = Math.round(bet * mult);
      addPayout("Plinko", bet, payout);
      setWallet(getWallet());
      setResults((r) => [{ id, mult }, ...r].slice(0, 12));
      if (payout > bet) {
        onScore?.("Plinko", Math.max(1, Math.round((payout - bet) / 10)));
        if (mult >= 3) {
          confetti({ particleCount: 80, spread: 65, origin: { y: 0.7 }, colors: ["#fbbf24", "#a855f7"] });
        }
      } else {
        onScore?.("Plinko", 0);
      }
      setBusy(false);
    }, 1900);
  }, [bet, busy, onScore]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-400 to-purple-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <CircleDot className="h-6 w-6 text-fuchsia-400" /> PLINKO Bateu
        </h2>
        <p className="text-xs text-muted-foreground">Larga a bola, reza pelos multiplicadores das pontas!</p>
      </div>

      <div className="relative mx-auto max-w-md rounded-2xl border border-border bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 overflow-hidden">
        {/* tabuleiro */}
        <div className="relative h-64">
          {/* pinos */}
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: row + 2 }).map((_, col) => (
              <div
                key={`${row}-${col}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-slate-500/60"
                style={{
                  left: `calc(${(col + (ROWS - row) / 2) * (100 / (ROWS + 1))}% - 3px)`,
                  top: `${(row + 1) * (100 / (ROWS + 2))}%`,
                }}
              />
            ))
          )}
          {/* bolas a cair */}
          <AnimatePresence>
            {drops.map((d) => {
              let x = 0.5;
              const keyframesX: string[] = ["50%"];
              const keyframesY: string[] = ["0%"];
              d.path.forEach((step, i) => {
                x += step === 0 ? -0.5 / (ROWS + 1) : 0.5 / (ROWS + 1);
                keyframesX.push(`${x * 100}%`);
                keyframesY.push(`${((i + 1.2) / (ROWS + 2)) * 100}%`);
              });
              return (
                <motion.div
                  key={d.id}
                  initial={{ x: "-50%", y: "0%" }}
                  animate={{ left: keyframesX, top: keyframesY }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1.6, ease: "easeIn" }}
                  onAnimationComplete={() => setDrops((cur) => cur.filter((c) => c.id !== d.id))}
                  className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg shadow-amber-500/50 z-10"
                  style={{ left: "50%" }}
                />
              );
            })}
          </AnimatePresence>
        </div>
        {/* baldes */}
        <div className="grid grid-cols-9 gap-1 mt-2">
          {BUCKETS.map((m, i) => {
            const hot = m >= 3;
            const mid = m >= 1;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-lg py-1.5 text-center text-[11px] font-black border",
                  hot && "bg-gradient-to-b from-red-500 to-rose-600 border-red-400/50 text-white",
                  mid && !hot && "bg-gradient-to-b from-amber-500/80 to-orange-600/80 border-amber-400/40 text-white",
                  !mid && "bg-slate-800 border-slate-700 text-slate-400"
                )}
              >
                {m}×
              </div>
            );
          })}
        </div>
      </div>

      {results.length > 0 && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {results.map((r) => (
            <span
              key={r.id}
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border",
                r.mult >= 1 ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-slate-500 border-border"
              )}
            >
              {r.mult}×
            </span>
          ))}
        </div>
      )}

      <Button onClick={drop} disabled={busy || wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 shadow-lg shadow-fuchsia-500/25">
        <RotateCcw className="mr-2 h-5 w-5" /> Largar Bola — {fmtCoins(bet)} moedas
      </Button>

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={busy} gameName="Plinko" />
    </div>
  );
}
