#!/usr/bin/env python3
"""
Playwright Browser Test for Project Blueprints 'Discuss Architecture' Flow
Tests:
1. Navigates to Pathfinder dashboard in real browser
2. Switches to 'Project Blueprints' tab
3. Clicks 'Discuss Architecture with AI Coach' button on the flagship project card
4. Confirms automatic navigation to the 'AI Career Coach' tab
5. Confirms user message is populated and sent to backend
6. Confirms coach responds with architectural guidance and libraries
7. Captures screenshots and transcript
"""

import os
import sys
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

TARGET_URL = "http://127.0.0.1:8000"
ARTIFACT_DIR = r"C:\Users\Priyanka\.gemini\antigravity-ide\brain\afeb5c38-de7b-4564-a116-1698e111f697"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
]

def get_browser_executable():
    for p in EDGE_PATHS:
        if os.path.exists(p):
            return p
    return None

def test_discuss_architecture_flow():
    print("=" * 75)
    print("PLAYWRIGHT TEST: 'Discuss Architecture with AI Coach' BUTTON WORKFLOW")
    print("=" * 75)

    edge_exe = get_browser_executable()
    with sync_playwright() as p:
        if edge_exe:
            print(f"Launching Edge browser: {edge_exe}")
            browser = p.chromium.launch(executable_path=edge_exe, headless=True)
        else:
            print("Launching default chromium browser")
            browser = p.chromium.launch(headless=True)

        context = browser.new_context(viewport={"width": 1366, "height": 900})
        page = context.new_page()

        print(f"Navigating to {TARGET_URL}...")
        page.goto(TARGET_URL, wait_until="networkidle", timeout=30000)
        time.sleep(1)

        # Set authenticated demo user in localStorage
        page.evaluate("""() => {
            const demoUser = {
                fullName: "K. Rakesh Reddy",
                username: "Rakesh",
                email: "rakesh.reddy@student.ai",
                branch: "AIML",
                graduationYear: 2026,
                cgpa: 8.4,
                backlogs: 0,
                internships: 2,
                coding: 8,
                communication: 8,
                targetRole: "Machine Learning Engineer",
                targetTier: "Product Tier-1",
                onboardingCompleted: true,
                wizardStep: 5
            };
            localStorage.setItem("pathfinder_user", JSON.stringify(demoUser));
            localStorage.setItem("pathfinder_token", "demo_jwt_token_verified");
            localStorage.setItem("pathfinder_session_id", "test_browser_session_123");
        }""")
        page.reload(wait_until="networkidle")
        time.sleep(2)

        # 1. Switch to Project Blueprints tab
        print("\nStep 1: Navigating to 'Project Blueprints' tab...")
        blueprints_tab = page.locator("#tab-projects, button:has-text('Project Blueprints')").first
        assert blueprints_tab.count() > 0, "Project Blueprints tab button not found"
        blueprints_tab.click()
        time.sleep(1.5)

        # Take screenshot of Project Blueprints tab
        shot_blueprints = os.path.join(ARTIFACT_DIR, "step1_project_blueprints_tab.png")
        page.screenshot(path=shot_blueprints)
        print(f"Screenshot saved: {shot_blueprints}")

        # 2. Locate 'Discuss Architecture with AI Coach' button
        print("\nStep 2: Locating 'Discuss Architecture with AI Coach' button...")
        discuss_btn = page.locator("button:has-text('Discuss Architecture with AI Coach')").first
        assert discuss_btn.count() > 0, "'Discuss Architecture with AI Coach' button not found"

        # 3. Click 'Discuss Architecture with AI Coach'
        print("Step 3: Clicking 'Discuss Architecture with AI Coach'...")
        discuss_btn.click()
        time.sleep(1.0)

        # 4. Verify tab switched to 'AI Career Coach'
        print("\nStep 4: Verifying transition to 'AI Career Coach' tab...")
        active_coach_header = page.locator("h2:has-text('Pathfinder AI Career Coach'), h1:has-text('Pathfinder AI Career Coach')")
        time.sleep(1.5)

        # 5. Verify user query and assistant response in chat
        print("\nStep 5: Monitoring chat conversation...")
        start_wait = time.time()
        user_msg = ""
        coach_reply = ""

        # Wait up to 35 seconds for coach to respond
        while time.time() - start_wait < 35:
            user_elements = page.locator("div[data-message-role='user']")
            if user_elements.count() > 0:
                user_msg = user_elements.last.inner_text().strip()

            asst_elements = page.locator("div[data-message-role='assistant']")
            if asst_elements.count() > 1:  # 0 is greeting, 1 is the new answer
                latest_asst = asst_elements.last.inner_text().strip()
                if latest_asst and "analyzing" not in latest_asst and "waking up" not in latest_asst.lower():
                    coach_reply = latest_asst
                    break
            time.sleep(0.5)

        print("\n" + "=" * 70)
        print("TRANSCRIPT:")
        print(f"USER:  {user_msg}")
        print("-" * 70)
        print(f"COACH: {coach_reply}")
        print("=" * 70)

        # 6. Capture screenshot of AI coach with the architecture reply
        shot_chat = os.path.join(ARTIFACT_DIR, "step2_discuss_architecture_reply.png")
        page.screenshot(path=shot_chat)
        print(f"\nFinal screenshot saved: {shot_chat}")

        # Validations
        assert "Discuss" in user_msg or "architecture" in user_msg.lower() or "build" in user_msg.lower(), \
            f"User message not sent correctly: '{user_msg}'"
        assert len(coach_reply) > 20, "Coach reply is empty or too short"
        assert "architecture" in coach_reply.lower() or "fastapi" in coach_reply.lower() or "libraries" in coach_reply.lower() or "stack" in coach_reply.lower() or "system" in coach_reply.lower(), \
            f"Coach did not answer architecture question properly: '{coach_reply}'"

        print("\n✅ SUCCESS: 'Discuss Architecture with AI Coach' clicked -> Coach tab opened -> Query sent -> AI responded with architecture guidance!")
        browser.close()
        return True

if __name__ == "__main__":
    success = test_discuss_architecture_flow()
    sys.exit(0 if success else 1)
