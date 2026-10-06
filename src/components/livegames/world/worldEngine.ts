// ============================================================
// BATEU WORLD — Motor 3D em tempo real (estilo Hordes.io) · v4
// Three.js: mundo aberto low-poly, combate em tempo real,
// multiplayer via Supabase Realtime (broadcast + presence),
// PvP com roubo de cupões/pontos, poderes por classe,
// partículas, descobertas, missões, bancos e natureza viva.
// v4: PÓS-PROCESSAMENTO cinematográfico (bloom/vinheta/ACES),
// qualidade adaptativa, loot com raridades, pet companheiro,
// ARENA DAS ONDAS (sobrevivência), combo de mortes, estrelas
// cadentes, paleta de pôr-do-sol e modo foto.
// ============================================================

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { supabase } from "@/integrations/supabase/client";
import { worldAudio } from "./worldAudio";

export interface EngineStats {
  atk: number;
  maxHp: number;
  spd: number;
}

export interface EngineOpts {
  name: string;
  classId: number;
  level: number;
  uid: string;
  stats: EngineStats;
  onEvent: (ev: { type: string; [k: string]: any }) => void;
}

// ── Loot: raridades e geração de itens ──────────────────────
export interface LootItem {
  id: string;
  slot: "arma" | "armadura" | "amuleto";
  name: string;
  emoji: string;
  rarity: 0 | 1 | 2 | 3; // 0 Comum · 1 Raro · 2 Épico · 3 Lendário
  atk: number;
  hp: number;
  spd: number;
}

export const RARITY_META = [
  { name: "Comum", color: "#9ca3af", glow: 0x9ca3af },
  { name: "Raro", color: "#38bdf8", glow: 0x38bdf8 },
  { name: "Épico", color: "#a855f7", glow: 0xa855f7 },
  { name: "Lendário", color: "#fbbf24", glow: 0xfbbf24 },
];

const LOOT_PREFIX = [
  ["Gasto", "Simples", "Comum", "Desgastado"],
  ["Afiado", "Enferrujada"],
  ["Épico", "Arcano"],
  ["Lendário", "Divino", "Mítico"],
];
const LOOT_BASE: Record<LootItem["slot"], string[]> = {
  arma: ["Lâmina", "Machado", "Cajado", "Arco", "Punhal", "Martelo"],
  armadura: ["Peitoral", "Manto", "Couraça", "Capa", "Elmo"],
  amuleto: ["Talismã", "Anel", "Colar", "Gema", "Totem"],
};
const LOOT_EMOJI: Record<LootItem["slot"], string[]> = {
  arma: ["🗡️", "🪓", "🪄", "🏹", "🔨"],
  armadura: ["🛡️", "🥋", "🪖"],
  amuleto: ["💎", "💍", "📿", "🔷"],
};

export function rollLoot(tier: number, isBoss: boolean, isGuard: boolean, level: number): LootItem | null {
  const chance = isBoss ? 1 : isGuard ? 0.4 : [0.09, 0.11, 0.13, 0.15, 0.18][tier] ?? 0.1;
  if (Math.random() > chance) return null;
  // raridade pesada pelo tier
  const roll = Math.random() + tier * 0.08 + (isBoss ? 0.3 : 0) + (isGuard ? 0.12 : 0);
  const rarity: LootItem["rarity"] = roll > 1.05 ? 3 : roll > 0.82 ? 2 : roll > 0.5 ? 1 : 0;
  const slots: LootItem["slot"][] = ["arma", "armadura", "amuleto"];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const bases = LOOT_BASE[slot];
  const emojis = LOOT_EMOJI[slot];
  const base = bases[Math.floor(Math.random() * bases.length)];
  const pool = LOOT_PREFIX[rarity];
  const prefix = pool[Math.floor(Math.random() * pool.length)];
  const mult = 1 + level * 0.12 + rarity * 0.55 + (isBoss ? 0.4 : 0);
  const stat = (base3: number) => Math.max(1, Math.round(base3 * mult * (0.75 + Math.random() * 0.5)));
  return {
    id: "lt_" + Math.random().toString(36).slice(2, 9),
    slot,
    name: `${prefix} ${base}`, // raro usa "de" quando soa melhor
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    rarity,
    atk: slot === "arma" ? stat(3) : rarity >= 2 ? stat(1) : 0,
    hp: slot === "armadura" ? stat(9) : rarity >= 2 ? stat(4) : 0,
    spd: slot === "amuleto" ? stat(0.6) : 0,
  };
}

export interface SkillDef {
  name: string;
  emoji: string;
  lvl: number;
  cd: number;
  desc: string;
}

// ── Poderes por classe (slot 0/1/2 desbloqueiam a Nv3/7/12) ──
export const SKILLS: SkillDef[][] = [
  // Guerreiro
  [
    { name: "Golpe Devastador", emoji: "💥", lvl: 3, cd: 8, desc: "Golpeia todos os inimigos próximos (2.2x)" },
    { name: "Grito de Guerra", emoji: "📢", lvl: 7, cd: 18, desc: "+50% de ataque durante 8s" },
    { name: "Terremoto", emoji: "🌋", lvl: 12, cd: 25, desc: "3.2x em área + atordoa os inimigos" },
  ],
  // Mago
  [
    { name: "Explosão Arcana", emoji: "✨", lvl: 3, cd: 8, desc: "Explosão mágica em área (2.4x)" },
    { name: "Nova de Gelo", emoji: "❄️", lvl: 7, cd: 16, desc: "Congela e fere inimigos à volta" },
    { name: "Meteoro", emoji: "☄️", lvl: 12, cd: 26, desc: "Chama um meteoro: 4x de dano massivo" },
  ],
  // Arqueiro
  [
    { name: "Chuva de Flechas", emoji: "🌧️", lvl: 3, cd: 9, desc: "5 flechas rápidas nos inimigos próximos" },
    { name: "Passo Sombrio", emoji: "💨", lvl: 7, cd: 14, desc: "Avanço instantâneo + esquiva breve" },
    { name: "Tiro Certeiro", emoji: "🎯", lvl: 12, cd: 20, desc: "Flecha perfurante devastadora (3.5x)" },
  ],
  // Curandeiro
  [
    { name: "Onda Vital", emoji: "💚", lvl: 3, cd: 8, desc: "Cura 30% da vida + fere inimigos" },
    { name: "Círculo de Cura", emoji: "🌀", lvl: 7, cd: 20, desc: "Regeneração forte durante 10s" },
    { name: "Ira da Natureza", emoji: "🌿", lvl: 12, cd: 24, desc: "2.8x em área + cura 15% da vida" },
  ],
];

// ── Descobertas do mundo ─────────────────────────────────────
export const LANDMARKS: { id: string; name: string; x: number; z: number; r: number; emoji: string }[] = [
  { id: "obelisco", name: "Obelisco da Praça", x: 0, z: 0, r: 12, emoji: "🗿" },
  { id: "templo", name: "Templo dos Sorteios", x: 0, z: -52, r: 13, emoji: "🎁" },
  { id: "feira", name: "Feira Bateu", x: 52, z: 0, r: 13, emoji: "🛒" },
  { id: "torre", name: "Torre dos Concursos", x: -52, z: 0, r: 13, emoji: "🏆" },
  { id: "cofre", name: "Cofre de Cupões", x: 0, z: 52, r: 13, emoji: "🎟️" },
  { id: "banco", name: "Banco de Pontos", x: -14, z: -14, r: 8, emoji: "🏦" },
  { id: "fonte", name: "Fonte da Vida", x: 14, z: -14, r: 7, emoji: "⛲" },
  { id: "ruinas", name: "Ruínas Antigas", x: -100, z: -60, r: 10, emoji: "🏛️" },
  { id: "lago", name: "Lago Misterioso", x: 95, z: 70, r: 11, emoji: "🌊" },
  { id: "caverna", name: "Caverna de Cristais", x: -90, z: 85, r: 10, emoji: "💎" },
  { id: "baoba", name: "Baobá Gigante", x: 60, z: -100, r: 10, emoji: "🌳" },
  { id: "arena", name: "Arena das Ondas", x: 112, z: 0, r: 13, emoji: "🏟️" },
];

export const ARENA_CENTER = new THREE.Vector3(112, 0, 0);
export const ARENA_RADIUS = 26;

export const PVP_SAFE_RADIUS = 21;
const PVP_MIN_LEVEL = 3;
const PVP_SHIELD_MS = 180000; // 3 min após ser roubado

interface Mob {
  group: THREE.Group;
  hpBar: THREE.Sprite;
  hpCanvas: HTMLCanvasElement;
  hpTex: THREE.CanvasTexture;
  tier: number;
  hp: number;
  maxHp: number;
  atk: number;
  xp: number;
  gold: number;
  pts: number;
  speed: number;
  home: THREE.Vector3;
  target: THREE.Vector3;
  state: "idle" | "chase" | "return" | "dead";
  nextThink: number;
  atkCd: number;
  respawnAt: number;
  hitFlash: number;
  bob: number;
  isBoss: boolean;
  isGuard: boolean;
  stunUntil: number;
  slowUntil: number;
  name: string;
  arena?: boolean;
}

interface RemotePlayer {
  group: THREE.Group;
  hpBar: THREE.Sprite;
  hpCanvas: HTMLCanvasElement;
  hpTex: THREE.CanvasTexture;
  target: THREE.Vector3;
  targetRy: number;
  moving: boolean;
  lastSeen: number;
  name: string;
  hp: number;
  maxHp: number;
  shield: boolean;
}

interface Projectile {
  mesh: THREE.Mesh;
  target: Mob | null;
  speed: number;
  dmg: number;
  life: number;
  kind: "orb" | "arrow";
  trailColor: number | null;
}

interface Orb {
  mesh: THREE.Mesh;
  t: number;
  gold: number;
  xp: number;
  mult: number;
  from: THREE.Vector3;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  t: number;
  life: number;
  gravity: number;
  size: number;
}

interface FloatText {
  sprite: THREE.Sprite;
  t: number;
  life: number;
}

interface Interactable {
  group: THREE.Group;
  kind: "raffle" | "contest" | "voucher" | "asset" | "games" | "bank" | "fountain" | "arena";
  id: string;
  label: string;
  pos: THREE.Vector3;
  used: boolean;
  lid?: THREE.Mesh;
  icon?: THREE.Sprite;
}

// v4 — loot no chão
interface GroundLoot {
  group: THREE.Group;
  item: LootItem;
  t: number;
}

// v4 — estado da Arena das Ondas
interface ArenaState {
  active: boolean;
  wave: number;
  alive: number;
  kills: number;
  pts: number;
  gold: number;
  xp: number;
  nextWaveAt: number;
  cooldown: boolean;
}

// ── Balanceamento v2: 5 tiers + guardiões + 2 chefes ─────────
const MOB_TIERS = [
  { hp: 40, atk: 6, xp: 14, gold: 10, pts: 1, speed: 2.2, color: 0x4ade80, name: "Bug Verde", scale: 1 },
  { hp: 95, atk: 12, xp: 34, gold: 24, pts: 2, speed: 2.8, color: 0xf97316, name: "Bug Laranja", scale: 1.25 },
  { hp: 190, atk: 20, xp: 75, gold: 55, pts: 4, speed: 3.3, color: 0xa855f7, name: "Bug Sombrio", scale: 1.5 },
  { hp: 340, atk: 30, xp: 140, gold: 100, pts: 7, speed: 3.6, color: 0x38bdf8, name: "Bug Gélido", scale: 1.7 },
  { hp: 520, atk: 42, xp: 240, gold: 180, pts: 10, speed: 3.9, color: 0xf43f5e, name: "Bug Infernal", scale: 1.9 },
];

const CLASS_COLORS = [0xef4444, 0x8b5cf6, 0x22c55e, 0x06b6d4];
const WORLD_RADIUS = 148;
const DAY_LEN = 240000; // ms

function groundY(x: number, z: number): number {
  const base =
    1.5 * Math.sin(x * 0.045) * Math.cos(z * 0.038) +
    0.7 * Math.sin(x * 0.11 + 2) * Math.sin(z * 0.09 + 1) +
    0.4 * Math.sin((x + z) * 0.02);
  // Zonas planas: praça + POIs + marcos + arena
  const pois: [number, number][] = [[0, 0], [0, -52], [52, 0], [-52, 0], [0, 52],
    [-100, -60], [95, 70], [-90, 85], [60, -100], [-14, -14], [14, -14], [112, 0]];
  let f = 1;
  for (const [px, pz] of pois) {
    const d = Math.hypot(x - px, z - pz);
    if (d < 16) { f = 0; break; }
    if (d < 28) f = Math.min(f, (d - 16) / 12);
  }
  if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) f = Math.min(f, 0.15);
  return base * Math.max(0, f);
}

