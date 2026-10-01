/**
 * Casino Wallet — carteira partilhada de "Moedas Bateu" para os jogos
 * instantâneos (Mines, Plinko, Crash, Hi-Lo, Raspadinha, Keno, Limbo).
 *
 * 100% frontend (localStorage) — zero dependência de tabelas Supabase,
 * portanto imune a migrações pendentes. Todo o jogo é grátis (moedas de diversão).
 */

const KEY = "bateu-casino-wallet-v1";
const EVENTS_KEY = "bateu-casino-wallet-events-v1";

export const START_BALANCE = 1000;
export const DAILY_TOPUP = 750;
export const MIN_BET = 10;
export const MAX_BET = 500;

export interface WalletState {
  balance: number;
  lastTopupAt: string | null;
  totalWon: number;
  totalWagered: number;
  bestWin: number;
}

export interface WalletEvent {
  at: number;
  game: string;
  bet: number;
  payout: number;
}

const DEFAULT_STATE: WalletState = {
  balance: START_BALANCE,
  lastTopupAt: null,
  totalWon: 0,
  totalWagered: 0,
  bestWin: 0,
};

function read(): WalletState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<WalletState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function write(state: WalletState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage bloqueado — sessão volátil */
  }
}

function readEvents(): WalletEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as WalletEvent[]).slice(-100) : [];
  } catch {
    return [];
  }
}

function isSameDay(a: string | null, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

/** Garante bónus diário e devolve o estado actual. */
export function getWallet(): WalletState {
  const state = read();
  const now = new Date();
  if (!isSameDay(state.lastTopupAt, now) && state.balance < START_BALANCE) {
    state.balance = START_BALANCE;
    state.lastTopupAt = now.toISOString();
    write(state);
  }
  return state;
}

export function placeBet(amount: number): boolean {
  const state = getWallet();
  if (amount <= 0 || state.balance < amount) return false;
  state.balance -= amount;
  state.totalWagered += amount;
  write(state);
  return true;
}

/** Registra o pagamento de uma ronda vitoriosa (ou parcial). */
export function addPayout(game: string, bet: number, payout: number): WalletState {
  const state = getWallet();
  if (payout > 0) {
    state.balance += payout;
    state.totalWon += payout;
    if (payout > state.bestWin) state.bestWin = payout;
  }
  try {
    const events = readEvents();
    events.push({ at: Date.now(), game, bet, payout });
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    /* ignore */
  }
  write(state);
  // notifica o resto da app (ex.: Missões Diárias) sobre a ronda terminada
  try {
    window.dispatchEvent(
      new CustomEvent("bateu:casino-round", { detail: { game, bet, payout, won: payout > bet } })
    );
  } catch {
    /* ignore */
  }
  return state;
}

/** Anula uma aposta debitada (ex.: ronda abortada). */
export function refund(amount: number): void {
  const state = getWallet();
  state.balance += amount;
  state.totalWagered = Math.max(0, state.totalWagered - amount);
  write(state);
}

export function getRecentEvents(limit = 12): WalletEvent[] {
  return readEvents().slice(-limit).reverse();
}

export function resetWallet(): WalletState {
  const fresh: WalletState = { ...DEFAULT_STATE, lastTopupAt: new Date().toISOString() };
  write(fresh);
  return fresh;
}

export function fmtCoins(n: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(Math.round(n));
}
