import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Hash, RotateCcw, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const TOTAL = 40;
const DRAW = 10;
const MAX_PICKS = 8;

/** Tabela de prémios por número de acertos (0.97 RTP aproximado, inclui devolução parcial). */
const PAYOUTS: Record<number, number[]> = {
  // picks: [acertos = payout mult]
  1: [0, 0, 3.8],
  2: [0, 0, 1.7, 5.2],
  3: [0, 0, 1.1, 2.6, 9],
  4: [0, 0, 0.8, 1.6, 4.5, 14],
  5: [0, 0, 0.5, 1.4, 3.2, 8, 22],
  6: [0, 0, 0.4, 1.1, 2.4, 5.5, 15, 40],
  7: [0, 0, 0.3, 0.9, 1.8, 3.8, 9, 25, 65],
  8: [0, 0, 0.2, 0.7, 1.4, 2.8, 6, 16, 40, 100],
};

export default function KenoGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(40);
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [drawn, setDrawn] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [reveal, setReveal] = useState<number[]>([]);

  const hits = useMemo(() => {
    let n = 0;
    drawn.forEach((d) => { if (picks.has(d)) n++; });
    return n;
  }, [drawn, picks]);

  const payoutMult = picks.size > 0 && phase === "done" ? (PAYOUTS[picks.size]?.[hits] ?? 0) : 0;

  const toggle = useCallback((n: number) => {
    if (phase === "playing") return;
    setPicks((p) => {
      const next = new Set(p);
      if (next.has(n)) next.delete(n);
      else if (next.size < MAX_PICKS) next.add(n);
      return next;
    });
  }, [phase]);

  const play = useCallback(() => {
    if (picks.size === 0 || !placeBet(bet)) return;
    setWallet(getWallet());
    setDrawn(new Set());
    setReveal([]);
    setPhase("playing");
    // sorteia DRAW números únicos, revelando com delay
    const pool = Array.from({ length: TOTAL }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const result = pool.slice(0, DRAW);
    result.forEach((n, idx) => {
      setTimeout(() => {
        setReveal((r) => [...r, n]);
        setDrawn((d) => new Set(d).add(n));
        if (idx === DRAW - 1) {
          // fim — calcula prémio
          let h = 0;
          result.forEach((x) => { if (picks.has(x)) h++; });
          const mult = PAYOUTS[picks.size]?.[h] ?? 0;
          const payout = Math.round(bet * mult);
          addPayout("Keno", bet, payout);
          setWallet(getWallet());
          setPhase("done");
          onScore?.("Keno", payout > bet ? Math.max(1, Math.round((payout - bet) / 10)) : 0);
          if (payout > bet) {
            confetti({ particleCount: Math.min(200, 60 + h * 25), spread: 85, origin: { y: 0.6 }, colors: ["#22c55e", "#3b82f6", "#fbbf24"] });
          }
        }
      }, 240 * (idx + 1));
    });
  }, [picks, bet, onScore]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Hash className="h-6 w-6 text-cyan-400" /> KENO Bateu
        </h2>
        <p className="text-xs text-muted-foreground">Escolhe até {MAX_PICKS} números de {TOTAL} — são sorteados {DRAW}!</p>
      </div>

      <div className="mx-auto max-w-md grid grid-cols-8 gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => {
          const picked = picks.has(n);
          const isDrawn = drawn.has(n);
          const isHit = picked && isDrawn;
          return (
            <motion.button
              key={n}
              whileTap={{ scale: 0.88 }}
              animate={isHit ? { scale: [1, 1.25, 1] } : {}}
              onClick={() => toggle(n)}
              disabled={phase === "playing"}
              className={cn(
                "aspect-square rounded-lg text-sm font-black border transition-all",
                !picked && !isDrawn && "bg-slate-800/70 border-slate-700 text-slate-300 hover:border-cyan-500/50",
                picked && !isDrawn && "bg-cyan-600/30 border-cyan-400/60 text-cyan-200",
                isHit && "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-300 text-white shadow-lg shadow-emerald-500/40",
                !picked && isDrawn && "bg-indigo-600/25 border-indigo-400/50 text-indigo-200"
              )}
            >
              {n}
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 text-sm">
        <span className="text-muted-foreground">Selecionados:</span>
        <span className="font-black text-cyan-400">{picks.size}/{MAX_PICKS}</span>
        {phase === "done" && (
          <>
            <span className="text-muted-foreground">• Acertos:</span>
            <span className="font-black text-emerald-400">{hits}</span>
            <span className="text-muted-foreground">• Prémio:</span>
            <span className={cn("font-black", payoutMult > 1 ? "text-emerald-400" : "text-red-400")}>{payoutMult}×</span>
          </>
        )}
      </div>

      <Button
        onClick={play}
        disabled={picks.size === 0 || phase === "playing" || wallet.balance < bet}
        className="w-full h-12 text-base font-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 shadow-lg shadow-cyan-500/25"
      >
        <Dices className="mr-2 h-5 w-5" />
        {phase === "playing" ? "A sortear…" : phase === "idle" ? "Sortear Números" : "Sortear Outra Vez"} — {fmtCoins(bet)} moedas
      </Button>

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "playing"} gameName="Keno" />
    </div>
  );
}
