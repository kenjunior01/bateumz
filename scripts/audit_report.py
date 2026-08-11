#!/usr/bin/env python3
"""Comprehensive Code Audit Report - Bateu Gaming Platform
Generated via ReportLab + Playwright cover merge pipeline
"""

import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Font registration
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-VariableFont_wght.ttf', subfontIndex=0))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LibSans', f'{FONT_DIR}/truetype/chinese/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('LibSans', normal='LibSans', bold='LibSans-Bold')

# ── Palette (from cascade) ──
PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#f1f0ef')
CARD_BG       = colors.HexColor('#eeece8')
TABLE_STRIPE  = colors.HexColor('#eeedec')
HEADER_FILL   = colors.HexColor('#5a5138')
COVER_BLOCK   = colors.HexColor('#716952')
BORDER        = colors.HexColor('#bfb9a6')
ICON          = colors.HexColor('#988447')
ACCENT        = colors.HexColor('#97781a')
ACCENT_2      = colors.HexColor('#5a40a7')
TEXT_PRIMARY   = colors.HexColor('#1b1a18')
TEXT_MUTED     = colors.HexColor('#7c7a73')
SEM_SUCCESS   = colors.HexColor('#427e56')
SEM_WARNING   = colors.HexColor('#b08c44')
SEM_ERROR     = colors.HexColor('#9f534c')
SEM_INFO      = colors.HexColor('#486e95')

# ── Styles ──
PAGE_W, PAGE_H = A4
LEFT_M = 22*mm
RIGHT_M = 22*mm
TOP_M = 25*mm
BOT_M = 25*mm
CONTENT_W = PAGE_W - LEFT_M - RIGHT_M

styles = getSampleStyleSheet()

sH1 = ParagraphStyle('H1', fontName='LibSans-Bold', fontSize=18, leading=24, textColor=TEXT_PRIMARY, spaceAfter=6*mm, spaceBefore=8*mm)
sH2 = ParagraphStyle('H2', fontName='LibSans-Bold', fontSize=14, leading=19, textColor=ACCENT, spaceAfter=4*mm, spaceBefore=6*mm)
sH3 = ParagraphStyle('H3', fontName='LibSans-Bold', fontSize=11.5, leading=16, textColor=HEADER_FILL, spaceAfter=3*mm, spaceBefore=5*mm)
sBody = ParagraphStyle('Body', fontName='NotoSerifSC', fontSize=9.5, leading=15, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=3*mm)
sBodySmall = ParagraphStyle('BodySmall', fontName='NotoSerifSC', fontSize=8.5, leading=13, textColor=TEXT_MUTED, alignment=TA_JUSTIFY, spaceAfter=2*mm)
sBullet = ParagraphStyle('Bullet', fontName='NotoSerifSC', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, leftIndent=14, bulletIndent=4, spaceAfter=1.5*mm)
sCode = ParagraphStyle('Code', fontName='LibSans', fontSize=8, leading=12, textColor=SEM_ERROR, backColor=colors.HexColor('#f8f6f3'), leftIndent=8, rightIndent=8, spaceBefore=2*mm, spaceAfter=2*mm, borderPadding=4)
sSeverity = ParagraphStyle('Severity', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white, alignment=TA_CENTER)
sCaption = ParagraphStyle('Caption', fontName='NotoSerifSC', fontSize=8, leading=11, textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=2*mm)

OUTPUT_PDF = '/home/z/my-project/download/Code_Audit_Report_Bateu_Platform.pdf'
os.makedirs(os.path.dirname(OUTPUT_PDF), exist_ok=True)

# ── Helpers ──
def P(text, style=sBody):
    return Paragraph(text, style)

def HR():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=3*mm, spaceAfter=3*mm)

def severity_badge(level):
    color_map = {'CRITICAL': SEM_ERROR, 'HIGH': colors.HexColor('#d97706'), 'MEDIUM': SEM_WARNING, 'LOW': SEM_INFO}
    bg = color_map.get(level, TEXT_MUTED)
    return f'<font color="{bg.hexval()}" backColor="#f0eeeb"><b>&nbsp;{level}&nbsp;</b></font>'

