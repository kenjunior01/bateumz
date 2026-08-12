#!/usr/bin/env python3
"""
Bateumz Platform - Comprehensive Code Audit Report
Generated via ReportLab
"""

import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ─── Fonts ───────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')

# ─── Palette (Cascade) ──────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f1f1ef')
SECTION_BG    = colors.HexColor('#eeedeb')
CARD_BG       = colors.HexColor('#ecebe7')
TABLE_STRIPE  = colors.HexColor('#f1f1ef')
HEADER_FILL   = colors.HexColor('#71684c')
COVER_BLOCK   = colors.HexColor('#7f765a')
BORDER        = colors.HexColor('#d1ccbb')
ICON          = colors.HexColor('#7c6d3f')
ACCENT        = colors.HexColor('#8b7226')
ACCENT_2      = colors.HexColor('#3b92ae')
TEXT_PRIMARY   = colors.HexColor('#22211f')
TEXT_MUTED     = colors.HexColor('#7b7871')
SEM_SUCCESS   = colors.HexColor('#4b8a60')
SEM_WARNING   = colors.HexColor('#ad8a44')
SEM_ERROR     = colors.HexColor('#92514b')
SEM_INFO      = colors.HexColor('#517eac')

# ─── Styles ──────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 1.0 * inch
CONTENT_W = PAGE_W - 2 * MARGIN

styles = getSampleStyleSheet()

s_h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='NotoSansSC-Bold', fontSize=20, leading=26, textColor=TEXT_PRIMARY, spaceAfter=12, spaceBefore=24)
s_h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='NotoSansSC-Bold', fontSize=15, leading=20, textColor=TEXT_PRIMARY, spaceAfter=8, spaceBefore=18)
s_h3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='NotoSansSC-Bold', fontSize=12, leading=16, textColor=ACCENT, spaceAfter=6, spaceBefore=12)
s_body = ParagraphStyle('Body', parent=styles['Normal'], fontName='NotoSerifSC', fontSize=10, leading=16, textColor=TEXT_PRIMARY, spaceAfter=8, alignment=4)  # justified
s_body_left = ParagraphStyle('BodyLeft', parent=s_body, alignment=0)
s_code = ParagraphStyle('Code', parent=styles['Code'], fontName='NotoSansSC', fontSize=8.5, leading=12, textColor=colors.HexColor('#3d3d3d'), backColor=colors.HexColor('#f5f5f3'), borderWidth=0.5, borderColor=BORDER, borderPadding=6, leftIndent=12, rightIndent=12, spaceAfter=8, spaceBefore=4)
s_bullet = ParagraphStyle('Bullet', parent=s_body, leftIndent=24, bulletIndent=12, spaceBefore=2, spaceAfter=2)
s_table_header = ParagraphStyle('TH', fontName='NotoSansSC-Bold', fontSize=9, leading=12, textColor=colors.white, alignment=0)
s_table_cell = ParagraphStyle('TC', fontName='NotoSerifSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY, alignment=0)
s_table_cell_sm = ParagraphStyle('TCS', fontName='NotoSansSC', fontSize=8, leading=11, textColor=TEXT_MUTED, alignment=0)
s_severity_critical = ParagraphStyle('SevCrit', fontName='NotoSansSC-Bold', fontSize=9, textColor=SEM_ERROR)
s_severity_high = ParagraphStyle('SevHigh', fontName='NotoSansSC-Bold', fontSize=9, textColor=colors.HexColor('#c0503a'))
s_severity_medium = ParagraphStyle('SevMed', fontName='NotoSansSC-Bold', fontSize=9, textColor=SEM_WARNING)
s_severity_low = ParagraphStyle('SevLow', fontName='NotoSansSC-Bold', fontSize=9, textColor=SEM_SUCCESS)
s_caption = ParagraphStyle('Caption', fontName='NotoSansSC', fontSize=8.5, leading=12, textColor=TEXT_MUTED, alignment=2, spaceAfter=12)

# ─── Helper functions ────────────────────────────────────────────────────
def h1(text): return Paragraph(text, s_h1)
def h2(text): return Paragraph(text, s_h2)
def h3(text): return Paragraph(text, s_h3)
def body(text): return Paragraph(text, s_body)
def body_left(text): return Paragraph(text, s_body_left)
def code(text): return Paragraph(text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), s_code)
def bullet(text): return Paragraph(f"\u2022 {text}", s_bullet)
def caption(text): return Paragraph(text, s_caption)
def hr(): return HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8, spaceBefore=8)

def severity_cell(level):
    mapping = {
        'CRITICAL': (s_severity_critical, SEM_ERROR),
        'HIGH': (s_severity_high, colors.HexColor('#c0503a')),
        'MEDIUM': (s_severity_medium, SEM_WARNING),
        'LOW': (s_severity_low, SEM_SUCCESS),
    }
    sty, col = mapping.get(level, (s_table_cell, TEXT_PRIMARY))
    return Paragraph(level, sty)

def make_table(headers, rows, col_widths=None):
    if col_widths is None:
        col_widths = [CONTENT_W * w for w in [0.12, 0.18, 0.50, 0.20]]
    
    header_row = [Paragraph(h, s_table_header) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([
            severity_cell(row[0]),
            Paragraph(row[1], s_table_cell),
            Paragraph(row[2], s_table_cell_sm),
            Paragraph(row[3], s_table_cell_sm),
        ])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

# ─── Build Document ─────────────────────────────────────────────────────
OUTPUT = '/home/z/my-project/download/Bateumz_Code_Audit_Report.pdf'
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title='Bateumz Platform - Code Audit Report',
    author='Z.ai',
    subject='Security and Quality Audit',
)

