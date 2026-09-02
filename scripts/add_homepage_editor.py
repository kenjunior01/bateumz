#!/usr/bin/env python3
"""
Add homepage/niche configuration to GameBrandingConfig.tsx
"""

BASE = '/home/z/my-project/bateumz-cb2c44d1/src/pages/dashboard/GameBrandingConfig.tsx'

with open(BASE, 'r') as f:
    content = f.read()

# 1. Add niche-related imports after existing lucide imports
old_imports = '  Check,\n} from "lucide-react";'
new_imports = '''  Check,\n  Globe, MapPin, Link as LinkIcon,\n} from "lucide-react";'''
content = content.replace(old_imports, new_imports)

# 2. Add NICHE_OPTIONS constant after OVERLAY_STYLES
old_overlay_styles_end = '];\n\n// Mock leaderboard'
new_niche_section = '''];\n\n// Niche options for homepage personalization\nconst NICHE_OPTIONS = [\n  { id: "entertainment", label: "Entretenimento", emoji: "\U0001f389" },\n  { id: "gaming", label: "Gaming", emoji: "\U0001f3ae" },\n  { id: "restaurant", label: "Restaura\u00e7\u00e3o", emoji: "\U0001f37d" },\n  { id: "retail", label: "Retalho", emoji: "\U0001f6cd" },\n  { id: "education", label: "Educa\u00e7\u00e3o", emoji: "\U0001f393" },\n  { id: "fitness", label: "Fitness", emoji: "\U0001f4aa" },\n  { id: "music", label: "M\u00fasica", emoji: "\U0001f3b5" },\n  { id: "fashion", label: "Moda", emoji: "\U0001f3a8" },\n  { id: "tech", label: "Tecnologia", emoji: "\u26a1" },\n  { id: "food", label: "Food & Bebidas", emoji: "\U0001f35c" },\n  { id: "beauty", label: "Beleza", emoji: "\u2728" },\n  { id: "sports", label: "Desporto", emoji: "\U0001f3c3" },\n  { id: "casino", label: "Casino", emoji: "\U0001f451" },\n  { id: "charity", label: "Solidariedade", emoji: "\u2764\uFE0F" },\n  { id: "other", label: "Outro", emoji: "\u2728" },\n];\n\n// Layout options for public profile homepage\nconst LAYOUT_OPTIONS = [\n  { id: "showcase", label: "Showcase", desc: "Hero imersivo + conte\u00fado em tabs" },\n  { id: "minimal", label: "Minimal", desc: "Limpo e focado no conte\u00fado" },\n  { id: "bold", label: "Bold", desc: "Texto grande e impactante" },\n  { id: "story", label: "Story", desc: "Apresenta a tua hist\u00f3ria" },\n];\n\n// Mock leaderboard'''

if old_overlay_styles_end in content:
    content = content.replace(old_overlay_styles_end, new_niche_section, 1)
    print('[OK] Added NICHE_OPTIONS and LAYOUT_OPTIONS constants')
else:
    print('[WARN] Could not find insertion point for niche constants')

# 3. Add new fields to DEFAULT_BRANDING
old_default = '''  overlay_style: "modern" as OverlayStyle,\n  enabled: true,\n};'''
new_default = '''  overlay_style: "modern" as OverlayStyle,\n  enabled: true,
  niche: "entertainment",
  hero_title: "",
  hero_subtitle: "",
  hero_cta_text: "",
  hero_cta_link: "/lives",
  about_text: "",
  social_links: {},
  homepage_layout: "showcase",
  featured_badge: "",
  show_leaderboard: true,
  show_games: true,
  show_lives: true,
  show_stats: true,\n};'''
if old_default in content:
    content = content.replace(old_default, new_default, 1)
    print('[OK] Added homepage fields to DEFAULT_BRANDING')
else:
    print('[WARN] Could not find DEFAULT_BRANDING insertion point')