function smooth01(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makeTextSprite(text: string, opts: { size?: number; color?: string; bg?: boolean; accent?: string } = {}): THREE.Sprite {
  const size = opts.size ?? 30;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  if (opts.bg) {
    ctx.fillStyle = "rgba(8,10,18,0.82)";
    const r = 24;
    ctx.beginPath();
    ctx.moveTo(r, 8); ctx.lineTo(512 - r, 8); ctx.quadraticCurveTo(512 - 8, 8, 512 - 8, 8 + r);
    ctx.lineTo(512 - 8, 128 - r); ctx.quadraticCurveTo(512 - 8, 120, 512 - r, 120);
    ctx.lineTo(r, 120); ctx.quadraticCurveTo(8, 120, 8, 120 - r);
    ctx.lineTo(8, 8 + r); ctx.quadraticCurveTo(8, 8, r, 8);
    ctx.fill();
    if (opts.accent) { ctx.strokeStyle = opts.accent; ctx.lineWidth = 5; ctx.stroke(); }
  }
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(text, 256, 64);
  ctx.fillStyle = opts.color || "#ffffff";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  return spr;
}

function makeIconSprite(emoji: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "92px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
}

export class WorldEngine {
  private canvas: HTMLCanvasElement;
  private opts: EngineOpts;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;

  private player!: THREE.Group;
  private playerShadow!: THREE.Mesh;
  private pos = new THREE.Vector3(0, 0, 6);
  private vy = 0;
  private onGround = true;
  private moveDirFace = new THREE.Vector3(0, 0, -1);
  private camYaw = 0;
  private camDist = 12;
  private camPos = new THREE.Vector3(0, 8, 18);

  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private dragId: number | null = null;
  private dragStart = { x: 0, y: 0, t: 0, moved: 0 };
  private dragging = false;

  private mobs: Mob[] = [];
  private projectiles: Projectile[] = [];
  private orbs: Orb[] = [];
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private interactables: Interactable[] = [];
  private remotes = new Map<string, RemotePlayer>();
  private chan: any = null;
  private posTimer: any = null;
  private remoteGroup!: THREE.Group;

  private atkCd = 0;
  private skillCds = [0, 0, 0];
  private lastHitAt = 0;
  private hp: number;
  private invulnUntil = 0;
  private dead = false;
  private near: Interactable | null = null;
  private bob = 0;
  private raf = 0;
  private lastT = 0;
  private disposed = false;
  private resizeObs!: ResizeObserver;
  private myId: string;

  // Buffs / poderes
  private atkBuffUntil = 0;
  private hotUntil = 0;
  private hotTick = 0;
  private dashUntil = 0;
  private pvpShieldUntil = 0;
  private lastPvpHpSent = 0;
  private dustTimer = 0;

  // PvP
  private shakeAmp = 0;

  // Descobertas
  private discovered = new Set<string>();
  private discoverCheckT = 0;

  // Vaga-lumes noturnos
  private fireflies: { spr: THREE.Sprite; a: number; r: number; s: number; y0: number }[] = [];

  // v3 — céu, clima e vida do mundo
  private skyDome!: THREE.Mesh;
  private stars!: THREE.Points;
  private sunSpr!: THREE.Sprite;
  private moonSpr!: THREE.Sprite;
  private clouds: { g: THREE.Group; spd: number }[] = [];
  private butterflies: { spr: THREE.Sprite; a: number; r: number; s: number; y0: number }[] = [];
  private lakeWater: THREE.Mesh | null = null;
  private rippleT = 0;
  private fountainT = 0;

  // v3 — herói (arma/capa/aura)
  private weaponPivot: THREE.Group | null = null;
  private capeMesh: THREE.Mesh | null = null;
  private swingT = 0;             // 0..1 animação de golpe
  private landSquash = 0;
  private classAura!: THREE.PointLight;

  // v3 — chefe ativo para a barra do HUD
  private bossAuraLights: THREE.PointLight[] = [];

  // v3 — emote ativo
  private emoteSprite: THREE.Sprite | null = null;
  private emoteUntil = 0;

  // ── v4: pós-processamento e qualidade ──
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private quality: "auto" | "low" | "medium" | "high" = "auto";
  private pq = { bloom: true, vignette: true, pixelRatio: 1.5 };

  // ── v4: loot, pet, arena, combo ──
  private groundLoot: GroundLoot[] = [];
  private pet: THREE.Group | null = null;
  private petT = 0;
  private hasPet = false;
  private arena: ArenaState = { active: false, wave: 0, alive: 0, kills: 0, pts: 0, gold: 0, xp: 0, nextWaveAt: 0, cooldown: false };
  private arenaRing: THREE.Mesh | null = null;
  private combo = 0;
  private comboUntil = 0;
  private shootStars: { spr: THREE.Sprite; active: boolean; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; next: number }[] = [];

  // geometrias partilhadas
  private geoBody!: THREE.CapsuleGeometry;
  private geoHead!: THREE.SphereGeometry;
  private geoOrb!: THREE.SphereGeometry;
  private geoShadow!: THREE.CircleGeometry;
  private geoPart!: THREE.SphereGeometry;
  private matShadow!: THREE.MeshBasicMaterial;

  constructor(canvas: HTMLCanvasElement, opts: EngineOpts) {
    this.canvas = canvas;
    this.opts = opts;
    this.hp = opts.stats.maxHp;
    this.myId = opts.uid;
    this.init();
  }

  // ── INIT ────────────────────────────────────────────────────

  private init(): void {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isTouch,
      powerPreference: "high-performance",
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x9bd0e8, 0.0075);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3d6b35, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
    this.sun.position.set(40, 60, 20);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    this.buildTerrain();
    this.buildSky();
    this.buildShared();
    this.buildPlaza();
    this.buildPOIs();
    this.buildLandmarks();
    this.buildArena();
    this.buildNature();
    this.buildPlayer();
    this.buildMobs();
    this.buildNet();
    worldAudio.startAmbient();
    worldAudio.startMusic();

    this.setupPostFx(isTouch);
    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvas.parentElement || this.canvas);
    this.resize();

    this.lastT = performance.now();
    this.loop(this.lastT);
    this.opts.onEvent({ type: "ready" });
  }

  // ── v4: pipeline de pós-processamento + qualidade ──────

  private setupPostFx(isTouch: boolean): void {
    try {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      const size = new THREE.Vector2();
      this.renderer.getSize(size);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(size, 0.42, 0.6, 0.82);
      this.composer.addPass(this.bloomPass);
      // vinheta + saturação suave (film look)
      this.vignettePass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          offset: { value: 1.12 },
          darkness: { value: 0.62 },
          saturation: { value: 1.07 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; uniform float saturation;
          varying vec2 vUv;
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            float d = distance(vUv, vec2(0.5));
            c.rgb *= 1.0 - smoothstep(0.35, 0.85, d * offset) * darkness;
            float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
            c.rgb = mix(vec3(l), c.rgb, saturation);
            gl_FragColor = c;
          }`,
      });
      this.composer.addPass(this.vignettePass);
      this.composer.addPass(new OutputPass());
      this.applyQuality(this.quality, isTouch);
    } catch (e) {
      console.warn("[BateuWorld] pós-processamento indisponível:", e);
      this.composer = null;
    }
  }

  /** Aplica um nível de qualidade (auto decide pelo dispositivo). */
  setQuality(q: "auto" | "low" | "medium" | "high"): void {
    this.applyQuality(q, window.matchMedia("(pointer: coarse)").matches);
  }

  private applyQuality(q: "auto" | "low" | "medium" | "high", isTouch: boolean): void {
    this.quality = q;
    const autoTier: "low" | "medium" | "high" = isTouch ? (window.devicePixelRatio > 2 ? "medium" : "high") : "high";
    const tier = q === "auto" ? autoTier : q;
    if (tier === "low") this.pq = { bloom: false, vignette: false, pixelRatio: 1 };
    else if (tier === "medium") this.pq = { bloom: true, vignette: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25) };
    else this.pq = { bloom: true, vignette: true, pixelRatio: Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2) };
    this.renderer.setPixelRatio(this.pq.pixelRatio);
    if (this.bloomPass) this.bloomPass.enabled = this.pq.bloom;
    if (this.vignettePass) this.vignettePass.enabled = this.pq.vignette;
    if (this.composer) this.composer.setSize(this.canvas.parentElement?.clientWidth || window.innerWidth, this.canvas.parentElement?.clientHeight || window.innerHeight);
  }

  /** Fotografia do mundo (modo foto) — devolve dataURL PNG. */
  snapshot(): string {
    this.renderFrame();
    try { return this.renderer.domElement.toDataURL("image/png"); } catch { return ""; }
  }

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(340, 340, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(posAttr.count * 3);
    const cGrass1 = new THREE.Color(0x2f7a33);
    const cGrass2 = new THREE.Color(0x5cb85c);
    const cDirt = new THREE.Color(0x8a6a3d);
    const cStone = new THREE.Color(0x9aa0a6);
    const c = new THREE.Color();
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = groundY(x, z);
      posAttr.setY(i, y);
      const dCenter = Math.hypot(x, z);
      if (dCenter < 17) c.copy(cStone);
      else if (Math.abs(x) < 3.5 || Math.abs(z) < 3.5) c.copy(cDirt);
      else c.copy(cGrass1).lerp(cGrass2, smooth01((y + 1.5) / 3.5 + 0.5 * Math.abs(Math.sin(x * 0.9) * Math.cos(z * 0.7))));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
  }

  // ── Céu v3: domo de gradiente, sol, lua, estrelas e nuvens ──

  private buildSky(): void {
    // Domo com gradiente vertical (azul zenite → horizonte claro)
    const domeGeo = new THREE.SphereGeometry(320, 20, 14);
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x2f7fd4) },
        mid: { value: new THREE.Color(0x9bd0e8) },
        bot: { value: new THREE.Color(0xdceef7) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          if (h > 0.25) gl_FragColor = vec4(mix(mid, top, smoothstep(0.25, 0.85, h)), 1.0);
          else gl_FragColor = vec4(mix(bot, mid, smoothstep(-0.1, 0.25, h)), 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(domeGeo, domeMat);
    this.scene.add(this.skyDome);

    // Estrelas (visíveis à noite)
    const starGeo = new THREE.BufferGeometry();
    const sN = 420;
    const sPos = new Float32Array(sN * 3);
    for (let i = 0; i < sN; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = 0.15 + Math.random() * 1.35; // elevação
      const rr = 300;
      sPos[i * 3] = Math.cos(a) * Math.cos(e) * rr;
      sPos[i * 3 + 1] = Math.sin(e) * rr;
      sPos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * rr;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false,
    }));
    this.scene.add(this.stars);

    // Sol e lua (sprites com halo)
    const mkGlow = (inner: string, outer: string) => {
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 128;
      const c = cv.getContext("2d")!;
      const g = c.createRadialGradient(64, 64, 6, 64, 64, 62);
      g.addColorStop(0, inner);
      g.addColorStop(0.45, inner);
      g.addColorStop(1, outer);
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    };
    this.sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mkGlow("rgba(255,244,214,1)", "rgba(255,214,120,0)"), transparent: true, depthWrite: false, fog: false,
    }));
    this.sunSpr.scale.setScalar(34);
    this.scene.add(this.sunSpr);
    this.moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mkGlow("rgba(226,236,255,1)", "rgba(160,190,255,0)"), transparent: true, depthWrite: false, fog: false, opacity: 0,
    }));
    this.moonSpr.scale.setScalar(26);
    this.scene.add(this.moonSpr);

    // Nuvens low-poly a derivar
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 3.4, 7, 6), cloudMat);
        m.position.set(p * 3.4 - puffs * 1.4, Math.random() * 1.2, Math.random() * 2.4 - 1.2);
        m.scale.y = 0.55;
        g.add(m);
      }
      const a = Math.random() * Math.PI * 2;
      const rr = 60 + Math.random() * 150;
      g.position.set(Math.cos(a) * rr, 42 + Math.random() * 22, Math.sin(a) * rr);
      this.scene.add(g);
      this.clouds.push({ g, spd: 0.4 + Math.random() * 0.7 });
    }

    // v4: estrelas cadentes (faíscas brancas que riscam o céu à noite)
    const ssCanvas = document.createElement("canvas");
    ssCanvas.width = 64; ssCanvas.height = 16;
    const sctx = ssCanvas.getContext("2d")!;
    const sg = sctx.createLinearGradient(0, 0, 64, 0);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.75, "rgba(255,255,255,0.9)");
    sg.addColorStop(1, "rgba(190,220,255,1)");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 6, 64, 4);
    const ssTex = new THREE.CanvasTexture(ssCanvas);
    for (let i = 0; i < 3; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ssTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      spr.scale.set(9, 2.2, 1);
      this.scene.add(spr);
      this.shootStars.push({ spr, active: false, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), next: 2500 + Math.random() * 8000 });
    }
  }

  private buildShared(): void {
    this.geoBody = new THREE.CapsuleGeometry(0.38, 0.75, 4, 10);
    this.geoHead = new THREE.SphereGeometry(0.3, 12, 10);
    this.geoOrb = new THREE.SphereGeometry(0.16, 8, 8);
    this.geoShadow = new THREE.CircleGeometry(0.55, 16);
    this.geoShadow.rotateX(-Math.PI / 2);
    this.geoPart = new THREE.SphereGeometry(0.09, 6, 6);
    this.matShadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  }

  private addShadow(x: number, y: number, z: number, scale = 1): THREE.Mesh {
    const m = new THREE.Mesh(this.geoShadow, this.matShadow);
    m.position.set(x, y + 0.03, z);
    m.scale.setScalar(scale);
    this.scene.add(m);
    return m;
  }

  private buildPlaza(): void {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 17, 0.5, 40),
      new THREE.MeshLambertMaterial({ color: 0x8d939c })
    );
    stone.position.set(0, 0.25, 0);
    this.scene.add(stone);

    // Obelisco Bateu
    const ob = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 14, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    ob.position.set(0, 7.5, 0);
    this.scene.add(ob);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.4, 2.4),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    band.position.set(0, 11.5, 0);
    this.scene.add(band);
    const glow = new THREE.PointLight(0xf43f5e, 60, 30);
    glow.position.set(0, 12, 0);
    this.scene.add(glow);

    // Portal dos Jogos
    const portal = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.35, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring.position.y = 2.6;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    disc.position.y = 2.6;
    const pLabel = makeTextSprite("🌀 JOGOS BATEU", { size: 34, bg: true, accent: "#38bdf8" });
    pLabel.scale.set(5.4, 1.35, 1);
    pLabel.position.y = 5.6;
    const pIcon = makeIconSprite("🌀");
    pIcon.scale.set(1.5, 1.5, 1);
    pIcon.position.y = 2.6;
    portal.add(ring, disc, pLabel, pIcon);
    portal.position.set(8, 0, 8);
    this.scene.add(portal);
    this.interactables.push({
      group: portal, kind: "games", id: "games", label: "Abrir Jogos da Plataforma",
      pos: portal.position.clone(), used: false, icon: pIcon,
    });

    // 🏦 Banco de Pontos — troca pontos por moeda da plataforma
    const bank = new THREE.Group();
    const bBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.6, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xcaa64a })
    );
    bBase.position.y = 1.3;
    const bRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(2.9, 2.9, 0.55, 12, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x8a6d2f })
    );
    bRoof.position.y = 2.85;
    bRoof.rotation.z = Math.PI / 2;
    const colGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.5, 8);
    const colMat = new THREE.MeshLambertMaterial({ color: 0xf3e2ab });
    for (const cx of [-1.8, -0.6, 0.6, 1.8]) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx, 1.25, 1.55);
      bank.add(col);
    }
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    coin.rotation.x = Math.PI / 2;
    coin.position.set(0, 2.1, 1.75);
    const bIcon = makeIconSprite("🏦");
    bIcon.scale.set(1.4, 1.4, 1);
    bIcon.position.y = 3.9;
    const bLab = makeTextSprite("BANCO DE PONTOS", { size: 28, bg: true, accent: "#fbbf24" });
    bLab.scale.set(5, 1.25, 1);
    bLab.position.y = 5.1;
    bank.add(bBase, bRoof, coin, bIcon, bLab);
    bank.position.set(-14, 0, -14);
    bank.rotation.y = Math.PI / 4;
    this.scene.add(bank);
    this.interactables.push({
      group: bank, kind: "bank", id: "bank", label: "🏦 Trocar Pontos no Banco",
      pos: bank.position.clone(), used: false, icon: bIcon,
    });

    // ⛲ Fonte da Vida — cura quem se aproxima
    const ftn = new THREE.Group();
    const fBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2.3, 0.7, 18),
      new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
    );
    fBase.position.y = 0.35;
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.25, 18),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.75 })
    );
    water.position.y = 0.78;
    const fTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 1.5, 10),
      new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
    );
    fTop.position.y = 1.4;
    const fOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x6ee7b7 })
    );
    fOrb.position.y = 2.4;
    const fIcon = makeIconSprite("⛲");
    fIcon.scale.set(1.3, 1.3, 1);
    fIcon.position.y = 3.6;
    const fLab = makeTextSprite("FONTE DA VIDA", { size: 26, bg: true, accent: "#34d399" });
    fLab.scale.set(4.2, 1.05, 1);
    fLab.position.y = 4.7;
    ftn.add(fBase, water, fTop, fOrb, fIcon, fLab);
    ftn.position.set(14, 0, -14);
    this.scene.add(ftn);
    this.interactables.push({
      group: ftn, kind: "fountain", id: "fountain", label: "⛲ Beber da Fonte (cura total)",
      pos: ftn.position.clone(), used: false, icon: fIcon,
    });
  }

  private buildPOIs(): void {
    this.buildTemple();   // Norte — Sorteios
    this.buildMarket();   // Este — Feira (Alienação)
    this.buildTower();    // Oeste — Concursos
    this.buildVault();    // Sul — Cupões
  }

  private poiBase(x: number, z: number, floorColor: number): void {
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 13.5, 0.4, 28),
      new THREE.MeshLambertMaterial({ color: floorColor })
    );
    floor.position.set(x, groundY(x, z) + 0.2, z);
    this.scene.add(floor);
  }

  private buildTemple(): void {
    this.poiBase(0, -52, 0x7c6bae);
    const label = makeTextSprite("🎁 TEMPLO DOS SORTEIOS", { size: 40, bg: true, accent: "#a78bfa" });
    label.scale.set(15, 3.75, 1);
    label.position.set(0, groundY(0, -52) + 9, -60);
    this.scene.add(label);
  }

  private buildMarket(): void {
    this.poiBase(52, 0, 0xb08968);
    const label = makeTextSprite("🛒 FEIRA BATEU", { size: 40, bg: true, accent: "#fbbf24" });
    label.scale.set(11, 2.75, 1);
    label.position.set(60, groundY(52, 0) + 8, 0);
    this.scene.add(label);
  }

  private buildTower(): void {
    this.poiBase(-52, 0, 0x4d7c8a);
    const label = makeTextSprite("🏆 TORRE DOS CONCURSOS", { size: 38, bg: true, accent: "#f59e0b" });
    label.scale.set(16, 4, 1);
    label.position.set(-60, groundY(-52, 0) + 8.5, 0);
    this.scene.add(label);
  }

  private buildVault(): void {
    this.poiBase(0, 52, 0x8a5a5a);
    const label = makeTextSprite("🎟️ COFRE DE CUPÕES", { size: 40, bg: true, accent: "#f87171" });
    label.scale.set(13, 3.25, 1);
    label.position.set(0, groundY(0, 52) + 8, 60);
    this.scene.add(label);
  }

  // ── Marcos exploráveis (descobertas) ────────────────────────

  private buildLandmarks(): void {
    // Ruínas Antigas (SO)
    const ruins = new THREE.Group();
    const ruinMat = new THREE.MeshLambertMaterial({ color: 0x9c9484 });
    const cols = [new THREE.CylinderGeometry(0.7, 0.8, 6, 8), new THREE.CylinderGeometry(0.7, 0.8, 3.4, 8), new THREE.CylinderGeometry(0.7, 0.8, 4.6, 8)];
    const colPos: [number, number, number][] = [[-3, 3, 0], [0, 1.7, -2], [3, 2.3, 1]];
    cols.forEach((cg, i) => {
      const m = new THREE.Mesh(cg, ruinMat);
      m.position.set(...colPos[i]);
      m.rotation.z = (i - 1) * 0.12;
      ruins.add(m);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.8, 1.4), ruinMat);
    lintel.position.set(0, 6.4, 0);
    lintel.rotation.z = -0.08;
    ruins.add(lintel);
    const rIcon = makeIconSprite("🏛️");
    rIcon.scale.set(1.6, 1.6, 1);
    rIcon.position.y = 8.2;
    ruins.add(rIcon);
    ruins.position.set(-100, 0, -60);
    this.scene.add(ruins);

    // Lago Misterioso (NE) — água animada v3
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(9, 26),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.7 })
    );
    lake.rotateX(-Math.PI / 2);
    lake.position.set(95, groundY(95, 70) + 0.12, 70);
    this.scene.add(lake);
    this.lakeWater = lake;
    const lIcon = makeIconSprite("🌊");
    lIcon.scale.set(1.6, 1.6, 1);
    lIcon.position.set(95, groundY(95, 70) + 3.4, 70);
    this.scene.add(lIcon);
    const lLight = new THREE.PointLight(0x22d3ee, 30, 24);
    lLight.position.set(95, 3, 70);
    this.scene.add(lLight);

    // Caverna de Cristais (NO)
    const cave = new THREE.Group();
    const rockM = new THREE.MeshLambertMaterial({ color: 0x57534e });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), rockM);
    dome.position.y = 0.4;
    cave.add(dome);
    for (let i = 0; i < 7; i++) {
      const h = 1.2 + Math.random() * 2.6;
      const cr = new THREE.Mesh(
        new THREE.ConeGeometry(0.34 + Math.random() * 0.3, h, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8b5cf6 : 0x22d3ee, transparent: true, opacity: 0.85 })
      );
      const a = Math.random() * Math.PI * 2;
      const rr = 1 + Math.random() * 4;
      cr.position.set(Math.cos(a) * rr, h / 2 + 0.3, Math.sin(a) * rr);
      cave.add(cr);
    }
    const cIcon = makeIconSprite("💎");
    cIcon.scale.set(1.6, 1.6, 1);
    cIcon.position.y = 8;
    cave.add(cIcon);
    const cLight = new THREE.PointLight(0x8b5cf6, 40, 26);
    cLight.position.set(0, 3, 0);
    cave.add(cLight);
    cave.position.set(-90, 0, 85);
    this.scene.add(cave);

    // Baobá Gigante (SE)
    const baoba = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 9, 10),
      new THREE.MeshLambertMaterial({ color: 0x8d6748 })
    );
    trunk.position.y = 4.5;
    baoba.add(trunk);
    const crownM = new THREE.MeshLambertMaterial({ color: 0x65a30d });
    for (const [ox, oy, oz, s] of [[-2.4, 9.6, 0, 2.4], [2.4, 9.9, 0.6, 2.6], [0, 10.6, -2, 2.2], [0.4, 10.2, 2.2, 2.5]]) {
      const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), crownM);
      cl.position.set(ox, oy, oz);
      cl.scale.setScalar(s / 2.4);
      baoba.add(cl);
    }
    const bIcon2 = makeIconSprite("🌳");
    bIcon2.scale.set(1.7, 1.7, 1);
    bIcon2.position.y = 13.6;
    baoba.add(bIcon2);
    baoba.position.set(60, 0, -100);
    this.scene.add(baoba);
  }

  // ── v4: ARENA DAS ONDAS (sobrevivência) ───────────────────

  private buildArena(): void {
    const g = new THREE.Group();
    // piso de areia escura
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS + 1.5, 0.5, 36),
      new THREE.MeshLambertMaterial({ color: 0x8c6d4f })
    );
    floor.position.set(ARENA_CENTER.x, 0.25, ARENA_CENTER.z);
    g.add(floor);
    // anel de energia (fica pulsante quando o modo está ativo)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(ARENA_RADIUS - 1, 0.22, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.75 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ARENA_CENTER.x, 0.55, ARENA_CENTER.z);
    this.arenaRing = ring;
    g.add(ring);
    // pilares nas bordas
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = ARENA_CENTER.x + Math.cos(a) * (ARENA_RADIUS - 3);
      const pz = ARENA_CENTER.z + Math.sin(a) * (ARENA_RADIUS - 3);
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 5 + (i % 2) * 1.6, 8),
        new THREE.MeshLambertMaterial({ color: 0x57493c })
      );
      pil.position.set(px, 2.6, pz);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 0.9, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfb923c : 0xf43f5e })
      );
      flame.position.set(px, 5.6 + (i % 2) * 1.6, pz);
      g.add(pil, flame);
    }
    // portal de entrada
    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.3, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    portalRing.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 2.3, ARENA_CENTER.z);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 22),
      new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    disc.position.copy(portalRing.position);
    const aIcon = makeIconSprite("🏟️");
    aIcon.scale.set(1.5, 1.5, 1);
    aIcon.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 4.6, ARENA_CENTER.z);
    const aLab = makeTextSprite("ARENA DAS ONDAS", { size: 30, bg: true, accent: "#f87171" });
    aLab.scale.set(6, 1.5, 1);
    aLab.position.set(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 6.4, ARENA_CENTER.z);
    g.add(portalRing, disc, aIcon, aLab);
    // interactable do portal
    const portalPos = new THREE.Vector3(ARENA_CENTER.x - ARENA_RADIUS - 3.5, 0, ARENA_CENTER.z);
    this.interactables.push({
      group: new THREE.Group(), kind: "arena", id: "arena",
      label: "🏟️ Entrar na Arena das Ondas",
      pos: portalPos, used: false, icon: aIcon,
    });
    const light = new THREE.PointLight(0xf43f5e, 44, 30);
    light.position.set(ARENA_CENTER.x, 4, ARENA_CENTER.z);
    g.add(light);
    this.scene.add(g);
  }

  /** Inicia o modo sobrevivência na Arena das Ondas. */
  startArena(): void {
    if (this.arena.active) return;
    this.arena = { active: true, wave: 0, alive: 0, kills: 0, pts: 0, gold: 0, xp: 0, nextWaveAt: performance.now() + 1200, cooldown: false };
    this.pos.set(ARENA_CENTER.x - 6, 0, ARENA_CENTER.z);
    this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.5);
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    this.ringEffectAt(ARENA_CENTER.clone(), 0xf43f5e, 10);
    this.shake(0.3);
    worldAudio.play("wave");
    this.opts.onEvent({ type: "arena", action: "start" });
  }

  private endArena(reason: "death" | "exit" | "quit"): void {
    if (!this.arena.active) return;
    this.arena.active = false;
    // remove mobs da arena
    for (const m of this.mobs) {
      if (m.arena && m.state !== "dead") {
        m.state = "dead";
        m.respawnAt = Number.MAX_SAFE_INTEGER;
        m.group.visible = false;
      }
    }
    if (reason === "exit") {
      this.pos.set(0, 0, 6);
      this.opts.onEvent({ type: "notify", msg: "Saíste da arena — de volta à praça.", tone: "info" });
    }
    if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
    this.opts.onEvent({
      type: "arena", action: "end", reason,
      wave: this.arena.wave, kills: this.arena.kills,
      pts: this.arena.pts, gold: this.arena.gold, xp: this.arena.xp,
    });
  }

  getArena(): { active: boolean; wave: number; alive: number } {
    return { active: this.arena.active, wave: this.arena.wave, alive: this.arena.alive };
  }

  private arenaNextWave(): void {
    this.arena.wave += 1;
    const w = this.arena.wave;
    const count = Math.min(14, 3 + Math.floor(w * 1.4));
    const maxTier = Math.min(4, Math.floor(w / 2));
    const isBossWave = w % 5 === 0;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 8 + Math.random() * (ARENA_RADIUS - 12);
      const tier = Math.min(maxTier, Math.max(0, Math.floor(Math.random() * (maxTier + 1))));
      this.spawnMob(tier, ARENA_CENTER.x + Math.cos(a) * rr, ARENA_CENTER.z + Math.sin(a) * rr, false, false, true);
      spawned++;
    }
    if (isBossWave) {
      this.spawnMob(Math.min(4, 2 + Math.floor(w / 8)), ARENA_CENTER.x, ARENA_CENTER.z + 10, true, false, true);
      spawned++;
    }
    this.arena.alive = spawned;
    this.arena.cooldown = false;
    if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0xfb923c);
    worldAudio.play("wave");
    this.shake(0.18);
    this.ringEffectAt(ARENA_CENTER.clone(), 0xfb923c, 8);
    this.opts.onEvent({ type: "arena", action: "wave", wave: w, count: spawned, boss: isBossWave });
  }

  // ── Natureza ────────────────────────────────────────────────

  private buildNature(): void {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
    const leafGeo = new THREE.ConeGeometry(1.5, 3.4, 7);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d6a4f });
    const N = 150;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, N);
    const dummy = new THREE.Object3D();
    let placed = 0;
    let guard = 0;
    while (placed < N && guard++ < 900) {
      const a = Math.random() * Math.PI * 2;
      const r = 24 + Math.random() * 118;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 6 || Math.abs(z) < 6) continue;
      if (Math.hypot(x, z - 52) < 16 || Math.hypot(x - 52, z) < 16 || Math.hypot(x + 52, z) < 16) continue;
      if (Math.hypot(x + 100, z + 60) < 12 || Math.hypot(x - 95, z - 70) < 14 || Math.hypot(x + 90, z - 85) < 10 || Math.hypot(x - 60, z + 100) < 12) continue;
      if (Math.hypot(x - 112, z) < 30) continue; // v4: arena limpa de árvores
      const y = groundY(x, z);
      const s = 0.8 + Math.random() * 0.7;
      dummy.position.set(x, y + 1.1 * s, z);
      dummy.scale.setScalar(s);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.y = y + 3.4 * s;
      dummy.updateMatrix();
      leaves.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    this.scene.add(trunks, leaves);

    const rockGeo = new THREE.IcosahedronGeometry(0.9, 0);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x7d8590 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 60);
    let rp = 0;
    guard = 0;
    while (rp < 60 && guard++ < 600) {
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 110;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;
      dummy.position.set(x, groundY(x, z) + 0.3, z);
      dummy.scale.set(0.6 + Math.random() * 1.2, 0.5 + Math.random() * 0.8, 0.6 + Math.random() * 1.2);
      dummy.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      dummy.updateMatrix();
      rocks.setMatrixAt(rp, dummy.matrix);
      rp++;
    }
    rocks.count = rp;
    this.scene.add(rocks);

    const bushGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x40916c });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 50);
    let bp = 0;
    guard = 0;
    while (bp < 50 && guard++ < 500) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 130;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;
      dummy.position.set(x, groundY(x, z) + 0.22, z);
      dummy.scale.set(0.7 + Math.random() * 0.9, 0.5 + Math.random() * 0.5, 0.7 + Math.random() * 0.9);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(bp, dummy.matrix);
      bp++;
    }
    bushes.count = bp;
    this.scene.add(bushes);

    // ── v3: tufos de relva (3 lâminas cruzadas por tufo) ──
    const bladeGeo = new THREE.ConeGeometry(0.05, 0.55, 4);
    bladeGeo.translate(0, 0.27, 0);
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x3f9142 });
    const G = 420;
    const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, G * 3);
    let gi = 0;
    guard = 0;
    while (gi < G && guard++ < 2400) {
      const a = Math.random() * Math.PI * 2;
      const rr = 12 + Math.random() * 132;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      if (Math.abs(x) < 4.2 || Math.abs(z) < 4.2) continue;
      if (Math.hypot(x, z - 52) < 15 || Math.hypot(x - 52, z) < 15 || Math.hypot(x + 52, z) < 15 || Math.hypot(x, z - 95) < 11) continue;
      const y = groundY(x, z);
      for (let b = 0; b < 3; b++) {
        dummy.position.set(x + (Math.random() - 0.5) * 0.5, y, z + (Math.random() - 0.5) * 0.5);
        dummy.scale.setScalar(0.7 + Math.random() * 0.9);
        dummy.rotation.set((Math.random() - 0.5) * 0.3, (b / 3) * Math.PI + Math.random(), (Math.random() - 0.5) * 0.3);
        dummy.updateMatrix();
        if (gi * 3 + b < G * 3) grass.setMatrixAt(gi * 3 + b, dummy.matrix);
      }
      gi++;
    }
    grass.count = Math.min(G * 3, gi * 3);
    this.scene.add(grass);

    // ── v3: flores coloridas ──
    const flowerColors = [0xf472b6, 0xfbbf24, 0xf87171, 0xa78bfa, 0xffffff];
    const F = 150;
    const flowerGeo = new THREE.SphereGeometry(0.09, 5, 4);
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), F);
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x2d6a4f }), F);
    const fCol = new THREE.Color();
    let fi = 0;
    guard = 0;
    while (fi < F && guard++ < 1400) {
      const a = Math.random() * Math.PI * 2;
      const rr = 14 + Math.random() * 120;
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      if (Math.abs(x) < 4.5 || Math.abs(z) < 4.5) continue;
      const y = groundY(x, z);
      dummy.position.set(x, y + 0.15, z);
      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      stems.setMatrixAt(fi, dummy.matrix);
      dummy.position.y = y + 0.32;
      dummy.updateMatrix();
      flowers.setMatrixAt(fi, dummy.matrix);
      fCol.setHex(flowerColors[fi % flowerColors.length]);
      flowers.setColorAt(fi, fCol);
      fi++;
    }
    flowers.count = fi;
    stems.count = fi;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    this.scene.add(flowers, stems);

    // ── v3: borboletas de dia (como os vaga-lumes de noite) ──
    const bfCanvas = document.createElement("canvas");
    bfCanvas.width = 32; bfCanvas.height = 32;
    const bctx = bfCanvas.getContext("2d")!;
    const bGrd = bctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    bGrd.addColorStop(0, "rgba(255,183,230,1)");
    bGrd.addColorStop(1, "rgba(255,183,230,0)");
    bctx.fillStyle = bGrd;
    bctx.fillRect(0, 0, 32, 32);
    const bfTex = new THREE.CanvasTexture(bfCanvas);
    for (let i = 0; i < 22; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: bfTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2;
      const rr = 16 + Math.random() * 90;
      this.butterflies.push({
        spr, a, r: rr, s: 0.03 + Math.random() * 0.06,
        y0: groundY(Math.cos(a) * rr, Math.sin(a) * rr) + 1 + Math.random() * 1.6,
      });
      spr.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      spr.scale.setScalar(0.35 + Math.random() * 0.3);
      this.scene.add(spr);
    }

    // Vaga-lumes para as noites do mundo
    const ffCanvas = document.createElement("canvas");
    ffCanvas.width = 32; ffCanvas.height = 32;
    const fctx = ffCanvas.getContext("2d")!;
    const grd = fctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grd.addColorStop(0, "rgba(253,224,71,1)");
    grd.addColorStop(1, "rgba(253,224,71,0)");
    fctx.fillStyle = grd;
    fctx.fillRect(0, 0, 32, 32);
    const ffTex = new THREE.CanvasTexture(ffCanvas);
    for (let i = 0; i < 36; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: ffTex, transparent: true, depthWrite: false, opacity: 0 }));
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * 110;
      this.fireflies.push({
        spr, a, r, s: 0.02 + Math.random() * 0.05,
        y0: groundY(Math.cos(a) * r, Math.sin(a) * r) + 0.8 + Math.random() * 2,
      });
      spr.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      spr.scale.setScalar(0.5 + Math.random() * 0.5);
      this.scene.add(spr);
    }
  }

  // ── Jogador ─────────────────────────────────────────────────

  private buildPlayer(): void {
    const g = new THREE.Group();
    const color = CLASS_COLORS[this.opts.classId] ?? 0xef4444;
    const body = new THREE.Mesh(this.geoBody, new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.05;
    body.name = "body";
    const head = new THREE.Mesh(this.geoHead, new THREE.MeshLambertMaterial({ color: 0xf5d0a9 }));
    head.position.y = 1.95;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.09, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x111827 })
    );
    visor.position.set(0, 2.0, 0.28);

    // ── v3: arma da classe (pivot no ombro direito) ──
    const pivot = new THREE.Group();
    pivot.position.set(0.42, 1.55, 0.1);
    const wMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
    const hMat = new THREE.MeshLambertMaterial({ color: 0x7c4a21 });
    const cls = this.opts.classId;
    if (cls === 0) {
      // Espada
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.03), wMat);
      blade.position.y = 0.55;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.06), new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
      guard.position.y = 0.12;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), hMat);
      grip.position.y = -0.02;
      pivot.add(blade, guard, grip);
    } else if (cls === 1) {
      // Cajado com orbe
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.15, 6), hMat);
      shaft.position.y = 0.5;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xa78bfa }));
      orb.position.y = 1.12;
      pivot.add(shaft, orb);
    } else if (cls === 2) {
      // Arco
      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.035, 6, 14, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
      );
      bow.rotation.z = -Math.PI / 2;
      bow.rotation.y = Math.PI / 2;
      pivot.add(bow);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xe5e7eb }));
      str.position.set(0, 0.02, 0);
      pivot.add(str);
    } else {
      // Tótém de cura
      const totem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 6), new THREE.MeshLambertMaterial({ color: 0x0d9488 }));
      totem.position.y = 0.35;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }));
      gem.position.y = 0.82;
      pivot.add(totem, gem);
    }
    // ombro esquerdo em espelho
    const pivotL = pivot.clone();
    pivotL.position.x = -0.42;
    pivotL.visible = cls === 2; // arqueiro segura o arco à esquerda
    if (cls === 2) { pivot.visible = false; }
    g.add(pivot, pivotL);
    this.weaponPivot = cls === 2 ? pivotL : pivot;
    if (cls === 2) this.weaponPivot.name = "weapon";

    // ── v3: capa que esvoaça ──
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.95, 1, 4),
      new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    cape.position.set(0, 1.35, -0.3);
    cape.rotation.x = 0.16;
    g.add(cape);
    this.capeMesh = cape;

    const nameSpr = makeTextSprite(`${this.opts.name} · Nv${this.opts.level}`, { size: 30, bg: true });
    nameSpr.scale.set(3.6, 0.9, 1);
    nameSpr.position.y = 2.9;
    nameSpr.name = "nameTag";
    g.add(body, head, visor, nameSpr);
    this.player = g;
    this.scene.add(g);
    this.playerShadow = this.addShadow(this.pos.x, 0, this.pos.z, 1.1);
    const pLight = new THREE.PointLight(color, 8, 8);
    pLight.position.y = 2.4;
    g.add(pLight);
    // anel de escudo PvP próprio (visível quando ativo)
    const myRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.06, 6, 22),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85 })
    );
    myRing.rotation.x = -Math.PI / 2;
    myRing.position.y = 0.25;
    myRing.visible = false;
    myRing.name = "myShield";
    g.add(myRing);
    this.classAura = pLight;
  }

  // ── v3: efeitos de progressão (level-up / descoberta) ───────

  levelFx(): void {
    // pilar de luz dourado + anel
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.0, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.copy(this.pos).add(new THREE.Vector3(0, 4.5, 0));
    this.scene.add(pillar);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(pillar); return; }
      const t = (performance.now() - t0) / 900;
      if (t >= 1) { this.scene.remove(pillar); return; }
      pillar.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
      (pillar.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
    this.ringEffect(0xfbbf24, 6);
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xfde047, 26, 4.5, 0.9, 0.11, 3);
    worldAudio.play("levelup");
  }

  discoverFx(): void {
    this.ringEffect(0x38bdf8, 6.5);
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), 0x38bdf8, 24, 4, 1, 0.1, 2);
  }

  // ── v3: emotes ───────────────────────────────────────────────

  emote(emoji: string): void {
    if (performance.now() < this.emoteUntil - 600) return;
    if (this.emoteSprite) {
      this.scene.remove(this.emoteSprite);
      this.emoteSprite = null;
    }
    const spr = makeIconSprite(emoji);
    spr.scale.set(1.5, 1.5, 1);
    spr.position.copy(this.pos).add(new THREE.Vector3(0, 3.6, 0));
    this.scene.add(spr);
    this.emoteSprite = spr;
    this.emoteUntil = performance.now() + 2200;
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), 0xfbbf24, 6, 1.6, 0.5, 0.07, 2);
    worldAudio.play("click");
    try {
      this.chan?.send({ type: "broadcast", event: "chat", payload: { n: this.opts.name, m: emoji, emote: true } });
    } catch { /* ignore */ }
  }

  // ── v3: barra de chefe para o HUD ────────────────────────────

  getBossBar(): { name: string; hp: number; maxHp: number; pct: number } | null {
    let best: Mob | null = null;
    let bestD = 26;
    for (const m of this.mobs) {
      if (m.state !== "chase" || (!m.isBoss && !m.isGuard)) continue;
      const d = Math.hypot(m.group.position.x - this.pos.x, m.group.position.z - this.pos.z);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best) return null;
    return { name: best.name, hp: best.hp, maxHp: best.maxHp, pct: Math.max(0, best.hp / best.maxHp) };
  }

  // ── v3: buffs ativos para o HUD ──────────────────────────────

  getBuffs(): { atk: number; hot: number } {
    const now = performance.now();
    return {
      atk: Math.max(0, this.atkBuffUntil - now),
      hot: Math.max(0, this.hotUntil - now),
    };
  }

  private buildMobs(): void {
    const defs: { tier: number; count: number; boss?: boolean; guard?: boolean; pos?: [number, number] }[] = [
      { tier: 0, count: 12 },
      { tier: 1, count: 9 },
      { tier: 2, count: 6 },
      { tier: 3, count: 4 },
      { tier: 4, count: 3 },
      { tier: 2, count: 1, boss: true, pos: [112, -112] },
      { tier: 4, count: 1, boss: true, pos: [-112, 112] },
      { tier: 2, count: 1, guard: true, pos: [0, -45] },
      { tier: 2, count: 1, guard: true, pos: [0, 45] },
    ];
    for (const d of defs) {
      for (let i = 0; i < d.count; i++) {
        let x: number, z: number;
        if (d.pos) { [x, z] = d.pos; }
        else {
          const a = Math.random() * Math.PI * 2;
          const r = d.tier === 0 ? 30 + Math.random() * 26
            : d.tier === 1 ? 62 + Math.random() * 40
            : d.tier === 2 ? 108 + Math.random() * 30
            : d.tier === 3 ? 92 + Math.random() * 44
            : 122 + Math.random() * 22;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
        }
        this.spawnMob(d.tier, x, z, !!d.boss, !!d.guard);
      }
    }
  }

  private spawnMob(tier: number, x: number, z: number, boss = false, isGuard = false, isArena = false): void {
    const t = MOB_TIERS[tier];
    const g = new THREE.Group();
    const scale = boss ? 2.4 : isGuard ? t.scale * 1.35 : t.scale;
    const mat = new THREE.MeshLambertMaterial({ color: boss ? 0xdc2626 : isGuard ? 0xfacc15 : t.color });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), mat);
    body.position.y = 0.75;
    body.scale.set(scale, scale * 0.85, scale);
    const eyeW = new THREE.SphereGeometry(0.13, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupil = new THREE.SphereGeometry(0.06, 6, 6);
    const puMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const e1 = new THREE.Mesh(eyeW, eyeMat); e1.position.set(-0.22 * scale, 0.95 * scale, 0.5 * scale);
    const e2 = new THREE.Mesh(eyeW, eyeMat); e2.position.set(0.22 * scale, 0.95 * scale, 0.5 * scale);
    const p1 = new THREE.Mesh(pupil, puMat); p1.position.set(-0.22 * scale, 0.95 * scale, 0.6 * scale);
    const p2 = new THREE.Mesh(pupil, puMat); p2.position.set(0.22 * scale, 0.95 * scale, 0.6 * scale);
    // espinhos para tiers altos
    if (tier >= 3) {
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
      for (let si = 0; si < 4; si++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.5 * scale, 5), spikeMat);
        const sa = (si / 4) * Math.PI * 2;
        sp.position.set(Math.cos(sa) * 0.4 * scale, 1.25 * scale, Math.sin(sa) * 0.4 * scale);
        g.add(sp);
      }
    }
    // v3: cornos para tiers médios
    if (tier >= 1 && tier < 3) {
      const hornMat = new THREE.MeshLambertMaterial({ color: 0x3f2d1d });
      for (const hx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.42 * scale, 5), hornMat);
        horn.position.set(hx * 0.3 * scale, 1.35 * scale, 0.1 * scale);
        horn.rotation.z = -hx * 0.5;
        g.add(horn);
      }
    }
    // v3: coroa 3D nos chefes
    if (boss) {
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const crown = new THREE.Group();
      for (let ci = 0; ci < 5; ci++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.3 * scale, 4), crownMat);
        const ca = (ci / 5) * Math.PI * 2;
        spike.position.set(Math.cos(ca) * 0.3 * scale, 1.62 * scale, Math.sin(ca) * 0.3 * scale);
        crown.add(spike);
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.3 * scale, 0.05 * scale, 5, 14), crownMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 1.5 * scale;
      crown.add(band);
      g.add(crown);
      // aura vermelha de chefe
      const aura = new THREE.PointLight(0xff4444, 26, 12);
      aura.position.y = 1.4 * scale;
      g.add(aura);
      this.bossAuraLights.push(aura);
    }
    g.add(body, e1, e2, p1, p2);

    const hpCanvas = document.createElement("canvas");
    hpCanvas.width = 64; hpCanvas.height = 10;
    const hpTex = new THREE.CanvasTexture(hpCanvas);
    const hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, depthWrite: false }));
    hpBar.scale.set(1.6, 0.25, 1);
    hpBar.position.y = 1.7 * scale + 0.35;
    g.add(hpBar);

    const nm = makeTextSprite(`${boss ? "👑 " : isGuard ? "🛡️ " : ""}${boss ? (tier >= 4 ? "Rainha Sombria" : "Bug Rei") : isGuard ? "Guardião" : t.name}${boss ? " · CHEFE" : ""}`, {
      size: 24, bg: true, accent: boss ? "#f87171" : isGuard ? "#facc15" : undefined,
    });
    nm.scale.set(3.4, 0.85, 1);
    nm.position.y = 1.7 * scale + 0.95;
    g.add(nm);

    const y = groundY(x, z);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.addShadow(x, y, z, scale);

    const mult = boss ? 10 : isGuard ? 2.2 : 1;
    const mob: Mob = {
      group: g, hpBar, hpCanvas, hpTex,
      tier, isBoss: boss, isGuard,
      arena: isArena,
      hp: Math.round(t.hp * mult), maxHp: Math.round(t.hp * mult),
      atk: Math.round(t.atk * (boss ? 3 : isGuard ? 1.5 : 1)),
      xp: Math.round(t.xp * mult), gold: Math.round(t.gold * mult), pts: Math.round(t.pts * (boss ? 10 : isGuard ? 3 : 1)),
      speed: t.speed * (boss ? 0.8 : 1),
      home: new THREE.Vector3(x, y, z),
      target: new THREE.Vector3(x, y, z),
      state: "idle",
      nextThink: 0, atkCd: 0, respawnAt: 0, hitFlash: 0, bob: Math.random() * 10,
      stunUntil: 0, slowUntil: 0,
      name: boss ? (tier >= 4 ? "Rainha Sombria" : "Bug Rei") : isGuard ? "Guardião" : t.name,
    };
    this.drawMobHp(mob);
    this.mobs.push(mob);
  }

  private drawMobHp(mob: Mob): void {
    const ctx = mob.hpCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, 64, 10);
    const pct = Math.max(0, mob.hp / mob.maxHp);
    ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#facc15" : "#f87171";
    ctx.fillRect(1, 1, 62 * pct, 8);
    mob.hpTex.needsUpdate = true;
  }

  // ── Objetos de plataforma (populados pelo React) ───────────

  spawnPlatformObjects(data: {
    raffles: { id: string; title: string; prizeTitle: string }[];
    contests: { id: string; title: string; prize?: string }[];
    vouchers: { id: string; code: string; label: string }[];
    assets: { id: string; title: string; value: number; modality: string }[];
  }): void {
    const nR = Math.min(data.raffles.length, 8);
    for (let i = 0; i < nR; i++) {
      const r = data.raffles[i];
      const a = (-Math.PI / 2) * (i / Math.max(1, nR - 1)) - Math.PI * 0.25;
      const x = Math.cos(a) * 9;
      const z = -52 + Math.sin(a) * 9;
      this.addCrystal(r.id, r.title, x, z, 0xc084fc, "🎁");
    }
    if (nR === 0) this.addCrystal("none", "Sem sorteios ativos", 0, -52, 0x64748b, "🎁");

    const nA = Math.min(data.assets.length, 6);
    for (let i = 0; i < nA; i++) {
      const it = data.assets[i];
      const z = (i - (nA - 1) / 2) * 4.4;
      this.addStall(it.id, it.title, 52, z);
    }

    const nC = Math.min(data.contests.length, 4);
    for (let i = 0; i < nC; i++) {
      const it = data.contests[i];
      const z = (i - (nC - 1) / 2) * 5.4;
      this.addBillboard(it.id, it.title, -52, z);
    }

    const nV = Math.min(Math.max(data.vouchers.length, 2), 5);
    for (let i = 0; i < nV; i++) {
      const v = data.vouchers[i] || { id: `gold-${i}`, code: "", label: "" };
      const x = (i - (nV - 1) / 2) * 3.6;
      this.addChest(v.id, x, 52, v);
    }
  }

  private addCrystal(id: string, title: string, x: number, z: number, color: number, emoji: string): void {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.75, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: 0x4c4370 })
    );
    ped.position.y = 0.55;
    const cry = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    cry.position.y = 2.1;
    const icon = makeIconSprite(emoji);
    icon.scale.set(1.3, 1.3, 1);
    icon.position.y = 3.6;
    const lab = makeTextSprite(title.slice(0, 22), { size: 26, bg: true, accent: "#a78bfa" });
    lab.scale.set(4.6, 1.15, 1);
    lab.position.y = 4.8;
    g.add(ped, cry, icon, lab);
    const y = groundY(x, z);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "raffle", id, label: `Sorteio: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addStall(id: string, title: string, x: number, z: number): void {
    const g = new THREE.Group();
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x8b5e3c })
    );
    counter.position.y = 0.6;
    const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    post1.position.set(-1.3, 1.9, -0.6);
    const post2 = post1.clone();
    post2.position.x = 1.3;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.16, 2.2),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    awning.position.y = 3.1;
    awning.rotation.x = -0.18;
    const lab = makeTextSprite(title.slice(0, 20), { size: 26, bg: true, accent: "#fbbf24" });
    lab.scale.set(4.6, 1.15, 1);
    lab.position.y = 4.3;
    const icon = makeIconSprite("🛒");
    icon.scale.set(1.2, 1.2, 1);
    icon.position.y = 2.1;
    g.add(counter, post1, post2, awning, lab, icon);
    g.position.set(x, groundY(x, z), z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "asset", id, label: `Bem: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addBillboard(id: string, title: string, x: number, z: number): void {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 3.4),
      new THREE.MeshLambertMaterial({ color: 0x6b7280 })
    );
    pole.position.y = 1.7;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.2, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    panel.position.y = 3.6;
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(3.75, 2.35, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    border.position.set(0, 3.6, -0.05);
    const lab = makeTextSprite(title.slice(0, 20), { size: 26, bg: true, accent: "#f59e0b" });
    lab.scale.set(4.4, 1.1, 1);
    lab.position.y = 5.6;
    const icon = makeIconSprite("🏆");
    icon.scale.set(1.2, 1.2, 1);
    icon.position.y = 1.6;
    icon.position.z = 0.4;
    g.add(pole, border, panel, lab, icon);
    g.position.set(x, groundY(x, z), z);
    g.rotation.y = Math.PI / 2;
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "contest", id, label: `Concurso: ${title.slice(0, 28)}`,
      pos: g.position.clone(), used: false, icon,
    });
  }

  private addChest(id: string, x: number, z: number, voucher: { id: string; code: string; label: string }): void {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.9, 1),
      new THREE.MeshLambertMaterial({ color: 0x92400e })
    );
    base.position.y = 0.45;
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.5, 1.05),
      new THREE.MeshLambertMaterial({ color: 0xb45309 })
    );
    lid.position.set(0, 0.95, 0);
    const lock = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    lock.position.set(0, 0.75, 0.55);
    const icon = makeIconSprite("🎟️");
    icon.scale.set(1.3, 1.3, 1);
    icon.position.y = 2.2;
    const lab = voucher.code
      ? makeTextSprite(voucher.label.slice(0, 22), { size: 26, bg: true, accent: "#f87171" })
      : makeTextSprite("Ouro bónus", { size: 26, bg: true, accent: "#fbbf24" });
    lab.scale.set(4.4, 1.1, 1);
    lab.position.y = 3.2;
    g.add(base, lid, lock, icon, lab);
    g.position.set(x, groundY(x, z), z);
    this.scene.add(g);
    this.interactables.push({
      group: g, kind: "voucher", id: voucher.id || `gold-${x}`, label: voucher.code ? `Cupão: ${voucher.label}` : "Baú de ouro",
      pos: g.position.clone(), used: false, lid, icon,
    });
  }

  // ── Rede (multiplayer realtime + PvP) ───────────────────────

  private buildNet(): void {
    try {
      const ch: any = (supabase as any).channel("bateu-world-v1", {
        config: { presence: { key: this.myId } },
      });
      ch.on("broadcast", { event: "pos" }, ({ payload }: any) => {
        if (!payload || payload.id === this.myId) return;
        this.upsertRemote(payload);
      });
      ch.on("broadcast", { event: "chat" }, ({ payload }: any) => {
        if (payload?.n) this.opts.onEvent({ type: "chat", name: payload.n, msg: payload.m });
      });
      ch.on("broadcast", { event: "pvphit" }, ({ payload }: any) => {
        if (!payload || payload.t !== this.myId) return;
        this.receivePvpHit(payload);
      });
      ch.on("broadcast", { event: "pvphp" }, ({ payload }: any) => {
        if (!payload || payload.id === this.myId) return;
        const r = this.remotes.get(payload.id);
        if (r && typeof payload.hp === "number") {
          r.hp = payload.hp;
          r.maxHp = payload.mhp || r.maxHp || 100;
          this.drawRemoteHp(r);
        }
      });
      ch.on("broadcast", { event: "pvpdeath" }, ({ payload }: any) => {
        if (!payload) return;
        if (payload.k === this.myId && payload.v !== this.myId) {
          // Eu fui o ladrão — recompensa
          this.opts.onEvent({ type: "pvp", action: "steal", victim: payload.vn, pts: payload.pts || 0, coupon: payload.cpn || null });
        } else if (payload.k && payload.v !== this.myId) {
          this.opts.onEvent({ type: "pvp", action: "feed", kn: payload.kn, vn: payload.vn });
        }
      });
      ch.on("presence", { event: "sync" }, () => {
        try {
          const st = ch.presenceState();
          this.opts.onEvent({ type: "online", count: Object.keys(st).length });
        } catch { /* ignore */ }
      });
      ch.on("presence", { event: "leave" }, ({ key }: any) => {
        const r = this.remotes.get(key);
        if (r) {
          this.scene.remove(r.group);
          this.remotes.delete(key);
        }
      });
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          try { ch.track({ id: this.myId, n: this.opts.name }); } catch { /* ignore */ }
        }
      });
      this.chan = ch;
      this.posTimer = setInterval(() => this.broadcastPos(), 125);
    } catch (e) {
      console.warn("[BateuWorld] realtime indisponível:", e);
    }

    this.remoteGroup = new THREE.Group();
    this.scene.add(this.remoteGroup);
  }

  private makeRemoteHpBar(): { bar: THREE.Sprite; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture } {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 10;
    const tex = new THREE.CanvasTexture(canvas);
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    bar.scale.set(1.6, 0.25, 1);
    bar.position.y = 2.55;
    return { bar, canvas, tex };
  }

  private drawRemoteHp(r: RemotePlayer): void {
    const ctx = r.hpCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, 64, 10);
    const pct = Math.max(0, Math.min(1, r.hp / Math.max(1, r.maxHp)));
    ctx.fillStyle = r.shield ? "#60a5fa" : pct > 0.5 ? "#f87171" : "#fbbf24";
    ctx.fillRect(1, 1, 62 * pct, 8);
    r.hpTex.needsUpdate = true;
  }

  private upsertRemote(p: { id: string; n: string; cl?: number; lv?: number; x: number; z: number; ry?: number; mv?: boolean; hp?: number; mhp?: number; sh?: boolean }): void {
    let r = this.remotes.get(p.id);
    if (!r) {
      const g = new THREE.Group();
      const color = CLASS_COLORS[p.cl ?? 0] ?? 0x888888;
      const body = new THREE.Mesh(this.geoBody, new THREE.MeshLambertMaterial({ color }));
      body.position.y = 1.05;
      const head = new THREE.Mesh(this.geoHead, new THREE.MeshLambertMaterial({ color: 0xf5d0a9 }));
      head.position.y = 1.95;
      const nameSpr = makeTextSprite(`${(p.n || "Jogador").slice(0, 14)} · Nv${p.lv ?? 1}`, { size: 30, bg: true });
      nameSpr.scale.set(3.6, 0.9, 1);
      nameSpr.position.y = 2.9;
      nameSpr.name = "nameTag";
      const { bar, canvas, tex } = this.makeRemoteHpBar();
      g.add(body, head, nameSpr, bar);
      // anel de proteção (escudo)
      const shieldRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.05, 6, 20),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8 })
      );
      shieldRing.rotation.x = -Math.PI / 2;
      shieldRing.position.y = 0.3;
      shieldRing.visible = false;
      shieldRing.name = "shieldRing";
      g.add(shieldRing);
      this.remoteGroup.add(g);
      r = {
        group: g, hpBar: bar, hpCanvas: canvas, hpTex: tex,
        target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry ?? 0, moving: !!p.mv,
        lastSeen: performance.now(), name: p.n,
        hp: p.hp ?? 100, maxHp: p.mhp ?? 100, shield: !!p.sh,
      };
      g.position.set(p.x, groundY(p.x, p.z), p.z);
      this.remotes.set(p.id, r);
      this.drawRemoteHp(r);
      worldAudio.play("join");
      this.opts.onEvent({ type: "playerjoin", name: r.name });
    }
    // nome/nível/escudo atualizam-se se mudaram
    const wantText = `${(p.n || "Jogador").slice(0, 14)} · Nv${p.lv ?? 1}${p.sh ? " 🛡️" : ""}`;
    const tag = r.group.children.find((c) => c.name === "nameTag") as THREE.Sprite | undefined;
    if (tag && (tag as any).__txt !== wantText) {
      (tag as any).__txt = wantText;
      const newMat = makeTextSprite(wantText, { size: 30, bg: true });
      tag.material.dispose();
      tag.material = newMat.material;
    }
    const ring = r.group.children.find((c) => c.name === "shieldRing") as THREE.Mesh | undefined;
    if (ring) ring.visible = !!p.sh;
    r.target.set(p.x, 0, p.z);
    r.targetRy = p.ry ?? r.targetRy;
    r.moving = !!p.mv;
    r.lastSeen = performance.now();
    if (typeof p.hp === "number") { r.hp = p.hp; r.maxHp = p.mhp ?? r.maxHp; r.shield = !!p.sh; this.drawRemoteHp(r); }
  }

  private broadcastPos(): void {
    if (!this.chan || this.disposed) return;
    const payload = {
      id: this.myId, n: this.opts.name, cl: this.opts.classId,
      lv: this.opts.level, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
      ry: +this.player.rotation.y.toFixed(2), mv: this.isMoving(),
      hp: Math.round(this.hp), mhp: Math.round(this.opts.stats.maxHp),
      sh: performance.now() < this.pvpShieldUntil,
    };
    try { this.chan.send({ type: "broadcast", event: "pos", payload }); } catch { /* ignore */ }
  }

  sendChat(msg: string): void {
    if (!this.chan || !msg.trim()) return;
    try {
      this.chan.send({ type: "broadcast", event: "chat", payload: { n: this.opts.name, m: msg.slice(0, 140) } });
    } catch { /* ignore */ }
  }

  // ── PvP: ataque e roubo ─────────────────────────────────────

  get inSafeZone(): boolean {
    return Math.hypot(this.pos.x, this.pos.z) < PVP_SAFE_RADIUS;
  }

  get shielded(): boolean {
    return performance.now() < this.pvpShieldUntil;
  }

  setShield(ms: number): void {
    this.pvpShieldUntil = performance.now() + ms;
    worldAudio.play("shield");
    const myRing = this.player.children.find((c) => c.name === "myShield") as THREE.Mesh | undefined;
    if (myRing) myRing.visible = true;
    this.ringEffect(0x60a5fa, 4);
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp });
  }

  private effAtk(): number {
    const buff = performance.now() < this.atkBuffUntil ? 1.5 : 1;
    const petBonus = this.hasPet ? 1.08 : 1; // v4: o companheiro incentiva o ataque
    return this.opts.stats.atk * buff * petBonus;
  }

  private receivePvpHit(p: { a: string; an: string; d: number }): void {
    if (this.dead) return;
    if (this.inSafeZone) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Zona segura — ninguém te pode ferir aqui!", tone: "info" });
      return;
    }
    if (this.shielded) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Tens proteção de roubo — o golpe foi anulado!", tone: "info" });
      return;
    }
    if (this.opts.level < PVP_MIN_LEVEL) {
      this.opts.onEvent({ type: "notify", msg: "🛡️ Heróis abaixo do nível 3 estão protegidos!", tone: "info" });
      return;
    }
    // valida proximidade do agressor
    const atk = this.remotes.get(p.a);
    const dAtk = atk ? Math.hypot(atk.group.position.x - this.pos.x, atk.group.position.z - this.pos.z) : 0;
    if (atk && dAtk > 12) return; // anti-alcance
    const def = this.opts.level * 2;
    const dmg = Math.max(1, Math.round((p.d || 5) * (100 / (100 + def * 4))));
    this.hp -= dmg;
    this.lastHitAt = performance.now();
    this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0xf87171, 10, 3.2, 0.5, 0.09, 6);
    this.shake(0.14);
    this.drawPlayerHpEvent(dmg, p.an);
    const now = performance.now();
    if (now - this.lastPvpHpSent > 300) {
      this.lastPvpHpSent = now;
      try { this.chan?.send({ type: "broadcast", event: "pvphp", payload: { id: this.myId, hp: Math.max(0, Math.round(this.hp)), mhp: Math.round(this.opts.stats.maxHp) } }); } catch { /* ignore */ }
    }
    if (this.hp <= 0) {
      this.dead = true;
      this.shake(0.4);
      this.opts.onEvent({ type: "pvp", action: "death", by: p.an, killerId: p.a });
    }
  }

  private drawPlayerHpEvent(dmg: number, by: string): void {
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp, hit: true });
    this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), `-${dmg}`, "#f87171", 1.2);
    if (by) this.opts.onEvent({ type: "pvphitby", name: by, dmg });
  }

  private tryPvpStrike(): boolean {
    // alvo: jogador remoto vivo mais próximo (fora de zona segura)
    let best: RemotePlayer | null = null;
    let bestD = 9;
    for (const r of this.remotes.values()) {
      const d = Math.hypot(r.group.position.x - this.pos.x, r.group.position.z - this.pos.z);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (!best) return false;
    const melee = this.opts.classId === 0;
    const range = melee ? 3.4 : 8.5;
    if (bestD > range) return false;
    if (this.inSafeZone) {
      this.opts.onEvent({ type: "notify", msg: "Saia da praça para desafiar outros heróis (PvP)!", tone: "info" });
      return true; // consumiu o ataque
    }
    if (best.shield) {
      this.opts.onEvent({ type: "notify", msg: `🛡️ ${best.name} está protegido contra roubos!`, tone: "info" });
      return true;
    }
    const dmg = Math.round(this.effAtk() * (0.9 + Math.random() * 0.25));
    const fwd = new THREE.Vector3(best.group.position.x - this.pos.x, 0, best.group.position.z - this.pos.z).normalize();
    this.player.rotation.y = Math.atan2(fwd.x, fwd.z);
    this.slashEffect(fwd.clone());
    try {
      this.chan?.send({ type: "broadcast", event: "pvphit", payload: { a: this.myId, an: this.opts.name, t: this.remoteIdOf(best), d: dmg } });
    } catch { /* ignore */ }
    this.floatText(best.group.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "⚔️", "#fbbf24", 1.1);
    return true;
  }

  private remoteIdOf(r: RemotePlayer): string {
    for (const [id, rr] of this.remotes) if (rr === r) return id;
    return "";
  }

  broadcastPvpDeath(killerId: string, killerName: string, stolenPts: number, coupon: { id: string; code: string; label: string } | null): void {
    try {
      this.chan?.send({
        type: "broadcast", event: "pvpdeath",
        payload: {
          v: this.myId, vn: this.opts.name,
          k: killerId, kn: killerName,
          pts: stolenPts, cpn: coupon,
        },
      });
    } catch { /* ignore */ }
  }

  // ── Input ───────────────────────────────────────────────────

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: true });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    this.keys.add(e.key.toLowerCase());
    if (e.key === " ") { this.jump(); e.preventDefault(); }
    if (e.key.toLowerCase() === "e") this.interact();
    if (e.key.toLowerCase() === "f") this.attack();
    if (e.key === "1") this.skill(0);
    if (e.key === "2") this.skill(1);
    if (e.key === "3") this.skill(2);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.dragId !== null) return;
    this.dragId = e.pointerId;
    this.dragStart = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    this.dragging = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragId) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    this.dragStart.moved += Math.abs(dx) + Math.abs(dy);
    if (this.dragStart.moved > 10) this.dragging = true;
    if (this.dragging) {
      this.camYaw -= dx * 0.0052;
      this.camDist = Math.max(6, Math.min(18, this.camDist + dy * 0.02));
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.dragId) return;
    const dt = performance.now() - this.dragStart.t;
    if (!this.dragging && dt < 320) this.attack();
    this.dragId = null;
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    this.camDist = Math.max(6, Math.min(18, this.camDist + (e.deltaY > 0 ? 1.2 : -1.2)));
  };

  setJoystick(x: number, y: number): void {
    this.joy.x = x;
    this.joy.y = y;
  }

  jump(): void {
    if (this.onGround && !this.dead) {
      this.vy = 6.6;
      this.onGround = false;
      this.burst(this.pos.clone(), 0xd6c8a8, 5, 1.6, 0.4, 0.07, 3);
    }
  }

  // ── Combate ─────────────────────────────────────────────────

  attack(): void {
    if (this.dead || this.atkCd > 0) return;
    this.atkCd = 0.55;
    this.swingT = 0.0001; // v3: animação de golpe da arma
    worldAudio.play("swing");
    // se houver jogador remoto perto (e nenhum mob mais perto), golpe PvP
    let nearMob = Infinity;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      nearMob = Math.min(nearMob, m.group.position.distanceTo(this.pos));
    }
    let nearPl = Infinity;
    let anyPl = false;
    for (const r of this.remotes.values()) {
      anyPl = true;
      nearPl = Math.min(nearPl, Math.hypot(r.group.position.x - this.pos.x, r.group.position.z - this.pos.z));
    }
    if (anyPl && nearPl < Math.min(nearMob, 8.5) && nearPl <= 8.5) {
      if (this.tryPvpStrike()) return;
    }
    const cls = this.opts.classId;
    if (cls === 0) this.meleeAttack();
    else if (cls === 1) this.shoot(0xff7b00, 16, 18, "orb", 0xff7b00);
    else if (cls === 2) this.shoot(0xfde047, 24, 20, "arrow", 0xfde047);
    else this.shoot(0x2dd4bf, 14, 16, "orb", 0x2dd4bf);
  }

  skill(slot: number): void {
    if (this.dead) return;
    const def = SKILLS[this.opts.classId]?.[slot];
    if (!def) return;
    if (this.opts.level < def.lvl) {
      worldAudio.play("deny");
      this.opts.onEvent({ type: "skill2", slot, ok: false, reason: "locked", lvl: def.lvl });
      return;
    }
    if (this.skillCds[slot] > 0) {
      worldAudio.play("deny");
      this.opts.onEvent({ type: "skill2", slot, ok: false, reason: "cd", remain: Math.ceil(this.skillCds[slot]) });
      return;
    }
    this.skillCds[slot] = def.cd;
    this.swingT = 0.0001;
    worldAudio.play("skill");
    this.opts.onEvent({ type: "skill2", slot, ok: true, cd: def.cd });
    const now = performance.now();
    const cls = this.opts.classId;
    const aoeDamage = (range: number, mult: number, maxHits = 24) => {
      let hits = 0;
      for (const m of this.mobs) {
        if (m.state === "dead" || hits >= maxHits) continue;
        if (m.group.position.distanceTo(this.pos) <= range) {
          this.damageMob(m, this.effAtk() * mult * (0.9 + Math.random() * 0.2), false);
          hits++;
        }
      }
      return hits;
    };
    if (cls === 0) {
      // GUERREIRO
      if (slot === 0) { this.ringEffect(0xfbbf24, 4.5); aoeDamage(4.2, 2.2); }
      else if (slot === 1) {
        this.atkBuffUntil = now + 8000;
        this.ringEffect(0xef4444, 5);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), "GRITO!", "#f87171", 1.2);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xef4444, 18, 4, 0.6, 0.1, 4);
      } else {
        this.shake(0.35);
        this.ringEffect(0xf97316, 6.5);
        const hits = aoeDamage(6.5, 3.2);
        for (const m of this.mobs) {
          if (m.state !== "dead" && m.group.position.distanceTo(this.pos) <= 6.5) m.stunUntil = now + 2000;
        }
        this.burst(this.pos.clone(), 0xa16207, 26, 5, 0.8, 0.12, 9);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    } else if (cls === 1) {
      // MAGO
      if (slot === 0) { this.ringEffect(0x8b5cf6, 5.5); const h = aoeDamage(7, 2.4); if (h > 0) this.opts.onEvent({ type: "skillhit", hits: h }); }
      else if (slot === 2) {
        // Meteoro: rocha cai e explode
        const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
        const at = this.pos.clone().addScaledVector(fwd, 5);
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.1, 0),
          new THREE.MeshBasicMaterial({ color: 0xf97316 })
        );
        rock.position.copy(at).add(new THREE.Vector3(0, 14, 0));
        this.scene.add(rock);
        const t0 = performance.now();
        const anim = () => {
          if (this.disposed) { this.scene.remove(rock); return; }
          const t = Math.min(1, (performance.now() - t0) / 650);
          rock.position.y = 14 * (1 - t) + groundY(at.x, at.z);
          if (t >= 1) {
            this.scene.remove(rock);
            this.shake(0.45);
            this.burst(at.clone(), 0xf97316, 34, 6, 0.9, 0.14, 8);
            this.burst(at.clone(), 0xfde047, 20, 4, 0.7, 0.1, 6);
            this.ringEffectAt(at, 0xf97316, 9);
            let hits = 0;
            for (const m of this.mobs) {
              if (m.state === "dead") continue;
              if (m.group.position.distanceTo(at) <= 6.5) {
                this.damageMob(m, this.effAtk() * 4 * (0.9 + Math.random() * 0.2), true);
                hits++;
              }
            }
            if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
            return;
          }
          requestAnimationFrame(anim);
        };
        anim();
      } else {
        this.ringEffect(0x22d3ee, 6.5);
        const hits = aoeDamage(9, 1.8);
        for (const m of this.mobs) {
          if (m.state !== "dead" && m.group.position.distanceTo(this.pos) <= 9) m.slowUntil = now + 4000;
        }
        for (let i = 0; i < 18; i++) this.burst(this.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0.4, (Math.random() - 0.5) * 8)), 0x93c5fd, 3, 1.4, 0.8, 0.08, 2);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    } else if (cls === 2) {
      // ARQUEIRO
      if (slot === 0) {
        // Chuva de flechas: 5 tiros rápidos
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            if (this.disposed || this.dead) return;
            this.shoot(0x4ade80, 26, 14, "arrow", 0x22c55e);
          }, i * 180);
        }
      } else if (slot === 1) {
        const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
        const dest = this.pos.clone().addScaledVector(fwd, 6);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x9ca3af, 14, 3, 0.5, 0.09, 5);
        const r = Math.hypot(dest.x, dest.z);
        if (r > WORLD_RADIUS) { dest.x *= WORLD_RADIUS / r; dest.z *= WORLD_RADIUS / r; }
        this.pos.x = dest.x; this.pos.z = dest.z;
        this.invulnUntil = now + 700;
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0x4ade80, 14, 3, 0.5, 0.09, 5);
      } else {
        // Tiro certeiro: 3.5x no mais próximo
        let best: Mob | null = null;
        let bestD = 16;
        for (const m of this.mobs) {
          if (m.state === "dead") continue;
          const d = m.group.position.distanceTo(this.pos);
          if (d < bestD) { bestD = d; best = m; }
        }
        if (best) {
          const dmg = this.effAtk() * 3.5;
          setTimeout(() => { if (!this.disposed) this.damageMob(best!, dmg, true); }, 120);
          this.shoot(0xfde047, 30, 20, "arrow", 0xfde047);
        } else {
          this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), "sem alvo", "#cbd5e1", 0.9);
        }
      }
    } else {
      // CURANDEIRO
      if (slot === 0) {
        aoeDamage(8, 1.8);
        this.hp = Math.min(this.opts.stats.maxHp, this.hp + Math.round(this.opts.stats.maxHp * 0.3));
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.ringEffect(0x2dd4bf, 6);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), "+vida", "#4ade80", 1.1);
      } else if (slot === 1) {
        this.hotUntil = now + 10000;
        this.ringEffect(0x34d399, 5.5);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), "regeneração", "#34d399", 1.1);
      } else {
        const hits = aoeDamage(8, 2.8);
        this.hp = Math.min(this.opts.stats.maxHp, this.hp + Math.round(this.opts.stats.maxHp * 0.15));
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.ringEffect(0x4ade80, 7);
        this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x4ade80, 22, 4.5, 0.7, 0.1, 3);
        if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
      }
    }
  }

  private meleeAttack(): void {
    const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
    let hitAny = false;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      const to = m.group.position.clone().sub(this.pos);
      const dist = to.length();
      if (dist > 3.0) continue;
      to.y = 0;
      to.normalize();
      if (fwd.dot(to) > 0.25 || dist < 1.2) {
        this.damageMob(m, this.effAtk() * (0.9 + Math.random() * 0.25), Math.random() < 0.12);
        hitAny = true;
      }
    }
    this.slashEffect(fwd);
    if (!hitAny) this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2, 0)), "miss", "#cbd5e1", 0.8);
  }

  private shoot(color: number, speed: number, range: number, kind: "orb" | "arrow", trailColor: number | null = null): void {
    let best: Mob | null = null;
    let bestD = range;
    for (const m of this.mobs) {
      if (m.state === "dead") continue;
      const d = m.group.position.distanceTo(this.pos);
      if (d < bestD) { bestD = d; best = m; }
    }
    const fwd = new THREE.Vector3(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));
    const geo = kind === "orb" ? new THREE.SphereGeometry(0.22, 8, 8) : new THREE.BoxGeometry(0.08, 0.08, 0.9);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    const start = this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)).add(fwd.clone().multiplyScalar(0.8));
    mesh.position.copy(start);
    if (best) {
      const aim = best.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)).sub(start).normalize();
      mesh.lookAt(start.clone().add(aim));
    } else {
      mesh.lookAt(start.clone().add(fwd));
    }
    this.scene.add(mesh);
    this.projectiles.push({ mesh, target: best, speed, dmg: this.effAtk() * (0.9 + Math.random() * 0.25), life: 2.2, kind, trailColor });
  }

  private damageMob(m: Mob, dmg: number, crit: boolean): void {
    if (m.state === "dead") return;
    const d = Math.max(1, Math.round(dmg * (crit ? 2 : 1)));
    m.hp -= d;
    m.hitFlash = 0.12;
    worldAudio.play(crit ? "crit" : "hit");
    this.drawMobHp(m);
    const p = m.group.position.clone().add(new THREE.Vector3(0, 1.6 * (m.isBoss ? 2.2 : 1), 0));
    this.floatText(p, crit ? `${d}!` : `${d}`, crit ? "#fde047" : "#ffffff", crit ? 1.3 : 1);
    this.burst(p, crit ? 0xfde047 : 0xffffff, crit ? 8 : 4, 2.6, 0.35, 0.07, 4);
    (m.group.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    setTimeout(() => {
      if (!this.disposed && m.state !== "dead") {
        (m.group.children[0] as THREE.Mesh).material = new THREE.MeshLambertMaterial({
          color: m.isBoss ? 0xdc2626 : m.isGuard ? 0xfacc15 : MOB_TIERS[m.tier].color,
        });
      }
    }, 90);
    if (m.hp <= 0) this.killMob(m);
  }

  private killMob(m: Mob): void {
    m.state = "dead";
    m.respawnAt = m.arena ? Number.MAX_SAFE_INTEGER : performance.now() + (m.isBoss ? 30000 : 8000);
    const gold = Math.round(m.gold * (0.7 + Math.random() * 0.7));
    // v4: multiplicador de combo calculado antes das esferas
    const nowK = performance.now();
    if (nowK < this.comboUntil) this.combo += 1; else this.combo = 1;
    this.comboUntil = nowK + 4200;
    if (this.combo >= 2) {
      this.opts.onEvent({ type: "combo", n: this.combo });
      worldAudio.play("combo");
    }
    const comboMult = 1 + Math.min(0.5, (this.combo - 1) * 0.1);
    this.spawnOrbs(m.group.position.clone(), gold, m.xp, m.isBoss ? 5 : 3, comboMult);
    this.burst(m.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)), m.isBoss ? 0xdc2626 : m.isGuard ? 0xfacc15 : MOB_TIERS[m.tier].color, m.isBoss ? 40 : 16, 4.5, 0.7, 0.12, 6);
    if (m.isBoss || m.isGuard) this.shake(0.3);
    // v4: loot com raridades
    const loot = rollLoot(m.tier, m.isBoss, m.isGuard, this.opts.level);
    if (loot) this.dropLoot(m.group.position.clone(), loot);
    // v4: contabilidade da arena
    if (m.arena && this.arena.active) {
      this.arena.alive = Math.max(0, this.arena.alive - 1);
      this.arena.kills += 1;
      this.arena.pts += m.pts;
      this.arena.gold += gold;
      this.arena.xp += m.xp;
    }
    // v3: animação de morte (encolher e afundar) em vez de desaparecer
    const g = m.group;
    const t0 = performance.now();
    const baseScale = g.scale.x || 1;
    const anim = () => {
      if (this.disposed) return;
      const t = (performance.now() - t0) / 380;
      if (t >= 1) { g.visible = false; g.scale.setScalar(baseScale); return; }
      const s = baseScale * (1 - t * 0.9);
      g.scale.setScalar(Math.max(0.05, s));
      g.position.y = m.home.y - t * 0.6;
      requestAnimationFrame(anim);
    };
    anim();
    worldAudio.play(m.isBoss ? "death" : "hit");
    this.opts.onEvent({ type: "kill", tier: m.tier, gold, xp: m.xp, pts: m.pts, boss: m.isBoss, guard: m.isGuard, name: m.name, combo: this.combo, comboMult, arena: !!m.arena });
  }

  private spawnOrbs(at: THREE.Vector3, gold: number, xp: number, n: number, mult = 1): void {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geoOrb, new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfbbf24 : 0x4ade80 }));
      mesh.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.6, (Math.random() - 0.5) * 1.4));
      this.scene.add(mesh);
      this.orbs.push({ mesh, t: 0, gold: Math.round(gold / n), xp: Math.round(xp / n), mult, from: mesh.position.clone() });
    }
  }

  // ── v4: LOOT no chão ──────────────────────────────────────

  private dropLoot(at: THREE.Vector3, item: LootItem): void {
    const meta = RARITY_META[item.rarity];
    const g = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34),
      new THREE.MeshBasicMaterial({ color: meta.glow, transparent: true, opacity: 0.95 })
    );
    glow.position.y = 0.7;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.16, 1.6, 6),
      new THREE.MeshBasicMaterial({ color: meta.glow, transparent: true, opacity: 0.3, depthWrite: false })
    );
    beam.position.y = 0.8;
    const icon = makeIconSprite(item.emoji);
    icon.scale.set(0.8, 0.8, 1);
    icon.position.y = 1.5;
    const lab = makeTextSprite(`${meta.name} · ${item.name}`, { size: 22, bg: true, accent: meta.color });
    lab.scale.set(3.6, 0.9, 1);
    lab.position.y = 2.3;
    g.add(glow, beam, icon, lab);
    g.position.copy(at);
    this.scene.add(g);
    this.groundLoot.push({ group: g, item, t: 0 });
    worldAudio.play("loot");
    if (item.rarity >= 2) {
      this.ringEffectAt(at, meta.glow, 3.5);
      this.opts.onEvent({ type: "notify", msg: `${item.emoji} ${meta.name} dropou: ${item.name}!`, tone: "good" });
    }
  }

  private updateLoot(dt: number): void {
    for (let i = this.groundLoot.length - 1; i >= 0; i--) {
      const gl = this.groundLoot[i];
      gl.t += dt;
      gl.group.children[0].rotation.y += dt * 2.4;
      gl.group.children[0].position.y = 0.7 + Math.sin(gl.t * 2.6) * 0.12;
      const d = Math.hypot(this.pos.x - gl.group.position.x, this.pos.z - gl.group.position.z);
      if (d < 1.6) {
        // apanhar: efeito + evento para o React
        this.burst(gl.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), RARITY_META[gl.item.rarity].glow, 14, 3, 0.5, 0.08, 4);
        this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), `+ ${gl.item.name}`, RARITY_META[gl.item.rarity].color, 1.05);
        this.opts.onEvent({ type: "loot", item: gl.item });
        this.scene.remove(gl.group);
        this.groundLoot.splice(i, 1);
      }
    }
  }

  // ── v4: PET companheiro ───────────────────────────────────

  setPet(on: boolean): void {
    if (on === this.hasPet) return;
    this.hasPet = on;
    if (on && !this.pet) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xfde68a })
      );
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0x111827 }));
      eye1.position.set(-0.1, 0.08, 0.26);
      const eye2 = eye1.clone();
      eye2.position.x = 0.1;
      const wingGeo = new THREE.ConeGeometry(0.1, 0.34, 4);
      const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      const w1 = new THREE.Mesh(wingGeo, wingMat);
      w1.rotation.z = Math.PI / 2.4;
      w1.position.set(0.3, 0.14, 0);
      const w2 = new THREE.Mesh(wingGeo, wingMat);
      w2.rotation.z = -Math.PI / 2.4;
      w2.position.set(-0.3, 0.14, 0);
      const light = new THREE.PointLight(0xfde68a, 6, 6);
      g.add(body, eye1, eye2, w1, w2, light);
      this.scene.add(g);
      this.pet = g;
    }
    if (this.pet) this.pet.visible = on;
    if (on) {
      worldAudio.play("pet");
      this.burst(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 0xfde68a, 16, 3, 0.7, 0.08, 3);
    }
  }

  private updatePet(dt: number): void {
    if (!this.pet || !this.hasPet) return;
    this.petT += dt;
    const t = this.petT;
    // orbita suave à volta do herói
    const ox = Math.cos(t * 0.9) * 1.5;
    const oz = Math.sin(t * 0.9) * 1.5;
    const target = new THREE.Vector3(this.pos.x + ox, this.pos.y + 2.5 + Math.sin(t * 2.2) * 0.22, this.pos.z + oz);
    this.pet.position.lerp(target, Math.min(1, dt * 4));
    this.pet.rotation.y += dt * 1.5;
    // asas batem
    const flap = Math.sin(t * 14) * 0.5;
    (this.pet.children[3] as THREE.Mesh).rotation.x = flap;
    (this.pet.children[4] as THREE.Mesh).rotation.x = -flap;
  }

  get hasPetActive(): boolean {
    return this.hasPet;
  }

  /** v4: debug/testes — largar um item lendário aos pés do herói. */
  debugDropLoot(): void {
    const item: LootItem = {
      id: "lt_debug_" + Date.now().toString(36),
      slot: "arma", name: "Lâmina de Teste", emoji: "🗡️",
      rarity: 3, atk: 5, hp: 0, spd: 0,
    };
    this.dropLoot(this.pos.clone(), item);
  }

  /** v4: debug/testes — dispara uma onda de arena sem teletransporte. */
  debugStartArenaHere(): void {
    this.startArena();
  }

  // ── Efeitos ─────────────────────────────────────────────────

  private burst(at: THREE.Vector3, color: number, n: number, speed = 3, life = 0.6, size = 0.09, gravity = 6): void {
    if (this.particles.length > 380) return;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geoPart, new THREE.MeshBasicMaterial({ color, transparent: true }));
      mesh.position.copy(at);
      const s = size * (0.6 + Math.random() * 0.9);
      mesh.scale.setScalar(s / 0.09);
      this.scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * speed * (0.3 + Math.random() * 0.7), up * speed * 0.9, Math.sin(a) * speed * (0.3 + Math.random() * 0.7)),
        t: 0, life: life * (0.7 + Math.random() * 0.6), gravity, size: s,
      });
    }
  }

  private shake(amp: number): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  private slashEffect(fwd: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.12, 6, 18, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.PI / 2;
    ring.position.copy(this.pos).add(new THREE.Vector3(0, 1.2, 0)).add(fwd.multiplyScalar(1));
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 220;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 0.8);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private ringEffect(color: number, radius: number): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.4, 0.16, 6, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.pos).add(new THREE.Vector3(0, 0.5, 0));
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 420;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 2.2);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private ringEffectAt(at: THREE.Vector3, color: number, radius: number): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.5, 0.1, 6, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(at);
    this.scene.add(ring);
    const t0 = performance.now();
    const anim = () => {
      if (this.disposed) { this.scene.remove(ring); return; }
      const t = (performance.now() - t0) / 300;
      if (t >= 1) { this.scene.remove(ring); return; }
      ring.scale.setScalar(1 + t * 1.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      requestAnimationFrame(anim);
    };
    anim();
  }

  private floatText(at: THREE.Vector3, text: string, color: string, scale = 1): void {
    const spr = makeTextSprite(text, { size: 44, color });
    spr.scale.set(1.7 * scale, 0.42 * scale, 1);
    spr.position.copy(at);
    this.scene.add(spr);
    this.floats.push({ sprite: spr, t: 0, life: 0.95 });
  }

  // ── Interação com objetos ───────────────────────────────────

  interact(): void {
    if (!this.near) return;
    const it = this.near;
    if (it.kind === "voucher") {
      if (it.used) {
        this.opts.onEvent({ type: "notify", msg: "Este baú já foi aberto — procura outro!", tone: "info" });
        return;
      }
      it.used = true;
      worldAudio.play("chest");
      if (it.lid) {
        const lid = it.lid;
        const t0 = performance.now();
        const anim = () => {
          if (this.disposed) return;
          const t = Math.min(1, (performance.now() - t0) / 350);
          lid.rotation.x = -1.25 * t;
          if (t < 1) requestAnimationFrame(anim);
        };
        anim();
      }
      if (it.icon) it.icon.visible = false;
      this.opts.onEvent({ type: "open", kind: "voucher", id: it.id });
      this.opts.onEvent({ type: "quest", kind: "chest" });
    } else if (it.kind === "fountain") {
      this.hp = this.opts.stats.maxHp;
      worldAudio.play("heal");
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
      this.opts.onEvent({ type: "notify", msg: "⛲ Vida restaurada pela Fonte da Vida!", tone: "good" });
      this.burst(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0x34d399, 18, 3, 0.7, 0.1, 3);
    } else if (it.kind === "bank") {
      this.opts.onEvent({ type: "open", kind: "bank", id: "bank" });
    } else if (it.kind === "arena") {
      if (this.arena.active) {
        this.endArena("quit");
      } else {
        this.opts.onEvent({ type: "open", kind: "arena", id: "arena" });
      }
    } else {
      if (it.kind !== "games") this.opts.onEvent({ type: "quest", kind: "visit" });
      this.opts.onEvent({ type: "open", kind: it.kind, id: it.id });
    }
    this.near = null;
    this.opts.onEvent({ type: "near", label: null });
  }

  resetChest(id: string): void {
    const it = this.interactables.find((i) => i.id === id);
    if (it) { it.used = false; if (it.icon) it.icon.visible = true; }
  }

  // ── API pública para o React ────────────────────────────────

  syncStats(stats: EngineStats, level: number): void {
    this.opts.stats = stats;
    this.opts.level = level;
    if (this.hp > stats.maxHp) this.hp = stats.maxHp;
    // atualizar etiqueta de nome com o novo nível
    const tag = this.player.children.find((c) => c.name === "nameTag") as THREE.Sprite | undefined;
    if (tag) {
      const wantText = `${this.opts.name} · Nv${level}`;
      if ((tag as any).__txt !== wantText) {
        (tag as any).__txt = wantText;
        const nm = makeTextSprite(wantText, { size: 30, bg: true });
        tag.material.dispose();
        tag.material = nm.material;
      }
    }
  }

  healFull(): void {
    this.hp = this.opts.stats.maxHp;
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
  }

  getMinimap(): {
    px: number; pz: number; yaw: number;
    mobs: { x: number; z: number; t: number }[];
    pois: { x: number; z: number; k: string }[];
    players: { x: number; z: number }[];
    marks: { id: string; x: number; z: number; found: boolean }[];
  } {
    return {
      px: this.pos.x, pz: this.pos.z, yaw: this.camYaw,
      mobs: this.mobs.filter((m) => m.state !== "dead").map((m) => ({ x: m.group.position.x, z: m.group.position.z, t: m.tier })),
      pois: [
        { x: 0, z: -52, k: "raffle" }, { x: 52, z: 0, k: "asset" },
        { x: -52, z: 0, k: "contest" }, { x: 0, z: 52, k: "voucher" }, { x: 8, z: 8, k: "games" },
        { x: -14, z: -14, k: "bank" }, { x: 112, z: 0, k: "arena" },
      ],
      players: [...this.remotes.values()].map((r) => ({ x: r.group.position.x, z: r.group.position.z })),
      marks: LANDMARKS.map((l) => ({ id: l.id, x: l.x, z: l.z, found: this.discovered.has(l.id) })),
    };
  }

  // ── Descobertas ─────────────────────────────────────────────

  private checkDiscoveries(t: number): void {
    if (t < this.discoverCheckT) return;
    this.discoverCheckT = t + 500;
    for (const l of LANDMARKS) {
      if (this.discovered.has(l.id)) continue;
      if (Math.hypot(this.pos.x - l.x, this.pos.z - l.z) <= l.r) {
        this.discovered.add(l.id);
        worldAudio.play("discover");
        this.discoverFx();
        this.opts.onEvent({ type: "discover", id: l.id, name: l.name, emoji: l.emoji, xp: 60 });
      }
    }
  }

  // ── Loop ────────────────────────────────────────────────────

  private isMoving(): boolean {
    return this.keys.has("w") || this.keys.has("arrowup") || this.keys.has("s") || this.keys.has("arrowdown") ||
      this.keys.has("a") || this.keys.has("arrowleft") || this.keys.has("d") || this.keys.has("arrowright") ||
      Math.abs(this.joy.x) > 0.1 || Math.abs(this.joy.y) > 0.1;
  }

  private loop = (t: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    this.updatePlayer(dt);
    this.updateMobs(t, dt);
    this.updateProjectiles(dt);
    this.updateOrbs(dt);
    this.updateParticles(dt);
    this.updateFloats(dt);
    this.updateInteractables(t);
    this.updateRemotes(dt);
    this.updateDayNight(t, dt);
    this.updateSkyV3(t, dt);
    this.updateHeroV3(dt);
    this.updatePet(dt);
    this.updateLoot(dt);
    this.updateArena(t);
    this.updateCamera(dt);
    this.checkDiscoveries(t);

    for (let i = 0; i < 3; i++) this.skillCds[i] = Math.max(0, this.skillCds[i] - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);

    // regeneração fora de combate + círculo de cura
    const now = performance.now();
    if (!this.dead && t - this.lastHitAt > 5000 && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.06 * dt);
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    }
    if (!this.dead && now < this.hotUntil) {
      this.hotTick += dt;
      if (this.hotTick >= 1) {
        this.hotTick = 0;
        const heal = Math.round(this.opts.stats.maxHp * 0.05);
        if (this.hp < this.opts.stats.maxHp) {
          this.hp = Math.min(this.opts.stats.maxHp, this.hp + heal);
          this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
          this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `+${heal}`, "#34d399", 0.85);
        }
      }
    }
    // Fonte da Vida: cura passiva por proximidade
    if (!this.dead && Math.hypot(this.pos.x - 14, this.pos.z - (-14)) < 5 && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.04 * dt);
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    }

    this.renderFrame();
  };

  /** Renderiza um frame (composer quando disponível). */
  private renderFrame(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  // ── v4: atualização da arena ─────────────────────────────

  private updateArena(t: number): void {
    if (!this.arena.active) return;
    // sair da arena pelo limite
    const d = Math.hypot(this.pos.x - ARENA_CENTER.x, this.pos.z - ARENA_CENTER.z);
    if (d > ARENA_RADIUS + 8) { this.endArena("exit"); return; }
    if (this.arena.cooldown) {
      if (t >= this.arena.nextWaveAt) this.arenaNextWave();
    } else if (this.arena.alive <= 0 && this.arena.wave > 0) {
      // onda limpa — recompensa e prepara a próxima
      const bonusPts = 5 + this.arena.wave * 3;
      const bonusGold = 60 + this.arena.wave * 40;
      this.arena.pts += bonusPts;
      this.arena.gold += bonusGold;
      this.arena.cooldown = true;
      this.arena.nextWaveAt = t + 2600;
      if (this.arenaRing) (this.arenaRing.material as THREE.MeshBasicMaterial).color.setHex(0x4ade80);
      this.ringEffectAt(ARENA_CENTER.clone(), 0x4ade80, 9);
      this.opts.onEvent({ type: "arena", action: "cleared", wave: this.arena.wave, pts: bonusPts, gold: bonusGold });
    } else if (this.arena.wave === 0 && t >= this.arena.nextWaveAt) {
      this.arenaNextWave();
    }
  }

  private updatePlayer(dt: number): void {
    const k = this.keys;
    let ix = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    let iy = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    ix += this.joy.x;
    iy += -this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    const speed = (4 + this.opts.stats.spd * 0.35) * (this.dead ? 0 : 1);
    const fwd = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3(fwd.z * -1, 0, fwd.x);
    const move = new THREE.Vector3()
      .addScaledVector(fwd, iy)
      .addScaledVector(right, ix);

    if (move.lengthSq() > 0.001 && !this.dead) {
      move.normalize();
      this.pos.addScaledVector(move, speed * dt);
      const targetRy = Math.atan2(move.x, move.z);
      let diff = targetRy - this.player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.rotation.y += diff * Math.min(1, dt * 12);
      this.moveDirFace.copy(move);
      this.bob += dt * 10;
      // poeira ao correr
      this.dustTimer += dt;
      if (this.dustTimer > 0.22 && this.onGround) {
        this.dustTimer = 0;
        this.burst(this.pos.clone(), 0xcbb99a, 2, 0.9, 0.4, 0.06, 1.5);
      }
    }

    // limite do mundo
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD_RADIUS) {
      this.pos.x *= WORLD_RADIUS / r;
      this.pos.z *= WORLD_RADIUS / r;
    }

    // gravidade / salto
    const gy = groundY(this.pos.x, this.pos.z);
    if (!this.onGround) {
      this.vy -= 16 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= gy) {
        this.pos.y = gy; this.vy = 0; this.onGround = true;
        this.landSquash = 1; // v3: squash ao aterrar
        this.burst(this.pos.clone(), 0xcbb99a, 4, 1.4, 0.4, 0.06, 2);
      }
    } else {
      this.pos.y = gy;
    }

    this.player.position.copy(this.pos);
    if (this.onGround && move.lengthSq() > 0.001) {
      this.player.position.y += Math.abs(Math.sin(this.bob)) * 0.06;
    }
    this.playerShadow.position.set(this.pos.x, gy + 0.03, this.pos.z);
  }

  private updateMobs(t: number, dt: number): void {
    const now = performance.now();
    for (const m of this.mobs) {
      if (m.state === "dead") {
        if (t >= m.respawnAt) {
          m.state = "idle";
          m.hp = m.maxHp;
          m.group.visible = true;
          m.group.position.copy(m.home);
          this.drawMobHp(m);
        }
        continue;
      }
      m.bob += dt * 4;
      const gp = m.group.position;
      const distP = Math.hypot(this.pos.x - gp.x, this.pos.z - gp.z);
      const aggro = m.arena ? 200 : m.isBoss ? 13 : m.isGuard ? 10 : 8.5;
      const spd = now < m.slowUntil ? m.speed * 0.4 : m.speed;

      if (m.state === "idle") {
        if (m.arena) {
          // mobs da arena nascem já agressivos
          m.state = "chase";
        } else if (distP < aggro && !this.dead && Math.hypot(this.pos.x, this.pos.z) > (m.isGuard ? 12 : PVP_SAFE_RADIUS)) {
          m.state = "chase";
          // v3: anel de aviso + som quando o inimigo te nota
          this.ringEffectAt(m.group.position.clone().add(new THREE.Vector3(0, 0.15, 0)), m.isBoss ? 0xdc2626 : 0xf97316, m.isBoss ? 4.5 : 2.8);
          if (m.isBoss) { worldAudio.play("boss"); this.opts.onEvent({ type: "notify", msg: `👑 ${m.name} reparou em ti!`, tone: "bad" }); }
        } else if (t > m.nextThink) {
          m.nextThink = t + 2200 + Math.random() * 2600;
          m.target.copy(m.home).add(new THREE.Vector3((Math.random() - 0.5) * 7, 0, (Math.random() - 0.5) * 7));
        }
      }

      if (m.state === "chase") {
        if (!m.arena && (this.dead || distP > aggro + 9 || Math.hypot(gp.x, gp.z) < (m.isGuard ? 13 : 20))) {
          m.state = "return";
        } else if (distP < 1.7) {
          // atacar
          if (now < m.stunUntil) { /* atordoado */ }
          else {
            m.atkCd -= dt;
            if (m.atkCd <= 0) {
              m.atkCd = 1.4;
              this.hurtPlayer(m.atk * (0.8 + Math.random() * 0.4), m);
            }
          }
        } else if (now >= m.stunUntil) {
          const dir = new THREE.Vector3(this.pos.x - gp.x, 0, this.pos.z - gp.z).normalize();
          gp.x += dir.x * spd * dt;
          gp.z += dir.z * spd * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "return") {
        const dir = new THREE.Vector3(m.home.x - gp.x, 0, m.home.z - gp.z);
        if (dir.length() < 0.5) { m.state = "idle"; m.hp = m.maxHp; this.drawMobHp(m); }
        else {
          dir.normalize();
          gp.x += dir.x * spd * dt;
          gp.z += dir.z * spd * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "idle") {
        const dir = new THREE.Vector3(m.target.x - gp.x, 0, m.target.z - gp.z);
        if (dir.length() > 0.4) {
          dir.normalize();
          gp.x += dir.x * spd * 0.45 * dt;
          gp.z += dir.z * spd * 0.45 * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      gp.y = groundY(gp.x, gp.z);
      m.group.children[0].position.y = 0.75 + Math.abs(Math.sin(m.bob)) * 0.12;
    }
  }

  private hurtPlayer(rawDmg: number, m: Mob): void {
    if (this.dead || performance.now() < this.invulnUntil) return;
    const dmg = Math.max(1, Math.round(rawDmg * 0.9));
    this.hp -= dmg;
    this.lastHitAt = performance.now();
    worldAudio.play("hurt");
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp, hit: true });
    this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), `-${dmg}`, "#f87171", 1.1);
    this.shake(0.1);
    if (this.hp <= 0) {
      this.dead = true;
      this.shake(0.4);
      worldAudio.play("death");
      // v4: morte na arena termina a sessão de ondas
      if (this.arena.active) this.endArena("death");
      this.opts.onEvent({ type: "death", by: m.name });
      setTimeout(() => {
        if (this.disposed) return;
        this.pos.set(0, groundY(0, 6), 6);
        this.hp = this.opts.stats.maxHp;
        this.dead = false;
        this.invulnUntil = performance.now() + 3000;
        this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
        this.opts.onEvent({ type: "notify", msg: "De volta à Praça Bateu! Cuidado com os bugs.", tone: "info" });
      }, 1400);
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.target && p.target.state === "dead") p.target = null;
      const dest = p.target
        ? p.target.group.position.clone().add(new THREE.Vector3(0, 0.8, 0))
        : p.mesh.position.clone().add(p.mesh.getWorldDirection(new THREE.Vector3()));
      const dir = dest.sub(p.mesh.position);
      const dist = dir.length();
      if (p.target && dist < 1.2) {
        this.damageMob(p.target, p.dmg, Math.random() < 0.12);
        if (p.kind === "orb") this.ringEffectAt(p.mesh.position, 0xff7b00, 1.4);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || (!p.target && dist > 30)) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }
      dir.normalize();
      p.mesh.position.addScaledVector(dir, p.speed * dt);
      p.mesh.lookAt(p.mesh.position.clone().add(dir));
      if (p.trailColor !== null && Math.random() < 0.55 && this.particles.length < 380) {
        this.burst(p.mesh.position.clone(), p.trailColor, 1, 0.3, 0.3, 0.055, 0.5);
      }
    }
  }

  private updateOrbs(dt: number): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt * 2.2;
      if (o.t >= 1) {
        this.opts.onEvent({ type: "gain", gold: o.gold, xp: Math.round(o.xp * o.mult) });
        worldAudio.play("coin");
        this.burst(o.mesh.position.clone(), 0xfbbf24, 3, 1.2, 0.3, 0.05, 2);
        this.scene.remove(o.mesh);
        this.orbs.splice(i, 1);
        continue;
      }
      const dest = this.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
      o.mesh.position.lerpVectors(o.from, dest, smooth01(o.t));
      o.mesh.position.y += Math.sin(o.t * Math.PI) * 0.6;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const fade = 1 - p.t / p.life;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = fade;
      p.mesh.scale.setScalar(Math.max(0.05, (p.size / 0.09) * fade));
    }
  }

  private updateFloats(dt: number): void {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t >= f.life) {
        this.scene.remove(f.sprite);
        (f.sprite.material as THREE.SpriteMaterial).map?.dispose();
        this.floats.splice(i, 1);
        continue;
      }
      f.sprite.position.y += dt * 1.4;
      (f.sprite.material as THREE.SpriteMaterial).opacity = 1 - f.t / f.life;
    }
  }

  private updateInteractables(t: number): void {
    let best: Interactable | null = null;
    let bestD = 3.4;
    for (const it of this.interactables) {
      if (it.icon && it.kind !== "voucher") {
        it.icon.position.y = (it.kind === "raffle" ? 3.6 : it.kind === "bank" ? 3.9 : it.kind === "fountain" ? 3.6 : 2.1) + Math.sin(t / 400 + it.pos.x) * 0.18;
      }
      const d = Math.hypot(this.pos.x - it.pos.x, this.pos.z - it.pos.z);
      if (d < bestD) { bestD = d; best = it; }
    }
    if (best !== this.near) {
      this.near = best;
      this.opts.onEvent({ type: "near", label: best ? best.label : null });
    }
  }

  private updateRemotes(dt: number): void {
    const now = performance.now();
    for (const [id, r] of this.remotes) {
      if (now - r.lastSeen > 45000) {
        this.remoteGroup.remove(r.group);
        this.remotes.delete(id);
        continue;
      }
      const g = r.group;
      g.position.x = lerp(g.position.x, r.target.x, Math.min(1, dt * 6));
      g.position.z = lerp(g.position.z, r.target.z, Math.min(1, dt * 6));
      g.position.y = groundY(g.position.x, g.position.z);
      let diff = r.targetRy - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 8);
    }
  }

  private updateDayNight(t: number, dt: number): void {
    const phase = (t % DAY_LEN) / DAY_LEN; // 0..1
    const dayAmt = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2); // 1=meio-dia, 0=meia-noite
    // v4: paleta em 4 fases (dia / entardecer / noite / amanhecer)
    const cNoon = new THREE.Color(0x87ceeb);
    const cDusk = new THREE.Color(0xf59e6b);
    const cNight = new THREE.Color(0x0b1026);
    const cDawn = new THREE.Color(0xf9a8d4);
    const sky = new THREE.Color();
    if (dayAmt > 0.55) {
      sky.copy(cDusk).lerp(cNoon, smooth01((dayAmt - 0.55) / 0.45));
    } else if (dayAmt > 0.3) {
      sky.copy(cNight).lerp(cDusk, smooth01((dayAmt - 0.3) / 0.25));
    } else {
      // entre noite funda e amanhecer rosado
      const dawnW = Math.max(0, Math.sin((0.5 - Math.abs(dayAmt - 0.24) * 6)) * 0.5 + 0.5);
      sky.copy(cNight).lerp(cDawn, smooth01(dawnW * 0.5) * smooth01((dayAmt + 0.15) / 0.3));
    }
    this.scene.background = sky;
    (this.scene.fog as THREE.FogExp2).color.copy(sky);
    this.hemi.intensity = 0.35 + dayAmt * 0.65;
    this.sun.intensity = 0.25 + dayAmt * 0.95;
    // luz do sol aquecida ao entardecer
    this.sun.color.setHex(dayAmt < 0.55 && dayAmt > 0.2 ? 0xffb27a : 0xfff3d6);
    const ang = phase * Math.PI * 2;
    this.sun.position.set(Math.cos(ang) * 80, 30 + dayAmt * 60, Math.sin(ang) * 80);
    // v3: sol e lua seguem o ciclo
    if (this.sunSpr) {
      this.sunSpr.position.set(this.pos.x + Math.cos(ang) * 180, 40 + dayAmt * 130, this.pos.z + Math.sin(ang) * 180);
      (this.sunSpr.material as THREE.SpriteMaterial).opacity = Math.max(0.15, dayAmt);
    }
    if (this.moonSpr) {
      this.moonSpr.position.set(this.pos.x - Math.cos(ang) * 180, 40 + (1 - dayAmt) * 130, this.pos.z - Math.sin(ang) * 180);
      (this.moonSpr.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - dayAmt * 1.6);
    }
    // v3: estrelas aparecem ao anoitecer
    if (this.stars) {
      (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - dayAmt * 1.8);
      this.stars.rotation.y = t * 0.00002;
    }
    // v3: domo do céu acompanha o jogador (dá sensação de infinito)
    if (this.skyDome) {
      this.skyDome.position.set(this.pos.x, 0, this.pos.z);
      const u = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
      u.top.value.copy(sky).lerp(new THREE.Color(0x1b4c8c), dayAmt * 0.7);
      u.mid.value.copy(sky);
      u.bot.value.copy(sky).lerp(new THREE.Color(0xffffff), 0.18);
    }
    // v4: estrelas cadentes à noite
    for (const s of this.shootStars) {
      if (!s.active) {
        if (dayAmt < 0.25 && t > s.next) {
          s.active = true;
          s.t = 0;
          s.dur = 0.9 + Math.random() * 0.6;
          const a = Math.random() * Math.PI * 2;
          s.from.set(this.pos.x + Math.cos(a) * 120, 90 + Math.random() * 40, this.pos.z + Math.sin(a) * 120);
          s.to.copy(s.from).add(new THREE.Vector3((Math.random() - 0.5) * 90, -40 - Math.random() * 25, (Math.random() - 0.5) * 90));
          s.next = t + 4000 + Math.random() * 9000;
        }
        continue;
      }
      s.t += dt;
      const k = s.t / s.dur;
      if (k >= 1) { s.active = false; (s.spr.material as THREE.SpriteMaterial).opacity = 0; continue; }
      s.spr.position.lerpVectors(s.from, s.to, k);
      (s.spr.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.9;
    }
    // vaga-lumes só à noite
    const ffOpacity = Math.max(0, 0.9 - dayAmt * 2.2);
    for (const ff of this.fireflies) {
      ff.spr.material.opacity = ffOpacity;
      if (ffOpacity <= 0) continue;
      ff.a += ff.s * dt * 60;
      const x = Math.cos(ff.a) * ff.r;
      const z = Math.sin(ff.a) * ff.r;
      ff.spr.position.set(x, ff.y0 + Math.sin(t / 900 + ff.r) * 0.4, z);
    }
  }

  // ── v3: céu vivo (nuvens, borboletas, água, fonte) ──────────

  private updateSkyV3(t: number, dt: number): void {
    // nuvens a derivar
    for (const c of this.clouds) {
      c.g.position.x += c.spd * dt;
      if (c.g.position.x > 220) c.g.position.x = -220;
    }
    // borboletas só de dia
    const phase = (t % DAY_LEN) / DAY_LEN;
    const dayAmt = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    const bfOp = Math.max(0, dayAmt * 1.4 - 0.4);
    for (const b of this.butterflies) {
      b.spr.material.opacity = bfOp;
      if (bfOp <= 0) continue;
      b.a += b.s * dt * 60;
      const x = Math.cos(b.a) * b.r;
      const z = Math.sin(b.a) * b.r;
      b.spr.position.set(x, b.y0 + Math.sin(t / 500 + b.r) * 0.5, z);
    }
    // lago: ondulação suave
    if (this.lakeWater) {
      this.rippleT += dt;
      const s = 1 + Math.sin(this.rippleT * 1.6) * 0.012;
      this.lakeWater.scale.set(s, 1, s);
      (this.lakeWater.material as THREE.MeshBasicMaterial).opacity = 0.62 + Math.sin(this.rippleT * 2.2) * 0.08;
    }
    // fonte: jactos de partículas de vez em quando
    this.fountainT += dt;
    if (this.fountainT > 0.5) {
      this.fountainT = 0;
      if (this.particles.length < 340) {
        const at = new THREE.Vector3(14, groundY(14, -14) + 2.5, -14);
        this.burst(at, 0x6ee7b7, 2, 1.1, 0.55, 0.05, 3.4);
      }
    }
  }

  // ── v3: herói vivo (arma, capa, escudo, emote) ──────────────

  private updateHeroV3(dt: number): void {
    // animação de golpe da arma (rotação rápida com easing)
    if (this.swingT > 0) {
      this.swingT += dt * 5.2;
      if (this.swingT >= 1) { this.swingT = 0; }
      else if (this.weaponPivot) {
        const e = Math.sin(this.swingT * Math.PI);
        this.weaponPivot.rotation.x = -e * 2.1;
      }
    } else if (this.weaponPivot) {
      // posição de repouso com leve balanço ao andar
      const rest = this.isMoving() ? Math.sin(this.bob) * 0.14 : Math.sin(performance.now() / 600) * 0.05;
      this.weaponPivot.rotation.x = rest;
    }
    // capa esvoaçante
    if (this.capeMesh) {
      const mv = this.isMoving() ? 1 : 0.4;
      this.capeMesh.rotation.x = 0.16 + Math.sin(performance.now() / 140) * 0.09 * mv + (this.isMoving() ? 0.3 : 0);
    }
    // squash ao aterrar (escala Y comprimida que recupera)
    if (this.landSquash > 0) {
      this.landSquash = Math.max(0, this.landSquash - dt * 4.5);
      const s = this.landSquash;
      const body = this.player.children.find((c) => c.name === "body") as THREE.Mesh | undefined;
      if (body) body.scale.set(1 + s * 0.18, 1 - s * 0.22, 1 + s * 0.18);
    }
    // anel de escudo: roda e apaga quando expira
    const myRing = this.player.children.find((c) => c.name === "myShield") as THREE.Mesh | undefined;
    if (myRing) {
      const on = this.shielded;
      myRing.visible = on;
      if (on) myRing.rotation.z += dt * 1.6;
    }
    // aura da classe pulsa mais forte com buff de ataque
    const buffed = performance.now() < this.atkBuffUntil;
    this.classAura.intensity = 8 + (buffed ? 14 + Math.sin(performance.now() / 90) * 6 : Math.sin(performance.now() / 700) * 1.5);
    // emote flutua e desvanece
    if (this.emoteSprite) {
      if (performance.now() > this.emoteUntil) {
        this.scene.remove(this.emoteSprite);
        this.emoteSprite = null;
      } else {
        const remain = (this.emoteUntil - performance.now()) / 2200;
        this.emoteSprite.position.set(this.pos.x, this.pos.y + 3.6 + (1 - remain) * 0.8, this.pos.z);
        (this.emoteSprite.material as THREE.SpriteMaterial).opacity = Math.min(1, remain * 3);
      }
    }
  }

  private updateCamera(dt: number): void {
    const target = new THREE.Vector3(
      this.pos.x + Math.sin(this.camYaw) * this.camDist,
      this.pos.y + 5.5 + this.camDist * 0.32,
      this.pos.z + Math.cos(this.camYaw) * this.camDist
    );
    this.camPos.lerp(target, Math.min(1, dt * 5));
    this.camera.position.copy(this.camPos);
    if (this.shakeAmp > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.max(0, 1 - dt * 6);
    }
    this.camera.lookAt(this.pos.x, this.pos.y + 1.6, this.pos.z);
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearInterval(this.posTimer);
    this.resizeObs?.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    try { this.chan?.unsubscribe(); } catch { /* ignore */ }
    try { this.renderer.dispose(); } catch { /* ignore */ }
    try { (supabase as any).removeChannel?.(this.chan); } catch { /* ignore */ }
    this.scene?.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); });
      }
    });
  }
}
