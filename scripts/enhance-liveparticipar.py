#!/usr/bin/env python3
"""Enhance LiveParticipar tap battle and bingo with dramatic effects"""

path = "/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveParticipar.tsx"
with open(path, "r") as f:
    c = f.read()

# 1. Enhance Tap Battle component - add particles, shake
old_tap = "// ==================== TAP BATTLE SPECTATOR ====================\nconst SpectatorTapBattle = ({ liveCode }: { liveCode?: string }) => {\n  const { user } = useAuth();\n  const [taps, setTaps] = useState(0);\n  const [timeLeft, setTimeLeft] = useState(10);\n  const [active, setActive] = useState(false);\n  const [bestScore, setBestScore] = useState(0);\n\n  const startGame = () => {\n    setTaps(0);\n    setTimeLeft(10);\n    setActive(true);\n  };"

new_tap = "// ==================== TAP BATTLE SPECTATOR ====================\nconst SpectatorTapBattle = ({ liveCode }: { liveCode?: string }) => {\n  const { user } = useAuth();\n  const [taps, setTaps] = useState(0);\n  const [timeLeft, setTimeLeft] = useState(10);\n  const [active, setActive] = useState(false);\n  const [bestScore, setBestScore] = useState(0);\n  const [tapParticles, setTapParticles] = useState<{id: number; x: number; y: number; color: string}[]>([]);\n  const [shakeKey, setShakeKey] = useState(0);\n  const tapRef = useRef<HTMLDivElement>(null);\n\n  const spawnTapParticle = (e: React.MouseEvent) => {\n    if (!tapRef.current) return;\n    const rect = tapRef.current.getBoundingClientRect();\n    const x = e.clientX - rect.left;\n    const y = e.clientY - rect.top;\n    const colors = [\"#f97316\", \"#ef4444\", \"#fbbf24\", \"#f59e0b\", \"#ffffff\"];\n    const newParticles = Array.from({ length: 6 }, (_, i) => ({\n      id: Date.now() + i,\n      x: x + (Math.random() - 0.5) * 60,\n      y: y + (Math.random() - 0.5) * 60,\n      color: colors[Math.floor(Math.random() * colors.length)]\n    }));\n    setTapParticles(prev => [...prev, ...newParticles]);\n    setTimeout(() => setTapParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 600);\n  };\n\n  const handleTap = (e: React.MouseEvent) => {\n    if (!active) { startGame(); return; }\n    spawnTapParticle(e);\n    setTaps(p => {\n      const newTaps = p + 1;\n      if (newTaps % 20 === 0) setShakeKey(k => k + 1);\n      return newTaps;\n    });\n  };\n\n  const startGame = () => {\n    setTaps(0);\n    setTimeLeft(10);\n    setActive(true);\n    setTapParticles([]);\n  };"

c = c.replace(old_tap, new_tap)

# 2. Enhance tap counter
old_counter = '''      <div className="text-center py-2">\n        <p className="text-4xl font-black text-primary">{taps}</p>\n        <p className="text-xs text-muted-foreground mt-1">toques</p>\n      </div>'''

new_counter = '''      <div key={shakeKey} className={`text-center py-2 ${shakeKey > 0 ? \"game-screen-shake\" : \""}`}>
        <motion.p\n          key={taps}\n          initial={{ scale: 1.3 }}\n          animate={{ scale: 1 }}\n          transition={{ type: \"spring\", stiffness: 300, damping: 15 }}\n          className="text-5xl font-black text-primary"
        >{taps}</motion.p>\n        <p className="text-xs text-muted-foreground mt-1">toques</p>\n      </div>'''

c = c.replace(old_counter, new_counter)

# 3. Enhance progress bar
old_prog = '''      {active && (\n        <Progress value={(timeLeft / 10) * 100} className="h-2" />\n      )}'''

new_prog = '''      {active && (\n        <div className="relative">\n          <div className={`absolute inset-0 rounded-full ${timeLeft <= 3 ? \"energy-bar-glow\" : \""}`} />\n          <Progress value={(timeLeft / 10) * 100} className={`h-3 ${timeLeft <= 3 ? \"[&>div]:!bg-red-500\" : timeLeft <= 5 ? \"[&>div]:!bg-amber-500\" : \""}`} />\n          {timeLeft <= 3 && <p className="text-center text-[10px] text-red-400 font-bold mt-1 animate-pulse">ULTIMOS SEGUNDOS!</p>}\n        </div>\n      )}'''

c = c.replace(old_prog, new_prog)

# 4. Enhance tap button
old_btn = '''      <button\n        onClick={active ? () => setTaps((p) => p + 1) : startGame}\n        className={cn(\n          "w-full h-32 rounded-2xl text-xl font-black transition-all active:scale-95",\n          active\n            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"\n            : "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-2 border-dashed border-primary/30"\n        )}\n      >\n        {active ? `''' + '\u{1F4AA} TOQUE! (${timeLeft}s)`' + ''' : "''' + '\u{1F3C3} Come' + '\u00E7ar"' + '''}\n      </button>'''

