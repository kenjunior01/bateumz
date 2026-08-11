import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, KeepTogether, HRFlowable,
                                 ListFlowable, ListItem)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

# ============================================================
# FONTS
# ============================================================
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Oblique', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Oblique.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold', italic='DejaVuSans-Oblique')

# ============================================================
# PALETTE (Cascade - Warm Olive)
# ============================================================
PAGE_BG       = colors.HexColor('#f7f7f6')
SECTION_BG    = colors.HexColor('#eeedeb')
CARD_BG       = colors.HexColor('#ededea')
TABLE_STRIPE  = colors.HexColor('#f4f3f1')
HEADER_FILL   = colors.HexColor('#5c5339')
COVER_BLOCK   = colors.HexColor('#6d6344')
BORDER        = colors.HexColor('#c2baa3')
ICON          = colors.HexColor('#85723b')
ACCENT        = colors.HexColor('#a68932')
ACCENT_2      = colors.HexColor('#5c43a7')
TEXT_PRIMARY   = colors.HexColor('#252421')
TEXT_MUTED     = colors.HexColor('#7e7b74')
SEM_SUCCESS   = colors.HexColor('#4d8961')
SEM_WARNING   = colors.HexColor('#b48f45')
SEM_ERROR     = colors.HexColor('#a74d45')
SEM_INFO      = colors.HexColor('#4d6c8a')

# ============================================================
# STYLES
# ============================================================
W, H = A4
LEFT_M = 22*mm
RIGHT_M = 22*mm
TOP_M = 25*mm
BOT_M = 25*mm
CONTENT_W = W - LEFT_M - RIGHT_M

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    'CoverTitle', fontName='DejaVuSans-Bold', fontSize=28, leading=34,
    textColor=colors.white, alignment=TA_LEFT, spaceAfter=6*mm
))
styles.add(ParagraphStyle(
    'CoverSubtitle', fontName='DejaVuSans', fontSize=14, leading=20,
    textColor=colors.HexColor('#d4d0c8'), alignment=TA_LEFT, spaceAfter=4*mm
))
styles.add(ParagraphStyle(
    'CoverMeta', fontName='DejaVuSans', fontSize=10, leading=14,
    textColor=colors.HexColor('#b0a890'), alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'H1', fontName='DejaVuSans-Bold', fontSize=20, leading=26,
    textColor=HEADER_FILL, spaceBefore=10*mm, spaceAfter=5*mm
))
styles.add(ParagraphStyle(
    'H2', fontName='DejaVuSans-Bold', fontSize=14, leading=19,
    textColor=ACCENT, spaceBefore=7*mm, spaceAfter=3*mm
))
styles.add(ParagraphStyle(
    'H3', fontName='DejaVuSans-Bold', fontSize=11, leading=15,
    textColor=ICON, spaceBefore=5*mm, spaceAfter=2*mm
))
styles.add(ParagraphStyle(
    'Body', fontName='DejaVuSans', fontSize=9.5, leading=14.5,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=3*mm
))
styles.add(ParagraphStyle(
    'BodyIndent', fontName='DejaVuSans', fontSize=9.5, leading=14.5,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=2*mm,
    leftIndent=8*mm
))
styles.add(ParagraphStyle(
    'BulletItem', fontName='DejaVuSans', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=1.5*mm,
    leftIndent=12*mm, bulletIndent=6*mm, bulletFontSize=9
))
styles.add(ParagraphStyle(
    'CriticalLabel', fontName='DejaVuSans-Bold', fontSize=9.5, leading=14,
    textColor=SEM_ERROR, spaceAfter=1*mm
))
styles.add(ParagraphStyle(
    'WarningLabel', fontName='DejaVuSans-Bold', fontSize=9.5, leading=14,
    textColor=SEM_WARNING, spaceAfter=1*mm
))
styles.add(ParagraphStyle(
    'SuccessLabel', fontName='DejaVuSans-Bold', fontSize=9.5, leading=14,
    textColor=SEM_SUCCESS, spaceAfter=1*mm
))
styles.add(ParagraphStyle(
    'TableHeader', fontName='DejaVuSans-Bold', fontSize=8.5, leading=11,
    textColor=colors.white, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'TableCell', fontName='DejaVuSans', fontSize=8, leading=11,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT
))
styles.add(ParagraphStyle(
    'TableCellCenter', fontName='DejaVuSans', fontSize=8, leading=11,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'Footer', fontName='DejaVuSans', fontSize=7.5, leading=10,
    textColor=TEXT_MUTED, alignment=TA_CENTER
))
styles.add(ParagraphStyle(
    'TOCEntry', fontName='DejaVuSans', fontSize=10, leading=18,
    textColor=TEXT_PRIMARY, leftIndent=0
))
styles.add(ParagraphStyle(
    'TOCEntry2', fontName='DejaVuSans', fontSize=9, leading=16,
    textColor=TEXT_MUTED, leftIndent=12*mm
))

