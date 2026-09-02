#!/usr/bin/env python3
"""Rewrite CompanyPublicProfile.tsx with incredible premium design."""

import os

COMPONENT = r'''import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Share2, ExternalLink, Gamepad2, Trophy, Users, Clock, Flame,
  Calendar, Star, Zap, Award, ChevronRight, MapPin, Globe,
  CheckCircle2, Copy, Check, ArrowRight, Heart, Play,
  Music, UtensilsCrossed, Dumbbell, GraduationCap, ShoppingBag,
  Palette, Mic2, Sparkles, TrendingUp, Eye, Crown, Radio,
  Gift, Target, BarChart3, Shield, Gem, Rocket, Waves
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

/* ─── Spring Configs ────────────────────────────────── */
const SPRING_UP = { type: "spring" as const, stiffness: 260, damping: 22 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 300, damping: 20 };

/* ─── Types ──────────────────────────────────────────── */
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
  niche?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  hero_cta_link?: string;
  about_text?: string;
  social_links?: Record<string, string>;
  overlay_style?: string;
  homepage_layout?: string;
  featured_badge?: string;
  show_leaderboard?: boolean;
  show_games?: boolean;
  show_lives?: boolean;
  show_stats?: boolean;
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

/* ─── Niche System ──────────────────────────────────── */
type NicheId = "entertainment" | "gaming" | "restaurant" | "retail" | "education" | "fitness" | "music" | "fashion" | "tech" | "food" | "beauty" | "sports" | "casino" | "charity" | "other";

const NICHE_META: Record<string, { icon: any; label: string; gradient: string; particleColor: string; heroGlow: string; badge: string; defaultTitle: string; defaultCta: string }> = {
  entertainment: { icon: Sparkles, label: "Entretenimento", gradient: "from-violet-600 via-fuchsia-500 to-pink-500", particleColor: "#d946ef", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(217,70,239,0.3), transparent 70%)", badge: "Show de Entretenimento", defaultTitle: "Vem divertir-te connosco", defaultCta: "Entrar no Jogo" },
  gaming: { icon: Gamepad2, label: "Gaming", gradient: "from-emerald-600 via-cyan-500 to-blue-500", particleColor: "#06b6d4", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.3), transparent 70%)", badge: "Gaming Zone", defaultTitle: "Arena de Jogos", defaultCta: "Começar a Jogar" },
  restaurant: { icon: UtensilsCrossed, label: "Restauração", gradient: "from-orange-600 via-red-500 to-rose-500", particleColor: "#f97316", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.3), transparent 70%)", badge: "Sabor & Diversão", defaultTitle: "Joga e Ganha Prémios", defaultCta: "Ver Menu de Jogos" },
  retail: { icon: ShoppingBag, label: "Retalho", gradient: "from-amber-500 via-orange-500 to-red-500", particleColor: "#f59e0b", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.3), transparent 70%)", badge: "Shopping Experience", defaultTitle: "Promoções Exclusivas", defaultCta: "Explorar Ofertas" },
  education: { icon: GraduationCap, label: "Educação", gradient: "from-blue-600 via-indigo-500 to-purple-500", particleColor: "#6366f1", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3), transparent 70%)", badge: "Aprende & Joga", defaultTitle: "Quizzes ao Vivo", defaultCta: "Começar Aprendizagem" },
  fitness: { icon: Dumbbell, label: "Fitness", gradient: "from-lime-500 via-emerald-500 to-teal-500", particleColor: "#10b981", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.3), transparent 70%)", badge: "Desafio Fitness", defaultTitle: "Desafios ao Vivo", defaultCta: "Aceitar Desafio" },
  music: { icon: Music, label: "Música", gradient: "from-pink-600 via-rose-500 to-red-500", particleColor: "#f43f5e", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.3), transparent 70%)", badge: "Experiência Musical", defaultTitle: "Karaoke ao Vivo", defaultCta: "Entrar no Palco" },
  fashion: { icon: Sparkles, label: "Moda", gradient: "from-fuchsia-600 via-pink-500 to-rose-400", particleColor: "#ec4899", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.3), transparent 70%)", badge: "Fashion Live", defaultTitle: "Desfiles & Sorteios", defaultCta: "Ver Coleção" },
  tech: { icon: Rocket, label: "Tecnologia", gradient: "from-cyan-500 via-blue-500 to-indigo-600", particleColor: "#0ea5e9", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.3), transparent 70%)", badge: "Tech Hub", defaultTitle: "Inovação ao Vivo", defaultCta: "Explorar" },
  food: { icon: Gift, label: "Alimentação", gradient: "from-yellow-500 via-amber-500 to-orange-500", particleColor: "#eab308", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.3), transparent 70%)", badge: "Sabores & Prémios", defaultTitle: "Gosta de Comida?", defaultCta: "Provar Sorte" },
  beauty: { icon: Star, label: "Beleza", gradient: "from-rose-400 via-pink-500 to-fuchsia-500", particleColor: "#f472b6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,114,182,0.3), transparent 70%)", badge: "Beauty Experience", defaultTitle: "Tutoriais ao Vivo", defaultCta: "Participar" },
  sports: { icon: Trophy, label: "Desporto", gradient: "from-green-500 via-emerald-600 to-teal-600", particleColor: "#059669", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(5,150,105,0.3), transparent 70%)", badge: "Zona Desportiva", defaultTitle: "Desafios Desportivos", defaultCta: "Competir Agora" },
  casino: { icon: Gem, label: "Casino", gradient: "from-yellow-500 via-amber-600 to-orange-600", particleColor: "#d97706", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(217,119,6,0.3), transparent 70%)", badge: "Casino Night", defaultTitle: "Roda da Fortuna", defaultCta: "Jogar Agora" },
  charity: { icon: Heart, label: "Solidariedade", gradient: "from-teal-500 via-cyan-500 to-blue-500", particleColor: "#14b8a6", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.3), transparent 70%)", badge: "Causa Solidária", defaultTitle: "Joga por uma Causa", defaultCta: "Apoiar" },
  other: { icon: Zap, label: "Outro", gradient: "from-slate-600 via-gray-500 to-zinc-500", particleColor: "#64748b", heroGlow: "radial-gradient(ellipse at 50% 0%, rgba(100,116,139,0.3), transparent 70%)", badge: "Experiência Única", defaultTitle: "Vem Descobrir", defaultCta: "Explorar" },
};

/* ═══════════════════════════════════════════════════════
   ANIMATED COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ─── Aurora Background ─────────────────────────────── */
const AuroraBg = ({ color1, color2, color3 }: { color1: string; color2: string; color3: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      className="absolute -top-1/2 -left-1/4 w-[150%] h-[200%] rounded-full opacity-30 blur-[100px]"
      style={{ background: `conic-gradient(from 0deg, ${color1}40, transparent 30%, ${color2}30, transparent 60%, ${color3}40, transparent 90%, ${color1}40)` }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute top-1/4 -right-1/4 w-[100%] h-[100%] rounded-full opacity-20 blur-[80px]"
      style={{ background: `radial-gradient(circle, ${color2}50, transparent 60%)` }}
      animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/* ─── Floating Orbs ──────────────────────────────────── */
const FloatingOrbs = ({ colors }: { colors: string[] }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {colors.map((c, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 60 + i * 40, height: 60 + i * 40,
          background: `radial-gradient(circle, ${c}25, transparent 70%)`,
          left: `${15 + i * 25}%`, top: `${20 + (i % 3) * 25}%`,
          filter: "blur(1px)",
        }}
        animate={{
          y: [0, -25 - i * 8, 0, 15 + i * 5, 0],
          x: [0, 15 - i * 5, -10 + i * 3, 0],
          scale: [1, 1.15, 0.95, 1.05, 1],
          opacity: [0.4, 0.7, 0.3, 0.6, 0.4],
        }}
        transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
      />
    ))}
  </div>
);

/* ─── Star Field ────────────────────────────────────── */
const StarField = ({ count = 40 }: { count?: number }) => {
  const stars = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      dur: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    }))
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

/* ─── Animated Counter ──────────────────────────────── */
const CountUp = ({ target, duration = 1.5 }: { target: number; duration?: number }) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || !ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const ease = (t: number) => 1 - Math.pow(1 - t, 3);
          const tick = (now: number) => {
            const t = Math.min((now - start) / (duration * 1000), 1);
            setVal(Math.round(ease(t) * target));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val}</span>;
};

/* ─── Ring Stat ──────────────────────────────────────── */
const RingStat = ({ icon: Icon, label, value, color, delay, suffix }: { icon: any; label: string; value: number; color: string; delay: number; suffix?: string }) => {
  const circumference = 2 * Math.PI * 36;
  const progress = Math.min(value / Math.max(value, 1), 1);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div ref={ref} initial={{ y: 40, opacity: 0, scale: 0.85 }} animate={visible ? { y: 0, opacity: 1, scale: 1 } : {}} transition={{ ...SPRING_UP, delay }} className="relative group text-center">
      <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
          <motion.circle
            cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={visible ? { strokeDashoffset: circumference * (1 - progress) } : {}}
            transition={{ duration: 1.5, delay: delay + 0.3, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-4 w-4 mb-0.5" style={{ color }} />
          <span className="text-xl md:text-2xl font-black tabular-nums" style={{ color }}><CountUp target={value} /></span>
        </div>
      </div>
      <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-2">{label}</p>
      {suffix && <p className="text-[9px] text-white/30 mt-0.5">{suffix}</p>}
      <motion.div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${color}10, transparent 70%)` }} />
    </motion.div>
  );
};

/* ─── Shimmer Card ──────────────────────────────────── */
const ShimmerCard = ({ children, className = "", style = {}, delay = 0 }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; delay?: number }) => (
  <motion.div
    initial={{ y: 30, opacity: 0, scale: 0.95 }}
    whileInView={{ y: 0, opacity: 1, scale: 1 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ ...SPRING_UP, delay }}
    className={`relative group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl hover:border-white/[0.12] transition-all duration-500 ${className}`}
    style={style}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
    {children}
  </motion.div>
);

/* ─── Glass Pill ─────────────────────────────────────── */
const GlassPill = ({ children, color, icon: Icon }: { children: React.ReactNode; color: string; icon?: any }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08] text-white/80 text-xs font-bold">
    {Icon && <Icon className="h-3.5 w-3.5" style={{ color }} />}
    {children}
  </div>
);
);

/* ─── Mouse Glow (follows cursor) ───────────────────── */
const MouseGlow = ({ color, containerRef }: { color: string; containerRef: React.RefObject<HTMLDivElement | null> }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 30 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    el.addEventListener("mousemove", handler);
    return () => el.removeEventListener("mousemove", handler);
  }, [containerRef, mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none absolute w-[400px] h-[400px] rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500"
      style={{
        left: smoothX, top: smoothY,
        x: "-50%", y: "-50%",
        background: `radial-gradient(circle, ${color}08, transparent 60%)`,
        filter: "blur(2px)",
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
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
  const [activeTab, setActiveTab] = useState("games");
  const [liked, setLiked] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const headerOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);

  /* ─── Data Loading ─────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, brandRes, wheelsRes, milsRes, livesRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).single(),
          supabase.from("company_branding").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false }),
          supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false }),
          supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20),
        ]);
        if (profileRes.data) {
          const p = profileRes.data;
          setCompany({ user_id: p.id, display_name: p.display_name, company_name: p.company_name, avatar_url: p.avatar_url, is_verified: p.is_verified, city: p.city, province: p.province, created_at: p.created_at, phone: p.phone });
        }
        if (brandRes.data) setBranding(brandRes.data as any);
        const allGames: GameItem[] = [];
        (wheelsRes.data || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: "wheel", is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (milsRes.data || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || "Quem Quer Ser Milionário", type: "millionaire", is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
        if (livesRes.data) {
          setSessions(livesRes.data.map((l: any) => ({ code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(), ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0, players_count: 0, games_count: 0, winners: [] })));
        }
      } catch (e) { console.error(e); }
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
      if (!existing.includes(playerName.trim())) { existing.push(playerName.trim()); localStorage.setItem(key, JSON.stringify(existing)); }
      toast({ title: `Bem-vindo, ${playerName.trim()}!`, description: "Agora podes participar nos jogos." });
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

  const copyLink = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  /* ─── Derived Values ───────────────────────────────── */
  const primary = branding?.primary_color || "#fbbf24";
  const secondary = branding?.secondary_color || "#3b82f6";
  const accent = branding?.accent_color || "#8b5cf6";
  const bgColor = branding?.background_color || undefined;
  const companyName = company?.company_name || company?.display_name || "Empresa";
  const nicheKey = branding?.niche || "entertainment";
  const niche = NICHE_META[nicheKey] || NICHE_META.entertainment;
  const NicheIcon = niche.icon;
  const totalGames = games.length;
  const publishedGames = games.filter((g) => g.is_published || g.is_active).length;
  const totalLives = sessions.length;
  const heroTitle = branding?.hero_title || niche.defaultTitle;
  const heroSubtitle = branding?.hero_subtitle || branding?.company_slogan || `Descobre os jogos e lives de ${companyName}`;
  const ctaText = branding?.hero_cta_text || niche.defaultCta;
  const ctaLink = branding?.hero_cta_link || "/lives";
  const aboutText = branding?.about_text || null;
  const socialLinks = branding?.social_links || {};

  /* ─── Loading State ────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <motion.div className="h-16 w-16 rounded-2xl border-2 border-white/10" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ borderTopColor: primary }} />
          <motion.div className="absolute inset-0 rounded-2xl" style={{ boxShadow: `0 0 40px ${primary}30` }} animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
      </div>
    );
  }

  /* ─── Not Found ────────────────────────────────────── */
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="h-24 w-24 mx-auto mb-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Gamepad2 className="h-12 w-12 text-white/10" />
          </div>
          <h2 className="text-3xl font-black font-display text-white">Empresa não encontrada</h2>
          <p className="text-sm text-white/30 mt-3">Este perfil não existe ou foi removido.</p>
          <Link to="/empresas" className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 rounded-full text-sm font-bold bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all">
            <ArrowRight className="h-4 w-4" /> Ver Empresas
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <div ref={pageRef} className="min-h-screen relative bg-black text-white overflow-x-hidden">
      <MouseGlow color={primary} containerRef={pageRef} />

      {/* ═══ SCROLL-TRIGGERED HEADER ═══ */}
      <motion.div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/[0.04]" style={{ opacity: headerOpacity }}>
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl overflow-hidden border border-white/10">
              {(branding?.company_logo_url || company.avatar_url) ? (
                <img src={branding?.company_logo_url || company.avatar_url || ""} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: primary, color: "#000" }}>{companyName.charAt(0)}</div>
              )}
            </div>
            <span className="font-bold text-sm truncate max-w-[200px]">{companyName}</span>
            {company.is_verified && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            <GlassPill color={primary} icon={Flame}>{niche.label}</GlassPill>
          </div>
        </div>
      </motion.div>

      {/* ═══ HERO SECTION ═══ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, scale: heroScale, y: heroY }} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* BG layers */}
        <div className={`absolute inset-0 bg-gradient-to-br ${niche.gradient} opacity-80`} />
        <AuroraBg color1={primary} color2={secondary} color3={accent} />
        <FloatingOrbs colors={[primary, secondary, accent]} />
        <StarField count={50} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 120%, black 0%, transparent 60%)` }} />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {branding?.background_image_url && <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style={{ backgroundImage: `url(${branding.background_image_url})` }} />}

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto text-center">

            {/* Badge */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING_UP, delay: 0.1 }} className="mb-8">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.12] shadow-[0_0_30px_rgba(255,255,255,0.04)]">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}><NicheIcon className="h-4 w-4 text-white/80" /></motion.div>
                <span className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">{branding?.featured_badge || niche.badge}</span>
                {company.is_verified && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </div>
            </motion.div>

            {/* Logo + Name */}
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING_UP, delay: 0.2 }} className="mb-8">
              <div className="inline-flex flex-col items-center gap-5">
                <motion.div className="relative group" whileHover={{ scale: 1.06 }} transition={SPRING_BOUNCE}>
                  <div className="absolute -inset-3 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `conic-gradient(from 0deg, ${primary}40, ${secondary}40, ${accent}40, ${primary}40)`, filter: "blur(15px)" }} />
                  <div className="relative h-28 w-28 md:h-36 md:w-36 rounded-3xl border-2 border-white/20 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm">
                    {(branding?.company_logo_url || company.avatar_url) ? (
                      <img src={branding?.company_logo_url || company.avatar_url || ""} alt={companyName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white/20 to-white/5">
                        <span className="text-6xl font-black text-white drop-shadow-lg">{companyName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <motion.div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-xl" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <NicheIcon className="h-4 w-4" style={{ color: primary }} />
                  </motion.div>
                </motion.div>
                <div className="text-center">
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-display text-white tracking-tight" style={{ textShadow: `0 0 80px ${primary}30` }}>{companyName}</h1>
                  {branding?.company_slogan && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-white/40 text-sm md:text-base mt-3 font-medium tracking-wide">{branding.company_slogan}</motion.p>}
                </div>
              </div>
            </motion.div>

            {/* Hero Text */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING_UP, delay: 0.35 }}>
              <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] mb-4">
                {heroTitle}
              </p>
              <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto leading-relaxed">{heroSubtitle}</p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...SPRING_UP, delay: 0.5 }} className="flex flex-wrap items-center justify-center gap-3 mt-10">
              <Link to={ctaLink} className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-sm text-black overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]" style={{ backgroundColor: primary }}>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Play className="h-4 w-4 relative group-hover:scale-110 transition-transform" /> {ctaText}
                <ArrowRight className="h-4 w-4 relative group-hover:translate-x-1 transition-transform" />
              </Link>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setLiked(!liked)} className="relative inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.1] text-white font-bold text-sm hover:bg-white/[0.12] transition-all">
                <motion.div animate={liked ? { scale: [1, 1.4, 1], rotate: [0, -15, 15, 0] } : {}} transition={{ duration: 0.4 }}>
                  <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                </motion.div>
                {liked ? "Seguindo" : "Seguir"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={copyLink} className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/[0.1] text-white/60 font-bold text-sm hover:bg-white/[0.12] hover:text-white transition-all">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              </motion.button>
            </motion.div>

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65 }} className="flex items-center justify-center gap-2.5 mt-8">
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <motion.a key={platform} href={url as string} target="_blank" rel="noreferrer" whileHover={{ y: -2, scale: 1.1 }} className="h-9 w-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                    <span className="text-[10px] font-black uppercase">{platform.slice(0, 2)}</span>
                  </motion.a>
                ))}
              </motion.div>
            )}

            {/* Location */}
            {(company.city || company.province) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="flex items-center justify-center gap-1.5 mt-5">
                <MapPin className="h-3 w-3 text-white/20" />
                <span className="text-white/25 text-xs">{[company.city, company.province].filter(Boolean).join(", ")}</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-white/15 flex items-start justify-center p-1">
            <motion.div className="w-1 h-1.5 rounded-full bg-white/40" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </motion.div>
      </motion.div>

      {/* ═══ STATS SECTION ═══ */}
      <div className="relative z-10 -mt-16 pb-4">
        <div className="container mx-auto px-4">
          <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={SPRING_UP} className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-8 md:p-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              <RingStat icon={Gamepad2} label="Jogos" value={totalGames} color={primary} delay={0} suffix={`${publishedGames} ativos`} />
              <RingStat icon={Radio} label="Lives" value={totalLives} color={secondary} delay={0.1} />
              <RingStat icon={Users} label="Seguidores" value={0} color={accent} delay={0.2} suffix="Em breve" />
              <RingStat icon={Shield} label="Verificado" value={company.is_verified ? 1 : 0} color="#10b981" delay={0.3} suffix={company.is_verified ? "Confirmado" : "Pendente"} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ JOIN SECTION ═══ */}
      <div className="container mx-auto px-4 mt-10">
        <AnimatePresence mode="wait">
          {!hasJoined ? (
            <motion.div key="join" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="relative overflow-hidden rounded-3xl border border-white/[0.06] p-8 md:p-10" style={{ background: `linear-gradient(135deg, ${primary}08, ${accent}04)` }}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 90% 10%, ${primary}06, transparent 50%)` }} />
              <div className="relative flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="inline-flex p-4 rounded-2xl mb-4" style={{ backgroundColor: `${primary}12`, border: `1px solid ${primary}15` }}>
                    <NicheIcon className="h-10 w-10" style={{ color: primary }} />
                  </motion.div>
                  <h3 className="text-2xl md:text-3xl font-black">Junta-te ao jogo!</h3>
                  <p className="text-sm text-white/30 mt-2 max-w-md">Coloca o teu nome para participar nos jogos e acompanhar o teu histórico de prémios.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Input placeholder="O teu nome..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinGame()} className="flex-1 md:w-72 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20" />
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button onClick={joinGame} disabled={!playerName.trim()} className="rounded-xl px-7 font-bold h-11" style={{ backgroundColor: primary, color: "#000" }}>
                      Entrar <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
          ) : (
            <motion.div key="joined" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl" style={{ backgroundColor: primary, color: "#000" }}>{playerName.charAt(0).toUpperCase()}</motion.div>
              <div className="flex-1">
                <p className="font-bold">Olá, {playerName}!</p>
                <p className="text-xs text-white/30">Pronto para jogar com {companyName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setHasJoined(false); setPlayerName(""); }} className="text-white/40 hover:text-white">Trocar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ ABOUT SECTION ═══ */}
      {aboutText && (
        <div className="container mx-auto px-4 mt-10">
          <ShimmerCard style={{ padding: "2rem" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${primary}12` }}><Globe className="h-5 w-5" style={{ color: primary }} /></div>
              <h3 className="font-bold text-lg">Sobre {companyName}</h3>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">{aboutText}</p>
          </ShimmerCard>
        </div>
      )}

      {/* ═══ CONTENT TABS ═══ */}
      <div className="container mx-auto px-4 mt-12 pb-20">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8">
          {[
            { key: "games", icon: Gamepad2, label: "Jogos", count: totalGames, color: primary },
            { key: "lives", icon: Radio, label: "Lives", count: totalLives, color: secondary },
            { key: "style", icon: Palette, label: "Estilo", count: null, color: accent },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.97 }}
            >
              {activeTab === tab.key && (
                <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.08]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon className="h-4 w-4" />{tab.label}
                {tab.count !== null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06]">{tab.count}</span>}
              </span>
            </motion.button>
          ))}
        </div>

        {/* ── Games Tab ── */
        <AnimatePresence mode="wait">
          {activeTab === "games" && (
            <motion.div key="games" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {games.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.map((game, i) => (
                    <ShimmerCard key={game.id} delay={i * 0.05} className="group cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-transform duration-300">
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${accent})` }} />
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }} whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
                            {game.type === "wheel" ? <span className="text-2xl">🎰</span> : <span className="text-2xl">💰</span>}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate group-hover:text-white transition-colors">{game.name}</p>
                            <p className="text-[11px] text-white/25 mt-0.5">{game.type === "wheel" ? "Roda de Prémios" : "Quem Quer Ser Milionário"}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold ${game.is_published || game.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/25"}`}>
                            {game.is_published || game.is_active ? "Ativo" : "Rascunho"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-white/15">
                          <span>{game.segment_count ? `${game.segment_count} segmentos` : "Configurado"}</span>
                          <span>{new Date(game.created_at).toLocaleDateString("pt-PT")}</span>
                        </div>
                      </div>
                    </ShimmerCard>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                    <Gamepad2 className="h-12 w-12 text-white/[0.06]" />
                  </div>
                  <p className="text-sm text-white/20">Nenhum jogo configurado ainda</p>
                  <p className="text-xs text-white/10 mt-1">Esta empresa ainda não adicionou jogos</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Lives Tab ── */}
          {activeTab === "lives" && (
            <motion.div key="lives" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <ShimmerCard key={`${s.code}-${i}`} delay={i * 0.04} className="group cursor-pointer">
                      <div className="p-4 flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}10` }}>
                          <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${primary}10, transparent 70%)` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                          <Radio className="h-5 w-5 relative" style={{ color: primary }} />
                          <span className="text-[7px] font-black mt-0.5 tracking-wider" style={{ color: primary }}>LIVE</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-white transition-colors">{s.title || `Live ${s.code}`}</p>
                          <p className="text-[11px] text-white/25 mt-0.5">{new Date(s.started_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          {s.duration_sec > 0 && <p className="text-[10px] text-white/15 mt-0.5">{Math.round(s.duration_sec / 60)} min</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                      </div>
                    </ShimmerCard>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                    <Radio className="h-12 w-12 text-white/[0.06]" />
                  </div>
                  <p className="text-sm text-white/20">Nenhuma live realizada ainda</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Style Tab ── */
          {activeTab === "style" && (
            <motion.div key="style" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Colors */}
                <ShimmerCard delay={0} style={{ padding: "1.5rem" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${primary}12` }}><Palette className="h-4 w-4" style={{ color: primary }} /></div>
                    <h3 className="font-bold">Identidade Visual</h3>
                  </div>
                  {branding ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-5 gap-2.5">
                        {["Principal", "Secundária", "Acento", "Fundo", "Texto"].map((label, idx) => {
                            const color = [primary, secondary, accent, branding.background_color, branding.text_color][idx];
                            return (
                              <div key={label} className="text-center group/color">
                                <motion.div className="h-16 rounded-xl border border-white/[0.06] mb-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg" style={{ backgroundColor: color, boxShadow: `0 4px 20px ${color}20` }} whileHover={{ y: -2 }} />
                                <p className="text-[9px] text-white/25 font-medium">{label}</p>
                              </div>
                            );
                          })}
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${accent})`, boxShadow: `0 0 20px ${primary}20` }} />
                    </div>
                  ) : <p className="text-xs text-white/15">Sem identidade visual</p>}
                </ShimmerCard>

                {/* Config */}
                <div className="space-y-4">
                  <ShimmerCard delay={0.05} style={{ padding: "1.5rem" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accent}12` }}><NicheIcon className="h-4 w-4" style={{ color: accent }} /></div>
                      <h3 className="font-bold">Configuração</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Nicho</p>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${primary}12`, color: primary }}>{niche.label}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Layout</p>
                        <span className="text-xs font-bold capitalize">{(branding?.homepage_layout) || "showcase"}</span>
                      </div>
                    </div>
                  </ShimmerCard>

                  <ShimmerCard delay={0.1} style={{ padding: "1.5rem" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-white/[0.04]"><Globe className="h-4 w-4 text-white/30" /></div>
                      <h3 className="font-bold">Informações</h3>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-white/30"><Globe className="h-3.5 w-3.5" />{company.display_name || company.company_name}</div>
                      {(company.city || company.province) && <div className="flex items-center gap-2 text-white/30"><MapPin className="h-3.5 w-3.5" />{[company.city, company.province].filter(Boolean).join(", ")}</div>}
                      {company.created_at && <div className="flex items-center gap-2 text-white/30"><Calendar className="h-3.5 w-3.5" />{new Date(company.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</div>}
                    </div>
                  </ShimmerCard>
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

target = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'
with open(target, 'w') as f:
    f.write(COMPONENT)
print(f'Written {len(COMPONENT)} bytes to {target}')
