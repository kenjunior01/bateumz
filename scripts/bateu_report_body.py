# -*- coding: utf-8 -*-
"""
Bateu Platform - Full Audit Report (ReportLab Body)
"""
import sys, os
sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

# ─── Font Registration ───────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/NotoSansSC-Bold.ttf'))
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

# ─── Palette (Cascade Dark) ──────────────────────────────────────────
C_BG       = HexColor('#0e0e0c')
C_SEC_BG   = HexColor('#1a1a18')
C_CARD_BG  = HexColor('#1f1e1b')
C_HEADER   = HexColor('#58513c')
C_BORDER   = HexColor('#665f4a')
C_ACCENT   = HexColor('#d9be6a')
C_ACCENT2  = HexColor('#50a3be')
C_TEXT     = HexColor('#e3e3e1')
C_MUTED    = HexColor('#84827a')
C_SUCCESS  = HexColor('#7bbc91')
C_WARNING  = HexColor('#bba374')
C_ERROR    = HexColor('#bb736c')
C_INFO     = HexColor('#7998b7')

PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm
MAX_W = PAGE_W - 2 * MARGIN

# ─── Styles ──────────────────────────────────────────────────────────
sBody = ParagraphStyle('Body', fontName='NotoSansSC', fontSize=10, leading=16,
    textColor=C_TEXT, alignment=TA_JUSTIFY, spaceAfter=8, wordWrap='CJK')
sH1 = ParagraphStyle('H1', fontName='NotoSansSC-Bold', fontSize=22, leading=28,
    textColor=C_ACCENT, spaceAfter=12, spaceBefore=20)
sH2 = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=16, leading=22,
    textColor=C_TEXT, spaceAfter=8, spaceBefore=16)
sH3 = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=13, leading=18,
    textColor=C_ACCENT2, spaceAfter=6, spaceBefore=12)
sCaption = ParagraphStyle('Caption', fontName='NotoSansSC', fontSize=9, leading=13,
    textColor=C_MUTED, alignment=TA_LEFT, spaceAfter=12, spaceBefore=4)
sBullet = ParagraphStyle('Bullet', fontName='NotoSansSC', fontSize=10, leading=16,
    textColor=C_TEXT, leftIndent=18, bulletIndent=6, spaceAfter=4, wordWrap='CJK')
sTableCell = ParagraphStyle('TCell', fontName='NotoSansSC', fontSize=9, leading=13,
    textColor=C_TEXT, wordWrap='CJK')
sTableHead = ParagraphStyle('THead', fontName='NotoSansSC-Bold', fontSize=9, leading=13,
    textColor=HexColor('#0e0e0c'))
sTOCEntry = ParagraphStyle('TOCEntry', fontName='NotoSansSC', fontSize=11, leading=20,
    textColor=C_TEXT, leftIndent=12)
sTag = ParagraphStyle('Tag', fontName='NotoSansSC-Bold', fontSize=8, leading=11,
    textColor=C_BG, alignment=TA_CENTER)

# ─── Helpers ─────────────────────────────────────────────────────────
def tag(text, color=C_ACCENT):
    tdata = [[Paragraph(text, sTag)]]
    t = Table(tdata, colWidths=[None])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), color),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
    ]))
    return t

def make_table(headers, rows, col_widths=None):
    """Build a safe table with Paragraph-wrapped cells."""
    head = [Paragraph(h, sTableHead) for h in headers]
    data = [head]
    for r in rows:
        data.append([Paragraph(str(c), sTableCell) for c in r])
    if not col_widths:
        n = len(headers)
        col_widths = [MAX_W / n] * n
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), C_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#0e0e0c')),
        ('GRID', (0, 0), (-1, -1), 0.5, C_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), C_CARD_BG))
    t.setStyle(TableStyle(style_cmds))
    return t

def bullet(text):
    return Paragraph(f"\u2022  {text}", sBullet)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=C_BORDER, spaceAfter=10, spaceBefore=10)

