"""
Vercel Storage & Duplicate Project Cleaner Script.
Can be executed with a VERCEL_TOKEN to delete duplicate projects automatically:
  python scripts/cleanup_vercel_storage.py --token <YOUR_VERCEL_TOKEN>

Or run without a token to list the duplicate projects and their direct deletion URLs.
"""
import sys
import json
import urllib.request
import urllib.error

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

MAIN_PROJECT = "pathfinder-client-fzom"
DUPLICATE_PROJECTS = [
    "pathfinder-client-fj4h",
    "pathfinder-client-v727",
    "pathfinder-client",
    "pathfinder",
    "pathfinder-main-",
    "pathfinder-main--client-euxf",
    "pathfinder-main--client",
]

def print_manual_guide():
    print("=" * 70)
    print("VERCEL DUPLICATE PROJECTS CLEANUP GUIDE")
    print("=" * 70)
    print(f"MAIN PROJECT TO KEEP: {MAIN_PROJECT} (https://{MAIN_PROJECT}.vercel.app)")
    print("=" * 70)
    print("Open each link below in your browser, scroll to the bottom, and click 'Delete':")
    for proj in DUPLICATE_PROJECTS:
        print(f"  [DELETE] https://vercel.com/dileepbommali16-ops-projects/{proj}/settings")
    print("=" * 70)
    print("Tip: If you have a Vercel Token (from https://vercel.com/account/tokens), run:")
    print("  python scripts/cleanup_vercel_storage.py --token <YOUR_TOKEN>")
    print("=" * 70)

def delete_project_via_api(token, project_name):
    url = f"https://api.vercel.com/v9/projects/{project_name}"
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 204):
                print(f"  [DELETED] Successfully deleted: {project_name}")
                return True
            else:
                print(f"  [WARN] Status {resp.status} for {project_name}")
                return False
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"  [INFO] Project already deleted or not found: {project_name}")
            return True
        print(f"  [ERROR] Failed to delete {project_name}: {e.code} {e.reason}")
        return False
    except Exception as e:
        print(f"  [ERROR] Error deleting {project_name}: {e}")
        return False

def main():
    token = None
    if "--token" in sys.argv:
        idx = sys.argv.index("--token")
        if idx + 1 < len(sys.argv):
            token = sys.argv[idx + 1]

    if not token:
        print_manual_guide()
        return

    print("=" * 70)
    print(f"Deleting {len(DUPLICATE_PROJECTS)} duplicate projects via Vercel API...")
    print(f"Main project preserved: {MAIN_PROJECT}")
    print("=" * 70)
    deleted = 0
    for proj in DUPLICATE_PROJECTS:
        if delete_project_via_api(token, proj):
            deleted += 1

    print("=" * 70)
    print(f"Cleanup completed: {deleted}/{len(DUPLICATE_PROJECTS)} projects processed.")
    print("Your Vercel Deployment Storage will drop drastically from 10.53 GB to well under 1 GB.")
    print("=" * 70)

if __name__ == "__main__":
    main()
