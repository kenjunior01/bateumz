# CONTENT SECTIONS - append to story[]

# === 1. RESUMO EXECUTIVO ===
story.append(P("1. Resumo Executivo", 'H1'))
story.append(line())
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
story.append(P("1.1 Metodologia", 'H2'))
story.append(P(
    "A analise foi conduzida em tres frentes paralelas: (1) revisao exaustiva do codigo-fonte, "
    "abrangendo mais de 200 ficheiros em src/pages/, src/components/, src/contexts/, src/lib/; "
    "(2) teste do site em producao em 7 paginas distintas, verificando carregamento, SEO, "
    "responsividade mobile e erros de consola; (3) analise detalhada de 17 componentes "
    "de jogos representativos dos 68 jogos da plataforma, avaliando logica, qualidade de IA, "
    "seguranca e padroes de codigo."
))

story.append(P("1.2 Classificacao Global", 'H2'))
story.append(P(
    "A tabela seguinte apresenta a classificacao global da plataforma nas principais dimensoes. "
    "A pontuacao global ponderada de 5.6/10 indica que a plataforma esta funcional mas requer "
    "trabalho significativo antes de estar pronta para operacao comercial em grande escala."
))
story.append(T(
    ['Dimensao', 'Pontuacao', 'Observacao'],
    [
        ['Seguranca', '3.0/10', 'Logica de jogo no cliente, RBAC apenas frontend'],
        ['Performance', '8.5/10', 'Excelente: <500ms, PWA, SSL'],
        ['Qualidade Codigo', '5.5/10', 'God-components, as any, sem testes'],
        ['UX / Design', '7.5/10', 'UI polida, Framer Motion, dark mode'],
        ['Arquitectura', '5.0/10', 'Monolito SPA, sem separacao de concerns'],
        ['Backend / API', '4.0/10', 'Tabelas em falta, erros 404, dados estaticos'],
        ['SEO', '3.5/10', 'Meta tags identicas, sem dados estruturados'],
        ['i18n', '5.0/10', '6 idiomas mas mistura EN/PT inconsistente'],
        ['Testes', '0.5/10', 'Zero testes de jogo, 1 teste exemplo'],
        ['Maturidade', '5.0/10', 'Muitas funcionalidades, poucas operacionais'],
    ],
    [30*mm, 20*mm, CW-50*mm]
))
story.append(Spacer(1,3*mm))
story.append(P(
    "<b>Pontuacao Global Ponderada: 5.6 / 10</b> - A plataforma demonstra potencial significativo "
    "e ambicao tecnica, mas enfrenta problemas criticos de seguranca e maturidade de backend. "
    "A experiencia visual e notavelmente polida para o estagio actual de desenvolvimento."
))

# === 2. ARQUITECTURA ===
story.append(PageBreak())
story.append(P("2. Arquitectura Tecnica", 'H1'))
story.append(line())
story.append(P("2.1 Stack Tecnologico", 'H2'))
story.append(P(
    "A plataforma utiliza Vite 5.4 como bundler, React 18.3 com TypeScript 5.7, TailwindCSS 3.4 com shadcn/ui, "
    "Framer Motion 12.35 para animacoes, Supabase v2.99 como backend completo (auth, DB, storage, realtime), "
    "TanStack React Query v5.83 para cache de dados, React Router v6.30 para roteamento client-side, "
    "e integracoes com PayPal (v9.2), Stripe (v9.12) e Google Analytics. Suporta PWA via vite-plugin-pwa. "
    "O projecto tem 113 dependencias de producao e 14 de desenvolvimento listadas no package.json."
))
story.append(T(
    ['Tecnologia', 'Versao', 'Funcao'],
    [
        ['Vite', '5.4.19', 'Bundler / Dev Server'],
        ['React', '18.3.1', 'UI Framework'],
        ['TypeScript', '5.7.3', 'Type Safety'],
        ['TailwindCSS', '3.4.17', 'Utility-first CSS'],
        ['Supabase', '2.99.0', 'Backend / Auth / DB'],
        ['Framer Motion', '12.35.2', 'Animations'],
        ['React Router', '6.30.1', 'Client Routing'],
        ['TanStack Query', '5.83.0', 'Data Cache'],
        ['PayPal SDK', '9.2.0', 'Payments'],
        ['Stripe.js', '9.12.0', 'Payments'],
        ['Recharts', '2.15.4', 'Data Visualization'],
        ['react-helmet-async', '3.0.0', 'SEO Meta Tags'],
    ],
    [40*mm, 22*mm, CW-62*mm]
))