def p(text):
    return Paragraph(text, sBody)

# ─── Page Background ─────────────────────────────────────────────────
def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Accent line at top
    canvas.setStrokeColor(C_ACCENT)
    canvas.setLineWidth(2)
    canvas.line(MARGIN, PAGE_H - MARGIN + 10, PAGE_W - MARGIN, PAGE_H - MARGIN + 10)
    # Footer
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(C_MUTED)
    canvas.drawString(MARGIN, 20, 'Plataforma Bateu - Auditoria Tecnica')
    canvas.drawRightString(PAGE_W - MARGIN, 20, f'{doc.page}')
    canvas.restoreState()

# ─── Build Document ──────────────────────────────────────────────────
OUTPUT = '/home/z/my-project/download/Auditoria_Bateu_Plataforma.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN + 6, bottomMargin=MARGIN + 6,
    title='Plataforma Bateu - Relatorio de Auditoria Completa',
    author='Z.ai',
    subject='Auditoria tecnica da plataforma Bateu',
)

story = []

# ═══════════════════════════════════════════════════════════════════════
# TOC
# ═══════════════════════════════════════════════════════════════════════
toc = TableOfContents()
toc.levelStyles = [sTOCEntry]
story.append(Paragraph('Indice', sH1))
story.append(Spacer(1, 8))
story.append(toc)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 1. RESUMO EXECUTIVO
# ═══════════════════════════════════════════════════════════════════════
story.append(Paragraph('1. Resumo Executivo', sH1))
story.append(tag('RESULTADO GERAL: REQUER ATENCAO'))
story.append(Spacer(1, 10))
story.append(p(
    'A plataforma Bateu (bateu.online) e um ecossistema abrangente de entretenimento digital, '
    'rifas, concursos, jogos ao vivo e funcionalidades de negocios. Construida com React (Vite), '
    'TypeScript, Tailwind CSS e Supabase como backend-as-a-service, a plataforma apresenta uma '
    'arquitetura ambiciosa com mais de 200 ficheiros de codigo-fonte, 90+ componentes de jogos ao vivo, '
    '60+ migracoes de base de dados e um sistema RBAC com cinco perfis de utilizador distintos '
    '(user, business, admin, superadmin, regional_manager).'
))
story.append(p(
    'Esta auditoria avaliou a plataforma em seis dimensoes criticas: arquitetura e organizacao do codigo, '
    'seguranca e autenticacao, qualidade do codigo e padroes, desempenho e otimizacoes, internacionalizacao '
    'e acessibilidade, e infraestrutura de DevOps. A analise revelou que, embora a plataforma demonstre '
    'uma visao de produto notavel e uma quantidade impressionante de funcionalidades, existem areas '
    'significativas que requerem atencao imediata, particularmente no que diz respeito a seguranca de jogos '
    'com logica cliente-side, fragmentacao de estado de autenticacao, e cobertura incompleta de internacionalizacao.'
))
story.append(p(
    'O sistema de jogos ao vivo, com 90+ componentes incluindo quiz multiplayer, batalhas de trivia, '
    'jogos de dados, e jogos de carta, e o ponto mais forte da plataforma em termos de funcionalidade. '
    'A integracao com Supabase fornece autenticacao, base de dados em tempo real e armazenamento, enquanto '
    'os gateways de pagamento PayPal e Stripe permitem monetizacao. O sistema de gestores regionais, '
    'recentemente implementado, adiciona capacidade de operacao multi-pais com branding personalizado.'
))

