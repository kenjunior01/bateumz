---
Task ID: 1
Agent: main
Task: Fix game crash errors when clicking games + finalize i18n translations

Work Log:
- Diagnosed that clicking games triggered AppErrorBoundary (whole-app crash, "recarregar página" message)
- Root causes: (a) no per-game error boundaries, (b) dead code in AppErrorBoundary, (c) duplicate pt-BR block
- Created fix-games-and-i18n.py to apply all fixes atomically
- Merged two duplicate "pt-BR" blocks in LanguageContext.tsx (lines 861-1371 + 1372-1452)
- Fixed missing closing brace after merge
- Ran dedup-ptbr.py to remove 80+ duplicate keys within merged pt-BR block
- Added GameErrorBoundary class component wrapping game render area in LiveHub.tsx
- Fixed AppErrorBoundary: changed dead if-return pattern to proper if/else with retry button
- Removed 3 dead files: Navbar.tsx.broken, Navbar.tsx.bak, LiveHub.tsx.bak
- Added 34 new i18n keys (en + pt) for games/live/error sections
- Translated InstantWin.tsx from hardcoded English to use t() function
- Build verified: 0 errors, 0 warnings

Stage Summary:
- Games no longer crash the entire app - GameErrorBoundary catches errors per-game
- Users can click "Tentar novamente" to retry instead of being forced to reload
- pt-BR translations properly merged and deduplicated
- InstantWin page now uses i18n for all text
- 2 commits pushed to GitHub