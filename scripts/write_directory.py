#!/usr/bin/env python3
"""Write the mega redesigned BusinessDirectory.tsx"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/BusinessDirectory.tsx"

content = r'''import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import {
  Building2, Search, CheckCircle, Ticket, Trophy, TrendingUp, Star,
  ArrowRight, Users, Sparkles, Zap, Gamepad2, Radio, ChevronRight,
  Crown, Shield, LayoutGrid, List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface BusinessItem {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  raffle_count: number;
  contest_count: number;
}

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 400, damping: 15 };

const THEME_PRIMARY = "hsl(220 70% 18%)";
const THEME_ACCENT = "hsl(352 73% 50%)";
const THEME_GOLD = "#fbbf24";

function CountingStat({ target, duration = 2 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{display.toLocaleString("pt-PT")}</>;
}

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "verified" | "active">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statsReady, setStatsReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "business");
        if (!roles || roles.length === 0) { setLoading(false); return; }

        const businessIds = roles.map(r => r.user_id);

        const [profilesRes, rafflesRes, contestsRes] = await Promise.all([
          supabase.from("profiles_public").select("*").in("user_id", businessIds),
          supabase.from("raffles").select("business_user_id").eq("status", "active"),
          supabase.from("contests").select("created_by").in("status", ["active", "voting", "completed"]),
        ]);

        const profiles = profilesRes.data || [];
        const rafflesByUser: Record<string, number> = {};
        (rafflesRes.data || []).forEach((r: any) => {
          rafflesByUser[r.business_user_id] = (rafflesByUser[r.business_user_id] || 0) + 1;
        });
        const contestsByUser: Record<string, number> = {};
        (contestsRes.data || []).forEach((c: any) => {
          contestsByUser[c.created_by] = (contestsByUser[c.created_by] || 0) + 1;
        });

        const items: BusinessItem[] = profiles.map((p: any) => ({
          user_id: p.user_id,
          display_name: p.display_name,
          company_name: p.company_name,
          avatar_url: p.avatar_url,
          is_verified: p.is_verified,
          raffle_count: rafflesByUser[p.user_id] || 0,
          contest_count: contestsByUser[p.user_id] || 0,
        }));

        items.sort((a, b) => {
          if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
          return (b.raffle_count + b.contest_count) - (a.raffle_count + a.contest_count);
        });

        setBusinesses(items);
      } catch (e) {
        console.error("Failed to load businesses:", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setStatsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let list = businesses;
    if (filter === "verified") list = list.filter((b) => b.is_verified);
    if (filter === "active") list = list.filter((b) => b.raffle_count + b.contest_count > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          (b.company_name || "").toLowerCase().includes(q) ||
          (b.display_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [businesses, search, filter]);

  const totalRaffles = useMemo(() => businesses.reduce((s, b) => s + b.raffle_count, 0), [businesses]);
  const totalContests = useMemo(() => businesses.reduce((s, b) => s + b.contest_count, 0), [businesses]);
  const verifiedCount = useMemo(() => businesses.filter(b => b.is_verified).length, [businesses]);
  const activeCount = useMemo(() => businesses.filter(b => b.raffle_count + b.contest_count > 0).length, [businesses]);

  const chipCategories = [
    { id: "all", label: "Todas", icon: "\ud83c\udfe2", count: businesses.length },
    { id: "verified", label: "Verificadas", icon: "\u2705", count: verifiedCount },
    { id: "active", label: "Ativas", icon: "\u26a1", count: activeCount },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const desktopStats = [
    { icon: Users, label: "Empresas", value: businesses.length, color: THEME_PRIMARY },
    { icon: CheckCircle, label: "Verificadas", value: verifiedCount, color: THEME_GOLD },
    { icon: Ticket, label: "Sorteios Ativos", value: totalRaffles, color: THEME_ACCENT },
    { icon: Trophy, label: "Concursos", value: totalContests, color: THEME_PRIMARY },
  ];

  const desktopFilters = [
    { id: "all" as const, label: "Todas", Icon: LayoutGrid },
    { id: "verified" as const, label: "Verificadas", Icon: Shield },
    { id: "active" as const, label: "Ativas", Icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise pb-20 md:pb-0">
      <Navbar />
      <div className="floating-stars"><span /><span /><span /><span /><span /><span /><span /><span /></div>
      <div className="ambient-glow" />

      <MobileDiscoveryHeader
        title="Diretorio de Empresas"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar empresa..."
        categories={chipCategories}
        activeCategory={filter}
        onCategoryChange={(id) => setFilter(id as any)}
      />

      {/* ===== DESKTOP HERO ===== */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="dir-hero-bg relative overflow-hidden hidden md:block"
        style={{ minHeight: "360px" }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: "hsl(220 70% 18% / 0.25)" }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: "hsl(352 73% 50% / 0.15)" }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: "hsl(220 60% 30% / 0.15)" }} />
        </div>
        <div
          className="hero-mouse-light"
          style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, hsl(220 70% 18% / 0.06), transparent 40%)` }}
        />
        <div className="hero-grid-overlay" style={{ "--grid-color": "rgba(255,255,255,0.5)" } as any} />
        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 max-w-6xl">
          <motion.div
            className="text-center pt-20 pb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.1 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.15 }}
            >
              <Crown className="h-4 w-4" style={{ color: THEME_GOLD }} />
              <span className="text-xs font-semibold text-muted-foreground">Plataforma de jogos e concursos</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-4">
              <span className="text-shimmer" style={{
                "--shimmer-c1": "hsl(var(--foreground))" as any,
                "--shimmer-c2": "hsl(220 70% 18% / 0.6)" as any,
              }}>Diretorio de Empresas</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Descubra empresas que criam experiencias incriveis — sorteios, concursos, jogos ao vivo e muito mais para a sua comunidade
            </p>

            <AnimatePresence>
              {!user && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link to="/register">
                    <motion.button
                      className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold text-white"
                      style={{
                        background: "linear-gradient(135deg, " + THEME_PRIMARY + ", " + THEME_ACCENT + ")",
                        boxShadow: "0 6px 30px hsl(220 70% 18% / 0.3), 0 0 60px hsl(352 73% 50% / 0.15)",
                      }}
                      whileHover={{ scale: 1.05, boxShadow: "0 8px 40px hsl(220 70% 18% / 0.4), 0 0 80px hsl(352 73% 50% / 0.2)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Sparkles className="h-4 w-4" /> Crie o seu primeiro concurso gratis
                    </motion.button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* ===== DESKTOP STATS ===== */}
      <div className="container mx-auto px-4 max-w-6xl -mt-6 relative z-20 hidden md:block">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {desktopStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="dir-stat-card p-5"
              style={{ "--dsc-c1": (stat.color + "25") as any }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING, delay: 0.5 + i * 0.08 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="dir-stat-icon p-2.5 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}05)` }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-black font-display" style={{ color: stat.color }}>
                    {statsReady ? <CountingStat target={stat.value} /> : "0"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ===== DESKTOP CTA BANNER ===== */}
      <div className="container mx-auto px-4 max-w-6xl mt-6 relative z-20 hidden md:block">
        <motion.div
          className="dir-cta-banner"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div
            className="p-7 md:p-8 flex flex-col md:flex-row items-center gap-5 rounded-[1.25rem]"
            style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.06), hsl(352 73% 50% / 0.03), hsl(220 60% 30% / 0.04))" }}
          >
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-lg md:text-xl font-black font-display flex items-center justify-center md:justify-start gap-2 mb-1">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >\ud83d\ude80</motion.span>
                A sua empresa ainda nao esta aqui?
              </h2>
              <p className="text-sm text-muted-foreground">
                Registe-se como empresa e crie concursos que atraiam milhares de participantes. O primeiro concurso e gratis!
              </p>
            </div>
            <Link to="/register">
              <motion.button
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, " + THEME_PRIMARY + ", " + THEME_ACCENT + ")",
                  boxShadow: "0 4px 20px hsl(220 70% 18% / 0.25)",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Comecar Agora <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ===== DESKTOP SEARCH + FILTERS ===== */}
      <div className="container mx-auto px-4 max-w-6xl mt-8 relative z-20 hidden md:block">
        <motion.div
          className="flex items-center gap-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="flex-1 dir-search-wrap">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar empresas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 rounded-full bg-white/[0.03] border-white/[0.06] text-sm focus:border-hsl(220 70% 18% / 0.4)"
              />
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {desktopFilters.map((f) => {
              const isActive = filter === f.id;
              return (
                <motion.button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={"dir-filter-pill flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold " + (isActive ? "active" : "")}
                  style={{
                    color: isActive ? THEME_PRIMARY : "hsl(var(--muted-foreground))",
                    backgroundColor: isActive ? "hsl(220 70% 18% / 0.12)" : "transparent",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <f.Icon className="h-3.5 w-3.5" />
                  {f.label}
                  <span className="text-[10px] opacity-60 ml-0.5">
                    {f.id === "all" ? businesses.length : f.id === "verified" ? verifiedCount : activeCount}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <motion.button
              onClick={() => setViewMode("grid")}
              className="p-2 rounded-lg transition-colors"
              style={{ color: viewMode === "grid" ? THEME_PRIMARY : "hsl(var(--muted-foreground))", backgroundColor: viewMode === "grid" ? "hsl(220 70% 18% / 0.1)" : "transparent" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LayoutGrid className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => setViewMode("list")}
              className="p-2 rounded-lg transition-colors"
              style={{ color: viewMode === "list" ? THEME_PRIMARY : "hsl(var(--muted-foreground))", backgroundColor: viewMode === "list" ? "hsl(220 70% 18% / 0.1)" : "transparent" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <List className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="container mx-auto px-3 sm:px-4 max-w-6xl pb-10 relative z-20">
        {loading ? (
          <div className="mt-3 md:mt-0">
            <div className="md:hidden"><MeituanSkeleton count={6} /></div>
            <div className="hidden md:flex items-center justify-center py-16">
              <div className="relative">
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.15), hsl(352 73% 50% / 0.1))" }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Building2 className="h-6 w-6" style={{ color: THEME_PRIMARY }} />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  style={{ border: "2px solid " + THEME_PRIMARY + "30" }}
                />
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <div className="dir-empty-orb absolute inset-0 rounded-full" style={{ background: THEME_PRIMARY, filter: "blur(40px)", width: 120, height: 120, top: "-10px", left: "-10px" }} />
              <motion.div className="empty-float inline-block relative">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.1), hsl(352 73% 50% / 0.05))", border: "1px dashed hsl(220 70% 18% / 0.2)" }}
                >
                  <Building2 className="h-11 w-11 text-muted-foreground/20" />
                </div>
              </motion.div>
            </div>
            <p className="text-lg font-bold text-muted-foreground">Nenhuma empresa encontrada</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Tente uma pesquisa diferente</p>
          </div>
        ) : (
          <>
            {/* MOBILE GRID */}
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-3 mt-3">
                {filtered.map((b, i) => (
                  <motion.div
                    key={b.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04 }}
                    onClick={() => navigate(`/empresa/${b.user_id}`)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="dir-card p-3 cursor-pointer">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="dir-card-visual h-11 w-11 rounded-xl overflow-hidden flex items-center justify-center text-base font-bold shrink-0"
                          style={{
                            background: b.avatar_url ? "transparent" : "linear-gradient(135deg, " + THEME_PRIMARY + "20, " + THEME_ACCENT + "10)",
                            color: THEME_PRIMARY,
                          }}
                        >
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                          ) : (
                            (b.company_name || b.display_name || "E").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm truncate">{b.company_name || b.display_name}</p>
                            {b.is_verified && <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: THEME_GOLD }} />}
                          </div>
                          {b.company_name && b.display_name && b.company_name !== b.display_name && (
                            <p className="text-[11px] text-muted-foreground truncate">{b.display_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" style={{ color: THEME_ACCENT }} /> {b.raffle_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" style={{ color: THEME_PRIMARY }} /> {b.contest_count}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* DESKTOP GRID VIEW */}
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4 mt-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filtered.map((b, i) => {
                    const total = b.raffle_count + b.contest_count;
                    return (
                      <motion.div
                        key={b.user_id}
                        className="dir-card cursor-pointer"
                        style={{
                          "--dir-card-glow": (THEME_PRIMARY + "15") as any,
                          "--dir-card-border-hover": (THEME_PRIMARY + "20") as any,
                        }}
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ ...SPRING, delay: Math.min(i, 12) * 0.05 }}
                        onClick={() => navigate(`/empresa/${b.user_id}`)}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="p-5">
                          <div className="flex items-start gap-4 mb-4">
                            <div
                              className="dir-card-visual h-16 w-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black shrink-0"
                              style={{
                                background: b.avatar_url ? "transparent" : "linear-gradient(135deg, " + THEME_PRIMARY + "20, " + THEME_ACCENT + "10)",
                                color: THEME_PRIMARY,
                                boxShadow: b.avatar_url ? "none" : "0 4px 15px " + THEME_PRIMARY + "15",
                              }}
                            >
                              {b.avatar_url ? (
                                <img src={b.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                              ) : (
                                (b.company_name || b.display_name || "E").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base truncate">{b.company_name || b.display_name}</h3>
                                {b.is_verified && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ ...SPRING_BOUNCE, delay: 0.3 + i * 0.05 }}
                                  >
                                    <CheckCircle className="h-4 w-4 shrink-0" style={{ color: THEME_GOLD }} />
                                  </motion.div>
                                )}
                              </div>
                              {b.company_name && b.display_name && b.company_name !== b.display_name && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{b.display_name}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1.5">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                  style={{
                                    backgroundColor: total > 0 ? "hsl(220 70% 18% / 0.1)" : "rgba(255,255,255,0.03)",
                                    color: total > 0 ? THEME_PRIMARY : "hsl(var(--muted-foreground))",
                                  }}
                                >
                                  {total > 0 ? total + " atividades" : "Sem atividades"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div
                              className="p-3 rounded-xl"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                            >
                              <div className="flex items-center gap-2">
                                <Ticket className="h-4 w-4" style={{ color: THEME_ACCENT }} />
                                <div>
                                  <p className="text-lg font-black font-display">{b.raffle_count}</p>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Sorteios</p>
                                </div>
                              </div>
                            </div>
                            <div
                              className="p-3 rounded-xl"
                              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                            >
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4" style={{ color: THEME_PRIMARY }} />
                                <div>
                                  <p className="text-lg font-black font-display">{b.contest_count}</p>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Concursos</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className="mt-4 pt-3 flex items-center justify-between text-xs text-muted-foreground/60"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            <span className="flex items-center gap-1.5">
                              {b.is_verified ? (
                                <span className="flex items-center gap-1" style={{ color: THEME_GOLD }}>
                                  <Star className="h-3 w-3" /> Verificado
                                </span>
                              ) : (
                                <Building2 className="h-3 w-3" /> Empresa
                              )}
                            </span>
                            <motion.span
                              className="flex items-center gap-1 font-semibold"
                              style={{ color: THEME_PRIMARY }}
                              whileHover={{ x: 3 }}
                            >
                              Ver perfil <ChevronRight className="h-3.5 w-3.5" />
                            </motion.span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                /* DESKTOP LIST VIEW */
                <motion.div
                  key="list"
                  className="hidden md:flex flex-col gap-3 mt-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filtered.map((b, i) => {
                    const total = b.raffle_count + b.contest_count;
                    return (
                      <motion.div
                        key={b.user_id}
                        className="dir-card cursor-pointer"
                        style={{
                          "--dir-card-glow": (THEME_PRIMARY + "10") as any,
                          "--dir-card-border-hover": (THEME_PRIMARY + "15") as any,
                        }}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...SPRING, delay: Math.min(i, 12) * 0.04 }}
                        onClick={() => navigate(`/empresa/${b.user_id}`)}
                        whileHover={{ x: 6 }}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div
                            className="dir-card-visual h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center text-xl font-black shrink-0"
                            style={{
                              background: b.avatar_url ? "transparent" : "linear-gradient(135deg, " + THEME_PRIMARY + "20, " + THEME_ACCENT + "10)",
                              color: THEME_PRIMARY,
                            }}
                          >
                            {b.avatar_url ? (
                              <img src={b.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                            ) : (
                              (b.company_name || b.display_name || "E").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-base truncate">{b.company_name || b.display_name}</p>
                              {b.is_verified && <CheckCircle className="h-4 w-4 shrink-0" style={{ color: THEME_GOLD }} />}
                              {total > 0 && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: "hsl(220 70% 18% / 0.1)", color: THEME_PRIMARY }}
                                >
                                  {total} atividades
                                </span>
                              )}
                            </div>
                            {b.company_name && b.display_name && b.company_name !== b.display_name && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{b.display_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1.5">
                              <Ticket className="h-4 w-4" style={{ color: THEME_ACCENT }} />
                              <span className="font-semibold">{b.raffle_count}</span>
                              <span className="text-xs">sorteios</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Trophy className="h-4 w-4" style={{ color: THEME_PRIMARY }} />
                              <span className="font-semibold">{b.contest_count}</span>
                              <span className="text-xs">concursos</span>
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
'''

with open(FILE, 'w') as f:
    f.write(content)

print(f"Written {len(content)} chars to {FILE}")
