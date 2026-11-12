"""
render_manager.py - Render Cloud Deployment & Health Manager for Pathfinder 2.0
Supports:
  - python scripts/render_manager.py status
  - python scripts/render_manager.py deploy [service_name]
  - python scripts/render_manager.py logs [service_name]
"""

import sys
import os
import json
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

# Load credentials from .env
root_dir = Path(__file__).resolve().parent.parent
load_dotenv(root_dir / ".env")
load_dotenv(root_dir / "backend" / ".env")

API_KEY = os.getenv("RENDER_API_KEY", "rnd_47djtbCDbayGp946L5sf7ON0hw5n").strip()
BASE_URL = "https://api.render.com/v1"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

def get_services():
    req = urllib.request.Request(f"{BASE_URL}/services", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return [item.get("service", {}) for item in data]
    except Exception as e:
        print(f"[Render API Error] Failed to list services: {e}")
        return []

def get_status():
    services = get_services()
    if not services:
        print("No services found or invalid API key.")
        return

    print("=" * 70)
    print("Render Cloud Services Status (Pathfinder 2.0)")
    print("=" * 70)
    for svc in services:
        name = svc.get("name")
        srv_id = svc.get("id")
        suspended = svc.get("suspended")
        url = svc.get("serviceDetails", {}).get("url", "N/A")
        
        # Fetch latest deploy
        dep_url = f"{BASE_URL}/services/{srv_id}/deploys?limit=1"
        dep_req = urllib.request.Request(dep_url, headers=HEADERS)
        deploy_status = "unknown"
        commit_id = ""
        commit_msg = ""
        try:
            with urllib.request.urlopen(dep_req, timeout=10) as d_resp:
                deploys = json.loads(d_resp.read().decode("utf-8"))
                if deploys:
                    d = deploys[0].get("deploy", {})
                    deploy_status = d.get("status", "unknown")
                    commit = d.get("commit", {}) or {}
                    commit_id = commit.get("id", "")[:7]
                    commit_msg = commit.get("message", "").replace("\n", " ")[:35]
        except Exception:
            pass

        print(f"Service: {name:<20} | ID: {srv_id}")
        print(f"  URL    : {url}")
        print(f"  Deploy : {deploy_status.upper()} (Commit {commit_id}: {commit_msg})")
        print(f"  State  : {'SUSPENDED' if suspended == 'suspended' else 'ACTIVE'}")
        print("-" * 70)

def trigger_deploy(target_name="pathfinder-backend"):
    services = get_services()
    matched = [s for s in services if s.get("name") == target_name or target_name in s.get("name")]
    if not matched:
        print(f"No service found matching '{target_name}'. Available:", [s.get("name") for s in services])
        return

    for svc in matched:
        srv_id = svc.get("id")
        name = svc.get("name")
        print(f"Triggering deploy for {name} ({srv_id})...")
        dep_url = f"{BASE_URL}/services/{srv_id}/deploys"
        req = urllib.request.Request(dep_url, data=json.dumps({}).encode("utf-8"), headers=HEADERS, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                deploy_id = data.get("deploy", {}).get("id") or data.get("id")
                print(f"Deployment triggered successfully! Deploy ID: {deploy_id}")
        except Exception as e:
            print(f"Deploy trigger failed: {e}")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        get_status()
    elif cmd == "deploy":
        tgt = sys.argv[2] if len(sys.argv) > 2 else "pathfinder-backend"
        trigger_deploy(tgt)
    else:
        print(f"Unknown command: {cmd}. Usage: python scripts/render_manager.py [status|deploy]")

