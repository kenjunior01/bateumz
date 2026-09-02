import re
path = '/home/z/my-project/bateumz-cb2c44d1/src/components/livegames/LudoGame.tsx'
with open(path, 'r') as f:
    content = f.read()
# Remove JSX comments: {/* ... */}
content_new = re.sub(r'\{/\*.*?\*/\s*\}', '', content, flags=re.DOTALL)
with open(path, 'w') as f:
    f.write(content_new)
print('Done')
