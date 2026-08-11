import os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, HRFlowable)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSans-Bold.ttf'))
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans-Bold')

PAGE_BG = colors.HexColor('#f7f7f6')
HEADER_FILL = colors.HexColor('#5c5339')
BORDER = colors.HexColor('#c2baa3')
ACCENT = colors.HexColor('#a68932')
TEXT_PRIMARY = colors.HexColor('#252421')
TEXT_MUTED = colors.HexColor('#7e7b74')
TABLE_STRIPE = colors.HexColor('#f4f3f1')
SEM_ERROR = colors.HexColor('#a74d45')
SEM_WARNING = colors.HexColor('#b48f45')
SEM_SUCCESS = colors.HexColor('#4d8961')
SEM_INFO = colors.HexColor('#4d6c8a')

W, H = A4
LM = 22*mm; RM = 22*mm; TM = 25*mm; BM = 25*mm
CW = W - LM - RM

ss = getSampleStyleSheet()
def add_style(name, **kw): ss.add(ParagraphStyle(name, **kw))

add_style('H1', fontName='DejaVuSans-Bold', fontSize=20, leading=26, textColor=HEADER_FILL, spaceBefore=10*mm, spaceAfter=5*mm)
add_style('H2', fontName='DejaVuSans-Bold', fontSize=14, leading=19, textColor=ACCENT, spaceBefore=7*mm, spaceAfter=3*mm)
add_style('H3', fontName='DejaVuSans-Bold', fontSize=11, leading=15, textColor=colors.HexColor('#85723b'), spaceBefore=5*mm, spaceAfter=2*mm)
add_style('Body', fontName='DejaVuSans', fontSize=9.5, leading=14.5, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=3*mm)
add_style('Bul', fontName='DejaVuSans', fontSize=9.5, leading=14, textColor=TEXT_PRIMARY, leftIndent=12*mm, bulletIndent=6*mm, spaceAfter=1.5*mm)
add_style('TH', fontName='DejaVuSans-Bold', fontSize=8.5, leading=11, textColor=colors.white, alignment=TA_CENTER)
add_style('TC', fontName='DejaVuSans', fontSize=8, leading=11, textColor=TEXT_PRIMARY)
add_style('Foot', fontName='DejaVuSans', fontSize=7.5, leading=10, textColor=TEXT_MUTED, alignment=TA_CENTER)
add_style('CritLbl', fontName='DejaVuSans-Bold', fontSize=9.5, leading=14, textColor=SEM_ERROR, spaceAfter=1*mm)
add_style('WarnLbl', fontName='DejaVuSans-Bold', fontSize=9.5, leading=14, textColor=SEM_WARNING, spaceAfter=1*mm)

def P(t, s='Body'): return Paragraph(t, ss[s])
def B(t): return Paragraph(f"\u2022  {t}", ss['Bul'])
def line(): return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=4*mm, spaceBefore=2*mm)

def T(headers, rows, cw=None):
    w = cw or [CW / len(headers)] * len(headers)
    d = [[P(h, 'TH') for h in headers]]
    for r in rows: d.append([P(str(c), 'TC') for c in r])
    t = Table(d, colWidths=w, repeatRows=1)
    sc = [('BACKGROUND',(0,0),(-1,0),HEADER_FILL),('TEXTCOLOR',(0,0),(-1,0),colors.white),
          ('GRID',(0,0),(-1,-1),0.5,BORDER),('VALIGN',(0,0),(-1,-1),'TOP'),
          ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
          ('TOPPADDING',(0,0),(-1,0),6),('BOTTOMPADDING',(0,0),(-1,0),6),
          ('TOPPADDING',(0,1),(-1,-1),3),('BOTTOMPADDING',(0,1),(-1,-1),3)]
    for i in range(1,len(d)):
        if i%2==0: sc.append(('BACKGROUND',(0,i),(-1,i),TABLE_STRIPE))
    t.setStyle(TableStyle(sc))
    return t

def footer(c, doc):
    c.saveState()
    c.setFont('DejaVuSans', 7.5)
    c.setFillColor(TEXT_MUTED)
    c.drawCentredString(W/2, 12*mm, f"Relatorio de Analise - bateu.online  |  Pagina {doc.page}")
    c.restoreState()

story = []
