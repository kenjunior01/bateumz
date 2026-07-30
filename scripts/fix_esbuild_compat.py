#!/usr/bin/env python3
"""Comprehensive fix: pre-compute all dynamic values and fix esbuild-incompatible patterns"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

with open(FILE, "r") as f:
    content = f.read()

# Fix line 670: border template with ternary inside
content = content.replace(
    'border: `1px solid ${isActive ? (primary + "15") : "rgba(255,255,255,0.04)"}`',
    'border: (isActive ? "1px solid " + primary + "15" : "1px solid rgba(255,255,255,0.04)")'
)

# Fix line 702: nested template literals for game description
old_702 = '{isWheel ? `Roda de Premios${game.segment_count ? ` / ${game.segment_count} segmentos` : ""}` : "Quem Quer Ser Milionario"}'
new_702 = '{isWheel ? ("Roda de Premios" + (game.segment_count ? " / " + game.segment_count + " segmentos" : "")) : "Quem Quer Ser Milionario"}'
content = content.replace(old_702, new_702)

with open(FILE, "w") as f:
    f.write(content)

print("OK: Fixed esbuild-incompatible patterns")