story = []

# ═══════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════
story.append(Spacer(1, 120))
story.append(Paragraph("Code Audit Report", ParagraphStyle('CoverTitle', fontName='NotoSansSC-Bold', fontSize=36, leading=44, textColor=TEXT_PRIMARY, alignment=1)))
story.append(Spacer(1, 16))
story.append(HRFlowable(width="40%", thickness=3, color=ACCENT, spaceAfter=16, spaceBefore=4))
story.append(Paragraph("Bateumz Platform", ParagraphStyle('CoverSub', fontName='NotoSansSC', fontSize=18, leading=24, textColor=TEXT_MUTED, alignment=1)))
story.append(Spacer(1, 24))
story.append(Paragraph("Full-Stack React + Supabase Application", ParagraphStyle('CoverDesc', fontName='NotoSerifSC', fontSize=12, leading=18, textColor=TEXT_MUTED, alignment=1)))
story.append(Spacer(1, 8))
story.append(Paragraph("Raffles / Esports / Live Games / Wallet / Betting / Multi-Region", ParagraphStyle('CoverDesc2', fontName='NotoSerifSC', fontSize=10, leading=15, textColor=TEXT_MUTED, alignment=1)))
story.append(Spacer(1, 80))

meta_data = [
    [Paragraph('<b>Date</b>', s_table_cell), Paragraph('2026-08-13', s_table_cell)],
    [Paragraph('<b>Auditor</b>', s_table_cell), Paragraph('Z.ai Automated Audit', s_table_cell)],
    [Paragraph('<b>Scope</b>', s_table_cell), Paragraph('Security, Architecture, Performance, Best Practices', s_table_cell)],
    [Paragraph('<b>Files Scanned</b>', s_table_cell), Paragraph('40+ source files, 15 edge functions, 80+ migrations', s_table_cell)],
]
meta_table = Table(meta_data, colWidths=[CONTENT_W*0.3, CONTENT_W*0.7])
meta_table.setStyle(TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('BACKGROUND', (0, 0), (0, -1), CARD_BG),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
]))
story.append(meta_table)
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS (Manual)
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("Table of Contents"))
story.append(hr())
toc_items = [
    ("1.", "Executive Summary"),
    ("2.", "Project Overview"),
    ("3.", "Critical Findings"),
    ("4.", "High-Severity Findings"),
    ("5.", "Medium-Severity Findings"),
    ("6.", "Low-Severity / Best Practices"),
    ("7.", "Architecture Assessment"),
    ("8.", "Edge Functions Security Review"),
    ("9.", "Performance Concerns"),
    ("10.", "Recommendations & Roadmap"),
]
for num, title in toc_items:
    story.append(Paragraph(f"<b>{num}</b>  {title}", ParagraphStyle('TOC', fontName='NotoSerifSC', fontSize=11, leading=20, textColor=TEXT_PRIMARY, leftIndent=12)))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("1. Executive Summary"))
story.append(hr())
story.append(body(
    "This audit covers the Bateumz platform, a large-scale React + TypeScript + Vite application backed by Supabase "
    "(PostgreSQL, Edge Functions, Auth, Storage, Realtime). The platform combines raffle/lottery management, "
    "esports tournaments and leagues, live streaming with interactive games, a digital wallet with deposit/withdrawal "
    "capabilities, betting/prediction markets, and multi-region configuration with dynamic branding. The codebase "
    "comprises over 200 source files across pages, components, libraries, and server-side edge functions, supported "
    "by 80+ database migrations."
))
story.append(body(
    "The audit identified <b>4 critical</b>, <b>7 high</b>, <b>10 medium</b>, and <b>8 low-severity</b> findings. The most "
    "concerning issues involve a missing wallet balance check in the spin wheel edge function (enabling free spins), "
    "pervasive use of <font face='NotoSansSC'>as any</font> type assertions that disable TypeScript safety across all data "
    "access layers, a TOCTOU race condition in the PayPal payment capture flow, and an unprotected IP geolocation "
    "endpoint exposing user location data. On the positive side, the platform demonstrates strong auth error handling "
    "with anti-enumeration protection, well-designed server-authoritative payment flows, and robust error boundaries "
    "for the game loading system."
))

# Summary stats table
stats_data = [
    [Paragraph('<b>Severity</b>', s_table_header), Paragraph('<b>Count</b>', s_table_header), Paragraph('<b>Categories</b>', s_table_header)],
    [severity_cell('CRITICAL'), Paragraph('4', s_table_cell), Paragraph('Missing balance check, Type safety bypass, Race condition, Data exposure', s_table_cell_sm)],
    [severity_cell('HIGH'), Paragraph('7', s_table_cell), Paragraph('Auth bypass risk, CORS wildcard, Unsafe casts, Missing input validation', s_table_cell_sm)],
    [severity_cell('MEDIUM'), Paragraph('10', s_table_cell), Paragraph('Silent error swallowing, Hardcoded strings, Memory leaks, Code duplication', s_table_cell_sm)],
    [severity_cell('LOW'), Paragraph('8', s_table_cell), Paragraph('Naming, Dead code, Bundle size, Minor improvements', s_table_cell_sm)],
]
stats_table = Table(stats_data, colWidths=[CONTENT_W*0.15, CONTENT_W*0.10, CONTENT_W*0.75])
stats_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
]))
story.append(Spacer(1, 8))
story.append(stats_table)
story.append(caption("Table 1: Audit findings summary by severity level"))

# ═══════════════════════════════════════════════════════════════════════
# 2. PROJECT OVERVIEW
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("2. Project Overview"))
story.append(hr())

