import re

path = '/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx'
with open(path, 'r') as f:
    content = f.read()

# Remove all JSX-style comments
content = re.sub(r'\{\s*/\*.*?\*/\s*\}', '', content, flags=re.DOTALL)

with open(path, 'w') as f:
    f.write(content)

print('Done')