# Key metrics table
story.append(Spacer(1, 8))
story.append(make_table(
    ['Metrica', 'Valor', 'Avaliacao'],
    [
        ['Ficheiros de codigo (src/)', '200+', 'Alta complexidade'],
        ['Componentes de jogos ao vivo', '90+', 'Impressionante'],
        ['Migracoes SQL', '60+', 'Bem estruturado'],
        ['Rotas definidas (App.tsx)', '80+', 'Muito extenso'],
        ['Componentes de UI (shadcn)', '40+', 'Boa base'],
        ['Idiomas suportados (i18n)', '6 (en, pt, pt-BR, es, fr, hi)', 'Parcial (13% adocao)'],
        ['Perfis RBAC', '5 (user, business, admin, superadmin, regional_manager)', 'Completo'],
    ],
    [MAX_W * 0.45, MAX_W * 0.30, MAX_W * 0.25]
))
story.append(Paragraph('Tabela 1: Metricas gerais da plataforma', sCaption))

# ═══════════════════════════════════════════════════════════════════════
# 2. ARQUITETURA E ORGANIZACAO
# ═══════════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph('2. Arquitetura e Organizacao do Codigo', sH1))

story.append(Paragraph('2.1 Stack Tecnologico', sH2))
story.append(p(
    'A plataforma utiliza um stack moderno e bem escolhido para o seu dominio. O frontend e construido '
    'com React 18 e TypeScript, empacotado com Vite para tempos de build rapidos. O sistema de estilizacao '
    'combina Tailwind CSS para utilitarios rapidos com componentes shadcn/ui para elementos de interface '
    'consistentes. A gestao de estado e distribuida: React Context para autenticacao, idioma, tema e '
    'configuracao regional, e TanStack Query (React Query) para cache e sincronizacao de dados com o backend.'
))
story.append(p(
    'O backend e inteiramente fornecido pelo Supabase, que oferece autenticacao (email/password e OAuth), '
    'base de dados PostgreSQL com Row Level Security (RLS), armazenamento de ficheiros, e subscriptions '
    'em tempo real via WebSockets. Esta abordagem backend-as-a-service permite desenvolvimento rapido, '
    'mas introduz dependencia critica num fornecedor unico. A ausencia de uma camada de API intermedia '
    '(serverless functions ou microservicos) significa que toda a logica de negocio sensivel reside no '
    'cliente, o que e um risco significativo de seguranca que sera detalhado na seccao de seguranca.'
))

story.append(Paragraph('2.2 Estrutura de Diretorios', sH2))
story.append(p(
    'A organizacao de diretorios segue uma estrutura baseada em funcionalidades (feature-based), que e '
    'geralmente considerada uma boa pratica. Os componentes estao organizados em pastas tematicas: '
    'components/livegames/ para jogos ao vivo (90+ ficheiros), components/ui/ para componentes de '
    'interface base (40+ ficheiros shadcn), components/wallet/ para funcionalidades de carteira, '
    'components/payments/ para gateways de pagamento, e components/mobile/ para navegacao movel. '
    'As paginas estao divididas em pages/ para paginas de nivel superior, pages/admin/ para o painel de '
    'administracao, pages/dashboard/ para o painel de negocios, pages/esports/ para a seccao de esports, '
    'e pages/tournaments/ para torneios.'
))
story.append(p(
    'A pasta contexts/ contem quatro provedores de contexto (Auth, Language, Theme, Currency) e o hook '
    'useRegionalConfig.tsx para configuracao regional. A pasta integrations/supabase/ contem o cliente '
    'tipado e as definicoes de tipos gerados. As migracoes SQL em supabase/migrations/ totalizam mais de '
    '60 ficheiros, demonstrando uma evolucao activa do schema de base de dados. Um ponto positivo e a '
    'presenca de layouts separados (DashboardLayout.tsx e AdminLayout.tsx) para diferentes areas da '
    'aplicacao, o que melhora a separacao de preocupacoes.'
))

