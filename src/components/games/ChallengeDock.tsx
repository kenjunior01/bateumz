import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, ChevronRight, Trophy, Clock, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import {
  GameChallenge, acceptChallenge, cancelChallenge, listChallenges,
  getPlayerIdentity, finishMySide,
} from "@/lib/challenges";

interface Props {
  autoOpen?: boolean;
  onCloseAuto?: () => void;
}

type Tab = "abertos" | "meus";

export default function ChallengeDock({ autoOpen, onCloseAuto }: Props) {
  const me = getPlayerIdentity();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("abertos");
  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [scoreVal, setScoreVal] = useState("");
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const list = await listChallenges();
    setChallenges(list);
  }, []);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, 10000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [load]);

  useEffect(() => {
    if (autoOpen) { setOpen(true); load(); onCloseAuto?.(); }
  }, [autoOpen, load, onCloseAuto]);

  const incoming = challenges.filter(
    (c) => c.status === "open" && c.challenger_id !== me.id &&
      (!c.challenged_name || c.challenged_name.toLowerCase() === me.name.toLowerCase())
  );
  const mine = challenges.filter((c) => c.challenger_id === me.id || c.challenged_id === me.id);
  const activeCount = incoming.length + mine.filter((c) => c.status === "accepted").length;

  const doAccept = async (c: GameChallenge) => {
    setBusy(c.id);
    await acceptChallenge(c.id);
    await load();
    setBusy(null);
  };

  const doCancel = async (c: GameChallenge) => {
    setBusy(c.id);
    await cancelChallenge(c.id);
    await load();
    setBusy(null);
  };

  const doReport = async (c: GameChallenge) => {
    const s = parseInt(scoreVal, 10);
    if (isNaN(s) || s < 0) return;
    setBusy(c.id);
    await finishMySide(c, s);
    await load();
    setBusy(null);
    setReportId(null);
    setScoreVal("");
  };

  const fmtTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (d < 1) return "agora";
    if (d < 60) return `${d}min`;
    return `${Math.floor(d / 60)}h`;
  };

  return (
    <>
      {/* Botão flutuante */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="fixed left-3 bottom-20 z-[80] h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl shadow-orange-500/25 flex items-center justify-center"
        aria-label="Desafios"
      >
        <Swords className="h-5 w-5 text-white" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-background">
            {activeCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="fixed left-3 bottom-36 z-[80] w-[calc(100vw-24px)] max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-orange-500/10 to-red-600/10">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-orange-500" />
                <p className="font-bold text-sm">Desafios 1v1</p>
                <span className="text-[10px] text-muted-foreground">olá, {me.name}</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex border-b border-border">
              <button onClick={() => setTab("abertos")}
                className={`flex-1 py-2 text-xs font-bold ${tab === "abertos" ? "text-orange-500 border-b-2 border-orange-500" : "text-muted-foreground"}`}>
                Abertos ({incoming.length})
              </button>
              <button onClick={() => setTab("meus")}
                className={`flex-1 py-2 text-xs font-bold ${tab === "meus" ? "text-orange-500 border-b-2 border-orange-500" : "text-muted-foreground"}`}>
                Os Meus ({mine.length})
              </button>
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2 space-y-2">
              {tab === "abertos" && (incoming.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Sem desafios abertos agora.<br />Cria um no botão ⚔️ de qualquer jogo!
                </p>
              ) : incoming.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">{c.game_label}</p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(c.created_at)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    <b className="text-foreground">{c.challenger_name}</b> desafiou-te · {c.stake_coins} moedas
                  </p>
                  <div className="flex gap-2">
                    <button disabled={busy === c.id} onClick={() => doAccept(c)}
                      className="flex-1 h-8 rounded-lg bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50">
                      {busy === c.id ? "..." : "Aceitar ⚔️"}
                    </button>
                    <Link to={`/lives?game=${c.game_id}`} onClick={() => setOpen(false)}
                      className="flex-1 h-8 rounded-lg border border-border text-[11px] font-bold flex items-center justify-center gap-1">
                      Ver jogo <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )))}

              {tab === "meus" && (mine.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Ainda não enviaste desafios.</p>
              ) : mine.map((c) => {
                const side = c.challenger_id === me.id ? "challenger" : "challenged";
                const done = c.status === "done";
                const won = done && c.winner_side === side;
                const drew = done && c.winner_side === "draw";
                const iReported = (side === "challenger" && c.challenger_score > 0) || (side === "challenged" && c.challenged_score > 0);
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-background/60 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold">{c.game_label}</p>
                      {done ? (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? "bg-emerald-500/15 text-emerald-500" : drew ? "bg-muted text-muted-foreground" : "bg-red-500/15 text-red-500"}`}>
                          {won ? "🏆 Ganhaste!" : drew ? "🤝 Empate" : "😤 Perdeste"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{c.status === "open" ? "à espera" : "a jogar"}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      {c.challenger_name} {c.challenger_score} × {c.challenged_score} {c.challenged_name ?? "—"} · {c.stake_coins} moedas
                    </p>
                    {done ? (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" /> Resultado registado</p>
                    ) : c.status === "accepted" ? (
                      reportId === c.id ? (
                        <div className="flex gap-2">
                          <input value={scoreVal} onChange={(e) => setScoreVal(e.target.value)} type="number" min={0}
                            placeholder="A tua pontuação" className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-[11px]" />
                          <button disabled={busy === c.id} onClick={() => doReport(c)}
                            className="h-8 px-3 rounded-lg bg-primary text-white text-[11px] font-bold disabled:opacity-50 flex items-center gap-1">
                            <CheckCheck className="h-3 w-3" /> OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Link to={`/lives?game=${c.game_id}`} onClick={() => setOpen(false)}
                            className="flex-1 h-8 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center justify-center gap-1">
                            Jogar <ChevronRight className="h-3 w-3" />
                          </Link>
                          {!iReported && (
                            <button onClick={() => setReportId(c.id)}
                              className="h-8 px-3 rounded-lg border border-border text-[11px] font-bold">
                              Reportar
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <button disabled={busy === c.id} onClick={() => doCancel(c)}
                        className="h-8 px-3 rounded-lg border border-border text-[11px] font-bold text-muted-foreground disabled:opacity-50">
                        {busy === c.id ? "..." : "Cancelar desafio"}
                      </button>
                    )}
                  </div>
                );
              }))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
