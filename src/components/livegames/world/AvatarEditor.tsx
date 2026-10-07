// @ts-nocheck
// ============================================================
// BATEU WORLD — Editor de Avatar · v5
// Preview 3D ao vivo (canvas próprio, leve) + grelhas de
// personalização. Reutilizado no ecrã de criação e dentro
// do jogo (painel Herói → Aparência).
// ============================================================

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { buildAvatar, animateAvatar, type AvatarConfig } from "./avatar";
import {
  AVATAR_SKINS, AVATAR_HAIRS, AVATAR_HAIR_COLORS,
  AVATAR_OUTFITS, AVATAR_TRIMS, AVATAR_CAPES, AVATAR_HATS,
} from "./avatar";

// ── Preview 3D rotativo ─────────────────────────────────────
interface PreviewProps {
  cfg: AvatarConfig;
  classColor: number;
  className?: string;
}

export function AvatarPreview({ cfg, classColor, className }: PreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    parts: ReturnType<typeof buildAvatar> | null;
    raf: number;
    ro?: ResizeObserver;
  } | null>(null);

  // montar cena uma vez
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return; // sem WebGL (raro) — fica apenas as grelhas
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 1.5, 3.4);
    camera.lookAt(0, 1.02, 0);
    scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x35402f, 1.15));
    const key = new THREE.DirectionalLight(0xfff3d6, 1.5);
    key.position.set(2, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(classColor, 0.8);
    rim.position.set(-2.5, 2, -2);
    scene.add(rim);
    // pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.95, 0.18, 24),
      new THREE.MeshLambertMaterial({ color: 0x1e293b })
    );
    ped.position.y = -0.09;
    scene.add(ped);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.028, 8, 36),
      new THREE.MeshBasicMaterial({ color: classColor })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    scene.add(ring);

    const st = { renderer, scene, camera, parts: null as ReturnType<typeof buildAvatar> | null, raf: 0 };
    stRef.current = st;

    const t0 = performance.now();
    const loop = () => {
      st.raf = requestAnimationFrame(loop);
      const t = performance.now();
      if (st.parts) {
        st.parts.root.rotation.y = Math.sin((t - t0) / 2800) * 0.9 + 0.35;
        animateAvatar(st.parts, 0, false, 0, t);
      }
      renderer.render(scene, camera);
    };
    loop();

    const resize = () => {
      const w = canvas.clientWidth || 220;
      const h = canvas.clientHeight || 260;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement || canvas);
    st.ro = ro;

    return () => {
      cancelAnimationFrame(st.raf);
      ro.disconnect();
      if (st.parts) scene.remove(st.parts.root);
      renderer.dispose();
      stRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reconstruir corpo quando a configuração muda
  useEffect(() => {
    const st = stRef.current;
    if (!st) return;
    if (st.parts) st.scene.remove(st.parts.root);
    st.parts = buildAvatar(cfg, { classColor });
    st.scene.add(st.parts.root);
  }, [cfg, classColor]);

  return <canvas ref={canvasRef} data-testid="bw-avatar-preview" className={className} />;
}

// ── Grelhas de personalização ───────────────────────────────
type TabId = "pele" | "cabelo" | "traje" | "extras";
const TABS: { id: TabId; name: string; emoji: string }[] = [
  { id: "pele", name: "Pele", emoji: "🎨" },
  { id: "cabelo", name: "Cabelo", emoji: "💇" },
  { id: "traje", name: "Traje", emoji: "👕" },
  { id: "extras", name: "Extras", emoji: "✨" },
];

const hexCss = (n: number) => "#" + n.toString(16).padStart(6, "0");

interface SwatchesProps {
  cfg: AvatarConfig;
  onChange: (c: AvatarConfig) => void;
}

