#!/usr/bin/env python3
"""
Make games in LiveHub freely playable for any registered user.
No live session required.
"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx"

with open(FILE, "r") as f:
    content = f.read()

changes = 0

# 1. Add useSearchParams import
old = 'import { Link } from "react-router-dom";'
new = 'import { Link, useSearchParams } from "react-router-dom";'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("1. Added useSearchParams import")
else:
    print("1. SKIP: import already changed or not found")

# 2. Add useSearchParams hook after useToast
old = '  const { toast: uiToast } = useToast();'
new = '''  const { toast: uiToast } = useToast();
  const [searchParams] = useSearchParams();
  const gameFromUrl = searchParams.get("game") as GameId | null;'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("2. Added useSearchParams hook")
else:
    print("2. SKIP: hook location not found")

# 3. Update active game initializer to check URL param
old = '''  const [active, setActive] = useState<GameId>(() => {
    try { return (localStorage.getItem("liveActiveGame") as GameId) || "wheel"; } catch { return "wheel"; }
  });'''
new = '''  const [active, setActive] = useState<GameId>(() => {
    try {
      const fromUrl = gameFromUrl;
      if (fromUrl && GAMES.some(g => g.id === fromUrl)) return fromUrl;
      return (localStorage.getItem("liveActiveGame") as GameId) || "wheel";
    } catch { return "wheel"; }
  });'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("3. Updated active game initializer")
else:
    print("3. SKIP: initializer not found")

# 4. Add URL param sync effect
old = '''    // Hydrate latest from bus
    const latest = readLatest<string>("activeGame");
    if (latest && latest !== active) setActive(latest as GameId);
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps'''
new = '''    // Hydrate latest from bus
    const latest = readLatest<string>("activeGame");
    if (latest && latest !== active) setActive(latest as GameId);
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync active game when URL ?game= param changes (e.g. from AllGames page)
  useEffect(() => {
    if (gameFromUrl && GAMES.some(g => g.id === gameFromUrl) && gameFromUrl !== active) {
      setActive(gameFromUrl);
    }
  }, [gameFromUrl]);'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("4. Added URL param sync effect")
else:
    print("4. SKIP: bus hydrate block not found")

# 5. Remove isLive gate from recordScore
old = '''  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name || !isLive) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };'''
new = '''  const recordScore = (game: string) => (name: string, score: number) => {
    if (!name) return;
    setLeaderboard((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },
    ]);
  };'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("5. Removed isLive gate from recordScore")
else:
    print("5. SKIP: recordScore not found")

# 6. Remove isLive gate from broadcastWinner
old = '''  const broadcastWinner = (name: string, meta?: string) => {
    if (!isLive) return;
    const w = { name, meta, at: Date.now() };
    winnersRef.current = [...winnersRef.current, w];
    publish({ type: "winner", payload: w });
  };'''
new = '''  const broadcastWinner = (name: string, meta?: string) => {
    const w = { name, meta, at: Date.now() };
    winnersRef.current = [...winnersRef.current, w];
    if (isLive) publish({ type: "winner", payload: w });
  };'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("6. Removed isLive gate from broadcastWinner")
else:
    print("6. SKIP: broadcastWinner not found")

# 7. Update header
old = '''            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-3">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              LIVE ENGAGEMENT
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
              Jogos para a sua <span className="text-primary">Live</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-4">
              Plataforma dedicada para empresas animarem lives com roda de premios, batalhas, quizzes e caixas misteriosas — tudo configuravel.
            </p>'''
new = '''            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
              <Gamepad2 className="h-3.5 w-3.5" />
              {GAMES.length} JOGOS DISPONIVEIS
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
              Jogos <span className="text-primary">Online</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-4">
              Joga quando quiseres! Escolhe um jogo e diverte-te. Empresas podem iniciar uma live para envolver a audiencia em tempo real.
            </p>'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("7. Updated header")
else:
    print("7. SKIP: header not found")

# 8. Replace warning banner
old = '''      {!isLive && (
        <div className="container mx-auto px-3 sm:px-4 pt-3">
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            🔒 Pontuacoes e vencedores so sao contabilizados depois de <strong>iniciar a live</strong>. Configure os jogos no painel da empresa.
          </div>
        </div>
      )}'''
new = '''      {!user && (
        <div className="container mx-auto px-3 sm:px-4 pt-3">
          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            🔒 <strong>Entra na tua conta</strong> para guardar as tuas pontuacoes e aceder a todas as funcionalidades. <Link to="/register" className="underline font-bold">Criar conta</Link> ou <Link to="/login" className="underline font-bold">Entrar</Link>
          </div>
        </div>
      )}'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("8. Replaced warning banner")
else:
    print("8. SKIP: warning banner not found")

# 9. Update status badge
old = '''                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isLive ? "transmitindo" : "em espera"}
                </span>'''
new = '''                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/15 text-primary"}`}>
                  {isLive ? "ao vivo" : "pronto a jogar"}
                </span>'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("9. Updated status badge")
else:
    print("9. SKIP: status badge not found")

# 10. Update "no code" message
old = '''                    <Lock className="h-3 w-3" /> Sem codigo ativo'''
new = '''                    <Gamepad2 className="h-3 w-3" /> Modo jogo livre'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("10. Updated no-code message")
else:
    print("10. SKIP: no-code message not found")

# 11. Update sidebar tips
old = '''              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Configure os premios e probabilidades antes de comecar.</li>
                <li>Partilhe o codigo da live para os participantes.</li>
                <li>Use o leaderboard para coroar o vencedor no fim.</li>
                <li>Vincule um sorteio para distribuir premios reais.</li>
              </ul>'''
new = '''              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Escolhe qualquer jogo da lista e joga imediatamente.</li>
                <li>Empresas podem iniciar uma live para envolver a audiencia.</li>
                <li>O teu ranking local e guardado automaticamente.</li>
                <li>Desafia os teus amigos e supera o teu recorde!</li>
              </ul>'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("11. Updated sidebar tips")
else:
    print("11. SKIP: sidebar tips not found")

# 12. Update multi-player section
old = '''              <p className="text-xs text-muted-foreground">
                Tap Battle e Quiz Battle suportam 1v1 ou contra bot — perfeito para desafios entre o anfitriao e convidados.
              </p>'''
new = '''              <p className="text-xs text-muted-foreground">
                Varios jogos suportam 1v1 ou contra bot IA — perfeito para desafiar amigos. Inicia uma live para partilhar com a audiencia!
              </p>'''
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("12. Updated multi-player section")
else:
    print("12. SKIP: multi-player section not found")

# 13. Update MobileDiscoveryHeader title
old = 'title="Jogos da Live"'
new = 'title="Todos os Jogos"'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("13. Updated MobileDiscoveryHeader title")
else:
    print("13. SKIP: MDH title not found")

# 14. Update "Jogo ativo no painel" label
old = 'Jogo ativo no painel'
new = 'A jogar agora'
if old in content:
    content = content.replace(old, new, 1)
    changes += 1
    print("14. Updated panel label")
else:
    print("14. SKIP: panel label not found")

with open(FILE, "w") as f:
    f.write(content)

print(f"\nTotal changes applied: {changes}/14")