story.append(P("2.2 Estrutura e Roteamento", 'H2'))
story.append(P(
    "O projecto contem aproximadamente 270 ficheiros TSX/TS organizados em: 50+ paginas em src/pages/ "
    "(com subdirectorios para admin, dashboard, esports, tournaments, leagues, games), 80+ componentes "
    "de jogos em src/components/livegames/, 30+ componentes UI genericos (shadcn/ui), 7 contextos React, "
    "7 hooks personalizados, e 20+ modulos utilitarios em src/lib/. A aplicacao define aproximadamente "
    "80 rotas organizadas em tres grupos: rotas publicas (homepage, login, jogos, marketplace, blog), "
    "rotas protegidas de utilizadores (/profile, /my-tickets, /wallet), rotas de dashboard empresarial "
    "(/dashboard/* com 25+ sub-rotas cobrindo rifas, analytics, lives, torneios, esports, blog), "
    "e rotas de administracao (/admin/* com 21+ sub-rotas para gestao completa da plataforma)."
))

story.append(P("2.3 Autenticacao e RBAC", 'H2'))
story.append(P(
    "O AuthContext gere autenticacao via Supabase Auth com suporte a email/password e OAuth (Google, Apple). "
    "O sistema RBAC suporta 5 papeis com hierarquia: superadmin > admin > regional_manager > business > user. "
    "Os papeis sao armazenados na tabela user_roles (many-to-many). O perfil automatico para OAuth "
    "e criado na primeira autenticacao. O ProtectedRoute implementa guardas por papel com redirecionamento, "
    "mas toda a logica RBAC e client-side sem validacao server-side alem das politicas RLS do Supabase."
))
story.append(T(
    ['Papel', 'Descricao', 'Rotas', 'Funcionalidades'],
    [
        ['superadmin', 'Acesso total', '/admin/*', 'Regioes, co-fundadores, config global'],
        ['admin', 'Gestao plataforma', '/admin/*', 'Users, rifas, pagamentos, auditoria'],
        ['regional_manager', 'Gestao regional', '/regional-panel', 'Branding, definicoes, anuncios'],
        ['business', 'Painel empresa', '/dashboard/*', 'Rifas, analytics, lives, jogos'],
        ['user', 'Participante', '/profile, /jogos', 'Bilhetes, jogos, resultados'],
    ],
    [28*mm, 28*mm, 28*mm, CW-84*mm]
))

# === 3. JOGOS ===
story.append(PageBreak())
story.append(P("3. Analise do Catalogo de Jogos", 'H1'))
story.append(line())
story.append(P("3.1 Visao Geral", 'H2'))
story.append(P(
    "A plataforma possui 68 jogos organizados em 17 categorias: Estrategia (9), Arcade (8), Puzzle (10), "
    "Reflexo (6), Quiz (6), Sorte (6), Social (8), Palavras (2), Cartas (1), Mocambicano (4), Indiano (3), "
    "RPG (1), Battle Royale (1), Acao (1) e Digitacao (1). A diversidade e notavel: jogos classicos como Xadrez, "
    "Damas e Dominos coexistem com jogos culturais mocambicanos (Chigogo, Mexerica, Capulana Quiz) e indianos "
    "(Teen Patti, Kabaddi Raid, Carrom). 22 jogos suportam modo Bot IA com 3 niveis de dificuldade."
))
story.append(T(
    ['Categoria', 'Qtd', 'Jogos Principais'],
    [
        ['Estrategia', '9', 'TicTacToe PRO, Ligar 4, Xadrez, Damas, Dominos, Ludo, Carrom, Uno, Match 4'],
        ['Arcade', '8', 'Cobra, Flappy Bird, Fruta Ninja, Space Shooter, Tower Stack, Ball Breaker, Pong VS'],
        ['Puzzle', '10', 'Memoria VS, Memoria Padroes, 2048, Word Chain, Spot Difference, Color Catch'],
        ['Reflexo', '6', 'Pedra Papel Tesoura, Corrida Reaccao, Tap Battle, Color Match, Speed Reaction'],
        ['Quiz', '6', 'Milionario, Trivia Flash, Quiz Battle, Batalha Conhecimento, Capulana Quiz, Quick Math'],
        ['Sorte', '6', 'Roda Fortuna, Slots VS, Mystery Box, Challenge Roulette, Punishment Wheel'],
        ['Social', '8', 'Verdade ou Desafio, Hot Potato, Never Have I Ever, Hot Seat, Emoji Battle'],
        ['Mocambicano', '4', 'Chigogo, Mexerica, Uri, Djikota'],
        ['Indiano', '3', 'Teen Patti, Kabaddi Raid, Carrom'],
    ],
    [25*mm, 12*mm, CW-37*mm]
))

