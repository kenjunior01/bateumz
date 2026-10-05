// Bateu Mundo Aberto — entidades REAIS da plataforma no mapa.
// Busca anúncios (Prestações + Alienação), sorteios, concursos e cupões
// e compõe-los em RealEnt. Tudo com fallback defensivo: se a migração
// 20261004_openworld_geo.sql ainda não foi aplicada, o jogo continua a
// funcionar (itens sem coordenadas tornam-se "scoped" — nacionais).
import { supabase } from "@/integrations/supabase/client";
import { CELL, hashStr, mulberry32, todayStr } from "./core";
import { sameProvince, type RealEnt, type RealKind } from "./geo";

const sb = supabase as unknown as { from: (t: string) => any };

export interface FetchRealResult {
  fixed: RealEnt[]; // coordenadas reais (anúncios com localização)
  scoped: RealEnt[]; // nacionais/por província — colocados por célula
  colMissing: boolean; // true se a BD ainda não tem as colunas novas
}

const LISTING_LIMIT = 12;
const SCOPE_LIMIT = 16;
const RADIUS_DEG = 0.09; // ≈ 10 km

function listingEnt(
  id: string,
  src: "prest" | "aliq",
  title: string,
  price: number,
  img: string | null,
  lat: number | null,
  lng: number | null,
): RealEnt {
  const hasGeo = typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);
  return {
    key: `${src}:${id}`,
    kind: "listing" as RealKind,
    lat: hasGeo ? (lat as number) : 0,
    lng: hasGeo ? (lng as number) : 0,
    scoped: !hasGeo,
    title,
    sub: price > 0 ? `${price.toLocaleString("pt-PT")} MT · à venda perto de ti` : "À venda perto de ti",
    emoji: src === "prest" ? "🛒" : "🏗️",
    color: src === "prest" ? "#22c55e" : "#f97316",
    img: img || undefined,
    to: src === "prest" ? `/prestacoes/${id}` : `/alienacao/${id}`,
  };
}

async function fetchListings(lat: number, lng: number, out: { fixed: RealEnt[]; scoped: RealEnt[]; colMissing: boolean }) {
  const bLat0 = lat - RADIUS_DEG, bLat1 = lat + RADIUS_DEG;
  const bLng0 = lng - RADIUS_DEG, bLng1 = lng + RADIUS_DEG;

  // Prestações (venda a prestações)
  try {
    let rows: any[] | null = null;
    const withGeo = await sb.from("prestacao_products").select("id,title,total_price,images,province,city,lat,lng")
      .gte("lat", bLat0).lte("lat", bLat1).gte("lng", bLng0).lte("lng", bLng1).limit(LISTING_LIMIT);
    if (withGeo.error) {
      out.colMissing = true;
      const fb = await sb.from("prestacao_products").select("id,title,total_price,images,province,city").limit(LISTING_LIMIT);
      rows = fb.data;
    } else rows = withGeo.data;
    for (const r of rows || []) {
      const img = Array.isArray(r.images) ? r.images[0] : r.images;
      out[typeof r.lat === "number" && typeof r.lng === "number" ? "fixed" : "scoped"].push(
        listingEnt(r.id, "prest", r.title, Number(r.total_price) || 0, img || null, r.lat ?? null, r.lng ?? null),
      );
    }
  } catch { /* tabela indisponível — ignora */ }

  // Alienação de Bens (venda direta / leasing / leilão)
  try {
    let rows: any[] | null = null;
    const withGeo = await sb.from("alienacao_assets").select("id,title,asset_value,images,province,city,lat,lng")
      .gte("lat", bLat0).lte("lat", bLat1).gte("lng", bLng0).lte("lng", bLng1).limit(LISTING_LIMIT);
    if (withGeo.error) {
      out.colMissing = true;
      const fb = await sb.from("alienacao_assets").select("id,title,asset_value,images,province,city").limit(LISTING_LIMIT);
      rows = fb.data;
    } else rows = withGeo.data;
    for (const r of rows || []) {
      const img = Array.isArray(r.images) ? r.images[0] : r.images;
      out[typeof r.lat === "number" && typeof r.lng === "number" ? "fixed" : "scoped"].push(
        listingEnt(r.id, "aliq", r.title, Number(r.asset_value) || 0, img || null, r.lat ?? null, r.lng ?? null),
      );
    }
  } catch { /* ignora */ }
}

