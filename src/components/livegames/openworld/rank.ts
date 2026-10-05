// Bateu Mundo Aberto — ranking do Mundo (local, determinístico).
// Rivais "vivos" que crescem com o tempo desde uma época fixa — o jogador
// sempre tem alguém a ultrapassar. Poder = função de nível, XP e ouro.
import { hashStr, mulberry32, rankFor, type OWChar } from "./core";

const EPOCH = Date.UTC(2026, 0, 1); // 1 Jan 2026 — mundo "existente" desde aí

export interface OWRival {
  id: string;
  name: string;
  classId: string;
  level: number;
  xp: number;
  power: number;
  rankTitle: string;
  rankEmoji: string;
  rankColor: string;
  isYou?: boolean;
}

const RIVAL_NAMES = [
  "Kunta", "Zeca", "RainhaD", "Mafalda", "TioJorge", "Nathi",
  "BigZambeze", "Capulana", "Djoe", "Mira", "Filho do Vento", "AnaMar",
];

const CLASSES = ["guerreiro", "mago", "arqueiro", "assassino"];

export function powerOf(level: number, xp: number, gold: number): number {
  return Math.round(level * 1000 + xp * 2 + Math.min(gold, 5000) * 0.1);
}

// 12 rivais determinísticos; níveis crescem ~1 por semana desde a EPOCH
function makeRivals(): OWRival[] {
  const days = Math.max(0, (Date.now() - EPOCH) / 86_400_000);
  return RIVAL_NAMES.map((name, i) => {
    const rng = mulberry32(hashStr(`bateu-rival-${name}`));
    const base = 1 + Math.floor(rng() * 3); // 1-3
    const speed = 0.08 + rng() * 0.22; // níveis/dia — alguns crescem mais
    const level = Math.max(1, Math.min(60, Math.round(base + days * speed)));
    const classId = CLASSES[Math.floor(rng() * CLASSES.length)];
    const xp = Math.floor(rng() * 80);
    const gold = Math.floor(rng() * 4000);
    const r = rankFor(level);
    return {
      id: `rival:${name}`,
      name, classId, level, xp,
      power: powerOf(level, xp, gold),
      rankTitle: r.title, rankEmoji: r.emoji, rankColor: r.color,
    };
  });
}

// Ranking completo — o teu herói inserido entre os rivais
export function buildRanking(char: OWChar): OWRival[] {
  const rivals = makeRivals();
  const r = rankFor(char.level);
  const you: OWRival = {
    id: "you",
    name: char.name,
    classId: char.classId,
    level: char.level,
    xp: char.xp,
    power: powerOf(char.level, char.xp, char.gold),
    rankTitle: r.title, rankEmoji: r.emoji, rankColor: r.color,
    isYou: true,
  };
  return [...rivals, you].sort((a, b) => b.power - a.power);
}

export function yourPosition(list: OWRival[]): number {
  const i = list.findIndex((x) => x.isYou);
  return i < 0 ? list.length : i + 1;
}
