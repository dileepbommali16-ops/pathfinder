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

    # Color Palette: Obsidian Ruby & Cyber Amethyst (Strictly ZERO green, ZERO yellow, ZERO dark green, ZERO dark blue)
    BG_DARK = RGBColor(6, 6, 10)            # Deep obsidian black
    CARD_BG = RGBColor(16, 14, 22)          # Rich luxury slate card
    CARD_INNER = RGBColor(24, 20, 32)       # Elevated nested card
    CRIMSON_ACCENT = RGBColor(255, 30, 86)  # Electric crimson ruby
    PURPLE_ACCENT = RGBColor(168, 85, 247)  # Cyber amethyst violet
    TEXT_WHITE = RGBColor(255, 255, 255)    # Pure bright white
    TEXT_MUTED = RGBColor(161, 161, 170)    # Zinc slate gray
    BORDER_COLOR = RGBColor(46, 32, 52)     # Subtle ruby-violet card border

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, title_text, category_text="PATHFINDER 2.0  •  AUTONOMOUS CAREER INTELLIGENCE", slide_num=None):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CRIMSON_ACCENT

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.65))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

        # Footer line & watermark
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.02))
        line.fill.solid()
        line.fill.fore_color.rgb = BORDER_COLOR
        line.line.fill.background()

        foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.35))
        tf_foot = foot_box.text_frame
        p_foot = tf_foot.paragraphs[0]
        num_str = f"Slide {slide_num:02d} / 10 • " if slide_num else ""
        p_foot.text = f"{num_str}Pathfinder 2.0 • Lead Systems Engineer: Dileep Bommali • https://github.com/dileepbommali16-ops/pathfinder"
        p_foot.font.size = Pt(10)
        p_foot.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide (Rich Executive Thesis)
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s1)

    card1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(0.8), Inches(11.333), Inches(5.8))
    card1.fill.solid()
    card1.fill.fore_color.rgb = CARD_BG
    card1.line.color.rgb = BORDER_COLOR
    card1.line.width = Pt(1.5)

    tb1 = s1.shapes.add_textbox(Inches(1.4), Inches(1.2), Inches(10.533), Inches(5.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p0 = tf1.paragraphs[0]
    p0.text = "PATHFINDER 2.0"
    p0.font.size = Pt(46)
    p0.font.bold = True
    p0.font.color.rgb = CRIMSON_ACCENT
    p0.alignment = PP_ALIGN.CENTER

    p1 = tf1.add_paragraph()
    p1.text = "Autonomous Placement Intelligence, ML Eligibility Engine & Multilingual Mentorship Platform"
    p1.font.size = Pt(18)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.alignment = PP_ALIGN.CENTER

    p_div = tf1.add_paragraph()
    p_div.text = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    p_div.font.size = Pt(12)
    p_div.font.color.rgb = BORDER_COLOR
    p_div.alignment = PP_ALIGN.CENTER

    p_specs = tf1.add_paragraph()
    p_specs.text = "PRODUCTION BENCHMARKS & VERIFIED METRICS"
    p_specs.font.size = Pt(12)
    p_specs.font.bold = True
    p_specs.font.color.rgb = PURPLE_ACCENT
    p_specs.alignment = PP_ALIGN.CENTER

    p_specs_data = tf1.add_paragraph()
    p_specs_data.text = "972 Verified Student Records across 9 Branches  |  88.2% Calibrated Random Forest Accuracy\n15 Specialized Architecture Tabs  |  23 Deployed Blueprints  |  Sub-15ms WAL Query Latency"
    p_specs_data.font.size = Pt(14)
    p_specs_data.font.color.rgb = TEXT_MUTED
    p_specs_data.alignment = PP_ALIGN.CENTER

    p_eng = tf1.add_paragraph()
    p_eng.text = "\nLead Architect & Full-Stack Systems Engineer: Dileep Bommali"
    p_eng.font.size = Pt(16)
    p_eng.font.bold = True
    p_eng.font.color.rgb = CRIMSON_ACCENT
    p_eng.alignment = PP_ALIGN.CENTER

    p_stack = tf1.add_paragraph()
    p_stack.text = "Stack: React 19 • TypeScript • Python FastAPI • Scikit-Learn • Google Gemini 2.0 Flash • SQLite WAL"
    p_stack.font.size = Pt(12)
    p_stack.font.color.rgb = TEXT_MUTED
    p_stack.alignment = PP_ALIGN.CENTER

    # -------------------------------------------------------------
    # SLIDE 2: Quantitative Problem Statement (Deep Placement Crisis)
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s2)
    add_header(s2, "The Industry-Academia Placement Disconnect", "PROBLEM STATEMENT & QUANTITATIVE CRISIS", 2)

    stats = [
        ("64.8% Technical Filter Rejection", "Over 64% of engineering graduates fail preliminary technical screenings due to outdated academic curriculum misaligned with real industry rubrics."),
        ("82% Lack Production Blueprints", "Students build superficial toy projects with zero live cloud deployments, containerization, or production-grade database schema architecture."),
        ("1 : 1,200 Placement Mentor Ratio", "University career training cells cannot provide 24/7 personalized, line-by-line code reviews and system design grilling across thousands of students."),
        ("78% Late Skill-Gap Realization", "Candidates discover critical aptitude and DSA deficiencies only in Semester 7/8, making it mathematically impossible to recover before recruitment drives.")
    ]

    for i, (title, desc) in enumerate(stats):
        row = i // 2
        col = i % 2
        x = Inches(0.8 + col * 5.95)
        y = Inches(1.55 + row * 2.6)

        b = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(5.6), Inches(2.35))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s2.shapes.add_textbox(x + Inches(0.25), y + Inches(0.2), Inches(5.1), Inches(1.95))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = f"CRISIS {i+1:02d} • {title}"
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 3: The Solution (Multi-Stage Autonomous Framework)
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s3)
    add_header(s3, "Pathfinder 2.0: Autonomous Career Acceleration Engine", "SOLUTION ARCHITECTURE", 3)

    pillars = [
        ("Predictive ML Calibration", "Ingests 8 candidate dimensions (CGPA, LeetCode rank, Git commits, backlogs) to output placement probability (0-100%) and 4 salary compensation tiers."),
        ("Skill-Gap Radar Alignment", "Compares student mastery vectors against live Tier-1 company benchmarks across 9 engineering disciplines (CSE, ECE, AI/ML, Cyber Security, etc.)."),
        ("Multilingual Gemini Copilot", "Generates personalized 6-phase adaptive study roadmaps with 24/7 real-time voice and text mentorship in both English and Telugu script."),
        ("Institutional Command Center", "Empowers placement directors with cohort distribution heatmaps, 1-click ATS-optimized ReportLab PDF dossiers, and streaming CSV exports.")
    ]

    for i, (title, desc) in enumerate(pillars):
        x = Inches(0.8 + i * 2.95)
        y = Inches(1.55)
        b = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(2.8), Inches(5.15))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s3.shapes.add_textbox(x + Inches(0.2), y + Inches(0.25), Inches(2.4), Inches(4.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p_num = tf.paragraphs[0]
        p_num.text = f"PILLAR {i+1:02d}"
        p_num.font.size = Pt(11)
        p_num.font.bold = True
        p_num.font.color.rgb = PURPLE_ACCENT

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 4: Full-Stack System Architecture & Data Flow
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s4)
    add_header(s4, "Full-Stack System Architecture & Data Pipelines", "TECHNICAL INFRASTRUCTURE", 4)

    tiers = [
        ("Frontend Client Layer", "React 19 & TypeScript Strict", "• Vite 7 lightning-fast bundler with dynamic chunking\n• Tailwind CSS v4 design system with custom CSS variables\n• Framer Motion physics for zero-layout-shift UI\n• 15 specialized spatial tabs with ThreeUI WebGL shaders\n• Zero runtime type errors (100% strict tsc verification)"),
        ("Gateway & API Layer", "Python FastAPI & Asynchronous I/O", "• Fully asynchronous Python 3.11 ASGI event loop\n• Pydantic v2 schemas validating request/response DTOs\n• Strict JWT token lifecycle with revocation blacklist\n• Automated IDOR access defense returning 403 Forbidden\n• Sub-15ms median REST API endpoint response time"),
        ("Persistence & AI Layer", "SQLite WAL & Gemini 2.0 Flash", "• SQLite configured in Write-Ahead Logging (WAL) mode\n• PRAGMA synchronous = NORMAL for high concurrency\n• Scikit-learn pre-trained Random Forest model cache\n• Google Gemini 2.0 Flash LLM with prompt grounding\n• ReportLab automated PDF engine for instant dossiers")
    ]

    for i, (layer, tech, details) in enumerate(tiers):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.55)
        b = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(5.15))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s4.shapes.add_textbox(x + Inches(0.25), y + Inches(0.25), Inches(3.25), Inches(4.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p_l = tf.paragraphs[0]
        p_l.text = layer.upper()
        p_l.font.size = Pt(11)
        p_l.font.bold = True
        p_l.font.color.rgb = PURPLE_ACCENT

        p_t = tf.add_paragraph()
        p_t.text = tech
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = details
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 5: Quantitative ML Predictive Engine
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s5)
    add_header(s5, "Quantitative ML Engine (88.2% Accuracy, 972 Records)", "MACHINE LEARNING MATHEMATICS", 5)

    # Left Box: Feature Vector
    bl = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.55), Inches(5.6), Inches(5.15))
    bl.fill.solid()
    bl.fill.fore_color.rgb = CARD_BG
    bl.line.color.rgb = BORDER_COLOR

    tbl = s5.shapes.add_textbox(Inches(1.05), Inches(1.75), Inches(5.1), Inches(4.7))
    tfl = tbl.text_frame
    tfl.word_wrap = True

    p_fl_t = tfl.paragraphs[0]
    p_fl_t.text = "8-Dimensional Input Vector"
    p_fl_t.font.size = Pt(18)
    p_fl_t.font.bold = True
    p_fl_t.font.color.rgb = CRIMSON_ACCENT

    f_items = [
        ("CGPA & Academic Credits", "Normalized university cumulative grade average."),
        ("Active Backlog Score", "Exponential penalty for pending academic arrears."),
        ("DSA & Algorithmic Rank", "LeetCode/HackerRank solved count & contest percentile."),
        ("Production Blueprints", "Verified GitHub portfolios with live deployed URLs."),
        ("Hackathon Trophies", "National-level hackathons (SIH, ICPC, TechFests)."),
        ("Verified Internships", "Tenure and tech-stack relevance of industry work."),
        ("Cloud Certifications", "AWS Solutions Architect, GCP Associate, CKA."),
        ("Communication Rubric", "Placement soft-skill and mock viva rubric score.")
    ]
    for name, desc in f_items:
        p = tfl.add_paragraph()
        p.text = f"• {name}: {desc}"
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE

    # Right Box: Model Specifications
    br = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.55), Inches(5.7), Inches(5.15))
    br.fill.solid()
    br.fill.fore_color.rgb = CARD_BG
    br.line.color.rgb = BORDER_COLOR

    tbr = s5.shapes.add_textbox(Inches(7.05), Inches(1.75), Inches(5.2), Inches(4.7))
    tfr = tbr.text_frame
    tfr.word_wrap = True

    p_fr_t = tfr.paragraphs[0]
    p_fr_t.text = "Calibrated Random Forest Classifier"
    p_fr_t.font.size = Pt(18)
    p_fr_t.font.bold = True
    p_fr_t.font.color.rgb = PURPLE_ACCENT

    m_specs = [
        "Dataset: 972 verified student placement records across 9 branches",
        "Ensemble: 120 decision trees with balanced class weighting",
        "Evaluation: 88.2% Test Accuracy, 0.89 F1-Score, 0.91 AUC-ROC",
        "Compensation Tiering: Stratifies into 4 distinct salary brackets:\n  - Tier 1: Core / Entry (3 - 6 LPA)\n  - Tier 2: Mid-Level Engineering (6 - 10 LPA)\n  - Tier 3: High-Growth Product (10 - 18 LPA)\n  - Tier 4: Tier-1 Tech Elite (18 - 35+ LPA)",
        "Feature Importance: DSA problem count (31%) and Production projects (26%) dominate over pure CGPA (14%)",
        "Latency: 42ms median CPU inference via pre-compiled joblib cache"
    ]
    for pt in m_specs:
        p = tfr.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = Pt(11)
        p.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 6: 6-Phase Adaptive Learning Roadmap
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s6)
    add_header(s6, "Automated 6-Phase Tactical Placement Sprints", "ADAPTIVE CURRICULUM ACCELERATION", 6)

    phases = [
        ("Phase 01: Core Algorithmic Mastery", "Time/space complexity analysis, arrays, strings, two-pointer techniques, recursion, and initial 50 LeetCode Easy/Medium milestones."),
        ("Phase 02: Advanced Data Structures", "Trees, Graphs, BFS/DFS traversals, Dynamic Programming memoization, Trie structures, and priority queues."),
        ("Phase 03: Production Backend Engineering", "RESTful API design, database normalization, indexing strategies, connection pooling, and JWT authorization."),
        ("Phase 04: System Architecture & Blueprints", "Microservices, caching with Redis, message queues (Kafka), Docker containerization, and cloud deployment pipelines."),
        ("Phase 05: Mock Viva Defense & Grilling", "Simulating high-pressure system design interviews, failure recovery scenarios, trade-off defenses, and DSA speed tests."),
        ("Phase 06: Recruitment Acceleration", "ATS resume optimization, GitHub portfolio refinement, LinkedIn targeting, and high-conversion cold outreach campaigns.")
    ]

    for i, (title, desc) in enumerate(phases):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.95)
        y = Inches(1.55 + row * 2.6)

        b = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(2.35))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s6.shapes.add_textbox(x + Inches(0.2), y + Inches(0.2), Inches(3.35), Inches(1.95))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 7: Bilingual AI Coach & Viva Defense Simulator
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s7)
    add_header(s7, "Screen-Aware Bilingual AI Coach & Defense Simulator", "AI MENTORSHIP & INTERVIEW SIMULATION", 7)

    coach_features = [
        ("Live UI State Awareness", "Context-Synchronized Mentorship", "The AI mentor continuously reads live telemetry from the student's active UI — ingesting exact CGPA, pending backlogs, target role, and ML placement gauge percentage to mentor with concrete numbers instead of generic advice."),
        ("Bilingual Mentorship (English + Telugu)", "Eliminating Regional Language Barriers", "Full technical mentorship in fluent English, native Telugu script, and conversational Roman Telugu. Explains complex distributed systems, memory heaps, and tree traversals without linguistic intimidation."),
        ("Viva Defense Simulator", "High-Pressure Mock Interview Grilling", "Interrogates candidates on architectural choices, database locking, edge cases, and scaling bottlenecks in their portfolio projects, preparing them thoroughly for rigorous viva panels and technical rounds.")
    ]

    for i, (title, sub, desc) in enumerate(coach_features):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.55)
        b = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(5.15))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s7.shapes.add_textbox(x + Inches(0.25), y + Inches(0.25), Inches(3.25), Inches(4.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p_sub = tf.paragraphs[0]
        p_sub.text = sub.upper()
        p_sub.font.size = Pt(10)
        p_sub.font.bold = True
        p_sub.font.color.rgb = PURPLE_ACCENT

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 8: 23 Production Blueprints & Hardware SIH Statements
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s8)
    add_header(s8, "Enterprise Project Studio: 23 Production Blueprints", "PORTFOLIO ENGINEERING & HARDWARE SIH", 8)

    blueprints = [
        ("Smart Campus Micro-Grid", "IoT & Embedded (ESP32 / MQTT / Grafana)", "Distributed smart energy monitoring with sub-second MQTT telemetry, power spike alerts, and automated load balancing."),
        ("High-Throughput Ledger", "Fintech & Go (Go / Redis / Kafka / Postgres)", "Event-sourced double-entry ledger handling 12k tx/sec with distributed lock mitigation and ACID audit persistence."),
        ("Medical Image Classifier", "Deep Learning (PyTorch / DenseNet / FastAPI)", "Diagnostic computer vision pipeline classifying chest X-rays with Grad-CAM visual heatmaps and 94.6% validation accuracy."),
        ("AI Network Attack Forecaster", "Cyber Defense (Zeek PCAP / Temporal GAT)", "Predictive intrusion detector analyzing 25k packets/sec to forecast lateral movement attacks 8 minutes before asset breach."),
        ("Drone 3D Model Synthesizer", "SIH Hardware & Vision (Instant-NGP / NeRF)", "Single-pass drone reconnaissance footage reconstruction generating centimetre-accurate 3D point cloud meshes."),
        ("Autonomous Supply Optimizer", "Enterprise AI (MILP / Python / FastAPI)", "Mixed-integer linear programming model minimizing multi-warehouse distribution costs under dynamic demand constraints.")
    ]

    for i, (title, stack, desc) in enumerate(blueprints):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.95)
        y = Inches(1.55 + row * 2.6)

        b = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(2.35))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s8.shapes.add_textbox(x + Inches(0.2), y + Inches(0.2), Inches(3.35), Inches(1.95))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_s = tf.add_paragraph()
        p_s.text = stack
        p_s.font.size = Pt(10)
        p_s.font.bold = True
        p_s.font.color.rgb = PURPLE_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 9: Institutional Intelligence & ATS Resume Studio
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s9)
    add_header(s9, "Institutional Analytics, ATS Studio & Reporting", "REPORTS & ACCREDITATION PIPELINES", 9)

    inst_features = [
        ("Cohort Explorer Heatmaps", "University-Wide Batch Telemetry", "Provides placement deans and TPOs with real-time multi-dimensional batch filtering by CGPA bands, branch-wise readiness, and predicted placement probability tiers across all active student cohorts."),
        ("ATS Resume Studio & Auditor", "Automated Resume Diagnostics", "Parses student resumes against target job descriptions, computes algorithmic keyword match scores, pinpoints missing frameworks, and automatically rewrites passive bullets into high-impact metrics."),
        ("ReportLab PDF & CSV Pipelines", "Automated Institutional Dossiers", "Generates high-resolution recruiter-ready student profile PDFs on demand using ReportLab, alongside streaming CSV data exports formatted for NAAC accreditation, NIRF ranking audits, and recruiter sharing.")
    ]

    for i, (title, sub, desc) in enumerate(coach_features):
        x = Inches(0.8 + i * 3.95)
        y = Inches(1.55)
        b = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(5.15))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR
        b.line.width = Pt(1.2)

        tb = s9.shapes.add_textbox(x + Inches(0.25), y + Inches(0.25), Inches(3.25), Inches(4.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p_sub = tf.paragraphs[0]
        p_sub.text = sub.upper()
        p_sub.font.size = Pt(10)
        p_sub.font.bold = True
        p_sub.font.color.rgb = PURPLE_ACCENT

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = TEXT_WHITE

    # -------------------------------------------------------------
    # SLIDE 10: Performance Benchmarks & Future Roadmap
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(s10)
    add_header(s10, "Production Benchmarks, Roadmap & Open Q&A", "VERIFICATION & FUTURE VISION", 10)

    # Top Benchmarks Grid
    bench_data = [
        ("972 Student Records", "Verified across 9 Engineering disciplines"),
        ("88.2% Test Accuracy", "Random Forest Classifier (120 Estimators)"),
        ("Sub-15ms Query Latency", "SQLite Write-Ahead Logging (WAL) Mode"),
        ("16/16 Audits Passed", "Strict IDOR 403 Forbidden Security Verification"),
        ("100% Strict Type Safety", "Zero TypeScript compilation warnings (tsc --noEmit)"),
        ("Production Deployed", "Live on Vercel Edge SPA & Render Cloud API")
    ]

    for i, (metric, detail) in enumerate(bench_data):
        row = i // 3
        col = i % 3
        x = Inches(0.8 + col * 3.95)
        y = Inches(1.55 + row * 1.5)

        b = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, Inches(3.75), Inches(1.35))
        b.fill.solid()
        b.fill.fore_color.rgb = CARD_BG
        b.line.color.rgb = BORDER_COLOR

        tb = s10.shapes.add_textbox(x + Inches(0.2), y + Inches(0.15), Inches(3.35), Inches(1.05))
        tf = tb.text_frame
        tf.word_wrap = True

        p_m = tf.paragraphs[0]
        p_m.text = f"✓ {metric}"
        p_m.font.size = Pt(14)
        p_m.font.bold = True
        p_m.font.color.rgb = CRIMSON_ACCENT

        p_d = tf.add_paragraph()
        p_d.text = detail
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED

    # Bottom Future Card
    bf = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.8), Inches(11.733), Inches(1.9))
    bf.fill.solid()
    bf.fill.fore_color.rgb = CARD_INNER
    bf.line.color.rgb = BORDER_COLOR

    tbf = s10.shapes.add_textbox(Inches(1.1), Inches(4.95), Inches(11.133), Inches(1.6))
    tff = tbf.text_frame
    tff.word_wrap = True

    p_rt = tff.paragraphs[0]
    p_rt.text = "FUTURE ROADMAP & FEDERATED SCALING:"
    p_rt.font.size = Pt(13)
    p_rt.font.bold = True
    p_rt.font.color.rgb = PURPLE_ACCENT

    p_r1 = tff.add_paragraph()
    p_r1.text = "• AI Voice Mock Interviews: Real-time speech cadence, audio sentiment, and DSA problem-solving analysis.\n• Continuous GitHub Scraping: Webhook pipeline tracking real-time code commits, PR merges, and LeetCode ratings.\n• Multi-Campus Federated Network: Benchmarking placement metrics across peer universities for national rankings."
    p_r1.font.size = Pt(11)
    p_r1.font.color.rgb = TEXT_WHITE

    p_close = tff.add_paragraph()
    p_close.text = "Lead Systems Architect: Dileep Bommali  |  Repository: https://github.com/dileepbommali16-ops/pathfinder"
    p_close.font.size = Pt(12)
    p_close.font.bold = True
    p_close.font.color.rgb = CRIMSON_ACCENT

    # Save to project root and Desktop
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    repo_path = os.path.join(repo_root, "Pathfinder_Presentation_Dileep_Bommali.pptx")
    desktop_path = os.path.expanduser(r"~\Desktop\Pathfinder_Presentation_Dileep_Bommali.pptx")

    prs.save(repo_path)
    try:
        prs.save(desktop_path)
        print(f"Presentation saved successfully to:\n1. {repo_path}\n2. {desktop_path}")
    except Exception as e:
        print(f"Error saving to desktop: {e}")

if __name__ == '__main__':
    create_deck()
