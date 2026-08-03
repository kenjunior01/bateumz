#!/usr/bin/env python3
"""Fix Hindi translation quality issues in LanguageContext.tsx"""
import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # Fix garbled referral desc
    ('दोस्तों को रेफ़र्यूडीली में भेजें',
     'दोस्तों को रेफ़र करें और इनाम जीतें'),

    # Fix typo in hero CTA subtitle (अपकरणी → अविश्वसनीय)
    ('अपकरणी पुरस्कार',
     'अविश्वसनीय पुरस्कार'),

    # Fix UPI brand name - keep as "UPI" in Hindi too
    ('भारतीय इन्टरनेट पेमेंट', 'UPI'),

    # Fix UPI desc
    ('तुरंत भारतीय पेमेंट',
     'भारतीय तत्काल भुगतान सेवा'),

    # Improve Paytm desc
    # paytm.desc line 1 (in hi section, the first occurrence after line 2958)
]

# More targeted replacements using line-context
lines = content.split('\n')
hi_start = None
for i, line in enumerate(lines):
    if 'hi: {' in line or 'hi:{' in line:
        hi_start = i
        break

if hi_start is None:
    print("ERROR: Could not find hi: section")
    exit(1)

print(f"Found Hindi section at line {hi_start + 1}")

changes = 0
for i in range(hi_start, len(lines)):
    line = lines[i]
    
    # Fix referral desc (garbled text)
    if 'रेफ़र्यूडीली' in line and 'nav.referral.desc' in line:
        lines[i] = line.replace(
            'दोस्तों को रेफ़र्यूडीली में भेजें',
            'दोस्तों को रेफ़र करें और इनाम जीतें'
        )
        print(f"  Fixed line {i+1}: nav.referral.desc")
        changes += 1
    
    # Fix hero CTA subtitle typo
    if 'अपकरणी' in line and 'nav.hero.cta.subtitle' in line:
        lines[i] = line.replace(
            'अपकरणी पुरस्कार',
            'अविश्वसनीय पुरस्कार'
        )
        print(f"  Fixed line {i+1}: nav.hero.cta.subtitle")
        changes += 1
    
    # Fix UPI label - keep brand name
    if 'pay.method.upi":' in line and 'इन्टरनेट' in line:
        lines[i] = line.replace(
            '"\u092d\u093e\u0930\u0924\u0940\u092f \u0907\u0928\u094d\u091f\u0930\u0928\u0947\u091f \u092a\u0947\u092e\u0947\u0902\u091f"',
            '"UPI"'
        )
        print(f"  Fixed line {i+1}: pay.method.upi")
        changes += 1

    # Fix UPI desc
    if 'pay.method.upi.desc":' in line and 'तुरंत भारतीय पेमेंट' in line:
        lines[i] = line.replace(
            'तुरंत भारतीय पेमेंट',
            'भारतीय तत्काल भुगतान सेवा'
        )
        print(f"  Fixed line {i+1}: pay.method.upi.desc")
        changes += 1

    # Fix paytm.desc
    if 'pay.method.paytm.desc":' in line and 'वॉलेट' in line:
        lines[i] = line.replace(
            'भारतीय वॉलेट',
            'भारतीय ईवॉलेट'
        )
        print(f"  Fixed line {i+1}: pay.method.paytm.desc")
        changes += 1

    # Fix phonepe.desc
    if 'pay.method.phonepe.desc":' in line and i > hi_start:
        lines[i] = line.replace(
            'भारतीय वॉलेट',
            'भारतीय डिजिटल वॉलेट'
        )
        print(f"  Fixed line {i+1}: pay.method.phonepe.desc")
        changes += 1

    # Fix rupay.desc
    if 'pay.method.rupay.desc":' in line and 'कार्ड' in line:
        lines[i] = line.replace(
            'भारतीय कार्ड',
            'भारतीय कार्ड नेटवर्क'
        )
        print(f"  Fixed line {i+1}: pay.method.rupay.desc")
        changes += 1

    # Fix gpay.desc
    if 'pay.method.gpay.desc":' in line and 'गूगल पे' in line:
        lines[i] = line.replace(
            'गूगल पे',
            'गूगल पे (भारतीय भुगतान एप्लाइन)'
        )
        print(f"  Fixed line {i+1}: pay.method.gpay.desc")
        changes += 1

    # Fix winner subtitle - redundant phrasing
    if 'winners.subtitle":' in line and i > hi_start and 'सत्यापित है' in line:
        lines[i] = line.replace(
            'हर लॉटरी सार्वजनिक रूप सत्यापित है — सत्यापन देखने के लिए किसी भी विजेता पर क्लिक करें।',
            'हर लॉटरी सार्वजनिक रूप सत्यापित है — वेरिफिकेशन देखने के लिए किसी भी विजेता पर क्लिक करें।'
        )
        print(f"  Fixed line {i+1}: winners.subtitle")
        changes += 1

    # Fix marketplace.empty.subtitle - improve flow
    if 'marketplace.empty.subtitle":' in line and i > hi_start and 'लॉन्च पर' in line:
        lines[i] = line.replace(
            'हम प्रीमियम लॉटरी और प्रतियोगिताओं की तैयारी कर रहे हैं। लॉन्च पर सूचित होने के लिए अपना ईमेल छोड़ें।',
            'हम शीघ्र लॉटरी और प्रतियोगिताएँ तैयार कर रहे हैं। लॉन्च पर सूचित होने के लिए अपना ईमेल दें।'
        )
        print(f"  Fixed line {i+1}: marketplace.empty.subtitle")
        changes += 1

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")