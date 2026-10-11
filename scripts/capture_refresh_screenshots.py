import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACT_DIR = Path("C:/Users/Priyanka/.gemini/antigravity-ide/brain/fe66e7ae-aed7-48e5-972e-2338c9ce2a2b")
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

def capture_all():
    print("[Playwright] Starting screenshot capture suite...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="C:/Program Files/Google/Chrome/Application/chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5
        )
        page = context.new_page()

        # 1. Lamp Login Page (Untouched)
        print("[Playwright] Capturing Lamp Login...")
        page.goto("http://localhost:5173/", wait_until="networkidle")
        time.sleep(2)
        lamp_path = SCREENSHOT_DIR / "01_lamp_login_untouched.png"
        page.screenshot(path=str(lamp_path))
        print(f"  -> Saved {lamp_path}")

        # 2. Open Authenticated Dashboard (?demo=1)
        print("[Playwright] Navigating to Dashboard (?demo=1)...")
        page.goto("http://localhost:5173/?demo=1", wait_until="networkidle")
        time.sleep(2)

        # 3. Test & Capture Background Switcher States
        print("[Playwright] Testing Background Switcher: Predictive Arc, Hybrid Mix, Void Field...")
        # Bottom-right switcher options
        bg_buttons = page.locator("button:has-text('Predictive Arc'), button:has-text('Hybrid Mix'), button:has-text('Void Field')")
        print(f"  -> Found {bg_buttons.count()} background switcher buttons")

        # A: Predictive Arc
        try:
            page.locator("button:has-text('Predictive Arc')").click()
            time.sleep(1.5)
            arc_path = SCREENSHOT_DIR / "bg_predictive_arc.png"
            page.screenshot(path=str(arc_path))
            print(f"  -> Saved {arc_path}")
        except Exception as e:
            print(f"  -> Error clicking Predictive Arc: {e}")

        # B: Hybrid Mix
        try:
            page.locator("button:has-text('Hybrid Mix')").click()
            time.sleep(1.5)
            hybrid_path = SCREENSHOT_DIR / "bg_hybrid_mix.png"
            page.screenshot(path=str(hybrid_path))
            print(f"  -> Saved {hybrid_path}")
        except Exception as e:
            print(f"  -> Error clicking Hybrid Mix: {e}")

        # C: Void Field
        try:
            page.locator("button:has-text('Void Field')").click()
            time.sleep(1.5)
            void_path = SCREENSHOT_DIR / "bg_void_field.png"
            page.screenshot(path=str(void_path))
            print(f"  -> Saved {void_path}")
        except Exception as e:
            print(f"  -> Error clicking Void Field: {e}")

        # 4. Major Screen Tabs
        # Reset background to Hybrid Mix for crisp screen captures
        try:
            page.locator("button:has-text('Hybrid Mix')").click()
            time.sleep(0.5)
        except Exception:
            pass

        # Overview / Dashboard
        print("[Playwright] Capturing Tab: Overview / Dashboard...")
        overview_path = SCREENSHOT_DIR / "02_screen_dashboard_overview.png"
        page.screenshot(path=str(overview_path))
        print(f"  -> Saved {overview_path}")

        tabs = [
            ("6-Week Roadmap", "03_screen_roadmap.png"),
            ("AI Career Coach", "04_screen_ai_coach.png"),
            ("Cohort Analytics", "05_screen_cohort_analytics.png"),
            ("Project Blueprints", "06_screen_projects.png"),
            ("ATS Resume Studio", "07_screen_resume_studio.png"),
            ("Branches and Courses", "08_screen_branches.png"),
            ("Project Defense", "09_screen_defense_simulator.png"),
            ("Profile / Settings", "10_screen_profile_settings.png"),
        ]

        for tab_name, filename in tabs:
            print(f"[Playwright] Navigating to Tab: {tab_name}...")
            try:
                # Find tab button inside navigation header
                tab_btn = page.locator(f"button:has-text('{tab_name}')").first
                if tab_btn.is_visible():
                    tab_btn.click()
                    time.sleep(1.5)
                    tab_path = SCREENSHOT_DIR / filename
                    page.screenshot(path=str(tab_path))
                    print(f"  -> Saved {tab_path}")
                else:
                    print(f"  -> Tab button '{tab_name}' not visible, searching...")
            except Exception as ex:
                print(f"  -> Could not capture tab '{tab_name}': {ex}")

        # Also copy all captured files to the artifacts directory so markdown links embed them
        for f in SCREENSHOT_DIR.glob("*.png"):
            dest = ARTIFACT_DIR / f.name
            dest.write_bytes(f.read_bytes())

        browser.close()
    print("[Playwright] Screenshot capture complete! All files saved to docs/screenshots and artifact dir.")

if __name__ == "__main__":
    capture_all()
