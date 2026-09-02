#!/usr/bin/env python3
"""Enhance BusinessProfile.tsx with Games tab, Game History, and Guest Player flow"""

import re

BASE = "/home/z/my-project/bateumz-cb2c44d1"

with open(f"{BASE}/src/pages/BusinessProfile.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports for new components after existing imports
new_imports = '''import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AmbassadorPanel from "@/components/ambassadors/AmbassadorPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BusinessGameCard from "@/components/livegames/BusinessGameCard";
import GameHistoryPanel from "@/components/livegames/GameHistoryPanel";
import GuestNameDialog from "@/components/livegames/GuestNameDialog";'''

# Replace the first line imports block
old_import = 'import { useState, useEffect, useMemo } from "react";\nimport { useParams, useNavigate } from "react-router-dom";'
if old_import in content:
    content = content.replace(old_import, new_imports)
    print("OK: Updated imports")
else:
    print("WARN: Could not find import block to replace")

# 2. Add new icons to the lucide import
if 'Link' not in content.split('from "lucide-react"')[0]:
    content = content.replace(
        'from "lucide-react";',
        'from "lucide-react";\nimport { Link } from "react-router-dom";'
    )

# Add Gamepad2 to icons if not there
icons_import = content.split('from "lucide-react"')[0].split(',')
if 'Gamepad2' not in str(icons_import):
    content = content.replace(
        'from "lucide-react";',
        'Gamepad2,\n  } from "lucide-react";'.replace('  } from "lucide-react";', '  Gamepad2,\n} from "lucide-react";')
    )
    # Simpler approach: just add it before the closing
    content = content.replace(
        '} from "lucide-react";',
        '  Gamepad2,\n} from "lucide-react";'
    )
    print("OK: Added Gamepad2 import")

# 3. Add new interface for games after PrestacaoProduct interface
interfaces_block = '''interface PrestacaoProduct {'''
games_interface = '''interface SpinWheelGame {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
  total_plays?: number;
}

interface MillionaireGameInfo {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
  total_plays?: number;
}

interface ChallengeRoulette {\n  id: string;\n  title: string | null;\n  is_published: boolean;\n  created_at: string;\n}\n\ninterface PrestacaoProduct {'''

if interfaces_block in content:
    content = content.replace(interfaces_block, games_interface)
    print("OK: Added game interfaces")

# 4. Add state for games inside the component - after existing useState declarations
# Find a good insertion point: after the existing setRankings state
state_insertion = '''  const [rankings, setRankings] = useState<ContestRanking[]>([]);'''
games_state = '''  const [rankings, setRankings] = useState<ContestRanking[]>([]);
  const [spinGames, setSpinGames] = useState<SpinWheelGame[]>([]);
  const [millionaireGames, setMillionaireGames] = useState<MillionaireGameInfo[]>([]);
  const [challengeRoulettes, setChallengeRoulettes] = useState<ChallengeRoulette[]>([]);
  const [guestName, setGuestName] = useState("");
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingGame, setPendingGame] = useState<{type: string; id: string} | null>(null);'''

if state_insertion in content:
    content = content.replace(state_insertion, games_state)
    print("OK: Added games state")

# 5. Add games data loading to the useEffect - after products load
products_load = '''        setProducts((productsRes.data as PrestacaoProduct[]) || []);'''
games_load = '''        setProducts((productsRes.data as PrestacaoProduct[]) || []);

      // Load games (non-blocking)
      void loadGames();'''

if products_load in content:
    content = content.replace(products_load, games_load)
    print("OK: Added games load call")

# 6. Add loadGames function before the loadWinnersAndRankings function
load_winners = '''    const loadWinnersAndRankings = async ('''
games_loader = '''    const loadGames = async () => {
      const bizId = id!;
      const [spinsRes, millsRes, roulettesRes] = await Promise.all([
        supabase.from("spin_wheel_games").select("id, title, description, cover_image_url, is_active, created_at").eq("business_user_id", bizId).order("created_at", { ascending: false }).limit(20),
        supabase.from("millionaire_games").select("id, title, description, cover_image_url, is_active, created_at").eq("business_user_id", bizId).order("created_at", { ascending: false }).limit(20),
        supabase.from("challenge_roulettes").select("id, title, is_published, created_at").eq("business_user_id", bizId).order("created_at", { ascending: false }).limit(20),
      ]);
      setSpinGames((spinsRes.data as SpinWheelGame[]) || []);
      setMillionaireGames((millsRes.data as MillionaireGameInfo[]) || []);
      setChallengeRoulettes((roulettesRes.data as ChallengeRoulette[]) || []);

      // Load guest name from localStorage
      const saved = localStorage.getItem("bateumz_guest_name");
      if (saved) setGuestName(saved);
    };

    const loadWinnersAndRankings = async ('''

if load_winners in content:
    content = content.replace(load_winners, games_loader)
    print("OK: Added loadGames function")

# 7. Update stats to include games
calc_stats = '''  const stats = useMemo(() => {
    const activeRaffles = raffles.filter((r) => r.status === "active").length;
    const totalSold = raffles.reduce((acc, r) => acc + (r.sold_tickets || 0), 0);
    return {
      activeRaffles,
      totalRaffles: raffles.length,
      contests: contests.length,
      products: products.length,
      totalSold,
    };
  }, [raffles, contests, products]);'''

new_calc_stats = '''  const allGames = useMemo(() => [
    ...spinGames.map((g) => ({ ...g, type: "spin" as const })),
    ...millionaireGames.map((g) => ({ ...g, type: "millionaire" as const })),
    ...challengeRoulettes.map((g) => ({ ...g, type: "roulette" as const, description: null, cover_image_url: null, title: g.title || "Roleta de Desafios" })),
  ], [spinGames, millionaireGames, challengeRoulettes]);

  const stats = useMemo(() => {
    const activeRaffles = raffles.filter((r) => r.status === "active").length;
    const totalSold = raffles.reduce((acc, r) => acc + (r.sold_tickets || 0), 0);
    const totalGames = spinGames.length + millionaireGames.length + challengeRoulettes.length;
    const activeGames = [...spinGames, ...millionaireGames].filter((g) => g.is_active).length;
    return {
      activeRaffles,
      totalRaffles: raffles.length,
      contests: contests.length,
      products: products.length,
      totalSold,
      totalGames,
      activeGames,
    };
  }, [raffles, contests, products, spinGames, millionaireGames, challengeRoulettes]);'''

if calc_stats in content:
    content = content.replace(calc_stats, new_calc_stats)
    print("OK: Updated stats with games")

# 8. Add game play handler before handleShare
share_func = '''  const handleShare = async () => {'''
game_play_handler = '''  const handlePlayGame = useCallback((type: string, gameId: string) => {
    if (!guestName) {
      setPendingGame({ type, id: gameId });
      setShowNameDialog(true);
    } else {
      const routes: Record<string, string> = {
        spin: `/games/spin-wheel/${gameId}`,
        millionaire: `/games/millionaire/${gameId}`,
      };
      const route = routes[type] || `/jogos`;
      navigate(route);
    }
  }, [guestName, navigate]);

  const handleGuestNameSubmit = useCallback((name: string) => {
    setGuestName(name);
    setShowNameDialog(false);
    if (pendingGame) {
      const routes: Record<string, string> = {
        spin: `/games/spin-wheel/${pendingGame.id}`,
        millionaire: `/games/millionaire/${pendingGame.id}`,
      };
      navigate(routes[pendingGame.type] || `/jogos`);
      setPendingGame(null);
    }
  }, [pendingGame, navigate]);

  const handleShare = async () => {'''

if share_func in content:
    content = content.replace(share_func, game_play_handler)
    print("OK: Added game play handler")

# 9. Find the Tabs component and add a Games tab
# Look for the TabsContent for contests and add after it
# We need to find a good insertion point in the tabs

# Find the existing tabs structure to add a games tab
# The file has tabs like: Sorteios, Concursos, Produtos, Ganhadores, Embaixadores

# Let's add a Games TabsContent after the existing ones
# Find the ambassador panel tabs content
ambassador_tab = '<AmbassadorPanel'

# We'll insert a new TabsContent for games before the ambassador panel
games_tab_content = '''              <TabsContent value="jogos" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Jogos Interactivos</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {stats.totalGames} jogos configurados
                  </Badge>
                </div>

                {allGames.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center">
                      <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Esta empresa ainda n\u00e3o configurou jogos</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allGames.map((game, i) => (
                      <BusinessGameCard
                        key={`${game.type}-${game.id}`}
                        game={game}
                        index={i}
                        onClick={() => handlePlayGame(game.type, game.id)}
                      />
                    ))}
                  </div>
                )}

                <GameHistoryPanel businessId={id!} />
              </TabsContent>

              <TabsContent value="embaixadores" className="space-y-4 mt-4">
''' + ambassador_tab

# Find the ambassador tab content marker and replace
# This is tricky - let me find the TabsContent for embaixadores
embaixador_search = '<TabsContent value="embaixadores"'
if embaixador_search in content:
    # Insert games tab before embaixadores
    content = content.replace(
        embaixador_search,
        '''              <TabsContent value="jogos" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Jogos Interactivos</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {stats.totalGames} jogos
                  </Badge>
                </div>

                {allGames.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center">
                      <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum jogo configurado ainda</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allGames.map((game, i) => (
                      <BusinessGameCard
                        key={`${game.type}-${game.id}`}
                        game={game}
                        index={i}
                        onClick={() => handlePlayGame(game.type, game.id)}
                      />
                    ))}
                  </div>
                )}

                <GameHistoryPanel businessId={id!} />
              </TabsContent>

              ''' + embaixador_search
    )
    print("OK: Added Games tab content")
else:
    print(f"WARN: Could not find embaixadores tab")

# 10. Add the Games tab trigger in the TabsList
# Find the TabsList and add a new trigger
tabs_list_pattern = '<TabsList'
tabs_list_section = None
for m in re.finditer(r'<TabsList[^>]*>(.*?)</TabsList>', content, re.DOTALL):
    tabs_list_section = m.group(0)
    break

if tabs_list_section and 'jogos' not in tabs_list_section:
    # Add a jogos trigger before the closing </TabsList>
    new_trigger = '''<TabsTrigger value="jogos" className="gap-1.5">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Jogos</span>
                </TabsTrigger>
              </TabsList>'''
    content = content.replace(
        '</TabsList>',
        new_trigger
    )
    print("OK: Added Games tab trigger")

# 11. Add the GuestNameDialog at the end, before the closing div/footer
# Find the closing Footer tag and add the dialog after it
footer_close = '</Footer>'
if footer_close in content:
    dialog_insert = footer_close + '''

      <GuestNameDialog
        open={showNameDialog}
        onNameSubmit={handleGuestNameSubmit}
        gameTitle={pendingGame?.type === "spin" ? "Roleta" : pendingGame?.type === "millionaire" ? "Millionario" : "Jogo"}
        gameEmoji={pendingGame?.type === "spin" ? "🎲" : pendingGame?.type === "millionaire" ? "💰" : "🎮"}
      />'''
    content = content.replace(footer_close, dialog_insert)
    print("OK: Added GuestNameDialog")

# 12. Add game count to stats bar - find where stats are displayed
# Look for the stats grid that shows the 4 stat cards
# Find the pattern that renders stats.totalRaffles and add a games stat

with open(f"{BASE}/src/pages/BusinessProfile.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("\nDONE: BusinessProfile.tsx enhanced with games tab, history, and guest player flow")
