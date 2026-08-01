---
Task ID: 1
Agent: Main Agent
Task: Fix navigation errors on bateu.online - English text showing on Portuguese pages

Work Log:
- Used agent-browser to inspect the live site at bateu.online
- Discovered the root cause: default language resolving to "en" when country is "US"
- Nav showed English (Raffles, Business, Entertainment, Community, More, 0 live now)
- Footer, categories, search chips, contest showcase all showed English
- Changed default language fallback from "en" to "pt" in country-language.ts
- Changed SSR default country from "US" to "MZ"
- Changed t() resolver fallback chain: selected lang → pt → en
- Changed useLanguage() fallback to pt with en as secondary
- Rewrote ContestTypesShowcase to use t() instead of hardcoded English
- Added 38 contest.* translation keys for both en and pt
- Built, committed, and pushed to GitHub

Stage Summary:
- All nav/footer/category/contest text now defaults to Portuguese
- Users who explicitly select English still get English
- Build passes clean, pushed to main (commit 3eda7e5)
