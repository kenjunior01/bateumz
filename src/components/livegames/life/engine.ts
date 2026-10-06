// ============================================================
// BATEU LIFE — Motor isométrico 2.5D (estilo Habbo/Zepeto)
// Praça social + quarto decorável, avatares chibi com capulana,
// leve para qualquer Android (Canvas 2D puro, sem WebGL).
// ============================================================

export const TW = 64; // largura do tile isométrico
export const TH = 32; // altura do tile isométrico

export type LifeScene = "praca" | "quarto";

export interface LifeEvent {
  type: "nearPoi" | "tap" | "scene";
  poi?: string | null;
  tile?: { x: number; y: number };
  scene?: LifeScene;
}

export interface FurnitureItem {
  id: string;
  kind: string;
  x: number;
  y: number;
}

export interface LifeOpts {
  canvas: HTMLCanvasElement;
  name: string;
  skin: number;
  outfit: number;
  onEvent: (e: LifeEvent) => void;
}

// ── Catálogo partilhado (motor + UI) ─────────────────────────

export const SKIN_TONES = ["#8d5524", "#a9714b", "#c68642", "#e0ac69"];

export interface OutfitDef {
  id: string;
  name: string;
  price: number;
  base: string;   // cor principal da roupa
  band: string;   // cor da faixa capulana
  pattern: "capulana" | "stripes" | "dots" | "plain";
}

export const OUTFITS: OutfitDef[] = [
  { id: "capulana-classica", name: "Capulana Clássica", price: 0, base: "#1d7aaf", band: "#f2c14e", pattern: "capulana" },
  { id: "capulana-verde", name: "Capulana Verde Vale", price: 0, base: "#2d6a4f", band: "#f4a261", pattern: "capulana" },
  { id: "desportivo", name: "Kit Desportivo Bateu", price: 60, base: "#e63946", band: "#ffffff", pattern: "stripes" },
  { id: "urban-rosa", name: "Estilo Urbano Rosa", price: 80, base: "#d63384", band: "#f8f9fa", pattern: "dots" },
  { id: "kapsiki-roxo", name: "Capulana Kapsiki", price: 100, base: "#6d28d9", band: "#fbbf24", pattern: "capulana" },
  { id: "premium-ouro", name: "Traje Premium Ouro", price: 150, base: "#b8860b", band: "#111827", pattern: "capulana" },
];

export interface FurnitureDef {
  kind: string;
  name: string;
  price: number;
  emoji: string;
}

export const FURNITURE: FurnitureDef[] = [
  { kind: "sofa", name: "Sofá Confortável", price: 90, emoji: "🛋️" },
  { kind: "cama", name: "Cama Real", price: 120, emoji: "🛏️" },
  { kind: "tv", name: "TV Plasma", price: 100, emoji: "📺" },
  { kind: "planta", name: "Planta Tropical", price: 30, emoji: "🪴" },
  { kind: "tapete", name: "Tapete Capulana", price: 45, emoji: "🟧" },
  { kind: "mesa", name: "Mesa de Jantar", price: 70, emoji: "🪑" },
  { kind: "lampada", name: "Lâmpada Moderna", price: 35, emoji: "💡" },
  { kind: "trofeu", name: "Estante de Troféus", price: 150, emoji: "🏆" },
];

// ── Mapa da praça ────────────────────────────────────────────

export const MAP_W = 28;
export const MAP_H = 28;
export const ROOM_W = 10;
export const ROOM_H = 8;

const OBSTACLES = new Set<string>();
function blockRect(x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) OBSTACLES.add(x + "," + y);
}

// Palco dos Sorteios (norte)
blockRect(10, 3, 17, 5);
// Loja de Moda (oeste)
blockRect(3, 10, 7, 15);
// Loja de Mobília (este)
blockRect(20, 10, 24, 15);
// Portal dos Jogos (sudoeste)
blockRect(6, 21, 8, 22);
// Casa (sudeste)
blockRect(19, 20, 22, 23);
// Fonte central
blockRect(13, 13, 14, 14);

