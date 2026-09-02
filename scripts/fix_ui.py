import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'r') as f:
    c = f.read()

# 1. Replace hero background gradient
c = c.replace(
    'from-primary/15 via-background to-accent/10',
    'from-[#009140]/20 via-background to-[#FFD700]/10'
)
c = c.replace('count={25}', 'count={20}')

# 2. Replace lock banner
old_lock = '\U0001f512 Pontua\u00e7\u00f5es e vencedores s\u00f3 s\u00e3o contabilizados depois de <strong>iniciar a live</strong>. Configure os jogos no painel da empresa.'
new_lock = 'Joga livremente! <strong className="text-foreground">Inicia uma Live</strong> para gravar pontua\u00e7\u00f5es e vencedores.'
c = c.replace(old_lock, new_lock)
c = c.replace('border-dashed border-amber-500/40 bg-amber-500/5', 'bg-gradient-to-r from-[#009140]/5 to-[#FFD700]/5 border-[#009140]/20')
c = c.replace('text-amber-700 dark:text-amber-300', 'text-muted-foreground flex items-center gap-2')

# 3. Replace LIVE ENGAGEMENT badge
c = c.replace('bg-red-500/10 text-red-500 text-xs font-bold mb-3', 'bg-gradient-to-r from-[#009140]/20 to-[#FFD700]/20 border border-[#009140]/30 text-[11px] font-bold text-[#009140] mb-2')
c = c.replace('LIVE ENGAGEMENT', 'JOGOS AO VIVO')

# 4. Replace hero title gradient
c = c.replace('<span className="text-primary">Live</span>', '<span className="bg-gradient-to-r from-[#009140] to-[#FFD700] bg-clip-text text-transparent">Live</span>')
c = c.replace('text-3xl md:text-5xl font-bold mb-2', 'text-2xl md:text-4xl font-bold')

# 5. Replace hero description
c = c.replace('text-sm md:text-base mb-4', 'text-xs md:text-sm mt-1 max-w-lg')
c = c.replace('Plataforma dedicada para empresas animarem lives com roda de pr\u00e9mios, batalhas, quizzes e caixas misteriosas \u2014 tudo configur\u00e1vel.', 'Animes a tua audi\u00eancia com jogos interativos, quizzes e desafios em tempo real.')

# 6. Replace start live button gradient
c = c.replace('from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-shadow', 'from-[#009140] to-[#009140]/80 text-white text-sm font-bold shadow-lg shadow-[#009140]/30 hover:shadow-xl transition-all')

# 7. Remove "Sem c\u00f3digo ativo" div
lines = c.split('\n')
new_lines = []
i = 0
skip_until_close = False
while i < len(lines):
    line = lines[i]
    if 'Sem c' in line and 'ativo' in line:
        skip_until_close = True
        i += 1
        continue
    if skip_until_close and '</div>' in line and '<div' not in line:
        skip_until_close = False
        i += 1
        continue
    if skip_until_close:
        i += 1
        continue
    new_lines.append(line)
    i += 1
c = '\n'.join(new_lines)

# 8. Add Mozambican carousel and category filters before the desktop game grid
c = c.replace(
    '{/* Desktop game cards */}',
    '''<div className="hidden md:block mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-5 w-5 text-[#FF6B35]" />
              <h2 className="font-display text-lg font-bold">Jogos Mo\u00e7ambicanos</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] text-[10px] font-bold">NOVOS</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {mozGames.map((g) => (
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
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {CAT_LIST.map((cid) => (
              <button
                key={cid}
                onClick={() => setCat(cid)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${cat === cid ? "bg-gradient-to-r from-[#009140] to-[#FFD700] text-white shadow-lg shadow-[#009140]/20" : "bg-card border border-border text-muted-foreground hover:border-[#009140]/40 hover:text-foreground"}`}
              >
                {CAT_LABELS[cid]}
              </button>
            ))}
          </div>

          {/* Desktop game cards */}'''
)

# 9. Replace GAMES.map with filteredGames.map and use handleSelectGame
c = c.replace(
    'GAMES.map((g) => {\n            const isActive = active === g.id;\n            return (\n              <button\n                key={g.id}\n                onClick={() => setActive(g.id)}',
    'filteredGames.map((g) => {\n            const isActive = active === g.id;\n            return (\n              <button\n                key={g.id}\n                onClick={() => handleSelectGame(g.id)}'
)

# 10. Update game card styling
c = c.replace(
    'isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"',
    'isActive ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : g.moz ? "border-[#009140]/30 bg-gradient-to-br from-[#009140]/5 to-[#FFD700]/5 hover:border-[#009140]/60 hover:shadow-lg hover:shadow-[#009140]/10" : "border-border bg-card hover:border-primary/40 hover:shadow-md"'
)

# 11. Update grid to 3 columns
c = c.replace('grid-cols-2 lg:grid-cols-4 gap-3', 'grid-cols-2 xl:grid-cols-3 gap-3')

# 12. Add MZ badge and hover to game cards
c = c.replace(
    'rounded-xl bg-gradient-to-br ${g.grad} mb-2',
    'rounded-xl bg-gradient-to-br ${g.grad} mb-2 group-hover:scale-110 transition-transform'
)
c = c.replace(
    '<p className="font-display text-sm font-bold mb-1">{g.label}</p>',
    '<div className="flex items-start justify-between gap-2"><p className="font-display text-sm font-bold leading-tight">{g.label}</p>{g.moz && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#009140]/15 text-[#009140] font-bold flex-shrink-0">MZ</span>}</div>'
)

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
    f.write(c)

print('UI changes applied')
print(f'  Mozambican green: {"#009140" in c}')
print(f'  Mozambican carousel: {"Jogos Mo" in c}')
print(f'  Category filters: {"CAT_LIST.map" in c}')
print(f'  filteredGames: {"filteredGames.map" in c}')
print(f'  Lock removed: {"Sem c" not in c}')
print(f'  MZ badge: {"MZ</span>" in c}')