story.append(h2("2.1 Technology Stack"))
story.append(body(
    "The application is built as a single-page application using React 18 with TypeScript, bundled via Vite. "
    "Routing is handled by React Router v6 with Framer Motion page transitions. State management relies on "
    "React Context API (Auth, Language, Theme, Currency, Region, Mobile Navigation, Dynamic Theme, Regional Theme) "
    "supplemented by TanStack React Query for server state. The UI framework is built on shadcn/ui components with "
    "Tailwind CSS for styling. Payment processing integrates PayPal (client SDK + server-side order/capture) and "
    "Stripe (via Edge Functions). The backend is entirely Supabase: PostgreSQL database, Deno-based Edge Functions, "
    "Row Level Security policies, and Realtime subscriptions for live features."
))

stack_data = [
    [Paragraph('<b>Layer</b>', s_table_header), Paragraph('<b>Technology</b>', s_table_header), Paragraph('<b>Notes</b>', s_table_header)],
    [Paragraph('Frontend', s_table_cell), Paragraph('React 18 + TypeScript + Vite', s_table_cell_sm), Paragraph('SPA with Framer Motion transitions', s_table_cell_sm)],
    [Paragraph('UI', s_table_cell), Paragraph('shadcn/ui + Tailwind CSS', s_table_cell_sm), Paragraph('50+ UI primitives, custom themes', s_table_cell_sm)],
    [Paragraph('State', s_table_cell), Paragraph('Context API + React Query', s_table_cell_sm), Paragraph('8 context providers in App.tsx', s_table_cell_sm)],
    [Paragraph('Backend', s_table_cell), Paragraph('Supabase (PostgreSQL + Deno Edge)', s_table_cell_sm), Paragraph('15+ edge functions, 80+ migrations', s_table_cell_sm)],
    [Paragraph('Auth', s_table_cell), Paragraph('Supabase Auth', s_table_cell_sm), Paragraph('Email/password + OAuth, RLS policies', s_table_cell_sm)],
    [Paragraph('Payments', s_table_cell), Paragraph('PayPal + Stripe', s_table_cell_sm), Paragraph('Server-authoritative pricing', s_table_cell_sm)],
    [Paragraph('Realtime', s_table_cell), Paragraph('Supabase Realtime', s_table_cell_sm), Paragraph('Live games, chat, draw events', s_table_cell_sm)],
]
stack_table = Table(stack_data, colWidths=[CONTENT_W*0.15, CONTENT_W*0.40, CONTENT_W*0.45])
stack_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
]))
story.append(Spacer(1, 4))
story.append(stack_table)
story.append(caption("Table 2: Technology stack overview"))

story.append(h2("2.2 Module Breakdown"))
story.append(body(
    "The platform is organized into several major feature domains, each with dedicated pages, components, and "
    "server-side logic. The Raffle module handles prize draw management with PayPal/Stripe payment integration, "
    "ticket generation, live draw streaming, and draw result verification. The Esports module provides tournament "
    "bracket management, season/league systems with round-robin scheduling, team management, player transfers, "
    "a betting and prediction market system, anti-cheat reporting, and an achievements/reputation framework. "
    "The Live Games module is the largest, containing over 70 interactive mini-games (Tic-Tac-Toe VS, Chess, Snake Battle, "
    "Quiz Battle, Bingo, Millionaire, and many more) that can be played during live streams with real-time multiplayer "
    "support. The Wallet module handles balance management, deposits, withdrawals, and transaction history across "
    "multiple payment methods including M-Pesa, PIX, bank transfer, and cryptocurrency."
))
story.append(body(
    "Additional modules include a Blog/CMS system with SEO support, a gamification engine (XP, levels, streaks, "
    "achievements), an ambassador/referral program with luck points, a multi-region configuration system allowing "
    "different countries to have independent branding, settings, and feature flags, and a comprehensive admin "
    "panel with user management, revenue analytics, audit logging, cron job scheduling, and voucher management. "
    "The application also supports PWA installation, push notifications, and has overlay modes for live stream "
    "integration with OBS Studio."
))

# ═══════════════════════════════════════════════════════════════════════
# 3. CRITICAL FINDINGS
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("3. Critical Findings"))
story.append(hr())

story.append(h2("3.1 [C-01] Missing Wallet Balance Check in Spin Wheel Edge Function"))
story.append(body(
    "The <font face='NotoSansSC'>spin-wheel-spin</font> Edge Function does not verify or deduct the user's wallet balance before "
    "recording a spin session. Although the database may define a <font face='NotoSansSC'>spin_cost</font> field on the wheel game record, "
    "the function reads it into a local variable but never uses it to charge the user. This means any authenticated user can "
    "spin the wheel an unlimited number of times without paying, potentially winning real prizes or reward points. "
    "The function correctly validates the user's authentication token and checks prize win limits per segment, but the "
    "fundamental economic gate, which is the balance deduction, is entirely absent."
))
story.append(body(
    "<b>Impact:</b> Financial loss to the platform. Users can drain prize pools and accumulate rewards without any cost. "
    "In a production environment with real-money prizes, this represents a direct revenue leak that could be exploited "
    "automatically at scale."
))
story.append(body(
    "<b>Recommendation:</b> Before inserting the spin session record, call an RPC function (e.g., "
    "<font face='NotoSansSC'>wallet_process_transaction</font>) to debit the user's wallet by the wheel's "
    "<font face='NotoSansSC'>spin_cost</font> amount. Wrap the balance check and session insertion in a database "
    "transaction to prevent TOCTOU race conditions. The function should return an error response if the user's "
    "balance is insufficient, similar to how the battle system checks balance before creating a battle in <font face='NotoSansSC'>battles.ts</font>."
))

