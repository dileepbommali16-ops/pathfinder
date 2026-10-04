import sys
import json
import time
import threading
from pathlib import Path
import uvicorn
from playwright.sync_api import sync_playwright

import subprocess

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

def diagnose():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass
    print("=" * 60)
    print("VERIFYING 'Analyze Career Readiness' IN REAL BROWSER")
    print("=" * 60)

    # Start server process if not already up
    import urllib.request
    server_running = False
    proc = None
    try:
        urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1)
        server_running = True
        print("Server already running on port 8000.")
    except Exception:
        pass

    if not server_running:
        print("Starting local server on http://127.0.0.1:8000...")
        proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.api:app", "--host", "127.0.0.1", "--port", "8000"], cwd=str(ROOT))
        for i in range(20):
            time.sleep(1)
            try:
                urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=1)
                server_running = True
                print(f"Server is ready after {i+1}s!")
                break
            except Exception:
                pass

    try:
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
                "headers": req.headers,
                "post_data": req.post_data
            }))

            page.on("response", lambda resp: network_responses.append({
                "url": resp.url,
                "status": resp.status,
                "status_text": resp.status_text
            }))

            url = "http://127.0.0.1:8000/?demo=1"
            print(f"Navigating to {url}...")
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(2000)

            # 1. Switch to Action Center tab if exists, or check overview
            print("\nChecking Action Center...")
            action_tab = page.locator("#tab-action, button:has-text('Action')").first
            if action_tab.count() > 0:
                print("Found Action tab, clicking...")
                action_tab.click()
                page.wait_for_timeout(1000)

            # 2. Locate the button
            btn = page.locator("#btn-action-calculate, button:has-text('Analyze Career Readiness')").first
            print(f"Button count: {btn.count()}")

            if btn.count() == 0:
                print("❌ Button not found!")
                print("Visible text on page:", page.locator("body").text_content()[:500])
                browser.close()
                return

            # 3. Check element from point and overlay
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

            # 4. Check button properties
            props = page.evaluate("""() => {
                const b = document.querySelector('#btn-action-calculate') || document.querySelector('button:has-text("Analyze Career Readiness")');
                if (!b) return null;
                return {
                    disabled: b.disabled,
                    ariaDisabled: b.getAttribute('aria-disabled'),
                    pointerEvents: window.getComputedStyle(b).pointerEvents,
                    opacity: window.getComputedStyle(b).opacity,
                    display: window.getComputedStyle(b).display,
                    visibility: window.getComputedStyle(b).visibility,
                    text: b.innerText
                };
            }""")
            print(f"Button computed properties: {json.dumps(props, indent=2)}")

            # Clear request logs before clicking
            network_requests.clear()
            network_responses.clear()
            console_logs.clear()

            # 5. Click the button!
            print("\n⚡ Clicking '#btn-action-calculate'...")
            btn.click()

            # Monitor for 4 seconds
            for i in range(4):
                page.wait_for_timeout(1000)
                modal_visible = page.locator("text=Career Readiness Intelligence Audit").count() > 0
                empty_modal = page.locator("text=Profile Incomplete").count() > 0
                print(f"[{i+1}s] Modal visible: {modal_visible}, Empty profile modal visible: {empty_modal}")
                if modal_visible or empty_modal:
                    break

            print("\n--- NETWORK REQUESTS TRIGGERED ---")
            for req in network_requests:
                if "calculate" in req["url"] or "predict" in req["url"] or "readiness" in req["url"] or "skill-gap" in req["url"]:
                    print(f"Request: {req['method']} {req['url']}")
                    print(f"Body: {req['post_data'][:200] if req['post_data'] else 'None'}")

            print("\n--- NETWORK RESPONSES RECEIVED ---")
            for resp in network_responses:
                if "calculate" in resp["url"] or "predict" in resp["url"] or "readiness" in resp["url"] or "skill-gap" in resp["url"]:
                    print(f"Response: {resp['status']} {resp['status_text']} <- {resp['url']}")

            print("\n--- CONSOLE LOGS ---")
            for log in console_logs:
                print(log)

            # Check modal contents if open
            modal = page.locator("text=Career Readiness Intelligence Audit").first
            if modal.count() > 0:
                print("\n✅ MODAL IS OPEN! Contents:")
                print(page.locator(".fixed.inset-0").last.text_content()[:500])
            else:
                print("\n❌ MODAL IS NOT OPEN!")

            page.screenshot(path="scratch_action_center.png")
            print("\nSaved screenshot to scratch_action_center.png")

            browser.close()
    finally:
        if proc:
            proc.terminate()
            proc.wait()

if __name__ == "__main__":
    diagnose()
