#!/usr/bin/env python3
import re

path = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'

with open(path, 'r') as f:
    content = f.read()

# Remove ALL JSX comments {/* ... */}
content = re.sub(r'\{\s*/\*.*?\*/\s*\}', '', content)

with open(path, 'w') as f:
    f.write(content)
print('Done')
