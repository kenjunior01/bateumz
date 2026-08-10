#!/usr/bin/env python3
"""
Adds new i18n translation keys to LanguageContext.tsx for 6 languages.
Does insertions in REVERSE ORDER to avoid cumulative line-number drift.
"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

NEW_KEYS = { ... }  # loaded below

import json

# Load file
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')
print(f'Original lines: {len(lines)}')

# Find section closing boundaries (the }, that closes each language section)
# We look for patterns like:
#   "regional.feature.disabled": "...",
#   },
# The } at the end of each section.
section_ends = []

# Find en section end (first }, after en keys)
in_section_end = False
for i in range(830, 845):
    if lines[i].strip() == '},':
        section_ends.append(('en', i))
        break

# Find pt section end
for i in range(1368, 1383):
    if lines[i].strip() == '},':
        section_ends.append(('pt', i))
        break

# Find pt-BR section end
for i in range(2089, 2104):
    if lines[i].strip() == '},':
        section_ends.append(('pt-BR', i))
        break

# Find es section end
for i in range(2768, 2793):
    if lines[i].strip() == '},':
        section_ends.append(('es', i))
        break

# Find fr section end
for i in range(3424, 3429):
    if lines[i].strip() == '},':
        section_ends.append(('fr', i))
        break

# Find hi section end
for i in range(4123, 4133):
    if lines[i].strip() == '},':
        section_ends.append(('hi', i))
        break

print('Section end lines:')
for lang, line_idx in section_ends:
    print(f'  {lang}: line {line_idx+1} ({lines[line_idx][:60].strip()})')

# Format keys for a language
def fmt_keys(keys_dict):
    result = []
    for key, value in keys_dict.items():
        result.append(f'    "{key}": "{value}",')
    return '\n'.join(result) + '\n'

# Insert in REVERSE ORDER (hi, fr, es, pt-BR, pt, en)
# This way earlier insertions don't shift later ones
for lang in ['hi', 'fr', 'es', 'pt-BR', 'pt', 'en']:
    lang_keys = NEW_KEYS.get(lang, {})
    block = fmt_keys(lang_keys)
    end_line = section_ends[lang][1]  # the line with },
    insert_at = end_line  # insert BEFORE the }
    # Insert
    lines[insert_at:insert_at] = block.split('\n')
    print(f'Inserted {len(lang_keys)} keys for {lang} before line {insert_at+1}')
    # Update ALL subsequent section end positions
    for other_lang, other_end in section_ends:
        if other_end[1] >= insert_at:
            section_ends[other_lang] = (other_lang, other_end[1] + len(block.split('\n')))

with open(FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'Final lines: {len(lines)}')
# Verify structure - check all section closes exist
for lang, line_idx in section_ends:
    actual_line = lines[line_idx].strip()
    print(f'  {lang}: line {line_idx+1} = {actual_line}')
    assert actual_line == '}', f'{lang} section close broken at line {line_idx+1}'

print('Done!')
