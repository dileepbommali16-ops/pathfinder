import sys
import json
import time
from playwright.sync_api import sync_playwright

def diagnose_live(target_url):
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("=" * 60)
    print(f"DIAGNOSING LIVE DEPLOYMENT: {target_url}")
    print("=" * 60)

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="msedge", headless=True)
        except Exception:
            try:
                browser = p.chromium.launch(channel="chrome", headless=True)
            except Exception:
                browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        console_logs = []
        network_requests = []
        network_responses = []

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[UNCAUGHT] {str(err)}"))

        page.on("request", lambda req: network_requests.append({
            "url": req.url,
            "method": req.method,
            "post_data": req.post_data
        }))

        page.on("response", lambda resp: network_responses.append({
            "url": resp.url,
            "status": resp.status,
            "status_text": resp.status_text
        }))

        print(f"Navigating to {target_url}...")
        try:
            page.goto(target_url, wait_until="networkidle", timeout=30000)
        except Exception as e:
            print(f"Navigation timeout/warning: {e}")
        page.wait_for_timeout(2000)

        # Print page title and current URL
        print(f"Page title: {page.title()}")
        print(f"Current URL: {page.url}")

        # Check if auth/login screen or onboarding screen is visible
        has_lamp = page.locator("#lampContainer, :text('Lamp Login'), :text('Sign In')").count() > 0
        has_onboarding = page.locator(":text('Candidate Onboarding'), :text('Onboarding')").count() > 0
        print(f"Has Login Screen: {has_lamp}, Has Onboarding: {has_onboarding}")

        # If on login screen, enter demo or sign in
        if has_lamp:
            print("Detected login screen, signing in as demo user...")
            # Try demo login
            demo_link = page.locator("a:has-text('Demo'), button:has-text('Demo'), text=Demo Account").first
            if demo_link.count() > 0:
                demo_link.click()
            else:
                user_input = page.locator("input[type='text'], input[placeholder*='name'], input[placeholder*='email']").first
                if user_input.count() > 0:
                    user_input.fill("Student Demo")
                submit_btn = page.locator("button[type='submit'], button:has-text('Sign In'), button:has-text('Continue')").first
                if submit_btn.count() > 0:
                    submit_btn.click()
            page.wait_for_timeout(2000)

        # Check Action tab
        print("\nChecking Action Center...")
        action_tab = page.locator("#tab-action, button:has-text('AI Action'), button:has-text('Action')").first
        if action_tab.count() > 0:
            print("Found Action tab, clicking...")
            action_tab.click()
            page.wait_for_timeout(1000)

        # Locate button
        btn = page.locator("#btn-action-calculate, button:has-text('Analyze Career Readiness')").first
        print(f"Button count: {btn.count()}")

        if btn.count() == 0:
            print("❌ Button not found! Dumping page text:")
            print(page.locator("body").text_content()[:500])
            page.screenshot(path="scratch_live_nobtn.png")
            browser.close()
            return

        box = btn.bounding_box()
        print(f"Button bounding box: {box}")

        if box:
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            top_element = page.evaluate("""([x, y]) => {
                const el = document.elementFromPoint(x, y);
                return el ? {
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    textContent: el.textContent ? el.textContent.slice(0, 40) : ''
                } : null;
            }""", [center_x, center_y])
            print(f"Element at point ({center_x}, {center_y}): {json.dumps(top_element, indent=2)}")

        # Clear logs before clicking
        network_requests.clear()
        network_responses.clear()
        console_logs.clear()

        print("\n⚡ Clicking '#btn-action-calculate'...")
        btn.click()

        # Monitor for 6 seconds
        for i in range(6):
            page.wait_for_timeout(1000)
            btn_props = page.evaluate("""() => {
                const b = document.querySelector('#btn-action-calculate') || document.querySelector('button:has-text("Analyze Career Readiness")');
                return b ? { disabled: b.disabled, text: b.innerText } : null;
            }""")
            modal_visible = page.locator("text=Career Readiness Intelligence Audit").count() > 0
            empty_modal = page.locator("text=Profile Incomplete").count() > 0
            cold_start_banner = page.locator("text=Waking up the server").count() > 0
            error_banner = page.locator("text=Retry").count() > 0
            print(f"[{i+1}s] Button text: {btn_props['text'] if btn_props else 'N/A'}, disabled: {btn_props['disabled'] if btn_props else 'N/A'}")
            print(f"     Modal: {modal_visible}, Incomplete: {empty_modal}, ColdStart: {cold_start_banner}, Error: {error_banner}")

        print("\n--- NETWORK REQUESTS ---")
        for req in network_requests:
            print(f"Req: {req['method']} {req['url']}")

        print("\n--- NETWORK RESPONSES ---")
        for resp in network_responses:
            print(f"Resp: {resp['status']} {resp['status_text']} <- {resp['url']}")

        print("\n--- CONSOLE LOGS ---")
        for log in console_logs:
            print(log)

        page.screenshot(path="scratch_live_after_click.png")
        print("\nSaved screenshot to scratch_live_after_click.png")
        browser.close()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://pathfinder-client.vercel.app/?demo=1"
    diagnose_live(url)
