#!/usr/bin/env python3
"""Write the mega redesigned CompanyPublicProfile.tsx"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

content = r'''import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2, Gamepad2, Users, Calendar, Zap, ChevronRight, MapPin, Globe,
  CheckCircle2, Copy, Check, ArrowRight, Sparkles, Eye, MousePointerClick,
  Clock, Trophy, Radio, Star, Activity, PlayCircle, Palette
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

interface CompanyInfo {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  city: string | null;
  province: string | null;
  created_at: string | null;
  phone: string | null;
}

interface CompanyBranding {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  company_logo_url: string | null;
  background_image_url: string | null;
  company_name: string | null;
  company_slogan: string | null;
}

interface GameItem {
  id: string;
  name: string;
  type: "wheel" | "millionaire" | "custom";
  is_published?: boolean;
  segment_count?: number;
  created_at: string;
  is_active?: boolean;
}

interface LiveSession {
  code: string;
  title?: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  players_count: number;
  games_count: number;
  winners: string[];
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 400, damping: 15 };

function CountingNumber({ target, duration = 1.5 }: { target: number | string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const numericTarget = typeof target === "number" ? target : parseInt(target) || 0;

  useEffect(() => {
    if (numericTarget === 0) { setDisplay(0); return; }
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [numericTarget, duration]);

  return <>{numericTarget > 999 ? display.toLocaleString("pt-PT") : display}</>;
}

function ProfileParticles({ color }: { color: string }) {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 5,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="profile-particle"
          style={{
            left: p.left + "%",
            bottom: "10%",
            width: p.size,
            height: p.size,
            backgroundColor: color,
            "--p-delay": p.delay + "s",
            "--p-duration": p.duration + "s",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function StatRing({ value, max, color, size = 64 }: { value: number; max: number; color: string; size?: number }) {
  const [offset, setOffset] = useState(100);
  const r = 28;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    setTimeout(() => setOffset(100 - pct * 100), 200);
  }, [value, max]);

  return (
    <svg width={size} height={size} className="stat-ring" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke={color + "15"} strokeWidth="4" />
      <circle
        cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={(offset / 100) * circumference}
        className="progress"
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function WheelVisual({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke={color + "40"} strokeWidth="2" />
      <circle cx="32" cy="32" r="20" stroke={color + "25"} strokeWidth="1.5" strokeDasharray="4 4" />
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <line key={angle} x1="32" y1="32" x2="32" y2="6"
          stroke={color + "30"} strokeWidth="1.5"
          transform={`rotate(${angle} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="5" fill={color} opacity="0.6" />
      <circle cx="32" cy="32" r="2.5" fill={color} />
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 32 + Math.cos(rad) * 22;
        const y = 32 + Math.sin(rad) * 22;
        const colors = [color, color + "CC", color + "99", color, color + "CC", color + "99"];
        return <circle key={angle} cx={x} cy={y} r="3" fill={colors[i]} />;
      })}
    </svg>
  );
}

function MillionaireVisual({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="4" width="48" height="56" rx="4" stroke={color + "40"} strokeWidth="2" />
      <rect x="12" y="8" width="40" height="48" rx="2" fill={color + "08"} />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <rect x="16" y={14 + row * 10} width="32" height="7" rx="2"
            fill={row < 2 ? color + "25" : color + "12"} />
          <text x="20" y={20 + row * 10} fill={row < 2 ? color : color + "80"}
            fontSize="6" fontWeight="bold" fontFamily="monospace">
            {row === 0 ? "$1M" : row === 1 ? "$500K" : row === 2 ? "$100K" : "$10K"}
          </text>
        </g>
      ))}
      <circle cx="32" cy="57" r="3" fill={color} opacity="0.6" />
    </svg>
  );
}

const CompanyPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [activeSection, setActiveSection] = useState("games");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
        if (profile) {
          setCompany({
            user_id: profile.id, display_name: profile.display_name, company_name: profile.company_name,
            avatar_url: profile.avatar_url, is_verified: profile.is_verified, city: profile.city,
            province: profile.province, created_at: profile.created_at, phone: profile.phone,
          });
        }
      } catch (e) { console.error("Failed to load profile:", e); }

      try {
        const { data: brand } = await supabase.from("company_branding").select("*").eq("user_id", id).maybeSingle();
        if (brand) setBranding(brand as any);
      } catch (e) { console.error("Failed to load branding:", e); }

      try {
        const { data: wheels } = await supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const { data: mils } = await supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const allGames: GameItem[] = [];
        (wheels || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: "wheel", is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (mils || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || "Quem Quer Ser Milionario", type: "millionaire", is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
      } catch (e) { console.error("Failed to load games:", e); }

      try {
        const { data: lives } = await supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20);
        if (lives) {
          const mapped: LiveSession[] = lives.map((l: any) => ({
            code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(),
            ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0,
            players_count: 0, games_count: 0, winners: [],
          }));
          setSessions(mapped);
        }
      } catch (e) { console.error("Failed to load lives:", e); }

      setLoading(false);
    };
    load();
  }, [id]);

  const joinGame = useCallback(() => {
    if (!playerName.trim()) return;
    setHasJoined(true);
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (!existing.includes(playerName.trim())) {
        existing.push(playerName.trim());
        localStorage.setItem(key, JSON.stringify(existing));
      }
      toast({ title: `Bem-vindo, ${playerName.trim()}!`, description: "Agora podes participar nos jogos desta empresa." });
    } catch {}
  }, [playerName, id, toast]);

  useEffect(() => {
    if (!id) return;
    try {
      const key = `companyPlayer:${id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (existing.length > 0) { setPlayerName(existing[0]); setHasJoined(true); }
    } catch {}
  }, [id]);

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const primary = branding?.primary_color || "#fbbf24";
  const secondary = branding?.secondary_color || "#3b82f6";
  const accent = branding?.accent_color || "#8b5cf6";
  const bgColor = branding?.background_color || undefined;
  const companyName = company?.company_name || company?.display_name || "Empresa";
  const totalGames = games.length;
  const publishedGames = games.filter(g => g.is_published || g.is_active).length;
  const totalLives = sessions.length;
  const wheelGames = games.filter(g => g.type === "wheel");
  const millionaireGames = games.filter(g => g.type === "millionaire");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const revealRef = useCallback((node: HTMLDivElement | null, sectionId: string) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealedSections(prev => new Set(prev).add(sectionId));
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
  }, []);

  const sections = [
    { id: "games", label: "Jogos", Icon: Gamepad2, count: totalGames },
    { id: "lives", label: "Lives", Icon: Radio, count: totalLives },
    { id: "about", label: "Sobre", Icon: Globe, count: null },
  ];

  const heroParallax = Math.min(scrollY * 0.3, 60);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-soft">
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          <div className="relative">
            <motion.div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            >
              <Gamepad2 className="h-10 w-10" style={{ color: primary }} />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              style={{ border: `2px solid ${primary}30` }}
            />
            <motion.div
              className="absolute inset-[-8px] rounded-3xl"
              animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.4 }}
              style={{ border: `1px solid ${accent}20` }}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: primary }}>A carregar perfil...</p>
            <div className="flex gap-1 justify-center mt-3">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: primary }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-soft">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING }}
        >
          <motion.div
            className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}15)` }}
            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-black font-display">Empresa nao encontrada</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              O perfil desta empresa nao existe ou foi removido.
            </p>
          </div>
          <Link
            to="/empresas"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "#fff" }}
          >
            <ArrowRight className="h-4 w-4" /> Ver todas as empresas
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise" style={{ backgroundColor: bgColor }}>
      {branding?.background_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
          style={{ backgroundImage: `url(${branding.background_image_url})` }}
        />
      )}
      <div className="floating-stars"><span /><span /><span /><span /><span /><span /><span /><span /></div>
      <div className="ambient-glow" />

      {/* ===== AURORA HERO ===== */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative overflow-hidden hero-gradient-border"
        style={{
          minHeight: "480px",
          "--hborder-c1": (primary + "60") as any,
          "--hborder-c2": (secondary + "40") as any,
        }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: (primary + "35") }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: (secondary + "30") }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: (accent + "25") }} />
        </div>
        <ProfileParticles color={primary} />

        <div
          className="hero-grid-overlay"
          style={{ "--grid-color": (primary + "60") } as any}
        />

        <div
          className="hero-mouse-light"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, ${primary}06, transparent 40%)`,
          }}
        />

        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 pt-8 pb-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0 }}
          >
            <Link
              to="/empresas"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-8 group"
            >
              <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:translate-x-0.5" />
              Todas as empresas
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
            style={{ transform: `translateY(${-heroParallax}px)` }}
          >
            <div className="relative group">
              <div className="logo-3d-float">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={SPRING_BOUNCE}
                >
                  <div
                    className="h-32 w-32 md:h-40 md:w-40 rounded-3xl border-2 overflow-hidden profile-logo-glow"
                    style={{
                      "--glow-color": (primary + "40") as any,
                      "--glow-color-soft": (primary + "15") as any,
                      borderColor: (primary + "50"),
                      boxShadow: `0 0 40px ${primary}20, 0 25px 80px -15px rgba(0,0,0,0.4)`,
                    }}
                  >
                    {(branding?.company_logo_url || company.avatar_url) ? (
                      <img
                        src={branding?.company_logo_url || company.avatar_url || ""}
                        alt={companyName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${primary}30, ${accent}15)` }}
                      >
                        <span className="text-5xl font-black" style={{ color: primary }}>
                          {companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
              {company.is_verified && (
                <motion.div
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full flex items-center justify-center shadow-lg verified-badge-shine"
                  style={{ backgroundColor: primary, boxShadow: `0 4px 20px ${primary}50` }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...SPRING_BOUNCE, delay: 0.5 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <motion.div
                className="flex items-center gap-3 flex-wrap"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.2 }}
              >
                <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight">
                  <span className="text-shimmer" style={{
                    "--shimmer-c1": "hsl(var(--foreground))" as any,
                    "--shimmer-c2": (primary + "80") as any,
                  }}>{companyName}</span>
                </h1>
                {company.is_verified && (
                  <motion.span
                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                    style={{ backgroundColor: (primary + "15"), color: primary, border: `1px solid ${primary}25` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRING_BOUNCE, delay: 0.6 }}
                  >
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Verificado</span>
                  </motion.span>
                )}
              </motion.div>
              {branding?.company_slogan && (
                <motion.p
                  className="text-base mt-2 text-muted-foreground font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.4 }}
                >
                  {branding.company_slogan}
                  <span className="typing-cursor" style={{ backgroundColor: primary }} />
                </motion.p>
              )}
              <motion.div
                className="flex items-center gap-5 mt-4 text-sm text-muted-foreground flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {(company.city || company.province) && (
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <MapPin className="h-4 w-4" style={{ color: primary }} />
                    {[company.city, company.province].filter(Boolean).join(", ")}
                  </span>
                )}
                {company.created_at && (
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Calendar className="h-4 w-4" style={{ color: secondary }} />
                    Membro desde {new Date(company.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4" style={{ color: "#10b981" }} />
                  <span style={{ color: "#10b981" }} className="font-semibold">Ativo agora</span>
                </span>
              </motion.div>
            </div>

            <motion.div
              className="flex gap-2 pb-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.3 }}
            >
              <motion.button
                onClick={copyProfileLink}
                className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${primary}30`,
                  color: primary,
                }}
                whileHover={{ scale: 1.05, boxShadow: `0 4px 20px ${primary}25` }}
                whileTap={{ scale: 0.95 }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copiado!" : "Partilhar"}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ===== MEGA STATS ===== */}
      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {[
            { icon: Gamepad2, label: "Jogos Criados", value: totalGames, sub: `${publishedGames} ativos`, color: primary, max: Math.max(totalGames, 10) },
            { icon: Radio, label: "Lives Realizadas", value: totalLives, sub: "transmissoes", color: secondary, max: Math.max(totalLives, 10) },
            { icon: Trophy, label: "Rodas", value: wheelGames.length, sub: `${millionaireGames.length} quiz`, color: accent, max: Math.max(wheelGames.length, 5) },
            { icon: Zap, label: "Engajamento", value: "+", sub: "crescendo", color: "#10b981", max: 1 },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: 0.5 + i * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div
                className="mega-stat-card"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  "--stat-c1": (s.color + "30") as any,
                  "--stat-c2": (s.color + "10") as any,
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div
                      className="stat-icon-bg p-3 rounded-2xl"
                      style={{ background: `linear-gradient(135deg, ${s.color}20, ${s.color}08)` }}
                    >
                      <s.icon className="h-6 w-6" style={{ color: s.color }} />
                    </div>
                    {typeof s.value === "number" && s.max > 1 && (
                      <div className="absolute -top-1 -right-1">
                        <StatRing value={s.value} max={s.max} color={s.color} size={36} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="mega-stat-value font-display" style={{ color: s.color }}>
                      {typeof s.value === "number" ? (
                        <CountingNumber target={s.value} />
                      ) : (
                        s.value
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                      {s.label}
                    </p>
                    {s.sub && (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{s.sub}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ===== JOIN SECTION ===== */}
      <div className="container mx-auto px-4 mt-8 relative z-20">
        <AnimatePresence mode="wait">
          {!hasJoined ? (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ ...SPRING, delay: 0.6 }}
            >
              <div className="join-card-v2">
                <div
                  className="join-border-anim"
                  style={{
                    "--jc1": (primary + "50") as any,
                    "--jc2": (accent + "30") as any,
                  }}
                />
                <div className="relative z-10 p-7 md:p-9">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0 text-center md:text-left">
                      <motion.div
                        className="inline-flex p-4 rounded-2xl mb-3"
                        style={{
                          background: `linear-gradient(135deg, ${primary}20, ${accent}10)`,
                          boxShadow: `0 0 40px ${primary}15`,
                        }}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      >
                        <PlayCircle className="h-8 w-8" style={{ color: primary }} />
                      </motion.div>
                      <h3 className="text-xl font-black font-display">Junta-te aos jogos!</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Coloca o teu nome para participar em todos os jogos e concursos ao vivo desta empresa
                      </p>
                    </div>
                    <div className="flex-1 w-full max-w-md">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="O teu nome..."
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && joinGame()}
                            className="h-12 rounded-xl bg-background/50 border-white/10 text-base focus:border-[color:var(--join-focus)]"
                            style={{ "--join-focus": primary } as any}
                          />
                        </div>
                        <motion.button
                          onClick={joinGame}
                          disabled={!playerName.trim()}
                          className="h-12 px-7 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-40"
                          style={{
                            background: `linear-gradient(135deg, ${primary}, ${accent})`,
                            color: "#fff",
                            boxShadow: `0 6px 25px ${primary}35`,
                          }}
                          whileHover={{ scale: 1.04, boxShadow: `0 8px 35px ${primary}45` }}
                          whileTap={{ scale: 0.96 }}
                        >
                          Entrar <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="joined"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ...SPRING }}
            >
              <div
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${primary}08, transparent)`,
                  border: `1px solid ${primary}15`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <motion.div
                  className="h-14 w-14 rounded-full flex items-center justify-center font-black text-xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "#fff", boxShadow: `0 4px 20px ${primary}30` }}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={SPRING_BOUNCE}
                >
                  {playerName.charAt(0).toUpperCase()}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg">Ola, {playerName}!</p>
                  <p className="text-sm text-muted-foreground">Pronto para jogar em todos os jogos ao vivo.</p>
                </div>
                <button
                  onClick={() => { setHasJoined(false); setPlayerName(""); }}
                  className="text-xs font-medium px-4 py-2 rounded-lg transition-all hover:bg-white/5"
                  style={{ color: primary, border: `1px solid ${primary}20` }}
                >
                  Trocar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== CONTENT SECTIONS ===== */}
      <div className="container mx-auto px-4 mt-12 pb-20 relative z-20">
        {/* Section navigation pills */}
        <motion.div
          className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.65 }}
        >
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <motion.button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={"section-tab-v2 relative flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap " + (isActive ? "active" : "")}
                style={{
                  backgroundColor: isActive ? (primary + "15") : "rgba(255,255,255,0.03)",
                  color: isActive ? primary : "hsl(var(--muted-foreground))",
                  border: isActive ? `1px solid ${primary}30` : "1px solid rgba(255,255,255,0.05)",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="tab-glow rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at center, ${primary}10, transparent 70%)` }}
                />
                <sec.Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{sec.label}</span>
                {sec.count !== null && (
                  <span
                    className="relative z-10 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: isActive ? (primary + "25") : "hsl(var(--muted))" }}
                  >
                    {sec.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ===== GAMES ===== */}
          {activeSection === "games" && (
            <motion.div
              key="games"
              ref={n => revealRef(n, "games")}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ ...SPRING }}
            >
              {games.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {games.map((game, i) => {
                    const isWheel = game.type === "wheel";
                    const isActive = game.is_published || game.is_active;
                    const gameColor = isWheel ? primary : secondary;
                    return (
                      <motion.div
                        key={game.id}
                        className="game-card-v2"
                        style={{
                          border: isActive ? `1px solid ${gameColor}20` : "1px solid rgba(255,255,255,0.04)",
                        }}
                        initial={{ opacity: 0, y: 25, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ ...SPRING, delay: i * 0.07 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-5">
                            <div className="game-visual">
                              {isWheel ? (
                                <WheelVisual color={gameColor} />
                              ) : (
                                <MillionaireVisual color={gameColor} />
                              )}
                            </div>
                            <motion.span
                              className={"px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase " + (isActive ? "" : "")}
                              style={{
                                backgroundColor: isActive ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                                color: isActive ? "#10b981" : "hsl(var(--muted-foreground))",
                                border: isActive ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent",
                              }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ ...SPRING_BOUNCE, delay: 0.3 + i * 0.07 }}
                            >
                              <span className="flex items-center gap-1">
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                {isActive ? "Ativo" : "Rascunho"}
                              </span>
                            </motion.span>
                          </div>

                          <h3 className="font-bold text-lg mb-1.5">{game.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {isWheel
                              ? ("Roda de Premios" + (game.segment_count ? ` / ${game.segment_count} segmentos` : ""))
                              : "Quem Quer Ser Milionario"}
                          </p>

                          <div
                            className="mt-5 pt-4 flex items-center justify-between text-xs text-muted-foreground/60"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(game.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <motion.div
                              className="flex items-center gap-1 text-[11px] font-semibold"
                              style={{ color: gameColor }}
                              whileHover={{ x: 3 }}
                            >
                              Ver <ChevronRight className="h-3.5 w-3.5" />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-v2 text-center py-24">
                  <div className="empty-orb" style={{ backgroundColor: primary, width: 120, height: 120, top: "20%", left: "40%" }} />
                  <motion.div className="empty-float inline-block">
                    <div
                      className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: `linear-gradient(135deg, ${primary}10, ${accent}05)`, border: `1px dashed ${primary}20` }}
                    >
                      <Gamepad2 className="h-11 w-11 text-muted-foreground/20" />
                    </div>
                  </motion.div>
                  <p className="text-lg font-bold text-muted-foreground">Nenhum jogo configurado ainda</p>
                  <p className="text-sm text-muted-foreground/50 mt-1">Esta empresa ainda nao criou jogos</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== LIVES ===== */}
          {activeSection === "lives" && (
            <motion.div
              key="lives"
              ref={n => revealRef(n, "lives")}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ ...SPRING }}
            >
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <motion.div
                      key={s.code + "-" + i}
                      className="live-card-v2"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        "--live-glow": (primary + "15") as any,
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING, delay: i * 0.06 }}
                      whileHover={{ x: 8 }}
                    >
                      <div className="p-5 flex items-center gap-5">
                        <div
                          className="relative h-16 w-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}05)`, border: `1px solid ${primary}15` }}
                        >
                          <Radio className="h-6 w-6" style={{ color: primary }} />
                          <span className="text-[8px] font-bold mt-0.5 uppercase tracking-widest" style={{ color: primary }}>
                            Live
                          </span>
                          <div className="live-pulse-ring" style={{ "--live-dot-color": "#ef4444" } as any} />
                          <div
                            className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
                            style={{ backgroundColor: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.6)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base truncate">{s.title || `Live ${s.code}`}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" style={{ color: secondary }} />
                              {new Date(s.started_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {s.duration_sec > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" style={{ color: accent }} />
                                {Math.round(s.duration_sec / 60)} min
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.div
                          className="flex-shrink-0"
                          whileHover={{ x: 3 }}
                        >
                          <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-v2 text-center py-24">
                  <div className="empty-orb" style={{ backgroundColor: secondary, width: 100, height: 100, top: "20%", left: "45%" }} />
                  <motion.div className="empty-float inline-block">
                    <div
                      className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: `linear-gradient(135deg, ${secondary}10, ${primary}05)`, border: `1px dashed ${secondary}20` }}
                    >
                      <Radio className="h-11 w-11 text-muted-foreground/20" />
                    </div>
                  </motion.div>
                  <p className="text-lg font-bold text-muted-foreground">Nenhuma live realizada ainda</p>
                  <p className="text-sm text-muted-foreground/50 mt-1">Esta empresa ainda nao realizou lives</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== ABOUT ===== */}
          {activeSection === "about" && (
            <motion.div
              key="about"
              ref={n => revealRef(n, "about")}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ ...SPRING }}
              className="space-y-6"
            >
              {/* Company info card */}
              <div
                className="rounded-2xl p-7"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl" style={{ background: (primary + "15") }}>
                    <Globe className="h-5 w-5" style={{ color: primary }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display">Sobre {companyName}</h3>
                    <p className="text-xs text-muted-foreground">Informacoes da empresa</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: Globe, label: "Nome", value: company.display_name || company.company_name || "-", color: primary },
                    { icon: MapPin, label: "Localizacao", value: [company.city, company.province].filter(Boolean).join(", ") || "-", color: secondary },
                    { icon: Calendar, label: "Membro desde", value: company.created_at ? new Date(company.created_at).toLocaleDateString("pt-PT") : "-", color: accent },
                    { icon: Zap, label: "Estado", value: "Ativo", color: "#10b981" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      className="about-info-row flex items-center gap-3 p-4 rounded-xl cursor-default"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.03)",
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: i * 0.08 }}
                    >
                      <div className="p-2 rounded-lg" style={{ background: (item.color + "12") }}>
                        <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
                        <p className="text-sm font-bold mt-0.5">{item.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Visual identity card */}
              <div
                className="rounded-2xl p-7"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl" style={{ background: (accent + "15") }}>
                    <Palette className="h-5 w-5" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-display">Identidade Visual</h3>
                    <p className="text-xs text-muted-foreground">Cores e marca da empresa</p>
                  </div>
                </div>
                {branding ? (
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      ["Cor Principal", branding.primary_color],
                      ["Cor Secundaria", branding.secondary_color],
                      ["Cor de Acento", branding.accent_color],
                      ["Cor de Fundo", branding.background_color],
                      ["Cor do Texto", branding.text_color],
                    ].map(([label, color], i) => (
                      <motion.div
                        key={label}
                        className="color-swatch text-center"
                        style={{ "--swatch-color": (color + "50") } as React.CSSProperties}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ ...SPRING, delay: i * 0.07 }}
                      >
                        <div
                          className="h-16 rounded-xl border border-white/5 mb-2.5 transition-all"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-[10px] text-muted-foreground font-semibold leading-tight">{label}</p>
                        <p className="text-[9px] text-muted-foreground/40 mt-0.5 font-mono">{color}</p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/15" />
                    <p className="text-sm text-muted-foreground">Sem identidade visual configurada</p>
                  </div>
                )}
              </div>

              {/* Brand preview card */}
              <div
                className="brand-preview-glass rounded-2xl p-7"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  "--bp-c1": (primary + "08") as any,
                  "--bp-c2": (secondary + "06") as any,
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl" style={{ background: (secondary + "15") }}>
                      <Eye className="h-5 w-5" style={{ color: secondary }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black font-display">Pre-visualizacao</h3>
                      <p className="text-xs text-muted-foreground">Como a marca aparece aos clientes</p>
                    </div>
                  </div>
                  <div
                    className="rounded-2xl p-8 text-center"
                    style={{ backgroundColor: branding?.background_color || "#0a0a0a", border: `2px solid ${primary}25` }}
                  >
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {(branding?.company_logo_url || company.avatar_url) ? (
                        <img
                          src={branding?.company_logo_url || company.avatar_url || ""}
                          alt={companyName}
                          className="h-12 w-12 rounded-xl object-cover"
                          style={{ boxShadow: `0 4px 15px rgba(0,0,0,0.3)` }}
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center font-black text-xl"
                          style={{ backgroundColor: primary, color: branding?.background_color || "#000" }}
                        >
                          {companyName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="text-2xl font-black font-display"
                        style={{ color: branding?.text_color || "#fff" }}
                      >
                        {branding?.company_name || companyName}
                      </span>
                    </div>
                    {branding?.company_slogan && (
                      <p className="text-sm mb-6" style={{ color: (branding?.text_color || "#fff") + "99" }}>
                        {branding.company_slogan}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {[primary, secondary, accent].map((c) => (
                        <motion.div
                          key={c}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold"
                          style={{ backgroundColor: c, color: branding?.background_color || "#000" }}
                          whileHover={{ scale: 1.08, y: -2 }}
                        >
                          Botao
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
};

export default CompanyPublicProfile;
'''

with open(FILE, 'w') as f:
    f.write(content)

print(f"Written {len(content)} chars to {FILE}")
