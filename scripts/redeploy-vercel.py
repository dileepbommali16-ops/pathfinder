import httpx, os, sys
from pathlib import Path

# Load token from backend/.env if not in os.environ
token = os.environ.get("VERCEL_TOKEN", "")
project_id = os.environ.get("VERCEL_PROJECT_ID", "prj_KBr9rU38CsaZEAn5roLvXcWP7kaT")
team_id = os.environ.get("VERCEL_ORG_ID", "team_dgBriWroAYW0CCr9mijNzrja")

if not token:
    env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("VERCEL_TOKEN="):
                token = line.split("=", 1)[1].strip()
            elif line.startswith("VERCEL_PROJECT_ID="):
                project_id = line.split("=", 1)[1].strip()
            elif line.startswith("VERCEL_ORG_ID="):
                team_id = line.split("=", 1)[1].strip()

if not token:
    print("Error: VERCEL_TOKEN not found in environment or backend/.env")
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("Triggering production redeploy for Pathfinder on Vercel...")
deps_url = f"https://api.vercel.com/v6/deployments?projectId={project_id}&teamId={team_id}&limit=1"
try:
    resp = httpx.get(deps_url, headers=headers, timeout=15.0)
    latest = resp.json().get('deployments', [])
    if latest:
        latest_id = latest[0]['uid']
        redeploy_url = f"https://api.vercel.com/v13/deployments?teamId={team_id}"
        re_resp = httpx.post(redeploy_url, headers=headers, json={"name": "pathfinder-client-fzom", "deploymentId": latest_id, "target": "production"}, timeout=30.0)
        if re_resp.status_code in [200, 201]:
            re_data = re_resp.json()
            print("Redeploy triggered successfully!")
            print(f"Deployment URL: https://{re_data.get('url')}")
            print(f"Inspect: https://vercel.com/dileepbommali16-ops/pathfinder-client-fzom/{re_data.get('id')}")
        else:
            print(f"Redeploy response: {re_resp.status_code} - {re_resp.text}")
    else:
        print(f"Error fetching deployments: {resp.status_code} - {resp.text}")
except Exception as e:
    print(f"Error triggering deployment: {e}")
