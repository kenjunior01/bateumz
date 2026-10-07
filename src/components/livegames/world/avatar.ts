// @ts-nocheck
// ============================================================
// BATEU WORLD — Sistema de Avatares · v5
// Humanoide articulado 100% customizável (pele, cabelo, traje,
// capa, chapéu) construído em three.js puro — NÃO é estilo
// Minecraft/Lego: proporções humanas, membros articulados,
// cabelos esculpidos e acessórios.
// Os avatares são codificados numa chave compacta (ex. "0.2.3.
// 1.4.2.1.0") e sincronizados via Supabase Realtime para que
// cada jogador veja a aparência real dos outros.
// ============================================================

import * as THREE from "three";

export interface AvatarConfig {
  skin: number;      // tom de pele (índice em AVATAR_SKINS)
  hair: number;      // estilo de cabelo (índice em AVATAR_HAIRS)
  hairColor: number; // cor do cabelo (índice em AVATAR_HAIR_COLORS)
  outfit: number;    // cor principal do traje (índice em AVATAR_OUTFITS)
  trim: number;      // cor de detalhe do traje (índice em AVATAR_TRIMS)
  cape: number;      // capa (índice em AVATAR_CAPES; 0 = cor da classe)
  hat: number;       // chapéu (índice em AVATAR_HATS)
}

// ── Paletas globais (mundiais: todos os tons de pele) ───────
export const AVATAR_SKINS: { hex: number; name: string }[] = [
  { hex: 0xffe0bd, name: "Porcelana" },
  { hex: 0xf5d0a9, name: "Claro" },
  { hex: 0xeab588, name: "Areia" },
  { hex: 0xd9a066, name: "Dourado" },
  { hex: 0xb97a50, name: "Bronze" },
  { hex: 0x8d5a2b, name: "Castanho" },
  { hex: 0x6b4423, name: "Escuro" },
  { hex: 0x4a2f1b, name: "Ébano" },
];

export const AVATAR_HAIRS: { name: string; emoji: string }[] = [
  { name: "Careca", emoji: "🚫" },
  { name: "Curto", emoji: "👦" },
  { name: "Moicano", emoji: "🦎" },
  { name: "Coques", emoji: "👯" },
  { name: "Afro", emoji: "🌐" },
  { name: "Dreads", emoji: "🪢" },
  { name: "Tranças", emoji: "🧵" },
  { name: "Rasto", emoji: "🌿" },
];

export const AVATAR_HAIR_COLORS: { hex: number; name: string }[] = [
  { hex: 0x181511, name: "Preto" },
  { hex: 0x3b2416, name: "Castanho" },
  { hex: 0x6b4423, name: "Avelã" },
  { hex: 0x8a5a2b, name: "Louro" },
  { hex: 0xd9b380, name: "Areia" },
  { hex: 0xe5e5e5, name: "Grisalho" },
  { hex: 0xb91c1c, name: "Vermelho" },
  { hex: 0x8b5cf6, name: "Neon" },
];

export const AVATAR_OUTFITS: { hex: number; name: string }[] = [
  { hex: 0xef4444, name: "Rubi" },
  { hex: 0x3b82f6, name: "Safira" },
  { hex: 0x22c55e, name: "Esmeralda" },
  { hex: 0xeab308, name: "Ouro" },
  { hex: 0x8b5cf6, name: "Ametista" },
  { hex: 0xf97316, name: "Âmbar" },
  { hex: 0x14b8a6, name: "Turquesa" },
  { hex: 0xec4899, name: "Rosa" },
];

export const AVATAR_TRIMS: { hex: number; name: string }[] = [
  { hex: 0xfbbf24, name: "Dourado" },
  { hex: 0xf8fafc, name: "Branco" },
  { hex: 0x111827, name: "Negro" },
  { hex: 0x22d3ee, name: "Ciano" },
  { hex: 0xf43f5e, name: "Rosa" },
  { hex: 0xa3e635, name: "Lima" },
  { hex: 0xfb923c, name: "Laranja" },
  { hex: 0x6366f1, name: "Índigo" },
];