story.append(h2("3.2 [C-02] Pervasive Type Safety Bypass via 'as any' Casts"))
story.append(body(
    "Nearly every data access layer file in the project casts the Supabase client to <font face='NotoSansSC'>any</font> at the module "
    "level using <font face='NotoSansSC'>const sb: any = supabase</font>. This pattern appears in <font face='NotoSansSC'>wallet.ts</font>, "
    "<font face='NotoSansSC'>stripe.ts</font>, <font face='NotoSansSC'>esports.ts</font>, <font face='NotoSansSC'>esports-advanced.ts</font>, "
    "<font face='NotoSansSC'>battles.ts</font>, <font face='NotoSansSC'>gamification.ts</font>, and <font face='NotoSansSC'>audit.ts</font>. While the project "
    "generates TypeScript types via <font face='NotoSansSC'>supabase gen-types</font> (present in <font face='NotoSansSC'>integrations/supabase/types.ts</font>), "
    "these types are never actually used for client queries. The <font face='NotoSansSC'>Database</font> generic parameter is correctly passed to "
    "<font face='NotoSansSC'>createClient</font> in <font face='NotoSansSC'>client.ts</font>, but every downstream consumer immediately discards this type safety."
))
story.append(body(
    "<b>Impact:</b> This completely negates the value of TypeScript in the data access layer. Any column rename, type "
    "change, or schema migration will not produce compile-time errors, only runtime failures. Given that the project "
    "has 80+ migrations with frequent schema changes, this is a significant maintainability and reliability risk. "
    "Additionally, many function calls use <font face='NotoSansSC'>as any</font> on insert data (e.g., <font face='NotoSansSC'>audit.ts</font> line 37-43, "
    "<font face='NotoSansSC'>AuthContext.tsx</font> line 60, <font face='NotoSansSC'>gamification.ts</font> line 138), which bypasses even basic structural validation."
))
story.append(body(
    "<b>Recommendation:</b> Remove all <font face='NotoSansSC'>const sb: any = supabase</font> aliases and use the typed client directly. "
    "For table inserts that don't match the generated types, create proper interface definitions that extend the "
    "generated types. This is a significant refactor but essential for a codebase of this size and complexity."
))

story.append(h2("3.3 [C-03] TOCTOU Race Condition in PayPal Capture"))
story.append(body(
    "The <font face='NotoSansSC'>paypal-capture-order</font> Edge Function checks if an order has already been processed by querying "
    "the <font face='NotoSansSC'>participants</font> table for the PayPal order ID, but this check and the subsequent insert are not "
    "wrapped in a database transaction. Between the <font face='NotoSansSC'>SELECT count</font> and the <font face='NotoSansSC'>INSERT</font>, "
    "a concurrent request could pass the same check and both requests would insert tickets, resulting in duplicate "
    "ticket creation for a single payment. The replay protection at line 72-78 of the edge function checks for existing "
    "records with the same <font face='NotoSansSC'>paypal_order_id</font>, but without a serializable transaction or a unique "
    "constraint on that column, this is vulnerable to timing attacks."
))
story.append(body(
    "<b>Impact:</b> A user could potentially get double the tickets for a single PayPal payment by sending two concurrent "
    "capture requests. The financial loss depends on ticket price and prize value. While PayPal itself prevents double-charging "
    "the buyer, the platform would issue double the tickets."
))
story.append(body(
    "<b>Recommendation:</b> Add a <font face='NotoSansSC'>UNIQUE</font> constraint on <font face='NotoSansSC'>participants.paypal_order_id</font> in the database. "
    "Alternatively, wrap the check-and-insert logic in a <font face='NotoSansSC'>SERIALIZABLE</font> transaction or use an "
    "<font face='NotoSansSC'>INSERT ... ON CONFLICT</font> (upsert) pattern. The unique constraint approach is simplest "
    "and most reliable as it provides database-level protection regardless of application logic."
))

story.append(h2("3.4 [C-04] Unprotected IP Geolocation Endpoint"))
story.append(body(
    "The <font face='NotoSansSC'>detectUserRegion</font> function in <font face='NotoSansSC'>useRegionalConfig.tsx</font> (line 97) calls "
    "the external API <font face='NotoSansSC'>https://ipwho.is/</font> directly from the browser to determine the user's "
    "country. This exposes the user's IP address to a third-party service without any disclosure or consent. Furthermore, "
    "the response from this endpoint is used to set regional configuration including available features, currency, "
    "and branding. A malicious actor could intercept or manipulate this response (via DNS spoofing or MITM on the "
    "unencrypted endpoint) to force a different region configuration, potentially enabling features or pricing "
    "that should not be available in the user's actual region."
))
story.append(body(
    "<b>Impact:</b> Privacy violation (user IP sent to third party without consent) and potential configuration "
    "manipulation. If regional pricing differs, this could lead to price arbitrage or access to region-locked features."
))
story.append(body(
    "<b>Recommendation:</b> Move geolocation to a server-side Edge Function that proxies the request through Supabase. "
    "This hides the user's IP from third parties and allows server-side validation and caching of results. Add a "
    "privacy policy disclosure about IP-based region detection. Consider using Supabase's built-in request headers "
    "or a self-hosted GeoIP database (e.g., MaxMind) to avoid external API dependencies entirely."
))

# ═══════════════════════════════════════════════════════════════════════
# 4. HIGH-SEVERITY FINDINGS
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("4. High-Severity Findings"))
story.append(hr())

