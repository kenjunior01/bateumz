#!/usr/bin/env python3
"""Remove misplaced Common UI Strings from start of each section, keep only the one at end of en"""

FILE = '/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove lines from "// ===== Common UI Strings =====" 
# until we hit a line that doesn't start with '    "'
# BUT only when it appears early in a section (right after a section header comment)

new_lines = []
skip_mode = False
skip_count = 0
removed = 0

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # Detect start of Common UI Strings block at BEGINNING of a section
    # This happens when we see a section comment like "// ===== Navbar / Top ====="
    # followed immediately by "// ===== Common UI Strings ====="
    if stripped == '// ===== Common UI Strings =====' and i > 1:
        # Check if the previous non-empty line was a section header comment
        prev_idx = len(new_lines) - 1
        while prev_idx >= 0 and new_lines[prev_idx].strip() == '':
            prev_idx -= 1
        
        if prev_idx >= 0 and '=====' in new_lines[prev_idx] and 'Common' not in new_lines[prev_idx]:
            # This is a misplaced block - skip it
            skip_mode = True
            skip_count = 0
            print(f'Found misplaced block at line {i+1}, removing...')
            i += 1
            continue
    
    if skip_mode:
        if stripped.startswith('"') and ':' in stripped and stripped.endswith(','):
            removed += 1
            i += 1
            continue
        else:
            skip_mode = False
    
    new_lines.append(line)
    i += 1

print(f'Removed {removed} misplaced key lines')

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Done!')