export const AVATAR_CAPES: { name: string; hex: number | null }[] = [
  { name: "Cor da classe", hex: null },
  { name: "Sem capa", hex: -1 },
  { name: "Carmesim", hex: 0xdc2626 },
  { name: "Azul-real", hex: 0x2563eb },
  { name: "Floresta", hex: 0x16a34a },
  { name: "Dourada", hex: 0xfbbf24 },
  { name: "Roxa", hex: 0x7c3aed },
  { name: "Sombria", hex: 0x1f2937 },
];

export const AVATAR_HATS: { name: string; emoji: string }[] = [
  { name: "Nenhum", emoji: "🚫" },
  { name: "Bandana", emoji: "🎀" },
  { name: "Elmo", emoji: "🪖" },
  { name: "Coroa", emoji: "👑" },
  { name: "Chapéu", emoji: "🎩" },
  { name: "Ombreiras", emoji: "🛡️" },
];

// ── Chave compacta para sincronização (ex. "2.1.0.3.1.0.3") ─
export function avatarKey(c: AvatarConfig): string {
  return `${c.skin}.${c.hair}.${c.hairColor}.${c.outfit}.${c.trim}.${c.cape}.${c.hat}`;
}

export function parseAvatarKey(s: string | undefined | null): AvatarConfig | null {
  try {
    const p = (s || "").split(".").map((v) => parseInt(v, 10));
    if (p.length !== 7 || p.some((v) => !Number.isFinite(v))) return null;
    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
    return {
      skin: clamp(p[0], AVATAR_SKINS.length - 1),
      hair: clamp(p[1], AVATAR_HAIRS.length - 1),
      hairColor: clamp(p[2], AVATAR_HAIR_COLORS.length - 1),
      outfit: clamp(p[3], AVATAR_OUTFITS.length - 1),
      trim: clamp(p[4], AVATAR_TRIMS.length - 1),
      cape: clamp(p[5], AVATAR_CAPES.length - 1),
      hat: clamp(p[6], AVATAR_HATS.length - 1),
    };
  } catch {
    return null;
  }
}

export function defaultAvatar(classId: number): AvatarConfig {
  // traje por defeito sintonizado com a cor da classe
  const outfitByClass = [0, 1, 2, 6]; // Guerreiro rubi, Mago safira, Arqueiro esmeralda, Curandeiro turquesa
  return { skin: 4, hair: 1, hairColor: 0, outfit: outfitByClass[classId] ?? 1, trim: 0, cape: 0, hat: 0 };
}

export function randomAvatar(classId: number): AvatarConfig {
  const ri = (n: number) => Math.floor(Math.random() * n);
  return {
    skin: ri(AVATAR_SKINS.length),
    hair: ri(AVATAR_HAIRS.length),
    hairColor: ri(AVATAR_HAIR_COLORS.length),
    outfit: ri(AVATAR_OUTFITS.length),
    trim: ri(AVATAR_TRIMS.length),
    cape: ri(AVATAR_CAPES.length),
    hat: ri(AVATAR_HATS.length),
  };
}

// ── Geometrias partilhadas (performance) ────────────────────
let GEO: {
  head: THREE.SphereGeometry;
  eye: THREE.SphereGeometry;
  torso: THREE.CylinderGeometry;
  belt: THREE.CylinderGeometry;
  arm: THREE.CapsuleGeometry;
  hand: THREE.SphereGeometry;
  leg: THREE.CapsuleGeometry;
  foot: THREE.BoxGeometry;
  hairCap: THREE.SphereGeometry;
  lock: THREE.CylinderGeometry;
  braid: THREE.CylinderGeometry;
  puff: THREE.SphereGeometry;
  crest: THREE.BoxGeometry;
  ringBand: THREE.TorusGeometry;
  crownBand: THREE.CylinderGeometry;
  spike: THREE.ConeGeometry;
  hatTop: THREE.ConeGeometry;
  hatBrim: THREE.CylinderGeometry;
  pad: THREE.SphereGeometry;
} | null = null;