new_btn = '''      <div ref={tapRef} className="relative overflow-hidden rounded-2xl">\n        {tapParticles.map(p => (\n          <div\n            key={p.id}\n            className="tap-particle"\n            style={{\n              left: p.x,\n              top: p.y,\n              width: \"8px\",\n              height: \"8px\",\n              background: p.color,\n              boxShadow: `0 0 6px ${p.color}`,\n              \"--burst-y\": `${-40 - Math.random() * 40}px`,\n              \"--burst-x\": `${(Math.random() - 0.5) * 80}px`,\n            } as React.CSSProperties}\n          />\n        ))}\n        <button\n          onClick={handleTap}\n          className={cn(\n            "w-full h-32 rounded-2xl text-xl font-black transition-all active:scale-90 relative overflow-hidden",\n            active\n              ? taps > 80\n                ? "bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white shadow-[0_0_40px_rgba(249,115,22,0.4)]"\n                : taps > 40\n                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)]"\n                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"\n              : "bg-gradient-to-r from-primary/10 to-accent/10 text-primary border-2 border-dashed border-primary/30"\n          )}\n        >\n          {active ? (\n            <>\n              <motion.span\n                key={timeLeft}\n                initial={{ scale: 0.9 }}\n                animate={{ scale: 1 }}\n                className="block"\n              >''' + '\u{1F4AA} TOQUE!</motion.span>' + '''\n              <span className="text-base font-bold opacity-80">{timeLeft}s</span>\n              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />\n            </>\n          ) : "''' + '\u{1F3C3} Come' + '\u00E7ar"' + '''}\n        </button>\n      </div>'''

c = c.replace(old_btn, new_btn)

# 5. Enhance bingo numbers with pop
old_nums = '''              {game.drawn_numbers.slice(-12).map((n) => (\n                <span key={n} className="h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">\n                  {n}\n                </span>\n              ))}'''

new_nums = '''              {game.drawn_numbers.slice(-12).map((n, i) => (\n                <motion.span\n                  key={n}\n                  initial={{ scale: 0 }}\n                  animate={{ scale: 1 }}\n                  transition={{ type: \"spring\", stiffness: 300, damping: 15 }}\n                  className={cn(\n                    "h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center",\n                    i === game.drawn_numbers.slice(-12).length - 1\n                      ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.4)]"\n                      : "bg-primary/10 text-primary"\n                  )}\n                >\n                  {n}\n                </motion.span>\n              ))}'''

c = c.replace(old_nums, new_nums)

# 6. Enhance bingo cells
old_cells = '''            {card.numbers.map((num, i) => {\n              const isMarked = marked.has(num) || num === 0;\n              const isDrawn = game?.drawn_numbers?.includes(num) || num === 0;\n              return (\n                <button\n                  key={i}\n                  onClick={() => handleMark(num)}\n                  disabled={!isDrawn || num === 0}\n                  className={cn(\n                    "h-10 rounded-lg text-xs font-bold transition-all",\n                    num === 0\n                      ? "bg-emerald-500/20 text-emerald-500"\n                      : isMarked\n                        ? "bg-primary text-primary-foreground scale-95"\n                        : isDrawn\n                          ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/40 cursor-pointer"\n                          : "bg-muted/50 text-muted-foreground"\n                  )}\n                >\n                  {num === 0 ? "''' + '\u2605"' + ''' : num}\n                </button>\n              );\n            })}'''

new_cells = '''            {card.numbers.map((num, i) => {\n              const isMarked = marked.has(num) || num === 0;\n              const isDrawn = game?.drawn_numbers?.includes(num) || num === 0;\n              return (\n                <motion.button\n                  key={i}\n                  onClick={() => handleMark(num)}\n                  disabled={!isDrawn || num === 0}\n                  whileTap={isDrawn && num !== 0 && !isMarked ? { scale: 0.85 } : {}}\n                  className={cn(\n                    "h-10 rounded-lg text-xs font-bold transition-all",\n                    num === 0\n                      ? "bg-emerald-500/20 text-emerald-500"\n                      : isMarked\n                        ? "bg-primary text-primary-foreground shadow-[0_0_8px_rgba(var(--primary),0.3)]"\n                        : isDrawn\n                          ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/40 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)] cursor-pointer"\n                          : "bg-muted/50 text-muted-foreground"\n                  )}\n                >\n                  {num === 0 ? "''' + '\u2605"' + ''' : num}\n                </motion.button>\n              );\n            })}'''

c = c.replace(old_cells, new_cells)

# 7. Enhance BINGO button
old_bbtn = '''          <Button\n            onClick={handleBingo}\n            className="w-full py-3 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl"\n          >\n            GRITAR BINGO!\n          </Button>'''

new_bbtn = '''          <Button\n            onClick={handleBingo}\n            className="w-full py-4 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95"\n          >\n            GRITAR BINGO!\n          </Button>'''

c = c.replace(old_bbtn, new_bbtn)

with open(path, "w") as f:
    f.write(c)

print("LiveParticipar enhanced successfully!")
