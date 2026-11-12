"""
Pathfinder Vercel Deployment Storage Cleaner
Purges accumulated historical deployment snapshots on Vercel while preserving
the active production release.
"""
import os
import urllib.request
import urllib.error
import json
import time

TOKEN = os.getenv("VERCEL_TOKEN")
if not TOKEN:
    try:
        auth_file = os.path.expanduser("~/.vercel/auth.json")
        if os.path.exists(auth_file):
            TOKEN = json.load(open(auth_file)).get("token")
    except Exception:
        pass
TEAM_ID = "team_dgBriWroAYW0CCr9mijNzrja"
PROJECT_ID = "prj_KBr9rU38CsaZEAn5roLvXcWP7kaT"
KEEP_DEPLOYMENTS = {
    "dpl_Ctf2GX1xdRtRUQmpKRNPCrbCuZAY", # Latest active production build
    "dpl_6hmk7vTRUdpJgGeBWKLAAWXKdiCy", # Immediate rollback safety
}

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
}

def fetch_all_deployments():
    all_deps = []
    until = None
    
    print("Collecting deployment catalog from Vercel...")
    while True:
        url = f"https://api.vercel.com/v6/deployments?projectId={PROJECT_ID}&teamId={TEAM_ID}&limit=100"
        if until:
            url += f"&until={until}"
            
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"Error fetching deployments: {e}")
            break
            
        deps = data.get("deployments", [])
        if not deps:
            break
            
        for d in deps:
            all_deps.append(d)
            
        pagination = data.get("pagination", {})
        next_val = pagination.get("next")
        if not next_val or len(deps) < 100:
            break
        until = next_val

    print(f"Found {len(all_deps)} total deployments recorded on Vercel.")
    return all_deps

def purge_old_deployments(deps):
    candidates = [d for d in deps if d.get("uid") not in KEEP_DEPLOYMENTS]
    print(f"Identified {len(candidates)} historical deployments eligible for purging.")
    
    deleted = 0
    errors = 0
    
    for i, d in enumerate(candidates, 1):
        uid = d.get("uid")
        url = f"https://api.vercel.com/v13/deployments/{uid}?teamId={TEAM_ID}"
        req = urllib.request.Request(url, headers=HEADERS, method="DELETE")
        
        success = False
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req) as resp:
                    deleted += 1
                    success = True
                    break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    time.sleep(1.5)
                    continue
                elif e.code == 404:
                    # Already deleted
                    success = True
                    break
                else:
                    errors += 1
                    break
            except Exception:
                errors += 1
                break
                
        if i % 15 == 0 or i == len(candidates):
            print(f"Progress: [{i}/{len(candidates)}] Purged: {deleted} | Skipped/Failed: {errors}")
            
        time.sleep(0.08) # Gentle throttling to stay within Vercel rate limits

    print(f"\nCompleted cleanup! Successfully purged {deleted} deployment snapshots.")
    print("Vercel deployment storage quota reclaimed.")

if __name__ == "__main__":
    deployments = fetch_all_deployments()
    purge_old_deployments(deployments)