export function AvatarSwatches({ cfg, onChange }: SwatchesProps) {
  const [tab, setTab] = useState<TabId>("pele");

  const Sw = ({ on, color, label, tid, onClick }: { on: boolean; color: string; label: string; tid: string; onClick: () => void }) => (
    <button
      data-testid={tid}
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${on ? "border-white scale-110 shadow-lg" : "border-white/25"}`}
      style={{ backgroundColor: color }}
    />
  );

  const St = ({ on, label, tid, onClick, children }: { on: boolean; label: string; tid: string; onClick: () => void; children: React.ReactNode }) => (
    <button
      data-testid={tid}
      title={label}
      onClick={onClick}
      className={`rounded-xl border px-2 py-1.5 text-center transition-all ${on ? "border-white/80 bg-white/20 scale-[1.05]" : "border-white/15 bg-white/5 hover:border-white/40"}`}
    >
      <div className="text-lg leading-none">{children}</div>
      <div className="mt-0.5 text-[9px] text-white/70 leading-tight">{label}</div>
    </button>
  );

  return (
    <div className="w-full">
      {/* abas */}
      <div className="mb-2 grid grid-cols-4 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`bw-av-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-1 py-1.5 text-[10px] font-bold transition-all ${tab === t.id ? "border-white/70 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/60 hover:border-white/30"}`}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {tab === "pele" && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {AVATAR_SKINS.map((s, i) => (
            <Sw key={i} on={cfg.skin === i} color={hexCss(s.hex)} label={s.name} tid={`bw-av-skin-${i}`} onClick={() => onChange({ ...cfg, skin: i })} />
          ))}
        </div>
      )}

      {tab === "cabelo" && (
        <div>
          <div className="mb-2 grid grid-cols-4 gap-1.5">
            {AVATAR_HAIRS.map((h, i) => (
              <St key={i} on={cfg.hair === i} label={h.name} tid={`bw-av-hair-${i}`} onClick={() => onChange({ ...cfg, hair: i })}>
                {h.emoji}
              </St>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {AVATAR_HAIR_COLORS.map((c, i) => (
              <Sw key={i} on={cfg.hairColor === i} color={hexCss(c.hex)} label={c.name} tid={`bw-av-hairc-${i}`} onClick={() => onChange({ ...cfg, hairColor: i })} />
            ))}
          </div>
        </div>
      )}

      {tab === "traje" && (
        <div>
          <p className="mb-1 text-center text-[9px] uppercase tracking-wider text-white/50">Cor do traje</p>
          <div className="mb-2 flex flex-wrap justify-center gap-1.5">
            {AVATAR_OUTFITS.map((c, i) => (
              <Sw key={i} on={cfg.outfit === i} color={hexCss(c.hex)} label={c.name} tid={`bw-av-fit-${i}`} onClick={() => onChange({ ...cfg, outfit: i })} />
            ))}
          </div>
          <p className="mb-1 text-center text-[9px] uppercase tracking-wider text-white/50">Cor de detalhe</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {AVATAR_TRIMS.map((c, i) => (
              <Sw key={i} on={cfg.trim === i} color={hexCss(c.hex)} label={c.name} tid={`bw-av-trim-${i}`} onClick={() => onChange({ ...cfg, trim: i })} />
            ))}
          </div>
        </div>
      )}

      {tab === "extras" && (
        <div>
          <p className="mb-1 text-center text-[9px] uppercase tracking-wider text-white/50">Chapéu / acessório</p>
          <div className="mb-2 grid grid-cols-6 gap-1">
            {AVATAR_HATS.map((h, i) => (
              <St key={i} on={cfg.hat === i} label={h.name} tid={`bw-av-hat-${i}`} onClick={() => onChange({ ...cfg, hat: i })}>
                {h.emoji}
              </St>
            ))}
          </div>
          <p className="mb-1 text-center text-[9px] uppercase tracking-wider text-white/50">Capa</p>
          <div className="grid grid-cols-2 gap-1">
            {AVATAR_CAPES.map((c, i) => (
              <button
                key={i}
                data-testid={`bw-av-cape-${i}`}
                onClick={() => onChange({ ...cfg, cape: i })}
                className={`rounded-lg border px-1.5 py-1 text-[10px] transition-all ${cfg.cape === i ? "border-white/80 bg-white/20" : "border-white/15 bg-white/5 hover:border-white/40"}`}
              >
                {c.hex !== null && c.hex !== -1 && (
                  <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: hexCss(c.hex) }} />
                )}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