interface PoiDef { id: string; label: string; tx: number; ty: number; r: number }
const POIS: PoiDef[] = [
  { id: "palco", label: "🎁 Palco dos Sorteios", tx: 14, ty: 6.6, r: 2.2 },
  { id: "loja", label: "🛍️ Loja de Moda", tx: 8, ty: 13, r: 1.9 },
  { id: "mobilia", label: "🪑 Loja de Mobília", tx: 19, ty: 13, r: 1.9 },
  { id: "portal", label: "🕹️ Portal dos Jogos", tx: 7.5, ty: 19.8, r: 2.1 },
  { id: "casa", label: "🏠 Meu Quarto", tx: 20.5, ty: 19, r: 2.1 },
  { id: "bau0", label: "💰 Abrir Baú", tx: 11, ty: 17, r: 1.6 },
  { id: "bau1", label: "💰 Abrir Baú", tx: 17, ty: 9, r: 1.6 },
  { id: "bau2", label: "💰 Abrir Baú", tx: 23, ty: 18, r: 1.6 },
  { id: "fonte", label: "⛲ Fonte Central", tx: 14, ty: 15.2, r: 2.0 },
];

const PALMS: Array<{ x: number; y: number }> = [
  { x: 2, y: 2 }, { x: 25, y: 2 }, { x: 2, y: 25 }, { x: 25, y: 25 },
  { x: 12, y: 2 }, { x: 18, y: 26 }, { x: 2, y: 18 }, { x: 26, y: 20 },
  { x: 10, y: 24 }, { x: 24, y: 6 },
];
PALMS.forEach((p) => OBSTACLES.add(Math.round(p.x) + "," + Math.round(p.y)));

const BENCHES: Array<{ x: number; y: number }> = [
  { x: 11, y: 10 }, { x: 17, y: 16 }, { x: 11, y: 16 },
];
BENCHES.forEach((b) => OBSTACLES.add(b.x + "," + b.y));

const BAUS = [{ x: 11, y: 17 }, { x: 17, y: 9 }, { x: 23, y: 18 }];
BAUS.forEach((b) => OBSTACLES.add(b.x + "," + b.y));

export function isWalkable(scene: LifeScene, x: number, y: number): boolean {
  const xi = Math.floor(x), yi = Math.floor(y);
  if (scene === "praca") {
    if (xi < 1 || yi < 1 || xi >= MAP_W - 1 || yi >= MAP_H - 1) return false;
    return !OBSTACLES.has(xi + "," + yi);
  }
  return xi >= 0 && yi >= 0 && xi < ROOM_W && yi < ROOM_H;
}

function isoX(x: number, y: number): number { return (x - y) * (TW / 2); }
function isoY(x: number, y: number): number { return (x + y) * (TH / 2); }

interface RemoteAv {
  id: string; name: string; skin: number; outfit: number;
  x: number; y: number; tx: number; ty: number;
  emote: string; emoteUntil: number; lastSeen: number; bubble: string; bubbleUntil: number;
}

interface Drawable { depth: number; draw: () => void }

