import { z } from "zod";

/**
 * Sistema de Alienação de Bens — Bateu
 * Empresas colocam bens (viaturas, imóveis, equipamentos, frotas, máquinas)
 * para alienação: venda direta, leasing operacional/financeiro, rent-to-own
 * ou leilão. Inclui simulador de leasing com valor residual (balloon).
 */

export type AlienacaoCategory =
  | "viaturas"
  | "imoveis"
  | "equipamentos"
  | "frotas"
  | "maquinario"
  | "outros";

export type AlienacaoModality = "venda_direta" | "leasing" | "rent_to_own" | "leilao";

export type AlienacaoStatus = "disponivel" | "reservado" | "em_contrato" | "concluido" | "cancelado";

export const ALIENACAO_CATEGORIES: { id: AlienacaoCategory; label: string; icon: string }[] = [
  { id: "viaturas", label: "Viaturas", icon: "car" },
  { id: "imoveis", label: "Imóveis", icon: "home" },
  { id: "equipamentos", label: "Equipamentos", icon: "wrench" },
  { id: "frotas", label: "Frotas", icon: "truck" },
  { id: "maquinario", label: "Máquinas", icon: "factory" },
  { id: "outros", label: "Outros", icon: "package" },
];

export const ALIENACAO_MODALITIES: {
  id: AlienacaoModality;
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    id: "venda_direta",
    label: "Venda Direta",
    desc: "Aquisição imediata à vista ou financiado",
    badge: "À VENDA",
  },
  {
    id: "leasing",
    label: "Leasing",
    desc: "Aluguer com opção de compra no final",
    badge: "LEASING",
  },
  {
    id: "rent_to_own",
    label: "Rent-to-Own",
    desc: "Cada prestação conta para a propriedade",
    badge: "RTO",
  },
  {
    id: "leilao",
    label: "Leilão / Propostas",
    desc: "Receba propostas e escolha a melhor",
    badge: "LEILÃO",
  },
];

export const ALIENACAO_STATUSES = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "em_contrato", label: "Em Contrato" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
] as const;

/** Taxas anuais indicativas por categoria (0.16 = 16% ao ano). */
export const ALIENACAO_CATEGORY_DEFAULTS: Record<
  AlienacaoCategory,
  { annualRate: number; maxMonths: number; residualPct: number }
> = {
  viaturas: { annualRate: 0.14, maxMonths: 60, residualPct: 0.3 },
  imoveis: { annualRate: 0.11, maxMonths: 120, residualPct: 0.25 },
  equipamentos: { annualRate: 0.17, maxMonths: 48, residualPct: 0.2 },
  frotas: { annualRate: 0.15, maxMonths: 60, residualPct: 0.3 },
  maquinario: { annualRate: 0.18, maxMonths: 72, residualPct: 0.2 },
  outros: { annualRate: 0.2, maxMonths: 36, residualPct: 0.1 },
};

/**
 * Prestação de leasing com valor residual (balloon payment).
 * O financiador amortiza apenas (valor - residual), cobrando juros sobre
 * o capital em dívida. Retorno detalhado para UI + resumo.
 */
export function leasingQuote(opts: {
  assetValue: number;
  downPayment: number;
  months: number;
  annualRate: number;
  residualPct?: number;
}) {
  const { assetValue, downPayment, months, annualRate } = opts;
  const residualPct = opts.residualPct ?? 0;
  const residual = assetValue * residualPct;
  const principal = Math.max(assetValue - downPayment - residual, 0);
  const r = annualRate / 12;

  let monthly: number;
  if (months <= 0 || principal <= 0) monthly = 0;
  else if (r === 0) monthly = principal / months;
  else monthly = (principal * r) / (1 - Math.pow(1 + r, -months));

  const totalPaid = downPayment + monthly * months + residual;
  const totalInterest = totalPaid - assetValue;

  return {
    residual: Math.round(residual),
    monthly: Math.round(monthly),
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
    financed: Math.round(principal),
  };
}