high_findings = [
    ("H-01", "ProtectedRoute Missing 'superadmin' Role Check",
     "The ProtectedRoute component handles 'admin', 'business', and 'regional_manager' roles but never explicitly "
     "validates the 'superadmin' role. The admin check (line 29) allows both 'admin' AND 'superadmin' through, which is "
     "correct for admin routes. However, there is no route that is exclusively restricted to 'superadmin' users, meaning "
     "superadmin-only operations (like the Super Dashboard) have the same access control as regular admin operations. "
     "If the system is designed to have a hierarchy where superadmins have exclusive access to certain features, this "
     "hierarchy is not enforced at the route level.",
     "Add an optional superadmin role check and use it for routes that require superadmin privileges exclusively."),
    
    ("H-02", "Wildcard CORS in Edge Functions",
     "Multiple Edge Functions define CORS headers with <font face='NotoSansSC'>Access-Control-Allow-Origin: *</font>. "
     "While the functions do validate the Authorization Bearer token, the wildcard CORS header allows any website to make "
     "authenticated cross-origin requests to these functions if the user's token is leaked via XSS or a malicious extension. "
     "Functions affected include spin-wheel-spin and potentially others using the same CORS pattern.",
     "Restrict CORS origins to the actual platform domains. Use environment variables to configure allowed origins and validate "
     "the request Origin header against the allowlist."),
    
    ("H-03", "PayPal getAccessToken Missing Error Check",
     "In both paypal-create-order and paypal-capture-order Edge Functions, the getAccessToken helper does not check "
     "whether the response JSON actually contains an access_token before returning it. If the PayPal API returns "
     "an error response (invalid credentials, service outage), the function returns undefined, which then causes an "
     "unhelpful 'Authorization header must be Bearer undefined' error from PayPal's order endpoints.",
     "Add a null check after parsing the token response and throw a descriptive error if access_token is missing."),
    
    ("H-04", "Client-Side Spin Cost Not Verified Server-Side for Battles",
     "The createBattle function in battles.ts checks the user's balance client-side before calling the server RPC, "
     "but the server-side RPC function is not visible in the codebase. If the RPC does not independently verify the balance, "
     "a user could bypass the client check by calling the RPC directly with arbitrary parameters via the Supabase client.",
     "Audit the create_battle RPC to ensure it performs its own balance check and deduction within a transaction."),
    
    ("H-05", "No Rate Limiting on Expensive Operations",
     "Several Edge Functions and client-side operations (spin wheel, battle creation, bet placement, deposit requests) "
     "lack rate limiting. A malicious user could call these endpoints in rapid succession, potentially causing financial "
     "loss (spin wheel without balance check) or database load (creating hundreds of battles).",
     "Implement per-user rate limiting using Supabase's pg_net or a Redis layer. Use a sliding window approach with "
     "reasonable limits per operation type."),
    
    ("H-06", "AuthContext Referral Processing Has No Server Validation",
     "The referral processing in AuthContext.tsx (lines 122-147) reads a referral code from localStorage and directly "
     "inserts referral records and awards luck points entirely client-side. A malicious user could manipulate localStorage "
     "to claim referral bonuses from arbitrary users or create self-referential loops by setting the ref code before signup.",
     "Move referral processing to a server-side function or database trigger. Validate that the referrer exists, is not "
     "the same as the referred user, and has not exceeded referral limits."),
    
    ("H-07", "Missing Input Validation on Betting Page",
     "The BettingPage.tsx (esports section) has a local useUserId hook that silently swallows errors (line 84: empty catch). "
     "The page processes real-money bets but the user ID fetching has no retry logic or error state, potentially "
     "allowing bets to be placed with a null user ID if the auth state is inconsistent.",
     "Add proper error handling with user-facing feedback. Never allow bet placement if user ID is null or loading."),
]

for fid, title, desc, rec in high_findings:
    story.append(h2(f"4.{high_findings.index((fid, title, desc, rec))+1} [{fid}] {title}"))
    story.append(body(desc))
    story.append(body(f"<b>Recommendation:</b> {rec}"))

# ═══════════════════════════════════════════════════════════════════════
# 5. MEDIUM-SEVERITY FINDINGS
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("5. Medium-Severity Findings"))
story.append(hr())