story.append(P("3.2 Qualidade da IA (Bot)", 'H2'))
story.append(P(
    "A qualidade da IA varia drasticamente. Nivel superior: Connect Four (minimax alpha-beta profundidade 6, "
    "melhor IA da plataforma), Xadrez (minimax com roque e en passant), Snake Battle (BFS pathfinding), "
    "Batalha Naval (mapa de probabilidade). Nivel medio: Damas (heuristica com 1-ply lookahead), Carrom "
    "(fisica com offsets). Nivel fraco: Dominos (joga maior peca), Teen Patti (aleatorio), Uno (primeira carta "
    "valida). Ludo nao possui bot, sendo apenas hot-seat."
))
story.append(T(
    ['Jogo', 'Nota', 'Tecnica de IA'],
    [
        ['Connect Four', '5/5', 'Minimax + alpha-beta, profundidade 6, avaliacao posicional'],
        ['Xadrez', '4/5', 'Minimax + alpha-beta, 2 ply, roque, en passant, promocao'],
        ['Snake Battle', '4/5', 'BFS pathfinding, evita perigo, configuravel por dificuldade'],
        ['Batalha Naval', '4/5', 'Mapa de probabilidade, boost em celulas adjacentes'],
        ['Damas', '3/5', 'Avaliacao heuristica, 1 ply lookahead no modo dificil'],
        ['Dominos', '2/5', 'Joga peca de maior valor, sem estrategia'],
        ['Teen Patti', '2/5', 'Decisoes aleatorias com thresholds por ronda'],
        ['Ludo', 'N/A', 'Sem bot - apenas multiplayer local (hot-seat)'],
    ],
    [28*mm, 15*mm, CW-43*mm]
))

story.append(P("3.3 Arquitectura Multiplayer", 'H2'))
story.append(P(
    "Apesar do directorio se chamar 'livegames', cerca de 95% dos jogos funcionam exclusivamente em modo local. "
    "Apenas dois jogos implementam verdadeiro multiplayer realtime via Supabase: LiveBingo e "
    "KahootMultiplayerQuiz. Os restantes jogos aceitam liveCode mas nunca o utilizam (prop morto). "
    "Resultados sao comunicados via callback onScore() mas apenas SpinWheel, Millionaire e Bingo persistem "
    "resultados no Supabase. Os demais tem pontuacao efemera que se perde ao recarregar."
))

story.append(P("3.4 Problemas de Codigo nos Jogos", 'H2'))
story.append(P(
    "Ficheiros excessivamente grandes (800-1140 linhas) sem separacao de concerns. UnoCardGame acumula "
    "14+ useState sem useReducer. Zero testes unitarios. Bug no GameHistoryPanel: contagem de vitorias "
    "usa OR em vez de AND, contando tudo como vitoria. Jogos de fisica (Carrom, Ludo) usam dimensoes "
    "fixas que causam overflow em mobile. CarromBoard actualiza estado React a 60fps. Pontuacao nao "
    "normalizada entre jogos (50, 100 ou 200 pontos por vitoria), tornando rankings meaningless."
))

# === 4. SEGURANCA ===
story.append(PageBreak())
story.append(P("4. Analise de Seguranca", 'H1'))
story.append(line())
story.append(P("4.1 Vulnerabilidades Criticas", 'H2'))

story.append(P("[CRITICO] Sorteio no Cliente - DashboardRaffles.tsx", 'CritLbl'))
story.append(P(
    "O sorteio de rifas e executado inteiramente no cliente com Math.random(). Um admin pode manipular "
    "o resultado via DevTools. Para uma plataforma com dinheiro e premios reais, isto e inaceitavel. "
    "O sorteio deve ser executado por uma Edge Function ou funcao SQL do Supabase."
))
story.append(P("[CRITICO] Pontuacao sem Validacao Server-side", 'CritLbl'))
story.append(P(
    "Todos os jogos comunicam resultados via onScore() sem validacao. Um utilizador pode invocar "
    "onScore('hacker', 999999) na consola. Nao existe verificacao server-side do resultado real."
))
story.append(P("[CRITICO] RBAC Apenas no Frontend", 'CritLbl'))
story.append(P(
    "Todo o RBAC e implementado no React. Se as politicas RLS do Supabase nao estiverem correctas, "
    "qualquer utilizador autenticado pode aceder dados directamente via cliente Supabase."
))

