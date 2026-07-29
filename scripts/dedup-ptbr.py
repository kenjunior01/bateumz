#!/usr/bin/env python3
"""Remove duplicate keys within the pt-BR block of LanguageContext.tsx"""

path = '/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx'
with open(path, 'r') as f:
    lines = f.readlines()

# Find pt-BR block
br_start = None
br_end = None
for i, line in enumerate(lines):
    if '"pt-BR":' in line and '{' in line:
        br_start = i
    elif br_start and i > br_start and line.strip() == '},':
        br_end = i
        break

if not br_start or not br_end:
    print(f'ERROR: pt-BR block not found: start={br_start}, end={br_end}')
    exit(1)

print(f'pt-BR block: lines {br_start+1}-{br_end+1} ({br_end - br_start} lines)')

# Extract keys and their line numbers
seen = {}
duplicates = []
for i in range(br_start + 1, br_end):
    line = lines[i].strip()
    if line.startswith('"') and '":' in line:
        key = line.split('":')[0].strip().strip('"')
        if key in seen:
            duplicates.append((key, seen[key], i))
        else:
            seen[key] = i

print(f'Found {len(duplicates)} duplicate keys')
if duplicates:
    for key, first, second in duplicates[:5]:
        print(f'  "{key}" at lines {first+1} and {second+1}')
    if len(duplicates) > 5:
        print(f'  ... and {len(duplicates) - 5} more')

# Remove duplicate lines (keep first occurrence)
lines_to_remove = set(second for _, _, second in duplicates)
new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]

with open(path, 'w') as f:
    f.writelines(new_lines)

print(f'Removed {len(lines_to_remove)} duplicate key lines. File went from {len(lines)} to {len(new_lines)} lines.')