medium_findings = [
    ("M-01", "Pervasive Silent Error Swallowing",
     "Empty catch blocks appear throughout the codebase. AuthContext.tsx lines 118 and 146 have bare catch() {} blocks that "
     "swallow errors during profile updates and referral processing. Gamification.ts uses .catch(() => {}) on RPC calls "
     "and achievement inserts. While some of these may be intentionally non-fatal, they make debugging extremely difficult "
     "and can mask real issues in production. At minimum, these should log to an error tracking service.",
     "Add structured error logging (e.g., Sentry integration) to all catch blocks. Even for non-fatal operations, log "
     "the error context for debugging."),
    
    ("M-02", "Hardcoded Portuguese Strings in Game Components",
     "The SafeGameLoader component and many game components contain hardcoded Portuguese strings (e.g., 'Erro ao carregar', "
     "'Tentando novamente', 'Outro jogo') instead of using the i18n system. Given that the LanguageContext supports "
     "6 locales (en, pt, pt-BR, es, fr, hi), these hardcoded strings will not be translated for international users.",
     "Use the LanguageContext t() function for all user-facing strings in game components."),
    
    ("M-03", "AuthProvider nesting 8 layers deep",
     "App.tsx wraps the application in 8 nested context providers (QueryClient, Helmet, RegionalConfig, Theme, "
     "DynamicTheme, Language, Currency, RegionalTheme, PayPal, Auth). Each provider adds render overhead and makes "
     "the component tree harder to debug. If any provider's state changes, all children re-render.",
     "Consider using a component composition pattern or a provider aggregator to reduce nesting. Evaluate which providers "
     "actually need to wrap the entire app vs. only specific route subtrees."),
    
    ("M-04", "Duplicate Loading Screens with Different Timings",
     "main.tsx shows a LoadingScreen for 2200ms, then App.tsx shows another for 1800-4000ms. Users see a loading screen "
     "for potentially 6.2 seconds total. Neither loading screen shows actual progress or indicates what is being loaded.",
     "Remove the redundant loading screen in main.tsx. Use a single loading state that tracks actual initialization progress "
     "rather than arbitrary timeouts."),
    
    ("M-05", "LanguageContext.tsx is 106KB",
     "The LanguageContext file contains all translations for 6 languages inline, making it over 106KB. This entire file "
     "is parsed and loaded on every page load, even though most pages only use a fraction of the translations. This "
     "impacts initial bundle size and parse time.",
     "Split translations into separate locale files (e.g., locales/en.json, locales/pt.json) and lazy-load them based on the "
     "active language. Use dynamic imports to reduce the initial bundle."),
    
    ("M-06", "No Debouncing on Live Game State Updates",
     "Live game components send state updates (scores, chat messages, reactions) without debouncing. In fast-paced games "
     "with many concurrent players, this could generate thousands of Supabase Realtime messages per second, potentially "
     "overwhelming the database and WebSocket connections.",
     "Implement debouncing and batching for high-frequency state updates. Use local state for intermediate updates and "
     "sync to the server at a controlled interval (e.g., 100ms for game state, 500ms for analytics)."),
    
    ("M-07", "Wallet Transaction Race Condition in Withdrawal",
     "The createWithdrawalRequest function in wallet.ts first checks the balance, then processes a debit transaction, "
     "then creates the withdrawal record as three separate database calls. Between the balance check and the debit, "
     "another concurrent withdrawal could pass the same balance check, resulting in over-withdrawal.",
     "Use a database RPC that wraps the balance check and debit in a single transaction with a SERIALIZABLE isolation level."),
    
    ("M-08", "Exposed Error Details in Edge Functions",
     "Several Edge Functions return raw error messages to the client via <font face='NotoSansSC'>String(e)</font>. This can "
     "expose internal implementation details, database schema information, or stack traces to end users. While this is "
     "useful during development, it should be disabled in production.",
     "Return generic error messages to clients and log detailed errors server-side. Use environment-based error detail "
     "levels (verbose in development, minimal in production)."),
    
    ("M-09", "Missing Pagination on Several Data Fetches",
     "Functions like getMyBattles (limit 30), getTransactions (limit 30), and several admin data fetches use simple "
    "limits without cursor-based or offset-based pagination. For admin users managing large datasets, this means they "
     "cannot access data beyond the first page.",
     "Implement proper pagination with cursor-based approach for large datasets and infinite scroll for user-facing lists."),
    
    ("M-10", "No Content Security Policy Headers",
     "The application does not implement Content Security Policy (CSP) headers, which help prevent XSS attacks by "
     "restricting which scripts, styles, and resources can be loaded. Given the application integrates third-party payment "
     "SDKs (PayPal, Stripe) and loads external resources, CSP is important for defense in depth.",
     "Add CSP headers via the Supabase configuration or a reverse proxy. Start with a restrictive policy and use report-only "
     "mode to identify necessary exceptions before enforcement."),
]

for fid, title, desc, rec in medium_findings:
    idx = medium_findings.index((fid, title, desc, rec)) + 1
    story.append(h2(f"5.{idx} [{fid}] {title}"))
    story.append(body(desc))
    story.append(body(f"<b>Recommendation:</b> {rec}"))

# ═══════════════════════════════════════════════════════════════════════
# 6. LOW-SEVERITY / BEST PRACTICES
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("6. Low-Severity / Best Practices"))
story.append(hr())

low_findings = [
    ("L-01", "Inconsistent Currency Formatting",
     "wallet.ts hardcodes MZN (Mozambican Metical) in formatMZN(), but the platform supports multiple currencies via "
     "the CurrencyContext. The esports-advanced.ts and betting system use different currency handling. This creates "
     "inconsistency across the platform when displaying monetary values.",
     "Create a single formatting utility that uses the active currency from CurrencyContext and supports all platform currencies."),
    
    ("L-02", "Unused Import in App.tsx",
     "App.tsx imports KahootMultiplayerQuiz, LiveBingo, and ChallengeRoulette components but they are not used in any route. "
     "These lazy-loaded components may still be included in the bundle depending on the bundler configuration.",
     "Remove unused imports to reduce bundle size and improve code clarity."),
    
    ("L-03", "Mixed Language in Code Comments",
     "Code comments alternate between Portuguese, English, and sometimes both in the same file. This makes the codebase "
     "harder to maintain for international development teams. Pick one language and be consistent.",
     "Standardize on English for all code comments and commit messages, with Portuguese reserved for user-facing strings."),
    
    ("L-04", "No Test Coverage for Critical Paths",
     "The project has a basic test setup (vitest.config.ts, test/setup.ts, example.test.ts) but the example test is "
    "a placeholder. There are no tests for payment flows, wallet operations, auth flows, or game logic.",
     "Prioritize tests for: payment capture, wallet balance operations, spin wheel with balance check, and battle settlement."),
    
    ("L-05", "Large Game Component Files",
     "Many game components under components/livegames/ are likely large single-file components. Combined with the fact "
     "that there are over 70 games, this creates a massive codebase that is difficult to maintain and could benefit from "
     "code splitting and shared game utilities.",
     "Extract common game logic (score tracking, turn management, win conditions) into shared hooks or utility modules."),
    
    ("L-06", "Missing Error Boundary for Payment Components",
     "PayPalCheckout and StripeCheckout components do not have individual error boundaries. A payment SDK failure "
     "could crash the entire page rather than showing a graceful fallback.",
     "Wrap payment components in error boundaries with user-friendly fallback UI and retry options."),
    
    ("L-07", "No Request Cancellation on Unmount",
     "Many useEffect hooks in pages and components initiate Supabase queries but do not return cleanup functions to cancel "
    "pending requests when the component unmounts. This can cause state updates on unmounted components and memory leaks.",
     "Use AbortController for fetch calls and Supabase's .abortController() for real-time subscriptions in useEffect cleanup."),
    
    ("L-08", "Potential Memory Leak in Auth Context",
     "The onAuthStateChange callback in AuthContext.tsx uses a setTimeout wrapper (line 172) to defer state updates. If the "
     "component unmounts between the timeout scheduling and execution, the state update will attempt to modify unmounted "
     "component state. While the 'active' flag partially mitigates this, the timeout reference is not cleaned up.",
     "Store the timeout reference and clear it in the useEffect cleanup function alongside the subscription unsubscribe."),
]

