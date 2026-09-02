import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'r') as f:
    c = f.read()

# 1. Add CatId type and constants after GameId type
c = c.replace(
    'interface SavedWheelGame {',
    '''type CatId = "todos" | "mocambicano" | "popular" | "tabuleiro" | "acao" | "puzzle" | "quiz" | "versus";
const CAT_LABELS: Record<CatId, string> = { todos: "Todos", mocambicano: "Mo\u00e7ambicanos", popular: "Popular", tabuleiro: "Tabuleiro", acao: "A\u00e7\u00e3o", puzzle: "Puzzle", quiz: "Quiz", versus: "Versus" };
const CAT_LIST: CatId[] = ["todos", "mocambicano", "popular", "tabuleiro", "acao", "puzzle", "quiz", "versus"];

interface SavedWheelGame {'''
)

# 2. Add ChevronLeft, Filter to lucide imports
c = c.replace(
    'Layers } from "lucide-react";',
    'Layers, ChevronLeft, Filter } from "lucide-react";'
)

# 3. Update GAMES type signature
c = c.replace(
    'const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [',
    'const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string; cat: CatId; moz: boolean }[] = ['
)

# 4. Add cat/moz to each game entry
MOZ = {'mexerica', 'urusse', 'capulanaquiz', 'chigogo', 'ntchuva', 'djikota', 'uri', 'bicho'}
cat_map = {
    'wheel': 'popular', 'keyword': 'popular', 'emoji': 'popular', 'tap': 'versus',
    'quiz': 'quiz', 'mystery': 'popular', 'millionaire': 'quiz', 'kahoot': 'quiz',
    'bingo': 'popular', 'challenge': 'popular', 'vsduel': 'versus', 'speed': 'versus',
    'truthordare': 'popular', 'memory': 'puzzle', 'punishment': 'popular',
    'boknowledge': 'quiz', 'guessEmoji': 'quiz', 'quickdraw': 'quiz',
    'hotpotato': 'acao', 'numguess': 'versus', 'chaos': 'acao',
    'checkers': 'tabuleiro', 'ludo': 'tabuleiro', 'connect4': 'tabuleiro',
    'battleship': 'tabuleiro', 'tictactoe': 'tabuleiro', 'uno': 'tabuleiro',
    'snakebattle': 'acao', 'rps': 'versus', 'colorsequence': 'puzzle',
    'spaceshooter': 'acao', 'ballbreaker': 'acao', 'reactionrace': 'acao',
    'quickmath': 'versus', 'memorycards': 'puzzle', 'wordscramble': 'puzzle',
    'tictactoepro': 'tabuleiro', 'guessnumber100': 'versus', 'colormatch': 'puzzle',
    'targettap': 'puzzle', 'diceluel': 'versus', 'patternmemory': 'puzzle',
    'triviaflash': 'quiz', 'dominoes': 'tabuleiro', 'mazerace': 'puzzle',
    'slotsvs': 'popular', 'match4': 'puzzle', 'towerstack': 'acao',
    'cannonbattle': 'acao', 'spotdifference': 'puzzle', 'wordchain': 'quiz',
    'numbertetris': 'puzzle', 'pongvs': 'acao', 'whackamole': 'acao', 'colorcatch': 'puzzle',
}

def add_cat_moz(m):
    gid = m.group(1)
    cat_val = 'mocambicano' if gid in MOZ else cat_map.get(gid, 'popular')
    moz_val = 'true' if gid in MOZ else 'false'
    result = m.group(0).rstrip(); return result + ' , cat: "' + cat_val + '" as const, moz: ' + moz_val + ' }'

c = re.sub(
    r'(\{ id: "(\w+)", label: "[^"]+", icon: \w+, emoji: "[^"]+", desc: "[^"]+", grad: "[^"]+" \})',
    add_cat_moz,
    c
)

# 5. Add state variables after active state
c = c.replace(
    '  } catch { return "wheel" };\n  });\n  const [config',
    '  } catch { return "wheel" };\n  });\n  const [cat, setCat] = useState<CatId>("todos");\n  const [showGame, setShowGame] = useState(false);\n  const [config'
)

# 6. Fix recordScore to allow playing without live
c = c.replace(
    '  const recordScore = (game: string) => (name: string, score: number) => {\n    if (!name || !isLive) return;',
    '  const recordScore = (game: string) => (name: string, score: number) => {\n    if (!name) return;\n    if (isLive) {'
)
# Fix closing of recordScore
c = c.replace(
    '      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },\n    ]);\n  };',
    '      { id: `${Date.now()}-${Math.random()}`, name, score, game, at: Date.now() },\n      ]);\n    }\n  };'
)

# 7. Add helper variables
old_active_meta = '  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;\n  const activeMeta = GAMES.find((g) => g.id === active);'
new_active_meta = '''  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;\n  const activeMeta = GAMES.find((g) => g.id === active);\n  const filteredGames = cat === "todos" ? GAMES : GAMES.filter((g) => g.cat === cat);\n  const mozGames = GAMES.filter((g) => g.moz);\n  const handleSelectGame = (id: GameId) => { setActive(id); setShowGame(true); };'''
c = c.replace(old_active_meta, new_active_meta)

