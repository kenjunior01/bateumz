#!/usr/bin/env python3
"""
Fix critical issues:
1. Merge duplicate pt-BR blocks in LanguageContext.tsx
2. Add per-game error boundary in LiveHub.tsx
3. Fix AppErrorBoundary dead code in App.tsx
4. Clean up .broken/.bak files
5. Add missing translation keys
"""

import re, os

BASE = "/home/z/my-project/bateumz-cb2c44d1/src"

def fix_language_context():
    path = os.path.join(BASE, "contexts", "LanguageContext.tsx")
    with open(path, 'r') as f:
        lines = f.readlines()

    first_br = None
    second_br = None
    for i, line in enumerate(lines):
        if '"pt-BR":' in line and '{' in line:
            if first_br is None:
                first_br = i
            else:
                second_br = i
                break

    if not first_br or not second_br:
        print(f"ERROR: pt-BR blocks not found: first={first_br}, second={second_br}")
        return False

    # Find end of first block (},  before second)
    first_end = None
    for i in range(first_br + 1, second_br):
        if lines[i].strip() == '},':
            first_end = i

    # Find end of second block
    second_end = None
    for i in range(second_br + 1, len(lines)):
        if lines[i].strip() == '},':
            second_end = i
            break

    if not first_end or not second_end:
        print(f"ERROR: Block ends not found: fe={first_end}, se={second_end}")
        return False

    print(f"First pt-BR: lines {first_br+1}-{first_end+1}, Second: lines {second_br+1}-{second_end+1}")

    # Merge: keep first block content + second block's keys
    # First block: lines[first_br .. first_end] (includes header + content + },)
    # Second block: lines[second_br+1 .. second_end-1] (just the key-value pairs)
    second_keys = lines[second_br + 1:second_end]

    # Remove first block's closing },  and insert second keys before it
    new_lines = lines[:first_end] + second_keys + lines[first_end + 1:second_br] + lines[second_end + 1:]

    with open(path, 'w') as f:
        f.writelines(new_lines)

    removed = second_br - first_end + 1
    print(f"OK: Merged pt-BR blocks, removed {removed} duplicate lines")
    return True


def fix_app_error_boundary():
    path = "/home/z/my-project/bateumz-cb2c44d1/src/App.tsx"
    with open(path, 'r') as f:
        content = f.read()

    old = '    if (this.state.hasError) return (\n      <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden" style={{ background: "hsl(var(--background))" }}>\n        <motion.div\n          initial={{ opacity: 0, scale: 0.9, y: 20 }}\n          animate={{ opacity: 1, scale: 1, y: 0 }}\n          transition={{ type: "spring", stiffness: 260, damping: 20 }}\n          className="text-center space-y-5 max-w-md relative z-10"\n        >\n          <motion.div\n            className="text-7xl"\n            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}\n            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}\n          >\n            ⚠️\n          </motion.div>\n          <h2 className="text-2xl font-display font-bold">Algo correu mal</h2>\n          <p className="text-muted-foreground text-sm">Ocorreu um erro inesperado. Tente recarregar a p\u00e1gina.</p>\n          <Button onClick={() => window.location.reload()} className="gap-2 rounded-full px-6">\n            Recarregar P\u00e1gina\n          </Button>\n        </motion.div>\n      </div>\n    );\n    return this.props.children;'

    new = '    if (this.state.hasError) {\n      return (\n      <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden" style={{ background: "hsl(var(--background))" }}>\n        <motion.div\n          initial={{ opacity: 0, scale: 0.9, y: 20 }}\n          animate={{ opacity: 1, scale: 1, y: 0 }}\n          transition={{ type: "spring", stiffness: 260, damping: 20 }}\n          className="text-center space-y-5 max-w-md relative z-10"\n        >\n          <motion.div\n            className="text-7xl"\n            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}\n            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}\n          >\n            ⚠️\n          </motion.div>\n          <h2 className="text-2xl font-display font-bold">Algo correu mal</h2>\n          <p className="text-muted-foreground text-sm">Ocorreu um erro inesperado. Tente recarregar a p\u00e1gina.</p>\n          <div className="flex gap-3 justify-center">\n            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="gap-2 rounded-full px-6">\n              Tentar novamente\n            </Button>\n            <Button onClick={() => window.location.reload()} className="gap-2 rounded-full px-6">\n              Recarregar P\u00e1gina\n          </Button>\n          </div>\n        </motion.div>\n      </div>\n      );\n    }\n    return this.props.children;'

    if old in content:
        content = content.replace(old, new)
        with open(path, 'w') as f:
            f.write(content)
        print("OK: Fixed AppErrorBoundary with reset button and proper if/else")
        return True
    else:
        # Try line-by-line approach
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'return this.props.children;' in line and i > 300:
                # Check if this is the dead code line
                if i + 1 < len(lines) and lines[i+1].strip() == '}':
                    # This is the dead code - fix it
                    lines.insert(i, '    }')
                    # Now fix the if to if { and add return
                    # Find the if line
                    for j in range(i-1, max(i-30, 0), -1):
                        if 'if (this.state.hasError) return (' in lines[j]:
                            lines[j] = lines[j].replace('if (this.state.hasError) return (', 'if (this.state.hasError) {\n      return (')
                            # Find the closing ); of the return
                            for k in range(j+1, i):
                                if ');' in lines[k] and 'return' not in lines[k]:
                                    lines[k] = lines[k].replace(');', ');\n      // Add retry button before closing\n          <div className="flex gap-3 justify-center mt-2">\n            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="gap-2 rounded-full px-6">Tentar novamente</Button>\n          </div>')
                                    break
                            break
                    content = '\n'.join(lines)
                    with open(path, 'w') as f:
                        f.write(content)
                    print("OK: Fixed AppErrorBoundary (line-by-line approach)")
                    return True
        print("WARNING: Could not find AppErrorBoundary pattern to fix")
        return False


