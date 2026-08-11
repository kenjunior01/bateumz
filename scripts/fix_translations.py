#!/usr/bin/env python3
"""Fix the corrupted LanguageContext.tsx: remove misplaced ES keys from PT block,
add PT-BR regional keys, add ES keys to ES block."""

FILE = '/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx'

with open(FILE, 'r') as f:
    lines = f.readlines()

# 1. Remove the misplaced ES block from PT (lines 1550-1607, 0-indexed 1549-1606)
# Lines 1550-1607 contain ES translations starting with 'Panel del Gestor Regional'
misplaced_start = None
misplaced_end = None
for i, line in enumerate(lines):
    if '"regional.panel.title": "Panel del Gestor Regional"' in line:
        misplaced_start = i
    if misplaced_start is not None and '"regional.panel.createdOn": "Creado en",' in line:
        misplaced_end = i
        break

if misplaced_start and misplaced_end:
    del lines[misplaced_start:misplaced_end + 1]
    print(f"Removed misplaced ES keys from PT block: lines {misplaced_start+1}-{misplaced_end+1}")
else:
    print(f"Could not find misplaced ES keys: start={misplaced_start}, end={misplaced_end}")
    exit(1)

# Recalculate block boundaries after deletion
# Find block starts
blocks = {}
for i, line in enumerate(lines):
    for lang in ['en', 'pt', 'pt-BR', 'es', 'fr', 'hi']:
        if f'  {lang}: {{' in line or f'  "{lang}": {{' in line:
            blocks[lang] = i

print(f"Block starts: {blocks}")

# 2. Find PT-BR block end (before es: {)
ptbr_start = blocks.get('pt-BR')
es_start = blocks.get('es')

# 3. Find the closing brace of PT-BR block (last line before es: block that starts with '  },')
ptbr_end = es_start - 1
while ptbr_end > ptbr_start and lines[ptbr_end].strip() not in ['},', '},']:
    ptbr_end -= 1

print(f"PT-BR block ends at line {ptbr_end + 1}: {lines[ptbr_end].strip()}")