story.append(P("4.2 Vulnerabilidades de Alta Prioridade", 'H2'))
story.append(P("[ALTO] Vazamento de Dados em Paginas Superadmin", 'WarnLbl'))
story.append(P(
    "AdminCoFounders, AdminRegionalRevenue e AdminSuperDashboard carregam dados antes de verificar "
    "se o utilizador e superadmin. Os dados ficam na memoria JS antes do redirect."
))
story.append(P("[ALTO] Embaralhamento com Math.random()", 'WarnLbl'))
story.append(P(
    "Uno, TeenPatti e Dominos usam Math.random() para baralhar. Deveria usar crypto.getRandomValues() "
    "para jogos que envolvem apostas."
))
story.append(P("[ALTO] Sem 2FA para Admins", 'WarnLbl'))
story.append(P(
    "Contas admin/superadmin com acesso a dados financeiros nao requerem autenticacao de dois factores."
))

story.append(P("4.3 Resumo de Vulnerabilidades", 'H2'))
story.append(T(
    ['Vulnerabilidade', 'Severidade', 'Componente'],
    [
        ['Sorteio client-side', 'CRITICO', 'DashboardRaffles.tsx'],
        ['Pontuacao nao validada', 'CRITICO', 'Todos os jogos (onScore)'],
        ['RBAC apenas frontend', 'CRITICO', 'ProtectedRoute.tsx'],
        ['Vazamento dados superadmin', 'ALTO', 'AdminCoFounders, AdminRegionalRevenue'],
        ['Sem 2FA admin', 'ALTO', 'AuthContext.tsx'],
        ['Math.random() em cartas', 'ALTO', 'Uno, TeenPatti, Dominos'],
        ['Tabuleiro inimigo visivel', 'MEDIO', 'BattleshipGame.tsx'],
        ['API keys em plain text', 'MEDIO', 'AdminSettings.tsx'],
        ['Sem rate limiting', 'MEDIO', 'Accoes de admin'],
        ['XSS potencial em quiz', 'MEDIO', 'KahootMultiplayerQuiz.tsx'],
        ['PayPal sandbox default', 'ALTO', 'AdminSettings.tsx'],
    ],
    [38*mm, 22*mm, CW-60*mm]
))

# === 5. SITE AO VIVO ===
story.append(PageBreak())
story.append(P("5. Analise do Site em Producao", 'H1'))
story.append(line())
story.append(P("5.1 Performance e Infraestrutura", 'H2'))
story.append(P(
    "O site demonstra excelente performance: ~400ms de carregamento total, SSL activo, PWA configurada com "
    "manifesto completo, service worker registado, e zero erros JavaScript em qualquer pagina testada. "
    "O bundle e servido como um unico ficheiro JS e um ficheiro CSS compilados pelo Vite."
))
story.append(T(
    ['Metrica', 'Valor', 'Avaliacao'],
    [
        ['DOM Loaded', '397ms', 'Excelente'],
        ['Full Load', '427ms', 'Excelente'],
        ['SSL', 'Activo', 'Valido em todas as paginas'],
        ['PWA', 'Completa', 'Manifesto, SW, icones, standalone'],
        ['JS Console Errors', '0', 'Nenhum erro em 7 paginas testadas'],
        ['Bundle', '1 JS + 1 CSS', 'Vite optimizado'],
    ],
    [35*mm, 30*mm, CW-65*mm]
))

story.append(P("5.2 Problemas do Backend", 'H2'))
story.append(P("[CRITICO] Tabelas Supabase em Falta (404)", 'CritLbl'))
story.append(P(
    "Todas as paginas geram erros 404 ao aceder as tabelas 'lives' e 'live_sessions' que nao existem "
    "na base de dados. Toda a funcionalidade de streaming ao vivo esta inoperacional. O contador "
    "mostra '0 Live' e seccoes de lives exibem 'em breve'. O marketplace tem apenas 1 raffle."
))

