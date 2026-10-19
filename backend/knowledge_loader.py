"""
Pathfinder Knowledge Registry & Memory Manager (backend/knowledge_loader.py)
Reads all knowledge files in backend/knowledge/ once at startup, caches them in memory,
builds an index, and provides token-budget-aware topic injections and retrieval tools.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List

KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"

# In-memory cached files
_cached_knowledge: Dict[str, str] = {}
_cached_sitemap: Dict[str, Any] = {}
_knowledge_index: str = ""


def load_knowledge():
    """Loads all knowledge markdown files and site_map.json into memory once."""
    global _cached_knowledge, _cached_sitemap, _knowledge_index

    if _cached_knowledge:
        return

    if not KNOWLEDGE_DIR.exists():
        return

    # 1. Load Markdown files
    for md_file in KNOWLEDGE_DIR.glob("*.md"):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                _cached_knowledge[md_file.stem] = f.read()
        except Exception as e:
            print(f"[KnowledgeLoader] Warning: Failed to load {md_file.name}: {e}")

    # 2. Load site_map.json
    sitemap_path = KNOWLEDGE_DIR / "site_map.json"
    if sitemap_path.exists():
        try:
            with open(sitemap_path, "r", encoding="utf-8") as f:
                _cached_sitemap = json.load(f)
        except Exception as e:
            print(f"[KnowledgeLoader] Warning: Failed to load site_map.json: {e}")

    # 3. Build a compact Master Index for system prompts
    _knowledge_index = (
        "PATHFINDER KNOWLEDGE INDEX:\n"
        "- pathfinder_overview: Platform mission, real-world 80% placement gap, 30s and 2min pitches, audience.\n"
        "- pages_guide: Guide for all 13 tabs, Onboarding steps 1-5, LampLogin, modals, and AI Action Center.\n"
        "- ai_ml_explained: RandomForest (120 trees, 5 features, 88% accuracy), Gemini role, SSOT tools, fallback score.\n"
        "- data_disclosure: 972 cohort rows, 2,966 Kaggle rows, public vs enriched columns, predictive disclaimer.\n"
        "- project_building_guides: Standard teaching template + complete guides for CSE, AIML, ECE, MECH, and CYBER.\n"
        "- faq: 25 authoritative answers on accuracy, data, privacy, packages (up to 44.6 LPA), and tech stack.\n"
        "- glossary: Simple 2-tier school and college explanations of ML, Random Forest, LLM, tokens, API, ATS, etc.\n"
        "- site_map: Machine-readable JSON map with data-das-id selectors for autonomous navigation and highlighting.\n"
    )
    print(f"[KnowledgeLoader] Successfully loaded {len(_cached_knowledge)} knowledge documents and site map.")


# Auto-load on import
load_knowledge()


def get_knowledge_index() -> str:
    """Returns the compact index of all knowledge files."""
    if not _knowledge_index:
        load_knowledge()
    return _knowledge_index


def get_knowledge_document(doc_name: str) -> Optional[str]:
    """Retrieves a cached knowledge document by name (e.g. 'pathfinder_overview')."""
    if not _cached_knowledge:
        load_knowledge()
    return _cached_knowledge.get(doc_name)


def get_site_map() -> Dict[str, Any]:
    """Returns the loaded site_map.json dictionary."""
    if not _cached_sitemap:
        load_knowledge()
    return _cached_sitemap


def get_page_info(page_id: str) -> Optional[Dict[str, Any]]:
    """Looks up page and section details from site_map.json by page/tab id."""
    sitemap = get_site_map()
    pages = sitemap.get("pages", [])
    for p in pages:
        if p.get("id") == page_id or p.get("tab") == page_id:
            return p
    return None


def get_contextual_knowledge_prompt(active_tab: str = "overview") -> str:
    """
    Returns a token-budget-optimized prompt injection containing the Master Index
    plus the full relevant knowledge for the user's active page.
    """
    index = get_knowledge_index()

    # Map tabs to specific knowledge files
    tab_doc_map = {
        "overview": "pathfinder_overview",
        "action": "ai_ml_explained",
        "skills": "pages_guide",
        "projects": "project_building_guides",
        "analytics": "data_disclosure",
        "coach": "pathfinder_overview",
        "resume": "pages_guide",
        "branches": "data_disclosure",
        "defense": "project_building_guides",
        "roles": "pages_guide",
        "missions": "pages_guide",
        "interview": "faq",
        "profile": "pages_guide",
    }

    doc_key = tab_doc_map.get(active_tab, "pathfinder_overview")
    active_doc = get_knowledge_document(doc_key) or ""

    # Trim to 2,500 characters to stay strictly within fast token budget
    trimmed_doc = active_doc[:2500] if len(active_doc) > 2500 else active_doc

    return (
        f"{index}\n"
        f"--- ACTIVE PAGE CONTEXT ({active_tab.upper()}) ---\n"
        f"{trimmed_doc}\n"
    )