# 4. Add new fields to the load effect
old_load = '''          overlay_style: row.overlay_style || "modern",\n          enabled: row.enabled ?? true,\n        });'''
new_load = '''          overlay_style: row.overlay_style || "modern",\n          enabled: row.enabled ?? true,\n          niche: row.niche || "entertainment",\n          hero_title: row.hero_title || "",\n          hero_subtitle: row.hero_subtitle || "",\n          hero_cta_text: row.hero_cta_text || "",\n          hero_cta_link: row.hero_cta_link || "/lives",\n          about_text: row.about_text || "",\n          social_links: row.social_links || {},\n          homepage_layout: row.homepage_layout || "showcase",\n          featured_badge: row.featured_badge || "",\n          show_leaderboard: row.show_leaderboard ?? true,\n          show_games: row.show_games ?? true,\n          show_lives: row.show_lives ?? true,\n          show_stats: row.show_stats ?? true,\n        });'''
if old_load in content:
    content = content.replace(old_load, new_load, 1)
    print('[OK] Added homepage fields to load effect')
else:
    print('[WARN] Could not find load effect insertion point')

# 5. Add new fields to save payload
old_payload = '''      overlay_style: branding.overlay_style,\n      enabled: branding.enabled,\n    } as any;'''
new_payload = '''      overlay_style: branding.overlay_style,\n      enabled: branding.enabled,\n      niche: branding.niche,\n      hero_title: branding.hero_title,\n      hero_subtitle: branding.hero_subtitle,\n      hero_cta_text: branding.hero_cta_text,\n      hero_cta_link: branding.hero_cta_link,\n      about_text: branding.about_text,\n      social_links: branding.social_links,\n      homepage_layout: branding.homepage_layout,\n      featured_badge: branding.featured_badge,\n      show_leaderboard: branding.show_leaderboard,\n      show_games: branding.show_games,\n      show_lives: branding.show_lives,\n      show_stats: branding.show_stats,\n    } as any;'''
if old_payload in content:
    content = content.replace(old_payload, new_payload, 1)
    print('[OK] Added homepage fields to save payload')
else:
    print('[WARN] Could not find save payload insertion point')

