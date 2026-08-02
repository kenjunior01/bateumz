#!/usr/bin/env python3
"""Add common keys to pt-BR section"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find pt-BR section
section_start = content.find('  "pt-BR": {')
if section_start == -1:
    print("Could not find pt-BR section")
    exit(1)

print(f"Found pt-BR at char {section_start}")

# Find the next section start after pt-BR
search_from = section_start + 15
next_section = content.find('\n  ', search_from)
if next_section == -1:
    print("Could not find next section")
    exit(1)

print(f"Next section at char {next_section}")

# Use same keys as pt
keys = {
    "action.playAgain": "Jogar Novamente",
    "action.rematch": "Revanche",
    "action.exit": "Sair",
    "action.newGame": "Novo Jogo",
    "action.buyCard": "Comprar Carta",
    "action.participate": "Participar",
    "action.vote": "Votar",
    "action.viewRaffle": "Ver sorteio",
    "action.viewContest": "Ver concurso",
    "action.enterGame": "Entrar no Jogo",
    "action.buyTicket": "Comprar bilhete",
    "action.buyTickets": "Comprar Bilhetes",
    "action.loginToPay": "Entrar para pagar",
    "action.loginToParticipate": "Entrar para Participar",
    "action.contactSeller": "Entrar para contactar o vendedor",
    "action.loginAndContact": "Entrar e contactar",
    "action.createFreeAccount": "Criar conta gratuita",
    "action.viewMore": "Ver mais",
    "action.openRaffles": "Ver sorteios abertos",
    "action.enterLive": "Entrar na live agora",
    "action.openLivePage": "Abrir página da live",
    "action.copyProfileLink": "Link do perfil copiado!",
    "action.uploadFile": "Upload de arquivo",
    "action.sendEntry": "Enviar Participação",
    "action.shareLive": "Entre comigo na live \"...\" no Bateu! 🎁",
    "empty.noRaffles": "Nenhum sorteio nesta categoria",
    "empty.noActiveRaffles": "Nenhum sorteio ativo no momento",
    "empty.noRafflesInState": "Nenhum sorteio nesse estado.",
    "empty.noContestsInState": "Nenhum concurso nesse estado.",
    "empty.noGamesConfigured": "Nenhum jogo configurado ainda",
    "empty.noResults": "Nenhum resultado para os filtros selecionados.",
    "empty.noContestActive": "Nenhum concurso ativo no momento.",
    "empty.noContestClosed": "Nenhum concurso encerrado.",
    "empty.noContestFound": "Nenhum concurso encontrado",
    "empty.noTicketFound": "Nenhum bilhete encontrado",
    "empty.noTicketInState": "Nenhum bilhete com esse estado.",
    "empty.noGameFound": "Nenhum jogo encontrado",
    "empty.noParticipants": "Nenhum participante ativo nesse sorteio.",
    "empty.noLiveActive": "Nenhuma live em andamento",
    "empty.noLiveScheduled": "Nenhuma live agendada",
    "empty.noCreatorFound": "Nenhum criador encontrado",
    "empty.noClipAvailable": "Nenhum clip disponível",
    "empty.noPlayerRanking": "Nenhum jogador no ranking ainda",
    "empty.noWinnerFound": "Nenhum vencedor encontrado",
    "empty.noBusinessFound": "Nenhuma empresa encontrada",
    "empty.noActiveRafflesWidget": "Nenhum sorteio ativo",
    "empty.noTransactions": "Nenhuma transação encontrada",
    "empty.noRewardsAvailable": "Nenhuma recompensa disponível no momento.",
    "empty.noPointsHistory": "Nenhum histórico de pontos.",
    "empty.noRedeemedRewards": "Nenhuma recompensa resgatada.",
    "empty.noGameRegistered": "Nenhum jogo registrado ainda",
    "empty.noChallengeCreated": "Nenhum desafio criado ainda.",
    "empty.noMessages": "Nenhuma mensagem ainda. Seja o primeiro!",
    "empty.beFirstToParticipate": "Seja o primeiro a participar!",
    "empty.noSavedCard": "Nenhum dado de cartão armazenado",
    "empty.noLivePerformed": "Nenhuma live realizada ainda",
    "empty.noVotesYet": "Ainda sem votos",
    "empty.noAttemptsYet": "Nenhuma tentativa ainda",
    "empty.selectGift": "Selecione um presente para enviar",
    "status.sending": "Enviando...",
    "status.loading": "Carregando...",
    "status.loadingQuestions": "Carregando perguntas...",
    "status.loadingStripe": "Carregando Stripe…",
    "status.botThinking": "O bot está pensando...",
    "error.sendFailed": "Erro ao enviar",
    "error.sendParticipationFailed": "Não foi possível enviar a participação.",
    "error.sendMessageFailed": "Erro ao enviar mensagem",
    "error.sendGiftFailed": "Erro ao enviar presente",
    "error.createPollFailed": "Erro ao criar enquete",
    "error.uploadFileFailed": "Erro ao carregar arquivo. Tente novamente.",
    "error.uploadImageFailed": "Erro ao enviar imagem: ",
    "error.unknown": "desconhecido",
    "error.sendReceiptFailed": "Erro ao enviar comprovante: ",
    "error.registerParticipationFailed": "Erro ao registrar participação: ",
    "error.updateFailed": "Erro ao atualizar: ",
    "error.loadPostsFailed": "Não foi possível carregar os posts. Tente novamente mais tarde.",
    "error.submitFailed": "Erro ao enviar",
    "chat.sendMessage": "Enviar mensagem...",
    "chat.joinToChat": "Entre na live para o chat",
    "chat.firstMessage": "Seja o primeiro a enviar uma mensagem! 🎉",
    "pix.payWithKey": "Escolha \"Pix\" → \"Pagar com chave\"",
    "voted": "Votado",
    "enter": "Entrar",
}

new_text = "\n    // ===== Common UI Strings =====\n"
for k, v in keys.items():
    new_text += f'    "{k}": "{v}",\n'

content = content[:next_section] + new_text + content[next_section:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Added {len(keys)} keys to pt-BR")
print("Done!")