def issue_table(issues, cols=None):
    """Build a table of issues with severity, file, description, and fix."""
    if cols is None:
        usable = CONTENT_W - 4*mm
        cols = [18*mm, 32*mm, usable - 18*mm - 32*mm - 48*mm, 48*mm]

    header = [Paragraph(f'<b>{t}</b>', ParagraphStyle('th', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white))
               for t in ['Severity', 'File', 'Issue', 'Recommended Fix']]
    data = [header]
    for sev, file, desc, fix in issues:
        row = [
            Paragraph(severity_badge(sev), sSeverity),
            Paragraph(f'<font size="8">{file}</font>', ParagraphStyle('file', fontName='LibSans', fontSize=8, leading=11, textColor=ACCENT)),
            Paragraph(f'<font size="8">{desc}</font>', ParagraphStyle('desc', fontName='NotoSerifSC', fontSize=8, leading=11, textColor=TEXT_PRIMARY)),
            Paragraph(f'<font size="8">{fix}</font>', ParagraphStyle('fix', fontName='NotoSerifSC', fontSize=8, leading=11, textColor=SEM_SUCCESS)),
        ]
        data.append(row)

    t = Table(data, colWidths=cols, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'LibSans-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def stat_card(number, label, color=ACCENT):
    """Single stat card as a small table."""
    data = [[Paragraph(f'<font size="16" color="{color.hexval()}"><b>{number}</b></font>',
                     ParagraphStyle('stat', alignment=TA_CENTER, fontSize=16, leading=20, spaceAfter=1*mm)),
             Paragraph(f'<font size="7" color="{TEXT_MUTED.hexval()}">{label}</font>',
                     ParagraphStyle('statlabel', alignment=TA_CENTER, fontSize=7, leading=10))]]
    t = Table(data, colWidths=[CONTENT_W / 4 - 2*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('ROUNDEDCORNERS', [3, 3, 3, 3]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t

# ── Build Document ──
doc = SimpleDocTemplate(
    OUTPUT_PDF,
    pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M,
    topMargin=TOP_M, bottomMargin=BOT_M,
    title='Code Audit Report - Bateu Gaming Platform',
    author='Z.ai',
    subject='Comprehensive Security and Code Quality Audit',
)

story = []

# ═══════════════════════════════════════════════════════════════
# CHAPTER 1: Executive Summary
# ═══════════════════════════════════════════════════════════════
story.append(P('1. Executive Summary', sH1))
story.append(HR())

story.append(P(
    'This report presents the findings of a comprehensive code audit conducted on the Bateu gaming platform, '
    'a React + TypeScript + Vite application backed by Supabase for authentication, database, and storage. '
    'The audit systematically examined all source files across the codebase including game modules, authentication flows, '
    'wallet and payment systems, admin panels, routing configuration, and core infrastructure components. '
    'The primary objective was to identify bugs, security vulnerabilities, architectural weaknesses, and code quality '
    'issues that could impact the platform\'s reliability, security, or user experience.', sBody))

story.append(P(
    'The audit revealed a total of <b>37 issues</b> spanning four severity levels: <b>8 Critical</b>, <b>10 High</b>, '
    '<b>12 Medium</b>, and <b>7 Low</b>. The most concerning findings center around client-side game logic with no server-side '
    'validation, which makes all gambling outcomes trivially exploitable by any technically-savvy user. Additionally, '
    'approximately 10 out of 25 game component files contain broken import statements that would cause immediate runtime '
    'crashes, suggesting these components were either generated with errors or never tested after initial creation. '
    'The authentication and role-based access control system, while functional, contains several design gaps that could '
    'allow privilege escalation under specific conditions.', sBody))

# Stats row
stat_data = [[stat_card('37', 'Total Issues Found', SEM_ERROR),
              stat_card('8', 'Critical Severity', SEM_ERROR),
              stat_card('10', 'High Severity', colors.HexColor('#d97706')),
              stat_card('10/25', 'Games with Broken Imports', ACCENT)]]
stat_table = Table(stat_data, colWidths=[CONTENT_W/4]*4)
stat_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 1),
    ('RIGHTPADDING', (0, 0), (-1, -1), 1),
]))
story.append(Spacer(1, 4*mm))
story.append(stat_table)
story.append(Spacer(1, 4*mm))

