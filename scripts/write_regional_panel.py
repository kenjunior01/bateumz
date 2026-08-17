import os

content = open('/home/z/my-project/scripts/regional_panel_content.tsx', 'r').read()
with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/RegionalManagerPanel.tsx', 'w') as f:
    f.write(content)
print('Written successfully')
