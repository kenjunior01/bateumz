// ============================================================
// Bateu — mobile-debit (MPesa / e-Mola Débito Direto — C2B Push)
// ------------------------------------------------------------
// Suporta dois modos (configuráveis via segredos do Supabase):
//
// MODO 1 — Gateway agregador genérico (recomendado p/ "debito pay"):
//   segredos: DEBIT_GATEWAY_URL, DEBIT_GATEWAY_KEY (opcional)
//   O gateway recebe: { provider, phone, amount, reference, currency }
//   e responde: { success: boolean, transaction_id?, status?, message? }
//
// MODO 2 — API oficial Vodacom MZ (MPesa C2B):
//   segredos: MPESA_SP_CODE, MPESA_API_PORTAL_KEY, MPESA_BASE_URL (opcional)
//
// e-Mola sem API pública documentada usa sempre o MODO 1.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitiateBody {
  action: "initiate";
  provider: "mpesa" | "emola" | "conta_movel" | "tkash";
  phone: string;
  amount: number;
}
interface StatusBody {
  action: "status";
  transaction_id: string;
}
type Body = InitiateBody | StatusBody;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(error: string, status = 400): Response {
  return json({ success: false, error }, status);
}

/** Normaliza número MZ: 84/85/86/87 + 7 dígitos → 258XXXXXXXXX */
function normalizeMzPhone(input: string, provider: string): string | null {
  let p = (input || "").replace(/\D/g, "");
  if (p.startsWith("258")) p = p.slice(3);
  if (p.startsWith("0")) p = p.slice(1);
  if (!/^[8][2-7]\d{7}$/.test(p)) return null;
  const prefix = p.slice(0, 2);
  const valid: Record<string, string[]> = {
    mpesa: ["84", "85"],
    emola: ["86", "87", "88"],
    conta_movel: ["84", "85"],
    tkash: ["86", "87"],
  };
  const allowed = valid[provider] ?? ["82", "83", "84", "85", "86", "87"];
  if (!allowed.includes(prefix)) return null;
  return `258${p}`;
}

function sbAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await sb.auth.getUser(auth.slice(7));
  return data.user?.id ?? null;
}

