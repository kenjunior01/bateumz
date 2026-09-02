#!/usr/bin/env python3
"""Fix _ARR corruption in Mozambican game components.

The Python cleanup script replaced inline arrays like (['bot', 'pvp'] as const).map(...)
with undefined _ARR variables, causing runtime ReferenceErrors.

This script adds proper module-level constants and fixes all references.
"""

import re

BASE = "/home/z/my-project/bateumz-cb2c44d1/src/components/livegames"

# Each file: (filename, {arr_name: (const_name, const_value), ...})
FIXES = {
    "CapulanaQuiz.tsx": {
        "_ARR2": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR1": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
    },
    "ChigogoGame.tsx": {
        "_ARR2": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR1": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
    },
    "DjikotaGame.tsx": {
        "_ARR2": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR1": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
    },
    "UrusseGame.tsx": {
        "_ARR2": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR1": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
    },
    "NtchuvaGame.tsx": {
        "_ARR3": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR2": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
        "_ARR1": ("_PLAYERS", 'const _PLAYERS: ("p1" | "p2")[] = ["p1", "p2"];'),
    },
    "BichoGame.tsx": {
        "ARR_1": ("_MODES", 'const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];'),
        "_ARR2": ("_DIFFS", 'const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];'),
        "_ARR1": ("_BET_TYPES", 'const _BET_TYPES: ("animal" | "grupo" | "dezena" | "centena" | "milhar")[] = ["animal", "grupo", "dezena", "centena", "milhar"];'),
    },
}

for filename, arr_map in FIXES.items():
    filepath = f"{BASE}/{filename}"
    with open(filepath, "r") as f:
        content = f.read()
    
    # Collect constants to add
    constants_to_add = []
    for arr_name, (const_name, const_def) in arr_map.items():
        # Replace arr_name with const_name in .map() calls
        content = content.replace(f"{arr_name}.map", f"{const_name}.map")
        constants_to_add.append(const_def)
    
    # Find the insertion point: after the last import or after the first interface/const block
    # We'll insert after the last 'import ...' line
    lines = content.split("\n")
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i
    
    # Insert constants after the last import line
    insert_text = "\n" + "\n".join(constants_to_add)
    lines.insert(last_import_idx + 1, insert_text)
    
    new_content = "\n".join(lines)
    
    with open(filepath, "w") as f:
        f.write(new_content)
    
    print(f"Fixed {filename}: replaced {list(arr_map.keys())} -> {[v[0] for v in arr_map.values()]}")

print("\nDone! All _ARR corruption fixed.")