for fid, title, desc, rec in low_findings:
    idx = low_findings.index((fid, title, desc, rec)) + 1
    story.append(h2(f"6.{idx} [{fid}] {title}"))
    story.append(body(desc))
    story.append(body(f"<b>Recommendation:</b> {rec}"))

# ═══════════════════════════════════════════════════════════════════════
# 7. ARCHITECTURE ASSESSMENT
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("7. Architecture Assessment"))
story.append(hr())

story.append(h2("7.1 What Works Well"))
story.append(body(
    "The platform demonstrates several commendable architectural decisions. The server-authoritative payment flow is "
    "well-designed: the PayPal create-order function fetches ticket prices server-side (preventing price tampering), and "
    "the capture function verifies the paid amount matches expected tickets before inserting records. The auth error "
    "handling system in authErrors.ts implements proper anti-enumeration, never revealing whether an email exists in the "
    "system. The SafeGameLoader provides excellent resilience for the game loading system with error boundaries, retry "
    "mechanisms, and user-friendly fallback UI. The multi-region configuration system is sophisticated, allowing "
    "independent branding, feature flags, and settings per country. The audit logging system provides accountability for "
    "administrative actions."
))

story.append(h2("7.2 Architectural Concerns"))
story.append(body(
    "The monolithic App.tsx imports over 130 page components eagerly, which will significantly impact initial load time. "
    "While Vite may code-split these into separate chunks, the route definitions themselves create tight coupling. "
    "The 8 nested context providers create a deep render tree where any state change in an outer provider triggers "
    "re-renders of all inner providers and their children. The lib/ directory contains a mix of pure utility functions "
    "and direct Supabase query functions without a clear separation, making it hard to test business logic in isolation. "
    "The 80+ database migrations suggest rapid schema evolution without a clear migration strategy, which increases the "
    "risk of schema drift between environments."
))

story.append(h2("7.3 Scalability Considerations"))
story.append(body(
    "The platform's architecture has several scalability bottlenecks that should be addressed before user growth. The "
    "Supabase Realtime system is used for live games, chat, and notifications, but there is no visible strategy for "
    "managing connection counts or channel isolation. With 70+ game types and potentially thousands of concurrent "
    "players, the Realtime layer could become a bottleneck. The edge functions use per-request Supabase client creation "
    "in some cases (spin-wheel-spin creates two clients per request), which adds latency. The wallet system uses "
    "optimistic client-side operations without proper server-side locking, which will fail under concurrent access. "
    "Consider implementing connection pooling for edge functions, channel namespace isolation for Realtime, and "
    "server-side wallet operations within database transactions for data integrity under load."
))

# ═══════════════════════════════════════════════════════════════════════
# 8. EDGE FUNCTIONS SECURITY REVIEW
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("8. Edge Functions Security Review"))
story.append(hr())
story.append(body(
    "The platform uses 15+ Supabase Edge Functions written in Deno/TypeScript for server-side operations including "
    "payment processing, game logic, notifications, and administrative tasks. The following table summarizes the security "
    "assessment of the key edge functions reviewed during this audit."
))

ef_data = [
    [Paragraph('<b>Function</b>', s_table_header), Paragraph('<b>Auth</b>', s_table_header), Paragraph('<b>Input Validation</b>', s_table_header), Paragraph('<b>Issues</b>', s_table_header)],
    [Paragraph('paypal-create-order', s_table_cell_sm), Paragraph('Yes', s_severity_low), Paragraph('Good', s_severity_low), Paragraph('Missing token null check', s_severity_medium)],
    [Paragraph('paypal-capture-order', s_table_cell_sm), Paragraph('Yes', s_severity_low), Paragraph('Good', s_severity_low), Paragraph('TOCTOU race condition', s_severity_high)],
    [Paragraph('spin-wheel-spin', s_table_cell_sm), Paragraph('Yes', s_severity_low), Paragraph('Partial', s_severity_medium), Paragraph('No balance check', s_severity_high)],
    [Paragraph('paypal-config', s_table_cell_sm), Paragraph('No', s_severity_high), Paragraph('N/A', s_table_cell_sm), Paragraph('Exposes client ID publicly (by design)', s_table_cell_sm)],
    [Paragraph('auth-email-hook', s_table_cell_sm), Paragraph('Service', s_severity_low), Paragraph('Unknown', s_severity_medium), Paragraph('Not reviewed in detail', s_table_cell_sm)],
    [Paragraph('auto-draw', s_table_cell_sm), Paragraph('Service', s_severity_low), Paragraph('Unknown', s_severity_medium), Paragraph('Not reviewed in detail', s_table_cell_sm)],
]
ef_table = Table(ef_data, colWidths=[CONTENT_W*0.25, CONTENT_W*0.12, CONTENT_W*0.20, CONTENT_W*0.43])
ef_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, TABLE_STRIPE]),
]))
story.append(Spacer(1, 4))
story.append(ef_table)
story.append(caption("Table 3: Edge functions security assessment summary"))

