import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Gauge, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

export default function LimboGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [target, setTarget] = useState(2);
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [history, setHistory] = useState<{ v: number; w: boolean }[]>([]);

  const payoutMult = Math.round((99 / target) * 100) / 100;
  const winChance = Math.round((100 / target) * 100) / 100;

  const roll = useCallback(() => {
    if (rolling || !placeBet(bet)) return;
    setWallet(getWallet());
    setRolling(true);
    setWon(null);
    // animação de números aleatórios
    let ticks = 0;
    const spin = setInterval(() => {
      setResult(Math.round((1 + Math.random() * 60) * 100) / 100);
      ticks++;
      if (ticks >= 10) {
        clearInterval(spin);
        // resultado: 1% de edge — vence se result >= target
        const r = Math.random() * 100; // uniforme 0..100
        const final = Math.round((Math.max(1.00, (99 * 100) / Math.max(1, r + 1))) * 100) / 100;
        const isWin = final >= target && r >= 1; // 1% house edge em r
        setResult(final);
        setWon(isWin);
        setHistory((h) => [{ v: final, w: isWin }, ...h].slice(0, 12));
        if (isWin) {
          const payout = Math.round(bet * payoutMult);
          addPayout("Limbo", bet, payout);
          setWallet(getWallet());
          onScore?.("Limbo", Math.max(1, Math.round((payout - bet) / 10)));
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#a855f7", "#22c55e"] });
        } else {
          addPayout("Limbo", bet, 0);
          setWallet(getWallet());
          onScore?.("Limbo", 0);
        }
        setRolling(false);
      }
    }, 70);
  }, [bet, rolling, target, payoutMult, onScore]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Gauge className="h-6 w-6 text-purple-400" /> LIMBO Bateu
        </h2>
        <p className="text-xs text-muted-foreground">Define o multiplicador-alvo. Se o resultado for igual ou superior, ganhas!</p>
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-border bg-gradient-to-b from-slate-900/80 to-slate-950/95 p-8 text-center relative overflow-hidden">
        <motion.div
          className={cn(
            "text-7xl font-black tabular-nums",
            won === null && "text-muted-foreground",
            won === true && "text-emerald-400",
            won === false && "text-red-500",
            rolling && "text-amber-300"
          )}
          animate={rolling ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ repeat: rolling ? Infinity : 0, duration: 0.15 }}
        >
          {result !== null ? `${result.toFixed(2)}×` : "—"}
        </motion.div>
        {won !== null && !rolling && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("mt-3 font-bold", won ? "text-emerald-400" : "text-red-400")}
          >
            {won ? `🎉 GANHASTE ${fmtCoins(Math.round(bet * payoutMult))} moedas!` : `❌ Precisavas de ${target.toFixed(2)}× ou mais`}
          </motion.p>
        )}
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/80 p-4 space-y-4">
        <div>
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-muted-foreground">MULTIPLICADOR-ALVO</span>
            <span className="text-purple-400 font-black">{target.toFixed(2)}×</span>
          </div>
          <Slider
            value={[target]}
            min={1.05}
            max={50}
            step={0.05}
            disabled={rolling}
            onValueChange={(v) => setTarget(v[0])}
            className="py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-background/70 border border-border p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prémio</p>
            <p className="text-lg font-black text-emerald-400">{payoutMult.toFixed(2)}×</p>
          </div>
          <div className="rounded-xl bg-background/70 border border-border p-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Probabilidade</p>
            <p className="text-lg font-black text-amber-400">{winChance.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {history.map((h, i) => (
            <span key={i} className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border",
              h.w ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-red-400 border-red-500/30 bg-red-500/5"
            )}>
              {h.v.toFixed(2)}×
            </span>
          ))}
        </div>
      )}

      <Button onClick={roll} disabled={rolling || wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 shadow-lg shadow-purple-500/25">
        <Zap className="mr-2 h-5 w-5" /> {rolling ? "A rolar…" : "Rolar"} — {fmtCoins(bet)} moedas
      </Button>

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={rolling} gameName="Limbo" />
    </div>
  );
}