def add_game_error_boundary():
    path = os.path.join(BASE, "pages", "LiveHub.tsx")
    with open(path, 'r') as f:
        content = f.read()

    # Add Component and ReactNode to import
    if 'Component, type ReactNode' not in content:
        content = content.replace(
            'import { useEffect, useRef, useState } from "react";',
            'import { useEffect, useRef, useState, Component, type ReactNode } from "react";'
        )

    # Build error boundary code using regular strings
    eb_lines = [
        '',
        '// Per-game error boundary so one crashing game does not kill the whole page',
        'class GameErrorBoundary extends Component<{children: ReactNode; gameName: string}, {hasError: boolean}> {',
        '  constructor(props: {children: ReactNode; gameName: string}) { super(props); this.state = {hasError: false}; }',
        '  static getDerivedStateFromError() { return {hasError: true}; }',
        '  componentDidCatch(err: Error) { console.error(`[GameErrorBoundary] ${this.props.gameName}:`, err); }',
        '  render() {',
        '    if (this.state.hasError) return (',
        '      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5">',
        '        <div className="text-4xl mb-3">\U0001f3ae</div>',
        '        <p className="text-sm font-bold mb-1">Erro ao carregar {this.props.gameName}</p>',
        '        <p className="text-xs text-muted-foreground mb-3">Tente selecionar outro jogo</p>',
        '        <button onClick={() => this.setState({hasError: false})} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Tentar novamente</button>',
        '      </div>',
        '    );',
        '    return this.props.children;',
        '  }',
        '}',
        ''
    ]
    eb_code = '\n'.join(eb_lines)

    # Insert before 'type GameId ='
    if 'type GameId =' in content and 'GameErrorBoundary' not in content:
        content = content.replace('type GameId =', eb_code + 'type GameId =')

    # Wrap the second AnimatePresence with error boundary
    all_ap = [m.start() for m in re.finditer(r'<AnimatePresence mode="wait">', content)]
    if len(all_ap) >= 2 and '</GameErrorBoundary>' not in content:
        pos = all_ap[1]
        content = content[:pos] + '<GameErrorBoundary gameName={activeMeta?.label || "jogo">' + content[pos:]

        # Find closing </AnimatePresence> after pos
        closing = content.find('</AnimatePresence>', pos + 1)
        if closing > 0:
            content = content[:closing + len('</AnimatePresence>')] + '</GameErrorBoundary>' + content[closing + len('</AnimatePresence>'):]

    with open(path, 'w') as f:
        f.write(content)
    print("OK: Added GameErrorBoundary to LiveHub")
    return True


def cleanup_files():
    removed = []
    for root, dirs, files in os.walk(BASE):
        for f in files:
            if f.endswith('.broken') or f.endswith('.bak'):
                full = os.path.join(root, f)
                os.remove(full)
                removed.append(full)
    if removed:
        print(f"OK: Removed {len(removed)} dead files:")
        for r in removed:
            print(f"  - {r}")
    else:
        print("OK: No .broken/.bak files found")
    return True


