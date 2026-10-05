// Bateu Mundo Aberto — geografia das entidades REAIS da plataforma
// Províncias MZ/AO com capitais, detecção de província por GPS e tipos.
// Fonte dos slugs: src/lib/regions.ts (MZ_PROVINCES / AO_PROVINCES).

export interface ProvCapital {
  slug: string;
  label: string;
  country: "MZ" | "AO";
  lat: number;
  lng: number;
}

export const PROV_CAPITALS: ProvCapital[] = [
  // Moçambique (11) — slug = valor guardado nos formulários (getRegions("MZ"))
  { slug: "maputo-cidade", label: "Maputo Cidade", country: "MZ", lat: -25.9692, lng: 32.5732 },
  { slug: "maputo", label: "Maputo Província", country: "MZ", lat: -25.9622, lng: 32.4589 }, // Matola
  { slug: "gaza", label: "Gaza", country: "MZ", lat: -25.0519, lng: 33.6442 }, // Xai-Xai
  { slug: "inhambane", label: "Inhambane", country: "MZ", lat: -23.865, lng: 35.3833 },
  { slug: "sofala", label: "Sofala", country: "MZ", lat: -19.8436, lng: 34.8389 }, // Beira
  { slug: "manica", label: "Manica", country: "MZ", lat: -19.1164, lng: 33.4833 }, // Chimoio
  { slug: "tete", label: "Tete", country: "MZ", lat: -16.1564, lng: 33.5867 },
  { slug: "zambezia", label: "Zambézia", country: "MZ", lat: -17.8726, lng: 36.8882 }, // Quelimane
  { slug: "nampula", label: "Nampula", country: "MZ", lat: -15.1164, lng: 39.2666 },
  { slug: "niassa", label: "Niassa", country: "MZ", lat: -13.3128, lng: 35.2406 }, // Lichinga
  { slug: "cabo-delgado", label: "Cabo Delgado", country: "MZ", lat: -12.974, lng: 40.5177 }, // Pemba
  // Angola (18)
  { slug: "luanda", label: "Luanda", country: "AO", lat: -8.839, lng: 13.2894 },
  { slug: "bengo", label: "Bengo", country: "AO", lat: -8.5786, lng: 13.6644 }, // Caxito
  { slug: "benguela", label: "Benguela", country: "AO", lat: -12.5762, lng: 13.4053 },
  { slug: "bie", label: "Bié", country: "AO", lat: -12.3833, lng: 16.9333 }, // Cuito
  { slug: "cabinda", label: "Cabinda", country: "AO", lat: -5.55, lng: 12.2 },
  { slug: "cuando-cubango", label: "Cuando Cubango", country: "AO", lat: -14.6585, lng: 17.6911 }, // Menongue
  { slug: "cuanza-norte", label: "Cuanza Norte", country: "AO", lat: -9.2975, lng: 14.9117 }, // Ndalatando
  { slug: "cuanza-sul", label: "Cuanza Sul", country: "AO", lat: -11.2061, lng: 13.8433 }, // Sumbe
  { slug: "cunene", label: "Cunene", country: "AO", lat: -17.0644, lng: 15.7319 }, // Ondjiva
  { slug: "huambo", label: "Huambo", country: "AO", lat: -12.7761, lng: 15.7392 },
  { slug: "huila", label: "Huíla", country: "AO", lat: -14.9177, lng: 13.4925 }, // Lubango
  { slug: "lunda-norte", label: "Lunda Norte", country: "AO", lat: -7.4089, lng: 20.8283 }, // Dundo
  { slug: "lunda-sul", label: "Lunda Sul", country: "AO", lat: -10.2117, lng: 19.8692 }, // Saurimo
  { slug: "malanje", label: "Malanje", country: "AO", lat: -9.5402, lng: 16.341 },
  { slug: "moxico", label: "Moxico", country: "AO", lat: -11.7789, lng: 19.9128 }, // Luena
  { slug: "namibe", label: "Namibe", country: "AO", lat: -15.1961, lng: 12.1522 },
  { slug: "uige", label: "Uíge", country: "AO", lat: -7.6087, lng: 15.0611 },
  { slug: "zaire", label: "Zaire", country: "AO", lat: -6.2681, lng: 12.365 }, // M'Banza Congo
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// "Huíla" → "huila", "Maputo City" → "maputo-city", etc.
export function normProv(s?: string | null): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// aliases frequentes em texto livre / dados antigos
const PROV_ALIASES: Record<string, string> = {
  "maputo-city": "maputo-cidade",
  "cidade-de-maputo": "maputo-cidade",
  "maputo-province": "maputo",
  "provincia-de-maputo": "maputo",
  "matola": "maputo",
  "quelimane": "zambezia",
  "beira": "sofala",
  "chimoio": "manica",
  "pemba": "cabo-delgado",
  "lichinga": "niassa",
  "xaixai": "gaza",
  "xai-xai": "gaza",
  "inhambane-city": "inhambane",
  "menongue": "cuando-cubango",
  "ndalatando": "cuanza-norte",
  "sumbe": "cuanza-sul",
  "ondjiva": "cunene",
  "dundo": "lunda-norte",
  "saurimo": "lunda-sul",
  "luena": "moxico",
  "caxito": "bengo",
  "cuito": "bie",
  "lubango": "huila",
  "mbanza-congo": "zaire",
};

export function canonProv(s?: string | null): string {
  const n = normProv(s);
  return PROV_ALIASES[n] || n;
}

// Maputo cidade ⇄ Maputo província contam como a mesma área (são contíguas)
const SAME_AREA: string[][] = [["maputo", "maputo-cidade"]];

export function sameProvince(a?: string | null, b?: string | null): boolean {
  const x = canonProv(a);
  const y = canonProv(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return SAME_AREA.some((g) => g.includes(x) && g.includes(y));
}

// Detecta a província do jogador pela capital mais próxima (dentro de maxKm)
export function detectProvince(lat: number, lng: number, maxKm = 130): ProvCapital | null {
  let best: ProvCapital | null = null;
  let bestKm = Infinity;
  for (const p of PROV_CAPITALS) {
    const km = haversineKm(lat, lng, p.lat, p.lng);
    if (km < bestKm) {
      bestKm = km;
      best = p;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

// ---------- Entidades REAIS da plataforma no mapa ----------
export type RealKind = "listing" | "raffle" | "contest" | "coupon";

export interface RealEnt {
  key: string; // estável para o marcador + recompensa de descoberta
  kind: RealKind;
  lat: number;
  lng: number;
  scoped: boolean; // true = colocado por célula (nacional/província); false = coordenada real
  title: string;
  sub: string;
  emoji: string;
  color: string;
  img?: string;
  to: string; // rota da plataforma
  code?: string; // cupão
}