# ============================================================
# HELPERS
# ============================================================
def P(text, style='Body'):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph(f"\u2022  {text}", styles['BulletItem'])

def make_table(headers, rows, col_widths=None):
    cw = col_widths or [CONTENT_W / len(headers)] * len(headers)
    header_row = [P(h, 'TableHeader') for h in headers]
    data = [header_row]
    for row in rows:
        data.append([P(str(c), 'TableCell') for c in row])
    t = Table(data, colWidths=cw, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def section_line():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=4*mm, spaceBefore=2*mm)

def score_bar(label, score, max_score=10):
    pct = score / max_score
    bar_w = 60 * mm
    filled = bar_w * pct
    empty = bar_w - filled
    tbl = Table(
        [[P(label, 'Body'), P(f'<font color="{SEM_SUCCESS.hexval() if pct >= 0.7 else SEM_WARNING.hexval() if pct >= 0.5 else SEM_ERROR.hexval()}">{score}/{max_score}</font>', 'TableCell')]],
        colWidths=[CONTENT_W - 70*mm, 70*mm]
    )
    tbl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    return tbl

# ============================================================
# PAGE DECORATORS
# ============================================================
def page_footer(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont('DejaVuSans', 7.5)
    canvas_obj.setFillColor(TEXT_MUTED)
    canvas_obj.drawCentredString(W / 2, 12*mm, f"Relatorio de Analise - bateu.online  |  Pagina {doc.page}")
    canvas_obj.restoreState()

def first_page(canvas_obj, doc):
    pass

# ============================================================
# CONTENT
# ============================================================
story = []

# --- CHAPTER 1: RESUMO EXECUTIVO ---
story.append(P("1. Resumo Executivo", 'H1'))
story.append(section_line())
story.append(P(
    "Este relatorio apresenta uma analise abrangente da plataforma bateu.online, "
    "um sistema web de rifas, jogos ao vivo e entretenimento interactivo "
    "voltado para o mercado mocambicano e africano. A analise abrange a revisao "
    "completa do codigo-fonte (React + TypeScript + Supabase), o teste do site "
    "em producao, a avaliacao de todos os 68 jogos disponiveis, os fluxos de "
    "registo para diferentes tipos de utilizadores, e a identificacao de "
    "vulnerabilidades de seguranca, problemas de arquitectura e oportunidades "
    "de melhoria. O projecto demonstra ambicao tecnica impressionante com uma "
    "quantidade significativa de funcionalidades, mas enfrenta desafios criticos "
    "em seguranca, consistencia de dados e maturidade do backend que precisam "
    "de ser enderecados antes de uma operacao em escala comercial."
))

story.append(P("1.1 Metodologia de Analise", 'H2'))
story.append(P(
    "A analise foi conduzida em tres frentes paralelas: (1) revisao exaustiva do codigo-fonte, "
    "abrangendo todos os ficheiros em src/pages/, src/components/, src/contexts/, src/lib/ e "
    "src/integrations/, num total de mais de 200 ficheiros analisados; (2) teste do site em "
    "producao (bateu.online) em 7 paginas distintas, verificando carregamento, funcionalidades, "
    "SEO, responsividade mobile e erros de consola; (3) analise detalhada de 17 componentes "
    "de jogos representativos dos 68 jogos disponiveis na plataforma, avaliando logica de "
    "jogo, qualidade de IA, seguranca e padroes de codigo. Cada jogo foi classificado em "
    "termos de qualidade de IA, funcionalidade multiplayer e conformidade com boas praticas."
))

story.append(P("1.2 Visao Geral da Plataforma", 'H2'))
story.append(P(
    "A plataforma bateu.online e uma aplicacao SPA (Single Page Application) construida com "
    "Vite, React 18, TypeScript, TailwindCSS e shadcn/ui, utilizando Supabase como backend "
    "e provedor de autenticacao. O site esta deployed e acessivel em https://bateu.online com "
    "certificado SSL valido, PWA (Progressive Web App) configurada, e tempo de carregamento "
    "inferior a 500ms. A plataforma suporta 6 idiomas (ingles, portugues, portugues-brasileiro, "
    "espanhol, frances e hindi) e opera em 7 paises (Mocambique, Angola, Portugal, Brasil, "
    "Estados Unidos, Canada e India). O sistema de autenticacao suporta 5 perfis de "
    "utilizador: user, business, admin, superadmin e regional_manager, cada um com "
    "funcionalidades e painéis dedicados."
))

story.append(P("1.3 Classificacao Global", 'H2'))
story.append(P(
    "A tabela seguinte apresenta a classificacao global da plataforma nas principais "
    "dimensoes avaliadas. Estas pontuacoes reflectem o estado actual do codigo "
    "em producao e do site ao vivo, considerando factores como seguranca, "
    "performance, qualidade de codigo, experiencia do utilizador e maturidade "
    "do produto. A pontuacao global ponderada de 5.6/10 indica que a plataforma "
    "esta num estado funcional mas requer trabalho significativo antes de estar "
    "pronta para operacao comercial em grande escala."
))

classification_data = [
    ['Seguranca', '3.0/10', 'Critica - Logica de jogo no cliente, RBAC apenas no frontend'],
    ['Performance', '8.5/10', 'Excelente - <500ms carregamento, PWA configurada'],
    ['Qualidade de Codigo', '5.5/10', 'Media - God-components, `as any` pervasivo, sem testes'],
    ['UX / Design', '7.5/10', 'Bom - UI polida com Framer Motion, dark mode, responsivo'],
    ['Arquitectura', '5.0/10', 'Media - Monolito SPA, sem separacao de concerns nos jogos'],
    ['Backend / API', '4.0/10', 'Fraco - Tabelas em falta, erros 404, dados estaticos'],
    ['SEO', '3.5/10', 'Fraco - Meta tags identicas, sem dados estruturados'],
    ['i18n', '5.0/10', 'Media - 6 idiomas mas mistura EN/PT inconsistente'],
    ['Testes', '0.5/10', 'Critico - Zero testes de jogo, apenas 1 teste de exemplo'],
    ['Maturidade do Produto', '5.0/10', 'Media - Muitas funcionalidades, poucas operacionais'],
]
story.append(make_table(
    ['Dimensao', 'Pontuacao', 'Observacao'],
    classification_data,
    [35*mm, 22*mm, CONTENT_W - 57*mm]
))
story.append(Spacer(1, 4*mm))
story.append(P(
    "<b>Pontuacao Global Ponderada: 5.6 / 10</b> - A plataforma demonstra potencial "
    "significativo e ambicao tecnica, mas enfrenta problemas criticos de seguranca e "
    "maturidade de backend que precisam de ser priorizados. A experiencia visual e de "
    "navegacao e notavelmente polida para o estagio actual de desenvolvimento, sugerindo "
    "um investimento forte em design frontend. No entanto, a ausencia de validacao "
    "server-side para operacoes criticas como sorteios e pontuacao de jogos representa "
    "um risco operativo inaceitavel para uma plataforma que envolve transaccoes "
    "financeiras e premios reais."
))

# --- CHAPTER 2: ARQUITECTURA TECNICA ---
story.append(PageBreak())
story.append(P("2. Arquitectura Tecnica", 'H1'))
story.append(section_line())

story.append(P("2.1 Stack Tecnologico", 'H2'))
story.append(P(
    "A plataforma bateu.online utiliza um stack moderno e coerente para uma aplicacao "
    "SPA. O frontend e construido com Vite 5.4 como bundler, React 18.3 com TypeScript "
    "5.7 para a camada de UI, TailwindCSS 3.4 com shadcn/ui para estilizacao, e "
    "Framer Motion 12.35 para animacoes. O backend e inteiramente suportado pelo "
    "Supabase (v2.99), que fornece autenticacao, base de dados PostgreSQL, "
    "armazenamento de ficheiros e (teoricamente) funcionalidades realtime. A gestao "
    "de estado e feita atraves de React Context para temas, idioma, autenticacao e "
    "configuracao regional, complementada por TanStack React Query para cache "
    "de dados. O projecto inclui integracoes com PayPal, Stripe, Google Analytics e "
    "suporte a PWA via vite-plugin-pwa."
))

tech_data = [
    ['Vite', '5.4.19', 'Bundler / Dev Server', 'Producao'],
    ['React', '18.3.1', 'UI Framework', 'Producao'],
    ['TypeScript', '5.7.3', 'Type Safety', 'Producao'],
    ['TailwindCSS', '3.4.17', 'Utility-first CSS', 'Producao'],
    ['shadcn/ui', 'N/A', 'Component Library', 'Producao'],
    ['Supabase', '2.99.0', 'Backend / Auth / DB', 'Producao'],
    ['Framer Motion', '12.35.2', 'Animations', 'Producao'],
    ['React Router', '6.30.1', 'Client Routing', 'Producao'],
    ['TanStack Query', '5.83.0', 'Data Cache', 'Producao'],
    ['PayPal SDK', '9.2.0', 'Payments', 'Producao'],
    ['Stripe.js', '9.12.0', 'Payments', 'Producao'],
    ['Recharts', '2.15.4', 'Charts', 'Producao'],
    ['react-helmet-async', '3.0.0', 'SEO Meta Tags', 'Producao'],
    ['vite-plugin-pwa', '1.2.0', 'PWA Support', 'Producao'],
    ['Vitest', '3.2.4', 'Testing', 'DevDependencies'],
]
story.append(make_table(
    ['Tecnologia', 'Versao', 'Funcao', 'Status'],
    tech_data,
    [35*mm, 22*mm, 45*mm, CONTENT_W - 102*mm]
))

story.append(P("2.2 Estrutura de Directories", 'H2'))
story.append(P(
    "O projecto segue uma estrutura de directories tipica de aplicacoes React "
    "de media-grande porte, com separacao clara entre paginas, componentes, "
    "contextos, hooks, layouts e bibliotecas utilitarias. O directorio src/ "
    "contem aproximadamente 270 ficheiros TSX/TS organizados nas seguintes "
    "categorias principais: 50+ paginas em src/pages/ (incluindo subdirectorios "
    "para admin, dashboard, esports, tournaments, leagues e games), 80+ componentes "
    "de jogos em src/components/livegames/, 30+ componentes de UI genericos em "
    "src/components/ui/ (gerados pelo shadcn/ui), 7 contextos React em "
    "src/contexts/, 7 hooks personalizados em src/hooks/, e 20+ modulos "
    "utilitarios em src/lib/. A profundidade maxima da arvore de directorios e de "
    "4 niveis, o que e razoavel para o tamanho do projecto, embora a ausencia "
    "de agrupamento por dominio de negocio torne a navegacao menos intuitiva."
))

story.append(P("2.3 Sistema de Roteamento", 'H2'))
story.append(P(
    "A aplicacao define aproximadamente 80 rotas no componente App.tsx, organizadas "
    "em tres grupos principais: rotas publicas (homepage, login, registo, marketplace, "
    "jogos, blog, FAQ, etc.), rotas protegidas para utilizadores autenticados "
    "(/profile, /my-tickets, /wallet), rotas de dashboard para empresas "
    "(/dashboard/* com 25+ sub-rotas), e rotas de administracao (/admin/* com "
    "21+ sub-rotas). O sistema de proteccao de rotas e implementado pelo componente "
    "ProtectedRoute, que verifica o papel do utilizador no AuthContext e redireciona "
    "conforme necessario. As rotas de esports sao aninhadas sob /esports com "
    "sub-rotas proprias. Todas as rotas sao envolvidas por AnimatePresence do "
    "Framer Motion para transicoes de pagina suaves, e o conteudo e renderizado "
    "dentro de PageTransition para animacoes de entrada e saida."
))

story.append(P("2.4 Sistema de Autenticacao e RBAC", 'H2'))
story.append(P(
    "O sistema de autenticacao e gerido pelo AuthContext, que utiliza o Supabase Auth "
    "para gestao de sessoes e autenticacao OAuth (Google e Apple). O contexto "
    "expoe o utilizador actual, sessao, perfil, papel (role) e paises de administracao. "
    "O sistema de papeis (RBAC) suporta 5 niveis: superadmin (acesso total), admin "
    "(gestao da plataforma), regional_manager (gestao regional), business (empresas "
    "com sorteios proprios) e user (participante comum). A resolucao de papeis segue "
    "uma hierarquia de prioridade: superadmin > admin > regional_manager > business > user. "
    "O perfil do utilizador e armazenado na tabela profiles, enquanto os papeis sao "
    "geridos na tabela user_roles (relacao many-to-many). Um ponto importante e "
    "que o registo de contas OAuth (Google/Apple) cria automaticamente um perfil basico "
    "quando o utilizador nao passa pelo fluxo de registo tradicional, garantindo que "
    "todos os utilizadores autenticados tem um perfil associado."
))

rbac_data = [
    ['superadmin', 'Acesso total a plataforma', '/admin/*', 'Gerir regioes, co-fundadores, configuracao global'],
    ['admin', 'Gestao da plataforma', '/admin/*', 'Utilizadores, rifas, pagamentos, auditoria'],
    ['regional_manager', 'Gestao regional', '/regional-panel', 'Branding, definicoes, anuncios regionais'],
    ['business', 'Painel de empresa', '/dashboard/*', 'Criar rifas, analytics, lives, jogos'],
    ['user', 'Participante', '/profile, /jogos', 'Comprar bilhetes, jogar, ver resultados'],
]
story.append(make_table(
    ['Papel', 'Descricao', 'Rotas', 'Funcionalidades Principais'],
    rbac_data,
    [28*mm, 30*mm, 30*mm, CONTENT_W - 88*mm]
))

# --- CHAPTER 3: ANALISE DOS JOGOS ---
story.append(PageBreak())
story.append(P("3. Analise do Catalogo de Jogos", 'H1'))
story.append(section_line())

story.append(P("3.1 Visao Geral do Catalogo", 'H2'))
story.append(P(
    "A plataforma bateu.online possui um catalogo impressionante de 68 jogos, "
    "organizados em 17 categorias que incluem Estrategia (9 jogos), Arcade (8), "
    "Puzzle (10), Reflexo (6), Quiz (6), Sorte (6), Social (8), Palavras (2), "
    "Cartas (1), e categorias regionais como Mocambicano (4) e Indiano (3). "
    "Os jogos cobrem uma diversidade notavel de generos: desde jogos classicos como "
    "Xadrez, Damas, Dominos e Ludo, ate jogos culturais mocambicanos como "
    "Chigogo, Mexerica e Capulana Quiz, passando por jogos indianos como Teen Patti "
    "e Kabaddi Raid. A maioria dos jogos (22) suporta modo Bot IA com 3 niveis "
    "de dificuldade, enquanto outros oferecem modos 1v1 local, solo, ou multiplayer."
))

category_data = [
    ['Estrategia', '9', 'TicTacToe PRO, Ligar 4, Xadrez, Damas, Dominos, Ludo, Carrom, Uno, Match 4'],
    ['Arcade', '8', 'Cobra, Flappy Bird, Fruta Ninja, Space Shooter, Tower Stack, Ball Breaker, Cannon Battle, Pong VS'],
    ['Puzzle', '10', 'Memoria VS, Memoria de Padroes, 2048, Palavras Embaralhadas, Sequencia de Cores, Word Chain, Spot Difference, Kahoot, Target Tap, Color Catch'],
    ['Reflexo', '6', 'Pedra Papel Tesoura, Corrida de Reaccao, Velocidade de Reaccao, Tap Battle, Color Match, Speed Reaction'],
    ['Quiz', '6', 'Quem Quer Ser Milionario, Trivia Flash, Quiz Battle, Batalha de Conhecimento, Capulana Quiz, Quick Math'],
    ['Sorte', '6', 'Roda da Fortuna, Slots VS, Caca-Niqueis VS, Mystery Box, Challenge Roulette, Punishment Wheel'],
    ['Social', '8', 'Verdade ou Desafio, Hot Potato, Never Have I Ever, Hot Seat, Emoji Battle, Guess the Emoji, Talent Battle, Chaos Challenge'],
    ['Mocambicano', '4', 'Chigogo, Mexerica, Uri, Djikota'],
    ['Indiano', '3', 'Teen Patti, Kabaddi Raid, Carrom'],
]
story.append(make_table(
    ['Categoria', 'Qtd', 'Jogos'],
    category_data,
    [25*mm, 12*mm, CONTENT_W - 37*mm]
))

story.append(P("3.2 Qualidade da IA (Bot)", 'H2'))
story.append(P(
    "A qualidade da inteligencia artificial nos jogos varia drasticamente entre titulos. "
    "A analise detalhada de 17 componentes de jogos revelou uma classificacao em "
    "tres niveis de qualidade. No topo estao jogos com IA forte que implementam "
    "algoritmos proprios de busca e avaliacao: Connect Four utiliza minimax com poda "
    "alpha-beta a profundidade 6 no modo dificil, sendo a melhor IA da plataforma; "
    "Xadrez implementa minimax com avaliacao posicional completa incluindo "
    "roque, en passant e promocao de peoes; Snake Battle usa BFS (busca em largura) "
    "para encontrar caminho ate a comida com variantes que evitam zonas de perigo; "
    "e Batalha Naval utiliza um mapa de densidade de probabilidade para escolher "
    "os melhores alvos. No nivel medio estao jogos como Damas (avaliacao heuristica "
    "com lookahead de 1 ply) e Carrom (fisica com offsets aleatorios). No nivel "
    "mais fraco estao jogos como Dominos (joga a peca de maior valor, sem estrategia), "
    "Teen Patti (decisoes puramente aleatorias) e UnoCardGame (joga a primeira carta "
    "valida encontrada). O Ludo nao possui modo bot, sendo apenas hot-seat local."
))

ai_data = [
    ['Connect Four', '5/5', 'Minimax + alpha-beta, profundidade 6, avaliacao posicional completa'],
    ['Xadrez', '4/5', 'Minimax + alpha-beta, 2 ply, roque, en passant, promocao'],
    ['Snake Battle', '4/5', 'BFS pathfinding, evita perigo, configuravel por dificuldade'],
    ['Batalha Naval', '4/5', 'Mapa de probabilidade, boost em celulas adjacentes a acertos'],
    ['Damas', '3/5', 'Avaliacao heuristica, 1 ply lookahead no modo dificil'],
    ['Carrom', '3/5', 'Fisica com offsets aleatorios para simular erro humano'],
    ['Dominos', '2/5', 'Joga peca de maior valor, sem estrategia avancada'],
    ['Teen Patti', '2/5', 'Decisoes aleatorias com thresholds por ronda'],
    ['Uno', '2/5', 'Primeira carta valida, sem estrategia visivel'],
    ['Ludo', 'N/A', 'Sem modo bot - apenas multiplayer local (hot-seat)'],
]
story.append(make_table(
    ['Jogo', 'Qualidade', 'Tecnica de IA'],
    ai_data,
    [28*mm, 18*mm, CONTENT_W - 46*mm]
))

story.append(P("3.3 Arquitectura Multiplayer", 'H2'))
story.append(P(
    "Apesar do directorio dos jogos se chamar 'livegames', a realidade e que "
    "aproximadamente 95% dos jogos funcionam exclusivamente em modo local "
    "(single-player contra bot ou multiplayer hot-seat no mesmo dispositivo). "
    "Apenas dois jogos implementam verdadeiro multiplayer em tempo real atraves "
    "do Supabase Realtime: o LiveBingo (com subscrições a canais do Supabase para "
    "criar sala, marcar numeros e verificar bingo) e o KahootMultiplayerQuiz "
    "(com RPCs para criar quiz, submeter respostas e obter leaderboard). Todos os "
    "demais jogos aceitam uma propriedade liveCode que teoricamente identificadoria "
    "uma sessao multiplayer, mas esta propriedade e recebida e nunca utilizada "
    "na maioria dos componentes, sendo essencialmente um prop morto. Os resultados "
    "dos jogos sao comunicados ao componente pai atraves de um callback onScore(name, score), "
    "mas apenas 3 jogos (SpinWheel, Millionaire e Bingo) persistem resultados "
    "directamente no Supabase. Os restantes jogos tem pontuacao efemera que se perde "
    "ao recarregar a pagina, tornando impossivel manter rankings ou historico "
    "significativo."
))

story.append(P("3.4 Problemas de Codigo nos Jogos", 'H2'))
story.append(P(
    "A analise de codigo revelou varios problemas recorrentes nos componentes de jogos. "
    "Em termos de arquitectura, os ficheiros sao excessivamente grandes (800-1140 linhas) "
    "com logica de jogo e renderizacao misturadas no mesmo componente, sem custom hooks "
    "ou separacao de concerns. Componentes como UnoCardGame acumulam 14+ variaveis de "
    "estado useState sem usar useReducer, e nao existe nenhum teste unitario para "
    "logica de jogo em todo o directorio. Um bug critico foi encontrado no "
    "GameHistoryPanel onde a contagem de vitorias esta incorrecta: a condicao utiliza "
    "OR (||) em vez de AND, fazendo com que praticamente todos os resultados "
    "sejam contados como vitorias. Jogos de fisica como CarromBoard e LudoGame usam "
    "dimensoes fixas em pixels que nao sao responsivas, causando overflow em ecras "
    "moveis. O CarromBoard actualiza estado React a 60fps via requestAnimationFrame, "
    "causando re-renderizacoes massivas que podem degradar a performance em "
    "dispositivos mais lentos. A pontuacao nao e normalizada entre jogos (alguns "
    "atribuem 50 pontos por vitoria, outros 100 ou 200), tornando comparacoes de "
    "leaderboard semanticamente meaningless."
))

# --- CHAPTER 4: SEGURANCA ---
story.append(PageBreak())
story.append(P("4. Analise de Seguranca", 'H1'))
story.append(section_line())

story.append(P("4.1 Vulnerabilidades Criticas", 'H2'))
story.append(P("<b>[CRITICO] Sorteio no Cliente - DashboardRaffles.tsx</b>", 'CriticalLabel'))
story.append(P(
    "O sorteio de rifas e executado inteiramente no lado do cliente usando Math.random(). "
    "O componente DashboardRaffles.handleDraw selecciona o vencedor no navegador do "
    "utilizador, sem qualquer validacao server-side. Isto significa que um administrador "
    "mal-intencionado (ou um atacante que comprometa a conta) pode manipular o resultado "
    "do sorteio atraves do DevTools do browser, alterando o estado do React antes "
    "da selecao. Para uma plataforma que envolve dinheiro real e premios fisicos, "
    "esta e uma vulnerabilidade inaceitavel. O sorteio deveria ser executado por uma "
    "funcao SQL do Supabase ou por uma Edge Function que garanta a aleatoriedade "
    "e a impossibilidade de manipulacao. Apenas assim os participantes poderiam "
    "confiar na integridade dos resultados."
))

story.append(P("<b>[CRITICO] Validacao de Pontuacao no Cliente - Todos os Jogos</b>", 'CriticalLabel'))
story.append(P(
    "Todos os 68 jogos comunicam os resultados atraves do callback onScore(name, score), "
    "que e aceite pelo componente pai sem qualquer validacao. Um utilizador pode "
    "abrir a consola do browser e invocar directivamente onScore com uma pontuacao "
    "arbitraria, como onScore('hacker', 999999). Nao existe nenhuma validacao "
    "server-side que verifique se a pontuacao reportada corresponde ao resultado "
    "real do jogo. Para jogos que envolvem apostas ou ranking competitivo, isto "
    "representa um vector de trapaça trivialmente exploravel. A solucao seria "
    "implementar logica de jogo server-side (pelo menos para validacao de "
    "resultados) e usar assinaturas criptograficas para garantir que os resultados "
    "nao foram alterados em transito."
))

story.append(P("<b>[CRITICO] RBAC Apenas no Frontend</b>", 'CriticalLabel'))
story.append(P(
    "Todo o sistema de controlo de acesso baseado em papeis (RBAC) e implementado "
    "exclusivamente no frontend React. O componente ProtectedRoute verifica o papel "
    "do utilizador no AuthContext e redireciona conforme necessario, mas nao existe "
    "nenhuma verificacao server-side. Se as politicas RLS (Row Level Security) do "
    "Supabase nao estiverem correctamente configuradas para cada tabela, qualquer "
    "utilizador autenticado pode aceder directamente aos dados atraves do cliente "
    "Supabase, contornando completamente as proteccoes do frontend. A unica defesa "
    "real contra acesso nao autorizado sao as politicas RLS, e uma auditoria completa "
    "dessas politicas e urgentemente necessaria para verificar se todas as tabelas "
    "sensíveis (pagamentos, utilizadores, auditoria) estao devidamente protegidas."
))

story.append(P("4.2 Vulnerabilidades de Media-Alta Prioridade", 'H2'))
story.append(P("<b>[ALTO] Vazamento de Dados em Paginas Superadmin</b>", 'WarningLabel'))
story.append(P(
    "As paginas AdminCoFounders, AdminRegionalRevenue e AdminSuperDashboard carregam "
    "todos os seus dados do Supabase antes de verificar se o utilizador tem o papel "
    "de superadmin. A verificacao de papel e feita num useEffect apos os dados "
    "terem sido ja buscados, o que significa que um admin que aceda directamente "
    "a URL /admin/co-founders tera todos os dados de co-fundadores carregados na "
    "memoria JavaScript antes de ser redirecionado. Embora os dados nao sejam "
    "renderizados, permanecem acessiveis na memoria do browser. A solucao e "
    "verificar o papel antes de qualquer chamada a dados, idealmente no nivel do "
    "ProtectedRoute com um requiredRole especifico para superadmin."
))

story.append(P("<b>[ALTO] Embaralhamento de Cartas com Math.random()</b>", 'WarningLabel'))
story.append(P(
    "Todos os jogos de cartas (Uno, Teen Patti, Dominos) utilizam Math.random() para "
    "embaralhar as cartas. Este metodo nao e criptograficamente seguro e pode ser "
    "teoricamente previsto por um atacante sofisticado que conheca a semente. Para "
    "jogos que envolvem dinheiro real, deveria ser utilizado crypto.getRandomValues() "
    "ou um PRNG criptograficamente seguro fornecido pelo Supabase. Embora a "
    "exploracao pratica seja dificil, o principio de utilizar geradores aleatorios "
    "seguros e fundamental em plataformas de jogos com apostas."
))

story.append(P("<b>[MEDIO] Tabuleiro do Adversario Visivel - Batalha Naval</b>", 'WarningLabel'))
story.append(P(
    "No BattleshipGame, o estado p2Board (tabuleiro do jogador 2) existe inteiramente "
    "no lado do cliente, incluindo as posicoes de todos os navios inimigos. Um "
    "jogador pode abrir o React DevTools e ler o tabuleiro completo do adversario, "
    "revelando a posicao de cada navio. Este problema e inerente a qualquer jogo "
    "que execute logica de ambos os jogadores no mesmo browser, e so pode ser "
    "resolvido com uma arquitectura verdadeiramente server-side onde cada jogador "
    "apenas recebe informacao sobre o seu proprio tabuleiro e os ataques "
    "recebidos."
))

story.append(P("4.3 Outras Questoes de Seguranca", 'H2'))
security_extra = [
    ['Conteudo XSS em Quiz', 'MEDIO', 'O KahootMultiplayerQuiz aceita perguntas de utilizadores que sao inseridas sem sanitizacao. Se renderizadas noutro componente sem escape, podem causar XSS.'],
    ['liveCode Cosmetico', 'BAIXO', 'A propriedade liveCode e aceite por todos os jogos mas nunca validada server-side. Funciona apenas como identificador visual.'],
    ['API Keys em Plain Text', 'MEDIO', 'O AdminSettings guarda chaves de API de pagamento (PayPal, Stripe) como texto JSON na tabela platform_settings, sem indicador de encriptacao.'],
    ['Sem 2FA para Admins', 'ALTO', 'Contas de admin e superadmin nao requerem autenticacao de dois factores, apesar de terem acesso a dados financeiros e operacoes criticas.'],
    ['Sem Rate Limiting', 'MEDIO', 'Nao existe rate limiting visivel em accoes de admin como alteracoes de papel, aprovacao de pagamentos ou eliminacao de rifas.'],
]
story.append(make_table(
    ['Questao', 'Severidade', 'Descricao'],
    security_extra,
    [35*mm, 20*mm, CONTENT_W - 55*mm]
))

# --- CHAPTER 5: ANALISE DO SITE AO VIVO ---
story.append(PageBreak())
story.append(P("5. Analise do Site em Producao", 'H1'))
story.append(section_line())

story.append(P("5.1 Performance e Infraestrutura", 'H2'))
story.append(P(
    "O site bateu.online demonstra excelente performance em producao. O tempo "
    "medio de carregamento e de aproximadamente 400ms (DOM Content Loaded: 397ms, "
    "Full Load: 427ms), o que esta bem dentro dos limites recomendados para "
    "experiencia de utilizador. A aplicacao esta correctamente servida sobre "
    "HTTPS com certificado SSL valido, e o bundle JavaScript principal "
    "(index-CVnr2fpu.js) e gerado pelo Vite com optimizacoes de producao. A "
    "plataforma esta configurada como PWA (Progressive Web App) com manifesto "
    "completo, service worker registado, icones de 192x192 e 512x512 pixels, "
    "e meta tag de exibicao em modo standalone com orientacao portrait. A PWA "
    "esta pronta para instalacao em dispositivos moveis, o que e um ponto "
    "positivo significativo para o mercado africano onde muitos utilizadores "
    "accedem a internet primariamente por telemovel."
))

perf_data = [
    ['DOM Content Loaded', '397 ms', 'Excelente - abaixo do limiar de 500ms'],
    ['Full Page Load', '427 ms', 'Excelente - abaixo do limiar de 1000ms'],
    ['SSL/HTTPS', 'Activo', 'Certificado SSL valido em todas as paginas'],
    ['PWA Manifest', 'Completo', '3 icones, display standalone, portrait'],
    ['Service Worker', 'Registado', 'vite-plugin-pwa com estrategia de cache'],
    ['Viewport Meta', 'Configurado', 'width=device-width, initial-scale=1.0'],
    ['Bundle JS', '1 ficheiro', 'Vite-built, optimizado para producao'],
    ['CSS', '1 ficheiro', 'TailwindCSS compilado, purged'],
    ['Console Errors (JS)', '0 erros', 'Nenhum erro JavaScript em nenhuma pagina testada'],
]
story.append(make_table(
    ['Metrica', 'Valor', 'Avaliacao'],
    perf_data,
    [40*mm, 30*mm, CONTENT_W - 70*mm]
))

story.append(P("5.2 Problemas do Backend / API", 'H2'))
story.append(P("<b>[CRITICO] Tabelas do Supabase em Falta (404)</b>", 'CriticalLabel'))
story.append(P(
    "Todas as paginas testadas no site ao vivo geram erros 404 do Supabase ao tentar "
    "aceder as tabelas 'lives' e 'live_sessions'. Estas tabelas nao existem na base "
    "de dados, o que significa que toda a funcionalidade de streaming ao vivo esta "
    "completamente inoperacional ao nivel do backend. O contador na barra de "
    "navegacao mostra '0 Live' consistentemente, e todas as secsoes relacionadas com "
    "lives exibem mensagens de 'em breve' ou 'os primeiros sorteios estao a caminho'. "
    "Isto afecta directamente uma das funcionalidades principais da plataforma "
    "(rifas ao vivo com transmissao de video) e explica porque o marketplace so "
    "tem 1 raffle listado e a seccao de vencedores verificados esta vazia. A criacao "
    "destas tabelas e a implementacao das Edge Functions ou triggers necessarios "
    "e uma dependencia critica para que a plataforma possa funcionar como "
    "pretendido."
))

story.append(P("5.3 Problemas de SEO", 'H2'))
story.append(P(
    "A analise SEO revelou problemas significativos que afectam a visibilidade "
    "da plataforma nos motores de busca. Todas as paginas do site partilham "
    "exactamente o mesmo title tag ('Bateu - Raffles, Live Games and Verified Winners'), "
    "a mesma meta description, e os mesmos Open Graph tags. Isto significa que "
    "os motores de busca nao conseguem distinguir entre a homepage, a pagina de "
    "jogos, o FAQ ou qualquer outra rota. A imagem OG/Twitter aponta para um URL "
    "no Cloudflare R2 que esta bloqueado por CORS, tornando-a inacessivel para "
    "previews em redes sociais. Nao existem tags canonical, dados estruturados "
    "(schema.org), ou sitemap.xml verificado. O atributo lang do HTML e "
    "inconsistente: a homepage usa 'en' enquanto outras paginas usam 'pt'. "
    "Apesar de a biblioteca react-helmet-async estar instalada, ela parece nao "
    "ser utilizada de forma efectiva para definir meta tags unicas por pagina."
))

seo_data = [
    ['Title Tag', 'CRITICO', 'Identico em todas as paginas - sem diferenciacao por conteudo'],
    ['Meta Description', 'CRITICO', 'Identica em todas as paginas'],
    ['OG Image', 'ALTO', 'URL do Cloudflare R2 bloqueado por CORS - inacessivel'],
    ['lang Attribute', 'MEDIO', 'Inconsistente: homepage usa en, outras paginas usam pt'],