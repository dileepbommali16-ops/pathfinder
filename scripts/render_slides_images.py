import asyncio
import os
from playwright.async_api import async_playwright

SLIDES_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000;
      color: #F8FAFC;
      font-family: 'Outfit', sans-serif;
    }
    .slide {
      width: 1280px;
      height: 720px;
      position: relative;
      background: #09090E;
      background-image: 
        radial-gradient(ellipse 60% 40% at 90% 10%, rgba(255, 45, 85, 0.12), transparent 60%),
        radial-gradient(ellipse 60% 40% at 10% 90%, rgba(168, 85, 247, 0.08), transparent 60%);
      padding: 48px 64px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header-cat {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #FF2D55;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .header-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .slide-body {
      flex: 1;
      display: flex;
      margin-top: 32px;
      gap: 24px;
    }
    .card {
      background: rgba(18, 16, 24, 0.95);
      border: 1px solid rgba(48, 32, 50, 0.9);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .grid-2x2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 20px;
      width: 100%;
      height: 100%;
    }
    .grid-4col {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      width: 100%;
      height: 100%;
    }
    .grid-3col {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      width: 100%;
      height: 100%;
    }
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      width: 100%;
      height: 100%;
    }
    .card-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #A855F7;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .card-title {
      font-size: 20px;
      font-weight: 700;
      color: #FF2D55;
      margin-bottom: 10px;
      line-height: 1.25;
    }
    .card-desc {
      font-size: 14px;
      color: #A1A1AA;
      line-height: 1.5;
    }
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
      font-size: 12px;
      color: #71717A;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: Title -->
  <div class="slide" id="slide1" style="justify-content: center; align-items: center; text-align: center;">
    <div style="background: rgba(18, 16, 24, 0.95); border: 1.5px solid rgba(48, 32, 50, 0.9); border-radius: 24px; padding: 50px 70px; max-width: 1000px; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,45,85,0.15);">
      <div style="font-size: 52px; font-weight: 900; letter-spacing: -0.02em; color: #FF2D55; margin-bottom: 12px;">PATHFINDER 2.0</div>
      <div style="font-size: 22px; font-weight: 600; color: #FFFFFF; margin-bottom: 24px;">Predictive Placement Analytics & Autonomous AI Career Guidance Platform</div>
      <div style="width: 200px; height: 2px; background: linear-gradient(90deg, #A855F7, #FF2D55); margin: 0 auto 24px;"></div>
      <div style="font-size: 20px; font-weight: 700; color: #A855F7; margin-bottom: 12px;">Developer & Lead Engineer: Dileep Bommali</div>
      <div style="font-size: 14px; color: #A1A1AA; margin-bottom: 8px;">Stack: React 19 • TypeScript • FastAPI • Scikit-Learn • Google Gemini AI • ThreeUI WebGL</div>
      <div style="font-size: 13px; font-family: 'JetBrains Mono', monospace; color: #FF2D55;">https://github.com/dileepbommali16-ops/pathfinder</div>
    </div>
  </div>

  <!-- SLIDE 2: Problem Statement -->
  <div class="slide" id="slide2">
    <div>
      <div class="header-cat">PROBLEM STATEMENT</div>
      <div class="header-title">The Industry-Academia Placement Disconnect</div>
    </div>
    <div class="slide-body">
      <div class="grid-2x2">
        <div class="card">
          <div class="card-title">01. Lack of Early Forecasting</div>
          <div class="card-desc">Students realize placement readiness gaps in final semester when it is too late to pivot or bridge fundamentals.</div>
        </div>
        <div class="card">
          <div class="card-title">02. Ambiguous Benchmarks</div>
          <div class="card-desc">Job descriptions are noisy and vague; students struggle to decipher exact technical expectations and rubrics.</div>
        </div>
        <div class="card">
          <div class="card-title">03. Scalability Bottlenecks</div>
          <div class="card-desc">College placement cells cannot provide 24/7 personalized, one-on-one technical coaching to thousands of candidates.</div>
        </div>
        <div class="card">
          <div class="card-title">04. Unstructured Data</div>
          <div class="card-desc">Colleges rely solely on CGPA, completely ignoring competitive coding ranks, live hackathons, and soft-skill vectors.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 02</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 3: The Solution -->
  <div class="slide" id="slide3">
    <div>
      <div class="header-cat">THE SOLUTION</div>
      <div class="header-title">Data-Driven Career Acceleration System</div>
    </div>
    <div class="slide-body">
      <div class="grid-4col">
        <div class="card">
          <div class="card-num">PHASE 01</div>
          <div class="card-title">Predictive ML Engine</div>
          <div class="card-desc">Computes statistical placement probability, candidate tier, and risk factors in under 45ms.</div>
        </div>
        <div class="card">
          <div class="card-num">PHASE 02</div>
          <div class="card-title">Skill-Gap Radar</div>
          <div class="card-desc">Benchmarks candidate profile against live industry rubrics across 9 engineering disciplines.</div>
        </div>
        <div class="card">
          <div class="card-num">PHASE 03</div>
          <div class="card-title">Gemini AI Coach</div>
          <div class="card-desc">Generates custom week-by-week roadmaps and offers 24/7 technical mentorship in English & Telugu.</div>
        </div>
        <div class="card">
          <div class="card-num">PHASE 04</div>
          <div class="card-title">Placement Analytics</div>
          <div class="card-desc">Cohort segmentation, recruiter talent filters, and instant ATS PDF/CSV report exports.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 03</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 4: Architecture -->
  <div class="slide" id="slide4">
    <div>
      <div class="header-cat">SYSTEM DESIGN</div>
      <div class="header-title">Full-Stack Architecture & Data Flow</div>
    </div>
    <div class="slide-body">
      <div class="grid-3col">
        <div class="card">
          <div class="card-num">FRONTEND TIER</div>
          <div class="card-title">React 19 & TypeScript</div>
          <div class="card-desc">Vite 7 build system, Tailwind CSS, Framer Motion, 15 specialized modules, ThreeUI 3D WebGL background shaders.</div>
        </div>
        <div class="card">
          <div class="card-num">GATEWAY TIER</div>
          <div class="card-title">FastAPI & SQLite WAL</div>
          <div class="card-desc">High-throughput asynchronous Python gateway, SQLite in WAL mode with repository pattern, sub-15ms queries, JWT security.</div>
        </div>
        <div class="card">
          <div class="card-num">INTELLIGENCE TIER</div>
          <div class="card-title">Scikit-Learn & Gemini AI</div>
          <div class="card-desc">Calibrated Random Forest model (88% accuracy, 972 cohort records), Google Gemini 2.0 Flash bilingual AI Coach.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 04</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 5: ML Engine -->
  <div class="slide" id="slide5">
    <div>
      <div class="header-cat">ALGORITHM & MODEL</div>
      <div class="header-title">Quantitative ML Placement Prediction (972 Records)</div>
    </div>
    <div class="slide-body">
      <div class="grid-2col">
        <div class="card">
          <div class="card-title">Features & Input Vector</div>
          <ul style="list-style: none; margin-top: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: #E2E8F0;">
            <li>• <b style="color: #FF2D55;">Academic Standing:</b> CGPA, core credits, active backlogs</li>
            <li>• <b style="color: #FF2D55;">Industry Readiness:</b> Internships, live deployed projects</li>
            <li>• <b style="color: #FF2D55;">Algorithmic Aptitude:</b> LeetCode/DSA problem count & rank</li>
            <li>• <b style="color: #FF2D55;">Competitions:</b> Hackathon wins, certifications, GitHub repo</li>
            <li>• <b style="color: #FF2D55;">Soft Skills:</b> Interview rubric and viva defense scores</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-title" style="color: #A855F7;">Calibrated Random Forest Engine</div>
          <ul style="list-style: none; margin-top: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: #E2E8F0;">
            <li>• <b style="color: #A855F7;">972 Verified Records:</b> Historical records across 9 branches</li>
            <li>• <b style="color: #A855F7;">88% Accuracy:</b> 120 decision trees with calibrated probabilities</li>
            <li>• <b style="color: #A855F7;">Salary Tiering:</b> Categorizes candidates into 4 LPA compensation tiers</li>
            <li>• <b style="color: #A855F7;">Feature Importance:</b> Pinpoints exact weaknesses to address</li>
            <li>• <b style="color: #A855F7;">Sub-45ms Latency:</b> Instantaneous real-time inference</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 05</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 6: AI Coach -->
  <div class="slide" id="slide6">
    <div>
      <div class="header-cat">AI MENTORSHIP</div>
      <div class="header-title">Screen-Aware Bilingual Gemini AI Coach</div>
    </div>
    <div class="slide-body">
      <div class="grid-3col">
        <div class="card">
          <div class="card-num">LIVE UI CONTEXT</div>
          <div class="card-title">Screen-Aware Intelligence</div>
          <div class="card-desc">Dynamically reads active student metrics, selected branch, and readiness gauge percentage to coach with precision.</div>
        </div>
        <div class="card">
          <div class="card-num">BILINGUAL SUPPORT</div>
          <div class="card-title">English & Telugu Mentorship</div>
          <div class="card-desc">Offers explanations in English, Telugu script, and Roman Telugu to eliminate all regional communication barriers.</div>
        </div>
        <div class="card">
          <div class="card-num">CONVERSATIONAL MEMORY</div>
          <div class="card-title">Multi-Turn Follow-Ups</div>
          <div class="card-desc">Retains multi-turn dialogue context so candidates can ask deep follow-up questions on system design and viva prep.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 06</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 7: UI/UX Design -->
  <div class="slide" id="slide7">
    <div>
      <div class="header-cat">DESIGN & INTERACTION</div>
      <div class="header-title">Spatial UI & Immersive User Experience</div>
    </div>
    <div class="slide-body">
      <div class="grid-3col">
        <div class="card">
          <div class="card-num">ZERO-BLOCKAGE ACCESS</div>
          <div class="card-title">Interactive Lamp Login</div>
          <div class="card-desc">Tactile desk lamp with pull cord, multi-point controls, GPU particles, and 1-click Instant Guest Access.</div>
        </div>
        <div class="card">
          <div class="card-num">SOFTWARE & HARDWARE</div>
          <div class="card-title">23 Production Blueprints</div>
          <div class="card-desc">6 Flagship + 17 Smart India Hackathon architectures with pipelines, pitfalls, and viva defense Q&A.</div>
        </div>
        <div class="card">
          <div class="card-num">SPATIAL UI ARCHITECTURE</div>
          <div class="card-title">15 Specialized Modules</div>
          <div class="card-desc">Overview, Cohort Analytics, What-If Simulator, Resume Studio, Digital Twin, and 3D WebGL background shaders.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 07</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 8: Reports -->
  <div class="slide" id="slide8">
    <div>
      <div class="header-cat">REPORTS & EXPORTS</div>
      <div class="header-title">Institutional Intelligence & Automated Reporting</div>
    </div>
    <div class="slide-body">
      <div class="grid-3col">
        <div class="card">
          <div class="card-num">BATCH ANALYTICS</div>
          <div class="card-title">Cohort Explorer Heatmaps</div>
          <div class="card-desc">Empowers placement directors to filter batches by CGPA brackets, branch, and predicted placement tiers.</div>
        </div>
        <div class="card">
          <div class="card-num">REPORTLAB GENERATION</div>
          <div class="card-title">ATS-Optimized PDF Profiles</div>
          <div class="card-desc">Compiles student metrics, skill radars, and verification badges into professional, recruiter-ready PDF reports.</div>
        </div>
        <div class="card">
          <div class="card-num">INSTITUTIONAL EXPORTS</div>
          <div class="card-title">Batch CSV Data Pipeline</div>
          <div class="card-desc">One-click streaming export of student placement profiles for institutional accreditation and NAAC/NIRF reporting.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 08</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 9: Benchmarks -->
  <div class="slide" id="slide9">
    <div>
      <div class="header-cat">VERIFICATION</div>
      <div class="header-title">Performance Benchmarks & Quality Assurance</div>
    </div>
    <div class="slide-body">
      <div class="grid-2col">
        <div class="card">
          <div class="card-title">✓ 972 Verified Records</div>
          <div class="card-desc">Historical data across 9 Engineering disciplines calibrating accurate tier odds.</div>
          <div class="card-title" style="margin-top: 16px;">✓ 88% ML Accuracy</div>
          <div class="card-desc">Trained Random Forest Classifier with 120 estimators and feature scoring.</div>
          <div class="card-title" style="margin-top: 16px;">✓ 100% Strict Type Safety</div>
          <div class="card-desc">Zero TypeScript errors and complete schema validation across API.</div>
        </div>
        <div class="card">
          <div class="card-title" style="color: #A855F7;">✓ 16/16 Security Audits Passed</div>
          <div class="card-desc">IDOR 403 Forbidden defense, JWT token verification, and payload sanitization.</div>
          <div class="card-title" style="color: #A855F7; margin-top: 16px;">✓ Bilingual AI Coaching</div>
          <div class="card-desc">Fluent mentorship in English and Telugu script for all students.</div>
          <div class="card-title" style="color: #A855F7; margin-top: 16px;">✓ Live Cloud Production</div>
          <div class="card-desc">Deployed on Vercel Edge SPA and Render Cloud API with high availability.</div>
        </div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 09</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

  <!-- SLIDE 10: Conclusion -->
  <div class="slide" id="slide10">
    <div>
      <div class="header-cat">SUMMARY</div>
      <div class="header-title">Conclusion, Future Horizons & Q&A</div>
    </div>
    <div class="slide-body">
      <div class="card" style="width: 100%; justify-content: center; padding: 36px 48px;">
        <div class="card-title" style="font-size: 24px; margin-bottom: 16px;">Future Roadmap:</div>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 16px; color: #E2E8F0; margin-bottom: 24px;">
          <div>• <b style="color: #FF2D55;">AI Voice Mock Interviews:</b> Real-time speech and technical problem-solving analysis.</div>
          <div>• <b style="color: #FF2D55;">Automated Code Verification:</b> Direct GitHub & LeetCode API integration for continuous validation.</div>
          <div>• <b style="color: #FF2D55;">Multi-Campus Network:</b> Benchmarking placement metrics across peer universities.</div>
        </div>
        <div style="height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 20px;"></div>
        <div style="font-size: 26px; font-weight: 800; color: #A855F7; margin-bottom: 8px;">Thank you! Open for Questions & Discussion.</div>
        <div style="font-size: 14px; color: #A1A1AA;">Developer: Dileep Bommali | GitHub: https://github.com/dileepbommali16-ops/pathfinder</div>
      </div>
    </div>
    <div class="footer-bar">
      <span>Pathfinder 2.0 • Slide 10</span>
      <span>Lead Architect: Dileep Bommali</span>
    </div>
  </div>

</body>
</html>
"""

async def render():
    html_file = os.path.abspath("docs/slides_preview.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(SLIDES_HTML)
    
    art_dir = r"C:\Users\Priyanka\.gemini\antigravity-ide\brain\fe66e7ae-aed7-48e5-972e-2338c9ce2a2b"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge")
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto(f"file:///{html_file.replace(os.sep, '/')}")
        await page.wait_for_timeout(1000)

        for i in range(1, 11):
            slide_el = await page.query_selector(f"#slide{i}")
            if slide_el:
                out_path = os.path.join(art_dir, f"slide_{i:02d}.png")
                await slide_el.screenshot(path=out_path)
                print(f"Rendered slide {i:02d} -> {out_path}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(render())
