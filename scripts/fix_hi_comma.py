with open('/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx','r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'pay.method.paypal.desc' in line and 'भुगतान,' in line:
        # The comma is inside the string, not after the closing quote
        # Replace the trailing comma inside quotes with closing-quote-comma
        line = line.replace('भुगतान,"', 'भुगतान",')
        print(f'Fixed line {i+1}')
        lines[i] = line

with open('/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx','w') as f:
    f.writelines(lines)
print('Done')
