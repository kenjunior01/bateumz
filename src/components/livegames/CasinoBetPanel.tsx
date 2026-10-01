import { Coins, Minus, Plus, History, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtCoins, MIN_BET, MAX_BET, getRecentEvents } from "@/lib/casino-wallet";
import { useState } from "react";

interface Props {
  balance: number;
  bet: number;
  onBetChange: (v: number) => void;
  disabled?: boolean;
  gameName: string;
}

/** Painel universal de aposta dos jogos instantâneos Bateu. */
export default function CasinoBetPanel({ balance, bet, onBetChange, disabled, gameName }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const events = showHistory ? getRecentEvents() : [];

  const clamp = (v: number) => Math.max(MIN_BET, Math.min(MAX_BET, Math.round(v)));
  const canAfford = balance >= bet && !disabled;

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/25 px-3 py-1.5">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-black text-amber-300 tabular-nums">{fmtCoins(balance)}</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-400/70 font-bold">moedas</span>
        </div>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-3.5 w-3.5" /> Histórico
        </button>
      </div>

      {showHistory && (
        <div className="max-h-32 overflow-auto rounded-lg border border-border/60 bg-background/60 p-2 space-y-1">
          {events.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-2">Ainda sem rondas — boa sorte!</p>
          )}
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{e.game}</span>
              <span className={cn("font-bold tabular-nums", e.payout > e.bet ? "text-emerald-400" : "text-red-400")}>
                {e.payout > e.bet ? "+" : ""}{fmtCoins(e.payout - e.bet)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled}
          onClick={() => onBetChange(clamp(bet - 10))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <input
          type="number"
          value={bet}
          min={MIN_BET}
          max={MAX_BET}
          disabled={disabled}
          onChange={(e) => onBetChange(clamp(Number(e.target.value) || MIN_BET))}
          className="h-10 w-full min-w-0 rounded-lg border border-border bg-background text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled}
          onClick={() => onBetChange(clamp(bet + 10))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "½", v: () => clamp(bet / 2) },
          { label: "2×", v: () => clamp(bet * 2) },
          { label: "Mín", v: () => MIN_BET },
          { label: "Máx", v: () => clamp(Math.min(MAX_BET, balance)) },
        ].map((b) => (
          <button
            key={b.label}
            disabled={disabled}
            onClick={() => onBetChange(b.v())}
            className="h-8 rounded-lg border border-border text-xs font-bold hover:bg-accent transition-colors disabled:opacity-40"
          >
            {b.label}
          </button>
        ))}
      </div>
      {!canAfford && !disabled && (
        <p className="text-[11px] text-amber-400 flex items-center gap-1">
          <Wallet className="h-3 w-3" /> Saldo insuficiente — reduz a aposta ou volta amanhã para o bónus diário.
        </p>
      )}
      <p className="text-[10px] text-muted-foreground/70 text-center">
        Moedas de diversão • Aposta {MIN_BET}–{MAX_BET} • {gameName}
      </p>
    </div>
  );
}