# 8. Replace lock banner with friendly message
c = c.replace(
    '''      {!isLive && (\n        <div className="container mx-auto px-3 sm:px-4 pt-3">\n          <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">\n            \U0001f512 Pontua\u00e7\u00f5es e vencedores s\u00f3 s\u00e3o contabilizados depois de <strong>iniciar a live</strong>. Configure os jogos no painel da empresa.\n          </div>\n        </div>\n      )}''',
    '''      {!isLive && (\n        <div className="container mx-auto px-3 sm:px-4 pt-2">\n          <div className="rounded-xl bg-gradient-to-r from-[#009140]/5 to-[#FFD700]/5 border border-[#009140]/20 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">\n            <Sparkles className="h-3.5 w-3.5 text-[#FFD700]" />\n            <span>Joga livremente! <strong className="text-foreground">Inicia uma Live</strong> para gravar pontua\u00e7\u00f5es e vencedores.</span>\n          </div>\n        </div>\n      )}'''
)

# 9. Replace the hero section
old_hero_bg = '        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />'
new_hero_bg = '''        <div className="absolute inset-0 bg-gradient-to-br from-[#009140]/20 via-background to-[#FFD700]/10" />\n        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,145,64,0.15),transparent_50%)]" />'''
c = c.replace(old_hero_bg, new_hero_bg)

c = c.replace(
    '        <ParticleBackground preset="stars" count={25}',
    '        <ParticleBackground preset="stars" count={20}'
)

c = c.replace(
    '        <div className="relative container mx-auto px-4 py-6 md:py-12">',
    '        <div className="relative container mx-auto px-4 py-5 md:py-8">\n          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">'
)

# Replace LIVE ENGAGEMENT badge
c = c.replace(
    '            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-3">\n              <Radio className="h-3.5 w-3.5 animate-pulse" />\n              LIVE ENGAGEMENT\n            </div>',
    '            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#009140]/20 to-[#FFD700]/20 border border-[#009140]/30 text-[11px] font-bold text-[#009140] mb-2">\n              <span className="h-2 w-2 rounded-full bg-[#009140] animate-pulse" />\n              JOGOS AO VIVO\n            </div>'
)

c = c.replace(
    '            <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">\n              Jogos para a sua <span className="text-primary">Live</span>\n            </h1>',
    '            <h1 className="font-display text-2xl md:text-4xl font-bold">\n              Jogos para a sua <span className="bg-gradient-to-r from-[#009140] to-[#FFD700] bg-clip-text text-transparent">Live</span>\n            </h1>'
)

c = c.replace(
    '            <p className="text-muted-foreground text-sm md:text-base mb-4">\n              Plataforma dedicada para empresas animarem lives com roda de pr\u00e9mios, batalhas, quizzes e caixas misteriosas \u2014 tudo configur\u00e1vel.\n            </p>',
    '            <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-lg">\n              Animes a tua audi\u00eancia com jogos interativos, quizzes e desafios em tempo real.\n            </p>'
)

c = c.replace(
    '          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">',
    '          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1">'
)

# Replace the controls div with motion.div
c = c.replace(
    '            <div className="flex flex-wrap items-center gap-2">\n              {isLive ? (',
    '          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-2">\n              {isLive ? ('
)

# Fix closing: replace </div> that closes the controls with </motion.div></div>
# The pattern is: </Link>\n            </div>\n\n            {/* Host
# Need to replace the </div> after </Link> with </motion.div>
c = c.replace(
    '              </Link>\n            </div>\n\n            {/* Host summary banner',
    '              </Link>\n          </motion.div>\n\n            {/* Host summary banner'
)

# Replace activeMeta banner  
c = c.replace(
    '            {/* Host summary banner \u2014 what dashboard set as active */}\n            {activeMeta && (\n              <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-2.5">\n                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${activeMeta.grad} flex items-center justify-center text-lg`}>{activeMeta.emoji}</div>\n                <div className="text-left">\n                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Jogo ativo no painel</p>\n                  <p className="text-sm font-bold leading-tight">{activeMeta.label}</p>\n                </div>\n                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>\n                  {isLive ? "transmitindo" : "em espera"}\n                </span>\n              </div>\n            )}',
    '            {activeMeta && (\n              <div className="mt-3 inline-flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border px-4 py-2">\n                <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${activeMeta.grad} flex items-center justify-center text-base`}>{activeMeta.emoji}</div>\n                <div className="text-left">\n                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Jogo ativo</p>\n                  <p className="text-sm font-bold leading-tight">{activeMeta.label}</p>\n                </div>\n                {showGame && (\n                  <button onClick={() => setShowGame(false)} className="ml-2 p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">\n                    <ChevronLeft className="h-4 w-4" />\n                  </button>\n                )}\n              </div>\n            )}'
)