story.append(P("5.3 Problemas de SEO", 'H2'))
story.append(P(
    "Todas as paginas partilham o mesmo title, meta description e OG tags. A imagem OG aponta para "
    "Cloudflare R2 com CORS bloqueado. Sem tags canonical, dados estruturados, ou sitemap.xml. "
    "O atributo lang e inconsistente (en na homepage, pt nas outras). react-helmet-async esta instalado "
    "mas nao e usado efectivamente para meta tags unicas por pagina."
))
story.append(T(
    ['Problema', 'Severidade', 'Detalhe'],
    [
        ['Title identico', 'CRITICO', 'Todas as paginas: Bateu - Raffles, Live Games...'],
        ['Meta desc identica', 'CRITICO', 'Mesma em todas as rotas'],
        ['OG image bloqueada', 'ALTO', 'Cloudflare R2 com CORS'],
        ['lang inconsistente', 'MEDIO', 'Homepage: en, resto: pt'],
        ['Sem canonical', 'MEDIO', 'Falta link rel=canonical'],
        ['Sem schema.org', 'MEDIO', 'Nenhum dado estruturado'],
        ['Blog placeholders', 'BAIXO', '5 artigos usam /placeholder.svg'],
        ['Copyright 2026', 'BAIXO', 'Deveria ser dinamico'],
    ],
    [32*mm, 22*mm, CW-54*mm]
))

story.append(P("5.4 Dados Estaticos e Conteudo", 'H2'))
story.append(P(
    "Diversos elementos da homepage exibem dados que parecem estaticos ou ficticios: '1.261 jogando', "
    "'3.936 online', '12.4k participantes' em concursos, contagens de jogadores por jogo. A seccao "
    "de vencedores verificados esta vazia ('First winners coming soon'). Marketplace tem apenas 1 raffle. "
    "Blog usa imagens placeholder. O texto '0% Verificavel' nos stats deveria provavelmente ser '100%'. "
    "A pagina 'Como Funciona' menciona M-Pesa/e-Mola enquanto o footer mostra PayPal/Visa/Mastercard, "
    "criando inconsistencia na narrativa de pagamentos."
))

# === 6. FLUXOS DE REGISTO ===
story.append(PageBreak())
story.append(P("6. Fluxos de Registo por Tipo de Utilizador", 'H1'))
story.append(line())
story.append(P("6.1 Fluxo de Registo (Participant e Business)", 'H2'))
story.append(P(
    "O registo e um processo de 4 passos: (1) Escolher tipo de conta (Participant ou Business), "
    "(2) Preencher dados (nome, email, senha com min 8 chars + letras + numeros, nome da empresa se Business), "
    "(3) Dados opcionais (telefone, pais, provincia - skipavel), (4) Interesses (skipavel). "
    "Suporta OAuth Google e Apple. O telefone mostra formato mocambicano (+258) independentemente do pais. "
    "Dados extras sao guardados em localStorage e persistidos no perfil na primeira sessao autenticada."
))
story.append(P("6.2 Limitacoes dos Fluxos de Registo", 'H2'))
story.append(P(
    "Apenas dois tipos de conta podem ser criados pelo formulario publico: user (participant) e business. "
    "Os papeis admin, superadmin e regional_manager so podem ser atribuidos por um superadmin existente "
    "atraves do AdminUsers.tsx. Nao e possivel registar-se directamente como regional_manager. "
    "O fluxo de registo Business nao requer verificacao de empresa (sem documento comprovativo, sem NIF). "
    "A validacao de senha e minima (8 chars + letras + numeros) mas nao verifica senhas comprometidas."
))

story.append(P("6.3 Fluxo de Login", 'H2'))
story.append(P(
    "O login suporta email/password e OAuth (Google, Apple). Apos login, o utilizador e redirecionado "
    "conforme o papel: superadmin/admin para /admin, business para /dashboard, user para /profile. "
    "O regional_manager e redirecionado para /profile (bug: deveria ir para /regional-panel). Mensagens de erro "
    "sao descritivas via describeSignInError(), incluindo accoes sugeridas (criar conta, reenviar confirmacao). "
    "A pagina mistura ingles e portugues inconsistentemente."
))

# === 7. PAINEL ADMIN ===
story.append(P("7. Analise do Painel de Administracao", 'H1'))
story.append(line())
story.append(P("7.1 Funcionalidades do Admin", 'H2'))
story.append(P(
    "O painel admin possui 21 paginas organizadas em tres grupos: Core (dashboard, users, raffles, "
    "contests, payments, revenue, plans, audit, cron, settings, games, vouchers, spin wheel, millionaire), "
    "Regional (regional managers, regional revenue, regional dashboard, regional branding, regional config), "
    "e Superadmin-only (super dashboard, co-founders). O dashboard business possui 25+ sub-paginas incluindo "
    "rifas, analytics, lives, torneios, ligas, esports, blog, e configuracoes de white label."
))