/** Cronograma de pagamentos mês a mês (para gráfico / tabela). */
export function paymentSchedule(opts: {
  assetValue: number;
  downPayment: number;
  months: number;
  annualRate: number;
  residualPct?: number;
}) {
  const q = leasingQuote(opts);
  const rows: {
    month: number;
    payment: number;
    interest: number;
    principal: number;
    balance: number;
  }[] = [];
  const r = opts.annualRate / 12;
  let balance = q.residual + q.financed;
  for (let m = 1; m <= opts.months; m++) {
    const interest = balance * r;
    const principalPart = q.monthly - interest;
    balance = Math.max(balance - principalPart, 0);
    rows.push({
      month: m,
      payment: q.monthly,
      interest: Math.round(interest),
      principal: Math.round(Math.max(principalPart, 0)),
      balance: Math.round(balance),
    });
  }
  if (q.residual > 0) {
    rows.push({
      month: opts.months + 1,
      payment: q.residual,
      interest: 0,
      principal: q.residual,
      balance: 0,
    });
    rows[rows.length - 2].month = opts.months; // balão no último mês
    rows[rows.length - 2].payment = rows[rows.length - 2].principal;
  }
  return rows;
}

export function formatMoneyShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

const phoneRegex = /^[+]?[0-9 ()-]{8,20}$/;

export const alienacaoAssetSchema = z
  .object({
    title: z.string().trim().min(3, "Título muito curto").max(140),
    category: z.enum(["viaturas", "imoveis", "equipamentos", "frotas", "maquinario", "outros"]),
    modality: z.enum(["venda_direta", "leasing", "rent_to_own", "leilao"]),
    description: z.string().trim().max(3000).optional().or(z.literal("")),
    asset_value: z.number().positive("Valor tem de ser maior que zero"),
    min_down_payment: z.number().min(0),
    max_months: z.number().int().min(1).max(240),
    annual_rate: z.number().min(0).max(1, "Taxa entre 0 e 1 (ex.: 0.14)"),
    residual_pct: z.number().min(0).max(0.9),
    auction_deadline: z.string().nullable().optional(),
    min_bid: z.number().min(0).optional().nullable(),
    images: z.array(z.string().url("URL de imagem inválida")).max(10),
    province: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(60).optional().or(z.literal("")),
    condition: z.enum(["novo", "seminovo", "usado"]),
    brand: z.string().trim().max(60).optional().or(z.literal("")),
    model: z.string().trim().max(60).optional().or(z.literal("")),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
    mileage: z.number().int().min(0).optional().nullable(),
    registration: z.string().trim().max(30).optional().or(z.literal("")),
    documents_ready: z.boolean(),
    warranty_months: z.number().int().min(0).max(60),
    whatsapp: z.string().trim().regex(phoneRegex, "WhatsApp inválido"),
    status: z.enum(["disponivel", "reservado", "em_contrato", "concluido", "cancelado"]),
    featured: z.boolean(),
  })
  .refine((d) => d.min_down_payment < d.asset_value, {
    path: ["min_down_payment"],
    message: "Entrada mínima tem de ser inferior ao valor do bem",
  });

export type AlienacaoAssetInput = z.infer<typeof alienacaoAssetSchema>;

export const alienacaoOfferSchema = z.object({
  asset_id: z.string().uuid(),
  offer_type: z.enum(["compra", "leasing", "rent_to_own", "leilao"]),
  amount: z.number().positive("Proposta tem de ser positiva"),
  down_payment: z.number().min(0),
  months: z.number().int().min(1).max(240),
  name: z.string().trim().min(2, "Indique o seu nome").max(80),
  phone: z.string().trim().regex(phoneRegex, "Telefone inválido"),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type AlienacaoOfferInput = z.infer<typeof alienacaoOfferSchema>;

export const STATUS_COLORS: Record<string, string> = {
  disponivel: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  reservado: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  em_contrato: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  concluido: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-red-500/15 text-red-500 border-red-500/30",
};

export const MODALITY_COLORS: Record<string, string> = {
  venda_direta: "bg-primary/15 text-primary border-primary/30",
  leasing: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  rent_to_own: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  leilao: "bg-orange-500/15 text-orange-500 border-orange-500/30",
};
