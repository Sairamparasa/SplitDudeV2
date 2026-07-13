import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

# Import the dynamically generated content
sys.path.append(os.path.join(os.path.dirname(__file__)))
try:
    import content_data
except ImportError:
    print("Error: content_data.py not found. Please run generate_content.py first.")
    sys.exit(1)

# Two-pass canvas for dynamic total page count (Page X of Y)
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        
        # Suppress headers/footers on the title page (page 1)
        if self._pageNumber == 1:
            self.restoreState()
            return
            
        # Draw header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f172a")) # Deep Navy
        self.drawString(54, 750, "SPLITDUDE  |  COMPLETE TECHNICAL HANDBOOK & INTERVIEW GUIDE")
        
        # Header line
        self.setStrokeColor(colors.HexColor("#cbd5e1")) # Slate
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        
        # Draw footer
        self.line(54, 55, 558, 55)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569")) # Charcoal
        self.drawString(54, 42, "CONFIDENTIAL  |  PREPARED FOR SOFTWARE ENGINEERING INTERVIEWS")
        
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(558, 42, page_str)
        
        self.restoreState()

def build_pdf():
    pdf_filename = "docs/SplitDude_Technical_Handbook.pdf"
    os.makedirs(os.path.dirname(pdf_filename), exist_ok=True)
    
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    navy = colors.HexColor("#0f172a")
    charcoal = colors.HexColor("#1e293b")
    emerald = colors.HexColor("#059669")
    
    # Create custom ParagraphStyles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=32,
        leading=38,
        textColor=navy,
        spaceAfter=15,
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#475569"),
        spaceAfter=150,
        alignment=1
    )
    
    meta_style = ParagraphStyle(
        'CoverMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    )

    h1_style = ParagraphStyle(
        'ChapterH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=navy,
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=emerald,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCopy',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=charcoal,
        spaceAfter=10
    )

    q_title_style = ParagraphStyle(
        'QTitle',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=navy,
        spaceBefore=10,
        spaceAfter=2,
        keepWithNext=True
    )

    q_ans_style = ParagraphStyle(
        'QAns',
        parent=body_style,
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=charcoal,
        leftIndent=15,
        spaceAfter=4
    )

    q_detail_style = ParagraphStyle(
        'QDetail',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#475569"),
        leftIndent=15,
        spaceAfter=4
    )

    q_follow_style = ParagraphStyle(
        'QFollow',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=emerald,
        leftIndent=15,
        spaceAfter=10
    )

    story = []

    # 1. TITLE PAGE
    story.append(Spacer(1, 100))
    story.append(Paragraph("SplitDude", title_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Complete Technical Handbook<br/>System Design & Architecture Guide<br/>FAANG Interview Preparation Manual", subtitle_style))
    story.append(Paragraph("Version 1.0.0<br/>Author: Sairam Parasa<br/>Released: July 2026", meta_style))
    story.append(PageBreak())

    # 2. TABLE OF CONTENTS
    story.append(Paragraph("Table of Contents", h1_style))
    story.append(Spacer(1, 10))
    for i, ch in enumerate(content_data.CHAPTERS):
        toc_text = f"Chapter {i+1}: {ch['title'].split(': ')[-1]}"
        toc_link = f"<link href='#{ch['anchor']}'>{toc_text}</link>"
        story.append(Paragraph(toc_link, body_style))
    story.append(PageBreak())

    # 3. BUILD CHAPTERS
    for ch in content_data.CHAPTERS:
        # Add Chapter Heading with bookmark anchor
        story.append(Paragraph(f"<a name='{ch['anchor']}'/>{ch['title']}", h1_style))
        story.append(Spacer(1, 5))
        
        # Add content blocks
        for block in ch['content']:
            block_type = block[0]
            
            if block_type == 'h2':
                story.append(Paragraph(block[1], h2_style))
            elif block_type == 'p':
                story.append(Paragraph(block[1], body_style))
            elif block_type == 'q_block':
                q_title = block[1]
                q_ans = f"<b>Expected Answer:</b> {block[2]}"
                q_detail = f"<b>Detailed Explanation:</b> {block[3]}"
                q_follow = f"<b>Follow-up Questions:</b> {block[4]}"
                
                story.append(Paragraph(q_title, q_title_style))
                story.append(Paragraph(q_ans, q_ans_style))
                story.append(Paragraph(q_detail, q_detail_style))
                story.append(Paragraph(q_follow, q_follow_style))
                story.append(PageBreak())
                
        story.append(PageBreak())

    # Build the document
    print("Compiling PDF...")
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {pdf_filename}!")

if __name__ == '__main__':
    build_pdf()
