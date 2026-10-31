import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = Path("docs/screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACT_DIR = Path("C:/Users/Priyanka/.gemini/antigravity/brain/68870287-658c-4835-8797-75a54231ccc2")

TARGET_URL = "https://pathfinder-client-fzom.vercel.app/?demo=1"

def run():
    print("[Playwright] Starting screenshot capture on live deployment...")
    chrome_path = "C:/Program Files/Google/Chrome/Application/chrome.exe"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path if os.path.exists(chrome_path) else None,
            headless=True,
            args=["--use-gl=angle", "--enable-webgl"]
        )
        
        # 1. Desktop 1440px - Dashboard Cards Shown
        ctx_desktop = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
        page_desk = ctx_desktop.new_page()
        print(f"[1/4] Navigating to {TARGET_URL} at 1440px...")
        page_desk.goto(TARGET_URL, wait_until="networkidle", timeout=60000)
        time.sleep(4)
        
        p1 = SCREENSHOT_DIR / "dashboard_1440_cards.png"
        page_desk.screenshot(path=str(p1))
        page_desk.screenshot(path=str(ARTIFACT_DIR / "dashboard_1440_cards.png"))
        print(f"  -> Saved {p1}")
        
        # 2. Desktop 1440px - Focus on DAS Mode
        print("[2/4] Clicking 'Focus on DAS'...")
        try:
            focus_btn = page_desk.locator("button:has-text('Focus on DAS')").first
            if focus_btn.is_visible():
                focus_btn.click()
                time.sleep(2)
            p2 = SCREENSHOT_DIR / "dashboard_1440_focus.png"
            page_desk.screenshot(path=str(p2))
            page_desk.screenshot(path=str(ARTIFACT_DIR / "dashboard_1440_focus.png"))
            print(f"  -> Saved {p2}")
        except Exception as e:
            print(f"  -> Error clicking focus: {e}")
            
        ctx_desktop.close()
        
        # 3. Mobile 375px - Dashboard Cards
        ctx_mobile = browser.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2.0)
        page_mob = ctx_mobile.new_page()
        print(f"[3/4] Navigating to {TARGET_URL} at 375px...")
        page_mob.goto(TARGET_URL, wait_until="networkidle", timeout=60000)
        time.sleep(4)
        
        p3 = SCREENSHOT_DIR / "dashboard_375_cards.png"
        page_mob.screenshot(path=str(p3))
        page_mob.screenshot(path=str(ARTIFACT_DIR / "dashboard_375_cards.png"))
        print(f"  -> Saved {p3}")
        
        # 4. Mobile 375px - Focus on DAS Mode
        print("[4/4] Mobile: Clicking 'Focus on DAS'...")
        try:
            mob_focus_btn = page_mob.locator("button:has-text('Focus on DAS')").first
            if mob_focus_btn.is_visible():
                mob_focus_btn.click()
                time.sleep(2)
            p4 = SCREENSHOT_DIR / "dashboard_375_focus.png"
            page_mob.screenshot(path=str(p4))
            page_mob.screenshot(path=str(ARTIFACT_DIR / "dashboard_375_focus.png"))
            print(f"  -> Saved {p4}")
        except Exception as e:
            print(f"  -> Error clicking mobile focus: {e}")
            
        ctx_mobile.close()
        browser.close()
        print("[Playwright] All screenshots captured successfully!")

if __name__ == "__main__":
    run()
