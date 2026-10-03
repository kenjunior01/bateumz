'use client';

import { useState, useEffect, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Flame, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// Feed de actividade 100% REAL — participantes recentes,
// sorteios a acabar e vencedores confirmados. Sem dados inventados.
// Se não houver actividade real, o feed não é renderizado.
// ============================================================

type ActivityType = 'join' | 'hot' | 'win';

const TYPE_CONFIG: Record<ActivityType, { icon: typeof Ticket; color: string; bg: string }> = {
  join: { icon: Ticket, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  hot: { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  win: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
};

interface Activity {
  id: string;
  type: ActivityType;
  user: string;
  message: string;
  timeAgo: string;
}

function firstName(full: string | null | undefined): string {
  if (!full) return 'Um jogador';
  const first = full.trim().split(/\s+/)[0];
  const parts = full.trim().split(/\s+/);
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
  return first + last;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins === 1) return 'há 1 min';
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return h === 1 ? 'há 1 hora' : `há ${h} horas`;
}

const VISIBLE_COUNT = 5;
const CYCLE_INTERVAL = 4000;

export default function ActivityFeed({ className }: { className?: string }): JSX.Element {
  const [all, setAll] = useState<Activity[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [items, setItems] = useState<Activity[]>([]);

  // Carregar actividades reais + refresh a cada 2 min
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const since = new Date(Date.now() - 48 * 3600_000).toISOString();
        const acts: Activity[] = [];

        // Participações recentes
        const { data: parts } = await supabase
          .from('participants')
          .select('id, created_at, user_id, raffle_id')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(20);

        if (parts && parts.length > 0) {
          const raffleIds = [...new Set(parts.map((p: any) => p.raffle_id))];
          const userIds = [...new Set(parts.map((p: any) => p.user_id))];
          const [{ data: raffles }, { data: profiles }] = await Promise.all([
            supabase.from('raffles').select('id, title').in('id', raffleIds),
            supabase.from('profiles_public').select('user_id, display_name').in('user_id', userIds),
          ]);
          const raffleMap = new Map((raffles ?? []).map((r: any) => [r.id, r.title]));
          const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
          for (const p of parts) {
            const title = raffleMap.get(p.raffle_id);
            if (!title) continue;
            acts.push({
              id: `join-${p.id}`,
              type: 'join',
              user: firstName(nameMap.get(p.user_id)),
              message: `entrou no sorteio ${title}`,
              timeAgo: timeAgo(p.created_at),
            });
          }
        }

        // Vencedores confirmados (recentes)
        const { data: winners } = await supabase
          .from('participants')
          .select('id, created_at, user_id, raffle_id')
          .eq('status', 'winner')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(5);

        if (winners && winners.length > 0) {
          const raffleIds = [...new Set(winners.map((w: any) => w.raffle_id))];
          const userIds = [...new Set(winners.map((w: any) => w.user_id))];
          const [{ data: raffles }, { data: profiles }] = await Promise.all([
            supabase.from('raffles').select('id, title').in('id', raffleIds),
            supabase.from('profiles_public').select('user_id, display_name').in('user_id', userIds),
          ]);
          const raffleMap = new Map((raffles ?? []).map((r: any) => [r.id, r.title]));
          const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
          for (const w of winners) {
            const title = raffleMap.get(w.raffle_id);
            if (!title) continue;
            acts.push({
              id: `win-${w.id}`,
              type: 'win',
              user: firstName(nameMap.get(w.user_id)),
              message: `venceu o sorteio ${title}`,
              timeAgo: timeAgo(w.created_at),
            });
          }
        }

        // Sorteios a acabar (urgência real)
        const soon = new Date(Date.now() + 48 * 3600_000).toISOString();
        const { data: ending } = await supabase
          .from('raffles')
          .select('id, title, end_date')
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .lte('end_date', soon)
          .order('end_date', { ascending: true })
          .limit(4);

        if (ending) {
          for (const r of ending) {
            const hoursLeft = Math.max(1, Math.floor((new Date(r.end_date).getTime() - Date.now()) / 3600_000));
            acts.push({
              id: `hot-${r.id}`,
              type: 'hot',
              user: 'Última chamada',
              message: `${title(r.title)} termina em ${hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft / 24)}d`}`,
              timeAgo: 'participa já',
            });
          }
        }

        if (alive) setAll(acts);
      } catch {
        // silencioso — sem dados reais não se mostra feed
      }
    };
    load();
    const reload = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(reload); };
  }, []);

  useEffect(() => {
    if (all.length === 0) return;
    const interval = setInterval(() => {
      setStartIndex((prev) => {
        const next = prev + 1;
        if (next + VISIBLE_COUNT > all.length) return 0;
        return next;
      });
    }, CYCLE_INTERVAL);
    return () => clearInterval(interval);
  }, [all.length]);

  useEffect(() => {
    if (all.length === 0) return;
    const slice = all.length <= VISIBLE_COUNT
      ? all
      : [...all.slice(startIndex), ...all].slice(0, VISIBLE_COUNT);
    setItems(slice.map((a, i) => ({ ...a, id: `${a.id}-${i}` })));
  }, [startIndex, all]);

  // Sem actividade real → não renderizar nada (honestidade > inchaço)
  if (all.length === 0) return <div className={className} />;

  return (
    <div className={className}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(15,15,30,0.85), rgba(25,18,40,0.85))',
        border: '1px solid rgba(250,204,21,0.1)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Actividade ao Vivo
          </h3>
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">tempo real</span>
        </div>

        <div className="px-3 pb-3 space-y-1">
          <AnimatePresence mode="popLayout">
            {items.map((activity) => {
              const typeConfig = TYPE_CONFIG[activity.type];
              const IconComp = typeConfig.icon;

              return (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  layout
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <motion.div
                    className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}
                    whileHover={{ scale: 1.15, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <IconComp className={typeConfig.color} size={15} />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 font-medium truncate">
                      <span className="text-white font-semibold">{activity.user}</span>{' '}
                      {activity.message}
                    </p>
                    <span className="text-[10px] text-white/30">{activity.timeAgo}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function title(t: string): string {
  return t.length > 32 ? t.slice(0, 30) + '…' : t;
}
