#!/usr/bin/env python3
""""
Replace all JSX comments {/* ... */} with // comments.
"""
import re

path = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'

with open(path, 'r') as f:
    content = f.read()

# Replace multi-line JSX comments {/* ... */} with single-line // comments
while True:
    new_content = re.sub(r'\{\s*/\*.*?\*/\*\s*\}', '//', content)
    if new_content == content:
        break

with open(path, 'w') as f:
    f.write(new_content)
    print(f'Replaced {len(re.findall(r'//', new_content))} comments')
