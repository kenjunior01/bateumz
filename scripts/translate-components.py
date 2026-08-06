#!/usr/bin/env python3
"""Translates hardcoded PT strings in Profile.tsx, LiveHub.tsx, Login.tsx, RegionalManagerPanel.tsx"""

import re

BASE = "/home/z/my-project/bateumz-cb2c44d1/src"

# ============= Profile.tsx =============
with open(f"{BASE}/pages/Profile.tsx", "r") as f:
    content = f.read()

# Add import after useAuth import
content = content.replace(
    'import { useAuth } from "@/contexts/AuthContext";',
    'import { useAuth } from "@/contexts/AuthContext";\nimport { useLanguage } from "@/contexts/LanguageContext";'
)

# Replace statusConfig
old_status = '''const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  confirmed: { label: "Confirmado", icon: CheckCircle2, color: "text-primary" },
  pending: { label: "Pendente", icon: AlertCircle, color: "text-yellow-500" },
  rejected: { label: "Rejeitado", icon: XCircle, color: "text-destructive" },
  active: { label: "Ativo", icon: CheckCircle2, color: "text-primary" },
};'''

new_status = '''const statusConfig = {
  confirmed: { icon: CheckCircle2, color: "text-primary" },
  pending: { icon: AlertCircle, color: "text-yellow-500" },
  rejected: { icon: XCircle, color: "text-destructive" },
  active: { icon: CheckCircle2, color: "text-primary" },
};'''

content = content.replace(old_status, new_status)

# Add t() hook after useAuth
content = content.replace(
    'const { user, profile } = useAuth();',
    'const { user, profile } = useAuth();\n  const { t } = useLanguage();'
)

# Replace toast.error and toast.success
content = content.replace('toast.error("Erro ao guardar perfil")', 'toast.error(t("profile.saveError"))')
content = content.replace('toast.success("Perfil actualizado!")', 'toast.success(t("profile.saved"))')

# Replace label texts
content = content.replace('<Label className="text-xs text-muted-foreground">Nome</Label>', '<Label className="text-xs text-muted-foreground">{t("profile.name")}</Label>')
content = content.replace('<Label className="text-xs text-muted-foreground">Telefone</Label>', '<Label className="text-xs text-muted-foreground">{t("profile.phone")}</Label>')
content = content.replace('{saving ? "A guardar..." : "Guardar"}', '{saving ? t("profile.saving") : t("profile.save")}')
content = content.replace('>Cancelar</Button>', '>{t("profile.cancel")}</Button>')
content = content.replace('{profile?.display_name || "Utilizador"}', '{profile?.display_name || t("profile.user")}')
content = content.replace('Membro desde', 't("profile.memberSince")')
content = content.replace('<Edit2 className="h-3.5 w-3.5" /> Editar', '<Edit2 className="h-3.5 w-3.5" /> {t("profile.edit")}')

# Replace stat labels
content = content.replace('{ label: "Bilhetes",', '{ label: t("profile.tickets"),')
content = content.replace('{ label: "Confirmados",', '{ label: t("profile.confirmedTickets"),')
content = content.replace('{ label: "Pendentes",', '{ label: t("profile.pendingTickets"),')
content = content.replace('{ label: "Total Gasto",', '{ label: t("profile.totalSpent"),')

# Replace tab labels
content = content.replace('>Histórico de Participações</h2>', '>{t("profile.history")}</h2>')
content = content.replace('className="text-xs">Todos</TabsTrigger>', 'className="text-xs">{t("profile.all")}</TabsTrigger>')
content = content.replace('className="text-xs">Confirmados</TabsTrigger>', 'className="text-xs">{t("profile.confirmedTickets")}</TabsTrigger>')
content = content.replace('className="text-xs">Pendentes</TabsTrigger>', 'className="text-xs">{t("profile.pendingTickets")}</TabsTrigger>')

# Replace empty states
content = content.replace('>Ainda não participaste em nenhum sorteio</p>', '>{t("profile.noParticipations")}</p>')
content = content.replace('>Explorar Sorteios</Button>', '>{t("profile.explore")}</Button>')
content = content.replace('{p.raffle?.title || "Sorteio"}', '{p.raffle?.title || t("profile.raffle")}')
content = content.replace('{p.raffle?.prize_title || "Prémio"}', '{p.raffle?.prize_title || t("profile.prize")}')
content = content.replace('>Nenhum bilhete com este estado.</p>', '>{t("profile.noTickets")}</p>')

# Fix status label rendering - now it needs to use t()
content = content.replace(
    'const sc = statusConfig[p.payment_status] || statusConfig.pending;\n              const StatusIcon = sc.icon;',
    'const sc = statusConfig[p.payment_status] || statusConfig.pending;\n              const StatusIcon = sc.icon;\n              const statusLabel = p.payment_status === "confirmed" ? t("profile.confirmed") : p.payment_status === "pending" ? t("profile.pending") : p.payment_status === "rejected" ? t("profile.rejected") : t("profile.active");'
)

