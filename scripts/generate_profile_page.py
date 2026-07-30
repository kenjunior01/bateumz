#!/usr/bin/env python3
"""Generate the incredible CompanyPublicProfile redesign"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

SPRING = '{ type: "spring" as const, stiffness: 300, damping: 25 }'

content = f'''import {{ useEffect, useState, useCallback, useRef }} from "react";
import {{ useParams, Link }} from "react-router-dom";
import {{ motion, AnimatePresence }} from "framer-motion";
import {{ supabase }} from "@/integrations/supabase/client";
import {{ Share2, Gamepad2, Users, Calendar, Zap, ChevronRight, MapPin, Globe, CheckCircle2, Copy, Check, ArrowRight, Trophy, Clock, Sparkles, Radio, Eye, MousePointerClick }} from "lucide-react";
import {{ Card, CardContent }} from "@/components/ui/card";
import {{ Button }} from "@/components/ui/button";
import {{ Input }} from "@/components/ui/input";
import {{ useToast }} from "@/hooks/use-toast";
import Footer from "@/components/Footer";

interface CompanyInfo {{
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  city: string | null;
  province: string | null;
  created_at: string | null;
  phone: string | null;
}}

interface CompanyBranding {{
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  company_logo_url: string | null;
  background_image_url: string | null;
  company_name: string | null;
  company_slogan: string | null;
}}

interface GameItem {{
  id: string;
  name: string;
  type: "wheel" | "millionaire" | "custom";
  is_published?: boolean;
  segment_count?: number;
  created_at: string;
  is_active?: boolean;
}}

interface LiveSession {{
  code: string;
  title?: string;
  started_at: number;
  ended_at: number;
  duration_sec: number;
  players_count: number;
  games_count: number;
  winners: string[];
}}

const SPRING = {SPRING};

const fadeUp = (delay: number) => ({{ opacity: 0, y: 30 }});
const fadeUpTo = (delay: number) => ({{ opacity: 1, y: 0, transition: {{ delay, ...SPRING }} }});
const scaleIn = (delay: number) => ({{ opacity: 0, scale: 0.9 }});
const scaleInTo = (delay: number) => ({{ opacity: 1, scale: 1, transition: {{ delay, ...SPRING }} }});

function RadioIcon(props: any) {{
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {{...props}}>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  );
}}

function WheelIcon(props: any) {{
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {{...props}}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}}

function MillionaireIcon(props: any) {{
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {{...props}}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9Z" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9Z" />
      <path d="M4 22h16" />
      <path d="M10 22V8" />
      <path d="M14 22V8" />
      <path d="M18 8c0 4-4 6-4 12" />
      <path d="M6 8c0 4 4 6 4 12" />
    </svg>
  );
}}

const CompanyPublicProfile = () => {{
  const {{ id }} = useParams<{{ id: string }}>();
  const {{ toast }} = useToast();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [games, setGames] = useState<GameItem[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [activeSection, setActiveSection] = useState("games");
  const [mousePos, setMousePos] = useState({{ x: 0, y: 0 }});
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {{
    if (!id) return;
    const load = async () => {{
      setLoading(true);
      try {{
        const {{ data: profile }} = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
        if (profile) {{
          setCompany({{
            user_id: profile.id, display_name: profile.display_name, company_name: profile.company_name,
            avatar_url: profile.avatar_url, is_verified: profile.is_verified, city: profile.city,
            province: profile.province, created_at: profile.created_at, phone: profile.phone,
          }});
        }}
      }} catch (e) {{ console.error("Failed to load profile:", e); }}

      try {{
        const {{ data: brand }} = await supabase.from("company_branding").select("*").eq("user_id", id).maybeSingle();
        if (brand) setBranding(brand as any);
      }} catch (e) {{ console.error("Failed to load branding:", e); }}

      try {{
        const {{ data: wheels }} = await supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", {{ ascending: false }});
        const {{ data: mils }} = await supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", {{ ascending: false }});
        const allGames: GameItem[] = [];
        (wheels || []).forEach((w: any) => allGames.push({{ id: w.id, name: w.name, type: "wheel", is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }}));
        (mils || []).forEach((m: any) => allGames.push({{ id: m.id, name: m.name || "Quem Quer Ser Milionario", type: "millionaire", is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }}));
        setGames(allGames);
      }} catch (e) {{ console.error("Failed to load games:", e); }}

      try {{
        const {{ data: lives }} = await supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", {{ ascending: false }}).limit(20);
        if (lives) {{
          const mapped: LiveSession[] = lives.map((l: any) => ({{
            code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(),
            ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0,
            players_count: 0, games_count: 0, winners: [],
          }}));
          setSessions(mapped);
        }}
      }} catch (e) {{ console.error("Failed to load lives:", e); }}

      setLoading(false);
    }};
    load();
  }}, [id]);

  const joinGame = useCallback(() => {{
    if (!playerName.trim()) return;
    setHasJoined(true);
    try {{
      const key = `companyPlayer:${{id}}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (!existing.includes(playerName.trim())) {{
        existing.push(playerName.trim());
        localStorage.setItem(key, JSON.stringify(existing));
      }}
      toast({{ title: `Bem-vindo, ${{playerName.trim()}}!`, description: "Agora podes participar nos jogos desta empresa." }});
    }} catch {{}}
  }}, [playerName, id, toast]);

  useEffect(() => {{
    if (!id) return;
    try {{
      const key = `companyPlayer:${{id}}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (existing.length > 0) {{ setPlayerName(existing[0]); setHasJoined(true); }}
    }} catch {{}}
  }}, [id]);

  const copyProfileLink = async () => {{
    try {{
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }} catch {{}}
  }};

  const primary = branding?.primary_color || "#fbbf24";
  const secondary = branding?.secondary_color || "#3b82f6";
  const accent = branding?.accent_color || "#8b5cf6";
  const bgColor = branding?.background_color || undefined;
  const companyName = company?.company_name || company?.display_name || "Empresa";
  const totalGames = games.length;
  const publishedGames = games.filter(g => g.is_published || g.is_active).length;
  const totalLives = sessions.length;
  const hasData = totalGames > 0 || totalLives > 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {{
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({{ x: e.clientX - rect.left, y: e.clientY - rect.top }});
  }};

  const sections = [
    {{ id: "games", label: "Jogos", icon: Gamepad2, count: totalGames }},
    {{ id: "lives", label: "Lives", icon: RadioIcon, count: totalLives }},
    {{ id: "about", label: "Sobre", icon: Globe, count: null }},
  ];

  if (loading) {{
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-soft">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{{{ opacity: 0, scale: 0.8 }}}}
          animate={{{{ opacity: 1, scale: 1 }}}}
          transition={{{{ ...SPRING, delay: 0.1 }}}}
        >
          <div className="relative">
            <motion.div
              animate={{{{ rotate: 360 }}}}
              transition={{{{ repeat: Infinity, duration: 2, ease: "linear" }}}}
            >
              <Gamepad2 className="h-12 w-12" style={{{{ color: primary }}}} />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{{{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}}}
              transition={{{{ repeat: Infinity, duration: 2, ease: "easeInOut" }}}}
              style={{{{ border: `2px solid ${{primary}}40` }}}}
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">A carregar perfil...</p>
        </motion.div>
      </div>
    );
  }}

  if (!company) {{
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-soft">
        <motion.div
          className="text-center space-y-6"
          initial={{{{ opacity: 0, y: 20 }}}}
          animate={{{{ opacity: 1, y: 0 }}}}
          transition={{{{ ...SPRING }}}}
        >
          <motion.div
            className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{{{ background: `linear-gradient(135deg, ${{primary}}20, ${{accent}}15)` }}}}
            animate={{{{ y: [0, -8, 0] }}}}
            transition={{{{ repeat: Infinity, duration: 3, ease: "easeInOut" }}}}
          >
            <Gamepad2 className="h-10 w-10 text-muted-foreground/30" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-black font-display">Empresa nao encontrada</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              O perfil desta empresa nao existe ou foi removido.
            </p>
          </div>
          <Link
            to="/empresas"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105"
            style={{{{ backgroundColor: primary, color: "#000" }}}}
          >
            <ArrowRight className="h-4 w-4" /> Ver todas as empresas
          </Link>
        </motion.div>
      </div>
    );
  }}

  return (
    <div className="min-h-screen bg-mesh-soft bg-noise" style={{{{ backgroundColor: bgColor }}}}>
      {{branding?.background_image_url && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{{{ backgroundImage: `url(${{branding.background_image_url}})` }}}}
        />
      )}}

      <div className="floating-stars">
        <span /><span /><span /><span /><span /><span /><span /><span />
      </div>

      <div className="ambient-glow" />

      {{/* ==================== HERO SECTION ==================== */}}
      <div
        ref={{heroRef}}
        onMouseMove={{handleMouseMove}}
        className="relative overflow-hidden"
        style={{{{ minHeight: "420px" }}}}
      >
        {{/* Animated gradient background */}}
        <div
          className="absolute inset-0 profile-hero-gradient"
          style={{{{ background: `linear-gradient(135deg, ${{primary}}25, ${{secondary}}20, ${{accent}}15, ${{primary}}10)` }}}}
        />

        {{/* Floating orbs */}}
        <div className="profile-orb profile-orb-1" style={{{{ background: `${{primary}}30` }}}} />
        <div className="profile-orb profile-orb-2" style={{{{ background: `${{secondary}}25` }}}} />
        <div className="profile-orb profile-orb-3" style={{{{ background: `${{accent}}20` }}}} />

        {{/* Mouse-following spotlight */}}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{{{
            background: `radial-gradient(600px circle at ${{mousePos.x}}px ${{mousePos.y}}px, ${{primary}}08, transparent 40%)`,
          }}}}
        />

        {{/* Grid pattern overlay */}}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{{{
            backgroundImage: `linear-gradient(${{primary}} 1px, transparent 1px), linear-gradient(90deg, ${{primary}} 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}}}
        />

        {{/* Bottom fade */}}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        {{/* Content */}}
        <div className="relative z-10 container mx-auto px-4 pt-8 pb-0">
          {{/* Back link */}}
          <motion.div
            initial={{{{ opacity: 0, x: -20 }}}}
            animate={{{{ opacity: 1, x: 0 }}}}
            transition={{{{ ...SPRING, delay: 0 }}}}
          >
            <Link
              to="/empresas"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowRight className="h-3 w-3 rotate-180" /> Todas as empresas
            </Link>
          </motion.div>

          {{/* Profile header */}}
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-2"
            initial={{{{ opacity: 0, y: 30 }}}}
            animate={{{{ opacity: 1, y: 0 }}}}
            transition={{{{ ...SPRING, delay: 0.1 }}}}
          >
            {{/* Logo */}}
            <div className="relative group">
              <motion.div
                className="relative"
                whileHover={{{{ scale: 1.05, rotate: 2 }}}}
                transition={{{{ type: "spring" as const, stiffness: 400, damping: 15 }}}}
              >
                <div
                  className="h-28 w-28 md:h-36 md:w-36 rounded-3xl border-2 overflow-hidden"
                  style={{{{
                    borderColor: `${{primary}}60`,
                    boxShadow: `0 0 30px ${{primary}}25, 0 20px 60px -15px rgba(0,0,0,0.3)`,
                  }}}}
                >
                  {{(branding?.company_logo_url || company.avatar_url) ? (
                    <img
                      src={{branding?.company_logo_url || company.avatar_url || ""}}
                      alt={{companyName}}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full flex items-center justify-center"
                      style={{{{ background: `linear-gradient(135deg, ${{primary}}30, ${{accent}}20)` }}}}
                    >
                      <span className="text-4xl font-black" style={{{{ color: primary }}}}>
                        {{companyName.charAt(0).toUpperCase()}}
                      </span>
                    </div>
                  )}}
                </div>
              </motion.div>
              {{company.is_verified && (
                <motion.div
                  className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full flex items-center justify-center shadow-lg"
                  style={{{{ backgroundColor: primary }}}}
                  initial={{{{ scale: 0 }}}}
                  animate={{{{ scale: 1 }}}}
                  transition={{{{ type: "spring" as const, stiffness: 500, damping: 15, delay: 0.4 }}}}
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </motion.div>
              )}}
            </div>

            {{/* Company info */}}
            <div className="flex-1 pb-2">
              <motion.div
                className="flex items-center gap-2 flex-wrap"
                initial={{{{ opacity: 0, x: 10 }}}}
                animate={{{{ opacity: 1, x: 0 }}}}
                transition={{{{ ...SPRING, delay: 0.2 }}}}
              >
                <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight">{{companyName}}</h1>
                {{company.is_verified && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
                    style={{{{ backgroundColor: `${{primary}}15`, color: primary }}}}
                  >
                    Verificado
                  </span>
                )}}
              </motion.div>
              {{branding?.company_slogan && (
                <motion.p
                  className="text-sm mt-1.5 text-muted-foreground font-medium"
                  initial={{{{ opacity: 0 }}}}
                  animate={{{{ opacity: 0.7 }}}}
                  transition={{{{ delay: 0.35 }}}}
                >
                  {{branding.company_slogan}}
                </motion.p>
              )}}
              <motion.div
                className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap"
                initial={{{{ opacity: 0 }}}}
                animate={{{{ opacity: 1 }}}}
                transition={{{{ delay: 0.3 }}}}
              >
                {{(company.city || company.province) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {{[company.city, company.province].filter(Boolean).join(", ")}}
                  </span>
                )}}
                {{company.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Membro desde {{new Date(company.created_at).toLocaleDateString("pt-PT", {{ month: "long", year: "numeric" }})}}
                  </span>
                )}}
              </motion.div>
            </div>

            {{/* Share button */}}
            <motion.div
              className="flex gap-2 pb-2"
              initial={{{{ opacity: 0, scale: 0.8 }}}}
              animate={{{{ opacity: 1, scale: 1 }}}}
              transition={{{{ ...SPRING, delay: 0.25 }}}}
            >
              <button
                onClick={{copyProfileLink}}
                className="relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                style={{{{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  border: `1px solid ${{primary}}30`,
                  color: primary,
                }}}}
              >
                {{copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}}
                {{copied ? "Copiado!" : "Partilhar"}}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {{/* ==================== STATS SECTION ==================== */}}
      <div className="container mx-auto px-4 -mt-6 relative z-20">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          initial={{{{ opacity: 0 }}}}
          animate={{{{ opacity: 1 }}}}
          transition={{{{ delay: 0.3 }}}}
        >
          {{[
            {{ icon: Gamepad2, label: "Jogos", value: totalGames, sub: `${{publishedGames}} ativos`, color: primary }},
            {{ icon: RadioIcon, label: "Lives", value: totalLives, sub: "realizadas", color: secondary }},
            {{ icon: Users, label: "Comunidade", value: "+", sub: "crescendo", color: accent }},
            {{ icon: Zap, label: "Estado", value: "Ativo", sub: "agora", color: "#10b981" }},
          ].map((s, i) => (
            <motion.div
              key={{i}}
              className="stat-card-animate"
              style={{{{ animationDelay: `${{0.35 + i * 0.08}}s` }}}}
            >
              <div
                className="profile-3d-card rounded-2xl p-4"
                style={{{{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  "--card-glow": `${{s.color}}20`,
                }}}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{{{ background: `linear-gradient(135deg, ${{s.color}}20, ${{s.color}}08)` }}}}
                  >
                    <s.icon className="h-5 w-5" style={{{{ color: s.color }}}} />
                  </div>
                  <div>
                    <p className="text-2xl font-black font-display" style={{{{ color: s.color }}}}
                      {{typeof s.value === "number" ? s.value : s.value}}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{{s.label}}</p>
                      {{s.sub && <span className="text-[9px] text-muted-foreground/60">/ {{s.sub}}</span>}}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}}
        </motion.div>
      </div>

      {{/* ==================== JOIN SECTION ==================== */}}
      <div className="container mx-auto px-4 mt-8 relative z-20">
        <AnimatePresence mode="wait">
          {{!hasJoined ? (
            <motion.div
              key="join"
              initial={{{{ opacity: 0, y: 20, scale: 0.98 }}}}
              animate={{{{ opacity: 1, y: 0, scale: 1 }}}}
              exit={{{{ opacity: 0, y: -10, scale: 0.98 }}}}
              transition={{{{ ...SPRING, delay: 0.45 }}}}
            >
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{{{
                  background: `linear-gradient(135deg, ${{primary}}08, ${{accent}}04, ${{secondary}}06)`,
                  border: `1px solid ${{primary}}15`,
                }}}}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{{{ background: `linear-gradient(90deg, transparent, ${{primary}}40, ${{accent}}30, transparent)` }}}}
                />
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0 text-center md:text-left">
                      <motion.div
                        className="inline-flex p-4 rounded-2xl mb-3"
                        style={{{{ background: `linear-gradient(135deg, ${{primary}}20, ${{accent}}10)`, boxShadow: `0 0 30px ${{primary}}15` }}}}
                        animate={{{{ y: [0, -5, 0] }}}}
                        transition={{{{ repeat: Infinity, duration: 3, ease: "easeInOut" }}}}
                      >
                        <MousePointerClick className="h-7 w-7" style={{{{ color: primary }}}} />
                      </motion.div>
                      <h3 className="text-xl font-black font-display">Junta-te aos jogos!</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Coloca o teu nome para participar em todos os jogos e concursos ao vivo
                      </p>
                    </div>
                    <div className="flex-1 w-full max-w-md">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="O teu nome..."
                            value={{playerName}}
                            onChange={{e => setPlayerName(e.target.value)}}
                            onKeyDown={{e => e.key === "Enter" && joinGame()}}
                            className="h-12 rounded-xl bg-background/50 border-white/10 text-base"
                          />
                        </div>
                        <motion.button
                          onClick={{joinGame}}
                          disabled={{!playerName.trim()}}
                          className="h-12 px-6 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-40 transition-all"
                          style={{{{
                            background: `linear-gradient(135deg, ${{primary}}, ${{accent}})`,
                            color: "#fff",
                            boxShadow: `0 4px 20px ${{primary}}30`,
                          }}}}
                          whileHover={{{{ scale: 1.03 }}}}
                          whileTap={{{{ scale: 0.97 }}}}
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
              initial={{{{ opacity: 0, y: 10 }}}}
              animate={{{{ opacity: 1, y: 0 }}}}
              exit={{{{ opacity: 0 }}}}
              transition={{{{ ...SPRING }}}}
            >
              <div
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{{{
                  background: `linear-gradient(135deg, ${{primary}}08, transparent)`,
                  border: `1px solid ${{primary}}15`,
                  backdropFilter: "blur(12px)",
                }}}}
              >
                <motion.div
                  className="h-12 w-12 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{{{ background: `linear-gradient(135deg, ${{primary}}, ${{accent}})`, color: "#fff" }}}}
                  initial={{{{ scale: 0 }}}}
                  animate={{{{ scale: 1 }}}}
                  transition={{{{ type: "spring" as const, stiffness: 500, damping: 15 }}}}
                >
                  {{playerName.charAt(0).toUpperCase()}}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">Ola, {{playerName}}!</p>
                  <p className="text-xs text-muted-foreground">Pronto para jogar em todos os jogos ao vivo.</p>
                </div>
                <button
                  onClick={{() => {{ setHasJoined(false); setPlayerName(""); }}}}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{{{ color: primary }}}}
                >
                  Trocar
                </button>
              </div>
            </motion.div>
          )}}
        </AnimatePresence>
      </div>

      {{/* ==================== CONTENT SECTIONS ==================== */}}
      <div className="container mx-auto px-4 mt-10 pb-20 relative z-20">
        {{/* Section navigation pills */}}
        <motion.div
          className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide"
          initial={{{{ opacity: 0, y: 15 }}}}
          animate={{{{ opacity: 1, y: 0 }}}}
          transition={{{{ ...SPRING, delay: 0.5 }}}}
        >
          {{sections.map((sec) => {{
            const isActive = activeSection === sec.id;
            return (
              <button
                key={{sec.id}}
                onClick={{() => setActiveSection(sec.id)}}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                style={{{{
                  backgroundColor: isActive ? `${{primary}}15` : "transparent",
                  color: isActive ? primary : "hsl(var(--muted-foreground))",
                  border: `1px solid ${{isActive ? `${{primary}}30` : "transparent"}}`,
                }}}}
              >
                <sec.icon className="h-4 w-4" />
                {{sec.label}}
                {{sec.count !== null && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{{{
                      backgroundColor: isActive ? `${{primary}}25` : "hsl(var(--muted))",
                    }}}}
                  >
                    {{sec.count}}
                  </span>
                )}}
                {{isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    layoutId="section-indicator"
                    style={{{{ border: `1px solid ${{primary}}20` }}}}
                    transition={{{{ type: "spring" as const, stiffness: 400, damping: 30 }}}}
                  />
                )}}
              </button>
            );
          }})}}
        </motion.div>

        <AnimatePresence mode="wait">
          {{/* ==================== GAMES SECTION ==================== */}}
          {{activeSection === "games" && (
            <motion.div
              key="games"
              initial={{{{ opacity: 0, y: 15 }}}}
              animate={{{{ opacity: 1, y: 0 }}}}
              exit={{{{ opacity: 0, y: -10 }}}}
              transition={{{{ ...SPRING }}}}
            >
              {{games.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {{games.map((game, i) => {{
                    const isWheel = game.type === "wheel";
                    const isActive = game.is_published || game.is_active;
                    return (
                      <motion.div
                        key={{game.id}}
                        className="profile-game-card rounded-2xl cursor-pointer"
                        style={{{{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${{isActive ? `${{primary}}15` : "rgba(255,255,255,0.04)"}}`,
                        }}}}
                        initial={{{{ opacity: 0, y: 20, scale: 0.97 }}}}
                        animate={{{{ opacity: 1, y: 0, scale: 1 }}}}
                        transition={{{{ ...SPRING, delay: i * 0.06 }}}}
                        whileHover={{{{ scale: 1.02 }}}}
                      >
                        <div className="p-5">
                          {{/* Top row: icon + badge */}}
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className="p-3 rounded-2xl"
                              style={{{{ background: `linear-gradient(135deg, ${{isWheel ? primary : secondary}}20, ${{isWheel ? accent : primary}}10)` }}}}
                            >
                              {{isWheel ? <WheelIcon className="h-6 w-6" style={{{{ color: primary }}}} /> : <MillionaireIcon className="h-6 w-6" style={{{{ color: secondary }}}} />}}
                            </div>
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
                              style={{{{
                                backgroundColor: isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                                color: isActive ? "#10b981" : "hsl(var(--muted-foreground))",
                              }}}}
                            >
                              {{isActive ? "Ativo" : "Rascunho"}}
                            </span>
                          </div>

                          {{/* Game name */}}
                          <h3 className="font-bold text-base mb-1">{{game.name}}</h3>
                          <p className="text-xs text-muted-foreground">
                            {{isWheel ? `Roda de Premios${{game.segment_count ? ` / ${{game.segment_count}} segmentos` : ""}}` : "Quem Quer Ser Milionario"}}
                          </p>

                          {{/* Bottom: date */}}
                          <div className="mt-4 pt-3 flex items-center justify-between text-[10px] text-muted-foreground/70" style={{{{ borderTop: "1px solid rgba(255,255,255,0.04)" }}}}>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {{new Date(game.created_at).toLocaleDateString("pt-PT")}}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  }})}}
                </div>
              ) : (
                <div className="text-center py-20">
                  <motion.div
                    className="empty-float inline-block"
                    >
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                      style={{{{ background: `linear-gradient(135deg, ${{primary}}10, ${{accent}}05)`, border: `1px dashed ${{primary}}20` }}}}
                    >
                      <Gamepad2 className="h-9 w-9 text-muted-foreground/20" />
                    </div>
                  </motion.div>
                  <p className="text-base font-semibold text-muted-foreground">Nenhum jogo configurado ainda</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Esta empresa ainda nao criou jogos</p>
                </div>
              )}}
            </motion.div>
          )}}

          {{/* ==================== LIVES SECTION ==================== */}}
          {{activeSection === "lives" && (
            <motion.div
              key="lives"
              initial={{{{ opacity: 0, y: 15 }}}}
              animate={{{{ opacity: 1, y: 0 }}}}
              exit={{{{ opacity: 0, y: -10 }}}}
              transition={{{{ ...SPRING }}}}
            >
              {{sessions.length > 0 ? (
                <div className="space-y-3">
                  {{sessions.map((s, i) => (
                    <motion.div
                      key={{`${{s.code}}-${{i}}`}}}
                      className="profile-game-card rounded-2xl"
                      style={{{{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}}}
                      initial={{{{ opacity: 0, x: -15 }}}}
                      animate={{{{ opacity: 1, x: 0 }}}}
                      transition={{{{ ...SPRING, delay: i * 0.05 }}}}
                      whileHover={{{{ x: 4 }}}}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div
                          className="relative h-14 w-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                          style={{{{ background: `linear-gradient(135deg, ${{primary}}20, ${{primary}}05)` }}}}
                        >
                          <RadioIcon className="h-5 w-5" style={{{{ color: primary }}}} />
                          <span className="text-[8px] font-bold mt-0.5 uppercase tracking-widest" style={{{{ color: primary }}}}>
                            Live
                          </span>
                          <div
                            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                            style={{{{ backgroundColor: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}}}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{{s.title || `Live ${{s.code}}`}}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {{new Date(s.started_at).toLocaleDateString("pt-PT", {{ day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }})}}
                            </span>
                            {{s.duration_sec > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {{Math.round(s.duration_sec / 60)}} min
                              </span>
                            )}}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                      </div>
                    </motion.div>
                  ))}}
                </div>
              ) : (
                <div className="text-center py-20">
                  <motion.div className="empty-float inline-block">
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                      style={{{{ background: `linear-gradient(135deg, ${{secondary}}10, ${{primary}}05)`, border: `1px dashed ${{secondary}}20` }}}}
                    >
                      <RadioIcon className="h-9 w-9 text-muted-foreground/20" />
                    </div>
                  </motion.div>
                  <p className="text-base font-semibold text-muted-foreground">Nenhuma live realizada ainda</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Esta empresa ainda nao realizou lives</p>
                </div>
              )}}
            </motion.div>
          )}}

          {{/* ==================== ABOUT SECTION ==================== */}}
          {{activeSection === "about" && (
            <motion.div
              key="about"
              initial={{{{ opacity: 0, y: 15 }}}}
              animate={{{{ opacity: 1, y: 0 }}}}
              exit={{{{ opacity: 0, y: -10 }}}}
              transition={{{{ ...SPRING }}}}
              className="space-y-6"
            >
              {{/* Company info card */}}
              <div
                className="rounded-2xl p-6"
                style={{{{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  backdropFilter: "blur(12px)",
                }}}}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl" style={{{{ background: `${{primary}}15` }}}}>
                    <Globe className="h-5 w-5" style={{{{ color: primary }}}} />
                  </div>
                  <h3 className="text-lg font-black font-display">Sobre {{companyName}}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {{[
                    {{ icon: Globe, label: "Nome", value: company.display_name || company.company_name || "-" }},
                    {{ icon: MapPin, label: "Localizacao", value: [company.city, company.province].filter(Boolean).join(", ") || "-" }},
                    {{ icon: Calendar, label: "Membro desde", value: company.created_at ? new Date(company.created_at).toLocaleDateString("pt-PT") : "-" }},
                    {{ icon: Zap, label: "Estado", value: "Ativo" }},
                  ].map((item, i) => (
                    <motion.div
                      key={{item.label}}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{{{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}}}
                      initial={{{{ opacity: 0, y: 10 }}}}
                      animate={{{{ opacity: 1, y: 0 }}}}
                      transition={{{{ ...SPRING, delay: i * 0.08 }}}}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{{item.label}}</p>
                        <p className="text-sm font-semibold mt-0.5">{{item.value}}</p>
                      </div>
                    </motion.div>
                  ))}}
                </div>
              </div>

              {{/* Visual identity card */}}
              <div
                className="rounded-2xl p-6"
                style={{{{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}}}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl" style={{{{ background: `${{accent}}15` }}}}>
                    <Sparkles className="h-5 w-5" style={{{{ color: accent }}}} />
                  </div>
                  <h3 className="text-lg font-black font-display">Identidade Visual</h3>
                </div>
                {{branding ? (
                  <div className="grid grid-cols-5 gap-3">
                    {{[
                      ["Cor Principal", branding.primary_color],
                      ["Cor Secundaria", branding.secondary_color],
                      ["Cor de Acento", branding.accent_color],
                      ["Cor de Fundo", branding.background_color],
                      ["Cor do Texto", branding.text_color],
                    ].map(([label, color], i) => (
                      <motion.div
                        key={{label as string}}
                        className="color-swatch text-center"
                        style={{{{ "--swatch-color": `${{color}}50` }} as React.CSSProperties}}
                        initial={{{{ opacity: 0, scale: 0.8 }}}}
                        animate={{{{ opacity: 1, scale: 1 }}}}
                        transition={{{{ ...SPRING, delay: i * 0.06 }}}}
                      >
                        <div
                          className="h-14 rounded-xl border border-white/5 mb-2 transition-all"
                          style={{{{ backgroundColor: color }}}}
                        />
                        <p className="text-[10px] text-muted-foreground font-medium leading-tight">{{label as string}}</p>
                        <p className="text-[9px] text-muted-foreground/50 mt-0.5 font-mono">{{color}}</p>
                      </motion.div>
                    ))}}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/15" />
                    <p className="text-sm text-muted-foreground">Sem identidade visual configurada</p>
                  </div>
                )}}
              </div>

              {{/* Preview card showing brand preview */}}
              <div
                className="rounded-2xl p-6"
                style={{{{
                  background: `linear-gradient(135deg, ${{primary}}06, ${{secondary}}04, ${{accent}}03)`,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}}}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl" style={{{{ background: `${{secondary}}15` }}}}>
                    <Eye className="h-5 w-5" style={{{{ color: secondary }}}} />
                  </div>
                  <h3 className="text-lg font-black font-display">Pre-visualizacao</h3>
                </div>
                <div
                  className="rounded-xl p-6 text-center"
                  style={{{{ backgroundColor: branding?.background_color || "#0a0a0a", border: `2px solid ${{primary}}30` }}}}
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {{(branding?.company_logo_url || company.avatar_url) ? (
                      <img
                        src={{branding?.company_logo_url || company.avatar_url || ""}}
                        alt={{companyName}}
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg"
                        style={{{{ backgroundColor: primary, color: branding?.background_color || "#000" }}}}
                      >
                        {{companyName.charAt(0).toUpperCase()}}
                      </div>
                    )}}
                    <span
                      className="text-xl font-black font-display"
                      style={{{{ color: branding?.text_color || "#fff" }}}}
                    >
                      {{branding?.company_name || companyName}}
                    </span>
                  </div>
                  {{branding?.company_slogan && (
                    <p className="text-sm" style={{{{ color: `${{branding.text_color || "#fff"}}99` }}}}>
                      {{branding.company_slogan}}
                    </p>
                  )}}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    {{[primary, secondary, accent].map((c) => (
                      <div
                        key={{c}}
                        className="px-4 py-2 rounded-lg text-xs font-bold"
                        style={{{{ backgroundColor: c, color: branding?.background_color || "#000" }}}}
                      >
                        Botao
                      </div>
                    ))}}
                  </div>
                </div>
              </div>
            </motion.div>
          )}}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}};

export default CompanyPublicProfile;
'''

with open(FILE, "w") as f:
    f.write(content)

print(f"OK: Generated CompanyPublicProfile.tsx ({len(content)} chars)")
