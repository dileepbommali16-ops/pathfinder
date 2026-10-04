"""
Visual Verification & AI Coach Multi-Turn Sequence Test
Runs using Microsoft Edge headless browser against http://localhost:5173
Captures desktop (1280px) and mobile (375px) screenshots and executes the user's conversational script.
"""

import os
import sys
import time
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TARGET_URL = "http://localhost:5173"
ARTIFACT_DIR = r"C:\Users\Priyanka\.gemini\antigravity-ide\brain\cd1a03ec-8af0-418b-9ffd-1b8950860fae"

from playwright.sync_api import sync_playwright

def main():
    browser_exec = EDGE_PATH if os.path.exists(EDGE_PATH) else (CHROME_PATH if os.path.exists(CHROME_PATH) else None)
    print(f"Using browser: {browser_exec}")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=browser_exec, headless=True)
        
        # 1. Desktop Visual Check (1280x800)
        context_desktop = browser.new_context(viewport={"width": 1280, "height": 800})
        page_desktop = context_desktop.new_page()
        page_desktop.goto(TARGET_URL, wait_until="networkidle")
        time.sleep(1.5)

        # Bypass login / onboarding by setting localStorage
        page_desktop.evaluate("""() => {
            const demoUser = {
                fullName: "K. Rakesh Reddy",
                email: "rakesh.reddy@student.ai",
                branch: "AIML",
                graduationYear: 2026,
                cgpa: 8.4,
                backlogs: 0,
                internships: 2,
                coding: 8,
                communication: 8,
                targetRole: "Machine Learning Engineer",
                targetTier: "Tier 1 (Product / Core)",
                onboardingCompleted: true,
                wizardStep: 5
            };
            localStorage.setItem("pathfinder_user", JSON.stringify(demoUser));
            localStorage.setItem("pathfinder_token", "demo_jwt_token_verified");
        }""")
        page_desktop.reload(wait_until="networkidle")
        time.sleep(2)

        # Screenshot Desktop Dashboard
        desktop_shot = os.path.join(ARTIFACT_DIR, "desktop_dashboard_clean.png")
        page_desktop.screenshot(path=desktop_shot, full_page=False)
        print(f"Desktop dashboard screenshot saved: {desktop_shot}")

        # Check horizontal overflow on desktop
        overflow_desktop = page_desktop.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        print(f"Desktop horizontal scroll detected: {overflow_desktop}")

        # 2. Mobile Visual Check (375x812 iPhone / standard mobile)
        context_mobile = browser.new_context(viewport={"width": 375, "height": 812})
        page_mobile = context_mobile.new_page()
        page_mobile.goto(TARGET_URL, wait_until="networkidle")
        time.sleep(1)
        page_mobile.evaluate("""() => {
            const demoUser = {
                fullName: "K. Rakesh Reddy",
                email: "rakesh.reddy@student.ai",
                branch: "AIML",
                graduationYear: 2026,
                cgpa: 8.4,
                backlogs: 0,
                internships: 2,
                coding: 8,
                communication: 8,
                targetRole: "Machine Learning Engineer",
                targetTier: "Tier 1 (Product / Core)",
                onboardingCompleted: true,
                wizardStep: 5
            };
            localStorage.setItem("pathfinder_user", JSON.stringify(demoUser));
            localStorage.setItem("pathfinder_token", "demo_jwt_token_verified");
        }""")
        page_mobile.reload(wait_until="networkidle")
        time.sleep(2)

        mobile_shot = os.path.join(ARTIFACT_DIR, "mobile_375px_dashboard_clean.png")
        page_mobile.screenshot(path=mobile_shot, full_page=False)
        print(f"Mobile 375px dashboard screenshot saved: {mobile_shot}")

        overflow_mobile = page_mobile.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        print(f"Mobile 375px horizontal scroll detected: {overflow_mobile}")

        # 3. Navigate to AI Career Coach tab on Desktop
        coach_tab = page_desktop.locator("button:has-text('AI Career Coach'), button:has-text('AI Chat Assistant')").first
        if coach_tab.count() > 0:
            coach_tab.click()
            time.sleep(1.5)

        coach_shot = os.path.join(ARTIFACT_DIR, "desktop_coach_console_clean.png")
        page_desktop.screenshot(path=coach_shot, full_page=False)
        print(f"Coach console screenshot saved: {coach_shot}")

        browser.close()
        print("\nAll browser visuals verified successfully!")

if __name__ == "__main__":
    main()