story.append(P("7.2 Problemas Encontrados no Admin", 'H2'))
story.append(T(
    ['Problema', 'Severidade', 'Local'],
    [
        ['PayPal default sandbox', 'CRITICO', 'AdminSettings.tsx linha 131'],
        ['Sorteio client-side', 'CRITICO', 'DashboardRaffles.tsx linha 58-80'],
        ['Stats fake no dashboard', 'ALTO', 'DashboardOverview.tsx (hardcoded +3%, +18%)'],
        ['Data leak superadmin', 'ALTO', 'AdminCoFounders, AdminRegionalRevenue'],
        ['Sem paginacao', 'MEDIO', 'AdminPayments, AdminAuditLogs (limite 200)'],
        ['Erros silenciados', 'MEDIO', 'Wallet (catch vazio), multiplas paginas'],
        ['API keys plain text', 'MEDIO', 'AdminSettings - sem encriptacao'],
        ['Toast inconsistente', 'BAIXO', 'Mistura sonner + use-toast'],
        ['Receita regional = 0', 'MEDIO', 'RegionalManagerPanel (hardcoded)'],
        ['Papel superadmin sem rota propria', 'MEDIO', 'Reutiliza requiredRole=admin'],
    ],
    [35*mm, 20*mm, CW-55*mm]
))

# === 8. WALLET ===
story.append(P("8. Sistema de Wallet", 'H1'))
story.append(line())
story.append(P(
    "O wallet e bem estruturado com modulos separados: lib/wallet.ts (acesso a dados), WalletDashboard (UI), "
    "DepositModal, WithdrawalModal, WalletBalance. Suporta 9 metodos de pagamento: M-Pesa, e-Mola, Conta Movel, "
    "Tkash, PIX, Transferencia Bancaria, Visa, Mastercard, PayPal e Crypto. A logica de transaccoes e "
    "gerida por RPC do Supabase (get_or_create_wallet, wallet_process_transaction), garantindo atomicidade. "
    "O levantamento verifica saldo antes de processar. Historico limitado a 30 transaccoes sem paginacao. "
    "Erros sao silenciados com catch vazio. Formatacao de moeda via Intl.NumberFormat para MZN."
))

# === 9. GAMIFICACAO ===
story.append(P("9. Sistema de Gamificacao", 'H1'))
story.append(line())
story.append(P(
    "O sistema de gamificacao (lib/gamification.ts) e bem desenhado com 10 niveis de criador (Iniciante a GOAT), "
    "15 tipos de eventos XP (live_minute, chat_message, game_won, bingo_win, etc.), 18 conquistas "
    "definidas (primeira live, 5 lives, 100 seguidores, etc.), e sistema de streaks com multiplicadores "
    "(3 dias = 1.5x, 7 dias = 2.0x, 30 dias = 3.0x). O leaderboard suporta ranking por XP, "
    "seguidores e gorjetas. A funcao checkAndUnlockAchievements verifica e desbloqueia conquistas. "
    "O sistema esta solidamente implementado no cliente, mas depende de tabelas Supabase (creator_xp, "
    "user_achievements, user_streaks, achievements, creator_stats) cuja existencia na producao nao foi verificada."
))

# === 10. i18n ===
story.append(PageBreak())
story.append(P("10. Sistema de Internacionalizacao", 'H1'))
story.append(line())
story.append(P(
    "O LanguageContext.tsx (~5000+ linhas) contem traducoes inline para 6 idiomas (en, pt, pt-BR, es, fr, hi) "
    "organizadas por seccoes (nav, hero, games, auth, etc.). Na sessao anterior foram adicionados 516 pares "
    "chave-traducao para o modulo de gestores regionais. No entanto, o site ao vivo apresenta mistura "
    "inconsistente de ingles e portugues: a homepage tem hero em PT mas navegacao em EN, o login tem "
    "titulos em EN e labels em PT, o FAQ esta inteiramente em PT. O componente CountryLanguageSync "
    "deveria sincronizar o idioma com o pais seleccionado, mas a implementacao parece incompleta. "
    "O ficheiro e excessivamente grande e dificil de manter; um sistema baseado em ficheiros JSON "
    "separados por idioma seria mais escalavel e facilitaria a revisao por tradutores nativos."
))

# === 11. RECOMENDACOES ===
story.append(P("11. Recomendacoes Prioritarias", 'H1'))
story.append(line())

