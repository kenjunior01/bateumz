#!/usr/bin/env python3
"""Add common missing translation keys to all language sections in LanguageContext.tsx"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Define the new keys for each language
new_keys = {
    "en": {
        # Common actions
        "action.playAgain": "Play Again",
        "action.rematch": "Rematch",
        "action.exit": "Exit",
        "action.newGame": "New Game",
        "action.buyCard": "Buy Card",
        "action.participate": "Participate",
        "action.vote": "Vote",
        "action.viewRaffle": "View Raffle",
        "action.viewContest": "View Contest",
        "action.enterGame": "Join Game",
        "action.buyTicket": "Buy Ticket",
        "action.buyTickets": "Buy Tickets",
        "action.loginToPay": "Login to pay",
        "action.loginToParticipate": "Login to Participate",
        "action.contactSeller": "Login to contact seller",
        "action.loginAndContact": "Login & Contact",
        "action.createFreeAccount": "Create free account",
        "action.viewMore": "View more",
        "action.openRaffles": "View open raffles",
        "action.enterLive": "Enter Live Now",
        "action.openLivePage": "Open live page",
        "action.copyProfileLink": "Profile link copied!",
        "action.uploadFile": "Upload file",
        "action.sendEntry": "Submit Entry",
        "action.shareLive": 'Join me on live \"...\" on Bateu! 🎁',

        # Empty states
        "empty.noRaffles": "No raffles in this category",
        "empty.noActiveRaffles": "No active raffles at the moment",
        "empty.noRafflesInState": "No raffles in this status.",
        "empty.noContestsInState": "No contests in this status.",
        "empty.noGamesConfigured": "No games configured yet",
        "empty.noResults": "No results for the selected filters.",
        "empty.noContestActive": "No active contests at the moment.",
        "empty.noContestClosed": "No closed contests.",
        "empty.noContestFound": "No contest found",
        "empty.noTicketFound": "No tickets found",
        "empty.noTicketInState": "No tickets with this status.",
        "empty.noGameFound": "No games found",
        "empty.noParticipants": "No active participants in this raffle.",
        "empty.noLiveActive": "No live in progress",
        "empty.noLiveScheduled": "No scheduled lives",
        "empty.noCreatorFound": "No creators found",
        "empty.noClipAvailable": "No clips available",
        "empty.noPlayerRanking": "No players in the ranking yet",
        "empty.noWinnerFound": "No winners found",
        "empty.noBusinessFound": "No businesses found",
        "empty.noActiveRafflesWidget": "No active raffles",
        "empty.noTransactions": "No transactions found",
        "empty.noRewardsAvailable": "No rewards available at the moment.",
        "empty.noPointsHistory": "No points history.",
        "empty.noRedeemedRewards": "No redeemed rewards.",
        "empty.noGameRegistered": "No games registered yet",
        "empty.noChallengeCreated": "No challenges created yet.",
        "empty.noMessages": "No messages yet. Be the first!",
        "empty.beFirstToParticipate": "Be the first to participate!",
        "empty.noSavedCard": "No saved card data",
        "empty.noLivePerformed": "No lives performed yet",
        "empty.noVotesYet": "No votes yet",
        "empty.noAttemptsYet": "No attempts yet",
        "empty.selectGift": "Select a gift to send",

        # Loading / Sending
        "status.sending": "Sending...",
        "status.loading": "Loading...",
        "status.loadingQuestions": "Loading questions...",
        "status.loadingStripe": "Loading Stripe…",
        "status.botThinking": "The bot is thinking...",

        # Errors
        "error.sendFailed": "Failed to send.",
        "error.sendParticipationFailed": "Could not submit the entry.",
        "error.sendMessageFailed": "Failed to send message.",
        "error.sendGiftFailed": "Failed to send gift.",
        "error.createPollFailed": "Failed to create poll.",
        "error.uploadFileFailed": "Error uploading file. Try again.",
        "error.uploadImageFailed": "Error sending image: ",
        "error.unknown": "unknown",
        "error.sendReceiptFailed": "Error sending receipt: ",
        "error.registerParticipationFailed": "Error registering participation: ",
        "error.updateFailed": "Error updating: ",
        "error.loadPostsFailed": "Could not load posts. Try again later.",
        "error.submitFailed": "Submit failed",

        # Chat
        "chat.sendMessage": "Send message...",
        "chat.joinToChat": "Join the live to chat",
        "chat.firstMessage": "Be the first to send a message! 🎉",

        # Other
        "pix.payWithKey": 'Choose \"Pix\" → \"Pay with key\"',
        "voted": "Voted",
        "enter": "Enter",
    },
    "pt": {
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
        "action.uploadFile": "Upload ficheiro",
        "action.sendEntry": "Enviar Participação",
        "action.shareLive": "Entra comigo na live \"...\" no Bateu! 🎁",
        "empty.noRaffles": "Nenhum sorteio nesta categoria",
        "empty.noActiveRaffles": "Nenhum sorteio ativo de momento",
        "empty.noRafflesInState": "Nenhum sorteio nesse estado.",
        "empty.noContestsInState": "Nenhum concurso nesse estado.",
        "empty.noGamesConfigured": "Nenhum jogo configurado ainda",
        "empty.noResults": "Nenhum resultado para os filtros selecionados.",
        "empty.noContestActive": "Nenhum concurso ativo de momento.",
        "empty.noContestClosed": "Nenhum concurso encerrado.",
        "empty.noContestFound": "Nenhum concurso encontrado",
        "empty.noTicketFound": "Nenhum bilhete encontrado",
        "empty.noTicketInState": "Nenhum bilhete com este estado.",
        "empty.noGameFound": "Nenhum jogo encontrado",
        "empty.noParticipants": "Nenhum participante ativo neste sorteio.",
        "empty.noLiveActive": "Nenhuma live em curso",
        "empty.noLiveScheduled": "Nenhuma live agendada",
        "empty.noCreatorFound": "Nenhum criador encontrado",
        "empty.noClipAvailable": "Nenhum clip disponível",
        "empty.noPlayerRanking": "Nenhum jogador no ranking ainda",
        "empty.noWinnerFound": "Nenhum vencedor encontrado",
        "empty.noBusinessFound": "Nenhuma empresa encontrada",
        "empty.noActiveRafflesWidget": "Nenhum sorteio ativo",
        "empty.noTransactions": "Nenhuma transação encontrada",
        "empty.noRewardsAvailable": "Nenhuma recompensa disponível de momento.",
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
        "status.sending": "A enviar...",
        "status.loading": "A carregar...",
        "status.loadingQuestions": "A carregar perguntas...",
        "status.loadingStripe": "A carregar Stripe…",
        "status.botThinking": "O bot está a pensar...",
        "error.sendFailed": "Erro ao enviar",
        "error.sendParticipationFailed": "Não foi possível enviar a participação.",
        "error.sendMessageFailed": "Erro ao enviar mensagem",
        "error.sendGiftFailed": "Erro ao enviar presente",
        "error.createPollFailed": "Erro ao criar sondagem",
        "error.uploadFileFailed": "Erro ao carregar arquivo. Tente novamente.",
        "error.uploadImageFailed": "Erro ao enviar imagem: ",
        "error.unknown": "desconhecido",
        "error.sendReceiptFailed": "Erro ao enviar comprovativo: ",
        "error.registerParticipationFailed": "Erro ao registar participação: ",
        "error.updateFailed": "Erro ao actualizar: ",
        "error.loadPostsFailed": "Não foi possível carregar os posts. Tente novamente mais tarde.",
        "error.submitFailed": "Erro ao enviar",
        "chat.sendMessage": "Enviar mensagem...",
        "chat.joinToChat": "Entre na live para chat",
        "chat.firstMessage": "Seja o primeiro a enviar uma mensagem! 🎉",
        "pix.payWithKey": "Escolha \"Pix\" → \"Pagar com chave\"",
        "voted": "Votado",
        "enter": "Entrar",
    },
    "hi": {
        "action.playAgain": "फिर से खेलें",
        "action.rematch": "रीमैच",
        "action.exit": "बाहर जाएं",
        "action.newGame": "नया गेम",
        "action.buyCard": "कार्ड खरीदें",
        "action.participate": "भाग लें",
        "action.vote": "वोट करें",
        "action.viewRaffle": "लॉटरी देखें",
        "action.viewContest": "प्रतियोगिता देखें",
        "action.enterGame": "गेम में शामिल हों",
        "action.buyTicket": "टिकट खरीदें",
        "action.buyTickets": "टिकट खरीदें",
        "action.loginToPay": "भुगतान के लिए लॉगिन करें",
        "action.loginToParticipate": "भाग लेने के लिए लॉगिन करें",
        "action.contactSeller": "विक्रेता से संपर्क करने लॉगिन करें",
        "action.loginAndContact": "लॉगिन करें और संपर्क करें",
        "action.createFreeAccount": "मुफ्त खाता बनाएं",
        "action.viewMore": "और देखें",
        "action.openRaffles": "खुली लॉटरी देखें",
        "action.enterLive": "अभी लाइव में शामिल हों",
        "action.openLivePage": "लाइव पेज खोलें",
        "action.copyProfileLink": "प्रोफ़ाइल लिंक कॉपी हो गई!",
        "action.uploadFile": "फ़ाइल अपलोड करें",
        "action.sendEntry": "प्रविष्टि भेजें",
        "action.shareLive": "Bateu पर लाइव \"...\" में मेरे साथ शामिल हों! 🎁",
        "empty.noRaffles": "इस श्रेणी में कोई लॉटरी नहीं",
        "empty.noActiveRaffles": "फिलहाल कोई सक्रिय लॉटरी नहीं",
        "empty.noRafflesInState": "इस स्थिति में कोई लॉटरी नहीं।",
        "empty.noContestsInState": "इस स्थिति में कोई प्रतियोगिता नहीं।",
        "empty.noGamesConfigured": "अभी तक कोई गेम कॉन्फ़िगर नहीं",
        "empty.noResults": "चयनित फ़िल्टर के लिए कोई परिणाम नहीं।",
        "empty.noContestActive": "फिलहाल कोई सक्रिय प्रतियोगिता नहीं।",
        "empty.noContestClosed": "कोई बंद प्रतियोगिता नहीं।",
        "empty.noContestFound": "कोई प्रतियोगिता नहीं मिली",
        "empty.noTicketFound": "कोई टिकट नहीं मिला",
        "empty.noTicketInState": "इस स्थिति का कोई टिकट नहीं।",
        "empty.noGameFound": "कोई गेम नहीं मिला",
        "empty.noParticipants": "इस लॉटरी में कोई सक्रिय प्रतिभागी नहीं।",
        "empty.noLiveActive": "कोई लाइव चल रहा नहीं",
        "empty.noLiveScheduled": "कोई शेड्यूल लाइव नहीं",
        "empty.noCreatorFound": "कोई क्रिएटर नहीं मिला",
        "empty.noClipAvailable": "कोई क्लिप उपलब्ध नहीं",
        "empty.noPlayerRanking": "अभी तक रैंकिंग में कोई खिलाड़ी नहीं",
        "empty.noWinnerFound": "कोई विजेता नहीं मिला",
        "empty.noBusinessFound": "कोई व्यवसाय नहीं मिला",
        "empty.noActiveRafflesWidget": "कोई सक्रिय लॉटरी नहीं",
        "empty.noTransactions": "कोई लेनदेन नहीं मिला",
        "empty.noRewardsAvailable": "फिलहाल कोई इनाम उपलब्ध नहीं।",
        "empty.noPointsHistory": "कोई अंक इतिहास नहीं।",
        "empty.noRedeemedRewards": "कोई रिडीम किए गए इनाम नहीं।",
        "empty.noGameRegistered": "अभी तक कोई गेम दर्ज नहीं",
        "empty.noChallengeCreated": "अभी तक कोई चुनौती नहीं बनाई गई।",
        "empty.noMessages": "अभी तक कोई संदेश नहीं। पहल बनें!",
        "empty.beFirstToParticipate": "पहल भाग लें!",
        "empty.noSavedCard": "कोई सहेजा गया कार्ड डेटा नहीं",
        "empty.noLivePerformed": "अभी तक कोई लाइव नहीं हुई",
        "empty.noVotesYet": "अभी तक कोई वोट नहीं",
        "empty.noAttemptsYet": "अभी तक कोई प्रयास नहीं",
        "empty.selectGift": "भेजने के लिए एक उपहार चुनें",
        "status.sending": "भेज रहा है...",
        "status.loading": "लोड हो रहा है...",
        "status.loadingQuestions": "प्रश्न लोड हो रहे हैं...",
        "status.loadingStripe": "Stripe लोड हो रहा है…",
        "status.botThinking": "बॉट सोच रहा है...",
        "error.sendFailed": "भेजने में विफल।",
        "error.sendParticipationFailed": "प्रविष्टि भेजने में असमर्थ।",
        "error.sendMessageFailed": "संदेश भेजने में त्रुटि",
        "error.sendGiftFailed": "उपहार भेजने में त्रुटि",
        "error.createPollFailed": "पोल बनाने में त्रुटि",
        "error.uploadFileFailed": "फ़ाइल अपलोड में त्रुटि। पुनः प्रयास करें।",
        "error.uploadImageFailed": "छवि भेजने में त्रुटि: ",
        "error.unknown": "अज्ञात",
        "error.sendReceiptFailed": "रसीद भेजने में त्रुटि: ",
        "error.registerParticipationFailed": "भागीदारी दर्ज करने में त्रुटि: ",
        "error.updateFailed": "अपडेट करने में त्रुटि: ",
        "error.loadPostsFailed": "पोस्ट लोड नहीं हो सके। बाद में पुनः प्रयास करें।",
        "error.submitFailed": "जमा करने में विफल",
        "chat.sendMessage": "संदेश भेजें...",
        "chat.joinToChat": "चैट के लिए लाइव में शामिल हों",
        "chat.firstMessage": "पहल संदेश भेजने वाले बनें! 🎉",
        "pix.payWithKey": "\"Pix\" चुनें → \"कुंजी से भुगतान\"",
        "voted": "वोट किया",
        "enter": "शामिल हों",
    },
}

# Also add to es and fr (same as en keys, they fallback to en anyway)
for lang in ["es", "fr"]:
    new_keys[lang] = new_keys["en"]

# For pt-BR, use pt keys (they're similar enough, and it falls back to pt)
new_keys["pt-BR"] = new_keys["pt"]

# Find each language section and add keys before the closing brace
for lang_code in ["en", "pt", "pt-BR", "es", "fr", "hi"]:
    keys = new_keys.get(lang_code)
    if not keys:
        continue
    
    # Find the last line of this language section (before the closing },)
    # We need to find where this section ends
    # Strategy: find the closing `  },` that ends this section
    
    # Find the start of this section
    section_start = content.find(f'  {lang_code}: {{')
    if section_start == -1:
        print(f"WARNING: Could not find section for {lang_code}")
        continue
    
    # Find the matching closing brace (account for nesting)
    # Simple approach: find the next `  },` at column 0 after section_start
    search_from = section_start + 10
    next_section = content.find('\n  ', search_from)
    
    # Find end of section by looking for the pattern where next section starts
    # or the translations object closes
    insert_pos = next_section
    
    # Build the new keys text
    new_text = "\n    // ===== Common UI Strings =====\n"
    for k, v in keys.items():
        new_text += f'    "{k}": "{v}",\n'
    
    # Insert before the next section
    content = content[:insert_pos] + new_text + content[insert_pos:]
    print(f"Added {len(keys)} keys to {lang_code}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
