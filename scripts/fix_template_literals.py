#!/usr/bin/env python3
"""Fix all template literals in JSX style props that crash esbuild"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

with open(FILE, "r") as f:
    lines = f.readlines()

# Line 621: nested template literal in ternary - most problematic
# `1px solid ${isActive ? `${primary}30` : "transparent"}`
for i, line in enumerate(lines):
    # Fix nested template literals (template inside template)
    if '`1px solid ${isActive ? `' in line:
        lines[i] = line.replace(
            '`1px solid ${isActive ? `${primary}30` : "transparent"}`',
            '(isActive ? "1px solid " + primary + "30" : "1px solid transparent")'
        )
    elif '`1px solid ${isActive ? `' in line:
        lines[i] = line.replace(
            '`1px solid ${isActive ? `${primary}15` : "rgba(255,255,255,0.04)"}`',
            '(isActive ? "1px solid " + primary + "15" : "1px solid rgba(255,255,255,0.04)")'
        )

    # Fix ternary with template literal: isActive ? `...` : "..."
    if 'isActive ? `' in lines[i] and 'as React' not in lines[i]:
        lines[i] = lines[i].replace(
            'isActive ? `${primary}15` : "transparent"',
            'isActive ? primary + "15" : "transparent"'
        )
        lines[i] = lines[i].replace(
            'isActive ? `${primary}25` : "hsl(var(--muted))"',
            'isActive ? primary + "25" : "hsl(var(--muted))"'
        )

    # Fix the color with opacity: `${branding.text_color || "#fff"}99`
    if '`${branding.text_color || "#fff"}99`' in lines[i]:
        lines[i] = lines[i].replace(
            '`${branding.text_color || "#fff"}99`',
            '(branding?.text_color || "#fff") + "99"'
        )

with open(FILE, "w") as f:
    f.writelines(lines)

print("OK: Fixed template literals")