story.append(P(
    'The findings are organized into six major categories: Critical Import Errors that cause runtime crashes, '
    'Game Security Vulnerabilities that allow outcome manipulation, Authentication and Authorization issues, '
    'Wallet and Financial system concerns, Architectural and Code Quality problems, and Minor UI/UX defects. '
    'Each issue includes the affected file path, a detailed description of the problem, its potential impact, '
    'and a concrete recommended fix. The report concludes with a prioritized remediation roadmap that addresses '
    'the most critical issues first, followed by high-priority security hardening, and then systematic quality improvements.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 2: Critical Import Errors
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('2. Critical Import Errors (Runtime Crashes)', sH1))
story.append(HR())

story.append(P(
    'Approximately 10 out of 25 game component files in the <font face="LibSans">/src/pages/games/</font> directory contain '
    'malformed or incorrect import statements that will cause immediate runtime crashes when the component is rendered. '
    'These errors range from misspelled module paths to entirely non-existent import sources, and from duplicate import '
    'declarations to syntax-level errors in the import statement itself. Each of these files would display a blank page '
    'or an error boundary fallback when a user attempts to navigate to the corresponding game. This represents the largest '
    'single category of defects in the codebase and suggests that these components were never tested in a browser after '
    'their initial creation, likely being generated through an automated process without subsequent validation.', sBody))

import_errors = [
    ('CRITICAL', 'Keno.tsx', 'Imports useAuth from wrong path "../../integrations/supabase/client" instead of "@/contexts/AuthContext"', 'Change import to: import { useAuth } from "@/contexts/AuthContext"'),
    ('CRITICAL', 'DoubleOrNothing.tsx', 'Imports useAuth from "react" which does not export useAuth', 'Change import to: import { useAuth } from "@/contexts/AuthContext"'),
    ('CRITICAL', 'HiLo.tsx', 'Malformed import path: " components/UiLib" (leading space, wrong module)', 'Change import to: import { useAuth } from "@/contexts/AuthContext"'),
    ('CRITICAL', 'SpinTheWheel.tsx', 'Duplicate and malformed import statement causing syntax error', 'Remove duplicate import; use: import { useAuth } from "@/contexts/AuthContext"'),
    ('CRITICAL', 'SliderPuzzle.tsx', 'Malformed duplicate import declaration', 'Remove duplicate import; consolidate into single valid import'),
    ('CRITICAL', 'Turbo20.tsx', 'Imports useAuth from "../../contexts/statusext" - non-existent module', 'Change import to: import { useAuth } from "@/contexts/AuthContext"'),
    ('CRITICAL', 'Damas.tsx', 'Import statement contains "import { supabase } errors" - invalid syntax', 'Fix to: import { supabase } from "@/integrations/supabase/client"'),
    ('CRITICAL', 'TicTacToe.tsx', 'Imports from "role" - non-existent module', 'Change to correct path: import { useAuth } from "@/contexts/AuthContext"'),
    ('HIGH', 'LuckyDice.tsx', 'Exported as REAL_LuckyDice but App.tsx imports as default LuckyDice', 'Change export to: export default function LuckyDice()'),
    ('HIGH', 'TowerBuilder.tsx', 'Contains "export default function" inside an import statement', 'Separate import and export default declarations'),
    ('HIGH', 'DoubleRoll.tsx', 'Typo in path: "../../integrations/supashed/client" instead of "supabase"', 'Fix typo: "@/integrations/supabase/client"'),
]
story.append(issue_table(import_errors))
story.append(Spacer(1, 3*mm))
story.append(P(
    '<b>Impact Assessment:</b> These 11 broken files mean that roughly 44% of the game catalog is completely non-functional. '
    'When a user clicks on any of these games from the AllGames page, they will encounter either a white screen, an error '
    'boundary fallback, or an uncaught module resolution error. This directly impacts user trust and retention, as users '
    'who encounter broken games are unlikely to continue using the platform. The root cause appears to be inconsistent code '
    'generation, possibly through an AI-assisted tool that produced syntactically incorrect import statements that were never '
    'validated through compilation or browser testing.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 3: Game Security Vulnerabilities
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('3. Game Security Vulnerabilities', sH1))
story.append(HR())

story.append(P('3.1 Client-Side Randomization (No Server Validation)', sH2))

story.append(P(
    'The most critical security finding across the entire platform is the universal reliance on client-side '
    '<font face="LibSans">Math.random()</font> for determining game outcomes in all gambling-style games. '
    'This means that every game result, from Crash multipliers to Mines tile positions to Scratch Card prizes, '
    'is computed entirely in the user\'s browser with no server-side verification or validation. Any user with basic '
    'knowledge of browser developer tools can inspect, modify, or predict game outcomes before they are displayed, '
    'effectively allowing them to cheat with 100% certainty. This is not a theoretical vulnerability but a practical '
    'exploit that requires no advanced tools beyond the built-in Chrome or Firefox DevTools.', sBody))

story.append(P(
    'The specific exploitation methods vary by game type but share a common pattern: the random seed or outcome '
    'is computed in JavaScript and stored in React state before being rendered to the user. In Crash, the crash point '
    'is calculated as <font face="LibSans">Math.random() * 9 + 1</font> and can be found by setting a breakpoint '
    'in the React component. In Mines, the mine positions array is stored directly in component state, visible via the '
    'React DevTools extension. In Scratch Card, the prize is determined client-side before the scratch animation begins. '
    'In every case, the user can determine the outcome before committing any wager, making the concept of "gambling" '
    'entirely illusory from a fairness perspective.', sBody))

game_sec_issues = [
    ('CRITICAL', 'Crash.tsx', 'Crash point computed client-side via Math.random() * 9 + 1, inspectable in DevTools before cash-out', 'Implement server-side crash point generation via Supabase Edge Function or RPC; client should only receive result after commit'),
    ('CRITICAL', 'Mines.tsx', 'Mine positions stored in React state array, fully visible via React DevTools', 'Generate mine layout server-side; reveal tiles one at a time via API calls with server verification'),
    ('CRITICAL', 'ScratchCard.tsx', 'Prize determined client-side before scratch animation; user can inspect prize via DevTools', 'Generate prize server-side via RPC call; only reveal after scratch interaction'),
    ('CRITICAL', 'Blackjack.tsx', 'Card deck shuffled and dealt client-side; suit typo "dearth" instead of "diamonds"', 'Implement server-side shoe management; fix suit name typo'),
    ('HIGH', 'Plinko.tsx', 'Ball path and landing slot computed client-side with Math.random()', 'Add server-side outcome verification via Supabase RPC'),
    ('HIGH', 'CoinFlip.tsx', 'Coin result determined by client-side Math.random()', 'Generate result server-side before displaying animation'),
    ('HIGH', 'RollOver.tsx', 'Dice roll outcome computed entirely client-side', 'Move randomization to server-side Edge Function'),
    ('HIGH', 'AvatarFortune.tsx', 'Fortune outcome determined client-side', 'Use server-side RPC for fortune generation'),
]
story.append(issue_table(game_sec_issues))
story.append(Spacer(1, 3*mm))

story.append(P('3.2 Financial Impact Analysis', sH2))

story.append(P(
    'The financial implications of these client-side game vulnerabilities cannot be overstated. In a real-money gaming '
    'platform, the ability to predict outcomes before placing wagers represents a complete failure of the core business '
    'model. Even if the platform currently operates with virtual currency or points, the trust deficit created by these '
    'vulnerabilities extends to every aspect of the platform\'s credibility. Users who discover these exploits can accumulate '
    'unlimited winnings, drain wallet balances, and undermine the entire reward ecosystem including the referral program\'s '
    'Luck Points system. Furthermore, if the platform processes real money through any of its supported payment methods '
    '(M-Pesa, PIX, PayPal, Visa, Mastercard, Bitcoin), the operators could face legal liability for operating an unfair gaming '
    'system. Regulatory bodies in most jurisdictions require server-side outcome generation with verifiable randomness, and '
    'the current implementation would fail any compliance audit.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 4: Authentication & Authorization
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('4. Authentication and Authorization Issues', sH1))
story.append(HR())

story.append(P(
    'The authentication system is built on Supabase Auth with a custom role-based access control layer implemented in '
    '<font face="LibSans">AuthContext.tsx</font> and enforced via the <font face="LibSans">ProtectedRoute</font> component. '
    'While the fundamental architecture is sound, several implementation details create security gaps that could allow '
    'unauthorized access or privilege escalation. The following table documents each identified issue with its severity, '
    'affected component, and recommended remediation.', sBody))

auth_issues = [
    ('HIGH', 'AuthContext.tsx (line 190-204)', 'signUp passes role in user_metadata which is client-modifiable; user can self-assign any role including "admin" or "superadmin" during registration', 'Role assignment MUST happen server-side only via Supabase trigger or Edge Function; never trust client-provided role metadata'),
    ('HIGH', 'AuthContext.tsx (line 198)', 'Role metadata sent to Supabase but role enforcement relies on user_roles table fetched separately; inconsistency between metadata and table can cause state mismatch', 'Remove role from user_metadata entirely; use only server-managed user_roles table with RLS policies'),
    ('HIGH', 'ProtectedRoute.tsx (line 6)', 'requiredRole type does not include "superadmin"; superadmin access relies on admin check including superadmin as fallback', 'Add "superadmin" to the requiredRole union type and add explicit superadmin checking logic'),
    ('MEDIUM', 'Register.tsx', 'Registration form has no role selection field; all users default to "user" role. Business registration path is unclear', 'Add role selection for business accounts or create separate business registration flow with verification'),
    ('MEDIUM', 'AuthContext.tsx (line 98-118)', 'Extra signup data read from localStorage without validation; malformed JSON could cause silent failure', 'Add try/catch with specific error handling and data validation before processing'),
    ('MEDIUM', 'AuthContext.tsx (line 122-147)', 'Referral processing uses client-side points insertion; race condition if multiple referrals processed simultaneously', 'Move referral processing to a server-side database trigger with atomic operations'),
    ('LOW', 'Login.tsx', 'Password input field missing "required" attribute', 'Add required attribute to password input element'),
    ('LOW', 'Login.tsx', 'CSS typo: "text-key" class instead of "text-sm"', 'Fix to text-sm'),
]
story.append(issue_table(auth_issues))
story.append(Spacer(1, 3*mm))

story.append(P(
    'The most significant authentication concern is the client-side role assignment during registration. Although the current '
    '<font face="LibSans">Register.tsx</font> does not expose a role selection field to users, the underlying '
    '<font face="LibSans">signUp()</font> function in AuthContext passes a <font face="LibSans">role</font> parameter '
    'through user metadata. Any technically-savvy user could intercept the registration request via browser DevTools or a proxy '
    'and modify the <font face="LibSans">role</font> field to "admin" or "superadmin". While the actual role enforcement '
    'pulls from the <font face="LibSans">user_roles</font> table rather than user metadata, this defense-in-depth gap '
    'could become exploitable if the role initialization logic ever changes to trust the metadata value. The fix is straightforward: '
    'remove all role-related data from the client-side registration flow and implement role assignment exclusively through '
    'server-side database triggers or Supabase Edge Functions.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 5: Wallet & Financial System
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('5. Wallet and Financial System', sH1))
story.append(HR())

story.append(P(
    'The wallet system is implemented through a combination of client-side React components and Supabase RPC functions. '
    'The core transaction processing uses a server-side RPC called <font face="LibSans">wallet_process_transaction</font> '
    'which provides some protection against direct balance manipulation. However, several architectural weaknesses remain '
    'in the deposit and withdrawal flows that could be exploited for financial gain.', sBody))

wallet_issues = [
    ('HIGH', 'UserDashboard.tsx (line 85-107)', 'Reward redemption has a TOCTOU race condition: checks client-side points balance then performs two separate insert operations; concurrent redemptions could overspend points', 'Implement atomic server-side RPC that checks balance AND deducts points in a single transaction with row-level locking'),
    ('HIGH', 'DepositModal.tsx', 'Deposit requests are manual (upload receipt for admin review) but receipt image is stored as base64 data URL; no file size validation beyond HTML accept attribute', 'Add explicit file size validation (max 5MB) in JavaScript before upload; validate MIME type server-side; store in Supabase Storage instead of base64'),
    ('MEDIUM', 'wallet.ts (line 171-201)', 'Withdrawal checks client-side balance before debiting via RPC; if balance changes between check and debit, withdrawal could fail after funds already committed', 'The RPC function should handle the balance check internally as an atomic operation; remove client-side balance check'),
    ('MEDIUM', 'DepositModal.tsx (line 23-33)', 'Hardcoded payment instructions contain real phone numbers and financial details (M-Pesa: 841234567, IBAN: MO0001234567890)', 'Move payment instructions to a server-side configuration table or environment variables; never hardcode financial account details in frontend code'),
    ('MEDIUM', 'wallet.ts (line 3)', 'supabase client cast to "any" bypasses TypeScript type safety across the entire wallet module', 'Use proper Supabase Database types instead of casting to any; define proper RPC return types'),
    ('LOW', 'Referral.tsx (line 56)', 'Referral share text mentions "US &amp; Canada" but platform targets Mozambique and Portuguese-speaking markets', 'Update share text to match actual target market: Mozambique, Brazil, Portugal'),
]
story.append(issue_table(wallet_issues))
story.append(Spacer(1, 3*mm))

story.append(P(
    'The hardcoded payment details in <font face="LibSans">DepositModal.tsx</font> represent both a security and maintenance concern. '
    'Real phone numbers, IBAN accounts, PayPal addresses, and Bitcoin wallet addresses are embedded directly in the React '
    'component source code. If any of these payment details change, a full deployment cycle is required. More critically, these '
    'details are visible to anyone who inspects the application\'s JavaScript bundle, potentially exposing financial account '
    'information to bad actors. The recommended approach is to store all payment configuration in a server-side database table '
    '(e.g., <font face="LibSans">payment_methods</font>) with an admin management interface, and load them dynamically '
    'when the deposit modal opens.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 6: Routing & Architecture
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('6. Routing and Architecture Issues', sH1))
story.append(HR())

story.append(P(
    'The application uses React Router with a large route tree managed in <font face="LibSans">App.tsx</font>. '
    'The routing architecture handles over 80 routes across public pages, protected user pages, business dashboard, and admin '
    'panels. While the overall structure is well-organized with nested layouts, several issues were identified that affect '
    'navigation behavior, user experience, and maintainability.', sBody))

arch_issues = [
    ('HIGH', 'App.tsx', 'Auto-redirect on login affects ALL routes including /login, /register, and / - users cannot visit login page when already authenticated', 'Add exclusion list for public routes that should not trigger redirect: ["/login", "/register", "/", "/forgot-password"]'),
    ('MEDIUM', 'App.tsx (route table)', 'Duplicate route: /games/hi-lo/:id maps to QuickMath instead of HiLo game', 'Fix route to: <Route path="/games/hi-lo/:id" element={<HiLo />} />'),
    ('MEDIUM', 'App.tsx (line 153)', 'useParams imported from react-router-dom twice (line 5 and line 153)', 'Remove duplicate import; consolidate into single import statement'),
    ('MEDIUM', 'AdminRegionalManagers.tsx (line 28)', 'supabase client cast to "any" bypasses all TypeScript safety', 'Use proper typed Supabase client instead of const sb: any = supabase'),
    ('MEDIUM', 'RegionalManagerPanel.tsx (line 22)', 'Same supabase cast to any pattern, disabling type safety', 'Remove the any cast; use properly typed queries'),
    ('MEDIUM', 'AdminSuperDashboard.tsx (line 4)', 'supabase imported then immediately cast to any', 'Use proper Database types from generated types.ts'),
    ('LOW', 'App.tsx', 'Loading screen has a 4-second forced timeout plus a 1.8-second conditional timeout; no way for users with slow connections to skip it', 'Reduce max timeout to 2.5s; add a "Skip" button for slow connections'),
    ('LOW', 'App.tsx (line 342-350)', 'Overlay detection uses 300ms interval polling instead of router-based detection', 'Use useLocation hook to detect overlay routes reactively instead of polling'),
    ('LOW', 'LanguageContext.tsx', 'Massive 106KB translation file embedded in-context; should be code-split', 'Move translations to separate JSON files loaded dynamically per locale'),
]
story.append(issue_table(arch_issues))
story.append(Spacer(1, 3*mm))

story.append(P(
    'The auto-redirect issue in App.tsx is particularly problematic from a user experience perspective. The current implementation '
    'monitors authentication state changes and automatically redirects authenticated users away from the current page. This means '
    'that if an authenticated user tries to navigate to the login page, the registration page, or even the home page, they are '
    'forcefully redirected to their dashboard or profile. While this pattern is common for dashboard-only applications, it breaks '
    'expected navigation behavior for a platform that also serves public content like raffles, games, and community features. '
    'The fix requires maintaining an exclusion list of public routes that should remain accessible regardless of authentication state, '
    'and only applying the redirect logic to routes that genuinely require authentication.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 7: Admin & Access Control
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('7. Admin Panel and Access Control', sH1))
story.append(HR())

story.append(P(
    'The admin panel is implemented through a nested layout in <font face="LibSans">AdminLayout.tsx</font> with multiple '
    'sub-pages handling user management, raffle administration, revenue tracking, payments, settings, and game management. '
    'The Regional Manager panel provides independent branding and configuration controls per region. The Super Admin '
    'dashboard manages regions and admin assignments. While these panels function correctly for their intended use cases, '
    'several issues affect security posture and data integrity.', sBody))

admin_issues = [
    ('MEDIUM', 'AdminSuperDashboard.tsx (line 179-183)', 'Admin lookup uses .ilike("email", newAdminEmail) on profiles table, but profiles table does not have an email column per types.ts schema', 'Query auth.users via admin API or join with profiles properly; verify column existence'),
    ('MEDIUM', 'AdminSuperDashboard.tsx (line 307)', 'Global revenue displayed with USD formatting ($ prefix) regardless of actual currency setting', 'Use the platform\'s currency formatter (formatMZN) or dynamically select based on region'),
    ('MEDIUM', 'AdminDashboard.tsx (line 24)', 'fetches ALL raffles without pagination (.select("*") with no .range()) - will degrade as raffle count grows', 'Add pagination: .select("*").range(0, 49) with infinite scroll or load-more button'),
    ('LOW', 'AdminSuperDashboard.tsx (line 538-549)', 'Three settings buttons in Global Settings tab have no onClick handlers - they are non-functional placeholders', 'Implement handler functions or remove the buttons until the features are ready'),
    ('LOW', 'AdminRegionalManagers.tsx', 'Uses supabase cast to any throughout, disabling all type checking for admin operations', 'Use properly typed Supabase client; define manager interfaces matching the database schema'),
]
story.append(issue_table(admin_issues))
story.append(Spacer(1, 3*mm))

story.append(P(
    'The unbounded raffle query in <font face="LibSans">AdminDashboard.tsx</font> is a performance time bomb. Currently, the admin '
    'dashboard fetches every raffle in the database with <font face="LibSans">.select("*")</font> and no range or pagination limit. '
    'Each raffle row includes all columns, and the client then iterates over the full result set to compute aggregate statistics '
    '(total revenue, tickets sold, active count). As the platform grows and accumulates hundreds or thousands of raffles, this '
    'query will return increasingly large payloads, consuming bandwidth and memory on both the server and client. The revenue and '
    'statistics calculations should be moved to a server-side aggregation query or materialized view that returns pre-computed '
    'counts and sums, with the client only receiving the summary numbers and a paginated list of recent raffles.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 8: Code Quality
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('8. Code Quality and Maintainability', sH1))
story.append(HR())

story.append(P(
    'Beyond the security and functional bugs documented in previous chapters, the codebase exhibits several patterns that '
    'impede long-term maintainability. These include inconsistent use of TypeScript type safety through pervasive <font '
    'face="LibSans">any</font> casting, mixed language in code comments and UI strings (Portuguese, English, and local '
    'dialects interspersed without a consistent i18n strategy), and a monolithic component structure in several game files '
    'that exceed 800-1200 lines without decomposition into smaller, testable units.', sBody))

quality_issues = [
    ('MEDIUM', 'Multiple files', 'Pervasive use of "const sb: any = supabase" pattern in wallet.ts, AdminRegionalManagers.tsx, RegionalManagerPanel.tsx, AdminSuperDashboard.tsx - defeats TypeScript safety', 'Remove all any casts; use the generated Database types from types.ts for type-safe queries'),
    ('MEDIUM', 'Blackjack.tsx', 'Single file is 1205 lines with no component decomposition; deck management, game logic, and UI rendering all in one component', 'Extract game logic into custom hooks (useDeck, useBlackjackGame) and split UI into sub-components'),
    ('MEDIUM', 'Crash.tsx', 'Single file is 803 lines mixing animation logic, game state, and API interactions', 'Apply same decomposition pattern: extract hooks for game logic and animation control'),
    ('LOW', 'Navbar.tsx', 'Massive 50KB+ component handling navigation, mega-menus, announcements, auth state, and notifications', 'Decompose into smaller components: NavMenu, AnnouncementBanner, AuthSection, NotificationSection'),
    ('LOW', 'Index.tsx', 'Home page is 54KB+ with numerous features, animations, and data fetching in a single component', 'Split into feature modules; use lazy loading for below-fold sections'),
    ('LOW', 'LanguageContext.tsx', '106KB translation dictionary embedded inline; bloats the main bundle for all users regardless of locale', 'Code-split translations per locale; lazy-load only the active language'),
]
story.append(issue_table(quality_issues))
story.append(Spacer(1, 3*mm))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 9: Remediation Roadmap
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('9. Prioritized Remediation Roadmap', sH1))
story.append(HR())

story.append(P('9.1 Phase 1: Emergency Fixes (Week 1)', sH2))
story.append(P(
    'The first phase addresses the most critical issues that either cause immediate runtime failures or represent '
    'exploitable security vulnerabilities. These fixes should be prioritized above all other development work, as they '
    'directly impact the platform\'s ability to function correctly and securely. The estimated effort for this phase is '
    '3-5 development days, assuming familiarity with the Supabase ecosystem and React patterns used in the codebase.', sBody))

phase1_data = [
    [P('<b>Priority</b>', ParagraphStyle('th2', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Issue</b>', ParagraphStyle('th3', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Effort</b>', ParagraphStyle('th4', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Impact</b>', ParagraphStyle('th5', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white))],
    [P('<font size="8">P0</font>'), P('<font size="8">Fix all 11 broken game imports (Chapter 2)</font>'), P('<font size="8">2-3h</font>'), P('<font size="8">Restores 44% of game catalog</font>')],
    [P('<font size="8">P0</font>'), P('<font size="8">Remove role from client-side signUp metadata (Chapter 4)</font>'), P('<font size="8">1h</font>'), P('<font size="8">Prevents role escalation</font>')],
    [P('<font size="8">P0</font>'), P('<font size="8">Move hardcoded payment details to server config (Chapter 5)</font>'), P('<font size="8">2h</font>'), P('<font size="8">Protects financial account info</font>')],
    [P('<font size="8">P0</font>'), P('<font size="8">Fix Blackjack suit typo "dearth" to "diamonds" (Chapter 3)</font>'), P('<font size="8">5min</font>'), P('<font size="8">Corrects game logic error</font>')],
    [P('<font size="8">P1</font>'), P('<font size="8">Fix App.tsx auto-redirect and duplicate route (Chapter 6)</font>'), P('<font size="8">1h</font>'), P('<font size="8">Restores normal navigation</font>')],
    [P('<font size="8">P1</font>'), P('<font size="8">Fix LuckyDice export name mismatch (Chapter 2)</font>'), P('<font size="8">5min</font>'), P('<font size="8">Restores LuckyDice game</font>')],
]
phase1_table = Table(phase1_data, colWidths=[12*mm, CONTENT_W - 12*mm - 16*mm - 32*mm, 16*mm, 32*mm])
phase1_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
] + [('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE) for i in range(2, len(phase1_data), 2)]))
story.append(phase1_table)
story.append(Spacer(1, 4*mm))

story.append(P('9.2 Phase 2: Security Hardening (Weeks 2-3)', sH2))
story.append(P(
    'The second phase addresses the fundamental architectural issue of client-side game outcome generation. This is the '
    'most complex and time-consuming phase, as it requires implementing server-side game logic for all gambling-style games '
    'while maintaining the existing user interface and animation systems. The recommended approach is to create Supabase '
    'Edge Functions that handle game outcome generation, bet placement, and result verification. Each game should expose a '
    'well-defined API contract: the client sends a bet request, the server generates the outcome using a cryptographically '
    'secure random number generator, stores the result, and returns it to the client. The client then plays the animation '
    'based on the server-provided outcome, with no ability to modify or predict the result.', sBody))

story.append(P(
    'The implementation priority within this phase should follow the games\' financial exposure: Crash first (highest potential '
    'loss due to unlimited multiplier), then Mines (high exploitability via React DevTools), then Blackjack (complex but '
    'high-value game), then Scratch Card, and finally the remaining simpler games. Each game migration should include unit '
    'tests verifying that the server outcome is correctly applied and that the client cannot override it. The estimated total '
    'effort for this phase is 10-15 development days, and it should be completed before any real-money transaction processing '
    'is enabled on the platform.', sBody))

story.append(P('9.3 Phase 3: Quality and Performance (Weeks 4-5)', sH2))
story.append(P(
    'The third phase focuses on code quality improvements, performance optimization, and architectural cleanup. This includes '
    'removing all <font face="LibSans">any</font> casts from Supabase queries and replacing them with properly typed alternatives '
    'using the generated <font face="LibSans">Database</font> type from <font face="LibSans">types.ts</font>. '
    'Large monolithic components (Blackjack at 1205 lines, Crash at 803 lines, Navbar at 50KB+) should be decomposed into '
    'smaller, more maintainable units using custom hooks for logic extraction and sub-components for UI rendering. The '
    'translation system in LanguageContext should be code-split to avoid loading all translations for all locales in the '
    'main bundle. The admin dashboard\'s unbounded raffle query should be replaced with a paginated approach or server-side '
    'aggregation. Finally, the TOCTOU race condition in the points redemption system should be resolved by moving the balance '
    'check and deduction into a single atomic database transaction.', sBody))

# ═══════════════════════════════════════════════════════════════
# CHAPTER 10: Summary
# ═══════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P('10. Summary of Findings', sH1))
story.append(HR())

summary_data = [
    [P('<b>Category</b>', ParagraphStyle('sh1', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Critical</b>', ParagraphStyle('sh2', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>High</b>', ParagraphStyle('sh3', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Medium</b>', ParagraphStyle('sh4', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Low</b>', ParagraphStyle('sh5', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white)),
     P('<b>Total</b>', ParagraphStyle('sh6', fontName='LibSans-Bold', fontSize=8, leading=11, textColor=colors.white))],
    [P('<font size="8">Import Errors (Ch.2)</font>'), P('<font size="8" color="#9f534c"><b>8</b></font>'), P('<font size="8">3</font>'), P('<font size="8">0</font>'), P('<font size="8">0</font>'), P('<font size="8"><b>11</b></font>')],
    [P('<font size="8">Game Security (Ch.3)</font>'), P('<font size="8" color="#9f534c"><b>4</b></font>'), P('<font size="8">4</font>'), P('<font size="8">0</font>'), P('<font size="8">0</font>'), P('<font size="8"><b>8</b></font>')],
    [P('<font size="8">Auth &amp; AuthZ (Ch.4)</font>'), P('<font size="8">0</font>'), P('<font size="8">3</font>'), P('<font size="8">3</font>'), P('<font size="8">2</font>'), P('<font size="8"><b>8</b></font>')],
    [P('<font size="8">Wallet &amp; Finance (Ch.5)</font>'), P('<font size="8">0</font>'), P('<font size="8">2</font>'), P('<font size="8">3</font>'), P('<font size="8">1</font>'), P('<font size="8"><b>6</b></font>')],
    [P('<font size="8">Routing &amp; Architecture (Ch.6)</font>'), P('<font size="8">0</font>'), P('<font size="8">1</font>'), P('<font size="8">4</font>'), P('<font size="8">3</font>'), P('<font size="8"><b>8</b></font>')],
    [P('<font size="8">Admin Panel (Ch.7)</font>'), P('<font size="8">0</font>'), P('<font size="8">0</font>'), P('<font size="8">3</font>'), P('<font size="8">2</font>'), P('<font size="8"><b>5</b></font>')],
    [P('<font size="8">Code Quality (Ch.8)</font>'), P('<font size="8">0</font>'), P('<font size="8">0</font>'), P('<font size="8">3</font>'), P('<font size="8">3</font>'), P('<font size="8"><b>6</b></font>')],
    [P('<b>Total</b>'), P('<b><font size="8" color="#9f534c">12</font></b>'), P('<b><font size="8">13</font></b>'), P('<b><font size="8">16</font></b>'), P('<b><font size="8">11</font></b>'), P('<b><font size="8">52</font></b>')],
]

summary_cols = [38*mm, 18*mm, 18*mm, 18*mm, 18*mm, 18*mm]
summary_table = Table(summary_data, colWidths=summary_cols, repeatRows=1)
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('BACKGROUND', (0, -1), (-1, -1), CARD_BG),
    ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
] + [('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE) for i in range(2, len(summary_data) - 1, 2)]))
story.append(summary_table)
story.append(Spacer(1, 5*mm))

story.append(P(
    'This audit has identified 37 distinct issues across 8 categories, with 12 classified as Critical, 13 as High, '
    '16 as Medium, and 11 as Low severity. The platform\'s most pressing vulnerabilities are the client-side game '
    'outcome generation (affecting all gambling-style games) and the broken import statements (affecting 44% of the game '
    'catalog). Both categories require immediate attention before the platform can be considered production-ready for any '
    'real-money gaming scenario. The authentication system requires hardening to prevent potential privilege escalation, '
    'and the wallet system needs atomic transaction handling to prevent race conditions. The recommended three-phase '
    'remediation approach prioritizes user-facing fixes first, then security hardening, and finally code quality improvements, '
    'allowing the platform to achieve a functional and secure state within approximately five weeks of focused development effort.', sBody))

# ── Build ──
doc.build(story)
print(f'Body PDF generated: {OUTPUT_PDF}')
