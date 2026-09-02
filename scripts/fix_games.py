import re

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'r') as f:
    content = f.read()

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

def replace_game_entry(m):
    gid = m.group(1)
    full = m.group(0)
    if 'cat:' in full and 'moz:' in full:
        return full
    c = cat_map.get(gid, 'popular')
    mz = 'true' if gid in MOZ else 'false'
    if gid in MOZ:
        c = 'mocambicano'
    closing = full.rstrip().rstrip(',')
    return closing + ', cat: "' + c + '" as const, moz: ' + mz + ' },\n'

new_content = re.sub(
    r'\{ id: "(\w+)", label: "[^"]+", icon: \w+, emoji: "[^"]+", desc: "[^"]+", grad: "[^"]+" \}',
    replace_game_entry,
    content
)

with open('/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx', 'w') as f:
    f.write(new_content)

fixed = sum(1 for g in re.finditer(r'cat:', new_content))
print(f'Fixed {fixed} game entries with cat/moz fields')