story.append(Paragraph('2.3 Roteamento e Navegacao', sH2))
story.append(p(
    'O ficheiro App.tsx centraliza todo o roteamento da aplicacao com mais de 80 rotas definidas. '
    'A aplicacao usa React Router v6 com rotas aninhadas para o painel de negocios (/dashboard/*) e '
    'o painel de administracao (/admin/*). A protecao de rotas e implementada pelo componente '
    'ProtectedRoute, que suporta controle baseado em roles (requiredRole) e bloqueio de roles '
    'especificos (blockRoles). O sistema suporta cinco perfis de utilizador, e a logica de protecao '
    'verifica cada role individualmente, com tratamento especial para superadmin ter acesso a rotas de admin.'
))
story.append(p(
    'A navegacao inclui transicoes de pagina com Framer Motion (AnimatePresence + PageTransition), '
    'uma barra de navegacao inferior para dispositivos moveis (BottomTabBar), um gaveta de menu lateral '
    '(MobileMenuDrawer), e um rastreador de paginas recentes (RecentPagesTracker). A experiencia de '
    'overlay para transmissoes ao vivo exclui intencionalmente os elementos de navegacao para maximizar '
    'a area de visualizacao. Um ponto de atencao e que o App.tsx e um ficheiro extenso com 462 linhas '
    'e 148 importacoes, o que sugere que a separacao em modulos menores melhoraria a manutenibilidade.'
))

# ═══════════════════════════════════════════════════════════════════════
# 3. SEGURANCA E AUTENTICACAO
# ═══════════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph('3. Seguranca e Autenticacao', sH1))
story.append(tag('CRITICO - RISCOS ELEVADOS IDENTIFICADOS', C_ERROR))
story.append(Spacer(1, 10))

story.append(Paragraph('3.1 Sistema de Autenticacao', sH2))
story.append(p(
    'O sistema de autenticacao e gerido pelo AuthContext, que envolve o Supabase Auth para signup, '
    'signin e signout. O fluxo de autenticacao e bem estruturado com uma maquina de estados que gerencia '
    'user, session, profile, role, adminCountries e loading. O contexto detecta automaticamente sessoes '
    'OAuth e cria perfis basicos para utilizadores que saltam o registo tradicional. A resolucao de roles '
    'segue uma prioridade clara: superadmin > admin > regional_manager > business > user, garantindo '
    'que o role mais privilegiado prevalece quando um utilizador tem multiplas roles atribuidas.'
))
story.append(p(
    'O processo de registo suporta metadados adicionais (display_name, role, company_name) passados '
    'durante o signup. Dados extras como telefone, provincia, cidade e interesses sao armazenados '
    'no localStorage e processados apos o primeiro login, garantindo que nao sao perdidos se o '
    'utilizador fechar a janela durante o registo. O sistema de referral tambem e processado '
    'automaticamente no primeiro login, com atribuicao de 50 pontos Lucky Points tanto para o '
    'referenciador como para o novo utilizador, usando um codigo de referral armazenado no localStorage.'
))

story.append(Paragraph('3.2 Protecao de Rotas (RBAC)', sH2))
story.append(p(
    'O componente ProtectedRoute implementa um sistema de controle de acesso baseado em roles que '
    'funciona em tres modos: (1) sem parametros, apenas exige autenticacao; (2) requiredRole, que '
    'exige um role especifico com tratamento especial para superadmin ter acesso a rotas de admin; '
    '(3) blockRoles, que impede utilizadores com certos roles de aceder a uma rota. A implementacao '
    'e robusta e cobre todos os cinco perfis de utilizador. As rotas de administracao exigem role admin '
    '(com superadmin tendo acesso automatico), as rotas de negocios exigem role business, e as rotas '
    'de gestor regional exigem role regional_manager (com admin e superadmin tambem tendo acesso).'
))
story.append(p(
    'Uma limitacao identificada e que o ProtectedRoute nao implementa protecao baseada em regiao '
    '(country-level access control). O AuthContext carrega adminCountries, mas esta informacao '
    'nao e usada pelo ProtectedRoute nem por qualquer middleware de rota. Isto significa que um '
    'gestor regional de Mocambique pode aceder a dados de Angola sem restricao no frontend, '
    'dependendo unicamente das politicas RLS do Supabase para filtragem de dados. Recomenda-se implementar '
    'verificacao de regiao no ProtectedRoute para adicionar uma camada adicional de seguranca.'
))

