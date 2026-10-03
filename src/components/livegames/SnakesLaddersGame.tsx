import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Crown, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

// ============ LAYOUT DO TABULEIRO 10x10 ============
// Célula n (1..100): linha = floor((n-1)/10) a partir do fundo, zigzag
function cellRC(n: number): [number, number] {
  const idx = n - 1;
  const row = Math.floor(idx / 10); // 0 = fundo
  let col = idx % 10;
  if (row % 2 === 1) col = 9 - col;
  return [9 - row, col]; // [r, c] com r=0 no topo
}

// Escadas (base → topo) e Cobras (cabeça → cauda) — clássicas
const LADDERS: Record<number, number> = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const SNAKES: Record<number, number> = { 16: 6, 48: 30, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };

const BOARD = 100; // 10 células × 10 unidades... na verdade 10 células → usamos % 

type Player = 0 | 1; // 0 = humano, 1 = bot

const CELL_COLORS = [
  "#FEE2E2", "#DBEAFE", "#DCFCE7", "#FEF9C3",
  "#FCE7F3", "#EDE9FE", "#CFFAFE", "#FFF7ED",
];

const P = {
  human: { main: "#3B82F6", light: "#93C5FD", glow: "0 0 14px rgba(59,130,246,0.8), 0 0 30px rgba(59,130,246,0.4)", name: "Você" },
  bot: { main: "#EF4444", light: "#FCA5A5", glow: "0 0 14px rgba(239,68,68,0.8), 0 0 30px rgba(239,68,68,0.4)", name: "CPU" },
};

const DICE_FACES: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

