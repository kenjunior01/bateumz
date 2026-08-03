#!/usr/bin/env python3
"""Design upgrades for bateu.online - fixes and creative enhancements"""

import re

# ============================================================
# 1. Fix StatsBar - dark theme glass + enhanced design
# ============================================================
with open('/home/z/my-project/bateumz-cb2c44d1/src/components/StatsBar.tsx', 'r') as f:
    content = f.read()

# Fix the light-mode glass that looks broken on dark theme
old_stats_section = '''  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(40px) saturate(1.5)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5)",
          backgroundColor: "rgba(255, 255, 255, 0.6)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(236, 72, 153, 0.06) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />'''

new_stats_section = '''  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/3 to-violet-500/5" aria-hidden="true" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, var(--region-primary, hsl(var(--primary))) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--region-secondary, hsl(var(--accent))) 1px, transparent 1px)",
        backgroundSize: "60px 60px, 40px 40px",
      }} aria-hidden="true" />
      <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full blur-[140px] pointer-events-none" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 8%, transparent)" }} aria-hidden="true" />
      <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full blur-[140px] pointer-events-none" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 6%, transparent)" }} aria-hidden="true" />'''

content = content.replace(old_stats_section, new_stats_section)

# Fix the stat card styling - dark glass instead of light glass
old_card_style = '''      <div
        className="relative overflow-hidden rounded-2xl border border-white/30 p-5 shadow-lg transition-shadow duration-300 group-hover:shadow-xl md:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.35) 100%)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(236, 72, 153, 0.06) 50%, rgba(245, 158, 11, 0.04) 100%)",
          }}
        />'''

new_card_style = '''      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:border-primary/20 md:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 8%, transparent) 0%, color-mix(in srgb, var(--region-accent, hsl(var(--accent))) 6%, transparent) 100%)",
          }}
        />'''

content = content.replace(old_card_style, new_card_style)

# Fix the gradient hover border
old_hover_border = '''      <div
        className="absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(245, 158, 11, 0.2))",
          zIndex: -1,
          filter: "blur(1px)",
        }}
      />'''

new_hover_border = '''      <div
        className="absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 25%, transparent), color-mix(in srgb, var(--region-accent, hsl(var(--accent))) 20%, transparent), color-mix(in srgb, var(--region-secondary, hsl(var(--secondary))) 15%, transparent))",
          zIndex: -1,
          filter: "blur(1px)",
        }}
      />'''

content = content.replace(old_hover_border, new_hover_border)

with open('/home/z/my-project/bateumz-cb2c44d1/src/components/StatsBar.tsx', 'w') as f:
    f.write(content)

print("StatsBar fixed - dark theme compatible")

# ============================================================
# 2. Fix LiveFeed English text + enhance design
# ============================================================
with open('/home/z/my-project/bateumz-cb2c44d1/src/components/LiveFeed.tsx', 'r') as f:
    content = f.read()

# Fix the English empty state text
old_empty = '''  if (isEmpty) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Atividade ao Vivo</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Ticket className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">The first raffles are about to start!</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Activity will appear here in real time.</p>
        </div>
      </div>
    );
  }'''

new_empty = '''  if (isEmpty) {
    return (
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Atividade ao Vivo</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
              <Ticket className="h-6 w-6 text-primary/60" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping-slow opacity-20" style={{ background: "linear-gradient(135deg, var(--region-primary, hsl(var(--primary))), var(--region-accent, hsl(var(--accent))))" }} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Os primeiros sorteios estao a caminho!</p>
          <p className="text-xs text-muted-foreground/60 mt-1">A atividade aparecera aqui em tempo real</p>
        </div>
      </div>
    );
  }'''

content = content.replace(old_empty, new_empty)

with open('/home/z/my-project/bateumz-cb2c44d1/src/components/LiveFeed.tsx', 'w') as f:
    f.write(content)

print("LiveFeed fixed - Portuguese text + enhanced design")

# ============================================================
# 3. Enhance ActiveRaffles empty state
# ============================================================
with open('/home/z/my-project/bateumz-cb2c44d1/src/components/ActiveRaffles.tsx', 'r') as f:
    content = f.read()

old_raffle_empty = '''      {!hasResults ? (
        <div className="text-center py-16">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />\n          <p className="text-muted-foreground">
            {categoryFilter && categoryFilter !== "todos"
              ? "Nenhum sorteio nesta categoria"
              : "Nenhum sorteio ativo de momento"}
          </p>
        </div>
      ) : ('''

new_raffle_empty = '''      {!hasResults ? (
        <div className="text-center py-16">
          <div className="relative inline-block mb-4">
            <motion.div
              className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center mx-auto"
              animate={{ rotate: [0, 5, -5, 0], y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Ticket className="h-10 w-10 text-primary/30" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{ border: "1.5px solid", borderColor: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 15%, transparent)" }}
            />
          </div>
          <p className="text-muted-foreground font-medium">
            {categoryFilter && categoryFilter !== "todos"
              ? "Nenhum sorteio nesta categoria"
              : "Nenhum sorteio ativo de momento"}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">Novos sorteios sao adicionados regularmente</p>
        </div>
      ) : ('''

content = content.replace(old_raffle_empty, new_raffle_empty)

# Also enhance loading state
old_loading = '''  if (loading) {
    return (
      <section className="py-8">
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </section>
    );
  }'''

new_loading = '''  if (loading) {
    return (
      <section className="py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <motion.div
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mb-3"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <Ticket className="h-6 w-6 text-primary" />
          </motion.div>
          <motion.div
            className="flex gap-1 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ y: [0, -8, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        </div>
      </section>
    );
  }'''

content = content.replace(old_loading, new_loading)

with open('/home/z/my-project/bateumz-cb2c44d1/src/components/ActiveRaffles.tsx', 'w') as f:
    f.write(content)

print("ActiveRaffles enhanced - creative loading + empty state")

print("\nAll component fixes applied!")