function geos() {
  if (!GEO) {
    GEO = {
      head: new THREE.SphereGeometry(0.27, 14, 12),
      eye: new THREE.SphereGeometry(0.038, 6, 6),
      torso: new THREE.CylinderGeometry(0.21, 0.27, 0.66, 10),
      belt: new THREE.CylinderGeometry(0.245, 0.27, 0.09, 10),
      arm: new THREE.CapsuleGeometry(0.075, 0.4, 3, 8),
      hand: new THREE.SphereGeometry(0.095, 8, 7),
      leg: new THREE.CapsuleGeometry(0.095, 0.44, 3, 8),
      foot: new THREE.BoxGeometry(0.16, 0.1, 0.3),
      hairCap: new THREE.SphereGeometry(0.29, 12, 10),
      lock: new THREE.CylinderGeometry(0.05, 0.03, 0.42, 5),
      braid: new THREE.CylinderGeometry(0.028, 0.02, 0.5, 4),
      puff: new THREE.SphereGeometry(0.14, 8, 7),
      crest: new THREE.BoxGeometry(0.06, 0.26, 0.05),
      ringBand: new THREE.TorusGeometry(0.27, 0.045, 6, 16),
      crownBand: new THREE.CylinderGeometry(0.25, 0.27, 0.12, 10, 1, true),
      spike: new THREE.ConeGeometry(0.05, 0.16, 5),
      hatTop: new THREE.ConeGeometry(0.3, 0.38, 10),
      hatBrim: new THREE.CylinderGeometry(0.46, 0.46, 0.045, 14),
      pad: new THREE.SphereGeometry(0.15, 8, 7),
    };
  }
  return GEO;
}

// ── Interfaces do resultado ─────────────────────────────────
export interface AvatarParts {
  root: THREE.Group;          // grupo completo (usar como player.group)
  bodyRoot: THREE.Group;      // subgrupo do corpo (para substituição/escala)
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  cape: THREE.Mesh | null;
  hat: THREE.Group | null;
  hairGroup: THREE.Group;
  weaponSlot: THREE.Group;    // mão direita — arma da classe é adicionada aqui
}

export interface AvatarBuildOpts {
  classColor: number;         // cor da classe (aura/capa por defeito)
  withWeapon?: boolean;       // construir arma da classe na mão
  classId?: number;
}

const C = (hex: number, opts: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color: hex, ...opts });

function darker(hex: number, f = 0.55): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

