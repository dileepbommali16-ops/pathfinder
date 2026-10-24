"""
Pathfinder DAS Agent: Build Knowledge Scanner
Usage:
  From backend/: python -m agent.build_knowledge [frontend_dir] [backend_dir]
  From repo root: python -m backend.agent.build_knowledge [frontend_dir] [backend_dir]
Scans frontend routes, components, data-agent-id tags, and backend API routes to generate site_knowledge.json.
"""
import json
import pathlib
import re
import sys

# Locate frontend directory with sensible defaults
fe_candidate = None
if len(sys.argv) > 1:
    fe_candidate = pathlib.Path(sys.argv[1])
else:
    for c in [
        pathlib.Path("client/src"),
        pathlib.Path("../client/src"),
        pathlib.Path("frontend/src"),
        pathlib.Path("../frontend/src"),
    ]:
        if c.exists() and c.is_dir():
            fe_candidate = c
            break

fe = fe_candidate if fe_candidate and fe_candidate.exists() else pathlib.Path("client/src")

# Locate backend directory
be_candidate = None
if len(sys.argv) > 2:
    be_candidate = pathlib.Path(sys.argv[2])
else:
    for c in [pathlib.Path("backend"), pathlib.Path(".")]:
        if (c / "agent").exists():
            be_candidate = c
            break

be = be_candidate if be_candidate and be_candidate.exists() else pathlib.Path(".")
out = pathlib.Path(__file__).parent / "site_knowledge.json"

jsx_text = re.compile(r">\s*([^<>{}\n][^<>{}]{14,}?)\s*<")
fields = re.compile(r"""(?:title|description|desc|name|label|summary|tagline)\s*[:=]\s*["'`]([^"'`\n]{10,})["'`]""")
route_re = re.compile(r"""path\s*[=:]\s*["'](/[^"']*)["']""")
api_re = re.compile(r"""@(?:router|app|agent_router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']""")

routes, pages = set(), {}
# Known fundamental Pathfinder routes
routes.update(["/", "/dashboard", "/resume-studio", "/cohort", "/roadmap", "/skills", "/agent"])

if fe.exists():
    for f in fe.rglob("*.ts*"):
        if "node_modules" in f.parts or "agent" in f.parts:
            continue
        try:
            src = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        routes.update(route_re.findall(src))
        texts = []
        for t in jsx_text.findall(src) + fields.findall(src):
            t = " ".join(t.split())
            if t not in texts and not t.startswith(("http", "import", "className")):
                texts.append(t)
        ids = re.findall(r'data-agent-id="([^"]+)"', src)
        if texts or ids:
            pages[str(f.relative_to(fe)).replace("\\", "/")] = {"text": texts[:25], "agent_ids": ids}

apis = []
if be.exists():
    for f in be.rglob("*.py"):
        if "agent" in f.parts or ".venv" in f.parts or "venv" in f.parts or "__pycache__" in f.parts:
            continue
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
            for m, p in api_re.findall(text):
                apis.append(f"{m.upper()} {p}")
        except Exception:
            continue

knowledge_payload = {
    "platform": "Pathfinder 2.0 AI Career & Placement Readiness Intelligence Platform",
    "creator": {
        "name": "Dileep Bommali (Dileep Das)",
        "role": "Full-Stack AI Engineer & Creator",
        "college": "NRI Institute of Technology (3rd year CSE-DS)",
        "family": "Bhavani (Mother), Ramana (Father), Priyanka (Sister)",
    },
    "routes": sorted(routes),
    "pages": pages,
    "backend_apis": sorted(set(apis)),
    "blueprints_count": 23,
    "core_features": [
        "ATS Resume Studio with 3-Layer Scoring (Lexical, Semantic, ATS Parsing)",
        "Random Forest Placement Probability Estimator with 23 domain-tailored blueprints",
        "Role Gap Radar & Skill Mastery Matrix",
        "12-Week Sprint Personalized Dynamic Career Roadmap",
        "Peer Cohort Benchmarking and Tier Percentiles",
        "Live 3D Cybernetic Voice Agent (Groq LLM + ElevenLabs TTS + Lip Sync)"
    ]
}

out.write_text(json.dumps(knowledge_payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Generated site_knowledge: routes={len(routes)} pages={len(pages)} apis={len(set(apis))} -> {out}")
