# 💳 Bateu — Débito Direto MPesa & e-Mola (Guia de Ativação)

O débito direto (push C2B) já está **implementado e pronto no app**. Faltam apenas
as tuas credenciais de API, que ficam seguras no servidor (Supabase Edge Function).
O cliente NUNCA vê as chaves.

## ✅ NOVO — Ativação pelo Painel Admin (sem terminal)

1. Entra no app com uma conta **admin** → `/admin/settings`
2. Abre o separador **"APIs Débito"**
3. Escolhe o modo (Gateway agregador ou API oficial MPesa) e preenche:
   - Gateway: **URL** + **API Key**
   - MPesa oficial (opcional): **SP Code**, **Portal Key**, **Public Key**, **Base URL**
4. Ativa/desativa cada método (MPesa, e-Mola, Conta Móvel, TkaX)
5. Clica **Guardar Credenciais** e depois **Testar Ligação** (diagnóstico instantâneo)

As credenciais do painel têm **prioridade** sobre os segredos do servidor
(`platform_settings` key `debit_api`, leitura restrita a admins por RLS).
A edge function `mobile-debit` lê primeiro do painel e cai para os segredos
`DEBIT_GATEWAY_URL` / `DEBIT_GATEWAY_KEY` / `MPESA_*` se o campo estiver vazio.

## Como funciona (fluxo no app)

1. Utilizador escolhe **M-Pesa** ou **e-Mola** no Depósito
2. Passo "Pagamento" → modo **Débito Direto** (recomendado, já ativo por defeito)
3. Introduz o número do telemóvel (84/85 para MPesa, 86/87 para e-Mola)
4. Toque em **"Pagar"** → o servidor envia o push para o telemóvel do utilizador
5. O utilizador confirma com o **PIN** no telemóvel
6. O saldo é creditado **automaticamente** (polling a cada 3s, timeout 90s)

O modo **Comprovativo manual** continua disponível como alternativa.

## Ativação — 2 opções

### Opção A — Gateway agregador (recomendado; serve MPesa + e-Mola + mais)

Se tens conta num agregador/processador de pagamentos de Moçambique
(ex.: provedores de "debito pay", gateways que expõem MPesa e e-Mola numa API só):

```bash
supabase secrets set DEBIT_GATEWAY_URL="https://api.teu-gateway.com/debit"
supabase secrets set DEBIT_GATEWAY_KEY="a_tua_api_key"
```

**Contrato esperado** (POST, JSON):

Request enviado pelo Bateu:
```json
{
  "provider": "mpesa" | "emola",
  "phone": "258841234567",
  "amount": 500,
  "reference": "BATEU-1727955000000-AB12CD",
  "currency": "MZN",
  "callback_type": "debit"
}
```

Resposta esperada do gateway:
```json
{
  "success": true,
  "transaction_id": "GW123456",
  "status": "processing" | "confirmed" | "failed",
  "message": "opcional"
}
```

### Opção B — API oficial Vodacom MZ (só MPesa)

Se tens contrato direto com a Vodacom (portal developer.mpesa.vm.co.mz):

```bash
supabase secrets set MPESA_SP_CODE="171717"
supabase secrets set MPESA_API_PORTAL_KEY="a_tua_portal_key"
supabase secrets set MPESA_API_PUBLIC_KEY="a_tua_public_key"   # opcional
supabase secrets set MPESA_BASE_URL="https://api.vm.co.mz:18352"  # produção (sandbox por defeito)
```

O e-Mola continua pelo gateway da Opção A (a Movitel/BCI não tem API pública direta).

## Deploy da Edge Function

```bash
# 1. Aplicar a migração (tabela mobile_debit_transactions + RLS)
supabase db push

# 2. Publicar a função
supabase functions deploy mobile-debit --no-verify-jwt=false

# 3. Definir os segredos (Opção A ou B acima)
supabase secrets set ...
```

## Sem configuração

Se ainda não configuraste as credenciais, o botão "Pagar" devolve
*"gateway indisponível"* e o utilizador pode usar o modo **Comprovativo manual**
(transferência + recibo), que não depende de API.

## Segurança

- ✅ Segredos só no servidor (Deno env do Supabase)
- ✅ Autenticação JWT obrigatória (cada utilizador só vê as suas transações)
- ✅ RLS ativo em `mobile_debit_transactions`
- ✅ Limites: mínimo 10 MZN, máximo 200 000 MZN
- ✅ Validação de operadora por prefixo (84/85 MPesa · 86/87 e-Mola)
- ⚠️ Recomendado: webhook do gateway para confirmação assíncrona (idempotente)

## Arquivos envolvidos

| Arquivo | Papel |
|---|---|
| `supabase/functions/mobile-debit/index.ts` | Edge Function (initiate + status) |
| `src/lib/mpesa-emola.ts` | Cliente (validação, push, polling) |
| `src/components/wallet/DepositModal.tsx` | UI do débito direto |
| `supabase/migrations/20261003_mobile_debit.sql` | Tabela + RLS |