async function fetchRaffles(det: string | null, out: { scoped: RealEnt[]; colMissing: boolean }) {
  try {
    let rows: any[] | null = null;
    const a = await sb.from("raffles").select("id,title,slug,prize_title,ticket_price,image_url,end_date,map_scope,province,currency")
      .eq("status", "active").order("created_at", { ascending: false }).limit(SCOPE_LIMIT);
    if (a.error) {
      out.colMissing = true;
      const b = await sb.from("raffles").select("id,title,slug,prize_title,ticket_price,image_url,end_date,province,currency")
        .eq("status", "active").order("created_at", { ascending: false }).limit(SCOPE_LIMIT);
      rows = b.data;
    } else rows = a.data;
    for (const r of rows || []) {
      const scope = r.map_scope || "nacional";
      if (scope === "provincia" && !sameProvince(r.province, det)) continue;
      const cur = r.currency === "AOA" ? "Kz" : "MT";
      out.scoped.push({
        key: `raffle:${r.id}`,
        kind: "raffle",
        lat: 0, lng: 0, scoped: true,
        title: r.prize_title || r.title,
        sub: r.ticket_price > 0 ? `Sorteio · ${r.ticket_price} ${cur}/bilhete` : "Sorteio · participa grátis",
        emoji: "🎟️", color: "#fbbf24",
        img: r.image_url || undefined,
        to: `/raffle/${r.slug || r.id}`,
      });
    }
  } catch { /* ignora */ }
}

async function fetchContests(det: string | null, out: { scoped: RealEnt[]; colMissing: boolean }) {
  try {
    let rows: any[] | null = null;
    const a = await sb.from("contests").select("id,title,image_url,map_scope,province")
      .in("status", ["active", "voting"]).order("created_at", { ascending: false }).limit(SCOPE_LIMIT);
    if (a.error) {
      out.colMissing = true;
      const b = await sb.from("contests").select("id,title,image_url")
        .in("status", ["active", "voting"]).order("created_at", { ascending: false }).limit(SCOPE_LIMIT);
      rows = b.data;
    } else rows = a.data;
    for (const c of rows || []) {
      const scope = c.map_scope || "nacional";
      if (scope === "provincia" && !sameProvince(c.province, det)) continue;
      out.scoped.push({
        key: `contest:${c.id}`,
        kind: "contest",
        lat: 0, lng: 0, scoped: true,
        title: c.title,
        sub: "Concurso · participa e vota",
        emoji: "🏆", color: "#38bdf8",
        img: c.image_url || undefined,
        to: `/concursos/${c.id}`,
      });
    }
  } catch { /* ignora */ }
}

async function fetchCoupons(det: string | null, out: { scoped: RealEnt[] }) {
  try {
    const a = await sb.from("vouchers").select("code,type,value,min_purchase,valid_until,region")
      .eq("is_active", true).order("created_at", { ascending: false }).limit(10);
    if (a.error) return;
    for (const v of a.data || []) {
      if (v.region && !sameProvince(v.region, det)) continue;
      const val = v.type === "percentage" ? `${v.value}% desconto` : `${v.value} MT desconto`;
      out.scoped.push({
        key: `coupon:${v.code}`,
        kind: "coupon",
        lat: 0, lng: 0, scoped: true,
        title: `Cupão ${v.code}`,
        sub: `${val}${v.min_purchase > 0 ? ` · mín. ${v.min_purchase} MT` : ""}`,
        emoji: "🎫", color: "#c084fc",
        to: "/marketplace",
        code: v.code,
      });
    }
  } catch { /* tabela vouchers pode não existir — ignora */ }
}

// Busca todo o conteúdo real próximo/visível para o jogador.
// det = slug da província detectada por GPS (ou null).
export async function fetchReal(lat: number, lng: number, det: string | null): Promise<FetchRealResult> {
  const out: FetchRealResult = { fixed: [], scoped: [], colMissing: false };
  await Promise.all([
    fetchListings(lat, lng, out),
    fetchRaffles(det, out),
    fetchContests(det, out),
    fetchCoupons(det, out),
  ]);
  // sem duplicados
  const seen = new Set<string>();
  out.fixed = out.fixed.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  out.scoped = out.scoped.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  return out;
}

// Sorteios/concursos/cupões não têm ponto fixo — colocam-se de forma
// determinística por célula+dia (estável no mesmo bairro durante o dia).
export function scopeForCell(cx: number, cy: number, list: RealEnt[]): RealEnt[] {
  if (!list.length) return [];
  const rng = mulberry32(hashStr(`bateu-scope-${cx}:${cy}:${todayStr()}`));
  const n = 1 + Math.floor(rng() * 2); // 1-2 por célula
  const out: RealEnt[] = [];
  for (let i = 0; i < n; i++) {
    const pick = list[Math.floor(rng() * list.length)];
    const lat = +(cy * CELL + rng() * CELL).toFixed(6);
    const lng = +(cx * CELL + rng() * CELL).toFixed(6);
    out.push({ ...pick, lat, lng, key: `${pick.key}@${cx}:${cy}` });
  }
  return out;
}
