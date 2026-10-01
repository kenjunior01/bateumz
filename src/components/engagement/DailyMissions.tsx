import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Coins, Gift, CheckCircle2, Flame, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWallet, addPayout, fmtCoins } from "@/lib/casino-wallet";

/**
 * Missões Diárias Bateu — gamificação com progresso do dia (localStorage),
 * recompensas em Moedas Bateu e streak de dias consecutivos.
 */
const KEY = "bateu-daily-missions-v1";

interface MissionDef {
  id: string;
  icon: any;
  label: string;
  goal: number;
  reward: number;
  color: string;
}

const MISSIONS: MissionDef[] = [
  { id: "rounds", icon: Zap, label: "Joga 5 rondas instantâneas", goal: 5, reward: 150, color: "text-cyan-400" },
  { id: "wins", icon: Trophy, label: "Vence 2 rondas", goal: 2, reward: 250, color: "text-emerald-400" },
  { id: "wager", icon: Coins, label: "Aposta 200 moedas no total", goal: 200, reward: 200, color: "text-amber-400" },
];

interface MissionsState {
  day: string;
  progress: Record<string, number>;
  claimed: string[];
  streak: number;
  lastDone: string | null;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): MissionsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as MissionsState;
      if (s.day === todayKey()) return s;
      // novo dia — reset progresso, mantém streak
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const streak = s.lastDone === yesterday || s.day === yesterday ? (s.lastDone === yesterday || s.day === yesterday ? (s as any).__computedStreak ?? s.streak : 0) : s.streak;
      return { day: todayKey(), progress: {}, claimed: [], streak, lastDone: s.lastDone };
    }
  } catch { /* ignore */ }
  return { day: todayKey(), progress: {}, claimed: [], streak: 0, lastDone: null };
}

function save(s: MissionsState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function DailyMissions({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<MissionsState>(load);
  const [open, setOpen] = useState(!compact);

  // ouve rondas dos jogos instantâneos
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as { bet: number; won: boolean };
      setState((prev) => {
        const next: MissionsState = {
          ...prev,
          progress: {
            rounds: (prev.progress.rounds || 0) + 1,
            wins: (prev.progress.wins || 0) + (d.won ? 1 : 0),
            wager: (prev.progress.wager || 0) + d.bet,
          },
        };
        const allDone = MISSIONS.every((m) => (next.progress[m.id] || 0) >= m.goal);
        if (allDone && !MISSIONS.every((m) => next.claimed.includes(m.id))) {
          next.lastDone = todayKey();
          next.streak = next.streak + 1;
        }
        save(next);
        return next;
      });
    };
    window.addEventListener("bateu:casino-round", handler);
    return () => window.removeEventListener("bateu:casino-round", handler);
  }, []);

  const claim = useCallback((m: MissionDef) => {
    setState((prev) => {
      if (prev.claimed.includes(m.id) || (prev.progress[m.id] || 0) < m.goal) return prev;
      const next = { ...prev, claimed: [...prev.claimed, m.id] };
      save(next);
      addPayout("Missões Diárias", 0, m.reward);
      return next;
    });
  }, []);

  const doneCount = MISSIONS.filter((m) => state.claimed.includes(m.id)).length;

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-purple-500/15 border border-fuchsia-500/30 flex items-center justify-center">
            <Gift className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black flex items-center gap-2">
              Missões Diárias
              {state.streak > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-0.5">
                  <Flame className="h-3 w-3" /> {state.streak}d
                </span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground">{doneCount}/{MISSIONS.length} concluídas — ganha moedas grátis</p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {MISSIONS.map((m) => {
                const prog = Math.min(state.progress[m.id] || 0, m.goal);
                const complete = prog >= m.goal;
                const isClaimed = state.claimed.includes(m.id);
                const pct = Math.round((prog / m.goal) * 100);
                const Icon = m.icon;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      isClaimed ? "border-emerald-500/30 bg-emerald-500/5 opacity-70" : complete ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-background/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5 shrink-0", m.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{m.label}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={cn("h-full rounded-full", complete ? "bg-gradient-to-r from-amber-400 to-emerald-400" : "bg-gradient-to-r from-cyan-400 to-blue-500")}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {isClaimed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : complete ? (
                        <Button size="sm" onClick={() => claim(m)} className="h-8 px-3 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600">
                          +{m.reward}
                        </Button>
                      ) : (
                        <span className="text-[11px] font-bold tabular-nums text-muted-foreground shrink-0">
                          {m.id === "wager" ? `${prog}/${m.goal}` : `${prog}/${m.goal}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                Saldo actual: <span className="font-bold text-amber-400">{fmtCoins(getWallet().balance)}</span> moedas • Bónus diário de 1000 quando ficares sem
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
