import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Ticket, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import CasinoBetPanel from "./CasinoBetPanel";
import { getWallet, placeBet, addPayout, fmtCoins } from "@/lib/casino-wallet";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const SYMBOLS = [
  { id: "💎", mult: 10 },
  { id: "🍀", mult: 5 },
  { id: "⭐", mult: 3 },
  { id: "🔔", mult: 2 },
  { id: "🍒", mult: 1.5 },
  { id: "🍋", mult: 0.5 },
];

function makeCard(): string[] {
  // 9 células, exactamente 3 iguais vencedoras ~35% das vezes, senão sem trio
  const winner = Math.random() < 0.38;
  const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const cells: string[] = [];
  for (let i = 0; i < 9; i++) cells.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id);
  if (winner) {
    // força trio do símbolo com mult >= 1.5
    const good = SYMBOLS.filter((s) => s.mult >= 1.5);
    const chosen = good[Math.floor(Math.random() * good.length)];
    const pos = new Set<number>();
    while (pos.size < 3) pos.add(Math.floor(Math.random() * 9));
    pos.forEach((p) => (cells[p] = chosen.id));
    (cells as any).__winSymbol = chosen.id;
  } else {
    // garante que NÃO há trios: conta e corrige
    const count: Record<string, number> = {};
    cells.forEach((c) => (count[c] = (count[c] || 0) + 1));
    Object.entries(count).forEach(([sym, n]) => {
      if (n >= 3) {
        const bad = SYMBOLS.find((s) => s.id === sym)!;
        let replaced = 0;
        for (let i = 0; i < 9 && replaced < n - 2; i++) {
          if (cells[i] === sym) { cells[i] = SYMBOLS[(SYMBOLS.indexOf(bad) + 1) % SYMBOLS.length].id; replaced++; }
        }
      }
    });
    (cells as any).__winSymbol = null;
  }
  return cells;
}

export default function RaspadinhaGame({ onScore }: Props) {
  const [wallet, setWallet] = useState(getWallet);
  const [bet, setBet] = useState(30);
  const [cells, setCells] = useState<string[]>(() => makeCard());
  const [scratched, setScratched] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [prize, setPrize] = useState(0);
  const dragRef = useRef(false);

  const winSymbol = (cells as any).__winSymbol as string | null;
  const winMult = winSymbol ? SYMBOLS.find((s) => s.id === winSymbol)!.mult : 0;

  const newCard = useCallback(() => {
    if (!placeBet(bet)) return;
    setWallet(getWallet());
    setCells(makeCard());
    setScratched(new Set());
    setPrize(0);
    setPhase("playing");
  }, [bet]);

  const scratch = useCallback((i: number) => {
    if (phase !== "playing" || scratched.has(i)) return;
    const next = new Set(scratched);
    next.add(i);
    setScratched(next);
    if (next.size >= 5) {
      // avalia prémio
      const count: Record<string, number> = {};
      cells.forEach((c) => (count[c] = (count[c] || 0) + 1));
      const trio = Object.entries(count).find(([, n]) => n >= 3);
      if (trio) {
        const s = SYMBOLS.find((x) => x.id === trio[0])!;
        const payout = Math.round(bet * s.mult);
        addPayout("Raspadinha", bet, payout);
        setWallet(getWallet());
        setPrize(payout);
        onScore?.("Raspadinha", Math.max(1, Math.round((payout - bet) / 10)));
        if (payout > bet) confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#fbbf24", "#22c55e"] });
      } else {
        addPayout("Raspadinha", bet, 0);
        setWallet(getWallet());
        setPrize(0);
        onScore?.("Raspadinha", 0);
      }
      setPhase("done");
    }
  }, [phase, scratched, cells, bet, onScore]);

  const revealedCount = scratched.size;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Ticket className="h-6 w-6 text-amber-400" /> RASPADINHA Bateu
        </h2>
        <p className="text-xs text-muted-foreground">Raspa 5 símbolos — encontra 3 iguais e ganha o multiplicador!</p>
      </div>

      <div
        className="mx-auto max-w-sm grid grid-cols-3 gap-2 select-none"
        onMouseLeave={() => (dragRef.current = false)}
      >
        {cells.map((sym, i) => {
          const open = scratched.has(i) || phase === "done";
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onMouseDown={() => (dragRef.current = true)}
              onMouseUp={() => (dragRef.current = false)}
              onMouseEnter={() => dragRef.current && scratch(i)}
              onClick={() => scratch(i)}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-4xl border transition-all",
                open
                  ? "bg-gradient-to-br from-amber-100 to-yellow-50 border-amber-300"
                  : "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 border-slate-500 cursor-crosshair shadow-inner"
              )}
            >
              {open ? (
                <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}>
                  {sym}
                </motion.span>
              ) : (
                <Sparkles className="h-5 w-5 text-slate-400" />
              )}
            </motion.button>
          );
        })}
      </div>

      {phase === "playing" && (
        <p className="text-center text-xs text-muted-foreground">Raspados: {revealedCount}/5 — clica ou arrasta sobre as células</p>
      )}

      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "mx-auto max-w-sm text-center rounded-xl border p-4 font-black",
              prize > bet ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : prize > 0 ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-red-500/40 bg-red-500/10 text-red-400"
            )}
          >
            {prize > bet
              ? `🎉 TRIO! Ganhaste ${fmtCoins(prize)} moedas!`
              : prize > 0
              ? `😊 Recuperaste ${fmtCoins(prize)} moedas!`
              : "😔 Sem trio desta vez — continua a tentar!"}
          </motion.div>
        )}
      </AnimatePresence>

      <Button onClick={newCard} disabled={wallet.balance < bet} className="w-full h-12 text-base font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 text-black shadow-lg shadow-amber-500/25">
        <RotateCcw className="mr-2 h-5 w-5" /> {phase === "idle" ? "Comprar Raspadinha" : "Nova Raspadinha"} — {fmtCoins(bet)} moedas
      </Button>

      <CasinoBetPanel balance={wallet.balance} bet={bet} onBetChange={setBet} disabled={phase === "playing"} gameName="Raspadinha" />

      {/* tabela de prémios */}
      <div className="mx-auto max-w-sm flex flex-wrap justify-center gap-2">
        {SYMBOLS.map((s) => (
          <span key={s.id} className="px-2 py-1 rounded-lg bg-card border border-border text-xs font-bold">
            {s.id} <span className={s.mult >= 2 ? "text-emerald-400" : "text-muted-foreground"}>{s.mult}×</span>
          </span>
        ))}
      </div>
    </div>
  );
}
