#!/usr/bin/env python3
"""Fix JSX comments with special chars that break esbuild."""
import re

path = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'
with open(path, 'r') as f:
    content = f.read()

# Replace {/* ═══ TEXT ═══ */} with plain {/* TEXT */}
content = re.sub(r'\{\/\*\s*═+\s*(.+?)\s*═+\s*\*\/\}', r'{/* \1 */}', content)

# Also fix any remaining box-drawing chars in comments
content = re.sub(r'═', '', content)

with open(path, 'w') as f:
    f.write(content)

print('Fixed comments')