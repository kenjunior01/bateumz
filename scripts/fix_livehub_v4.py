import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    'interface SavedWheelGame {',
    'type CatId = "todos" | "mocambicano" | "popular" | "tabuleiro" | "acao" | "puzzle" | "quiz" | "versus";\nconst CAT_LABELS: Record<CatId, string> = { todos: "Todos", mocambicano: "Mo\u00e7ambicanos", popular: "Popular", tabuleiro: "Tabuleiro", acao: "A\u00e7\u00e3o", puzzle: "Puzzle", quiz: "Quiz", versus: "Versus" };\nconst CAT_LIST: CatId[] = ["todos", "mocambicano", "popular", "tabuleiro", "acao", "puzzle", "quiz", "versus"];\n\ninterface SavedWheelGame {'
)

c = c.replace(
    'Layers } from "lucide-react";',
    'Layers, ChevronLeft, Filter } from "lucide-react";'
)

c = c.replace(
    'const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [',
    'const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string; cat: CatId; moz: boolean }[] = ['
)

c = c.replace(
    '    } catch { return "wheel" };\n  });\n  const [config',
    '    } catch { return "wheel" };\n  });\n  const [cat, setCat] = useState<CatId>("todos");\n  const [showGame, setShowGame] = useState(false);\n  const [config'
)

c = c.replace(
    '  const recordScore = (game: string) => (name: string, score: number) => {\n    if (!name || !isLive) return;',
    '  const recordScore = (game: string) => (name: string, score: number) => {\n    if (!name) return;\n    if (isLive) {'
)

c = c.replace(
    '      { id: `${' + 'Date.now()' + '}-${' + 'Math.random()' + '}`, name, score, game, at: Date.now() },\n    ];\n  };',
    '      { id: `${' + 'Date.now()' + '}-${' + 'Math.random()' + '}`, name, score, game, at: Date.now() },\n      ];\n    }\n  };'
)

c = c.replace(
    '  const activeMeta = GAMES.find((g) => g.id === active);',
    '  const activeMeta = GAMES.find((g) => g.id === active);\n  const filteredGames = cat === "todos" ? GAMES : GAMES.filter((g) => g.cat === cat);\n  const mozGames = GAMES.filter((g) => g.moz);\n  const handleSelectGame = (id: GameId) => { setActive(id); setShowGame(true); };'
)

print('Basic changes applied. Checking...')
print('  CatId:', 'type CatId' in c)
print('  showGame:', 'showGame' in c)
print('  filteredGames:', 'filteredGames' in c)
print('  mozGames:', 'mozGames' in c)

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
    f.write(c)
