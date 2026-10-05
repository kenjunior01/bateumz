// ============================================================
// BATEU WORLD — Motor 3D em tempo real (estilo Hordes.io)
// Three.js: mundo aberto low-poly, combate em tempo real,
// multiplayer via Supabase Realtime (broadcast + presence),
// objetos interativos = conteúdo REAL da plataforma.
// ============================================================

import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";

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
}

interface Projectile {
  mesh: THREE.Mesh;
  target: Mob | null;
  speed: number;
  dmg: number;
  life: number;
  kind: "orb" | "arrow";
}

interface Orb {
  mesh: THREE.Mesh;
  t: number;
  gold: number;
  xp: number;
  from: THREE.Vector3;
}

interface FloatText {
  sprite: THREE.Sprite;
  t: number;
  life: number;
}

interface Interactable {
  group: THREE.Group;
  kind: "raffle" | "contest" | "voucher" | "asset" | "games";
  id: string;
  label: string;
  pos: THREE.Vector3;
  used: boolean;
  lid?: THREE.Mesh;
  icon?: THREE.Sprite;
}

interface RemotePlayer {
  group: THREE.Group;
  target: THREE.Vector3;
  targetRy: number;
  moving: boolean;
  lastSeen: number;
  name: string;
}

const MOB_TIERS = [
  { hp: 40, atk: 6, xp: 14, gold: 10, speed: 2.2, color: 0x4ade80, name: "Bug Verde", scale: 1 },
  { hp: 95, atk: 12, xp: 34, gold: 24, speed: 2.8, color: 0xf97316, name: "Bug Laranja", scale: 1.25 },
  { hp: 190, atk: 20, xp: 75, gold: 55, speed: 3.3, color: 0xa855f7, name: "Bug Sombrio", scale: 1.5 },
];

const CLASS_COLORS = [0xef4444, 0x8b5cf6, 0x22c55e, 0x06b6d4];
const WORLD_RADIUS = 148;
const DAY_LEN = 240000; // ms

