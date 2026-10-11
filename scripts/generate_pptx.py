import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    # 16:9 widescreen slides
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette - Obsidian Ruby & Cyber Amethyst Theme (Zero Green, Zero Yellow, Zero Blue)
    BG_DARK = RGBColor(9, 9, 14)          # Deep obsidian black
    CARD_BG = RGBColor(18, 16, 24)        # Luxury dark card background
    CRIMSON_ACCENT = RGBColor(255, 45, 85)# Electric crimson ruby
    PURPLE_ACCENT = RGBColor(168, 85, 247)# Cyber amethyst violet
    TEXT_WHITE = RGBColor(248, 250, 252)  # Crisp platinum white
    TEXT_MUTED = RGBColor(161, 161, 170)  # Zinc slate gray
    BORDER_COLOR = RGBColor(48, 32, 50)   # Subtle crimson-amethyst border

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background() # no line
        return bg

    def add_header(slide, title_text, category_text="PATHFINDER 2.0  •  AI CAREER INTELLIGENCE"):
        # Category Tracker
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CRIMSON_ACCENT

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(28)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s1)

    # Decorative Card
    card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.0), Inches(10.933), Inches(5.5))
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_BG
    card.line.color.rgb = BORDER_COLOR
    card.line.width = Pt(1.5)

    tb = s1.shapes.add_textbox(Inches(1.8), Inches(1.5), Inches(9.733), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "PATHFINDER 2.0"
    p0.font.size = Pt(46)
    p0.font.bold = True
    p0.font.color.rgb = CRIMSON_ACCENT
    p0.alignment = PP_ALIGN.CENTER

    p1 = tf.add_paragraph()
    p1.text = "Predictive Placement Analytics & Autonomous AI Career Guidance Platform"
    p1.font.size = Pt(20)
    p1.font.color.rgb = TEXT_WHITE
    p1.alignment = PP_ALIGN.CENTER

    p_div = tf.add_paragraph()
    p_div.text = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    p_div.font.size = Pt(14)
    p_div.font.color.rgb = BORDER_COLOR
    p_div.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = "Developer & Lead Engineer: Dileep Bommali"
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = PURPLE_ACCENT
    p2.alignment = PP_ALIGN.CENTER

    p3 = tf.add_paragraph()
    p3.text = "Stack: React 19 • TypeScript • FastAPI • Scikit-Learn • Google Gemini AI • ThreeUI WebGL"
    p3.font.size = Pt(14)
    p3.font.color.rgb = TEXT_MUTED
    p3.alignment = PP_ALIGN.CENTER

    p4 = tf.add_paragraph()
    p4.text = "Repository: https://github.com/dileepbommali16-ops/pathfinder"
    p4.font.size = Pt(13)
    p4.font.color.rgb = CRIMSON_ACCENT
    p4.alignment = PP_ALIGN.CENTER

    # Notes
    s1.notes_slide.notes_text_frame.text = (
        "Good morning everyone. I am Dileep Bommali, and today I am excited to present Pathfinder 2.0 — "
        "a full-stack, AI-driven career intelligence platform engineered to bridge the critical gap "
        "between academic curriculum and high-growth industry expectations."
    )

    # -------------------------------------------------------------
    # SLIDE 2: Problem Statement
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s2)
    add_header(s2, "The Industry-Academia Placement Disconnect", "PROBLEM STATEMENT")

    problems = [
        ("Lack of Early Forecasting", "Students realize placement readiness gaps in final semester when it is too late to pivot."),
        ("Ambiguous Industry Benchmarks", "Job descriptions are noisy and vague; students struggle to understand exact technical expectations."),
        ("Scalability Bottlenecks", "College placement cells cannot provide 24/7 personalized, one-on-one technical coaching to thousands."),
        ("Unstructured Multi-Dimensional Data", "Colleges rely solely on GPA, ignoring coding ranks, hackathons, and soft-skill metrics.")
    ]

    for i, (title, desc) in enumerate(problems):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 5.95)
        y = Inches(1.85 + row * 2.5)

        box = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.6), Inches(2.2))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = BORDER_COLOR
        box.line.width = Pt(1.2)

        tb_box = s2.shapes.add_textbox(x + Inches(0.3), y + Inches(0.3), Inches(5.0), Inches(1.6))
        tf_box = tb_box.text_frame
        tf_box.word_wrap = True

        p_t = tf_box.paragraphs[0]
        p_t.text = f"0{i+1}. {title}"
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf_box.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(14)
        p_d.font.color.rgb = TEXT_MUTED

    s2.notes_slide.notes_text_frame.text = (
        "Every year, millions of engineering graduates enter the recruitment cycle, yet over 60% face challenges landing core roles. "
        "The fundamental problem isn't lack of talent—it's lack of early, data-backed visibility into their placement readiness."
    )

    # -------------------------------------------------------------
    # SLIDE 3: The Solution
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s3)
    add_header(s3, "Pathfinder 2.0: Data-Driven Career Acceleration", "THE SOLUTION")

    solutions = [
        ("Predictive ML Engine", "Computes statistical placement probability, candidate tier, and risk factors instantly."),
        ("Skill-Gap Radar", "Benchmarks student profile against live industry requirements for Tier-1 engineering roles."),
        ("Autonomous Gemini AI Coach", "Generates custom week-by-week learning roadmaps and provides 24/7 technical mentorship."),
        ("Placement Cell Analytics", "Cohort segmentation, recruiter talent filters, and instant ATS PDF/CSV report exports.")
    ]

    for i, (title, desc) in enumerate(solutions):
        x = Inches(0.8 + i * 2.95)
        y = Inches(1.9)
        box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(2.8), Inches(4.8))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = BORDER_COLOR
        box.line.width = Pt(1.2)

        tb_box = s3.shapes.add_textbox(x + Inches(0.2), y + Inches(0.3), Inches(2.4), Inches(4.2))
        tf_box = tb_box.text_frame
        tf_box.word_wrap = True

        p_num = tf_box.paragraphs[0]
        p_num.text = f"PHASE 0{i+1}"
        p_num.font.size = Pt(11)
        p_num.font.bold = True
        p_num.font.color.rgb = PURPLE_ACCENT

        p_t = tf_box.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(18)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf_box.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_WHITE

    s3.notes_slide.notes_text_frame.text = (
        "Pathfinder acts as an autonomous career copilot. It ingests academic metrics, competitive coding, hackathons, and certifications, "
        "and provides actionable, step-by-step guidance to reach peak readiness."
    )

    # -------------------------------------------------------------
    # SLIDE 4: System Architecture
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s4)
    add_header(s4, "Full-Stack System Architecture & Data Flow", "SYSTEM DESIGN")

    tiers = [
        ("Frontend Tier", "React 19 & TypeScript", "Vite 7 build system, Tailwind CSS v4, Framer Motion, 15 specialized modules, ThreeUI 3D WebGL background shaders."),
        ("API & Gateway Tier", "FastAPI & SQLite WAL", "High-throughput asynchronous Python gateway, SQLite in WAL mode with repository pattern, sub-20ms queries, JWT security."),
        ("Intelligence Tier", "Scikit-Learn & Gemini AI", "Calibrated Random Forest model (88% accuracy, 972 cohort records), Google Gemini 2.0 Flash bilingual AI Coach.")
    ]

    for i, (layer, tech, detail) in enumerate(tiers):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.9)
        box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(4.8))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = BORDER_COLOR
        box.line.width = Pt(1.2)

        tb_box = s4.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), Inches(3.25), Inches(4.2))
        tf_box = tb_box.text_frame
        tf_box.word_wrap = True

        p_layer = tf_box.paragraphs[0]
        p_layer.text = layer.upper()
        p_layer.font.size = Pt(12)
        p_layer.font.bold = True
        p_layer.font.color.rgb = PURPLE_ACCENT

        p_t = tf_box.add_paragraph()
        p_t.text = tech
        p_t.font.size = Pt(18)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf_box.add_paragraph()
        p_d.text = detail
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_WHITE

    s4.notes_slide.notes_text_frame.text = (
        "Pathfinder is built on a decoupled, production-grade architecture. The responsive React frontend connects to a lightning-fast "
        "FastAPI backend, with sub-100 millisecond inference and end-to-end type safety."
    )

    # -------------------------------------------------------------
    # SLIDE 5: Machine Learning Engine
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s5)
    add_header(s5, "Quantitative ML Placement Prediction (972 Records)", "ALGORITHM & MODEL")

    # Left Box
    b_l = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.9), Inches(5.6), Inches(4.8))
    b_l.fill.solid()
    b_l.fill.fore_color.rgb = CARD_BG
    b_l.line.color.rgb = BORDER_COLOR
    tb_l = s5.shapes.add_textbox(Inches(1.1), Inches(2.1), Inches(5.0), Inches(4.4))
    tf_l = tb_l.text_frame
    tf_l.word_wrap = True

    p_lt = tf_l.paragraphs[0]
    p_lt.text = "Features & Input Vector"
    p_lt.font.size = Pt(19)
    p_lt.font.bold = True
    p_lt.font.color.rgb = CRIMSON_ACCENT

    points = [
        "Academic standing: CGPA, core credits, active backlogs",
        "Industry readiness: Internships, live deployed projects",
        "Algorithmic aptitude: LeetCode/DSA problem count & rank",
        "Competitions: Hackathon wins, certifications, GitHub portfolio",
        "Communication & soft skills: Placement interview rubric scores"
    ]
    for pt in points:
        p = tf_l.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = Pt(13)
        p.font.color.rgb = TEXT_WHITE

    # Right Box
    b_r = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.9), Inches(5.7), Inches(4.8))
    b_r.fill.solid()
    b_r.fill.fore_color.rgb = CARD_BG
    b_r.line.color.rgb = BORDER_COLOR
    tb_r = s5.shapes.add_textbox(Inches(7.1), Inches(2.1), Inches(5.1), Inches(4.4))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True

    p_rt = tf_r.paragraphs[0]
    p_rt.text = "Calibrated Random Forest Engine"
    p_rt.font.size = Pt(19)
    p_rt.font.bold = True
    p_rt.font.color.rgb = PURPLE_ACCENT

    r_points = [
        "Trained on 972 historical student placement records across 9 branches",
        "Random Forest Classifier with 120 decision trees (88% test accuracy)",
        "Outputs probabilistic placement odds (0 - 100%) and salary tier (LPA)",
        "Feature importance scoring highlights priority growth areas",
        "Sub-45ms ultra-low inference latency per candidate prediction"
    ]
    for pt in r_points:
        p = tf_r.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = Pt(13)
        p.font.color.rgb = TEXT_WHITE

    s5.notes_slide.notes_text_frame.text = (
        "Rather than guessing based on grades, our ML engine analyzes 8 holistic dimensions across 972 real records. "
        "It generates exact probability scores and pinpoints high-impact actions to improve student outcomes."
    )

    # -------------------------------------------------------------
    # SLIDE 6: Skill Gap & Gemini Roadmaps
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s6)
    add_header(s6, "Screen-Aware Bilingual Gemini AI Coach", "AI MENTORSHIP")

    cards6 = [
        ("Screen-Aware Context", "Live UI Synchronized", "The AI Coach dynamically reads the active screen, CGPA, backlogs, and gauge percentage to mentor with exact numbers."),
        ("Bilingual Mentorship", "English & Telugu Support", "Offers technical coaching in English, Telugu script, and Roman Telugu to eliminate language barriers for all students."),
        ("Multi-Turn Follow-Ups", "Conversational Memory", "Retains multi-turn dialogue context so candidates can ask in-depth follow-up questions on architecture, DSA, and viva prep.")
    ]
    for i, (title, sub, body) in enumerate(cards6):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.9)
        b = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(4.8))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        tb = s6.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), Inches(3.25), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = sub.upper()
        p0.font.size = Pt(12)
        p0.font.bold = True
        p0.font.color.rgb = CRIMSON_ACCENT

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(19)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = body
        p2.font.size = Pt(14)
        p2.font.color.rgb = TEXT_MUTED

    s6.notes_slide.notes_text_frame.text = (
        "When a student selects a career track, Pathfinder pinpoints their technical weaknesses. "
        "Google Gemini then generates a tailored, structured roadmap with handpicked exercises."
    )

    # -------------------------------------------------------------
    # SLIDE 7: UI/UX & Innovative Design
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s7)
    add_header(s7, "Spatial UI & Immersive User Experience", "DESIGN & INTERACTION")

    features7 = [
        ("Interactive Lamp Login", "Zero-Blockage Access", "Tactile desk lamp with pull cord, multi-point click controls, GPU particles, and 1-click Instant Guest Mode."),
        ("23 Production Blueprints", "Software & Hardware", "6 Flagship + 17 Smart India Hackathon system architectures with pipelines, pitfalls, and viva defense Q&A."),
        ("15 Specialized Modules", "Spatial UI Architecture", "Overview, Cohort Analytics, What-If Simulator, Resume Studio, Digital Twin, and 3D WebGL background shaders.")
    ]
    for i, (title, sub, body) in enumerate(features7):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.9)
        b = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(4.8))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        tb = s7.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), Inches(3.25), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = sub.upper()
        p0.font.size = Pt(12)
        p0.font.bold = True
        p0.font.color.rgb = PURPLE_ACCENT

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(19)
        p1.font.bold = True
        p1.font.color.rgb = CRIMSON_ACCENT

        p2 = tf.add_paragraph()
        p2.text = body
        p2.font.size = Pt(14)
        p2.font.color.rgb = TEXT_WHITE

    s7.notes_slide.notes_text_frame.text = (
        "We prioritized design excellence. The interactive lamp login, WebGL shader background, and responsive glassmorphic cards "
        "make the platform engaging and memorable for users."
    )

    # -------------------------------------------------------------
    # SLIDE 8: Institutional Analytics & Reports
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s8)
    add_header(s8, "Institutional Intelligence & Automated Reporting", "REPORTS & EXPORTS")

    reports = [
        ("Cohort Explorer Heatmaps", "Batch Analytics", "Empowers placement directors to filter batches by CGPA brackets, branch, and predicted placement tiers."),
        ("ATS-Optimized PDF Profiles", "ReportLab Generation", "Compiles student metrics, skill radars, and verification badges into professional, recruiter-ready PDF reports."),
        ("Batch CSV Data Pipeline", "Institutional Exports", "One-click streaming export of student placement profiles for institutional accreditation and NAAC/NIRF reporting.")
    ]
    for i, (title, sub, body) in enumerate(reports):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.9)
        b = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(4.8))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        tb = s8.shapes.add_textbox(x + Inches(0.25), y + Inches(0.3), Inches(3.25), Inches(4.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = sub.upper()
        p0.font.size = Pt(12)
        p0.font.bold = True
        p0.font.color.rgb = CRIMSON_ACCENT

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.size = Pt(19)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_WHITE

        p2 = tf.add_paragraph()
        p2.text = body
        p2.font.size = Pt(14)
        p2.font.color.rgb = TEXT_MUTED

    s8.notes_slide.notes_text_frame.text = (
        "For universities, Pathfinder acts as a command center. Placement officers can track batch readiness, export verified candidate pools, "
        "and generate PDF dossiers in seconds."
    )

    # -------------------------------------------------------------
    # SLIDE 9: Testing & Benchmarks
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s9)
    add_header(s9, "Performance Benchmarks & Quality Assurance", "VERIFICATION")

    metrics = [
        ("972 Placement Records", "Verified across 9 Engineering Branches"),
        ("88% ML Accuracy", "Random Forest Classifier (120 Estimators)"),
        ("100% Strict Type Safety", "tsc --noEmit & zero Python compilation errors"),
        ("16/16 Audit Passed", "IDOR 403 Forbidden & Security Verification"),
        ("Bilingual AI Mentorship", "English, Telugu Script & Roman Telugu"),
        ("Production Deployed", "Vercel Edge SPA & Render Cloud API Service")
    ]
    for i, (title, desc) in enumerate(metrics):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.95)
        y = Inches(1.9 + row * 2.5)

        b = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(2.2))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        tb = s9.shapes.add_textbox(x + Inches(0.25), y + Inches(0.25), Inches(3.25), Inches(1.7))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "✓ " + title
        p0.font.size = Pt(18)
        p0.font.bold = True
        p0.font.color.rgb = CRIMSON_ACCENT

        p1 = tf.add_paragraph()
        p1.text = desc
        p1.font.size = Pt(13)
        p1.font.color.rgb = TEXT_MUTED

    s9.notes_slide.notes_text_frame.text = (
        "Every single module in Pathfinder has undergone comprehensive validation. The API endpoints, "
        "machine learning inference, and React build are rock-solid and production-ready."
    )

    # -------------------------------------------------------------
    # SLIDE 10: Conclusion & Future Scope
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s10)
    add_header(s10, "Conclusion, Future Horizons & Q&A", "SUMMARY")

    b_c = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.8), Inches(10.933), Inches(4.9))
    b_c.fill.solid()
    b_c.fill.fore_color.rgb = CARD_BG
    b_c.line.color.rgb = BORDER_COLOR
    b_c.line.width = Pt(1.5)

    tb_c = s10.shapes.add_textbox(Inches(1.6), Inches(2.1), Inches(10.133), Inches(4.3))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True

    p_f = tf_c.paragraphs[0]
    p_f.text = "Future Roadmap:"
    p_f.font.size = Pt(20)
    p_f.font.bold = True
    p_f.font.color.rgb = CRIMSON_ACCENT

    p_f1 = tf_c.add_paragraph()
    p_f1.text = "• AI Voice Mock Interviews: Real-time speech and technical problem-solving analysis."
    p_f1.font.size = Pt(14)
    p_f1.font.color.rgb = TEXT_WHITE

    p_f2 = tf_c.add_paragraph()
    p_f2.text = "• Automated Code Verification: Direct GitHub & LeetCode API integration for continuous skill validation."
    p_f2.font.size = Pt(14)
    p_f2.font.color.rgb = TEXT_WHITE

    p_f3 = tf_c.add_paragraph()
    p_f3.text = "• Multi-Campus Federated Network: Benchmarking placement metrics across peer universities."
    p_f3.font.size = Pt(14)
    p_f3.font.color.rgb = TEXT_WHITE

    p_sep = tf_c.add_paragraph()
    p_sep.text = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    p_sep.font.size = Pt(12)
    p_sep.font.color.rgb = BORDER_COLOR

    p_end = tf_c.add_paragraph()
    p_end.text = "Thank you! Open for Questions & Discussion."
    p_end.font.size = Pt(22)
    p_end.font.bold = True
    p_end.font.color.rgb = PURPLE_ACCENT

    p_creds = tf_c.add_paragraph()
    p_creds.text = "Developer: Dileep Bommali  |  GitHub: https://github.com/dileepbommali16-ops/pathfinder"
    p_creds.font.size = Pt(14)
    p_creds.font.color.rgb = CRIMSON_ACCENT

    s10.notes_slide.notes_text_frame.text = (
        "Thank you for your time and attention. Pathfinder represents the future of data-driven student career acceleration. "
        "I am now open to your questions."
    )

    # Save outputs to both Desktop and current project root
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_path = os.path.join(repo_root, "Pathfinder_Presentation_Dileep_Bommali.pptx")
    desktop_path = os.path.expanduser(r"~\Desktop\Pathfinder_Presentation_Dileep_Bommali.pptx")

    prs.save(repo_path)
    try:
        prs.save(desktop_path)
        print(f"Presentation saved successfully to:\n1. {repo_path}\n2. {desktop_path}")
    except Exception:
        print(f"Presentation saved successfully to:\n1. {repo_path}")

if __name__ == '__main__':
    create_deck()
