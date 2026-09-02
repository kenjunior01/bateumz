import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx.bak', 'r') as f:
    original = f.read()

MOZ = {'mexerica', 'urusse', 'capulanaquiz', 'chigogo', 'ntchuva', 'djikota', 'uri', 'bicho'}

cat_map = {
    'wheel': 'popular', 'keyword': 'popular', 'emoji': 'popular', 'tap': 'versus',
    'quiz': 'quiz', 'mystery': 'popular', 'millionaire': 'quiz', 'kahoot': 'quiz',
    'bingo': 'popular', 'challenge': 'popular', 'vsduel': 'versus', 'speed': 'versus',
    'truthordare': 'popular', 'memory': 'puzzle', 'punishment': 'popular',
    'boknowledge': 'quiz', 'guessEmoji': 'quiz', 'quickdraw': 'quiz',
    'hotpotato': 'acao', 'numguess': 'versus', 'chaos': 'acao',
    'checkers': 'tabuleiro', 'ludo': 'tabuleiro', 'connect4': 'tabuleiro',
    'battleship': 'tabuleiro', 'tictactoe': 'tabuleiro', 'uno': 'tabuleiro',
    'snakebattle': 'acao', 'rps': 'versus', 'colorsequence': 'puzzle',
    'spaceshooter': 'acao', 'ballbreaker': 'acao', 'reactionrace': 'acao',
    'quickmath': 'versus', 'memorycards': 'puzzle', 'wordscramble': 'puzzle',
    'tictactoepro': 'tabuleiro', 'guessnumber100': 'versus', 'colormatch': 'puzzle',
    'targettap': 'puzzle', 'diceluel': 'versus', 'patternmemory': 'puzzle',
    'triviaflash': 'quiz', 'dominoes': 'tabuleiro', 'mazerace': 'puzzle',
    'slotsvs': 'popular', 'match4': 'puzzle', 'towerstack': 'acao',
    'cannonbattle': 'acao', 'spotdifference': 'puzzle', 'wordchain': 'quiz',
    'numbertetris': 'puzzle', 'pongvs': 'acao', 'whackamole': 'acao',
    'colorcatch': 'puzzle',
}

lines = original.split('\n')
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    m = re.match(r'^(\s*)\{ id: "(\w+)", label: "([^"]+)", icon: (\w+), emoji: "([^"]+)", desc: "([^"]+)", grad: "([^"]+)" \},(.*)$', line)
    if m:
        indent = m.group(1)
        gid = m.group(2)
        label = m.group(3)
        icon = m.group(4)
        emoji = m.group(5)
        desc = m.group(6)
        grad = m.group(7)
        c = 'mocambicano' if gid in MOZ else cat_map.get(gid, 'popular')
        mz = 'true' if gid in MOZ else 'false'
        new_lines.append(f'{indent}{{ id: "{gid}", label: "{label}", icon: {icon}, emoji: "{emoji}", desc: "{desc}", grad: "{grad}", cat: "{c}" as const, moz: {mz} }},')
        i += 1
        continue
    new_lines.append(line)
    i += 1

cleaned = '\n'.join(new_lines)

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
    f.write(cleaned)

count = sum(1 for l in new_lines if 'cat:' in l)
print(f'Updated {count} game entries')