/** Constrói o cabelo escolhido em torno da cabeça. */
function buildHair(style: number, hairHex: number, g = geos()): THREE.Group {
  const grp = new THREE.Group();
  const mat = C(hairHex);
  const add = (m: THREE.Object3D) => grp.add(m);
  switch (style) {
    case 1: { // Curto
      const cap = new THREE.Mesh(g.hairCap, mat);
      cap.scale.set(1.02, 0.82, 1.02);
      cap.position.y = 0.075;
      add(cap);
      break;
    }
    case 2: { // Moicano
      const strip = new THREE.Mesh(g.crest, mat);
      strip.scale.set(3.4, 1.15, 1.4);
      strip.position.y = 0.24;
      add(strip);
      const back = new THREE.Mesh(g.crest, mat);
      back.scale.set(3.2, 1, 1.2);
      back.position.set(0, 0.12, -0.18);
      back.rotation.x = 0.7;
      add(back);
      break;
    }
    case 3: { // Coques
      const cap = new THREE.Mesh(g.hairCap, mat);
      cap.scale.set(1.02, 0.8, 1.02);
      cap.position.y = 0.07;
      add(cap);
      const p1 = new THREE.Mesh(g.puff, mat); p1.position.set(0.16, 0.28, 0); add(p1);
      const p2 = new THREE.Mesh(g.puff, mat); p2.position.set(-0.16, 0.28, 0); add(p2);
      break;
    }
    case 4: { // Afro
      const afro = new THREE.Mesh(g.hairCap, mat);
      afro.scale.set(1.35, 1.22, 1.35);
      afro.position.y = 0.13;
      add(afro);
      break;
    }
    case 5: { // Dreads
      const cap = new THREE.Mesh(g.hairCap, mat);
      cap.scale.set(1.06, 0.85, 1.06);
      cap.position.y = 0.07;
      add(cap);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const d = new THREE.Mesh(g.lock, mat);
        d.position.set(Math.sin(a) * 0.26, -0.08, Math.cos(a) * 0.26);
        d.rotation.z = Math.sin(a) * 0.35;
        d.rotation.x = Math.cos(a) * 0.35;
        add(d);
      }
      break;
    }
    case 6: { // Tranças
      const cap = new THREE.Mesh(g.hairCap, mat);
      cap.scale.set(1.04, 0.84, 1.04);
      cap.position.y = 0.07;
      add(cap);
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(g.braid, mat);
        b.position.set(-0.16 + i * 0.08, -0.12, -0.2 - Math.abs(i - 2) * 0.03);
        b.rotation.x = 0.35;
        add(b);
      }
      break;
    }
    case 7: { // Rasto (loctes curtos para cima)
      const cap = new THREE.Mesh(g.hairCap, mat);
      cap.scale.set(1.05, 0.9, 1.05);
      cap.position.y = 0.06;
      add(cap);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const t = new THREE.Mesh(g.lock, mat);
        t.scale.set(0.8, 0.55, 0.8);
        t.position.set(Math.sin(a) * 0.2, 0.2, Math.cos(a) * 0.2);
        t.rotation.z = Math.sin(a) * 0.5;
        add(t);
      }
      break;
    }
    default: break; // 0 = careca
  }
  return grp;
}

/** Constrói o chapéu escolhido. */
function buildHat(style: number, trimHex: number, g = geos()): THREE.Group | null {
  const grp = new THREE.Group();
  switch (style) {
    case 1: { // Bandana
      const band = new THREE.Mesh(g.ringBand, C(trimHex));
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.1;
      band.scale.set(1.04, 1, 0.72);
      grp.add(band);
      const knot1 = new THREE.Mesh(g.crest, C(trimHex));
      knot1.scale.set(0.7, 0.7, 0.7);
      knot1.position.set(0.08, 0.1, -0.26);
      knot1.rotation.z = 0.5;
      grp.add(knot1);
      const knot2 = knot1.clone();
      knot2.position.x = -0.06;
      knot2.rotation.z = -0.8;
      grp.add(knot2);
      break;
    }
    case 2: { // Elmo
      const helm = new THREE.Mesh(g.hairCap, C(0xb8c4d4, { metalness: undefined }));
      helm.scale.set(1.12, 1.05, 1.12);
      helm.position.y = 0.1;
      grp.add(helm);
      const nose = new THREE.Mesh(g.crest, C(0x8fa0b5));
      nose.scale.set(0.55, 1.1, 0.9);
      nose.position.set(0, 0.02, 0.27);
      grp.add(nose);
      const plume = new THREE.Mesh(g.crest, C(trimHex));
      plume.position.y = 0.28;
      plume.rotation.z = 0;
      grp.add(plume);
      break;
    }
    case 3: { // Coroa
      const band = new THREE.Mesh(g.crownBand, C(0xfbbf24));
      band.position.y = 0.3;
      grp.add(band);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const s = new THREE.Mesh(g.spike, C(0xfbbf24));
        s.position.set(Math.sin(a) * 0.25, 0.44, Math.cos(a) * 0.25);
        grp.add(s);
      }
      const gem = new THREE.Mesh(geos().eye, C(0xef4444));
      gem.scale.set(1.6, 1.6, 1.6);
      gem.position.set(0, 0.3, 0.27);
      grp.add(gem);
      break;
    }
    case 4: { // Chapéu de aventureiro
      const brim = new THREE.Mesh(g.hatBrim, C(darker(trimHex, 0.9)));
      brim.position.y = 0.24;
      grp.add(brim);
      const top = new THREE.Mesh(g.hatTop, C(trimHex));
      top.position.y = 0.45;
      top.scale.set(0.85, 1, 0.85);
      grp.add(top);
      break;
    }
    case 5: { // Ombreiras (sem chapéu na cabeça)
      return null; // tratadas à parte no buildAvatar
    }
    default:
      return null;
  }
  return grp;
}

