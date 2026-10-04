import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X, Users, Coins } from "lucide-react";
import { createChallenge, getPlayerIdentity, setPlayerName } from "@/lib/challenges";

interface Props {
  open: boolean;
  onClose: () => void;
  gameId: string;
  gameLabel: string;
  onCreated?: (msg: string) => void;
}

const STAKES = [50, 100, 250, 500];

export default function ChallengeModal({ open, onClose, gameId, gameLabel, onCreated }: Props) {
  const me = getPlayerIdentity();
  const [name, setName] = useState(me.name);
  const [opponent, setOpponent] = useState("");
  const [stake, setStake] = useState(50);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    setPlayerName(name);
    await createChallenge({ gameId, gameLabel, opponentName: opponent.trim() || undefined, stakeCoins: stake });
    setSending(false);
    onCreated?.(opponent.trim()
      ? `⚔️ Desafio enviado a ${opponent.trim()} em ${gameLabel}!`
      : `⚔️ Desafio aberto criado em ${gameLabel}! Aguarda um oponente.`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Swords className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm leading-tight">Desafiar Amigo</h3>
                  <p className="text-[11px] text-muted-foreground">{gameLabel}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">O teu nome</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} maxLength={20}
              placeholder="Como te chamas?"
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
              <Users className="h-3 w-3 inline mr-1" /> Oponente (opcional)
            </label>
            <input
              value={opponent} onChange={(e) => setOpponent(e.target.value)} maxLength={20}
              placeholder="Nome do amigo — vazio = desafio aberto a todos"
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
              <Coins className="h-3 w-3 inline mr-1" /> Aposta (moedas de jogo)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {STAKES.map((s) => (
                <button key={s} onClick={() => setStake(s)}
                  className={`h-9 rounded-xl text-xs font-bold border transition-all ${stake === s ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}>
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold hover:bg-muted">Cancelar</button>
              <button onClick={submit} disabled={sending || !name.trim()}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? "A enviar..." : <><Swords className="h-4 w-4" /> Desafiar</>}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Os dois jogam o mesmo jogo. O maior resultado ganha as moedas!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
