#!/usr/bin/env python3
"""Refactor LiveHub.tsx to use i18n translation keys for game labels/descriptions."""

import re

filepath = "/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add useMemo import and useLanguage import
# Check if useMemo is already imported
if "useMemo" not in content:
    # Add useMemo to the react imports
    content = content.replace(
        "import { useEffect, useRef, useState, useCallback, Component, lazy, Suspense, type ReactNode } from \"react\";",
        "import { useEffect, useRef, useState, useCallback, useMemo, Component, lazy, Suspense, type ReactNode } from \"react\";"
    )

# Add useLanguage import
if "useLanguage" not in content:
    # Add after other imports - find a good spot
    content = content.replace(
        'import BottomTabBar from "@/components/BottomTabBar";',
        'import BottomTabBar from "@/components/BottomTabBar";\nimport { useLanguage } from "@/contexts/LanguageContext";'
    )

# 2. Replace the GAMES const array with GAME_DEFS (no label/desc)
# Pattern: each line like: { id: "wheel", label: "...", icon: ..., emoji: "...", desc: "...", grad: "..." },
# We need to keep: { id, icon, emoji, grad } and remove label/desc

games_pattern = re.compile(
    r'\{ id: "(\w+)", label: "[^"]*", icon: (\w+), emoji: "([^"]*)", desc: "[^"]*", grad: "([^"]*)" \},'
)

def replace_game(m):
    gid = m.group(1)
    icon = m.group(2)
    emoji = m.group(3)
    grad = m.group(4)
    return f'{{ id: "{gid}", icon: {icon}, emoji: "{emoji}", grad: "{grad}" }},'

content = games_pattern.sub(replace_game, content)

# 3. Rename GAMES to GAME_DEFS (the const declaration)
content = content.replace(
    "const GAMES: { id: GameId; label: string; icon: any; emoji: string; desc: string; grad: string }[] = [",
    "const GAME_DEFS: { id: GameId; icon: any; emoji: string; grad: string }[] = ["
)

# 4. Inside LiveHub component, add useLanguage and GAMES useMemo after opening
old_component_start = "const LiveHub = () => {\n  const { toast: uiToast } = useToast();"
new_component_start = """const LiveHub = () => {
  const { toast: uiToast } = useToast();
  const { t } = useLanguage();
  const GAMES = useMemo(() => GAME_DEFS.map(g => ({
    ...g,
    label: t("livehub.game." + g.id),
    desc: t("livehub.game." + g.id + ".desc"),
  })), [t]);"""
content = content.replace(old_component_start, new_component_start)

# 5. Replace GAME_DEFS.some with GAME_DEFS.some (already done by rename)
# The two places that check GAMES.some need to use GAME_DEFS.some
# But wait - inside the component, GAMES is the localized version. The .some checks
# are used before the GAMES useMemo would be available in initial state.
# Let's check: useState uses GAMES.some in initializer - at that point GAMES is defined via useMemo
# which runs synchronously during first render. So GAMES.some inside the component is fine.

# 6. Fix the hardcoded Portuguese strings in the render
# "JOGOS DISPONÍVEIS"
content = content.replace(
    "{GAMES.length} JOGOS DISPONÍVEIS",
    "{GAMES.length} {t(\"livehub.title\")}"
)

# "Todos os Jogos"  
content = content.replace(
    'title="Todos os Jogos"',
    'title={t("livehub.all")}'
)

# "Procurar jogo..."
content = content.replace(
    'searchPlaceholder="Procurar jogo..."',
    'searchPlaceholder={t("livehub.search")}'
)

# Error boundary strings
content = content.replace(
    '>Erro ao carregar {this.props.gameName}<',
    '>{t("livehub.errorLoading")} {this.props.gameName}<'  
)
content = content.replace(
    'Ocorreu um problema inesperado. Tenta novamente ou escolhe outro jogo.',
    't("app.errorSubtitle")'
)
content = content.replace(
    '>Tentar novamente<',
    '>{t("livehub.retry")}<' 
)
content = content.replace(
    '>Outro jogo<',
    '>{t("livehub.otherGame")}<' 
)

# "Joga quando quiseres! Escolhe um jogo e diverte-te. Empresas podem iniciar uma live para envolver a audiência em tempo real."
# This is a longer description - let's find and replace it
content = content.replace(
    'Joga quando quiseres! Escolhe um jogo e diverte-te. Empresas podem iniciar uma live para envolver a audiência em tempo real.',
    't("livehub.title")'
)

# "Erro ao carregar jogos salvos"
content = content.replace(
    '"Erro ao carregar jogos salvos"',
    't("livehub.errorLoading")'
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("LiveHub.tsx successfully updated with i18n support!")