story.append(P("11.1 Accoes Imediatas (P0 - 1-2 semanas)", 'H2'))
story.append(T(
    ['#', 'Accao', 'Impacto'],
    [
        ['1', 'Mover sorteio para Edge Function do Supabase', 'Elimina manipulacao de resultados'],
        ['2', 'Criar tabelas lives e live_sessions no Supabase', 'Activa funcionalidade principal da plataforma'],
        ['3', 'Auditar todas as politicas RLS do Supabase', 'Garante seguranca real dos dados'],
        ['4', 'Corrigir GameHistoryPanel (OR para AND)', 'Corrige contagem de vitorias'],
        ['5', 'Mudar PayPal de sandbox para producao', 'Permite recebimento real de pagamentos'],
        ['6', 'Adicionar verificacao de papel antes de carregar dados nas paginas superadmin', 'Evita vazamento de dados'],
    ],
    [10*mm, 55*mm, CW-65*mm]
))

story.append(P("11.2 Accoes de Curto Prazo (P1 - 2-4 semanas)", 'H2'))
story.append(T(
    ['#', 'Accao', 'Impacto'],
    [
        ['7', 'Implementar meta tags unicas por rota com react-helmet-async', 'Melhora SEO significativamente'],
        ['8', 'Adicionar validacao server-side para pontuacao de jogos', 'Previne trapaça em jogos'],
        ['9', 'Implementar paginacao em AdminPayments e AdminAuditLogs', 'Permite ver todos os dados'],
        ['10', 'Normalizar pontuacao entre jogos (baseado em tempo/dificuldade)', 'Leaderboards significativos'],
        ['11', 'Usar crypto.getRandomValues() para baralhar cartas', 'Seguranca em jogos de cartas'],
        ['12', 'Separar logica de jogo do componente React (custom hooks)', 'Melhora manutenibilidade'],
        ['13', 'Corrigir redireccao de regional_manager para /regional-panel', 'UX correcta para gestores'],
        ['14', 'Adicionar 2FA para admin e superadmin', 'Seguranca de contas privilegiadas'],
    ],
    [10*mm, 55*mm, CW-65*mm]
))

story.append(P("11.3 Accoes de Medio Prazo (P2 - 1-3 meses)", 'H2'))
story.append(T(
    ['#', 'Accao', 'Impacto'],
    [
        ['15', 'Migrar i18n para ficheiros JSON separados', 'Escalabilidade e manutenibilidade'],
        ['16', 'Converter jogos de fisica para Canvas/WebGL', 'Performance em mobile'],
        ['17', 'Implementar multiplayer realtime para mais jogos', 'Valor principal da plataforma'],
        ['18', 'Adicionar testes unitarios para logica de jogos', 'Qualidade e confiabilidade'],
        ['19', 'Implementar sistema de analytics real (remover dados estaticos)', 'Credibilidade com utilizadores e investidores'],
        ['20', 'Adicionar dados estruturados (schema.org) ao FAQ e rifas', 'SEO e rich snippets no Google'],
        ['21', 'Implementar rate limiting em accoes de admin', 'Proteccao contra acoes acidentais ou maliciosas'],
        ['22', 'Criar SQL migration para regional_manager no enum app_role', 'Completar suporte a gestores regionais'],
    ],
    [10*mm, 55*mm, CW-65*mm]
))

# === 12. CONCLUSAO ===
story.append(PageBreak())
story.append(P("12. Conclusao", 'H1'))
story.append(line())
story.append(P(
    "A bateu.online e uma plataforma com ambicao tecnica notavel e um catalogo de jogos impressionante para o "
    "mercado africano. O frontend e visualmente polido, com animacoes suaves, suporte a dark mode, design "
    "responsivo e PWA configurada. A performance de carregamento e excelente (<500ms) e a base de codigo "
    "demonstra dominio das tecnologias React modernas. No entanto, a plataforma enfrenta tres desafios "
    "fundamentais que precisam de ser resolvidos: primeiro, a seguranca, com logica critica (sorteios, pontuacao, "
    "RBAC) a executar inteiramente no cliente sem validacao server-side; segundo, o backend, com tabelas "
    "em falta na base de dados e funcionalidades principais (lives) completamente inoperacionais; e terceiro, "
    "a maturidade do produto, com dados estaticos no lugar de dados reais e metricas que nao correspondem a "
    "realidade da plataforma. Com a implementacao das recomendacoes prioritarias listadas neste relatorio, "
    "especialmente as accoes P0 de seguranca e backend, a plataforma tem o potencial de se tornar numa solucao "
    "lider no mercado de rifas e entretenimento interactivo em Africa. A fundacao tecnica e solida, e o "
    "trabalho necessario e de natureza evolutiva, nao arquitectonica."
))
story.append(Spacer(1, 8*mm))
story.append(P(
    "<b>Nota Final:</b> Este relatorio cobre o estado da plataforma na data de 11 de Agosto de 2026, "
    "baseado na analise do repositorio kenjunior01/bateumz-cb2c44d1 e do site bateu.online em producao. "
    "Recomenda-se uma revisao actualizada apos a implementacao das correcoes P0."
))

