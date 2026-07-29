#!/usr/bin/env python3
"""Resolve all git merge conflicts by keeping the 'incoming' (non-HEAD) version."""
import re
import os

BASE = "/home/z/my-project/bateumz-cb2c44d1/src"

CONFLICTED_FILES = [
    "components/Navbar.tsx",
    "components/HeroSection.tsx",
    "components/StatsBar.tsx",
    "components/CTASection.tsx",
    "components/livegames/LiveControlPanel.tsx",
    "components/livegames/ChigogoGame.tsx",
    "components/livegames/CapulanaQuiz.tsx",
    "components/livegames/LiveBingo.tsx",
    "components/livegames/KahootMultiplayerQuiz.tsx",
]

def resolve_conflicts_in_file(filepath, keep="incoming"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "<<<<<<< HEAD" not in content:
        return 0
    
    pattern = r"<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+"
    
    if keep == "incoming":
        resolved = re.sub(pattern, lambda m: m.group(2), content, flags=re.DOTALL)
    else:
        resolved = re.sub(pattern, lambda m: m.group(1), content, flags=re.DOTALL)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(resolved)
    
    count = len(re.findall(pattern, content, flags=re.DOTALL))
    return count

total = 0
for rel in CONFLICTED_FILES:
    fp = os.path.join(BASE, rel)
    if not os.path.exists(fp):
        print(f"SKIP (not found): {rel}")
        continue
    n = resolve_conflicts_in_file(fp, keep="incoming")
    print(f"{rel}: resolved {n} conflicts")
    total += n

print(f"\nTotal conflicts resolved: {total}")

remaining = 0
for rel in CONFLICTED_FILES:
    fp = os.path.join(BASE, rel)
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            if "<<<<<<< HEAD" in f.read():
                print(f"WARNING: conflicts still in {rel}")
                remaining += 1

if remaining == 0:
    print("\nAll conflicts resolved successfully!")
else:
    print(f"\nWARNING: {remaining} files still have conflicts")
