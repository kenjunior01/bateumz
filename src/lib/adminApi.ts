// ============================================================
// Bateu — adminApi.ts
// Cliente para o painel Admin gerir as APIs de débito MPesa/e-Mola.
// As credenciais ficam em platform_settings (key "debit_api") —
// leitura/escrita restritas a admins por RLS.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type DebitMode = "gateway" | "mpesa_official";

export interface DebitApiConfig {
  mode: DebitMode;
  gateway_url: string;
  gateway_key: string;
  mpesa_sp_code: string;
  mpesa_portal_key: string;
  mpesa_public_key: string;
  mpesa_base_url: string;
  providers_enabled: Record<string, boolean>;
  configured_at?: string | null;
}

export interface DebitTestCheck {
  name: string;
  ok: boolean;
  detail: string;
  ms?: number;
}

export interface DebitTestResult {
  success: boolean;
  mode: string;
  provider: string;
  checks: DebitTestCheck[];
  latency_ms: number;
  tested_at: string;
  error?: string;
}

export const DEFAULT_DEBIT_CONFIG: DebitApiConfig = {
  mode: "gateway",
  gateway_url: "",
  gateway_key: "",
  mpesa_sp_code: "",
  mpesa_portal_key: "",
  mpesa_public_key: "",
  mpesa_base_url: "",
  providers_enabled: { mpesa: true, emola: true, conta_movel: false, tkash: false },
  configured_at: null,
};

/** Carrega a config atual das APIs de débito (só admins). */
export async function loadDebitApiConfig(): Promise<DebitApiConfig> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "debit_api")
    .maybeSingle();
  if (error) throw error;
  if (!data?.value) return { ...DEFAULT_DEBIT_CONFIG };
  return { ...DEFAULT_DEBIT_CONFIG, ...(data.value as Partial<DebitApiConfig>) } as DebitApiConfig;
}

/** Guarda a config das APIs de débito (só admins). */
export async function saveDebitApiConfig(cfg: DebitApiConfig): Promise<void> {
  const payload = { ...cfg, configured_at: new Date().toISOString() };
  const { data: existing } = await supabase
    .from("platform_settings")
    .select("id")
    .eq("key", "debit_api")
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: payload, updated_at: new Date().toISOString() })
      .eq("key", "debit_api");
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("platform_settings")
      .insert({ key: "debit_api", value: payload });
    if (error) throw error;
  }
}

/** Testa a ligação ao gateway / API oficial via edge function admin-debit-test. */
export async function testDebitConnection(provider = "mpesa"): Promise<DebitTestResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("sessão expirada — volte a entrar");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-debit-test`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    body: JSON.stringify({ provider }),
  });
  const json = await res.json().catch(() => ({ success: false, error: "resposta inválida" }));
  return json as DebitTestResult;
}

/** Máscara para mostrar chaves: apenas últimos 4 caracteres. */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "••••";
  return "•".repeat(Math.min(24, key.length - 4)) + key.slice(-4);
}