# ═══════════════════════════════════════════════════════════════════════
# 9. PERFORMANCE CONCERNS
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("9. Performance Concerns"))
story.append(hr())

story.append(h2("9.1 Bundle Size"))
story.append(body(
    "With over 130 eagerly imported page components, 70+ game components, and 50+ UI primitives, the application's "
    "JavaScript bundle is likely very large. While Vite performs code splitting for dynamic imports, the static imports "
    "in App.tsx and the 106KB LanguageContext file will be in the initial bundle. The Framer Motion library adds "
    "significant weight, and the PayPal/Stripe SDKs are loaded for all users regardless of whether they visit a payment page. "
    "The 8 nested context providers mean that every state change in an outer provider triggers reconciliation of the "
    "entire component tree below it. For a platform targeting mobile users in regions with slow connections (Mozambique, "
    "Brazil), bundle size optimization should be a high priority."
))

story.append(h2("9.2 Database Query Patterns"))
story.append(body(
    "Several lib/ functions make multiple sequential database calls that could be parallelized. For example, "
    "getUserGamification in gamification.ts correctly uses Promise.all for three parallel fetches, but other functions "
    "like fetchProfile in AuthContext.tsx make 3-4 sequential awaits that could run concurrently. The createWithdrawalRequest "
    "function makes 3 sequential calls (getBalance, processTransaction, insert withdrawal) when the first two should be "
    "atomic. The esports-advanced.ts file (1776 lines) contains many complex query patterns that would benefit from "
    "batching and caching."
))

story.append(h2("9.3 Realtime Scaling"))
story.append(body(
    "The live game system relies heavily on Supabase Realtime for multiplayer game state synchronization. Each game "
    "session likely creates Realtime channels for game state, chat, and reactions. With 70+ game types and the potential "
    "for hundreds of concurrent game sessions during live events, the Realtime connection count could become a "
    "bottleneck. There is no visible strategy for channel cleanup after games end, connection pooling, or message "
    "throttling. Consider implementing a game session lifecycle manager that ensures Realtime channels are properly "
    "cleaned up when games end, and batch state updates to reduce message frequency."
))

# ═══════════════════════════════════════════════════════════════════════
# 10. RECOMMENDATIONS & ROADMAP
# ═══════════════════════════════════════════════════════════════════════
story.append(h1("10. Recommendations and Roadmap"))
story.append(hr())

story.append(h2("10.1 Immediate Actions (Week 1-2)"))
immediate = [
    "Fix C-01: Add wallet balance check and deduction to spin-wheel-spin Edge Function.",
    "Fix C-03: Add UNIQUE constraint on participants.paypal_order_id column.",
    "Fix H-06: Move referral processing from AuthContext to a server-side function.",
    "Fix C-04: Move IP geolocation from client to server-side Edge Function.",
    "Fix H-03: Add null check on PayPal access_token in getAccessToken helper.",
]
for item in immediate:
    story.append(bullet(item))

story.append(h2("10.2 Short-Term (Month 1)"))
short_term = [
    "Begin C-02 remediation: Start removing 'as any' casts from the most critical paths (wallet, payments, bets).",
    "Implement rate limiting on all Edge Functions that handle financial operations.",
    "Add CSP headers and restrict CORS to platform domains only.",
    "Split LanguageContext translations into separate locale files with lazy loading.",
    "Remove duplicate loading screens and implement single progress-tracked loading state.",
    "Add error boundaries around payment components and implement request cancellation in useEffect cleanups.",
]
for item in short_term:
    story.append(bullet(item))

story.append(h2("10.3 Medium-Term (Month 2-3)"))
medium_term = [
    "Complete type safety remediation across all lib/ files.",
    "Implement proper pagination with cursor-based approach for all list endpoints.",
    "Add unit and integration tests for payment flows, wallet operations, and game logic.",
    "Refactor context provider nesting using composition patterns.",
    "Implement Realtime channel lifecycle management for live games.",
    "Move all game string literals to the i18n translation system.",
]
for item in medium_term:
    story.append(bullet(item))

story.append(h2("10.4 Long-Term (Quarter 2+)"))
long_term = [
    "Implement comprehensive E2E test coverage using Playwright (already configured).",
    "Migrate to a proper state management solution (Zustand or Jotai) to reduce context re-renders.",
    "Implement micro-frontend architecture to allow independent deployment of feature modules.",
    "Add observability stack (Sentry for errors, DataDog for performance, PostHog for analytics).",
    "Conduct penetration testing with a focus on the wallet and payment systems.",
    "Implement database connection pooling and read replicas for scaling.",
]
for item in long_term:
    story.append(bullet(item))

story.append(Spacer(1, 24))
story.append(hr())
story.append(caption("End of Audit Report"))

# ─── Build PDF ───────────────────────────────────────────────────────────
doc.build(story)
print(f"PDF generated: {OUTPUT}")
