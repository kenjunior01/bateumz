// ============================================================
// BATEU WORLD — Áudio sintetizado (WebAudio, zero assets)
// SFX de combate, progressão, economia e ambiente do mundo.
// Mute persistente em localStorage (bateu_world_audio).
// ============================================================

type SfxName =
  | "click" | "hit" | "crit" | "hurt" | "death" | "levelup" | "discover"
  | "coin" | "chest" | "skill" | "steal" | "shield" | "heal" | "join"
  | "boss" | "deny" | "swing";

class WorldAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientStarted = false;
  private muted = false;
  private lastAt: Record<string, number> = {};

  constructor() {
    try { this.muted = localStorage.getItem("bateu_world_audio") === "off"; } catch { /* ignore */ }
  }

  get isMuted(): boolean { return this.muted; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem("bateu_world_audio", this.muted ? "off" : "on"); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    if (!this.muted) this.ensure();
    return this.muted;
  }

  // Chamar no primeiro gesto do utilizador (política dos browsers)
  ensure(): void {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch { /* ignore */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, lowpass = 1200, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    // throttling anti-espam
    const now = performance.now();
    const minGap: Partial<Record<SfxName, number>> = { hit: 70, coin: 60, swing: 120, hurt: 120 };
    const gap = minGap[name] ?? 0;
    if (gap && now - (this.lastAt[name] || 0) < gap) return;
    this.lastAt[name] = now;

    switch (name) {
      case "click": this.tone(660, 0.06, "square", 0.12); break;
      case "swing": this.noise(0.09, 0.1, 2400); this.tone(220, 0.07, "sawtooth", 0.05, 120); break;
      case "hit": this.noise(0.07, 0.16, 900); this.tone(180, 0.06, "square", 0.1, 90); break;
      case "crit": this.noise(0.1, 0.2, 1400); this.tone(520, 0.09, "square", 0.14, 160); this.tone(780, 0.12, "triangle", 0.1, 300, 0.03); break;
      case "hurt": this.tone(200, 0.14, "sawtooth", 0.14, 80); this.noise(0.08, 0.1, 600); break;
      case "death": this.tone(320, 0.5, "sawtooth", 0.16, 60); this.noise(0.4, 0.14, 500); break;
      case "levelup":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.16, undefined, i * 0.09));
        this.noise(0.35, 0.05, 3000, 0.05);
        break;
      case "discover":
        [784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, "sine", 0.14, undefined, i * 0.1));
        break;
      case "coin": this.tone(988, 0.06, "square", 0.08); this.tone(1319, 0.09, "square", 0.07, undefined, 0.05); break;
      case "chest": this.tone(392, 0.1, "square", 0.1); this.tone(523, 0.1, "square", 0.1, undefined, 0.1); this.tone(784, 0.16, "square", 0.12, undefined, 0.2); break;
      case "skill": this.tone(440, 0.14, "sawtooth", 0.1, 880); this.noise(0.12, 0.07, 2000); break;
      case "steal": this.tone(880, 0.08, "square", 0.12, 440); this.tone(440, 0.14, "square", 0.1, 220, 0.08); break;
      case "shield": this.tone(330, 0.25, "sine", 0.12, 660); break;
      case "heal": [523, 659].forEach((f, i) => this.tone(f, 0.14, "sine", 0.1, undefined, i * 0.08)); break;
      case "join": this.tone(523, 0.08, "sine", 0.08); this.tone(659, 0.1, "sine", 0.08, undefined, 0.07); break;
      case "boss": this.tone(110, 0.5, "sawtooth", 0.16, 70); this.tone(116, 0.5, "square", 0.1, 74); break;
      case "deny": this.tone(220, 0.1, "square", 0.08, 160); break;
    }
  }

  // Ambiente: vento suave contínuo + pássaros de dia / grilos de noite
  startAmbient(): void {
    if (this.muted || this.ambientStarted || !this.ctx || !this.master) return;
    this.ambientStarted = true;
    try {
      const ctx = this.ctx!;
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.value = 0.035;
      this.ambientGain.connect(this.master);

      // vento: ruído filtrado em loop com LFO
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 420;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 180;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      src.connect(f); f.connect(this.ambientGain);
      src.start(); lfo.start();

      // pássaros/grilos aleatórios
      const chirp = () => {
        if (!this.ctx || this.muted) return;
        const hourish = new Date().getHours();
        const day = hourish >= 6 && hourish < 20;
        if (day) {
          const base = 1800 + Math.random() * 1400;
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
            this.tone(base + Math.random() * 400, 0.05, "sine", 0.02, base + 600, i * 0.09);
          }
        } else {
          for (let i = 0; i < 5; i++) this.tone(4200, 0.02, "sine", 0.012, 4200, i * 0.06);
        }
        setTimeout(chirp, 5000 + Math.random() * 14000);
      };
      setTimeout(chirp, 4000);
    } catch { /* ignore */ }
  }
}

export const worldAudio = new WorldAudio();
