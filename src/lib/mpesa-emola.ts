// ============================================================
// Bateu — Cliente Mobile Debit Pay (MPesa / e-Mola)
// ============================================================
import { supabase as sb } from "@/integrations/supabase/client";

export type DebitProvider = "mpesa" | "emola" | "conta_movel" | "tkash";

export interface DebitTransaction {
  id: string;
  provider: DebitProvider;
  phone: string;
  amount: number;
  reference: string;
  status: "pending" | "processing" | "confirmed" | "failed" | "cancelled" | "timeout";
  status_detail?: string | null;
  created_at: string;
}

export interface DebitInitResult {
  success: boolean;
  transaction?: DebitTransaction;
  message?: string;
  error?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Normaliza e valida número MZ por operadora (client-side, UX) */
export function validateMzPhone(input: string, provider: DebitProvider): string | null {
  let p = (input || "").replace(/\D/g, "");
  if (p.startsWith("258")) p = p.slice(3);
  if (p.startsWith("0")) p = p.slice(1);
  if (!/^[8][2-7]\d{7}$/.test(p)) return null;
  const prefix = p.slice(0, 2);
  const valid: Record<DebitProvider, string[]> = {
    mpesa: ["84", "85"],
    emola: ["86", "87", "88"],
    conta_movel: ["84", "85"],
    tkash: ["86", "87"],
  };
  return valid[provider].includes(prefix) ? p : null;
}

export const PROVIDER_LABEL: Record<DebitProvider, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  conta_movel: "Conta Movel",
  tkash: "Tkash",
};

/** Inicia o push de débito: o cliente recebe notificação no telemóvel para inserir o PIN */
export async function initiateDebit(
  provider: DebitProvider,
  phone: string,
  amount: number
): Promise<DebitInitResult> {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { success: false, error: "Sessão expirada. Entre novamente." };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/mobile-debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({ action: "initiate", provider, phone, amount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      return { success: false, error: data.error ?? "Falha ao iniciar o pagamento." };
    }
    return { success: true, transaction: data.transaction, message: data.message };
  } catch (e) {
    console.error("[mpesa-emola] initiate error:", e);
    return { success: false, error: "Erro de rede. Verifique a sua conexão." };
  }
}

/** Consulta o estado de uma transação de débito */
export async function pollDebitStatus(transactionId: string): Promise<{
  success: boolean;
  status?: DebitTransaction["status"];
  message?: string;
}> {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { success: false };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/mobile-debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({ action: "status", transaction_id: transactionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return { success: false };
    return { success: true, status: data.status, message: data.message };
  } catch {
    return { success: false };
  }
}

/** Faz polling até confirmar/falhar/timeout (máx ~90s) */
export function waitForDebitConfirmation(
  transactionId: string,
  onTick: (status: DebitTransaction["status"], message?: string) => void
): Promise<DebitTransaction["status"]> {
  return new Promise((resolve) => {
    let attempts = 0;
    const max = 30; // 30 × 3s = 90s
    const timer = setInterval(async () => {
      attempts++;
      const r = await pollDebitStatus(transactionId);
      if (r.success && r.status) {
        onTick(r.status, r.message);
        if (!["pending", "processing"].includes(r.status)) {
          clearInterval(timer);
          resolve(r.status);
        }
      }
      if (attempts >= max) {
        clearInterval(timer);
        resolve("timeout");
      }
    }, 3000);
  });
}
