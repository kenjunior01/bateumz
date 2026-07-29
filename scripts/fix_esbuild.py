import os, re

root = '/home/z/my-project/bateumz-cb2c44d1/src'
fixed = 0

for dirpath, _, filenames in os.walk(root):
    for fn in filenames:
        if not fn.endswith('.tsx'):
            continue
        fpath = os.path.join(dirpath, fn)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
        except:
            continue
        
        new_lines = []
        changed = False
        for line in lines:
            stripped = line.strip()
            # Remove lines that are ONLY a JSX comment (malformed or not)
            if stripped.startswith('{/*') and (stripped.endswith('*/}') or stripped.endswith('*/')):
                changed = True
                continue
            new_lines.append(line)
        
        if changed:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            fixed += 1
            rel = os.path.relpath(fpath, root)
            if 'livegames' not in rel:
                print(f'Fixed: {rel}')

print(f'\nTotal: {fixed} files fixed')
