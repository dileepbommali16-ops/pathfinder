import os
import json
from pathlib import Path


class KnowledgeLoader:
    def __init__(self):
        self.cache = {}
        self.loadKnowledge()

    def loadKnowledge(self):
        knowledge_dir = Path(__file__).resolve().parent / "knowledge"
        try:
            if not knowledge_dir.exists():
                print("[KnowledgeLoader] Directory not found, skipping cache.")
                return

            for file in os.listdir(knowledge_dir):
                if file.endswith('.md') or file.endswith('.json'):
                    file_path = knowledge_dir / file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.cache[file] = content
                    self.cache[Path(file).stem] = content
                    print(f"[KnowledgeLoader] Cached: {file}")
        except Exception as error:
            print(f"[KnowledgeLoader] Error loading files: {error}")

    def getKnowledge(self, fileName):
        if not self.cache:
            self.loadKnowledge()
        return self.cache.get(fileName) or self.cache.get(f"{fileName}.md") or self.cache.get(f"{fileName}.json")

    def getAllKnowledge(self):
        if not self.cache:
            self.loadKnowledge()
        seen = []
        for k, v in self.cache.items():
            if k.endswith(('.md', '.json')) and v not in seen:
                seen.append(v)
        return '\n\n--- FILE BREAK ---\n\n'.join(seen if seen else list(self.cache.values()))


# Instance export matching module.exports = new KnowledgeLoader()
knowledge_loader = KnowledgeLoader()
_cached_knowledge = knowledge_loader.cache


# Backward-compatible helper functions for existing callers
def load_knowledge():
    knowledge_loader.loadKnowledge()


def get_knowledge_document(doc_name: str):
    return knowledge_loader.getKnowledge(doc_name)


def get_knowledge_index():
    return "PATHFINDER KNOWLEDGE INDEX"


def get_site_map():
    content = knowledge_loader.getKnowledge("site_map.json")
    if content:
        try:
            return json.loads(content)
        except Exception:
            pass
    return {}


def get_page_info(page_id: str):
    sitemap = get_site_map()
    for p in sitemap.get("pages", []):
        if p.get("id") == page_id or p.get("tab") == page_id:
            return p
    for r in sitemap.get("routes", []):
        if r.get("id") == page_id or r.get("path") == page_id or r.get("path") == f"/{page_id}":
            return r
    return None


def get_contextual_knowledge_prompt(active_tab: str = "overview"):
    doc = knowledge_loader.getKnowledge(active_tab) or ""
    trimmed = doc[:2500] if len(doc) > 2500 else doc
    return f"--- ACTIVE PAGE CONTEXT ({active_tab.upper()}) ---\n{trimmed}\n"