export class LifeEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: LifeOpts;
  private raf = 0;
  private lastT = 0;
  private time = 0;

  scene: LifeScene = "praca";
  private px = 13.5; private py = 18.5;   // posição do jogador
  private txp = 13.5; private typ = 18.5; // alvo tap-to-move
  private dir = 0; // 0=S 1=W 2=N 3=E
  private walkPhase = 0;
  private moving = false;
  private joy = { x: 0, y: 0 };
  private keys = new Set<string>();
  private emote = ""; private emoteUntil = 0;
  private bubble = ""; private bubbleUntil = 0;
  private lastPoi: string | null = null;

  private remotes = new Map<string, RemoteAv>();
  private furniture: FurnitureItem[] = [];
  private decorateKind: string | null = null;
  private camX = 0; private camY = 0;

  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      if (e.type === "keydown") this.keys.add(k); else this.keys.delete(k);
    }
  };
  private onPointer = (e: PointerEvent) => {
    const rect = this.cv.getBoundingClientRect();
    const t = this.screenToTile(e.clientX - rect.left, e.clientY - rect.top);
    if (t && !this.decorateKind) {
      this.txp = t.x + 0.5; this.typ = t.y + 0.5;
    }
    this.opts.onEvent({ type: "tap", tile: t });
  };
  private onResize = () => this.resize();

  constructor(opts: LifeOpts) {
    this.opts = opts;
    this.cv = opts.canvas;
    const c = this.cv.getContext("2d");
    if (!c) throw new Error("canvas 2d indisponível");
    this.ctx = c;
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    this.cv.addEventListener("pointerdown", this.onPointer);
    window.addEventListener("resize", this.onResize);
    this.resize();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    this.cv.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("resize", this.onResize);
  }

  // ── API ────────────────────────────────────────────────────

  start(): void {
    this.lastT = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      this.time += dt;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  setJoystick(x: number, y: number): void { this.joy.x = x; this.joy.y = y; }
  setEmote(e: string): void { this.emote = e; this.emoteUntil = this.time + 2.2; }
  say(text: string): void { this.bubble = text.slice(0, 60); this.bubbleUntil = this.time + 4; }
  setDecorate(kind: string | null): void { this.decorateKind = kind; }
  getDecorate(): string | null { return this.decorateKind; }
  getSelfTile(): { x: number; y: number } { return { x: Math.floor(this.px), y: Math.floor(this.py) }; }
  getSelfPos(): { x: number; y: number } { return { x: this.px, y: this.py }; }

  setScene(s: LifeScene): void {
    this.scene = s;
    this.decorateKind = null;
    if (s === "quarto") { this.px = 4.5; this.py = 6.5; this.txp = 4.5; this.typ = 6.5; }
    else { this.px = 20.5; this.py = 19; this.txp = 20.5; this.typ = 19; }
    this.opts.onEvent({ type: "scene", scene: s });
  }

  setFurniture(list: FurnitureItem[]): void { this.furniture = list; }

  screenToTile(cx: number, cy: number): { x: number; y: number } | null {
    const ox = cx - this.cv.clientWidth / 2 + this.camX;
    const oy = cy - this.cv.clientHeight / 2 + this.camY;
    const fx = (ox / (TW / 2) + oy / (TH / 2)) / 2;
    const fy = (oy / (TH / 2) - ox / (TW / 2)) / 2;
    const xi = Math.floor(fx), yi = Math.floor(fy);
    if (this.scene === "quarto") {
      if (xi < 0 || yi < 0 || xi >= ROOM_W || yi >= ROOM_H) return null;
    } else if (xi < 0 || yi < 0 || xi >= MAP_W || yi >= MAP_H) return null;
    return { x: xi, y: yi };
  }

  applyRemote(id: string, d: Partial<Omit<RemoteAv, "id">> & { id: string }): void {
    let r = this.remotes.get(id);
    if (!r) {
      r = { id, name: d.name || "Anónimo", skin: d.skin ?? 0, outfit: d.outfit ?? 0, x: d.x ?? 13.5, y: d.y ?? 18.5, tx: d.x ?? 13.5, ty: d.y ?? 18.5, emote: "", emoteUntil: 0, lastSeen: this.time, bubble: "", bubbleUntil: 0 };
      this.remotes.set(id, r);
    }
    if (typeof d.x === "number") { r.tx = d.x; r.ty = d.y ?? r.ty; }
    if (d.name) r.name = d.name;
    if (typeof d.skin === "number") r.skin = d.skin;
    if (typeof d.outfit === "number") r.outfit = d.outfit;
    if (d.emote) { r.emote = d.emote; r.emoteUntil = this.time + 2.2; }
    if (d.bubble) { r.bubble = d.bubble; r.bubbleUntil = this.time + 4; }
    r.lastSeen = this.time;
  }

  removeRemote(id: string): void { this.remotes.delete(id); }
  remoteCount(): number { return this.remotes.size; }

  // ── Update ─────────────────────────────────────────────────

  private update(dt: number): void {
    let vx = this.joy.x, vy = this.joy.y;
    if (this.keys.size > 0) {
      let kx = 0, ky = 0;
      if (this.keys.has("w") || this.keys.has("arrowup")) kx -= 1;
      if (this.keys.has("s") || this.keys.has("arrowdown")) kx += 1;
      if (this.keys.has("a") || this.keys.has("arrowleft")) ky -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) ky += 1;
      if (kx !== 0 || ky !== 0) { vx = kx; vy = ky; }
      this.txp = this.px; this.typ = this.py;
    }

    const SPEED = 3.6;
    let dx = 0, dy = 0;
    if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
      // vetor de ecrã → plano isométrico
      dx = vx + vy;
      dy = vy - vx;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) { dx /= len; dy /= len; } else { dx = 0; dy = 0; }
      this.txp = this.px + dx * 2; this.typ = this.py + dy * 2;
    } else {
      const tdx = this.txp - this.px, tdy = this.typ - this.py;
      const tl = Math.hypot(tdx, tdy);
      if (tl > 0.08) { dx = tdx / tl; dy = tdy / tl; }
    }

    const step = SPEED * dt;
    const nx = this.px + dx * step;
    const ny = this.py + dy * step;
    let moved = false;
    if (isWalkable(this.scene, nx, this.py)) { this.px = nx; moved = true; }
    if (isWalkable(this.scene, this.px, ny)) { this.py = ny; moved = true; }
    this.moving = moved && (dx !== 0 || dy !== 0);
    if (this.moving) {
      this.walkPhase += dt * 9;
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 3 : 1;
      else this.dir = dy > 0 ? 0 : 2;
    }

    // POI próximo
    let near: string | null = null;
    if (this.scene === "praca") {
      for (const p of POIS) {
        if (Math.hypot(p.tx - this.px, p.ty - this.py) <= p.r) { near = p.id; break; }
      }
    } else if (this.py > ROOM_H - 1.4) near = "saida";
    if (near !== this.lastPoi) { this.lastPoi = near; this.opts.onEvent({ type: "nearPoi", poi: near }); }

    // remotos: lerp + limpeza
    for (const [id, r] of this.remotes) {
      r.x += (r.tx - r.x) * Math.min(1, dt * 7);
      r.y += (r.ty - r.y) * Math.min(1, dt * 7);
      if (this.time - r.lastSeen > 15) this.remotes.delete(id);
    }
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = this.cv.clientWidth * dpr;
    this.cv.height = this.cv.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ── Render ─────────────────────────────────────────────────

  private render(): void {
    const ctx = this.ctx;
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    const focusX = this.scene === "praca" ? this.px : 4.5;
    const focusY = this.scene === "praca" ? this.py : 3.8;

    if (this.scene === "praca") {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#7ec8e3"); g.addColorStop(1, "#cfeef7");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#3b2f2a"; ctx.fillRect(0, 0, w, h);
    }

    this.camX = isoX(focusX, focusY);
    this.camY = isoY(focusX, focusY);

    ctx.save();
    ctx.translate(w / 2 - this.camX, h / 2 - this.camY);

    if (this.scene === "praca") this.drawPlazaFloor();
    else this.drawRoom();

    const drawables: Drawable[] = [];

    if (this.scene === "praca") {
      this.addBuilding(drawables, 3, 10, 5, 6, "#f4a261", "#e76f51", "🛍️");
      this.addBuilding(drawables, 20, 10, 5, 6, "#8ecae6", "#219ebc", "🪑");
      this.addStage(drawables);
      this.addPortal(drawables);
      this.addHouse(drawables);
      this.addFountain(drawables);
      for (const p of PALMS) this.addPalm(drawables, p.x, p.y);
      for (const b of BENCHES) this.addBench(drawables, b.x, b.y);
      BAUS.forEach((b, i) => this.addChest(drawables, b.x, b.y, i));
    } else {
      for (const f of this.furniture) this.addFurniture(drawables, f);
      drawables.push({ depth: ROOM_H + 1, draw: () => this.diamond(5, ROOM_H, "#f2c14e", 0.9, 0.06) });
    }

    for (const r of this.remotes.values()) {
      drawables.push({ depth: r.x + r.y + 0.01, draw: () => this.drawAvatar(r.x, r.y, r.name, r.skin, r.outfit, 0, false, r.emote, r.emoteUntil > this.time, r.bubble, r.bubbleUntil > this.time) });
    }
    drawables.push({ depth: this.px + this.py + 0.02, draw: () => this.drawAvatar(this.px, this.py, this.opts.name, this.opts.skin, this.opts.outfit, this.dir, this.moving, this.emote, this.emoteUntil > this.time, this.bubble, this.bubbleUntil > this.time) });

    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();

    ctx.restore();

    if (this.decorateKind) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, h - 44, w, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Toca no chão para colocar o móvel 🪑", w / 2, h - 18);
    }
  }

  private diamond(x: number, y: number, color: string, s = 1, lift = 0): void {
    const ctx = this.ctx;
    const cx = isoX(x, y), cy = isoY(x, y) - lift * TH;
    ctx.beginPath();
    ctx.moveTo(cx, cy - (TH / 2) * s);
    ctx.lineTo(cx + (TW / 2) * s, cy);
    ctx.lineTo(cx, cy + (TH / 2) * s);
    ctx.lineTo(cx - (TW / 2) * s, cy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private drawPlazaFloor(): void {
    for (let gx = 0; gx < MAP_W; gx++) {
      for (let gy = 0; gy < MAP_H; gy++) {
        const alt = (gx + gy) % 2 === 0;
        let col = alt ? "#8fd07e" : "#84c873";
        if (gx < 1 || gy < 1 || gx >= MAP_W - 1 || gy >= MAP_H - 1) col = alt ? "#77b968" : "#6eaf60";
        this.diamond(gx, gy, col);
      }
    }
    for (let i = 8; i < 20; i++) {
      this.diamond(i, 14, "#d8c9a3");
      this.diamond(14, i, "#d8c9a3");
    }
  }

  private drawRoom(): void {
    const ctx = this.ctx;
    const wallH = 64;
    for (let gx = 0; gx < ROOM_W; gx++) {
      for (let gy = 0; gy < ROOM_H; gy++) {
        this.diamond(gx, gy, (gx + gy) % 2 === 0 ? "#c79768" : "#bd8d5e");
      }
    }
    for (let gx = 0; gx < ROOM_W; gx++) {
      const cx = isoX(gx + 0.5, 0), cy = isoY(gx + 0.5, 0);
      ctx.fillStyle = gx % 2 === 0 ? "#efe3d0" : "#e6d8c2";
      ctx.beginPath();
      ctx.moveTo(cx - TW / 2, cy);
      ctx.lineTo(cx, cy - TH / 2);
      ctx.lineTo(cx + TW / 2, cy);
      ctx.lineTo(cx + TW / 2, cy - wallH);
      ctx.lineTo(cx, cy - TH / 2 - wallH);
      ctx.lineTo(cx - TW / 2, cy - wallH);
      ctx.closePath(); ctx.fill();
    }
    for (let gy = 0; gy < ROOM_H; gy++) {
      const cx = isoX(0, gy + 0.5), cy = isoY(0, gy + 0.5);
      ctx.fillStyle = gy % 2 === 0 ? "#e2d2ba" : "#d9c8ae";
      ctx.beginPath();
      ctx.moveTo(cx - TW / 2, cy);
      ctx.lineTo(cx, cy - TH / 2);
      ctx.lineTo(cx + TW / 2, cy);
      ctx.lineTo(cx + TW / 2, cy - wallH);
      ctx.lineTo(cx, cy - TH / 2 - wallH);
      ctx.lineTo(cx - TW / 2, cy - wallH);
      ctx.closePath(); ctx.fill();
    }
    for (let gx = 0; gx < ROOM_W; gx++) {
      const cx = isoX(gx + 0.5, 0), cy = isoY(gx + 0.5, 0) - wallH / 2;
      ctx.fillStyle = gx % 2 === 0 ? "#f2c14e" : "#1d7aaf";
      ctx.fillRect(cx - TW / 4, cy - 6, TW / 2, 8);
    }
  }

  private isoBox(x: number, y: number, wTiles: number, dTiles: number, hPx: number, top: string, left: string, right: string): void {
    const ctx = this.ctx;
    const x1 = isoX(x, y), y1 = isoY(x, y);
    const x2 = isoX(x + wTiles, y), y2 = isoY(x + wTiles, y);
    const x3 = isoX(x + wTiles, y + dTiles), y3 = isoY(x + wTiles, y + dTiles);
    const x4 = isoX(x, y + dTiles), y4 = isoY(x, y + dTiles);
    ctx.beginPath();
    ctx.moveTo(x1, y1 - hPx); ctx.lineTo(x2, y2 - hPx);
    ctx.lineTo(x3, y3 - hPx); ctx.lineTo(x4, y4 - hPx);
    ctx.closePath(); ctx.fillStyle = top; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x4, y4 - hPx); ctx.lineTo(x3, y3 - hPx);
    ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
    ctx.closePath(); ctx.fillStyle = left; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x3, y3 - hPx); ctx.lineTo(x2, y2 - hPx);
    ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
    ctx.closePath(); ctx.fillStyle = right; ctx.fill();
  }

  private label(x: number, y: number, liftPx: number, text: string, size = 16): void {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    const cx = isoX(x, y), cy = isoY(x, y) - liftPx;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeText(text, cx, cy);
    ctx.fillStyle = "#1f2937";
    ctx.fillText(text, cx, cy);
  }

  private shade(hex: string): string {
    try {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, (n >> 16) - 40), g = Math.max(0, ((n >> 8) & 255) - 40), b = Math.max(0, (n & 255) - 40);
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }

  private addBuilding(ds: Drawable[], x: number, y: number, w: number, d: number, top: string, side: string, sign: string): void {
    ds.push({
      depth: x + y - 0.5,
      draw: () => {
        this.isoBox(x, y, w, d, 78, top, side, this.shade(side));
        this.label(x + w / 2, y + d / 2, 120, sign, 20);
      },
    });
  }

  private addStage(ds: Drawable[]): void {
    ds.push({
      depth: 12.6,
      draw: () => {
        this.isoBox(10, 3, 8, 3, 34, "#f2c14e", "#de9b26", "#b57f1c");
        const ctx = this.ctx;
        const cx = isoX(14, 3.2), cy = isoY(14, 3.2);
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(cx - 130, cy - 130, 260, 56);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 17px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎁 PALCO DOS SORTEIOS 🎁", cx, cy - 95);
        this.label(14, 4.5, 60, "🎫", 22);
      },
    });
  }

  private addPortal(ds: Drawable[]): void {
    ds.push({
      depth: 26.6,
      draw: () => {
        this.isoBox(6, 21, 3, 2, 30, "#4338ca", "#3730a3", "#312e81");
        this.label(7.5, 22, 78, "🕹️", 26);
        const ctx = this.ctx;
        const cx = isoX(7.5, 21.2), cy = isoY(7.5, 21.2) - 20;
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
        g.addColorStop(0, "rgba(129,140,248,0.85)");
        g.addColorStop(1, "rgba(129,140,248,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
        this.label(7.5, 20.6, 40, "JOGOS", 11);
      },
    });
  }

  private addHouse(ds: Drawable[]): void {
    ds.push({
      depth: 38.6,
      draw: () => {
        this.isoBox(19, 20, 4, 4, 66, "#fde68a", "#f59e0b", "#d97706");
        this.label(21, 22, 100, "🏠", 22);
        this.label(21, 19.2, 26, "MEU QUARTO", 10);
      },
    });
  }

  private addFountain(ds: Drawable[]): void {
    ds.push({
      depth: 26.8,
      draw: () => {
        this.diamond(13.5, 13.5, "#93c5fd", 1.9, 0.08);
        const ctx = this.ctx;
        const cx = isoX(13.5, 13.5), cy = isoY(13.5, 13.5) - 8;
        const ripple = (this.time % 1.6) / 1.6;
        ctx.strokeStyle = `rgba(59,130,246,${Math.max(0, 0.7 - ripple * 0.7)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 8 + ripple * 22, 0, Math.PI * 2); ctx.stroke();
        this.label(13.5, 13.5, 40 + Math.sin(this.time * 3) * 3, "⛲", 22);
      },
    });
  }

  private addPalm(ds: Drawable[], x: number, y: number): void {
    ds.push({
      depth: x + y,
      draw: () => {
        const ctx = this.ctx;
        const cx = isoX(x, y), cy = isoY(x, y);
        ctx.strokeStyle = "#8a6b45"; ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + 6, cy - 30, cx + 2, cy - 58); ctx.stroke();
        const sway = Math.sin(this.time * 1.4 + x) * 3;
        ctx.fillStyle = "#2d8a4e";
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(cx + 2 + Math.cos(a) * 16 + sway, cy - 62 + Math.sin(a) * 7, 17, 6, a * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#a16207";
        ctx.beginPath(); ctx.arc(cx + 4, cy - 54, 3.4, 0, Math.PI * 2); ctx.fill();
      },
    });
  }

  private addBench(ds: Drawable[], x: number, y: number): void {
    ds.push({
      depth: x + y,
      draw: () => {
        this.isoBox(x, y, 1, 1, 18, "#d97706", "#b45309", "#92400e");
      },
    });
  }

  private addChest(ds: Drawable[], x: number, y: number, i: number): void {
    ds.push({
      depth: x + y,
      draw: () => {
        const bob = Math.sin(this.time * 2.4 + i) * 2;
        this.isoBox(x - 0.3, y - 0.3, 0.9, 0.9, 24 + bob, "#f59e0b", "#d97706", "#b45309");
        this.label(x, y - 0.3, 44 + bob, "💰", 15);
      },
    });
  }

  private addFurniture(ds: Drawable[], f: FurnitureItem): void {
    ds.push({
      depth: f.x + f.y + 0.03,
      draw: () => {
        const cx = isoX(f.x + 0.5, f.y + 0.5), cy = isoY(f.x + 0.5, f.y + 0.5);
        const ctx = this.ctx;
        if (f.kind === "tapete") {
          this.diamond(f.x + 0.5, f.y + 0.5, "#f97316", 0.95, 0.005);
          this.diamond(f.x + 0.5, f.y + 0.5, "#f2c14e", 0.6, 0.005);
          return;
        }
        const H: Record<string, number> = { sofa: 26, cama: 22, tv: 40, planta: 34, mesa: 24, lampada: 44, trofeu: 38 };
        const top: Record<string, [string, string, string]> = {
          sofa: ["#ef4444", "#b91c1c", "#991b1b"],
          cama: ["#f8fafc", "#cbd5e1", "#94a3b8"],
          tv: ["#1f2937", "#111827", "#0b0f19"],
          planta: ["#22c55e", "#15803d", "#166534"],
          mesa: ["#a16207", "#854d0e", "#713f12"],
          lampada: ["#fde68a", "#d97706", "#b45309"],
          trofeu: ["#fbbf24", "#b45309", "#92400e"],
        };
        const c = top[f.kind] ?? ["#e5e7eb", "#9ca3af", "#6b7280"];
        this.isoBox(f.x + 0.15, f.y + 0.15, 0.75, 0.75, H[f.kind] ?? 26, c[0], c[1], c[2]);
        const emoji: Record<string, string> = { sofa: "🛋️", cama: "🛏️", tv: "📺", planta: "🪴", mesa: "🪑", lampada: "💡", trofeu: "🏆" };
        ctx.font = "14px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(emoji[f.kind] ?? "📦", cx, cy - (H[f.kind] ?? 26) - 6);
      },
    });
  }

  private drawAvatar(x: number, y: number, name: string, skinIdx: number, outfitIdx: number, dir: number, moving: boolean, emote: string, emoteActive: boolean, bubble: string, bubbleActive: boolean): void {
    const ctx = this.ctx;
    const cx = isoX(x, y), cy = isoY(x, y);
    const skin = SKIN_TONES[skinIdx % SKIN_TONES.length];
    const out = OUTFITS[outfitIdx % OUTFITS.length];
    const swing = moving ? Math.sin(this.walkPhase) * 3 : 0;
    const bob = moving ? Math.abs(Math.sin(this.walkPhase)) * 1.6 : Math.sin(this.time * 2 + x) * 0.7;

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(cx, cy, 13, 6, 0, 0, Math.PI * 2); ctx.fill();

    const by = cy - bob;
    ctx.strokeStyle = "#3f3f46"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - 4, by - 14); ctx.lineTo(cx - 4 + swing, by - 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 4, by - 14); ctx.lineTo(cx + 4 - swing, by - 1); ctx.stroke();

    ctx.fillStyle = out.base;
    this.roundRect(cx - 9, by - 33, 18, 20, 5);
    ctx.fillStyle = out.band;
    ctx.fillRect(cx - 9, by - 22, 18, 6);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    if (out.pattern === "capulana") {
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(cx + i * 6, by - 28, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else if (out.pattern === "stripes") {
      ctx.fillRect(cx - 9, by - 31, 18, 2.4);
      ctx.fillRect(cx - 9, by - 26, 18, 2.4);
    } else if (out.pattern === "dots") {
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(cx + i * 6, by - 30, 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.strokeStyle = skin; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - 9, by - 30); ctx.lineTo(cx - 13, by - 18 + swing * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 9, by - 30); ctx.lineTo(cx + 13, by - 18 - swing * 0.6); ctx.stroke();

    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(cx, by - 42, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#26170e";
    ctx.beginPath(); ctx.arc(cx, by - 45, 9, Math.PI, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#1f2937";
    const eyeY = by - 42;
    if (dir === 0) {
      ctx.beginPath(); ctx.arc(cx - 3.4, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3.4, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, eyeY + 3, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    } else if (dir === 1) {
      ctx.beginPath(); ctx.arc(cx - 5, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (dir === 3) {
      ctx.beginPath(); ctx.arc(cx + 5, eyeY, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(255,255,255,0.92)"; ctx.lineWidth = 3;
    ctx.strokeText(name, cx, by - 58);
    ctx.fillStyle = "#111827";
    ctx.fillText(name, cx, by - 58);

    if (emoteActive && emote) {
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText(emote, cx, by - 68 - Math.sin(this.time * 4) * 2);
    }
    if (bubbleActive && bubble) {
      ctx.font = "11px system-ui, sans-serif";
      const bw = Math.min(150, ctx.measureText(bubble).width + 14);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      this.roundRect(cx - bw / 2, by - 92, bw, 20, 8);
      ctx.fillStyle = "#111827";
      ctx.fillText(bubble, cx, by - 78);
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath(); ctx.fill();
  }
}
