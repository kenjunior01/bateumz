import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
fixed = 0
for i, line in enumerate(lines):
    if '"pay.method.paypal.desc"' in line:
        stripped = line.rstrip()
        if not stripped.endswith(','):
            last_q = stripped.rfind('"')
            if last_q > 0 and last_q < len(stripped) - 1:
                lines[i] = stripped[:last_q + 1] + ',' + '\n'
                fixed += 1
                print(f'Fixed line {i + 1}')

content = '\n'.join(lines)
with open('/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx', 'w') as f:
    f.write(content)
print(f'Done. Fixed {fixed} lines')