// ---------- MODO 1: gateway agregador genérico ----------
async function gatewayDebit(provider: string, phone: string, amount: number, reference: string) {
  const url = Deno.env.get("DEBIT_GATEWAY_URL");
  if (!url) throw new Error("gateway_not_configured");
  const key = Deno.env.get("DEBIT_GATEWAY_KEY");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}`, "X-API-Key": key } : {}),
    },
    body: JSON.stringify({ provider, phone, amount, reference, currency: "MZN", callback_type: "debit" }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok && data.success !== false,
    txnId: data.transaction_id ?? data.id ?? data.transactionId ?? reference,
    status: (data.status as string) ?? (res.ok && data.success !== false ? "processing" : "failed"),
    detail: data.message ?? data.error ?? null,
    raw: data,
  };
}

// ---------- MODO 2: API oficial Vodacom MZ (MPesa) ----------
async function mpesaOfficialDebit(phone: string, amount: number, reference: string) {
  const baseUrl = Deno.env.get("MPESA_BASE_URL") ?? "https://api.sandbox.vm.co.mz:18352";
  const spCode = Deno.env.get("MPESA_SP_CODE");
  const portalKey = Deno.env.get("MPESA_API_PORTAL_KEY");
  if (!spCode || !portalKey) throw new Error("mpesa_not_configured");

  // OAuth2 token
  const tokenRes = await fetch(`${baseUrl}/ipg/v1x/token/`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${btoa(`${portalKey}:${Deno.env.get("MPESA_API_PUBLIC_KEY") ?? portalKey}`)}`,
      Origin: "developer.mpesa.vm.co.mz",
    },
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  const token = tokenData.access_token ?? tokenData.body?.access_token;
  if (!token) throw new Error("mpesa_token_failed");

  // C2B Payment (push débito à carteira do cliente)
  const payRes = await fetch(`${baseUrl}/ipg/v1x/c2bpayment/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: "developer.mpesa.vm.co.mz",
    },
    body: JSON.stringify({
      input_TransactionReference: reference,
      input_CustomerMSISDN: phone,
      input_Amount: String(amount),
      input_ThirdPartyReference: reference.slice(0, 20),
      input_ServiceProviderCode: spCode,
    }),
  });
  const payData = await payRes.json().catch(() => ({}));
  const outputCode = String(payData.output_ResponseCode ?? payData.body?.output_ResponseCode ?? "");
  const ok = outputCode === "INS-0";
  return {
    ok,
    txnId: payData.output_TransactionID ?? payData.body?.output_TransactionID ?? reference,
    status: ok ? "processing" : "failed",
    detail: payData.output_ResponseDesc ?? payData.body?.output_ResponseDesc ?? null,
    raw: payData,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const userId = await getUserId(req);
  if (!userId) return fail("unauthorized", 401);

  const sb = sbAdmin();
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("invalid_json");
  }

  // ---------------- INITIATE ----------------
  if (body.action === "initiate") {
    const { provider, amount } = body;
    const phone = normalizeMzPhone(body.phone, provider);
    if (!phone) return fail("numero invalido para o metodo selecionado");
    if (!amount || amount < 10) return fail("montante minimo: 10 MZN");
    if (amount > 200000) return fail("montante maximo: 200 000 MZN");

    const reference = `BATEU-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    try {
      let result: { ok: boolean; txnId: string; status: string; detail: string | null; raw: unknown };
      if (provider === "mpesa" && Deno.env.get("MPESA_SP_CODE")) {
        result = await mpesaOfficialDebit(phone, amount, reference);
      } else {
        result = await gatewayDebit(provider, phone, amount, reference);
      }

      const status = result.status === "confirmed" ? "confirmed" : result.ok ? "processing" : "failed";
      const { data: txn, error: insErr } = await sb
        .from("mobile_debit_transactions")
        .insert({
          user_id: userId,
          provider,
          phone,
          amount,
          reference,
          provider_txn_id: result.txnId,
          status,
          status_detail: result.detail,
          gateway_mode: provider === "mpesa" && Deno.env.get("MPESA_SP_CODE") ? "mpesa_official" : "gateway",
          raw_response: result.raw ?? null,
        })
        .select()
        .single();
      if (insErr) return fail("db_error: " + insErr.message, 500);

      // Se o gateway confirmou imediatamente, credita já
      if (status === "confirmed") {
        await sb.rpc("wallet_process_transaction", {
          p_user_id: userId, p_type: "deposit", p_amount: amount,
          p_direction: "credit", p_reference_type: "mobile_debit", p_reference_id: txn.id,
          p_description: `Depósito ${provider.toUpperCase()} ${reference}`,
        });
      }

      return json({
        success: true,
        transaction: txn,
        message: status === "confirmed"
          ? "Pagamento confirmado!"
          : "Verifique o telemóvel e confirme com o seu PIN.",
      });
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (msg.includes("not_configured")) {
        return fail("gateway indisponível — use o método manual ou configure DEBIT_GATEWAY_URL", 503);
      }
      return fail("gateway_error: " + msg, 502);
    }
  }

  // ---------------- STATUS ----------------
  if (body.action === "status") {
    const { data: txn, error } = await sb
      .from("mobile_debit_transactions")
      .select("*")
      .eq("id", body.transaction_id)
      .eq("user_id", userId)
      .single();
    if (error || !txn) return fail("not_found", 404);

    if (txn.status === "pending" || txn.status === "processing") {
      const ageMs = Date.now() - new Date(txn.created_at).getTime();
      // Timeout de 90s → cliente não confirmou o PIN
      if (ageMs > 90_000) {
        await sb.from("mobile_debit_transactions")
          .update({ status: "timeout", status_detail: "Cliente não confirmou o PIN a tempo", updated_at: new Date().toISOString() })
          .eq("id", txn.id).eq("status", "processing");
        return json({ success: true, status: "timeout", message: "Tempo esgotado. Tente novamente." });
      }
      return json({ success: true, status: txn.status, message: "A aguardar confirmação do PIN..." });
    }

    return json({ success: true, status: txn.status, message: txn.status_detail ?? "" });
  }

  return fail("unknown_action");
});