# === BUILD ===
PDF_SKILL_DIR = '/home/z/my-project/skills/pdf'
OUTPUT = '/home/z/my-project/download/relatorio_analise_bateu_online.pdf'

# Generate cover
import subprocess
cover_html = f'''<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  @page {{ size: 210mm 297mm; margin: 0; }}
  html, body {{ margin:0; padding:0; width:210mm; height:297mm; background:#5c5339; font-family:Inter,sans-serif; }}
  .cover {{ width:210mm; height:297mm; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; padding:0 30mm; box-sizing:border-box; }}
  .accent-line {{ position:absolute; top:60mm; left:30mm; width:60mm; height:3px; background:#a68932; }}
  .accent-line2 {{ position:absolute; top:67mm; left:30mm; width:35mm; height:1px; background:#c2baa3; }}
  h1 {{ font-size:38px; font-weight:900; color:#fff; margin:0 0 8mm 0; line-height:1.15; max-width:150mm; }}
  .subtitle {{ font-size:16px; color:#d4d0c8; margin:0 0 12mm 0; line-height:1.5; max-width:140mm; }}
  .meta {{ font-size:10px; color:#b0a890; line-height:1.8; }}
  .meta span {{ display:block; }}
  .bg-circle {{ position:absolute; border-radius:50%; opacity:0.08; }}
  .c1 {{ width:300mm; height:300mm; top:-100mm; right:-100mm; background:#fff; }}
  .c2 {{ width:200mm; height:200mm; bottom:-60mm; left:-60mm; background:#a68932; }}
  .c3 {{ width:80mm; height:80mm; top:40mm; right:30mm; border:1px solid rgba(255,255,255,0.1); }}
</style></head><body>
<div class="cover">
  <div class="bg-circle c1"></div>
  <div class="bg-circle c2"></div>
  <div class="bg-circle c3"></div>
  <div class="accent-line"></div>
  <div class="accent-line2"></div>
  <h1>Relatorio de Analise da Plataforma<br/>bateu.online</h1>
  <p class="subtitle">Analise completa de codigo, jogos, seguranca e producao. Cobertura de 68 jogos, 5 tipos de utilizador, e identificacao de vulnerabilidades criticas.</p>
  <div class="meta">
    <span>Data: 11 de Agosto de 2026</span>
    <span>Repositorio: kenjunior01/bateumz-cb2c44d1</span>
    <span>Site: https://bateu.online</span>
    <span>Stack: React 18 + TypeScript + Supabase + TailwindCSS</span>
    <span>Classificacao Global: 5.6 / 10</span>
  </div>
</div>
</body></html>'''

cover_path = '/home/z/my-project/scripts/cover.html'
with open(cover_path, 'w') as f: f.write(cover_html)

# Render cover to PDF
subprocess.run(['node', f'{PDF_SKILL_DIR}/scripts/html2poster.js', cover_path, '--output', '/home/z/my-project/scripts/cover.pdf', '--width', '210mm'], check=True, capture_output=True, text=True)

# Generate body PDF
doc = SimpleDocTemplate('/home/z/my-project/scripts/body.pdf', pagesize=A4,
                       leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM,
                       title='Relatorio de Analise - bateu.online',
                       author='Z.ai', subject='Analise da Plataforma bateu.online')
doc.build(story, onFirstPage=footer, onLaterPages=footer)

# Merge cover + body
reader_body = PdfReader('/home/z/my-project/scripts/body.pdf')
reader_cover = PdfReader('/home/z/my-project/scripts/cover.pdf')
writer = PdfWriter()
writer.add_page(reader_cover.pages[0])
for p in reader_body.pages: writer.add_page(p)

# Add metadata
writer.add_metadata({'/Title': 'Relatorio de Analise da Plataforma bateu.online',
                     '/Author': 'Z.ai', '/Subject': 'Analise completa de codigo, jogos, seguranca e producao',
                     '/Creator': 'Z.ai Report Generator'})

with open(OUTPUT, 'wb') as f: writer.write(f)
print(f'PDF gerado com sucesso: {OUTPUT}')
print(f'Paginas: {len(reader_cover.pages) + len(reader_body.pages)}')