story.append(Paragraph('3.3 Riscos de Seguranca Criticos', sH2))
story.append(p(
    'O maior risco de seguranca da plataforma reside na ausencia de uma camada de API server-side. '
    'Com a arquitetura actual, o cliente (navegador do utilizador) comunica directamente com o Supabase, '
    'o que significa que toda a logica de negocio e visivel e modificavel no frontend. Embora o Supabase '
    'ofeca Row Level Security (RLS) para protecao ao nivel da base de dados, existem muitas operacoes '
    'sensiveis que deveriam ser validadas server-side antes de atingir a base de dados.'
))
story.append(p(
    'Operacoes financeiras como depositos, levantamentos e apostas devem ser processadas numa camada '
    'server-side (Supabase Edge Functions ou um backend separado) que valide valores minimos e maximos, '
    'verifique saldos suficientes, aplique limites de taxa, e registre auditoria. A carteira digital '
    '(Wallet) e os jogos que envolvem dinheiro real exigem esta protecao adicional para evitar '
    'manipulacao de valores por utilizadores mal-intencionados com acesso as ferramentas de desenvolvedor.'
))

story.append(Paragraph('3.4 Gestao de Sessao e Tokens', sH2))
story.append(p(
    'A gestao de sessao e delegada ao Supabase Auth, que gera JWT tokens com validade configuravel. '
    'O AuthContext escuta mudancas de estado de autenticacao via onAuthStateChange e atualiza o estado '
    'da aplicacao de forma reactiva. O bootstrap da sessao usa um padrao defensivo com um flag bootstrapped '
    'para evitar processamento duplicado de eventos durante a inicializacao. O signout limpa todo o estado '
    'local, incluindo user, session, profile e role. Uma melhoria possivel seria adicionar verificacao '
    'de expiracao de sessao mais agressiva no cliente e invalidacao de sessoes em caso de mudanca de '
    'password, funcionalidade que o Supabase suporta nativamente mas que nao e explicitamente configurada.'
))

# Security findings table
story.append(Spacer(1, 8))
story.append(make_table(
    ['Risco', 'Severidade', 'Area', 'Recomendacao'],
    [
        ['Sem API server-side', 'Critico', 'Arquitectura', 'Implementar Edge Functions ou backend'],
        ['Jogos com logica cliente-side', 'Alto', 'Jogos', 'Mover logica de jogo para servidor'],
        ['Operacoes financeiras no cliente', 'Alto', 'Wallet', 'Validar server-side com transacoes'],
        ['Sem protecao de regiao nas rotas', 'Medio', 'RBAC', 'Adicionar verificacao de country'],
        ['Referral via localStorage', 'Baixo', 'Auth', 'Mover para cookie ou server-side'],
        ['Signup extra em localStorage', 'Baixo', 'Auth', 'Usar Supabase metadata'],
    ],
    [MAX_W * 0.28, MAX_W * 0.14, MAX_W * 0.20, MAX_W * 0.38]
))
story.append(Paragraph('Tabela 2: Principais riscos de seguranca identificados', sCaption))

# ═══════════════════════════════════════════════════════════════════════
# 4. QUALIDADE DO CODIGO
# ═══════════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(Paragraph('4. Qualidade do Codigo e Padroes', sH1))

story.append(Paragraph('4.1 Tipagem e TypeScript', sH2))
story.append(p(
    'A plataforma utiliza TypeScript de forma consistente, com interfaces bem definidas para os modelos '
    'de dados principais. O AuthContext define interfaces claras para Profile, AuthContextType e os '
    'tipos de retorno das funcoes de autenticacao. Os componentes de jogos usam interfaces de estado '
    'tipadas (por exemplo, CrashState com campos tipados para multiplier, isRunning, betAmount). '
    'A pasta integrations/supabase/types.ts contem os tipos gerados automaticamente pelo Supabase, '
    'garantindo que os tipos reflectem o schema actual da base de dados. No entanto, o uso extensivo de '
    '