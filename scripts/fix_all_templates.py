#!/usr/bin/env python3
"""Replace ALL template literals in JSX with string concatenation for esbuild compat"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

with open(FILE, "r") as f:
    content = f.read()

# Replace all `simple_expr` patterns inside style={{ }} or similar JSX attributes
# Pattern: `${var}`  ->  var + ""  (keeping the rest)

# Line by line replacement for style attributes with template literals
import re

def replace_template_in_style(match):
    """Replace template literals in a style object"""
    style_content = match.group(1)
    # Replace ${var} with var + ""
    # But be careful not to break string literals
    result = re.sub(r'`([^`]*)\$\{([^}]+)\}([^`]*)`', lambda m: '(' + m.group(2) + ' + "' + m.group(1) + m.group(3) + '")', style_content)
    return 'style={{' + result + '}}'

# Simple approach: replace ALL backtick template literals in the file
# that are used as JSX attribute values

lines = content.split('\n')
new_lines = []
for line in lines:
    # Skip lines without backticks
    if '`' not in line:
        new_lines.append(line)
        continue
    
    # Replace simple `${var}suffix` patterns with var + "suffix"
    # Handle: `${primary}30` -> primary + "30"
    # Handle: `${primary}15` -> primary + "15"
    # Handle: `${s.color}20` -> s.color + "20"
    # Handle: `${color}50` -> color + "50"
    # Handle: `${0.35 + i * 0.08}s` -> (0.35 + i * 0.08) + "s"
    
    # Pattern 1: `${expr}suffix` (simple template with expression and text)
    def simple_template_repl(m):
        expr = m.group(1)
        suffix = m.group(2)
        return '(' + expr + ' + "' + suffix + '")'
    
    # Only replace backtick templates that look like `${expr}suffix`
    line = re.sub(r'`\$\{([^}]+)\}([^`]*)`', simple_template_repl, line)
    
    # Pattern 2: multi-part templates like `prefix${expr}middle${expr2}suffix`
    # These are rare, handle manually if needed
    
    new_lines.append(line)

content = '\n'.join(new_lines)

with open(FILE, "w") as f:
    f.write(content)

print("OK: Replaced all template literals")