# 6. Add homepage editor section before the closing of the component
# Find the overlay style selector and add the new section after it
old_overlay_section_end = '          </div>\n        </div>\n      </div>\n    </div>\n  );\n}'
new_homepage_section = '''          </div>\n        </div>\n      </div>\n\n      {/* ─── Homepage / Niche Configuration ─── */}\n      <Card className="border-border/50">\n        <CardHeader>\n          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Perfil P\u00fablico & Homepage</CardTitle>\n        </CardHeader>\n        <CardContent className="space-y-6">\n          {/* Niche Selection */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Nicho do Neg\u00f3cio</Label>\n            <p className="text-[11px] text-muted-foreground mb-3">Escolhe o nicho que melhor representa a tua empresa. Isto adapta o visual do teu perfil p\u00fablico automaticamente.</p>\n            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">\n              {NICHE_OPTIONS.map((n) => (\n                <button\n                  key={n.id}\n                  type="button"\n                  onClick={() => updateField("niche", n.id)}\n                  className={`p-2.5 rounded-xl border-2 text-center transition-all duration-200 ${branding.niche === n.id ? "border-primary bg-primary/10 shadow-md" : "border-border/50 hover:border-border"}`}\n                >\n                  <span className="text-xl block mb-1">{n.emoji}</span>\n                  <span className="text-[9px] font-bold block leading-tight">{n.label}</span>\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {/* Hero Customization */}\n          <div className="grid sm:grid-cols-2 gap-4">\n            <div>\n              <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">T\u00edtulo do Hero</Label>\n              <Input placeholder="Ex: Vem divertir-te connosco" value={branding.hero_title} onChange={(e) => updateField("hero_title", e.target.value)} />\n            </div>\n            <div>\n              <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">Subt\u00edtulo do Hero</Label>\n              <Input placeholder="Ex: A melhor experi\u00eancia de jogos ao vivo" value={branding.hero_subtitle} onChange={(e) => updateField("hero_subtitle", e.target.value)} />\n            </div>\n            <div>\n              <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">Texto do Bot\u00e3o CTA</Label>\n              <Input placeholder="Ex: Come\u00e7ar a Jogar" value={branding.hero_cta_text} onChange={(e) => updateField("hero_cta_text", e.target.value)} />\n            </div>\n            <div>\n              <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">Link do CTA</Label>\n              <Input placeholder="/lives" value={branding.hero_cta_link} onChange={(e) => updateField("hero_cta_link", e.target.value)} />\n            </div>\n          </div>\n\n          {/* Featured Badge */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">Badge Destacado</Label>\n            <Input placeholder="Ex: Casino Premium, Zona de Jogos" value={branding.featured_badge} onChange={(e) => updateField("featured_badge", e.target.value)} />\n          </div>\n\n          {/* About Text */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-1.5 block">Sobre a Empresa</Label>\n            <textarea\n              className="w-full min-h-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"\n              placeholder="Conta um pouco sobre a tua empresa, miss\u00e3o e o que ofereces..."\n              value={branding.about_text}\n              onChange={(e) => updateField("about_text", e.target.value)}\n            />\n          </div>\n\n          {/* Social Links */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Redes Sociais</Label>\n            <div className="grid sm:grid-cols-2 gap-3">\n              {[\n                ["instagram", "Instagram"],\n                ["tiktok", "TikTok"],\n                ["facebook", "Facebook"],\n                ["youtube", "YouTube"],\n                ["twitter", "X / Twitter"],\n                ["website", "Website"],\n              ].map(([key, label]) => (\n                <div key={key} className="flex items-center gap-2">\n                  <span className="text-[10px] font-bold text-muted-foreground w-16 shrink-0">{label}</span>\n                  <Input\n                    placeholder={`https://${key}.com/...`}\n                    value={(branding.social_links as any)?.[key] || ""}\n                    onChange={(e) => {\n                      const updated = { ...(branding.social_links as Record<string, string> || {}), [key]: e.target.value };\n                      updateField("social_links", updated as any);\n                    }}\n                    className="h-9 text-xs"\n                  />\n                </div>\n              ))}\n            </div>\n          </div>\n\n          {/* Layout Selection */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Layout do Perfil</Label>\n            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">\n              {LAYOUT_OPTIONS.map((l) => (\n                <button\n                  key={l.id}\n                  type="button"\n                  onClick={() => updateField("homepage_layout", l.id)}\n                  className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${branding.homepage_layout === l.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"}`}\n                >\n                  <span className="text-xs font-bold block">{l.label}</span>\n                  <span className="text-[9px] text-muted-foreground block mt-0.5">{l.desc}</span>\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {/* Toggle Sections */}\n          <div>\n            <Label className="text-xs font-bold uppercase tracking-wider mb-2 block">Sec\u00e7\u00f5es Vis\u00edveis</Label>\n            <div className="grid grid-cols-2 gap-2">\n              {([\n                ["show_games", "Jogos"],\n                ["show_lives", "Lives"],\n                ["show_stats", "Estat\u00edsticas"],\n                ["show_leaderboard", "Leaderboard"],\n              ] as [string, string][]).map(([key, label]) => (\n                <button\n                  key={key}\n                  type="button"\n                  onClick={() => updateField(key, !(branding as any)[key])}\n                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${(branding as any)[key] ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground"}`}\n                >\n                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all ${(branding as any)[key] ? "border-primary bg-primary" : "border-muted-foreground"}`}>\n                    {(branding as any)[key] && <Check className="h-2.5 w-2.5 text-black" />}\n                  </div>\n                  {label}\n                </button>\n              ))}\n            </div>\n          </div>\n\n          {/* Preview Link */}\n          <div className="pt-2 border-t border-border/50">\n            <a\n              href={window.location.origin + "/empresa/" + (user?.id || "")}\n              target="_blank"\n              rel="noreferrer"\n              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"\n            >\n              <Eye className="h-3.5 w-3.5" /> Ver Perfil P\u00fablico\n            </a>\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  );\n}'''
if old_overlay_section_end in content:
    content = content.replace(old_overlay_section_end, new_homepage_section, 1)
    print('[OK] Added Homepage/Niche editor section')
else:
    print('[WARN] Could not find end of component to insert homepage section')

with open(BASE, 'w') as f:
    f.write(content)

print('=== Done ===')