function groundY(x: number, z: number): number {
  const base =
    1.5 * Math.sin(x * 0.045) * Math.cos(z * 0.038) +
    0.7 * Math.sin(x * 0.11 + 2) * Math.sin(z * 0.09 + 1) +
    0.4 * Math.sin((x + z) * 0.02);
  // Zonas planas: praça + POIs
  const pois: [number, number][] = [[0, 0], [0, -52], [52, 0], [-52, 0], [0, 52]];
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
  private floats: FloatText[] = [];
  private interactables: Interactable[] = [];
  private remotes = new Map<string, RemotePlayer>();
  private chan: any = null;
  private posTimer: any = null;
  private remoteGroup!: THREE.Group;

  private atkCd = 0;
  private skillCd = 0;
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

  // geometrias partilhadas
  private geoBody!: THREE.CapsuleGeometry;
  private geoHead!: THREE.SphereGeometry;
  private geoOrb!: THREE.SphereGeometry;
  private geoShadow!: THREE.CircleGeometry;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));

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
    this.buildShared();
    this.buildPlaza();
    this.buildPOIs();
    this.buildNature();
    this.buildPlayer();
    this.buildMobs();
    this.buildNet();

    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.canvas.parentElement || this.canvas);
    this.resize();

    this.lastT = performance.now();
    this.loop(this.lastT);
    this.opts.onEvent({ type: "ready" });
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

  private buildShared(): void {
    this.geoBody = new THREE.CapsuleGeometry(0.38, 0.75, 4, 10);
    this.geoHead = new THREE.SphereGeometry(0.3, 12, 10);
    this.geoOrb = new THREE.SphereGeometry(0.16, 8, 8);
    this.geoShadow = new THREE.CircleGeometry(0.55, 16);
    this.geoShadow.rotateX(-Math.PI / 2);
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

  // ── Objetos de plataforma (populados pelo React) ───────────

  spawnPlatformObjects(data: {
    raffles: { id: string; title: string; prizeTitle: string }[];
    contests: { id: string; title: string; prize?: string }[];
    vouchers: { id: string; code: string; label: string }[];
    assets: { id: string; title: string; value: number; modality: string }[];
  }): void {
    // Cristais de sorteios — arco no templo (norte)
    const nR = Math.min(data.raffles.length, 8);
    for (let i = 0; i < nR; i++) {
      const r = data.raffles[i];
      const a = (-Math.PI / 2) * (i / Math.max(1, nR - 1)) - Math.PI * 0.25;
      const x = Math.cos(a) * 9;
      const z = -52 + Math.sin(a) * 9;
      this.addCrystal(r.id, r.title, x, z, 0xc084fc, "🎁");
    }
    if (nR === 0) this.addCrystal("none", "Sem sorteios ativos", 0, -52, 0x64748b, "🎁");

    // Bancas da feira — este
    const nA = Math.min(data.assets.length, 6);
    for (let i = 0; i < nA; i++) {
      const it = data.assets[i];
      const z = (i - (nA - 1) / 2) * 4.4;
      this.addStall(it.id, it.title, 52, z);
    }

    // Painéis de concursos — oeste
    const nC = Math.min(data.contests.length, 4);
    for (let i = 0; i < nC; i++) {
      const it = data.contests[i];
      const z = (i - (nC - 1) / 2) * 5.4;
      this.addBillboard(it.id, it.title, -52, z);
    }

    // Baús de cupões — sul
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
    while (placed < N && guard++ < 500) {
      const a = Math.random() * Math.PI * 2;
      const r = 24 + Math.random() * 118;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 6 || Math.abs(z) < 6) continue;
      if (Math.hypot(x, z - 52) < 16 || Math.hypot(x - 52, z) < 16 || Math.hypot(x + 52, z) < 16) continue;
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
    while (rp < 60 && guard++ < 500) {
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

    // Arbustos low-poly (toque Hordes.io no vale)
    const bushGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const bushMat = new THREE.MeshLambertMaterial({ color: 0x40916c });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 50);
    let bp = 0;
    guard = 0;
    while (bp < 50 && guard++ < 400) {
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
  }

  // ── Jogador ─────────────────────────────────────────────────

  private buildPlayer(): void {
    const g = new THREE.Group();
    const color = CLASS_COLORS[this.opts.classId] ?? 0xef4444;
    const body = new THREE.Mesh(this.geoBody, new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.05;
    const head = new THREE.Mesh(this.geoHead, new THREE.MeshLambertMaterial({ color: 0xf5d0a9 }));
    head.position.y = 1.95;
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.09, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x111827 })
    );
    visor.position.set(0, 2.0, 0.28);
    const nameSpr = makeTextSprite(`${this.opts.name} · Nv${this.opts.level}`, { size: 30, bg: true });
    nameSpr.scale.set(3.6, 0.9, 1);
    nameSpr.position.y = 2.9;
    g.add(body, head, visor, nameSpr);
    this.player = g;
    this.scene.add(g);
    this.playerShadow = this.addShadow(this.pos.x, 0, this.pos.z, 1.1);
    const pLight = new THREE.PointLight(color, 8, 8);
    pLight.position.y = 2.4;
    g.add(pLight);
  }

  private buildMobs(): void {
    const defs: { tier: number; count: number; boss?: boolean; pos?: [number, number] }[] = [
      { tier: 0, count: 12 },
      { tier: 1, count: 9 },
      { tier: 2, count: 5 },
      { tier: 2, count: 1, boss: true, pos: [112, -112] },
    ];
    for (const d of defs) {
      for (let i = 0; i < d.count; i++) {
        let x: number, z: number;
        if (d.pos) { [x, z] = d.pos; }
        else {
          const a = Math.random() * Math.PI * 2;
          const r = d.tier === 0 ? 30 + Math.random() * 26 : d.tier === 1 ? 62 + Math.random() * 40 : 108 + Math.random() * 30;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
        }
        this.spawnMob(d.tier, x, z, !!d.boss);
      }
    }
  }

  private spawnMob(tier: number, x: number, z: number, boss = false): void {
    const t = MOB_TIERS[tier];
    const g = new THREE.Group();
    const scale = boss ? 2.4 : t.scale;
    const mat = new THREE.MeshLambertMaterial({ color: boss ? 0xdc2626 : t.color });
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
    g.add(body, e1, e2, p1, p2);

    const hpCanvas = document.createElement("canvas");
    hpCanvas.width = 64; hpCanvas.height = 10;
    const hpTex = new THREE.CanvasTexture(hpCanvas);
    const hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, depthWrite: false }));
    hpBar.scale.set(1.6, 0.25, 1);
    hpBar.position.y = 1.7 * scale + 0.35;
    g.add(hpBar);

    const y = groundY(x, z);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.addShadow(x, y, z, scale);

    const mult = boss ? 10 : 1;
    const mob: Mob = {
      group: g, hpBar, hpCanvas, hpTex,
      tier, isBoss: boss,
      hp: t.hp * mult, maxHp: t.hp * mult,
      atk: Math.round(t.atk * (boss ? 3 : 1)),
      xp: t.xp * mult, gold: t.gold * mult,
      speed: t.speed * (boss ? 0.8 : 1),
      home: new THREE.Vector3(x, y, z),
      target: new THREE.Vector3(x, y, z),
      state: "idle",
      nextThink: 0, atkCd: 0, respawnAt: 0, hitFlash: 0, bob: Math.random() * 10,
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

  // ── Rede (multiplayer realtime) ─────────────────────────────

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

  private upsertRemote(p: { id: string; n: string; cl?: number; lv?: number; x: number; z: number; ry?: number; mv?: boolean }): void {
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
      g.add(body, head, nameSpr);
      this.remoteGroup.add(g);
      r = { group: g, target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry ?? 0, moving: !!p.mv, lastSeen: performance.now(), name: p.n };
      g.position.set(p.x, groundY(p.x, p.z), p.z);
      this.remotes.set(p.id, r);
      this.opts.onEvent({ type: "playerjoin", name: r.name });
    }
    r.target.set(p.x, 0, p.z);
    r.targetRy = p.ry ?? r.targetRy;
    r.moving = !!p.mv;
    r.lastSeen = performance.now();
  }

  private broadcastPos(): void {
    if (!this.chan || this.disposed) return;
    const payload = {
      id: this.myId, n: this.opts.name, cl: this.opts.classId,
      lv: this.opts.level, x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2),
      ry: +this.player.rotation.y.toFixed(2), mv: this.isMoving(),
    };
    try { this.chan.send({ type: "broadcast", event: "pos", payload }); } catch { /* ignore */ }
  }

  sendChat(msg: string): void {
    if (!this.chan || !msg.trim()) return;
    try {
      this.chan.send({ type: "broadcast", event: "chat", payload: { n: this.opts.name, m: msg.slice(0, 140) } });
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
    }
  }

  // ── Combate ─────────────────────────────────────────────────

  attack(): void {
    if (this.dead || this.atkCd > 0) return;
    this.atkCd = 0.55;
    const cls = this.opts.classId;
    if (cls === 0) this.meleeAttack();
    else if (cls === 1) this.shoot(0xff7b00, 16, 18, "orb");
    else if (cls === 2) this.shoot(0xfde047, 24, 20, "arrow");
    else this.shoot(0x2dd4bf, 14, 16, "orb");
  }

  skill(): void {
    if (this.dead) return;
    if (this.opts.level < 3) {
      this.opts.onEvent({ type: "skill", ok: false, reason: "locked" });
      return;
    }
    if (this.skillCd > 0) {
      this.opts.onEvent({ type: "skill", ok: false, reason: "cd", remain: Math.ceil(this.skillCd) });
      return;
    }
    this.skillCd = 8;
    this.ringEffect(0xfbbf24, 4.5);
    const cls = this.opts.classId;
    const mult = cls === 0 ? 2.0 : cls === 1 ? 2.5 : cls === 2 ? 1.6 : 1.8;
    let hits = 0;
    const maxHits = cls === 2 ? 5 : 20;
    const range = cls === 0 ? 4.2 : cls === 1 ? 7 : cls === 2 ? 13 : 8;
    for (const m of this.mobs) {
      if (m.state === "dead" || hits >= maxHits) continue;
      if (m.group.position.distanceTo(this.pos) <= range) {
        this.damageMob(m, this.opts.stats.atk * mult * (0.9 + Math.random() * 0.2), false);
        hits++;
      }
    }
    if (cls === 3) {
      // Onda Vital do Curandeiro: cura 30% da vida máxima
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + Math.round(this.opts.stats.maxHp * 0.3));
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
      this.ringEffect(0x2dd4bf, 6);
      this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), "+vida", "#4ade80", 1.1);
    }
    if (hits > 0) this.opts.onEvent({ type: "skillhit", hits });
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
        this.damageMob(m, this.opts.stats.atk * (0.9 + Math.random() * 0.25), Math.random() < 0.12);
        hitAny = true;
      }
    }
    this.slashEffect(fwd);
    if (!hitAny) this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2, 0)), "miss", "#cbd5e1", 0.8);
  }

  private shoot(color: number, speed: number, range: number, kind: "orb" | "arrow"): void {
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
    this.projectiles.push({ mesh, target: best, speed, dmg: this.opts.stats.atk * (0.9 + Math.random() * 0.25), life: 2.2, kind });
  }

  private damageMob(m: Mob, dmg: number, crit: boolean): void {
    if (m.state === "dead") return;
    const d = Math.max(1, Math.round(dmg * (crit ? 2 : 1)));
    m.hp -= d;
    m.hitFlash = 0.12;
    this.drawMobHp(m);
    const p = m.group.position.clone().add(new THREE.Vector3(0, 1.6 * (m.isBoss ? 2.2 : 1), 0));
    this.floatText(p, crit ? `${d}!` : `${d}`, crit ? "#fde047" : "#ffffff", crit ? 1.3 : 1);
    (m.group.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    setTimeout(() => {
      if (!this.disposed && m.state !== "dead") {
        (m.group.children[0] as THREE.Mesh).material = new THREE.MeshLambertMaterial({
          color: m.isBoss ? 0xdc2626 : MOB_TIERS[m.tier].color,
        });
      }
    }, 90);
    if (m.hp <= 0) this.killMob(m);
  }

  private killMob(m: Mob): void {
    m.state = "dead";
    m.group.visible = false;
    m.respawnAt = performance.now() + (m.isBoss ? 30000 : 8000);
    const gold = Math.round(m.gold * (0.7 + Math.random() * 0.7));
    this.spawnOrbs(m.group.position.clone(), gold, m.xp, m.isBoss ? 5 : 3);
    this.opts.onEvent({ type: "kill", tier: m.tier, gold, xp: m.xp, boss: m.isBoss, name: m.isBoss ? "Bug Rei" : MOB_TIERS[m.tier].name });
  }

  private spawnOrbs(at: THREE.Vector3, gold: number, xp: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geoOrb, new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfbbf24 : 0x4ade80 }));
      mesh.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.6, (Math.random() - 0.5) * 1.4));
      this.scene.add(mesh);
      this.orbs.push({ mesh, t: 0, gold: Math.round(gold / n), xp: Math.round(xp / n), from: mesh.position.clone() });
    }
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
  }

  healFull(): void {
    this.hp = this.opts.stats.maxHp;
    this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
  }

  getMinimap(): { px: number; pz: number; yaw: number; mobs: { x: number; z: number; t: number }[]; pois: { x: number; z: number; k: string }[]; players: { x: number; z: number }[] } {
    return {
      px: this.pos.x, pz: this.pos.z, yaw: this.camYaw,
      mobs: this.mobs.filter((m) => m.state !== "dead").map((m) => ({ x: m.group.position.x, z: m.group.position.z, t: m.tier })),
      pois: [
        { x: 0, z: -52, k: "raffle" }, { x: 52, z: 0, k: "asset" },
        { x: -52, z: 0, k: "contest" }, { x: 0, z: 52, k: "voucher" }, { x: 8, z: 8, k: "games" },
      ],
      players: [...this.remotes.values()].map((r) => ({ x: r.group.position.x, z: r.group.position.z })),
    };
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
    this.updateFloats(dt);
    this.updateInteractables(t);
    this.updateRemotes(dt);
    this.updateDayNight(t);
    this.updateCamera(dt);

    this.atkCd = Math.max(0, this.atkCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);

    // regeneração fora de combate
    if (!this.dead && t - this.lastHitAt > 5000 && this.hp < this.opts.stats.maxHp) {
      this.hp = Math.min(this.opts.stats.maxHp, this.hp + this.opts.stats.maxHp * 0.06 * dt);
      this.opts.onEvent({ type: "hp", hp: this.hp, maxHp: this.opts.stats.maxHp });
    }

    this.renderer.render(this.scene, this.camera);
  };

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
      if (this.pos.y <= gy) { this.pos.y = gy; this.vy = 0; this.onGround = true; }
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
      const aggro = m.isBoss ? 13 : 8.5;

      if (m.state === "idle") {
        if (distP < aggro && !this.dead && Math.hypot(this.pos.x, this.pos.z) > 21) {
          m.state = "chase";
        } else if (t > m.nextThink) {
          m.nextThink = t + 2200 + Math.random() * 2600;
          m.target.copy(m.home).add(new THREE.Vector3((Math.random() - 0.5) * 7, 0, (Math.random() - 0.5) * 7));
        }
      }

      if (m.state === "chase") {
        if (this.dead || distP > aggro + 9 || Math.hypot(gp.x, gp.z) < 20) {
          m.state = "return";
        } else if (distP < 1.7) {
          // atacar
          m.atkCd -= dt;
          if (m.atkCd <= 0) {
            m.atkCd = 1.4;
            this.hurtPlayer(m.atk * (0.8 + Math.random() * 0.4), m);
          }
        } else {
          const dir = new THREE.Vector3(this.pos.x - gp.x, 0, this.pos.z - gp.z).normalize();
          gp.x += dir.x * m.speed * dt;
          gp.z += dir.z * m.speed * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "return") {
        const dir = new THREE.Vector3(m.home.x - gp.x, 0, m.home.z - gp.z);
        if (dir.length() < 0.5) { m.state = "idle"; m.hp = m.maxHp; this.drawMobHp(m); }
        else {
          dir.normalize();
          gp.x += dir.x * m.speed * dt;
          gp.z += dir.z * m.speed * dt;
          m.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      if (m.state === "idle") {
        const dir = new THREE.Vector3(m.target.x - gp.x, 0, m.target.z - gp.z);
        if (dir.length() > 0.4) {
          dir.normalize();
          gp.x += dir.x * m.speed * 0.45 * dt;
          gp.z += dir.z * m.speed * 0.45 * dt;
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
    this.opts.onEvent({ type: "hp", hp: Math.max(0, this.hp), maxHp: this.opts.stats.maxHp, hit: true });
    this.floatText(this.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), `-${dmg}`, "#f87171", 1.1);
    if (this.hp <= 0) {
      this.dead = true;
      this.opts.onEvent({ type: "death", by: m.isBoss ? "Bug Rei" : MOB_TIERS[m.tier].name });
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
    }
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

  private updateOrbs(dt: number): void {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt * 2.2;
      if (o.t >= 1) {
        this.opts.onEvent({ type: "gain", gold: o.gold, xp: o.xp });
        this.scene.remove(o.mesh);
        this.orbs.splice(i, 1);
        continue;
      }
      const dest = this.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
      o.mesh.position.lerpVectors(o.from, dest, smooth01(o.t));
      o.mesh.position.y += Math.sin(o.t * Math.PI) * 0.6;
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
        it.icon.position.y = (it.kind === "raffle" ? 3.6 : 2.1) + Math.sin(t / 400 + it.pos.x) * 0.18;
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

  private updateDayNight(t: number): void {
    const phase = (t % DAY_LEN) / DAY_LEN; // 0..1
    const dayAmt = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2); // 1=meio-dia, 0=meia-noite
    const sky = new THREE.Color(0x0b1026).lerp(new THREE.Color(0x87ceeb), dayAmt);
    this.scene.background = sky;
    (this.scene.fog as THREE.FogExp2).color.copy(sky);
    this.hemi.intensity = 0.35 + dayAmt * 0.65;
    this.sun.intensity = 0.25 + dayAmt * 0.95;
    const ang = phase * Math.PI * 2;
    this.sun.position.set(Math.cos(ang) * 80, 30 + dayAmt * 60, Math.sin(ang) * 80);
  }

  private updateCamera(dt: number): void {
    const target = new THREE.Vector3(
      this.pos.x + Math.sin(this.camYaw) * this.camDist,
      this.pos.y + 5.5 + this.camDist * 0.32,
      this.pos.z + Math.cos(this.camYaw) * this.camDist
    );
    this.camPos.lerp(target, Math.min(1, dt * 5));
    this.camera.position.copy(this.camPos);
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
