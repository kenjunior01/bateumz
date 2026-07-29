#!/usr/bin/env python3
"""
Wrap each game component in LiveHub.tsx with GameErrorBoundary.
Pattern: find each game component inside {active === "xxx" && (...)} blocks
and wrap the component (not the motion.div) with <GameErrorBoundary gameName="...">
"""

import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/LiveHub.tsx"

with open(FILE, "r") as f:
    content = f.read()

# Map of game IDs to their display labels (from the GAMES array)
GAME_LABELS = {
    "wheel": "Roda de Prémios",
    "tap": "Tap Battle",
    "quiz": "Quiz Battle",
    "mystery": "Caixa Misteriosa",
    "keyword": "Caça à Palavra",
    "emoji": "Batalha de Emojis",
    "millionaire": "Quem Quer Ser Milionário?",
    "kahoot": "Quiz ao Vivo",
    "bingo": "Bingo ao Vivo",
    "challenge": "Roleta de Desafios",
    "vsduel": "Arena de Duelo VS",
    "speed": "Duelo de Velocidade",
    "truthordare": "Verdade ou Desafio",
    "memory": "Jogo da Memória VS",
    "punishment": "Roleta de Castigos",
    "boknowledge": "Batalha de Conhecimentos",
    "guessEmoji": "Adivinhe o Emoji",
    "quickdraw": "Desenho Rápido",
    "hotpotato": "Batata Quente",
    "numguess": "Adivinha o Número VS",
    "chaos": "Desafio Caótico",
    "checkers": "Damas",
    "ludo": "Ludo",
    "connect4": "Ligar 4",
    "battleship": "Batalha Naval",
    "tictactoe": "Galo VS",
    "uno": "UNO Cartas",
    "snakebattle": "Batalha de Cobras",
    "rps": "Pedra Papel Tesoura",
    "colorsequence": "Sequência de Cores",
    "spaceshooter": "Nave Espacial VS",
    "ballbreaker": "Quebra-Bloco VS",
    "reactionrace": "Corrida de Reação",
    "quickmath": "Duelo de Matemática",
    "memorycards": "Memória VS Cartas",
    "wordscramble": "Palavras Embaralhadas",
    "tictactoepro": "Galo PRO",
    "guessnumber100": "Adivinha 1 a 100",
    "colormatch": "Cor versus Palavra",
    "targettap": "Alvo Rápido",
    "diceluel": "Duelo de Dados",
    "patternmemory": "Memória de Padrões",
    "triviaflash": "Trivia Flash",
    "dominoes": "Dominó",
    "mazerace": "Corrida no Labirinto",
    "slotsvs": "Caça-Níqueis VS",
    "match4": "Combina 4",
    "towerstack": "Torre VS",
    "cannonbattle": "Batalha de Canhões",
    "spotdifference": "Encontre Diferenças",
    "wordchain": "Corrente de Palavras",
    "numbertetris": "Números Caindo",
    "pongvs": "Pong VS",
    "whackamole": "Bate o Alvo",
    "colorcatch": "Pesca Cores",
    "mexerica": "Mexerica",
    "chigogo": "Chigogo",
    "urusse": "Urusse",
    "capulanaquiz": "Capulana Quiz",
}

count = 0

# For each game, find the pattern and wrap the component
# Pattern for most games:
#   <GameComponent
#     ...props...
#   />
# We want to wrap it:
#   <GameErrorBoundary gameName="Label">
#     <GameComponent
#       ...props...
#     />
#   </GameErrorBoundary>

for game_id, label in GAME_LABELS.items():
    # Pattern 1: Self-closing component on its own line within active block
    # Find the game's active block
    pattern = rf'(active === "{game_id}" && \(\s*<motion\.div[^>]*>\s*)(<[A-Z]\w+[^>]*\/>)'
    match = re.search(pattern, content)
    if match:
        before = match.group(1)
        component = match.group(2)
        replacement = f'{before}<GameErrorBoundary gameName="{label}">\n                  {component}\n                  </GameErrorBoundary>'
        content = content.replace(match.group(0), replacement, 1)
        count += 1
        continue
    
    # Pattern 2: Multi-line component (with props on multiple lines)
    # Find <GameComponent\n  ...\n  />
    pattern2 = rf'(active === "{game_id}" && \(\s*<motion\.div[^>]*>\s*)(<[A-Z]\w+(?:\s+[^>]*?)?\s*\/>)'
    match2 = re.search(pattern2, content, re.DOTALL)
    if match2:
        before = match2.group(1)
        component = match2.group(2)
        # Indent the component
        indented = '\n                  '.join(component.split('\n'))
        replacement = f'{before}<GameErrorBoundary gameName="{label}">\n                  {indented}\n                  </GameErrorBoundary>'
        content = content.replace(match2.group(0), replacement, 1)
        count += 1
        continue

print(f"Wrapped {count} games with GameErrorBoundary")

with open(FILE, "w") as f:
    f.write(content)

print("Done!")