# 4. Prepare PT-BR keys to insert
ptbr_keys = [
    '',
    '    // ===== Regional Manager =====',
    '    "regional.title": "Gestor Regional",',
    '    "regional.dashboard": "Painel Regional",',
    '    "regional.managers": "Gestores",',
    '    "regional.addManager": "Adicionar Gestor",',
    '    "regional.removeManager": "Remover Gestor",',
    '    "regional.regions": "Regi\u00f5es",',
    '    "regional.regionsList": "Lista de Regi\u00f5es",',
    '    "regional.editRegion": "Editar Regi\u00e3o",',
    '    "regional.createRegion": "Criar Regi\u00e3o",',
    '    "regional.stats": "Estat\u00edsticas",',
    '    "regional.revenue": "Receita",',
    '    "regional.users": "Usu\u00e1rios",',
    '    "regional.activeLives": "Lives Ativas",',
    '    "regional.totalGames": "Total de Jogos",',
    '    "regional.performance": "Desempenho",',
    '    "regional.topRegions": "Top Regi\u00f5es",',
    '    "regional.managerName": "Nome do Gestor",',
    '    "regional.managerEmail": "Email do Gestor",',
    '    "regional.assignedRegions": "Regi\u00f5es Atribu\u00eddas",',
    '    "regional.noManagers": "Nenhum gestor ainda",',
    '    "regional.confirmRemove": "Tem certeza de que deseja remover este gestor?",',
    '    "regional.save": "Salvar",',
    '    "regional.cancel": "Cancelar",',
    '    "regional.name": "Nome",',
    '    "regional.description": "Descri\u00e7\u00e3o",',
    '    "regional.country": "Pa\u00eds",',
    '    "regional.currency": "Moeda",',
    '    "regional.language": "Idioma",',
    '    "regional.panel.title": "Painel do Gestor Regional",',
    '    "regional.panel.manageIndependently": "Gerencie sua regi\u00e3o de forma independente",',
    '    "regional.panel.seniorManager": "Gestor S\u00eanior",',
    '    "regional.panel.regionalManager": "Gestor Regional",',
    '    "regional.panel.regionCount": "{count} regi\u00e3o(\u00f5es)",',
    '    "regional.panel.refresh": "Atualizar",',
    '    "regional.panel.branding": "Branding",',
    '    "regional.panel.settings": "Configura\u00e7\u00f5es",',
    '    "regional.panel.nativeGames": "Jogos Nativos",',
    '    "regional.panel.announcements": "Comunicados",',
    '    "regional.panel.visualIdentity": "Identidade Visual da Regi\u00e3o",',
    '    "regional.panel.primaryColor": "Cor Prim\u00e1ria",',
    '    "regional.panel.secondaryColor": "Cor Secund\u00e1ria",',
    '    "regional.panel.accentColor": "Cor de Destaque",',
    '    "regional.panel.themeName": "Nome do Tema",',
    '    "regional.panel.logoUrl": "URL do Logo",',
    '    "regional.panel.bannerUrl": "URL do Banner",',
    '    "regional.panel.saveBranding": "Salvar Branding",',
    '    "regional.panel.saving": "Salvando...",',
    '    "regional.panel.brandingSaved": "Branding atualizado com sucesso!",',
    '    "regional.panel.brandingError": "Erro ao salvar branding",',
    '    "regional.panel.regionSettings": "Configura\u00e7\u00f5es da Regi\u00e3o",',
    '    "regional.panel.spinWheel": "Roleta de Pr\u00eamios",',
    '    "regional.panel.spinWheelDesc": "Permitir roleta de pr\u00eamios personalizada",',
    '    "regional.panel.millionaire": "Quem Quer Ser Milion\u00e1rio",',
    '    "regional.panel.millionaireDesc": "Jogo de perguntas com pr\u00eamios",',
    '    "regional.panel.challengeGames": "Jogos de Desafio",',
    '    "regional.panel.challengeGamesDesc": "Desafios entre usu\u00e1rios",',
    '    "regional.panel.liveGames": "Jogos ao Vivo",',
    '    "regional.panel.liveGamesDesc": "Lives interativas com jogos",',
    '    "regional.panel.maintenanceMode": "Modo de Manuten\u00e7\u00e3o",',
    '    "regional.panel.maintenanceDesc": "Desativar temporariamente a regi\u00e3o para usu\u00e1rios",',
    '    "regional.panel.saveSettings": "Salvar Configura\u00e7\u00f5es",',
    '    "regional.panel.settingsSaved": "Configura\u00e7\u00f5es salvas!",',
    '    "regional.panel.settingsError": "Erro ao salvar configura\u00e7\u00f5es",',
    '    "regional.panel.nativeGamesTitle": "Jogos Nativos da Regi\u00e3o",',
    '    "regional.panel.nativeGamesDesc": "Crie e gerencie jogos exclusivos para sua regi\u00e3o",',
    '    "regional.panel.createGame": "Criar Jogo",',
    '    "regional.panel.gameCreated": "Jogo criado! Configure abaixo.",',
    '    "regional.panel.gameCreateError": "Erro ao criar jogo",',
    '    "regional.panel.noGames": "Nenhum jogo nativo criado ainda.",',
    '    "regional.panel.noGamesHint": "Clique em Criar Jogo para come\u00e7ar.",',
    '    "regional.panel.active": "Ativo",',
    '    "regional.panel.inactive": "Inativo",',
    '    "regional.panel.configure": "Configurar",',
    '    "regional.panel.editorDev": "Editor de jogo em desenvolvimento",',
    '    "regional.panel.previewDev": "Visualiza\u00e7\u00e3o em desenvolvimento",',
    '    "regional.panel.newGame": "Novo Jogo {count}",',
    '    "regional.panel.announcementTitle": "Comunicado Regional",',
    '    "regional.panel.announcementActive": "Comunicado ativo",',
    '    "regional.panel.announcementActiveDesc": "Mostrar banner de comunicado no topo da p\u00e1gina",',
    '    "regional.panel.announcementText": "Texto do Comunicado",',
    '    "regional.panel.announcementSaved": "Comunicado atualizado!",',
    '    "regional.panel.announcementError": "Erro ao salvar comunicado",',
    '    "regional.panel.ctaLabel": "Texto do Bot\u00e3o CTA",',
    '    "regional.panel.ctaUrl": "URL do CTA",',
    '    "regional.panel.saveAnnouncement": "Salvar Comunicado",',
    '    "regional.panel.createdOn": "Criado em",',
]

# Insert PT-BR keys before the closing brace
for i, key_line in enumerate(ptbr_keys):
    lines.insert(ptbr_end + i, key_line + '\n')
print(f"Inserted {len(ptbr_keys)} PT-BR regional keys before line {ptbr_end + 1}")

# Recalculate es_start after insertion
es_start_new = es_start + len(ptbr_keys)

# 5. Find the last regional.language line in ES block and insert ES panel keys after it
es_lang_line = None
for i in range(es_start_new, len(lines)):
    if '"regional.language": "Idioma"' in lines[i]:
        es_lang_line = i
        break