/**
 * Constrói o avatar humanoide completo e articulado.
 * Devolve as partes para animação de caminhada/ataque.
 */
export function buildAvatar(cfg: AvatarConfig, opts: AvatarBuildOpts): AvatarParts {
  const g = geos();
  const skinHex = AVATAR_SKINS[cfg.skin % AVATAR_SKINS.length].hex;
  const outfitHex = AVATAR_OUTFITS[cfg.outfit % AVATAR_OUTFITS.length].hex;
  const trimHex = AVATAR_TRIMS[cfg.trim % AVATAR_TRIMS.length].hex;
  const hairHex = AVATAR_HAIR_COLORS[cfg.hairColor % AVATAR_HAIR_COLORS.length].hex;

  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  // ── pernas (pivot na anca) ──
  const legMat = C(darker(outfitHex, 0.6));
  const bootMat = C(0x2b2b33);
  const mkLeg = (side: 1 | -1) => {
    const grp = new THREE.Group();
    grp.position.set(side * 0.13, 1.02, 0);
    const leg = new THREE.Mesh(g.leg, legMat);
    leg.position.y = -0.31;
    grp.add(leg);
    const foot = new THREE.Mesh(g.foot, bootMat);
    foot.position.set(0, -0.56, 0.05);
    grp.add(foot);
    return grp;
  };
  const legL = mkLeg(-1);
  const legR = mkLeg(1);
  bodyRoot.add(legL, legR);

  // ── tronco + cinto ──
  const torso = new THREE.Mesh(g.torso, C(outfitHex));
  torso.position.y = 1.34;
  torso.name = "torso";
  const belt = new THREE.Mesh(g.belt, C(trimHex));
  belt.position.y = 1.08;
  bodyRoot.add(torso, belt);
  // emblema do peito (detalhe de traje)
  const emblem = new THREE.Mesh(g.eye, C(trimHex));
  emblem.scale.set(2.2, 2.2, 0.9);
  emblem.position.set(0, 1.48, 0.24);
  bodyRoot.add(emblem);

  // ── braços (pivot no ombro) ──
  const mkArm = (side: 1 | -1) => {
    const grp = new THREE.Group();
    grp.position.set(side * 0.31, 1.6, 0);
    const arm = new THREE.Mesh(g.arm, C(outfitHex));
    arm.position.y = -0.26;
    grp.add(arm);
    const hand = new THREE.Mesh(g.hand, C(skinHex));
    hand.position.y = -0.52;
    grp.add(hand);
    return grp;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  bodyRoot.add(armL, armR);

  // ── ombreiras (chapéu "5") ──
  if (cfg.hat === 5) {
    const padMat = C(trimHex);
    const p1 = new THREE.Mesh(g.pad, padMat); p1.position.set(-0.33, 1.68, 0); p1.scale.set(1, 0.7, 1);
    const p2 = new THREE.Mesh(g.pad, padMat); p2.position.set(0.33, 1.68, 0); p2.scale.set(1, 0.7, 1);
    bodyRoot.add(p1, p2);
  }

  // ── cabeça + rosto ──
  const head = new THREE.Mesh(g.head, C(skinHex));
  head.position.y = 1.86;
  const eyeMat = C(0x181511);
  const e1 = new THREE.Mesh(g.eye, eyeMat); e1.position.set(-0.09, 1.9, 0.24);
  const e2 = new THREE.Mesh(g.eye, eyeMat); e2.position.set(0.09, 1.9, 0.24);
  bodyRoot.add(head, e1, e2);

  // ── cabelo ──
  const hairGroup = buildHair(cfg.hair, hairHex);
  hairGroup.position.y = 1.86;
  bodyRoot.add(hairGroup);

  // ── chapéu ──
  let hat: THREE.Group | null = null;
  if (cfg.hat > 0 && cfg.hat !== 5) {
    hat = buildHat(cfg.hat, trimHex);
    if (hat) {
      hat.position.y = 1.86;
      bodyRoot.add(hat);
    }
  }

  // ── capa (esvoaça — engine anima via parts.cape) ──
  let cape: THREE.Mesh | null = null;
  const capeDef = AVATAR_CAPES[cfg.cape % AVATAR_CAPES.length];
  if (capeDef.hex !== -1) {
    const capeHex = capeDef.hex === null ? opts.classColor : capeDef.hex;
    cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 1.05, 1, 4),
      C(capeHex, { side: THREE.DoubleSide, transparent: true, opacity: 0.94 })
    );
    cape.position.set(0, 1.32, -0.26);
    cape.rotation.x = 0.16;
    bodyRoot.add(cape);
  }

  // ── slot da arma (mão direita) ──
  const weaponSlot = new THREE.Group();
  weaponSlot.position.set(0, -0.52, 0.02);
  armR.add(weaponSlot);

  return { root, bodyRoot, armL, armR, legL, legR, torso, head, cape, hat, hairGroup, weaponSlot };
}

