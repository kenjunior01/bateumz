#!/usr/bin/env python3
"""Code Audit Report Generator - Bateu Platform"""

import sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import SimpleDocTemplate

FONT_DIR = '/usr/share/fonts'

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f4f4f3')
SECTION_BG    = colors.HexColor('#e9e8e6')
CARD_BG       = colors.HexColor('#eeeeec')
TABLE_STRIPE  = colors.HexColor('#f0efed')
HEADER_FILL   = colors.HexColor('#5e5845')
COVER_BLOCK   = colors.HexColor('#7e7455')
BORDER        = colors.HexColor('#d6d2c6')
ICON          = colors.HexColor('#87794f')
ACCENT        = colors.HexColor('#8d7324')
ACCENT_2      = colors.HexColor('#3294b4')
TEXT_PRIMARY   = colors.HexColor('#201f1d')
TEXT_MUTED     = colors.HexColor('#7a7770')
SEM_SUCCESS   = colors.HexColor('#4b8c61')
SEM_WARNING   = colors.HexColor('#aa8b4d')
SEM_ERROR     = colors.HexColor('#8c4b46')
SEM_INFO      = colors.HexColor('#577ca0')

# ━━ Register Fonts ━━
pdfmetrics.registerFont(TTFont('Inter', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Inter-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
registerFontFamily('Inter', normal='Inter', bold='Inter-Bold')

W, H = A4
MARGIN = 2.2 * cm

# ━━ Styles ━─
styles = getSampleStyleSheet()

s_h1 = ParagraphStyle('H1', fontName='Inter-Bold', fontSize=20, leading=26, spaceAfter=8*mm, textColor=TEXT_PRIMARY)
s_h2 = ParagraphStyle('H2', fontName='Inter-Bold', fontSize=14, leading=19, spaceAfter=5*mm, spaceBefore=7*mm, textColor=HEADER_FILL)
s_h3 = ParagraphStyle('H3', fontName='Inter-Bold', fontSize=11.5, leading=16, spaceAfter=3*mm, spaceBefore=5*mm, textColor=TEXT_PRIMARY)
s_body = ParagraphStyle('Body', fontName='Inter', fontSize=9.5, leading=15, spaceAfter=3*mm, textColor=TEXT_PRIMARY)
s_body_sm = ParagraphStyle('BodySm', fontName='Inter', fontSize=8.5, leading=13, spaceAfter=2*mm, textColor=TEXT_PRIMARY)
s_code = ParagraphStyle('Code', fontName='Inter', fontSize=8, leading=12, spaceAfter=2*mm, textColor=colors.HexColor('#4a4540'), backColor=colors.HexColor('#f7f6f4'), leftIndent=4*mm, rightIndent=4*mm, borderPadding=3*mm)
s_bullet = ParagraphStyle('Bullet', fontName='Inter', fontSize=9.5, leading=15, spaceAfter=2*mm, textColor=TEXT_PRIMARY, leftIndent=6*mm, bulletIndent=3*mm)
s_toc_l0 = ParagraphStyle('TOCL0', fontName='Inter-Bold', fontSize=11, leading=20, leftIndent=0, textColor=HEADER_FILL)
s_toc_l1 = ParagraphStyle('TOCL1', fontName='Inter', fontSize=9.5, leading=18, leftIndent=5*mm, textColor=TEXT_PRIMARY)
s_footer = ParagraphStyle('Footer', fontName='Inter', fontSize=7.5, leading=10, textColor=TEXT_MUTED)

def heading(text, style, level=0):
    key = f'h_{abs(hash(text)) % 100000:08d}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def body(text):
    return Paragraph(text, s_body)

def body_sm(text):
    return Paragraph(text, s_body_sm)

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', s_bullet)

def code(text):
    return Paragraph(f'<font face="Courier">{text}</font>', s_code)

def severity_badge(sev):
    c = {'CRITICAL': SEM_ERROR, 'HIGH': colors.HexColor('#c0652a'), 'MEDIUM': SEM_WARNING, 'LOW': SEM_INFO}[sev]
    bg = c
    txt = colors.white
    return f'<font color="{txt.hexval()}" backColor="{bg.hexval()}" size="7">  {sev}  </font>'

def finding_table(rows):
    col_widths = [14*mm, 32*mm, MARGIN*2 + W - 2*MARGIN - 14*mm - 32*mm - 8*mm, 8*mm]
    header = [
        Paragraph('<b>Severity</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=8, textColor=colors.white, alignment=1)),
        Paragraph('<b>Location</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=8, textColor=colors.white)),
        Paragraph('<b>Description</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=8, textColor=colors.white)),
        Paragraph('<b>#</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=8, textColor=colors.white, alignment=1)),
    ]
    data = [header]
    for sev, loc, desc, num in rows:
        data.append([
            Paragraph(severity_badge(sev), ParagraphStyle('td', fontSize=8, alignment=1)),
            Paragraph(f'<font face="Courier" size="7.5">{loc}</font>', ParagraphStyle('td', fontSize=8)),
            Paragraph(desc, ParagraphStyle('td', fontSize=8, leading=12)),
            Paragraph(num, ParagraphStyle('td', fontSize=8, alignment=1)),
        ])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

# ━━ TOC Template ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFont('Inter', 8)
    canvas.setFillColor(TEXT_MUTED)
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(W / 2, 1.2 * cm, f'{page_num - 2}')
    canvas.restoreState()

def first_page(canvas, doc):
    pass

output_path = '/home/z/my-project/download/Bateu_Code_Audit_Report.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = TocDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title='Bateu Platform - Code Audit Report',
    author='Z.ai',
    subject='Security and code quality audit of the Bateu raffle and live entertainment platform',
    onFirstPage=first_page,
    onLaterPages=later_pages,
)

story = []

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COVER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(Spacer(1, 60*mm))
story.append(Paragraph('CODE AUDIT REPORT', ParagraphStyle('kicker', fontName='Inter', fontSize=11, leading=14, textColor=TEXT_MUTED, spaceAfter=5*mm, letterSpacing=3)))
story.append(Paragraph('Bateu Platform', ParagraphStyle('hero', fontName='Inter-Bold', fontSize=36, leading=42, textColor=TEXT_PRIMARY, spaceAfter=8*mm)))
story.append(Paragraph('Security and Code Quality Assessment', ParagraphStyle('sub', fontName='Inter', fontSize=14, leading=20, textColor=ACCENT, spaceAfter=12*mm)))

summary_data = [[
    Paragraph(f'<b>Project:</b>  Bateu - Raffle and Live Entertainment Platform<br/>'
              f'<b>Stack:</b>  React, TypeScript, Supabase, Vite, Tailwind CSS<br/>'
              f'<b>Audited Files:</b>  25+ source files across frontend, edge functions, and libraries<br/>'
              f'<b>Findings:</b>  5 Critical, 7 High, 8 Medium, 4 Low<br/>'
              f'<b>Date:</b>  August 12, 2026',
              ParagraphStyle('meta', fontName='Inter', fontSize=9.5, leading=17, textColor=TEXT_PRIMARY))
]]
meta_table = Table(summary_data, colWidths=[W - 2*MARGIN])
meta_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
]))
story.append(meta_table)

story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE OF CONTENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
toc = TableOfContents()
toc.levelStyles = [s_toc_l0, s_toc_l1]
story.append(Paragraph('Table of Contents', s_h1))
story.append(toc)
story.append(PageBreak())

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. EXECUTIVE SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('1. Executive Summary', s_h1, 0))

story.append(body(
    'This report presents the findings of a comprehensive code audit conducted on the Bateu platform, '
    'a full-stack React/TypeScript application built on Supabase. The platform provides raffle management, '
    'live entertainment, esports, wallet payments, and gamification features targeting the Mozambican and '
    'broader African market. The audit examined 25+ source files spanning frontend contexts, components, '
    'library modules, and server-side Supabase Edge Functions.'
))

story.append(body(
    'The audit identified <b>24 findings</b> across four severity levels: <b>5 Critical</b>, <b>7 High</b>, '
    '<b>8 Medium</b>, and <b>4 Low</b>. Critical findings include a deceptive fake blockchain verification system, '
    'service-role key acceptance in authentication flows, a voucher double-increment race condition, and '
    'an unauthenticated edge function performing privileged database operations. These issues require '
    'immediate remediation due to their potential impact on platform integrity, financial correctness, and user trust.'
))

story.append(body(
    'On the positive side, the PayPal payment flow implements proper server-authoritative pricing with amount '
    'verification, replay protection, and cross-reference validation between orders and raffles. The authentication '
    'error handling properly prevents account enumeration. The ProtectedRoute component correctly implements '
    'role-based access control for the four primary roles (user, business, admin, superadmin). The codebase demonstrates '
    'a sophisticated understanding of the domain with comprehensive features for a platform at this stage.'
))

story.append(heading('1.1 Scope and Methodology', s_h2, 1))
story.append(body(
    'The audit was conducted through systematic manual review of source code files. Files were selected based on '
    'their security sensitivity (authentication, payments, role management), architectural importance (routing, '
    'state management), and likelihood of containing business logic bugs (wallet, vouchers, gamification). The review '
    'covered the complete Supabase Edge Function layer, all React context providers, key utility libraries, payment '
    'integration components, and the main application routing configuration. Due to the massive scope of the '
    'project (200+ files), individual page components and game modules were sampled rather than exhaustively reviewed.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. FINDINGS SUMMARY TABLE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('2. Findings Summary', s_h1, 0))
story.append(body(
    'The table below consolidates all 24 findings identified during the audit, sorted by severity. Each finding '
    'is assigned a unique identifier for cross-referencing with the detailed analysis in subsequent sections.'
))

all_findings = [
    ('CRITICAL', 'draw-social-winner\n  index.ts:39-48', 'Fake blockchain verification hash using Math.random() - deceptive to users, non-verifiable', 'F-01'),
    ('CRITICAL', 'auto-draw/index.ts:17\nnotify-raffle-ending\n  /index.ts:17', 'Service role key accepted as valid Bearer token in authorization check', 'F-02'),
    ('CRITICAL', 'track-ambassador-visit\n  /index.ts:9-10', 'Unauthenticated edge function uses SERVICE_ROLE_KEY to write and increment database counters', 'F-03'),
    ('CRITICAL', 'vouchers.ts:133-138', 'Voucher use count double-increment: RPC atomic increment followed by non-atomic fallback update', 'F-04'),
    ('CRITICAL', 'create-admin/index.ts\n  :36,48-49', 'Admin creation accepts password in request body; user_metadata role field set client-side', 'F-05'),
    ('HIGH', 'ErrorBoundary.tsx:50', 'Error message exposed to end users in <pre> tag - leaks implementation details', 'F-06'),
    ('HIGH', 'gamification.ts:250', 'Syntax error: missing closing parenthesis in getLeaderboard tips query - runtime crash', 'F-07'),
    ('HIGH', 'AuthContext.tsx:118,146', 'Empty catch blocks silently swallow errors during signup data and referral processing', 'F-08'),
    ('HIGH', 'App.tsx:343-357', 'Confusing dual-timer loading screen logic; sequential double loading screens with main.tsx', 'F-09'),
    ('HIGH', 'App.tsx:8-9', 'Duplicate Toaster components (Sonner + shadcn/ui Toaster) may cause duplicate notifications', 'F-10'),
    ('HIGH', 'wallet.ts:172-173', 'Client-side balance check before withdrawal creates TOCTOU race condition', 'F-11'),
    ('HIGH', 'mcp/index.ts:265', 'Supabase project reference hardcoded in MCP function source', 'F-12'),
    ('MEDIUM', 'wallet.ts:3, stripe.ts:4\ngamification.ts:7, vouchers.ts:4', 'Pervasive "as any" type casting defeats TypeScript type safety across 5+ modules', 'F-13'),
    ('MEDIUM', 'LanguageContext.tsx', '5000+ line translation file embedded in component - should be externalized to JSON/i18n files', 'F-14'),
    ('MEDIUM', 'App.tsx (imports)', 'All 90+ page components eagerly imported - no code splitting or lazy loading', 'F-15'),
    ('MEDIUM', 'Edge functions (all)', 'Access-Control-Allow-Origin: * on all CORS headers - no origin restriction', 'F-16'),
    ('MEDIUM', 'AuthContext.tsx:198', 'signUp() passes role in user_metadata client-side; not used for auth but misleading', 'F-17'),
    ('MEDIUM', 'Edge functions (error)', 'Inconsistent error serialization: String(e) vs (e as Error).message across functions', 'F-18'),
    ('MEDIUM', 'multiple files', 'Mixed language in UI strings: Portuguese, English, and Hindi used inconsistently', 'F-19'),
    ('MEDIUM', 'audit.ts:37-43', 'Audit log uses "as any" casts and catches all errors silently', 'F-20'),
    ('LOW', 'paypal-config/index.ts', 'Unauthenticated endpoint exposes PayPal client ID (though client IDs are semi-public)', 'F-21'),
    ('LOW', 'App.tsx:29,322', 'AdminSpinWheelManager and AdminMillionaireManager duplicated in both /admin and /dashboard routes', 'F-22'),
    ('LOW', 'authErrors.ts', ' signUp error for email_exists suggests "signup" action instead of "signin"', 'F-23'),
    ('LOW', 'main.tsx', 'Unused AnimatePresence import (functionally used but wraps only two states)', 'F-24'),
]

story.append(finding_table(all_findings))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. CRITICAL FINDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('3. Critical Findings', s_h1, 0))

story.append(heading('3.1 F-01: Fake Blockchain Verification Hash', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">supabase/functions/draw-social-winner/index.ts</font>, lines 39-48 and 121-150'
))
story.append(body(
    'The <font face="Courier">generateBlockchainHash()</font> function generates what appears to be a blockchain verification '
    'hash but is entirely fabricated. The function takes a seed string, applies a simple character-code multiplication '
    'formula, and prepends "0x" to produce a 64-character hex string that looks like a real hash. Critically, it '
    'includes <font face="Courier">Math.random()</font> in the seed, making it non-deterministic and non-reproducible. '
    'This means the same raffle, winner, and timestamp will produce a different "hash" each time, defeating the '
    'entire purpose of blockchain verification which requires deterministic, verifiable computation.'
))
story.append(body(
    'The resulting hash is stored in a <font face="Courier">blockchain_verifications</font> table with fields for '
    '<font face="Courier">tx_hash</font>, <font face="Courier">block_number</font>, and <font face="Courier">network: "polygon"</font>. '
    'This creates a false impression that results are verified on the Polygon blockchain when no such verification '
    'occurs. The platform\'s marketing materials reference "Blockchain Verified" results (visible in footer translations '
    'and the <font face="Courier">BlockchainVerification</font> component), which constitutes a trust violation toward users.'
))
story.append(body(
    '<b>Recommendation:</b> Either integrate a real blockchain verification system (e.g., using Polygon smart contracts or '
    'a commitment scheme with on-chain attestation), or remove all blockchain-related language, data fields, and UI '
    'components. If a phased approach is needed, immediately rename the feature to "Verified Draw" with server-side '
    'cryptographic signing (HMAC-SHA256 with a server secret) as an interim measure, and clearly disclose the '
    'verification method to users.'
))

story.append(heading('3.2 F-02: Service Role Key Accepted as Auth Token', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">supabase/functions/auto-draw/index.ts</font> line 17, '
    '<font face="Courier">supabase/functions/notify-raffle-ending/index.ts</font> line 17'
))
story.append(body(
    'The <font face="Courier">isAuthorized()</font> function in both edge functions checks if the Bearer token '
    'matches the <font face="Courier">SUPABASE_SERVICE_ROLE_KEY</font> environment variable. If it matches, the '
    'function immediately returns <font face="Courier">true</font> without any further validation. The service role key '
    'bypasses all Row Level Security (RLS) policies and has unrestricted access to all database operations. If this key '
    'were leaked through logs, error messages, or client-side bundle inclusion, an attacker could call these admin-only '
    'functions with full privileges.'
))
story.append(body(
    '<b>Recommendation:</b> Remove the service-role-key comparison entirely from authorization logic. Edge functions '
    'that need elevated privileges should use the service-role client internally (as <font face="Courier">auto-draw</font> '
    'already does after the auth check), but the <b>authorization decision</b> should be based solely on verifying the '
    'caller\'s JWT token and checking their role via the <font face="Courier">is_superadmin</font> or <font face="Courier">has_role</font> RPC. '
    'Additionally, ensure the service role key is never included in client-side bundles or logged.'
))

story.append(heading('3.3 F-03: Unauthenticated Edge Function with Service Role Access', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">supabase/functions/track-ambassador-visit/index.ts</font>, lines 9-10, 36'
))
story.append(body(
    'This edge function creates a Supabase client using the <font face="Courier">SUPABASE_SERVICE_ROLE_KEY</font> '
    'at the module level and uses it for all database operations, yet the function has <b>no authentication '
    'requirement</b>. Any anonymous HTTP request can trigger the function to insert visit records, increment '
    '<font face="Courier">total_visits</font> counters, and read ambassador data. While the function is designed to track '
    'visits from non-authenticated users (e.g., shared links), the use of the service-role client means it bypasses '
    'all RLS policies. An attacker could craft requests to inflate visit counts for any ambassador, manipulate '
    'analytics data, or potentially cause performance issues through mass inserts.'
))
story.append(body(
    'The function does implement some protections: IP+UA hashing for deduplication and self-referral detection when '
    'a Bearer token is present. However, the self-referral check is described as "best-effort" and only blocks the '
    'obvious case where the authenticated user is the ambassador themselves. A sophisticated attacker could bypass '
    'this with varied IP/UA combinations.'
))
story.append(body(
    '<b>Recommendation:</b> Use the anon key with the caller\'s JWT (when present) instead of the service role key. '
    'For unauthenticated requests, use a dedicated security-definer RPC function that performs the insert within a '
    'strict database function (rather than giving the edge function blanket service-role access). Add rate limiting '
    'per IP address and per ref_code to prevent automated abuse.'
))

story.append(heading('3.4 F-04: Voucher Double-Increment Race Condition', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/lib/vouchers.ts</font>, lines 133-138'
))
story.append(body(
    'The <font face="Courier">applyVoucher()</font> function first calls an RPC named <font face="Courier">increment_voucher_uses</font> '
    '(which presumably performs an atomic increment via SQL <font face="Courier">UPDATE ... SET current_uses = current_uses + 1</font>), '
    'and then unconditionally falls through to a second update that performs a non-atomic read-modify-write: '
    '<font face="Courier">update({ current_uses: voucher.current_uses + 1 })</font>. If the RPC succeeds, the counter is incremented '
    'twice for a single redemption. The comment says "Fallback if RPC doesn\'t exist" but the code does not check '
    'whether the RPC actually failed before executing the fallback.'
))
story.append(body(
    '<b>Impact:</b> Every voucher redemption consumes two uses instead of one. For a voucher with max_uses=10, only '
    '5 redemptions would be possible. This directly affects business revenue and customer experience. The race condition '
    'is compounded under concurrent requests where the non-atomic fallback can also lose increments due to read-write '
    'overlap.'
))
story.append(body(
    '<b>Recommendation:</b> Remove the fallback update entirely. If the RPC does not exist, the function should throw '
    'an error rather than silently double-counting. Alternatively, restructure to use only the RPC (preferred) or only '
    'the direct update with proper atomic SQL. The current dual-path approach is inherently unsafe.'
))

story.append(heading('3.5 F-05: Admin Creation Security Concerns', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">supabase/functions/create-admin/index.ts</font>, lines 36-49'
))
story.append(body(
    'The <font face="Courier">create-admin</font> edge function accepts email and password in the request body and '
    'creates users with <font face="Courier">email_confirm: true</font>, bypassing email verification. While the function '
    'correctly requires superadmin authorization, several concerns exist: (1) passwords transmitted in request bodies '
    'may be logged by infrastructure proxies; (2) the function creates users with <font face="Courier">user_metadata.role: "admin"</font> '
    'which, while not used for authorization (the actual role check queries the database), creates confusion about where '
    'roles are authoritative; (3) if an existing user\'s email is provided, the function resets their password without '
    'notifying them.'
))
story.append(body(
    '<b>Recommendation:</b> Add rate limiting to the create-admin endpoint. Log all admin creation attempts (success and '
    'failure) to the audit trail. For password resets on existing users, send a notification email. Remove the '
    '<font face="Courier">role</font> field from user_metadata since it is not the source of truth. Consider requiring the new admin '
    'to set their own password via an email link rather than accepting it in the request body.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. HIGH FINDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('4. High Findings', s_h1, 0))

story.append(heading('4.1 F-06: Error Message Information Disclosure', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/components/ErrorBoundary.tsx</font>, line 50'
))
story.append(body(
    'The <font face="Courier">ErrorBoundary</font> component renders <font face="Courier">this.state.error.message</font> '
    'inside a <font face="Courier">&lt;pre&gt;</font> tag when an uncaught error occurs. Error messages from React errors can '
    'contain file paths, component names, prop types, API endpoint URLs, and potentially sensitive data that was '
    'being processed when the error occurred. This information is visible to all users, including unauthenticated ones, '
    'and could aid attackers in understanding the application\'s internal structure.'
))
story.append(body(
    '<b>Recommendation:</b> Replace the error message display with a generic user-friendly message. Log the full error '
    'details to an error reporting service (e.g., Sentry) or to the console. The <font face="Courier">AppErrorBoundary</font> in '
    '<font face="Courier">App.tsx</font> (line 389) correctly only logs to console without displaying the message, providing '
    'a good template to follow.'
))

story.append(heading('4.2 F-07: Runtime Crash in Gamification Leaderboard', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/lib/gamification.ts</font>, line 250'
))
story.append(body(
    'The <font face="Courier">getLeaderboard()</font> function has a syntax error in the tips branch. The code reads: '
    '<font face="Courier">.select("*, profiles(display_name, avatar_url, company_name)"</font> followed immediately by '
    '<font face="Courier">.order("tips_total", ...)</font> without a closing parenthesis for the select call. This will '
    'cause a runtime TypeError when any user views the tips leaderboard, crashing the entire component that depends on it.'
))
story.append(body(
    '<b>Recommendation:</b> Add the missing closing parenthesis: <font face="Courier">.select("*, profiles(display_name, avatar_url, company_name)")</font>. '
    'Consider adding unit tests for each leaderboard type to catch syntax errors before deployment.'
))

story.append(heading('4.3 F-08: Silent Error Swallowing in Auth Context', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/contexts/AuthContext.tsx</font>, lines 118 and 146'
))
story.append(body(
    'Two critical code paths in the authentication flow use empty <font face="Courier">catch {}</font> blocks that silently '
    'discard errors. The first (line 118) handles the processing of extra signup data (phone, province, city, interests) '
    'stored in localStorage. If this fails, the user\'s profile will be incomplete with no indication to the user or to '
    'developers. The second (line 146) handles referral processing, which inserts records into <font face="Courier">referrals</font> '
    'and <font face="Courier">luck_points</font> tables. A failure here means a referrer loses their 50-point bonus without any '
    'retry mechanism or logging.'
))
story.append(body(
    '<b>Recommendation:</b> Add <font face="Courier">console.error()</font> logging at minimum. Better yet, show a non-blocking '
    'notification to the user that profile data may need to be re-submitted. For referrals, implement a retry queue '
    'or at minimum store the pending referral for re-processing on next login.'
))

story.append(heading('4.4 F-09: Confusing Dual Loading Screen', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/main.tsx</font> lines 21-34 and <font face="Courier">src/App.tsx</font> lines 343-357'
))
story.append(body(
    'Users experience two sequential loading screens. First, <font face="Courier">main.tsx</font> renders a LoadingScreen '
    'for a fixed 2200ms timer. Then <font face="Courier">App.tsx</font> renders another LoadingScreen with a more complex '
    'dual-timer logic (4s primary, 1.8s quick when config loads). The total loading time can reach 4+ seconds, '
    'with two visually identical loading screens creating a jarring experience. The App.tsx timer logic is also '
    'confusing: the 4s timer is always created even when it will be superseded by the 1.8s timer, creating unnecessary '
    'timer churn.'
))
story.append(body(
    '<b>Recommendation:</b> Consolidate to a single loading screen. Use React Suspense with lazy-loaded route components '
    'for a more natural loading experience. If a branded loading screen is desired, render it once in App.tsx only, '
    'driven by actual data readiness (auth + config loaded) rather than arbitrary timers.'
))

story.append(heading('4.5 F-10: Duplicate Toast Notification Systems', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/App.tsx</font>, lines 8-9'
))
story.append(body(
    'Both <font face="Courier">Sonner</font> (from <font face="Courier">@/components/ui/sonner</font>) and <font face="Courier">Toaster</font> '
    '(from <font face="Courier">@/components/ui/toaster</font>) are rendered in the app. Different parts of the codebase may use '
    'different toast systems, leading to inconsistent styling and potentially duplicate notifications if a single '
    'event triggers both. For example, a payment error handled by code that calls both <font face="Courier">toast()</font> '
    '(from use-toast hook) and <font face="Courier">sonner</font> would show two notifications for the same event.'
))
story.append(body(
    '<b>Recommendation:</b> Standardize on a single toast/notification system across the entire codebase. Audit all '
    'imports of <font face="Courier">use-toast</font> and <font face="Courier">sonner</font> and migrate to the chosen system.'
))

story.append(heading('4.6 F-11: Client-Side TOCTOU in Withdrawal', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/lib/wallet.ts</font>, lines 172-173'
))
story.append(body(
    'The <font face="Courier">createWithdrawalRequest()</font> function checks the user\'s balance client-side before '
    'processing the withdrawal. Between the balance check and the actual debit via <font face="Courier">processTransaction()</font>, '
    'another request could modify the balance. While the server-side <font face="Courier">wallet_process_transaction</font> RPC likely '
    'handles atomicity, the client-side check creates a confusing UX where the function returns null (silently fails) '
    'when the balance was sufficient at check time but insufficient at debit time, with no clear error message.'
))
story.append(body(
    '<b>Recommendation:</b> Remove the client-side balance check and rely entirely on the server-side transaction. Return '
    'meaningful error messages when the server-side transaction fails due to insufficient funds.'
))

story.append(heading('4.7 F-12: Hardcoded Project Reference', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">supabase/functions/mcp/index.ts</font>, line 265'
))
story.append(body(
    'The MCP (Model Context Protocol) edge function contains a hardcoded Supabase project reference: '
    '<font face="Courier">var projectRef = "ngxrdpplyghlugoowjqj"</font>. This value is used to construct the OAuth issuer URL '
    'for authentication. While the project reference is somewhat discoverable (it appears in the Supabase API URL), '
    'hardcoding it in source code that may be committed to version control creates an unnecessary exposure. If the '
    'project is migrated or the reference changes, this would require a code change rather than a configuration update.'
))
story.append(body(
    '<b>Recommendation:</b> Replace with <font face="Courier">Deno.env.get("SUPABASE_URL")</font> and extract the project reference '
    'from the URL at runtime, matching the pattern already used in <font face="Courier">supabaseForUser()</font> elsewhere in the same file.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. MEDIUM FINDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('5. Medium Findings', s_h1, 0))

story.append(heading('5.1 F-13: Pervasive Type Safety Erosion', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">wallet.ts:3</font>, <font face="Courier">stripe.ts:4</font>, <font face="Courier">gamification.ts:7</font>, '
    '<font face="Courier">vouchers.ts:4</font>, <font face="Courier">audit.ts:37-43</font>'
))
story.append(body(
    'Five or more modules cast the Supabase client to <font face="Courier">any</font> immediately after import (e.g., '
    '<font face="Courier">const sb: any = supabase</font>). This completely disables TypeScript\'s type checking for all '
    'subsequent database queries, insertions, and RPC calls. The root cause appears to be a mismatch between the generated '
    'types in <font face="Courier">src/integrations/supabase/types.ts</font> and the actual database schema. Rather than fixing the type '
    'definitions, developers chose to bypass them entirely. This means that column name typos, wrong data types, and '
    'missing fields will only be caught at runtime, not during development.'
))
story.append(body(
    '<b>Recommendation:</b> Regenerate the Supabase types using the latest CLI (<font face="Courier">supabase gen types</font>) and fix any '
    'resulting type errors in the generated definitions. Use <font face="Courier">as any</font> only as a temporary measure on specific '
    'lines, not as a module-wide cast. Create proper TypeScript interfaces for any custom or complex query results.'
))

story.append(heading('5.2 F-14: Monolithic Translation File', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/contexts/LanguageContext.tsx</font> (5119 lines)'
))
story.append(body(
    'All translation strings for 6 languages (en, pt, pt-BR, es, fr, hi) are embedded directly in a single React context file. '
    'This file alone accounts for over 5000 lines of code, making it one of the largest files in the project. This approach '
    'has several drawbacks: (1) any translation change requires redeploying the entire frontend bundle; (2) the file cannot '
    'be loaded on demand, increasing initial bundle size; (3) it is difficult for non-developers (translators) to contribute; '
    '(4) it pollutes the React context module with data that should be separate.'
))
story.append(body(
    '<b>Recommendation:</b> Externalize translations to separate JSON files per locale (e.g., <font face="Courier">locales/en.json</font>, '
    '<font face="Courier">locales/pt.json</font>). Load them asynchronously using a standard i18n library like <font face="Courier">react-i18next</font> '
    'or a lightweight custom loader. This reduces the main bundle and enables translator-friendly workflows.'
))

story.append(heading('5.3 F-15: No Code Splitting', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/App.tsx</font> (approximately 150 static imports)'
))
story.append(body(
    'All 90+ page components are statically imported at the top of App.tsx. This means the entire application, including '
    'admin pages, esports modules, and game components that most users will never visit, is bundled into a single '
    'JavaScript chunk. For a platform of this size, this significantly impacts initial page load time, especially on '
    'mobile networks common in the target African markets.'
))
story.append(body(
    '<b>Recommendation:</b> Use <font face="Courier">React.lazy()</font> with <font face="Courier">Suspense</font> for route-level code splitting. '
    'Group related routes (admin, dashboard, esports, games) into separate chunks. This is particularly important for '
    'the 70+ live game components in <font face="Courier">src/components/livegames/</font>.'
))

story.append(heading('5.4 F-16: Overly Permissive CORS', s_h2, 1))
story.append(body(
    '<b>Location:</b> All Supabase Edge Functions use <font face="Courier">Access-Control-Allow-Origin: *</font>'
))
story.append(body(
    'Every edge function in the project uses a wildcard CORS origin, allowing any website to make authenticated '
    'requests to the platform\'s backend if it can obtain a user\'s JWT token. While the token itself provides authentication, '
    'wildcard CORS enables cross-site request scenarios where a malicious website could invoke edge functions using '
    'stolen tokens. The PayPal config endpoint is particularly concerning as it requires no authentication at all.'
))
story.append(body(
    '<b>Recommendation:</b> Restrict <font face="Courier">Access-Control-Allow-Origin</font> to the platform\'s actual domain(s). '
    'Use an environment variable to configure allowed origins. For development, maintain a separate allowlist that includes '
    'localhost variants.'
))

story.append(heading('5.5 F-17: Client-Side Role in User Metadata', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/contexts/AuthContext.tsx</font>, line 198'
))
story.append(body(
    'The <font face="Courier">signUp()</font> function includes <font face="Courier">role: meta?.role || "user"</font> in the user metadata sent to '
    'Supabase Auth. While the actual authorization logic in <font face="Courier">fetchProfile()</font> correctly queries the '
    '<font face="Courier">user_roles</font> database table (ignoring the metadata), storing a role in client-controlled metadata '
    'is misleading and could lead to security bugs if a future developer mistakenly uses the metadata role for '
    'authorization. The <font face="Courier">create-admin</font> edge function (F-05) compounds this by also writing roles to metadata.'
))
story.append(body(
    '<b>Recommendation:</b> Remove the role field from user metadata entirely in the signup flow. Roles should only exist '
    'in the <font face="Courier">user_roles</font> database table, set exclusively by authorized server-side functions.'
))

story.append(heading('5.6 F-18: Inconsistent Error Handling', s_h2, 1))
story.append(body(
    'Edge functions use different patterns for serializing errors to JSON responses. Some use <font face="Courier">String(e)</font> '
    '(paypal-create-order, auto-draw), others use <font face="Courier">(e as Error).message</font> (notify-raffle-ending, draw-social-winner), '
    'and some use <font face="Courier">String((e as Error).message || e)</font> (track-ambassador-visit). These differences matter: '
    '<font face="Courier">String(e)</font> on a non-Error object may produce "[object Object]" while <font face="Courier">.message</font> on a non-Error '
    'produces "undefined". Standardize error handling across all edge functions to ensure consistent and safe error responses.'
))

story.append(heading('5.7 F-19: Mixed Language Strings', s_h2, 1))
story.append(body(
    'The codebase contains UI strings in Portuguese, English, and Hindi without a consistent language policy. For example, '
    '<font face="Courier">upload-utils.ts</font> returns Portuguese error messages ("Ficheiro demasiado grande"), while <font face="Courier">authErrors.ts</font> '
    'returns English messages. The <font face="Courier">LanguageContext</font> provides translations for six languages, but many components '
    'use hardcoded strings that bypass this system. This creates an inconsistent user experience where parts of the '
    'UI change language while others remain fixed.'
))

story.append(heading('5.8 F-20: Silent Audit Logging Failure', s_h2, 1))
story.append(body(
    '<b>Location:</b> <font face="Courier">src/lib/audit.ts</font>, lines 37-46'
))
story.append(body(
    'The <font face="Courier">logAudit()</font> function uses <font face="Courier">as any</font> casts for both the table name and the insert '
    'payload, and wraps the entire operation in a try-catch that silently discards errors. Since audit logging is a critical '
    'compliance and security feature, silent failures mean that important actions (payment approvals, raffle draws, settings '
    'changes) may go unrecorded without anyone knowing. The type casts suggest the audit_logs table structure is not properly '
    'included in the generated TypeScript types.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. LOW FINDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('6. Low Findings', s_h1, 0))

story.append(heading('6.1 F-21: Unauthenticated PayPal Config Endpoint', s_h2, 1))
story.append(body(
    'The <font face="Courier">paypal-config</font> edge function returns the PayPal client ID without any authentication. While '
    'PayPal client IDs are designed to be public (they are embedded in frontend JavaScript by PayPal\'s own SDK), '
    'exposing it via a separate endpoint adds an unnecessary network call and could be simplified by using an environment '
    'variable directly in the PayPalProvider component. The current approach does have the advantage of allowing server-side '
    'key rotation without frontend redeployment.'
))

story.append(heading('6.2 F-22: Duplicated Admin Components in Routes', s_h2, 1))
story.append(body(
    'Both <font face="Courier">AdminSpinWheelManager</font> and <font face="Courier">AdminMillionaireManager</font> are imported and used '
    'in both the <font face="Courier">/admin</font> route (lines 322-323) and the <font face="Courier">/dashboard</font> route (lines 281-282) of App.tsx. '
    'This means business users have access to admin-level game configuration components that should likely be restricted '
    'to admin users only. If this is intentional, it should be documented; if not, it represents a potential privilege escalation.'
))

story.append(heading('6.3 F-23: Misleading Sign-Up Error Action', s_h2, 1))
story.append(body(
    'In <font face="Courier">src/lib/authErrors.ts</font>, the <font face="Courier">email_exists</font> error suggests the user should "Try signing in instead" '
    'but sets <font face="Courier">action: "signup"</font> instead of <font face="Courier">action: "signin"</font>. This means the UI will show a "Create account" link '
    'when the user already has an account, directing them to the wrong flow.'
))

story.append(heading('6.4 F-24: AnimatePresence in main.tsx', s_h2, 1))
story.append(body(
    'The <font face="Courier">AnimatePresence</font> component in <font face="Courier">main.tsx</font> wraps only two states (loading screen and app), '
    'which limits its usefulness. Since the loading screen transition happens only once per session and the app itself '
    'handles its own internal transitions, the outer AnimatePresence adds complexity without meaningful benefit. '
    'This is a very minor finding with no functional impact.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. POSITIVE OBSERVATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('7. Positive Observations', s_h1, 0))
story.append(body(
    'Despite the issues identified, the codebase demonstrates several strong security and architectural practices '
    'that are worth highlighting:'
))
story.append(bullet(
    '<b>Server-Authoritative PayPal Pricing (F-01 through F-04):</b> The PayPal payment flow is well-designed. '
    'The <font face="Courier">paypal-create-order</font> function computes the amount server-side from the database price, '
    'not from client-provided values. The <font face="Courier">paypal-capture-order</font> function verifies the paid amount matches '
    'the expected amount (within 0.01 tolerance), checks the order\'s reference_id matches the raffle, implements replay '
    'protection via duplicate order_id checks, and uses the service-role client to insert participants.'
))
story.append(bullet(
    '<b>Anti-Enumeration in Auth Errors:</b> The <font face="Courier">authErrors.ts</font> module correctly maps raw Supabase auth errors '
    'to generic messages that do not reveal whether an email address is registered, preventing account enumeration attacks.'
))
story.append(bullet(
    '<b>Proper Role Hierarchy:</b> The <font face="Courier">ProtectedRoute</font> component correctly implements a four-tier role '
    'hierarchy (superadmin > admin > regional_manager > business > user) with appropriate redirect logic for each role '
    'and a <font face="Courier">blockRoles</font> mechanism for excluding specific roles from routes.'
))
story.append(bullet(
    '<b>Auth Bootstrap Pattern:</b> The <font face="Courier">AuthProvider</font> correctly uses a <font face="Courier">bootstrapped</font> flag to prevent '
    'duplicate processing during the initial session bootstrap, preventing a race condition between '
    '<font face="Courier">getSession()</font> and <font face="Courier">onAuthStateChange()</font>.'
))
story.append(bullet(
    '<b>PayPal Key Rotation:</b> The <font face="Courier">PayPalProvider</font> fetches the PayPal client ID from a server-side edge function '
    'rather than hardcoding it in the frontend, enabling server-side key rotation without frontend redeployment.'
))
story.append(bullet(
    '<b>Referral Anti-Fraud:</b> The <font face="Courier">track-ambassador-visit</font> function implements IP+UA+visitor hash deduplication '
    'and self-referral detection, reducing the impact of referral fraud.'
))

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. RECOMMENDATIONS PRIORITY MATRIX
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story.append(heading('8. Recommendations Priority Matrix', s_h1, 0))
story.append(body(
    'The following table provides a prioritized remediation plan based on effort and impact. Items are grouped into three '
    'tiers: immediate (this sprint), short-term (next 2 sprints), and medium-term (next quarter).'
))

priority_rows = [
    ('Immediate', 'F-01', 'Remove or replace fake blockchain verification', 'High trust impact', '2-3 days'),
    ('Immediate', 'F-02', 'Remove service-role key auth check', 'Critical security', '1 hour'),
    ('Immediate', 'F-04', 'Remove voucher double-increment fallback', 'Financial correctness', '15 minutes'),
    ('Immediate', 'F-07', 'Fix missing parenthesis in getLeaderboard', 'Runtime crash', '5 minutes'),
    ('Immediate', 'F-23', 'Fix email_exists action to "signin"', 'UX bug', '2 minutes'),
    ('Short-term', 'F-03', 'Add auth/rate-limiting to track-ambassador-visit', 'Data integrity', '4 hours'),
    ('Short-term', 'F-05', 'Add rate limiting and logging to create-admin', 'Security hardening', '2 hours'),
    ('Short-term', 'F-06', 'Remove error.message from ErrorBoundary display', 'Info disclosure', '30 minutes'),
    ('Short-term', 'F-08', 'Add logging to empty catch blocks in AuthContext', 'Debugging capability', '1 hour'),
    ('Short-term', 'F-10', 'Standardize on single toast system', 'UX consistency', '4 hours'),
    ('Short-term', 'F-11', 'Remove client-side balance check in withdrawal', 'UX correctness', '30 minutes'),
    ('Short-term', 'F-13', 'Fix TypeScript types, remove "as any" casts', 'Type safety', '1-2 days'),
    ('Short-term', 'F-16', 'Restrict CORS origins', 'Security hardening', '1 hour'),
    ('Short-term', 'F-17', 'Remove role from user_metadata in signup', 'Security clarity', '30 minutes'),
    ('Short-term', 'F-20', 'Fix audit log typing and error handling', 'Compliance', '2 hours'),
    ('Medium-term', 'F-09', 'Consolidate to single loading screen', 'UX improvement', '4 hours'),
    ('Medium-term', 'F-14', 'Externalize translations to JSON files', 'Bundle size, maintainability', '2-3 days'),
    ('Medium-term', 'F-15', 'Implement route-level code splitting', 'Performance', '1 day'),
    ('Medium-term', 'F-18', 'Standardize edge function error handling', 'Consistency', '3 hours'),
    ('Medium-term', 'F-19', 'Audit and fix mixed-language strings', 'i18n quality', '1-2 days'),
    ('Medium-term', 'F-22', 'Remove admin components from dashboard routes', 'Access control', '1 hour'),
]

pcol = [22*mm, 14*mm, 65*mm, 28*mm, W - 2*MARGIN - 22*mm - 14*mm - 65*mm - 28*mm]
pheader = [
    Paragraph('<b>Priority</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=7.5, textColor=colors.white, alignment=1)),
    Paragraph('<b>ID</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=7.5, textColor=colors.white, alignment=1)),
    Paragraph('<b>Recommendation</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=7.5, textColor=colors.white)),
    Paragraph('<b>Impact</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=7.5, textColor=colors.white)),
    Paragraph('<b>Effort</b>', ParagraphStyle('th', fontName='Inter-Bold', fontSize=7.5, textColor=colors.white, alignment=1)),
]
pdata = [pheader]
for pri, fid, rec, imp, eff in priority_rows:
    pcolor = SEM_ERROR if pri == 'Immediate' else (SEM_WARNING if pri == 'Short-term' else SEM_INFO)
    pdata.append([
        Paragraph(f'<font color="{pcolor.hexval()}"><b>{pri}</b></font>', ParagraphStyle('td', fontSize=7.5, alignment=1)),
        Paragraph(f'<font face="Courier" size="7">{fid}</font>', ParagraphStyle('td', fontSize=7.5, alignment=1)),
        Paragraph(rec, ParagraphStyle('td', fontSize=7.5, leading=10)),
        Paragraph(imp, ParagraphStyle('td', fontSize=7.5, leading=10)),
        Paragraph(eff, ParagraphStyle('td', fontSize=7.5, alignment=1)),
    ])
ptable = Table(pdata, colWidths=pcol, repeatRows=1)
pstyle = [
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ('GRID', (0, 0), (-1, -1), 0.3, BORDER),
]
for i in range(1, len(pdata)):
    if i % 2 == 0:
        pstyle.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
ptable.setStyle(TableStyle(pstyle))
story.append(ptable)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
doc.multiBuild(story)
print(f'PDF generated: {output_path}')
