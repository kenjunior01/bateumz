#!/usr/bin/env python3
"""Enhance homepage hero and Ao Vivo section with creative effects"""

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/Index.tsx', 'r') as f:
    content = f.read()

# 1. Add floating stickers to the hero section - after the grid overlay
old_grid = '''        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative container mx-auto px-4 pt-8 pb-16 lg:pt-12 lg:pb-24"
        >'''

new_grid = '''        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        <div className="absolute top-20 right-[10%] text-4xl opacity-[0.07] animate-float-sticker pointer-events-none select-none hidden lg:block" style={{ "--sticker-float": "-14px", "--sticker-rot-start": "-6deg", "--sticker-rot-end": "4deg" } as React.CSSProperties}>
          🎰
        </div>
        <div className="absolute top-40 left-[8%] text-3xl opacity-[0.06] animate-float-sticker pointer-events-none select-none hidden lg:block" style={{ "--sticker-float": "-10px", "--sticker-rot-start": "4deg", "--sticker-rot-end": "-6deg", animationDelay: "1.2s" } as React.CSSProperties}>
          🎯
        </div>
        <div className="absolute bottom-32 right-[15%] text-5xl opacity-[0.05] animate-float-sticker pointer-events-none select-none hidden lg:block" style={{ "--sticker-float": "-16px", "--sticker-rot-start": "-3deg", "--sticker-rot-end": "5deg", animationDelay: "2.5s" } as React.CSSProperties}>
          🏆
        </div>
        <div className="absolute top-60 right-[30%] text-2xl opacity-[0.06] animate-float-sticker pointer-events-none select-none hidden xl:block" style={{ "--sticker-float": "-8px", "--sticker-rot-start": "5deg", "--sticker-rot-end": "-3deg", animationDelay: "0.8s" } as React.CSSProperties}>
          ⚡
        </div>
        <div className="absolute bottom-48 left-[20%] text-3xl opacity-[0.05] animate-float-sticker pointer-events-none select-none hidden xl:block" style={{ "--sticker-float": "-12px", "--sticker-rot-start": "-4deg", "--sticker-rot-end": "6deg", animationDelay: "3s" } as React.CSSProperties}>
          🎮
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative container mx-auto px-4 pt-8 pb-16 lg:pt-12 lg:pb-24"
        >'''

content = content.replace(old_grid, new_grid)

# 2. Enhance the Ao Vivo banner with stickers and better effects
old_live = '''            <AnimatedSection className="py-8">
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="premium-card rounded-2xl p-6 sm:p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-full pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-red-600 flex items-center justify-center"
                        animate={{ boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 40px rgba(239,68,68,0.5)", "0 0 20px rgba(239,68,68,0.3)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Radio className="h-7 w-7 text-white" />
                      </motion.div>
                      <motion.span
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-background"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Ao Vivo Agora
                        <motion.span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold"
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <Flame className="h-3 w-3" /> LIVE
                        </motion.span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Junte-se a milhares de jogadores em tempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-5 text-center mr-2">
                      <div>
                        <p className="text-xl font-bold text-gradient-primary">50+</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jogos</p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <div>
                        <p className="text-xl font-bold text-gradient-primary">AO VIVO</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">24/7</p>
                      </div>
                    </div>
                    <Link to="/lives-agora">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_BOUNCE}>
                        <span className="btn-premium inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white">
                          <Radio className="h-4 w-4" />
                          Entrar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </motion.div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>'''

new_live = '''            <AnimatedSection className="py-8">
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="premium-card rounded-2xl p-6 sm:p-8 relative overflow-hidden gradient-border-animated"
              >
                <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-full pointer-events-none" />

                <div className="absolute -top-4 -right-4 text-4xl opacity-[0.08] animate-float-sticker pointer-events-none select-none" style={{ "--sticker-float": "-10px", "--sticker-rot-start": "-5deg", "--sticker-rot-end": "5deg" } as React.CSSProperties}>
                  🎮
                </div>
                <div className="absolute -bottom-3 -left-3 text-3xl opacity-[0.06] animate-float-sticker pointer-events-none select-none" style={{ "--sticker-float": "-8px", "--sticker-rot-start": "3deg", "--sticker-rot-end": "-3deg", animationDelay: "1s" } as React.CSSProperties}>
                  🏆
                </div>

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-red-600 flex items-center justify-center animate-glow-pulse"
                      >
                        <Radio className="h-7 w-7 text-white" />
                      </motion.div>
                      <motion.span
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-background"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Ao Vivo Agora
                        <motion.span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold tag-glow"
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <Flame className="h-3 w-3" /> LIVE
                        </motion.span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Junte-se a milhares de jogadores em tempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-5 text-center mr-2">
                      <div className="animate-breathe">
                        <p className="text-xl font-bold text-shimmer-animated">50+</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jogos</p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <div className="animate-breathe" style={{ animationDelay: "1s" } as React.CSSProperties}>
                        <p className="text-xl font-bold text-shimmer-animated" style={{ animationDelay: "2s" } as React.CSSProperties}>AO VIVO</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">24/7</p>
                      </div>
                    </div>
                    <Link to="/lives-agora">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_BOUNCE}>
                        <span className="btn-premium btn-magic inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white">
                          <Radio className="h-4 w-4" />
                          Entrar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </motion.div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>'''

if old_live in content:
    content = content.replace(old_live, new_live)
    print("Ao Vivo banner enhanced with stickers + effects")
else:
    print("ERROR: Ao Vivo banner not found exactly")
    # Try to find what's there
    idx = content.find('LIVE NOW BANNER')
    if idx >= 0:
        print(f'Found at {idx}')