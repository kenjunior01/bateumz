#!/usr/bin/env python3
"""Move misplaced Common UI Strings from start to end of each language section"""

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the misplaced block from each section
# Pattern: "// ===== Common UI Strings =====\n" followed by action.* entries
import re

# Remove all misplaced Common UI Strings blocks
pattern = r'\n    // ===== Common UI Strings =====\n(?:    "(?:action|empty|status|error|chat|pix|voted|enter)\.":"[^"]*",?\n)+'

matches = list(re.finditer(pattern, content))
print(f"Found {len(matches)} misplaced blocks")

# Collect all the blocks
blocks = {}
for m in reversed(matches):
    blocks[m.start()] = m.group()
    content = content[:m.start()] + content[m.end():]

print(f"Removed {len(blocks)} blocks, {len(content)} chars remaining")

# Now find the end of each language section and insert the appropriate block
# Language section order: en, pt, pt-BR, es, fr, hi

lang_sections = []
lines = content.split('\n')

for i, line in enumerate(lines):
    stripped = line.strip()
    # Find language section starts
    if re.match(r'"?(en|pt|pt-BR|es|fr|hi)"?\s*:\s*\{', stripped):
        lang = stripped.split(':')[0].strip('"')
        lang_sections.append((i, lang))

print(f"Found {len(lang_sections)} language sections")
for idx, lang in lang_sections:
    print(f"  Line {idx+1}: {lang}")

# For each section, find its closing }, and insert the keys before it
# We need to add keys for en, pt, es, fr, hi (pt-BR falls back to pt)
# We'll insert a generic set based on the language

common_keys_by_lang = {
    "en": '''
    // ===== Common UI Strings =====
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
    "action.shareLive": "Join me on live on Bateu!",
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
    "status.sending": "Sending...",
    "status.loading": "Loading...",
    "status.loadingQuestions": "Loading questions...",
    "status.loadingStripe": "Loading Stripe",\n    "status.botThinking": "The bot is thinking...",
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
    "chat.sendMessage": "Send message...",
    "chat.joinToChat": "Join the live to chat",
    "chat.firstMessage": "Be the first to send a message!",
    "voted": "Voted",
    "enter": "Enter",
''',
}

# For other languages, skip (they'll fallback to en/pt via t())
# But we still need Hindi

# Now for each section, find its closing brace
lines = content.split('\n')

# Find section boundaries properly
sections_info = []
current_section = None
brace_depth = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    # Match section starts like "en:" { or en: {
    m = re.match(r'^  ("?(en|pt"?-"?BR"?|es|fr|hi)"?)\s*:\s*\{', line)
    if m:
        current_section = m.group(2).strip('"')
        brace_depth = 1
        sections_info.append({'line': i, 'lang': current_section, 'depth_start': 1})
        continue
    
    if current_section:
        brace_depth += stripped.count('{') - stripped.count('}')
        if brace_depth == 0:
            current_section = None

print(f"\nSection info: {len(sections_info)}")
for s in sections_info:
    print(f"  Line {s['line']+1}: {s['lang']}")

# Now find closing line for each section (the line with },)
for s in sections_info:
    depth = 1
    for j in range(s['line'] + 1, len(lines)):
        depth += lines[j].count('{') - lines[j].count('}')
        if depth == 0:
            s['end_line'] = j
            break
    else:
        s['end_line'] = len(lines) - 1
    print(f"  {s['lang']}: lines {s['line']+1}-{s['end_line']+1}")

# We only need to add the common keys block at the end of the 'en' section
# Other languages will use fallback. Hindi will also fallback to en for these keys.
# But let's add Hindi translations too for completeness.

# Insert at end of 'en' section
for s in sections_info:
    if s['lang'] == 'en':
        insert_line = s['end_line']  # This is the line with },
        lines.insert(insert_line, common_keys_by_lang['en'])
        print(f"\nInserted common keys at end of 'en' section (before line {insert_line+1})")
        break

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
