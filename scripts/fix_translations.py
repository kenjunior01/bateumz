#!/usr/bin/env python3
"""
Add missing instantWin.* translation keys to LanguageContext.tsx.
Inserts them right after the 'footer.instantWin' line in each language section.
"""

import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

# New keys per language, keyed by the value of footer.instantWin (which is unique per section)
NEW_KEYS = {
    'Instant Win': [
        ('instantWin.badge', 'Instant Prizes'),
        ('instantWin.title', 'Instant Win Games'),
        ('instantWin.subtitle', 'Play scratch cards, spin wheels, and win instantly!'),
        ('instantWin.noGames', 'No instant games available yet'),
        ('instantWin.noGamesDesc', 'Check back soon for exciting instant win games!'),
        ('instantWin.play', 'Play Now'),
    ],
    'Ganhar Já': [
        ('instantWin.badge', 'Premios Instantaneos'),
        ('instantWin.title', 'Jogos de Ganho Imediato'),
        ('instantWin.subtitle', 'Jogue raspadinhas, rodas e ganhe instantaneamente!'),
        ('instantWin.noGames', 'Nenhum jogo instantaneo disponivel ainda'),
        ('instantWin.noGamesDesc', 'Volte em breve para jogos emocionantes!'),
        ('instantWin.play', 'Jogar Agora'),
    ],
    'Ganhe Já': [
        ('instantWin.badge', 'Premios Instantaneos'),
        ('instantWin.title', 'Jogos de Ganho Imediato'),
        ('instantWin.subtitle', 'Jogue raspadinhas, rodas e ganhe instantaneamente!'),
        ('instantWin.noGames', 'Nenhum jogo instantaneo disponivel ainda'),
        ('instantWin.noGamesDesc', 'Volte em breve para jogos emocionantes!'),
        ('instantWin.play', 'Jogar Agora'),
    ],
    'Gana al Instante': [
        ('instantWin.badge', 'Premios Instantaneos'),
        ('instantWin.title', 'Juegos Instantaneos'),
        ('instantWin.subtitle', 'Juega y gana al instante!'),
        ('instantWin.noGames', 'Sin juegos disponibles'),
        ('instantWin.noGamesDesc', 'Vuelve pronto para juegos emocionantes!'),
        ('instantWin.play', 'Jugar Ahora'),
    ],
    'Gagnez Instantanément': [
        ('instantWin.badge', 'Prix Instantanes'),
        ('instantWin.title', 'Jeux Instantanes'),
        ('instantWin.subtitle', 'Jouez et gagnez instantanement!'),
        ('instantWin.noGames', 'Aucun jeu disponible'),
        ('instantWin.noGamesDesc', 'Revenez bientot!'),
        ('instantWin.play', 'Jouer'),
    ],
    'तुरंत जीतें': [
        ('instantWin.badge', 'तुरंत पुरस्कार'),
        ('instantWin.title', 'तुरंत जीत के खेल'),
        ('instantWin.subtitle', 'अभी खेलें और तुरंत जीतें!'),
        ('instantWin.noGames', 'कोई खेल उपलब्ध नहीं'),
        ('instantWin.noGamesDesc', 'जल्द ही वापस आएं!'),
        ('instantWin.play', 'अभी खेलें'),
    ],
}


def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    insertions = 0

    for i, line in enumerate(lines):
        m = re.match(r'\s*"footer\.instantWin":\s*"(.+?)"', line)
        if m:
            value = m.group(1)
            if value not in NEW_KEYS:
                print(f"WARNING: Unknown footer.instantWin value: {value!r} at line {i+1}")
                continue
            # Build the new lines to insert
            new_lines = []
            for key, val in NEW_KEYS[value]:
                new_lines.append(f'    "{key}": "{val}",')
            block = '\n'.join(new_lines)
            # Insert after current line
            lines[i] = line + '\n' + block
            insertions += 1
            print(f"  Inserted {len(NEW_KEYS[value])} keys after line {i+1} (value: {value!r})")

    if insertions == 0:
        print("No insertions made - no matching footer.instantWin lines found.")
        return

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"\nDone! Inserted keys into {insertions} language sections.")


if __name__ == '__main__':
    main()