# Close the flex wrapper div before section close
c = c.replace(
    '          </motion.div>\n        </div>\n      </section>\n\n      {!isLive',
    '          </motion.div>\n          </div>\n        </div>\n      </section>\n\n      {!isLive'
)

# 10. Replace "Sem c\u00f3digo ativo" with nothing (remove it)
c = c.replace(
    '                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-muted-foreground text-[11px] font-medium">\n                    <Lock className="h-3 w-3" /> Sem c\u00f3digo ativo\n                  </div>\n',
    ''
)

# 11. Replace emerald gradient with Mozambican green for start button
c = c.replace(
    'from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow',
    'from-[#009140] to-[#009140]/80 text-white text-sm font-bold shadow-lg shadow-[#009140]/30 hover:shadow-xl transition-all'
)

# 12. Add Mozambican games carousel and category filters before game grid
old_grid = '        {/* Desktop game cards */}\n        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 mt-4">'
new_grid = '''        <div className="hidden md:block mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="font-display text-lg font-bold">Jogos Mo\u00e7ambicanos</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] text-[10px] font-bold">NOVOS</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">{
              mozGames.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g.id)}
                  className="flex-shrink-0 w-40 rounded-2xl border-2 border-[#009140]/30 bg-gradient-to-br from-[#009140]/10 to-[#FFD700]/5 p-3 text-left hover:border-[#FFD700] hover:shadow-lg hover:shadow-[#009140]/10 transition-all group"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{g.emoji}</div>
                  <p className="font-display text-xs font-bold text-foreground leading-tight">{g.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{g.desc}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] text-[9px] font-bold">MO\u00c7AMBIQUE</span>
                </button>
              ))
            }</div>
          </div>

          <div className="hidden md:flex items-center gap-2 mb-3 overflow-x-auto pb-1">{
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />,
            CAT_LIST.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  cat === c
                    ? "bg-gradient-to-r from-[#009140] to-[#FFD700] text-white shadow-lg shadow-[#009140]/20"
                    : "bg-card border border-border text-muted-foreground hover:border-[#009140]/40 hover:text-foreground"
                }`}
              >
                {CAT_LABELS[c]}
              </button>
            ))
          }</div>

        {/* Desktop game cards */}
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-3 mb-8">'''
c = c.replace(old_grid, new_grid)

# 13. Update game grid to use filteredGames and handleSelectGame
c = c.replace(
    '          {GAMES.map((g) => {\n            const isActive = active === g.id;\n            return (\n              <button\n                key={g.id}\n                onClick={() => setActive(g.id)}',
    '          {filteredGames.map((g) => {\n            const isActive = active === g.id;\n            return (\n              <button\n                key={g.id}\n                onClick={() => handleSelectGame(g.id)}'
)

# 14. Add MZ badge and Moz border styling to game cards
c = c.replace(
    'className={`text-left rounded-2xl border-2 p-4 transition-all ${\n                  isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"\n                }`}',
    'className={`text-left rounded-2xl border-2 p-4 transition-all group ${\n                  isActive\n                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"\n                    : g.moz\n                    ? "border-[#009140]/30 bg-gradient-to-br from-[#009140]/5 to-[#FFD700]/5 hover:border-[#009140]/60 hover:shadow-lg hover:shadow-[#009140]/10"\n                    : "border-border bg-card hover:border-primary/40 hover:shadow-md"\n                }`}'
)

# Add MZ badge after the game label
c = c.replace(
    '                <p className="font-display text-sm font-bold mb-1">{g.label}</p>\n                <p className="text-[11px] text-muted-foreground line-clamp-2">{g.desc}</p>',
    '                <div className="flex items-start justify-between gap-2">\n                  <p className="font-display text-sm font-bold leading-tight">{g.label}</p>\n                  {g.moz && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] font-bold flex-shrink-0">MZ</span>}\n                </div>\n                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{g.desc}</p>'
)

# 15. Update game icon hover
c = c.replace(
    'className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} mb-2`}',
    'className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} mb-2 group-hover:scale-110 transition-transform`}'
)

# 16. Change desktop grid from 4 cols to 3
# Already done in step 12 (grid-cols-2 xl:grid-cols-3)

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
    f.write(c)

print('Applied all changes')
print(f'  Has CatId: {"type CatId" in c}')
print(f'  Has CAT_LABELS: {"CAT_LABELS" in c}')
print(f'  Has showGame: {"showGame" in c}')
print(f'  Has filteredGames: {"filteredGames" in c}')
print(f'  Has mozGames: {"mozGames" in c}')
print(f'  Has handleSelectGame: {"handleSelectGame" in c}')
print(f'  Has MOZ carousel: {"Jogos Mo" in c}')
print(f'  Has category filter: {"CAT_LIST.map" in c}')
print(f'  Lock removed: {"Sem c" not in c}')
print(f'  Has Mozambican green: {"#009140" in c}')
print(f'  File size: {len(c)} bytes')