content = content.replace('{sc.label}', '{statusLabel}')

with open(f"{BASE}/pages/Profile.tsx", "w") as f:
    f.write(content)
print("Profile.tsx translated")

# ============= Login.tsx =============
with open(f"{BASE}/pages/Login.tsx", "r") as f:
    content = f.read()

if '"A entrar..."' in content:
    content = content.replace('"A entrar..."', 't("auth.loggingIn")')
    # Check if useLanguage is imported
    if 'useLanguage' not in content:
        # Add import after the first import block
        content = content.replace(
            'import { useAuth } from "@/contexts/AuthContext";',
            'import { useAuth } from "@/contexts/AuthContext";\nimport { useLanguage } from "@/contexts/LanguageContext";'
        )
        # Add hook
        content = content.replace(
            'const { signIn, signUp } = useAuth();',
            'const { signIn, signUp } = useAuth();\n  const { t } = useLanguage();'
        )
    with open(f"{BASE}/pages/Login.tsx", "w") as f:
        f.write(content)
    print("Login.tsx translated")
else:
    print("Login.tsx: target string not found")

# ============= LiveHub.tsx =============
with open(f"{BASE}/pages/LiveHub.tsx", "r") as f:
    content = f.read()

# Add useLanguage import if not present
if 'useLanguage' not in content:
    content = content.replace(
        'import { useAuth } from "@/contexts/AuthContext";',
        'import { useAuth } from "@/contexts/AuthContext";\nimport { useLanguage } from "@/contexts/LanguageContext";'
    )

# Add t() hook after useAuth
content = content.replace(
    'const { user, role } = useAuth();',
    'const { user, role } = useAuth();\n  const { t } = useLanguage();'
)

# Replace hardcoded PT strings
replacements = [
    ('"Live encerrada"', 't("livehub.live") + " encerrada"'),
    ('>Jogos Online</h3>', '>{t("livehub.title")}</h3>'),
    ('>AO VIVO</', '>{t("livehub.live")}<'),
    ('>Código:</', '>{t("livehub.code")}<'),
    ('>A jogar agora<', '>{t("livehub.playing")}<'),
    ('>Todos os Jogos</h4>', '>{t("livehub.allGames")}</h4>'),
    ('searchPlaceholder="Procurar jogo..."', 'searchPlaceholder={t("livehub.searchPlaceholder")}'),
    ('>Jogo Selecionado</h3>', '>{t("livehub.selectGame")}</h3>'),
    ('>Escolha um Jogo Salvo</h3>', '>{t("livehub.chooseSaved")}</h3>'),
    ('>Ainda não tens nenhum jogo salvo!</p>', '>{t("livehub.noSavedGames")}</p>'),
    ('>Criar Primeiro Jogo', '>{t("livehub.createFirst")}'),
    ('>Modo Rápido</p>', '>{t("livehub.quickPlay")}</p>'),
    ('>Edita prêmios diretamente aqui</p>', '>{t("livehub.quickPlay.desc")}</p>'),
    ('>Jogo não encontrado</p>', '>{t("livehub.gameNotFound")}</p>'),
    ('>Seleciona um jogo da lista acima</p>', '>{t("livehub.gameNotFound.desc")}</p>'),
    ('>Dicas</h3>', '>{t("livehub.tips")}</h3>'),
    ('>Escolhe qualquer jogo da lista e joga imediatamente.</li>', '>{t("livehub.tip.1")}</li>'),
    ('>Empresas podem iniciar uma live para envolver a audiência.</li>', '>{t("livehub.tip.2")}</li>'),
    ('>O teu ranking local é guardado automaticamente.</li>', '>{t("livehub.tip.3")}</li>'),
    ('>Desafia os teus amigos e supera o teu recorde!</li>', '>{t("livehub.tip.4")}</li>'),
    ('>Modo Multi-jogador</h3>', '>{t("livehub.multiplayer")}</h3>'),
    ('>Vários jogos suportam 1v1 ou contra bot IA — perfeito para desafiar amigos. Inicia uma live para partilhar com a audiência!</p>', '>{t("livehub.multiplayer.desc")}</p>'),
    ('>Encerrar a Live?</h3>', '>{t("livehub.endLive")}</h3>'),
    ('>Confirmação disponível em</p>', '>{t("livehub.endLive.countdown")}</p>'),
    ('>Pronto</p>', '>{t("livehub.endLive.ready")}</p>'),
    ('>Cancelar</button>\n                <button', '>{t("livehub.endLive.cancel")}</button>\n                <button'),
    ('>Encerrar Live</button>', '>{t("livehub.endLive.confirm")}</button>'),
    ('{ending ? "A encerrar…" : "Encerrar Live"}', '{ending ? t("livehub.endLive.ending") : t("livehub.endLive.confirm")}'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
    else:
        print(f"  LiveHub: NOT FOUND: {old[:40]}")

with open(f"{BASE}/pages/LiveHub.tsx", "w") as f:
    f.write(content)
print("LiveHub.tsx translated")

print("\nDone!")
