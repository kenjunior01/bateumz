import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Spade, RotateCcw, ArrowUp, ArrowDown, Equal, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

interface Card { rank: typeof RANKS[number]; suit: typeof SUITS[number]; value: number; }

function makeCard(prev?: number): Card {
  const idx = Math.floor(Math.random() * 13);
  return {
    rank: RANKS[idx],
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: idx + 1,
  };
}

const RED_SUITS = new Set<string>(["♥", "♦"]);

/** Probabilidade de a próxima carta ser maior/menor que a actual (13 ranks). */
function probs(current: number) {
  const higher = 13 - current;
  const lower = current - 1;
  const same = 1;
  const total = 13;
  return {
    up: higher / (higher + lower + same),
    down: lower / (higher + lower + same),
    same: same / (higher + lower + same),
  };
}

export default function HiLoGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(50);
  const [current, setCurrent] = useState<Card>(() => makeCard());
  const [next, setNext] = useState<Card | null>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");

  const mult = useMemo(() => {
    if (streak === 0) return 1;
    let m = 1;
    const p = probs(current.value);
    // prémio por escolha equivalente ao risco acumulado
    m = Math.pow(1 / Math.max(0.08, p.up + 0.5 * p.same), streak) * 0.97;
    return Math.max(1.1, Math.round(m * 100) / 100);
  }, [streak, current.value]);

  const start = useCallback(() => {
    if (!placeBet(bet)) return;
    setWallet(getWallet());
    setCurrent(makeCard());
    setNext(null);
    setStreak(0);
    setMessage("");
    setPhase("playing");
  }, [bet]);

  const guess = useCallback((dir: "up" | "down" | "same") => {
    if (phase !== "playing") return;
    const c = makeCard();
    setNext(c);
    const ok =
      (dir === "up" && c.value > current.value) ||
      (dir === "down" && c.value < current.value) ||
      (dir === "same" && c.value === current.value);
    setTimeout(() => {
      if (!ok) {
        addPayout("Hi-Lo", bet, 0);
        setWallet(getWallet());
        setMessage(`❌ Era ${c.rank}${c.suit} — perdeste a sequência!`);
        setPhase("over");
        onScore?.("Hi-Lo", 0);
      } else {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setCurrent(c);
        setNext(null);
        setMessage("");
        if (newStreak >= 3) {
          const payout = Math.round(bet * Math.pow(1.35, newStreak));
          addPayout("Hi-Lo", bet, payout);
          setWallet(getWallet());
          onScore?.("Hi-Lo", Math.max(1, Math.round((payout - bet) / 10)));
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setMessage(`🎉 ${newStreak} certos seguidos! Levantaste ${fmtCoins(payout)}!`);
          setPhase("over");
        }
      }
    }, 650);
  }, [phase, current, streak, bet, onScore]);

  const cashout = useCallback(() => {
    if (phase !== "playing" || streak === 0) return;
    const payout = Math.round(bet * mult);
    addPayout("Hi-Lo", bet, payout);
    setWallet(getWallet());
    setMessage(`🎉 Levantaste ${fmtCoins(payout)} moedas com ${streak} certos!`);
    setPhase("over");
    onScore?.("Hi-Lo", Math.max(1, Math.round((payout - bet) / 10)));
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
  }, [phase, streak, bet, mult, onScore]);

  const p = probs(current.value);

  const CardView = ({ card, label }: { card: Card | null; label: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        "w-24 h-34 rounded-xl border-2 flex items-center justify-center text-4xl font-black shadow-xl transition-all",
        card ? "bg-white border-slate-200" : "bg-slate-800/80 border-dashed border-slate-600",
        RED_SUITS.has(card?.suit ?? "") ? "text-red-600" : "text-slate-900"
      )}>
        <AnimatePresence mode="wait">
          {card ? (
            <motion.div
              key={card.rank + card.suit}
              initial={{ rotateY: 90, scale: 0.8 }}
              animate={{ rotateY: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {card.rank}
              <span className="text-2xl">{card.suit}</span>
            </motion.div>
          ) : (
            <Spade className="h-8 w-8 text-slate-600" />
          )}
        </AnimatePresence>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Spade className="h-6 w-6 text-sky-400" /> HI-LO Bateu
        </h2>
        <p className="text-xs text-muted-foreground">A carta seguinte é maior ou menor? Acerta em sequência e multiplica!</p>
      </div>

      <div className="flex items-center justify-center gap-8 py-4">
        <CardView card={current} label="Actual" />
        <div className="text-2xl text-muted-foreground font-black">VS</div>
        <CardView card={next} label="Próxima" />
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-amber-400" />
        <span className="text-muted-foreground">Multiplicador actual:</span>
        <span className="font-black text-emerald-400">{mult.toFixed(2)}×</span>
        <span className="text-muted-foreground">• Sequência:</span>
        <span className="font-black text-sky-400">{streak}</span>
      </div>

      {phase === "playing" && (
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          <Button onClick={() => guess("up")} disabled={next !== null} className="h-14 flex-col bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300">
            <ArrowUp className="h-5 w-5" /><span className="text-[10px]">Maior ({Math.round(p.up * 100)}%)</span>
          </Button>
          <Button onClick={() => guess("same")} disabled={next !== null} className="h-14 flex-col bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/40 text-amber-300">
            <Equal className="h-5 w-5" /><span className="text-[10px]">Igual ({Math.round(p.same * 100)}%)</span>
          </Button>
          <Button onClick={() => guess("down")} disabled={next !== null} className="h-14 flex-col bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/40 text-rose-300">
            <ArrowDown className="h-5 w-5" /><span className="text-[10px]">Menor ({Math.round(p.down * 100)}%)</span>
          </Button>
        </div>
      )}

      {message && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center font-bold text-sm text-foreground">
          {message}
        </motion.p>
      )}

      {phase !== "playing" ? (
        <Button onClick={start} disabled={wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 shadow-lg shadow-sky-500/25">
          <RotateCcw className="mr-2 h-5 w-5" /> {phase === "idle" ? "Distribuir Carta" : "Nova Ronda"} — {fmtCoins(bet)} moedas
        </Button>
      ) : (
        streak > 0 && (
          <Button onClick={cashout} variant="outline" className="w-full h-11 font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
            Levantar {fmtCoins(Math.round(bet * mult))} moedas
          </Button>
        )
      )}

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "playing"} gameName="Hi-Lo" />
    </div>
  );
}
