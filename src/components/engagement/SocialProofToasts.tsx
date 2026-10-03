import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// Prova social 100% REAL — sem nomes inventados.
// Fontes: participantes recentes (24h) + sorteios a acabar (FOMO).
// Se não houver atividade real, o componente não mostra nada.
// ============================================================

interface ProofItem {
  id: string;
  kind: "join" | "hot";
  message: string;
  detail: string;
}

function firstName(full: string | null | undefined): string {
  if (!full) return "Um jogador";
  const first = full.trim().split(/\s+/)[0];
  if (first.length <= 2) return first;
  // Privacidade: primeiro nome + inicial do último
  const parts = full.trim().split(/\s+/);
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return first + last;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins === 1) return "há 1 min";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return h === 1 ? "há 1 hora" : `há ${h} horas`;
}

async function fetchRealEvents(): Promise<ProofItem[]> {
  const events: ProofItem[] = [];

  // 1) Participações recentes (24h)
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: parts } = await supabase
    .from("participants")
    .select("id, created_at, user_id, raffle_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(15);

  if (parts && parts.length > 0) {
    const raffleIds = [...new Set(parts.map((p: any) => p.raffle_id))];
    const userIds = [...new Set(parts.map((p: any) => p.user_id))];

    const [{ data: raffles }, { data: profiles }] = await Promise.all([
      supabase.from("raffles").select("id, title").in("id", raffleIds),
      supabase.from("profiles_public").select("user_id, display_name").in("user_id", userIds),
    ]);

    const raffleMap = new Map((raffles ?? []).map((r: any) => [r.id, r.title]));
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));

    for (const p of parts) {
      const title = raffleMap.get(p.raffle_id);
      if (!title) continue;
      events.push({
        id: `join-${p.id}`,
        kind: "join",
        message: `${firstName(nameMap.get(p.user_id))} entrou no sorteio ${title}`,
        detail: timeAgo(p.created_at),
      });
    }
  }

  // 2) Sorteios a acabar nas próximas 48h (urgência real)
  const soon = new Date(Date.now() + 48 * 3600_000).toISOString();
  const { data: ending } = await supabase
    .from("raffles")
    .select("id, title, end_date")
    .eq("status", "active")
    .gte("end_date", new Date().toISOString())
    .lte("end_date", soon)
    .order("end_date", { ascending: true })
    .limit(6);

  if (ending) {
    for (const r of ending) {
      const hoursLeft = Math.max(1, Math.floor((new Date(r.end_date).getTime() - Date.now()) / 3600_000));
      events.push({
        id: `hot-${r.id}`,
        kind: "hot",
        message: `${r.title} termina em ${hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft / 24)}d`}`,
        detail: "Última chamada para participar",
      });
    }
  }

  return events;
}

export default function SocialProofToasts() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [queue, setQueue] = useState<ProofItem[]>([]);
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // Carregar eventos reais uma vez + a cada 5 min
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchRealEvents()
        .then(evts => { if (alive) setQueue(evts); })
        .catch(() => undefined);
    load();
    const reload = window.setInterval(load, 300_000);
    return () => { alive = false; window.clearInterval(reload); };
  }, []);

  // Mostrar toasts a partir da fila real
  useEffect(() => {
    if (queue.length === 0) return;
    let idx = 0;
    let tid: number | undefined;

    const showNext = () => {
      const item = queue[idx % queue.length];
      idx++;
      setItems(prev => {
        const next = [...prev, item];
        return next.length > 3 ? next.slice(-3) : next;
      });
      window.setTimeout(() => dismiss(item.id), 4500);
      tid = window.setTimeout(showNext, 9000 + Math.random() * 6000);
    };

    tid = window.setTimeout(showNext, 2000);
    return () => { if (tid) window.clearTimeout(tid); };
  }, [queue, dismiss]);

  if (!visible || items.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 z-40 flex flex-col-reverse gap-2 max-w-xs pointer-events-none">
      <button
        onClick={() => setVisible(false)}
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 text-white/50 hover:text-white text-[10px] flex items-center justify-center pointer-events-auto"
        aria-label="Fechar"
      >
        x
      </button>
      <AnimatePresence>
        {items.map((item) => {
          const Icon = item.kind === "hot" ? Flame : Ticket;
          const bg = item.kind === "hot"
            ? "from-orange-500/20 to-red-600/10 border-orange-500/30"
            : "from-purple-500/20 to-indigo-600/10 border-purple-500/30";
          const color = item.kind === "hot" ? "text-orange-400" : "text-purple-400";
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={"pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl bg-gradient-to-r " + bg + " shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"}
              onClick={() => dismiss(item.id)}
            >
              <div className={"flex-shrink-0 h-8 w-8 rounded-lg bg-black/30 flex items-center justify-center " + color}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{item.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