/** Animação de caminhada/idle do avatar (chamada por frame). */
export function animateAvatar(
  parts: AvatarParts,
  phase: number,          // ciclo de passos (avançar com dt quando em movimento)
  moving: boolean,
  swingT: number,         // 0..1 durante golpe (arma/ataque)
  tMs: number,            // performance.now()
  guardT = 0              // v6: 0..1 — erguer escudo (modo guarda)
): void {
  const sway = moving ? Math.sin(phase) : 0;
  const idle = Math.sin(tMs / 620) * 0.06;
  const amp = moving ? 0.85 : 0.12;
  // braços e pernas alternados
  parts.legL.rotation.x = sway * amp;
  parts.legR.rotation.x = -sway * amp;
  if (guardT > 0.01) {
    // v6: modo guarda — braço esquerdo ergue o escudo à frente;
    // pernas continuam a andar, braço direito mantém a arma pronta
    parts.armL.rotation.x = -1.25 * guardT + idle * (1 - guardT);
    parts.armL.rotation.y = 0.55 * guardT;
    if (swingT > 0) {
      const e = Math.sin(swingT * Math.PI);
      parts.armR.rotation.x = -e * 2.2;
    } else {
      parts.armR.rotation.x = -sway * amp * 0.8 + idle;
    }
  } else if (swingT > 0) {
    // durante o golpe, braço direito levanta e desce
    const e = Math.sin(swingT * Math.PI);
    parts.armR.rotation.x = -e * 2.2;
    parts.armL.rotation.x = idle;
    parts.armL.rotation.y = 0;
  } else {
    parts.armR.rotation.x = -sway * amp * 0.8 + idle;
    parts.armL.rotation.x = sway * amp * 0.8 + idle;
    parts.armL.rotation.y = 0;
  }
  // balanço vertical do corpo + respiração
  const bobY = moving ? Math.abs(Math.sin(phase)) * 0.07 : Math.sin(tMs / 620) * 0.012;
  parts.bodyRoot.position.y = bobY;
  // leve inclinação ao correr
  parts.bodyRoot.rotation.x = moving ? 0.07 : 0;
  // cabelo e chapéu acompanham
  parts.hairGroup.position.y = 1.86 + bobY;
  if (parts.hat) parts.hat.position.y = 1.86 + bobY;
  parts.head.position.y = 1.86 + bobY;
  parts.torso.position.y = 1.34 + bobY;
  // capa esvoaçante
  if (parts.cape) {
    const mv = moving ? 1 : 0.4;
    parts.cape.rotation.x = 0.16 + Math.sin(tMs / 140) * 0.09 * mv + (moving ? 0.28 : 0);
  }
}
