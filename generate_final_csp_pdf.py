import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

# Page border drawer for formal academic styling
class AcademicBorderCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_border()
            super().showPage()
        super().save()

    def draw_border(self):
        self.saveState()
        # Navy blue academic border
        self.setStrokeColor(colors.HexColor('#002147'))
        # Outer border line
        self.setLineWidth(1.5)
        self.rect(26, 26, 595.27 - 52, 841.89 - 52)
        # Inner fine decorative line
        self.setLineWidth(0.6)
        self.rect(30, 30, 595.27 - 60, 841.89 - 60)
        self.restoreState()


def build_front_pages_pdf(output_pdf: str, logo_path: str):
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=44,
        rightMargin=44,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=15.5,
        leading=19.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0A192F')
    )

    report_type_style = ParagraphStyle(
        'ReportType',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12.5,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#8B0000') # Crimson / Maroon matching NRI logo
    )

    normal_center = ParagraphStyle(
        'NormalCenter',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.black
    )

    italic_center = ParagraphStyle(
        'ItalicCenter',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=10.5,
        leading=14.5,
        alignment=TA_CENTER,
        textColor=colors.black
    )

    bold_center = ParagraphStyle(
        'BoldCenter',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        textColor=colors.black
    )

    dept_style = ParagraphStyle(
        'DeptStyle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=12,
        leading=15.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0A192F')
    )

    college_name_style = ParagraphStyle(
        'CollegeName',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=14,
        leading=17.5,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#8B0000') # Maroon
    )

    affiliation_style = ParagraphStyle(
        'Affiliation',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=8,
        leading=11,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#222222')
    )

    heading_style = ParagraphStyle(
        'PageHeading',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=16,
        leading=21,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0A192F')
    )

    body_justify = ParagraphStyle(
        'BodyJustify',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=18,
        alignment=TA_JUSTIFY,
        textColor=colors.black
    )

    body_indent = ParagraphStyle(
        'BodyIndent',
        parent=body_justify,
        firstLineIndent=24
    )

    story = []

    # =========================================================================
    # PAGE 1: TITLE / COVER PAGE (EXACT SENIOR FORMAT WITH DILEEP DETAILS)
    # =========================================================================
    story.append(Paragraph('SMART MEALS FOR PEOPLE WITH DIABETES', title_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph('A COMMUNITY SERVICE PROJECT REPORT', report_type_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph('Submitted to', normal_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('Jawaharlal Nehru Technological University Kakinada', bold_center))
    story.append(Spacer(1, 6))
    story.append(Paragraph('In partial fulfillment for the award of the degree of', italic_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('Bachelor of Technology', bold_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('In', normal_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('CSE – DATA SCIENCE', bold_center))
    story.append(Spacer(1, 12))

    story.append(Paragraph('Submitted by', italic_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('BOMMALI DILEEP (24KN1A4425)', bold_center))
    story.append(Spacer(1, 10))
    story.append(Paragraph('Under the esteemed guidance of', italic_center))
    story.append(Spacer(1, 2))
    story.append(Paragraph('Ms. T. Navya Chandrika', bold_center))
    story.append(Paragraph('Assistant Professor, Department of CSE-DATA SCIENCE', normal_center))
    story.append(Spacer(1, 14))

    # Center Logo
    if os.path.exists(logo_path):
        story.append(RLImage(logo_path, width=105, height=96))
    story.append(Spacer(1, 14))

    # Department & College Block
    story.append(Paragraph('DEPARTMENT OF CSE – DATA SCIENCE', dept_style))
    story.append(Spacer(1, 3))
    story.append(Paragraph('NRI INSTITUTE OF TECHNOLOGY', college_name_style))
    story.append(Paragraph('Autonomous', bold_center))
    story.append(Paragraph('(Approved by AICTE, Permanently Affiliated to JNTUK, Kakinada)', affiliation_style))
    story.append(Paragraph('Accredited by NBA (CSE, ECE, EEE, MECH &amp; IT), Accredited by NAAC with ‘A’ Grade', affiliation_style))
    story.append(Paragraph('ISO 9001:2015 Certified Institution', affiliation_style))
    story.append(Paragraph('Pothavarappadu (V), (Via) Nunna, Agiripalli (M), Krishna Dist, PIN: 521212, A.P, India.', affiliation_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph('2026-27', bold_center))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: CERTIFICATE PAGE (EXACT SENIOR FORMAT WITH NRI HEADER & LOGO)
    # =========================================================================
    if os.path.exists(logo_path):
        story.append(RLImage(logo_path, width=65, height=60))
        story.append(Spacer(1, 6))

    story.append(Paragraph('NRI INSTITUTE OF TECHNOLOGY', college_name_style))
    story.append(Paragraph('Autonomous', ParagraphStyle('CertAuto', parent=bold_center, fontSize=10.5, leading=14)))
    story.append(Paragraph('(Approved by AICTE, Permanently Affiliated to JNTUK, Kakinada) Accredited by NBA (CSE, ECE, EEE, MECH &amp; IT), Accredited by NAAC with ‘A’ Grade ISO 9001:2015 Certified Institution', affiliation_style))
    story.append(Paragraph('Pothavarappadu (V), (Via) Nunna, Agiripalli (M), Krishna Dist, PIN: 521212, A.P, India', affiliation_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#002147'), spaceBefore=2, spaceAfter=14))

    story.append(Paragraph('<u>Certificate</u>', ParagraphStyle('CertHead', parent=heading_style, fontName='Times-Bold', fontSize=15, textColor=colors.HexColor('#0A192F'))))
    story.append(Spacer(1, 18))

    cert_text = (
        'This is to certify that the Community Service Project report entitled '
        '<b>“SMART MEALS FOR PEOPLE WITH DIABETES”</b> is a bonafide work carried out by '
        '<b>BOMMALI DILEEP (24KN1A4425)</b> in partial fulfillment for the award of degree of '
        '<b>Bachelor of Technology in CSE – DATA SCIENCE</b> of '
        '<b>Jawaharlal Nehru Technological University Kakinada</b>, during the academic year <b>2026-27</b>.'
    )
    story.append(Paragraph(cert_text, ParagraphStyle('CertBody', parent=body_justify, fontSize=11.5, leading=20, firstLineIndent=20)))
    story.append(Spacer(1, 75))

    # Signatures Table
    sig_data = [
        [
            Paragraph('<b>Project Guide</b><br/><br/><br/><br/><b>Ms. T. Navya Chandrika</b><br/>Assistant Professor<br/>Dept. of CSE – Data Science', ParagraphStyle('SigLeft', parent=styles['Normal'], fontName='Times-Roman', fontSize=10.5, leading=15, alignment=TA_LEFT)),
            Paragraph('<b>Head of the Department</b><br/><br/><br/><br/><b>Dr. CH. V. Murali Krishna</b><br/>Professor &amp; HOD<br/>Dept. of CSE – Data Science', ParagraphStyle('SigRight', parent=styles['Normal'], fontName='Times-Roman', fontSize=10.5, leading=15, alignment=TA_RIGHT))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[240, 240])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(sig_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: DECLARATION PAGE (EXACT SENIOR FORMAT)
    # =========================================================================
    story.append(Spacer(1, 10))
    story.append(Paragraph('DECLARATION', heading_style))
    story.append(Spacer(1, 24))

    decl_p1 = (
        'I hereby declare that the Community Service Project report titled '
        '<b>“SMART MEALS FOR PEOPLE WITH DIABETES”</b> is a bonafide work carried out in the '
        '<b>Department of CSE-DATA SCIENCE</b>, NRI Institute of Technology, Agiripalli, Vijayawada, '
        'during the academic year <b>2026-2027</b>, in partial fulfillment for the award of the degree of '
        '<b>Bachelor of Technology</b> by <b>JNTU Kakinada</b>.'
    )
    decl_p2 = 'I further declare that this dissertation has not been submitted elsewhere for any Degree or Diploma.'

    story.append(Paragraph(decl_p1, ParagraphStyle('DeclBody1', parent=body_justify, fontSize=11.5, leading=20, firstLineIndent=20)))
    story.append(Spacer(1, 14))
    story.append(Paragraph(decl_p2, ParagraphStyle('DeclBody2', parent=body_justify, fontSize=11.5, leading=20, firstLineIndent=20)))
    story.append(Spacer(1, 80))

    # Signature Block Right
    sig_decl = [
        [
            Paragraph('<b>Place:</b> Agiripalli<br/><b>Date:</b>', ParagraphStyle('DateLeft', parent=styles['Normal'], fontName='Times-Roman', fontSize=11, leading=16)),
            Paragraph('<b>BOMMALI DILEEP</b><br/><b>24KN1A4425</b><br/>B.Tech, CSE – Data Science', ParagraphStyle('DeclRight', parent=styles['Normal'], fontName='Times-Roman', fontSize=11, leading=16, alignment=TA_RIGHT))
        ]
    ]
    t_decl = Table(sig_decl, colWidths=[240, 240])
    t_decl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_decl)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: ACKNOWLEDGEMENT PAGE (EXACT SENIOR TEXT WITH DILEEP DETAILS)
    # =========================================================================
    story.append(Spacer(1, 6))
    story.append(Paragraph('ACKNOWLEDGEMENT', heading_style))
    story.append(Spacer(1, 16))

    ack_paras = [
        'I take this opportunity to thank all who have rendered their full support to my work. The pleasure, the achievement, the glory, the satisfaction, the reward, the appreciation, and the construction of my project cannot be expressed in just a few words for their valuable suggestions and encouragement.',
        'I extend my sincere thanks to Dean of the Department, <b>Dr. D. Suneetha</b> for her continuous guidance and support to complete my project successfully.',
        'I am grateful to my Head of the Department <b>Dr. CH. V. Murali Krishna</b>, Professor for rendering valuable suggestions and continuous guidance to complete the project successfully.',
        'I extend my sincere thanks to Project Guide <b>Ms. T. Navya Chandrika</b>, Assistant Professor for her continuous guidance, constructive feedback, and dedicated support to complete my project successfully.',
        'I am thankful to the Principal, <b>Dr. C. NagaBhaskar</b> for his encouragement to complete the Project work.',
        'I extend my sincere and honest thanks to the Chairman, <b>Dr. R. VenkataRao</b> for his continuous support in completing the Project work.',
        'Finally, I thank the Administrative Officer, Staff Members, Faculty of Department of CSE – DATA SCIENCE, NRI Institute of Technology, and our friends who directly or indirectly helped me in the completion of this project.'
    ]

    for p in ack_paras:
        story.append(Paragraph(p, ParagraphStyle('AckP', parent=body_justify, fontSize=10.5, leading=16, firstLineIndent=18)))
        story.append(Spacer(1, 9))

    story.append(Spacer(1, 16))
    t_ack = Table([
        [
            Paragraph('', styles['Normal']),
            Paragraph('<b>BOMMALI DILEEP</b><br/><b>24KN1A4425</b>', ParagraphStyle('AckSig', parent=styles['Normal'], fontName='Times-Bold', fontSize=11, leading=16, alignment=TA_RIGHT))
        ]
    ], colWidths=[240, 240])
    t_ack.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_ack)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: ABSTRACT PAGE (COMPREHENSIVE SMART MEALS DIABETES ABSTRACT)
    # =========================================================================
    story.append(Spacer(1, 6))
    story.append(Paragraph('ABSTRACT', heading_style))
    story.append(Spacer(1, 14))

    abstract_p1 = (
        'Diabetes mellitus represents one of the most critical and fast-growing public health challenges of the 21st century, '
        'with India often recognized as the diabetes capital of the world. Effective clinical control and sustained lifestyle management '
        'of diabetes rely fundamentally on medical nutrition therapy, glycemic index comprehension, strict portion discipline, '
        'and routine blood glucose monitoring. The Community Service Project (CSP) titled <b>“SMART MEALS FOR PEOPLE WITH DIABETES”</b> '
        'was executed over an intensive eight-week duration (May 3, 2026 to June 27, 2026) focusing on diabetic outpatients, resident caregivers, '
        'and healthcare visitors at Government Hospital, Gunadala, Kanuru, Vijayawada, under the academic supervision of '
        '<b>Ms. T. Navya Chandrika</b>, Assistant Professor, Department of CSE – Data Science, NRI Institute of Technology.'
    )
    abstract_p2 = (
        'The primary objective of the initiative was to evaluate grassroots community nutritional literacy, identify deep-rooted '
        'cultural dietary misconceptions (including irregular meal spacing, excessive reliance on refined polished white rice, and fear of healthy fats), '
        'and formulate practical, culturally compatible dietary frameworks. Through bilingual structured socio-economic surveys, '
        'one-on-one dietary consultations, and demographic analysis, quantitative and qualitative data was gathered regarding carbohydrate intake '
        'habits, postprandial glucose tracking awareness, and financial constraints associated with obtaining balanced nutrition.'
    )
    abstract_p3 = (
        'To bridge the gap between medical prescriptions and daily household cooking, the project implemented the evidence-based <b>“Smart Plate Method”</b>—advocating '
        'half-plate non-starchy fibrous vegetables, quarter-plate complex carbohydrates (unpolished millets, brown rice), and quarter-plate plant/dairy proteins (sprouts, pulses, curd). '
        'A memorable three-step dietary heuristic—<b>Recognise, Measure, and Pair</b>—was disseminated through visual portion charts and interactive demonstrations. '
        'Additionally, indigenous low-cost superfoods such as fenugreek seeds, bitter gourd, and cinnamon were integrated into affordable daily meal plans. '
        'The project achieved measurable enhancements in patient portion discipline, self-monitoring adherence, and community health empowerment, '
        'underscoring that structured grassroots nutritional counselling is a vital, cost-effective preventative strategy against severe diabetic complications.'
    )
    keywords = '<b>Keywords:</b> Diabetes Nutrition, Smart Meals, Glycemic Index, Plate Method, Community Health Education, Dietary Intervention, Preventative Healthcare, Rural Health.'

    story.append(Paragraph(abstract_p1, ParagraphStyle('AbsP1', parent=body_justify, fontSize=10, leading=15, firstLineIndent=18)))
    story.append(Spacer(1, 7))
    story.append(Paragraph(abstract_p2, ParagraphStyle('AbsP2', parent=body_justify, fontSize=10, leading=15, firstLineIndent=18)))
    story.append(Spacer(1, 7))
    story.append(Paragraph(abstract_p3, ParagraphStyle('AbsP3', parent=body_justify, fontSize=10, leading=15, firstLineIndent=18)))
    story.append(Spacer(1, 10))
    story.append(Paragraph(keywords, ParagraphStyle('AbsKeywords', parent=body_justify, fontSize=9.5, leading=14)))

    doc.build(story, canvasmaker=AcademicBorderCanvas)
    print(f'Front pages successfully built: {output_pdf}')


def merge_with_original_csp_book(front_pdf: str, original_pdf: str, output_final_pdf: str):
    front_reader = PdfReader(front_pdf)
    orig_reader = PdfReader(original_pdf)
    writer = PdfWriter()

    print(f'Front pages count: {len(front_reader.pages)}')
    print(f'Original pages count: {len(orig_reader.pages)}')

    # Strategy: Replace corresponding preliminary pages in original_pdf
    # Page 1 (index 0): APSCHE Cover Image -> Keep as Page 1
    # Page 2 (index 1): Old Title Page -> Replace with New Title Page (front_reader.pages[0])
    # Page 3 (index 2): Old Certificate -> Replace with New Certificate (front_reader.pages[1])
    # Page 4 (index 3): Instructions 1 -> Keep
    # Page 5 (index 4): Instructions 2 -> Keep
    # Page 6 (index 5): CSP Report Details -> Keep
    # Page 7 (index 6): Old Declaration -> Replace with New Declaration (front_reader.pages[2])
    # Page 8 (index 7): Official Community Certificate -> Keep (has official hospital signature/stamp)
    # Page 9 (index 8): Old Acknowledgement -> Replace with New Acknowledgement (front_reader.pages[3])
    # Insert New Abstract (front_reader.pages[4]) right after Acknowledgement
    # Page 10 (index 9) onwards: Contents, Executive Summary, Field logs, etc. -> Keep 100% intact!

    for idx, page in enumerate(orig_reader.pages):
        if idx == 0:
            # APSCHE Cover
            writer.add_page(page)
        elif idx == 1:
            # Title page replacement
            writer.add_page(front_reader.pages[0])
        elif idx == 2:
            # Certificate replacement
            writer.add_page(front_reader.pages[1])
        elif idx == 6:
            # Declaration replacement
            writer.add_page(front_reader.pages[2])
        elif idx == 8:
            # Acknowledgement replacement
            writer.add_page(front_reader.pages[3])
            # Insert Abstract right after Acknowledgement
            writer.add_page(front_reader.pages[4])
        else:
            writer.add_page(page)

    with open(output_final_pdf, 'wb') as f:
        writer.write(f)

    print(f'Successfully generated integrated book: {output_final_pdf} ({len(writer.pages)} pages)')

    # Also generate Presentation Version starting directly with Senior Cover Page as Page 1
    pres_writer = PdfWriter()
    for fp in front_reader.pages:
        pres_writer.add_page(fp)
    for idx, page in enumerate(orig_reader.pages):
        # Exclude old title (1), old cert (2), old decl (6), old ack (8)
        if idx in [1, 2, 6, 8]:
            continue
        pres_writer.add_page(page)

    pres_output = output_final_pdf.replace('.pdf', '_Direct_Cover.pdf')
    with open(pres_output, 'wb') as f:
        pres_writer.write(f)
    print(f'Successfully generated direct-cover book: {pres_output} ({len(pres_writer.pages)} pages)')


if __name__ == '__main__':
    logo = 'nri_logo.png'
    front_pdf = 'bommali_dileep_front_pages_temp.pdf'
    orig_pdf = r'C:\Users\Priyanka\Downloads\pdffffffff.pdf'
    final_pdf = r'C:\Users\Priyanka\Downloads\Bommali_Dileep_CSP_Smart_Meals_Final.pdf'

    build_front_pages_pdf(front_pdf, logo)
    merge_with_original_csp_book(front_pdf, orig_pdf, final_pdf)