if es_lang_line:
    es_panel_keys = [
        '    "regional.panel.title": "Panel del Gestor Regional",',
        '    "regional.panel.manageIndependently": "Gestiona tu regi\u00f3n de forma independiente",',
        '    "regional.panel.seniorManager": "Gestor Senior",',
        '    "regional.panel.regionalManager": "Gestor Regional",',
        '    "regional.panel.regionCount": "{count} regi\u00f3n(es)",',
        '    "regional.panel.refresh": "Actualizar",',
        '    "regional.panel.branding": "Branding",',
        '    "regional.panel.settings": "Configuraci\u00f3n",',
        '    "regional.panel.nativeGames": "Juegos Nativos",',
        '    "regional.panel.announcements": "Anuncios",',
        '    "regional.panel.visualIdentity": "Identidad Visual de la Regi\u00f3n",',
        '    "regional.panel.primaryColor": "Color Primario",',
        '    "regional.panel.secondaryColor": "Color Secundario",',
        '    "regional.panel.accentColor": "Color de Acento",',
        '    "regional.panel.themeName": "Nombre del Tema",',
        '    "regional.panel.logoUrl": "URL del Logo",',
        '    "regional.panel.bannerUrl": "URL del Banner",',
        '    "regional.panel.saveBranding": "Guardar Branding",',
        '    "regional.panel.saving": "Guardando...",',
        '    "regional.panel.brandingSaved": "Branding actualizado con \u00e9xito!",',
        '    "regional.panel.brandingError": "Error al guardar branding",',
        '    "regional.panel.regionSettings": "Configuraci\u00f3n de la Regi\u00f3n",',
        '    "regional.panel.spinWheel": "Rueda de Premios",',
        '    "regional.panel.spinWheelDesc": "Permitir ruleta de premios personalizada",',
        '    "regional.panel.millionaire": "Qui\u00e9n Quiere Ser Millonario?",',
        '    "regional.panel.millionaireDesc": "Juego de preguntas con premios",',
        '    "regional.panel.challengeGames": "Juegos de Desaf\u00edo",',
        '    "regional.panel.challengeGamesDesc": "Desaf\u00edos entre usuarios",',
        '    "regional.panel.liveGames": "Juegos en Vivo",',
        '    "regional.panel.liveGamesDesc": "Lives interactivas con juegos",',
        '    "regional.panel.maintenanceMode": "Modo de Mantenimiento",',
        '    "regional.panel.maintenanceDesc": "Desactivar temporalmente la regi\u00f3n para usuarios",',
        '    "regional.panel.saveSettings": "Guardar Configuraci\u00f3n",',
        '    "regional.panel.settingsSaved": "Configuraci\u00f3n guardada!",',
        '    "regional.panel.settingsError": "Error al guardar configuraci\u00f3n",',
        '    "regional.panel.nativeGamesTitle": "Juegos Nativos de la Regi\u00f3n",',
        '    "regional.panel.nativeGamesDesc": "Crea y gestiona juegos exclusivos para tu regi\u00f3n",',
        '    "regional.panel.createGame": "Crear Juego",',
        '    "regional.panel.gameCreated": "Juego creado! Configura abajo.",',
        '    "regional.panel.gameCreateError": "Error al crear juego",',
        '    "regional.panel.noGames": "Ning\u00fan juego nativo creado a\u00fan.",',
        '    "regional.panel.noGamesHint": "Haz clic en Crear Juego para empezar.",',
        '    "regional.panel.active": "Activo",',
        '    "regional.panel.inactive": "Inactivo",',
        '    "regional.panel.configure": "Configurar",',
        '    "regional.panel.editorDev": "Editor de juego en desarrollo",',
        '    "regional.panel.previewDev": "Vista previa en desarrollo",',
        '    "regional.panel.newGame": "Nuevo Juego {count}",',
        '    "regional.panel.announcementTitle": "Anuncio Regional",',
        '    "regional.panel.announcementActive": "Anuncio activo",',
        '    "regional.panel.announcementActiveDesc": "Mostrar banner de anuncio en la parte superior",',
        '    "regional.panel.announcementText": "Texto del Anuncio",',
        '    "regional.panel.announcementSaved": "Anuncio actualizado!",',
        '    "regional.panel.announcementError": "Error al guardar anuncio",',
        '    "regional.panel.ctaLabel": "Texto del Bot\u00f3n CTA",',
        '    "regional.panel.ctaUrl": "URL del CTA",',
        '    "regional.panel.saveAnnouncement": "Guardar Anuncio",',
        '    "regional.panel.createdOn": "Creado en",',
    ]
    for j, key_line in enumerate(es_panel_keys):
        lines.insert(es_lang_line + 1 + j, key_line + '\n')
    print(f"Inserted {len(es_panel_keys)} ES regional.panel keys after line {es_lang_line + 1}")
else:
    print("ES regional.language anchor not found!")

with open(FILE, 'w') as f:
    f.writelines(lines)

# Verify
import re
with open(FILE, 'r') as f:
    content = f.read()

langs = ['en', 'pt', 'pt-BR', 'es', 'fr', 'hi']
keys_by_lang = {l: set() for l in langs}
file_lines = content.split('\n')
current_lang = None

for line in file_lines:
    for lang in langs:
        if f'{lang}: {{' in line or f'{lang}:{{' in line:
            current_lang = lang
            break
    if current_lang and 'regional.' in line and '"' in line:
        key_match = re.search(r'"(regional\.[^"]+)"', line)
        if key_match:
            keys_by_lang[current_lang].add(key_match.group(1))

en_keys = keys_by_lang['en']
print(f'\nVerification:')
print(f'EN regional keys: {len(en_keys)}')
for lang in langs[1:]:
    missing = en_keys - keys_by_lang[lang]
    print(f'{lang}: {len(keys_by_lang[lang])} keys, missing {len(missing)}')
    if missing:
        for k in sorted(missing)[:5]:
            print(f'  - {k}')
        if len(missing) > 5:
            print(f'  ... and {len(missing)-5} more')