// ============ COMPONENTE ============
const SnakesLaddersGame = ({ onScore }: Props) => {
  const [pos, setPos] = useState<Record<Player, number>>({ 0: 0, 1: 0 });
  const [cur, setCur] = useState<Player>(0);
  const [dice, setDice] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [event, setEvent] = useState<{ kind: "ladder" | "snake"; from: number; to: number } | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; x: number; c: string; r: number; d: number }[]>([]);
  const [sixStreak, setSixStreak] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setPos({ 0: 0, 1: 0 }); setCur(0); setDice(1); setRolling(false);
    setBusy(false); setGameOver(false); setWinner(null); setEvent(null);
    setConfetti([]); setSixStreak(0);
  }, []);

  const spawnConfetti = useCallback((color: string) => {
    const cs = [color, "#FFD700", "#FF69B4", "#00FFFF", "#FFFFFF", "#7CFC00"];
    const arr = Array.from({ length: 50 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 100,
      c: cs[Math.floor(Math.random() * cs.length)], r: Math.random() * 360, d: Math.random() * 2 + 1,
    }));
    setConfetti(arr);
    setTimeout(() => setConfetti([]), 4500);
  }, []);

  const finish = useCallback((w: Player) => {
    setGameOver(true); setWinner(w);
    spawnConfetti(P[w].main);
    onScore?.(P[w].name, w === 0 ? 150 : 50);
    toast.success(w === 0 ? "🎉 Vitória!" : "A CPU venceu — revanche?");
  }, [onScore, spawnConfetti]);

  /** Move o jogador p com valor d; aplica cobras/escadas com delays animados */
  const move = useCallback(async (p: Player, d: number, curPos: number) => {
    let target = curPos + d;
    if (target > 100) target = curPos; // precisa aterrissar exato no 100
    setPos(prev => ({ ...prev, [p]: target }));
    await new Promise(r => setTimeout(r, 450));

    if (LADDERS[target]) {
      setEvent({ kind: "ladder", from: target, to: LADDERS[target] });
      await new Promise(r => setTimeout(r, 700));
      setPos(prev => ({ ...prev, [p]: LADDERS[target] }));
      toast.success(`🪜 Escada! ${target} → ${LADDERS[target]}`);
      setEvent(null);
      await new Promise(r => setTimeout(r, 400));
      target = LADDERS[target];
    } else if (SNAKES[target]) {
      setEvent({ kind: "snake", from: target, to: SNAKES[target] });
      await new Promise(r => setTimeout(r, 700));
      setPos(prev => ({ ...prev, [p]: SNAKES[target] }));
      toast.error(`🐍 Cobra! ${target} → ${SNAKES[target]}`);
      setEvent(null);
      await new Promise(r => setTimeout(r, 400));
      target = SNAKES[target];
    }

    if (target === 100) { finish(p); return true; }
    return false; // não acabou
  }, [finish]);

  const rollFor = useCallback(async (p: Player) => {
    setBusy(true); setRolling(true);
    // animação do dado
    const spin = setInterval(() => setDice(1 + Math.floor(Math.random() * 6)), 80);
    await new Promise(r => setTimeout(r, 550));
    clearInterval(spin);
    const v = 1 + Math.floor(Math.random() * 6);
    setDice(v); setRolling(false);
    await new Promise(r => setTimeout(r, 150));

    const done = await move(p, v, pos[p]);
    if (done) { setBusy(false); return; }

    // v de 6 → joga de novo (máx 3)
    if (v === 6 && sixStreak < 2) { setSixStreak(s => s + 1); setBusy(false); return; }
    setSixStreak(0);
    const other: Player = p === 0 ? 1 : 0;
    setCur(other);
    setBusy(false);
    // A CPU joga automaticamente via useEffect quando cur === 1
  }, [pos, move, sixStreak]);

  // IA do bot — dispara quando é a vez dele
  useEffect(() => {
    if (cur === 1 && !busy && !gameOver) {
      const t = setTimeout(() => rollFor(1), 800);
      return () => clearTimeout(t);
    }
  }, [cur, busy, gameOver]);

  const humanRoll = () => {
    if (cur !== 0 || busy || rolling || gameOver) return;
    rollFor(0);
  };

  // ============ Render do tabuleiro ============
  const cells = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), []);

  const pct = (p: Player) => {
    const n = pos[p];
    if (n === 0) return null;
    const [r, c] = cellRC(n);
    return { left: `${c * 10 + 5}%`, top: `${r * 10 + 5}%` };
  };

  const snakePath = (head: number, tail: number) => {
    const [hr, hc] = cellRC(head);
    const [tr, tc] = cellRC(tail);
    const x1 = hc * 10 + 5, y1 = hr * 10 + 5, x2 = tc * 10 + 5, y2 = tr * 10 + 5;
    const mx = (x1 + x2) / 2 + (y1 - y2) * 0.18;
    const my = (y1 + y2) / 2 + (x2 - x1) * 0.18;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  };

  return (
    <div className="space-y-4 relative">
      {/* Confetti de vitória */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {confetti.map(c => (
              <motion.div key={c.id}
                initial={{ x: `${c.x}%`, y: "-10%", opacity: 1, rotate: 0 }}
                animate={{ y: "110%", opacity: [1, 1, 0.4, 0], rotate: c.r }}
                transition={{ duration: c.d + 1.6, ease: "easeIn" }}
                className="absolute w-2.5 h-3.5 rounded-sm"
                style={{ background: c.c, left: `${c.x}%` }} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Indicadores de jogador */}
      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as Player[]).map(p => {
          const active = cur === p && !gameOver;
          return (
            <motion.div key={p}
              animate={active ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className={cn("p-2.5 rounded-2xl border-2 backdrop-blur relative overflow-hidden")}
              style={{
                borderColor: active ? P[p].main : `${P[p].main}25`,
                background: active ? `linear-gradient(135deg, ${P[p].main}22, ${P[p].main}05)` : "rgba(255,255,255,0.03)",
                boxShadow: active ? `0 0 24px ${P[p].main}25` : "none",
              }}>
              <div className="flex items-center gap-2">
                <motion.div className="w-5 h-5 rounded-full border-2 border-white/40"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${P[p].light}, ${P[p].main})`, boxShadow: active ? P[p].glow : "none" }}
                  animate={active ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.2 }} />
                <span className="text-xs font-bold" style={{ color: P[p].light }}>{P[p].name}</span>
                <span className="text-[10px] text-white/40 ml-auto">casa {pos[p]}</span>
                {active && <Crown className="h-3 w-3" style={{ color: P[p].main }} />}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-white/10">
                <motion.div className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${P[p].main}, ${P[p].light})` }}
                  animate={{ width: `${pos[p]}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Tabuleiro */}
      <div ref={boardRef} className="relative rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl select-none"
        style={{ aspectRatio: "1/1", background: "linear-gradient(135deg,#14532d 0%,#166534 50%,#14532d 100%)" }}>
        {/* Células */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
          {cells.map(n => {
            const [r, c] = cellRC(n);
            const isSnakeHead = !!SNAKES[n];
            const isLadderBase = !!LADDERS[n];
            return (
              <div key={n}
                className="relative flex items-center justify-center"
                style={{ gridColumn: c + 1, gridRow: r + 1, background: CELL_COLORS[(r + c) % CELL_COLORS.length] }}>
                <span className={cn("text-[8px] sm:text-[10px] font-extrabold leading-none",
                  isSnakeHead ? "text-red-600" : isLadderBase ? "text-green-700" : "text-slate-600/80")}>
                  {n}
                </span>
                {isLadderBase && <TrendingUp className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-green-700/70" />}
                {isSnakeHead && <AlertTriangle className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-red-600/70" />}
              </div>
            );
          })}
        </div>

        {/* Cobras (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Object.entries(SNAKES).map(([h, t]) => {
            const d = snakePath(Number(h), t);
            return (
              <g key={`s${h}`} opacity={0.85}>
                <path d={d} stroke="#7F1D1D" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.35" />
                <path d={d} stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" fill="none" strokeDasharray="5 2.4" />
                <circle cx={(cellRC(Number(t))[1] * 10 + 5)} cy={(cellRC(Number(t))[0] * 10 + 5)} r="2.4" fill="#FCA5A5" stroke="#7F1D1D" strokeWidth="0.7" />
              </g>
            );
          })}
          {/* Escadas (SVG) */}
          {Object.entries(LADDERS).map(([b, t]) => {
            const [br, bc] = cellRC(Number(b));
            const [tr, tc] = cellRC(Number(t));
            const x1 = bc * 10 + 5, y1 = br * 10 + 5, x2 = tc * 10 + 5, y2 = tr * 10 + 5;
            const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
            const px = -dy / len, py = dx / len; // perpendicular
            const w = 1.6;
            const rails = [
              `M ${x1 + px * w} ${y1 + py * w} L ${x2 + px * w} ${y2 + py * w}`,
              `M ${x1 - px * w} ${y1 - py * w} L ${x2 - px * w} ${y2 - py * w}`,
            ];
            const rungs: string[] = [];
            const steps = Math.max(3, Math.round(len / 4));
            for (let i = 1; i < steps; i++) {
              const f = i / steps;
              const cx = x1 + dx * f, cy = y1 + dy * f;
              rungs.push(`M ${cx + px * w} ${cy + py * w} L ${cx - px * w} ${cy - py * w}`);
            }
            return (
              <g key={`l${b}`} opacity={0.9}>
                {rails.map((d, i) => <path key={i} d={d} stroke="#F59E0B" strokeWidth="1.1" strokeLinecap="round" fill="none" />)}
                {rungs.map((d, i) => <path key={`r${i}`} d={d} stroke="#FCD34D" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.9" />)}
              </g>
            );
          })}
        </svg>

        {/* Peões */}
        {([0, 1] as Player[]).map(p => {
          const at = pct(p);
          if (!at) return null; // fora do tabuleiro (casa 0)
          return (
            <motion.div key={`p${p}`}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              animate={{ left: at.left, top: at.top, scale: cur === p ? [1, 1.18, 1] : 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              style={{ width: "7%", height: "7%" }}>
              <div className="w-full h-full rounded-full border-2 border-white/70 shadow-lg"
                style={{ background: `radial-gradient(circle at 35% 30%, ${P[p].light}, ${P[p].main})`, boxShadow: cur === p ? P[p].glow : P[p].main + "55" }} />
            </motion.div>
          );
        })}
        {/* Peões na linha de partida */}
        {pos[0] === 0 && (
          <div className="absolute z-20 left-[2%] top-[96%] -translate-y-1/2 w-[6%] h-[6%] rounded-full border-2 border-white/70"
            style={{ background: `radial-gradient(circle at 35% 30%, ${P[0].light}, ${P[0].main})`, boxShadow: P[0].glow }} />
        )}
        {pos[1] === 0 && (
          <div className="absolute z-20 left-[9%] top-[96%] -translate-y-1/2 w-[6%] h-[6%] rounded-full border-2 border-white/70"
            style={{ background: `radial-gradient(circle at 35% 30%, ${P[1].light}, ${P[1].main})`, boxShadow: P[1].glow }} />
        )}

        {/* Flash de evento: escada / cobra */}
        <AnimatePresence>
          {event && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.4 }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className={cn("px-6 py-3 rounded-2xl backdrop-blur-md border-2 font-black text-xl flex items-center gap-2",
                event.kind === "ladder" ? "bg-green-600/30 border-green-400 text-green-200" : "bg-red-600/30 border-red-400 text-red-200")}>
                {event.kind === "ladder" ? <TrendingUp className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                {event.kind === "ladder" ? `Escada ${event.from} → ${event.to}!` : `Cobra ${event.from} → ${event.to}!`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay de vitória */}
        <AnimatePresence>
          {gameOver && winner !== null && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-black/55">
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                <Trophy className="h-20 w-20" style={{ color: P[winner].main, filter: `drop-shadow(0 0 30px ${P[winner].main})` }} />
              </motion.div>
              <h3 className="text-2xl font-black text-white">{winner === 0 ? "Você Venceu! 🎉" : "CPU Venceu!"}</h3>
              <Button onClick={reset} className="btn-press bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold">
                <RotateCcw className="h-4 w-4 mr-2" /> Jogar Novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dado + controles */}
      <div className="flex items-center justify-center gap-5">
        {/* Dado com bolinhas */}
        <motion.button
          onClick={humanRoll}
          disabled={cur !== 0 || busy || rolling || gameOver}
          whileTap={cur === 0 && !busy ? { scale: 0.9, rotate: -8 } : undefined}
          animate={rolling ? { rotate: [0, 360], scale: [1, 1.15, 1] } : cur === 0 && !gameOver && !busy ? { y: [0, -4, 0] } : {}}
          transition={rolling ? { duration: 0.55, repeat: Infinity } : { duration: 1.4, repeat: Infinity }}
          className={cn("relative w-16 h-16 rounded-2xl border-2 shadow-xl transition-opacity",
            cur === 0 && !busy && !gameOver ? "border-amber-300 cursor-pointer" : "border-white/20 opacity-60 cursor-not-allowed")}
          style={{ background: "linear-gradient(145deg,#ffffff,#e2e8f0)", boxShadow: cur === 0 ? "0 0 26px rgba(251,191,36,0.45)" : undefined }}
          aria-label="Lançar dado">
          <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => {
              const r = Math.floor(i / 3), c = i % 3;
              const on = (DICE_FACES[dice] ?? []).some(([fr, fc]) => fr === r && fc === c);
              return <div key={i} className={cn("rounded-full transition-all", on ? "bg-slate-800 scale-100" : "bg-transparent scale-50")} />;
            })}
          </div>
        </motion.button>
        <div className="text-sm">
          <p className={cn("font-bold", cur === 0 ? "text-blue-300" : "text-red-300")}>
            {gameOver ? "Fim de jogo" : cur === 0 ? (busy ? "A mover..." : "A sua vez — toque no dado!") : "CPU a jogar..."}
          </p>
          <p className="text-white/40 text-xs mt-0.5">Chegue exatamente à casa 100. Escadas sobem, cobras descem!</p>
        </div>
      </div>
    </div>
  );
};

export default SnakesLaddersGame;
