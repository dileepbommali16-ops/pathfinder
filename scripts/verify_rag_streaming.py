import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root))

print("[STEP 0] Starting test...", flush=True)

from backend.supabase_rag import (
    build_rag_corpus,
    compute_embedding_384,
    cosine_similarity,
    estimate_tokens,
    MAX_SYSTEM_PROMPT_TOKENS,
)

print("[STEP 1] Building corpus...", flush=True)
docs = build_rag_corpus(include_all_individual_records=True)
bps = [d for d in docs if d["doc_type"] == "blueprint"]
recs = [d for d in docs if d["doc_type"] == "placement_record"]
cohorts = [d for d in docs if d["doc_type"] == "placement_cohort"]

print(f"  - Blueprints: {len(bps)}", flush=True)
print(f"  - Individual Placement Records: {len(recs)}", flush=True)
print(f"  - Branch Cohorts: {len(cohorts)}", flush=True)

assert len(bps) >= 23, f"Expected at least 23 blueprints, found {len(bps)}"
assert len(recs) == 972, f"Expected 972 placement records, found {len(recs)}"

print("[STEP 2] Running direct sync search for top 3...", flush=True)
q_text = "distributed asynchronous redis task queue CSE"
q_emb = compute_embedding_384(q_text)
scored = []
for doc in docs:
    sim = cosine_similarity(q_emb, doc["embedding"])
    if "CSE" in doc.get("branch", ""):
        sim += 0.12
    scored.append((sim, doc))

scored.sort(key=lambda item: item[0], reverse=True)
top3 = scored[:3]

print(f"  - Top 3 matches for '{q_text}':", flush=True)
for i, (sim, doc) in enumerate(top3, 1):
    print(f"    {i}. [{doc['doc_type']}] {doc['title']} (sim: {sim:.4f})", flush=True)

assert len(top3) == 3, f"Expected 3 matches, got {len(top3)}"

print("[STEP 3] Testing prompt budget (< 2000 tokens)...", flush=True)
rag_lines = [f"{i}. {d['content']}" for i, (_, d) in enumerate(top3, 1)]
rag_block = "\n".join(rag_lines)

template_path = root / "backend" / "agent" / "das_ai_system.txt"
template = template_path.read_text(encoding="utf-8")
prompt = template.format(
    branch="CSE",
    cgpa=8.4,
    backlogs=0,
    coding=8,
    target_role="SDE",
    readiness="88%",
    active_tab="projects",
    rag_top_3=rag_block,
)
tokens = estimate_tokens(prompt)
print(f"  - Prompt length: {len(prompt)} chars", flush=True)
print(f"  - Estimated tokens: {tokens} (Max limit: {MAX_SYSTEM_PROMPT_TOKENS})", flush=True)
assert tokens < 2000, f"Token count {tokens} exceeds 2000 token cap!"
assert "Boss" in prompt, "Owner prompt must address Dileep as Boss"
assert "TOP 3 SEMANTIC RAG MATCHES" in prompt, "Must contain Top 3 semantic matches section"

print("\nVERDICT: PASS - All 23 Blueprints + 972 Placements indexed with Top 3 RAG & <2000 tokens verified!", flush=True)
