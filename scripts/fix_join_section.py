#!/usr/bin/env python3
"""Fix: Replace the entire join+tabs section to remove problematic patterns."""

path = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Find line with 'JOIN SECTION'
start_idx = None
for i, line in enumerate(lines):
    if 'JOIN SECTION' in line:
        start_idx = i
        break

if start_idx is None:
    print('JOIN SECTION not found!')
    exit(1)

# Find the closing </div> for the tabs section (last one before Footer)
end_idx = None
for i in range(len(lines) - 1, start_idx, -1):
    if '<Footer' in lines[i]:
        end_idx = i
        break

print(f'JOIN SECTION at line {start_idx + 1}')
print(f'Footer at line {end_idx + 1}')

# Build the replacement section (from JOIN SECTION to just before Footer)
new_section = '''      {/* JOIN SECTION */
      <div className="container mx-auto px-4 mt-10">
        {!hasJoined ? (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative overflow-hidden rounded-3xl border border-white/[0.06] p-8 md:p-10" style={{ background: `linear-gradient(135deg, ${primary}08, ${accent}04)` }}>
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 90% 10%, ${primary}06, transparent 50%)` }} />
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="inline-flex p-4 rounded-2xl mb-4" style={{ backgroundColor: `${primary}12`, border: `1px solid ${primary}15` }}>
                  <NicheIcon className="h-10 w-10" style={{ color: primary }} />
                </motion.div>
                <h3 className="text-2xl md:text-3xl font-black">Junta-te ao jogo!</h3>
                <p className="text-sm text-white/30 mt-2 max-w-md">Coloca o teu nome para participar nos jogos e acompanhar o teu historico de premios.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input placeholder="O teu nome..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && joinGame()} className="flex-1 md:w-72 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20" />
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button onClick={joinGame} disabled={!playerName.trim()} className="rounded-xl px-7 font-bold h-11" style={{ backgroundColor: primary, color: "#000" }}>
                    Entrar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-2xl" style={{ backgroundColor: primary, color: "#000" }}>{playerName.charAt(0).toUpperCase()}</motion.div>
            <div className="flex-1">
              <p className="font-bold">Ola, {playerName}!</p>
              <p className="text-xs text-white/30">Pronto para jogar com {companyName}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setHasJoined(false); setPlayerName(""); }} className="text-white/40 hover:text-white">Trocar</Button>
          </motion.div>
        )}
      </div>

      {/* ABOUT SECTION */
      {aboutText && (
        <div className="container mx-auto px-4 mt-10">
          <ShimmerCard style={{ padding: "2rem" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl" style={{ backgroundColor: `${primary}12` }}><Globe className="h-5 w-5" style={{ color: primary }} /></div>
              <h3 className="font-bold text-lg">Sobre {companyName}</h3>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">{aboutText}</p>
          </ShimmerCard>
        </div>
      )}

      {/* CONTENT TABS */}
      <div className="container mx-auto px-4 mt-12 pb-20">
        {/* Tab Headers */}
        <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8">
          {[
            { key: "games", icon: Gamepad2, label: "Jogos", count: totalGames, color: primary },
            { key: "lives", icon: Radio, label: "Lives", count: totalLives, color: secondary },
            { key: "style", icon: Palette, label: "Estilo", count: null, color: accent },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ color: activeTab === tab.key ? tab.color : "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.97 }}
            >
              {activeTab === tab.key && (
                <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.08]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon className="h-4 w-4" />{tab.label}
                {tab.count !== null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06]">{tab.count}</span>}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "games" && (
            <motion.div key="games" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {games.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.map((game, i) => (
                    <ShimmerCard key={game.id} delay={i * 0.05} className="group cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-transform duration-300">
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${accent})` }} />
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${primary}20, ${accent}10)` }} whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
                            {game.type === "wheel" ? <span className="text-2xl">🎰</span> : <span className="text-2xl">💰</span>}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate group-hover:text-white transition-colors">{game.name}</p>
                            <p className="text-[11px] text-white/25 mt-0.5">{game.type === "wheel" ? "Roda de Premios" : "Quem Quer Ser Milionario"}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold ${game.is_published || game.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/25"}`}>
                            {game.is_published || game.is_active ? "Ativo" : "Rascunho"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] text-white/15">
                          <span>{game.segment_count ? `${game.segment_count} segmentos` : "Configurado"}</span>
                          <span>{new Date(game.created_at).toLocaleDateString("pt-PT")}</span>
                        </div>
                      </div>
                    </ShimmerCard>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                    <Gamepad2 className="h-12 w-12 text-white/[0.06]" />
                  </div>
                  <p className="text-sm text-white/20">Nenhum jogo configurado ainda</p>
                  <p className="text-xs text-white/10 mt-1">Esta empresa ainda nao adicionou jogos</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "lives" && (
            <motion.div key="lives" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <ShimmerCard key={`${s.code}-${i}`} delay={i * 0.04} className="group cursor-pointer">
                      <div className="p-4 flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: `${primary}08`, border: `1px solid ${primary}10` }}>
                          <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${primary}10, transparent 70%)` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                          <Radio className="h-5 w-5 relative" style={{ color: primary }} />
                          <span className="text-[7px] font-black mt-0.5 tracking-wider" style={{ color: primary }}>LIVE</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate group-hover:text-white transition-colors">{s.title || `Live ${s.code}`}</p>
                          <p className="text-[11px] text-white/25 mt-0.5">{new Date(s.started_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          {s.duration_sec > 0 && <p className="text-[10px] text-white/15 mt-0.5">{Math.round(s.duration_sec / 60)} min</p>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                      </div>
                    </ShimmerCard>
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-5 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                    <Radio className="h-12 w-12 text-white/[0.06]" />
                  </div>
                  <p className="text-sm text-white/20">Nenhuma live realizada ainda</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "style" && (
            <motion.div key="style" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Colors */
                <ShimmerCard delay={0} style={{ padding: "1.5rem" }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${primary}12` }}><Palette className="h-4 w-4" style={{ color: primary }} /></div>
                    <h3 className="font-bold">Identidade Visual</h3>
                  </div>
                  {branding ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-5 gap-2.5">
                        {["Principal", "Secundaria", "Acento", "Fundo", "Texto"].map((label, idx) => {
                            const color = [primary, secondary, accent, branding.background_color, branding.text_color][idx];
                            return (
                              <div key={label} className="text-center group/color">
                                <motion.div className="h-16 rounded-xl border border-white/[0.06] mb-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg" style={{ backgroundColor: color, boxShadow: `0 4px 20px ${color}20` }} whileHover={{ y: -2 }} />
                                <p className="text-[9px] text-white/25 font-medium">{label}</p>
                              </div>
                            );
                          })}
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${accent})`, boxShadow: `0 0 20px ${primary}20` }} />
                    </div>
                  ) : <p className="text-xs text-white/15">Sem identidade visual</p>}
                </ShimmerCard>

                {/* Config */
                <div className="space-y-4">
                  <ShimmerCard delay={0.05} style={{ padding: "1.5rem" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accent}12` }}><NicheIcon className="h-4 w-4" style={{ color: accent }} /></div>
                      <h3 className="font-bold">Configuracao</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Nicho</p>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${primary}12`, color: primary }}>{niche.label}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-1">Layout</p>
                        <span className="text-xs font-bold capitalize">{(branding?.homepage_layout) || "showcase"}</span>
                      </div>
                    </div>
                  </ShimmerCard>

                  <ShimmerCard delay={0.1} style={{ padding: "1.5rem" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 rounded-lg bg-white/[0.04]"><Globe className="h-4 w-4 text-white/30" /></div>
                      <h3 className="font-bold">Informacoes</h3>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-white/30"><Globe className="h-3.5 w-3.5" />{company.display_name || company.company_name}</div>
                      {(company.city || company.province) && <div className="flex items-center gap-2 text-white/30"><MapPin className="h-3.5 w-3.5" />{[company.city, company.province].filter(Boolean).join(", ")}</div>}
                      {company.created_at && <div className="flex items-center gap-2 text-white/30"><Calendar className="h-3.5 w-3.5" />{new Date(company.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</div>}
                    </div>
                  </ShimmerCard>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
'''

lines = lines[:start_idx] + [new_section] + lines[end_idx:]

with open(path, 'w') as f:
    f.writelines(lines)

print(f'Written {len(lines)} lines (was {len(lines) - len([new_section]) + len(lines)})')