def add_game_translations():
    path = os.path.join(BASE, "contexts", "LanguageContext.tsx")
    with open(path, 'r') as f:
        content = f.read()

    pt_keys = [
        ('"live.badge":', '"LIVE ENGAGEMENT"'),
        ('"live.title":', '"Jogos para a sua Live"'),
        ('"live.subtitle":', '"Plataforma dedicada para empresas animarem lives com jogos interativos."'),
        ('"live.start":', '"Iniciar Live"'),
        ('"live.end":', '"Encerrar Live"'),
        ('"live.code":', '"Codigo"'),
        ('"live.noCode":', '"Sem codigo ativo"'),
        ('"live.activeGame":', '"Jogo ativo no painel"'),
        ('"live.transmitting":', '"transmitindo"'),
        ('"live.waiting":', '"em espera"'),
        ('"live.noScoreWarning":', '"Pontuacoes e vencedores so sao contabilizados depois de iniciar a live."'),
        ('"live.createLinked":', '"Criar Sorteio Vinculado"'),
        ('"live.createEditGame":', '"Criar/Editar Jogo"'),
        ('"live.gamesTitle":', '"Jogos da Live"'),
        ('"live.searchGame":', '"Procurar jogo..."'),
        ('"games.title":', '"Todos os Jogos"'),
        ('"games.available":', '"JOGOS DISPONIVEIS"'),
        ('"games.withBot":', '"jogos com Bot IA"'),
        ('"games.instant":', '"Jogo instantaneo"'),
        ('"games.liveMode":', '"Modo Live"'),
        ('"games.search":', '"Procurar jogo..."'),
        ('"games.sortName":', '"Nome"'),
        ('"games.sortCategory":', '"Categoria"'),
        ('"games.sortBy":', '"Ordenar:"'),
        ('"games.notFound":', '"Nenhum jogo encontrado"'),
        ('"games.notFoundDesc":', '"Tenta outro termo de pesquisa ou categoria"'),
        ('"games.vsBot":', '"Jogue contra o Computador"'),
        ('"games.more":', '"+{count} mais"'),
        ('"error.somethingWrong":', '"Algo correu mal"'),
        ('"error.unexpected":', '"Ocorreu um erro inesperado. Tente recarregar a pagina."'),
        ('"error.reload":', '"Recarregar Pagina"'),
        ('"error.retry":', '"Tentar novamente"'),
        ('"error.gameCrash":', '"Erro ao carregar {game}"'),
        ('"error.gameCrashDesc":', '"Tente selecionar outro jogo"'),
    ]

    en_keys = [
        ('"live.badge":', '"LIVE ENGAGEMENT"'),
        ('"live.title":', '"Games for your Live"'),
        ('"live.subtitle":', '"Dedicated platform for businesses to animate lives with interactive games."'),
        ('"live.start":', '"Start Live"'),
        ('"live.end":', '"End Live"'),
        ('"live.code":', '"Code"'),
        ('"live.noCode":', '"No active code"'),
        ('"live.activeGame":', '"Active game on panel"'),
        ('"live.transmitting":', '"transmitting"'),
        ('"live.waiting":', '"waiting"'),
        ('"live.noScoreWarning":', '"Scores and winners are only recorded after starting the live."'),
        ('"live.createLinked":', '"Create Linked Raffle"'),
        ('"live.createEditGame":', '"Create/Edit Game"'),
        ('"live.gamesTitle":', '"Live Games"'),
        ('"live.searchGame":', '"Search game..."'),
        ('"games.title":', '"All Games"'),
        ('"games.available":', '"GAMES AVAILABLE"'),
        ('"games.withBot":', '"games with AI Bot"'),
        ('"games.instant":', '"Instant play"'),
        ('"games.liveMode":', '"Live Mode"'),
        ('"games.search":', '"Search game..."'),
        ('"games.sortName":', '"Name"'),
        ('"games.sortCategory":', '"Category"'),
        ('"games.sortBy":', '"Sort by:"'),
        ('"games.notFound":', '"No games found"'),
        ('"games.notFoundDesc":', '"Try a different search term or category"'),
        ('"games.vsBot":', '"Play against the Computer"'),
        ('"games.more":', '"+{count} more"'),
        ('"error.somethingWrong":', '"Something went wrong"'),
        ('"error.unexpected":', '"An unexpected error occurred. Try reloading the page."'),
        ('"error.reload":', '"Reload Page"'),
        ('"error.retry":', '"Try again"'),
        ('"error.gameCrash":', '"Error loading {game}"'),
        ('"error.gameCrashDesc":', '"Try selecting another game"'),
    ]

    # Add to pt block: before closing },
    pt_anchor = '"regional.language": "Idioma",'
    if pt_anchor in content:
        pt_block = '\n'.join(f'    {k} {v},' for k, v in pt_keys)
        content = content.replace(pt_anchor, pt_anchor + '\n' + pt_block)
        print(f"OK: Added {len(pt_keys)} keys to pt block")
    else:
        print("WARNING: pt anchor not found")

    # Add to en block: before pt block
    en_anchor = '  pt: {'
    if en_anchor in content and '"games.title":' not in content[:content.find(en_anchor)]:
        en_block = '\n'.join(f'    {k} {v},' for k, v in en_keys)
        content = content.replace(en_anchor, en_block + '\n' + en_anchor)
        print(f"OK: Added {len(en_keys)} keys to en block")
    else:
        print("WARNING: en anchor not found or keys already exist")

    with open(path, 'w') as f:
        f.write(content)
    return True


if __name__ == "__main__":
    print("=== FIX 1: Merge duplicate pt-BR blocks ===")
    r1 = fix_language_context()

    print("\n=== FIX 2: Fix AppErrorBoundary ===")
    r2 = fix_app_error_boundary()

    print("\n=== FIX 3: Add GameErrorBoundary to LiveHub ===")
    r3 = add_game_error_boundary()

    print("\n=== FIX 4: Clean up .broken/.bak files ===")
    r4 = cleanup_files()

    print("\n=== FIX 5: Add missing translation keys ===")
    r5 = add_game_translations()

    print("\n=== SUMMARY ===")
    for name, ok in [("pt-BR merge", r1), ("AppErrorBoundary", r2), ("GameErrorBoundary", r3), ("Cleanup", r4), ("Translations", r5)]:
        print(f"  {name}: {'OK' if ok else 'FAILED'}")
