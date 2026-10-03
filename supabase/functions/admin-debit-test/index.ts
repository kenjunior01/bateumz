// ============================================================
// Bateu — admin-debit-test (Painel Admin → APIs → Testar ligação)
// ------------------------------------------------------------
// Verifica se as credenciais de débito (MPesa/e-Mola) guardadas no
// painel Admin (ou nos segredos env) estão a funcionar.
// Só superadmin/admin (tabela user_roles) pode executar.
//
// Resposta: { success, mode, provider, checks: [...], latency_ms }
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: string, status = 400): Response {
  return json({ success: false, error }, status);
}

interface DebitApiConfig {
  mode: string;
  gateway_url: string;
  gateway_key: string;
  mpesa_sp_code: string;
  mpesa_portal_key: string;
  mpesa_public_key: string;
  mpesa_base_url: string;
  providers_enabled: Record<string, boolean>;
}

function sbAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getDebitConfig(): Promise<DebitApiConfig> {
  let db: Partial<DebitApiConfig> = {};
  try {
    const { data } = await sbAdmin()
      .from("platform_settings")
      .select("value")
      .eq("key", "debit_api")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") db = data.value as Partial<DebitApiConfig>;
  } catch {
    /* usar env */
  }
  return {
    mode: db.mode ?? "gateway",
    gateway_url: db.gateway_url || Deno.env.get("DEBIT_GATEWAY_URL") || "",
    gateway_key: db.gateway_key || Deno.env.get("DEBIT_GATEWAY_KEY") || "",
    mpesa_sp_code: db.mpesa_sp_code || Deno.env.get("MPESA_SP_CODE") || "",
    mpesa_portal_key: db.mpesa_portal_key || Deno.env.get("MPESA_API_PORTAL_KEY") || "",
    mpesa_public_key: db.mpesa_public_key || Deno.env.get("MPESA_API_PUBLIC_KEY") || "",
    mpesa_base_url: db.mpesa_base_url || Deno.env.get("MPESA_BASE_URL") || "https://api.sandbox.vm.co.mz:18352",
    providers_enabled: db.providers_enabled ?? { mpesa: true, emola: true },
  };
}

async function isAdmin(req: Request): Promise<{ ok: boolean; userId: string | null }> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return { ok: false, userId: null };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await sb.auth.getUser(auth.slice(7));
  const userId = data.user?.id ?? null;
  if (!userId) return { ok: false, userId: null };
  const sbA = sbAdmin();
  const { data: roles } = await sbA
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superadmin"]);
  return { ok: !!roles && roles.length > 0, userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const { ok: isAdminOk } = await isAdmin(req);
  if (!isAdminOk) return fail("unauthorized — apenas administradores", 403);

  const body = await req.json().catch(() => ({}));
  const provider: string = body.provider ?? "mpesa";
  const cfg = await getDebitConfig();

  const checks: Array<{ name: string; ok: boolean; detail: string; ms?: number }> = [];
  const t0 = Date.now();

  // ---------- MODO 2: MPesa oficial — testar token ----------
  if (cfg.mode === "mpesa_official" || (provider === "mpesa" && cfg.mpesa_sp_code && cfg.mode !== "gateway")) {
    if (!cfg.mpesa_sp_code || !cfg.mpesa_portal_key) {
      checks.push({ name: "credenciais MPesa", ok: false, detail: "SP Code ou Portal Key em falta" });
    } else {
      const t = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12_000);
        const res = await fetch(`${cfg.mpesa_base_url}/ipg/v1x/token/`, {
          headers: {
            Authorization: `Basic ${btoa(`${cfg.mpesa_portal_key}:${cfg.mpesa_public_key || cfg.mpesa_portal_key}`)}`,
            Origin: "developer.mpesa.vm.co.mz",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json().catch(() => ({}));
        const token = data.access_token ?? data.body?.access_token;
        checks.push({
          name: "OAuth token MPesa",
          ok: !!token,
          detail: token ? "Token obtido com sucesso" : `Sem token na resposta (HTTP ${res.status})`,
          ms: Date.now() - t,
        });
      } catch (e) {
        checks.push({ name: "OAuth token MPesa", ok: false, detail: "Falha de rede: " + String(e?.message ?? e), ms: Date.now() - t });
      }
    }
  } else {
    // ---------- MODO 1: gateway agregador — ping ----------
    if (!cfg.gateway_url) {
      checks.push({ name: "gateway URL", ok: false, detail: "Nenhum URL configurado (painel Admin nem segredo DEBIT_GATEWAY_URL)" });
    } else {
      const t = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12_000);
        const res = await fetch(cfg.gateway_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(cfg.gateway_key ? { Authorization: `Bearer ${cfg.gateway_key}`, "X-API-Key": cfg.gateway_key } : {}),
          },
          body: JSON.stringify({
            provider,
            phone: provider === "emola" ? "258870000000" : "258840000000",
            amount: 1,
            reference: `TEST-${Date.now()}`,
            currency: "MZN",
            callback_type: "debit",
            test: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const ms = Date.now() - t;
        const data = await res.json().catch(() => ({}));
        checks.push({
          name: "gateway acessível",
          ok: true,
          detail: `HTTP ${res.status} em ${ms}ms`,
          ms,
        });
        checks.push({
          name: "autenticação gateway",
          ok: res.status !== 401 && res.status !== 403,
          detail: res.status === 401 || res.status === 403
            ? "Gateway recusou a API key (HTTP " + res.status + ")"
            : "API key aceite (ou não exigida)",
        });
        if (data && typeof data === "object") {
          const rejectedTest = data.success === false || data.error;
          checks.push({
            name: "resposta do gateway",
            ok: true,
            detail: rejectedTest
              ? `Gateway respondeu (recusou transação de teste: ${data.error ?? data.message ?? "sem detalhe"}) — esperado para teste`
              : `Resposta: ${JSON.stringify(data).slice(0, 160)}`,
          });
        }
      } catch (e) {
        checks.push({ name: "gateway acessível", ok: false, detail: "Falha de rede/timeout: " + String(e?.message ?? e), ms: Date.now() - t });
      }
    }
  }

  // Providers ativos
  const activeProviders = Object.entries(cfg.providers_enabled ?? {})
    .filter(([, v]) => v !== false)
    .map(([k]) => k);
  checks.push({
    name: "métodos ativos",
    ok: activeProviders.length > 0,
    detail: activeProviders.length ? activeProviders.join(", ") : "nenhum método ativo",
  });

  const allOk = checks.filter((c) => c.name !== "resposta do gateway" && c.name !== "métodos ativos").every((c) => c.ok);

  return json({
    success: allOk,
    mode: cfg.mpesa_sp_code && cfg.mode !== "gateway" ? "mpesa_official" : "gateway",
    provider,
    checks,
    latency_ms: Date.now() - t0,
    tested_at: new Date().toISOString(),
  });
});
