"""
Pathfinder DAS Agent: Cognee Brain & Graph RAG Engine
Handles ingestion of slides, technical architecture diagrams, system flows,
and entity-relationship extraction for contextual tech lead explanations.
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("das.cognee")

class CogneeBrain:
    def __init__(self, dataset_name: str = "pathfinder_architecture"):
        self.dataset_name = dataset_name
        self.is_ready = False
        self._check_installation()

    def _check_installation(self):
        try:
            import cognee  # type: ignore
            self.is_ready = True
            logger.info("[Cognee Brain] Cognee framework successfully detected.")
        except ImportError:
            self.is_ready = False
            logger.warning("[Cognee Brain] 'cognee' library not installed. Operating in high-speed fallback mode.")

    async def ingest_project_assets(self, assets_directory: str):
        """
        Ingests slide decks, markdown flows, architecture specs, and blueprints into Cognee Graph.
        """
        if not self.is_ready:
            logger.warning("[Cognee Brain] Ingestion skipped: Cognee not available.")
            return

        import cognee  # type: ignore

        dir_path = Path(assets_directory)
        if not dir_path.exists():
            logger.error(f"[Cognee Brain] Directory {assets_directory} does not exist.")
            return

        supported_exts = {".md", ".txt", ".json", ".pdf"}
        files_to_add = [str(p) for p in dir_path.glob("**/*") if p.suffix.lower() in supported_exts]

        logger.info(f"[Cognee Brain] Ingesting {len(files_to_add)} technical documents...")
        for file_path in files_to_add:
            try:
                await cognee.add(file_path, dataset_name=self.dataset_name)
            except Exception as e:
                logger.error(f"[Cognee Brain] Failed to add file {file_path}: {e}")

        # Cognify step: Extracts entities, relationships, summaries, and graph topology
        logger.info("[Cognee Brain] Running cognify pipeline (Entity Graph & Semantic Indexing)...")
        try:
            await cognee.cognify(datasets=[self.dataset_name])
            logger.info("[Cognee Brain] Cognify pipeline completed successfully.")
        except Exception as e:
            logger.error(f"[Cognee Brain] Cognify failed: {e}")

    async def search_graph_context(self, query: str, top_k: int = 3, timeout_sec: float = 1.8) -> str:
        """
        Graph RAG retrieval: extracts relevant nodes, relationships, and context
        to help DAS explain complex architecture in step-by-step terms.
        """
        if not self.is_ready:
            return ""

        import cognee  # type: ignore

        async def _run_search():
            try:
                results = await cognee.search(
                    query_text=query,
                    dataset_name=self.dataset_name
                )
                if not results:
                    return ""

                context_parts = []
                for item in results[:top_k]:
                    if isinstance(item, dict):
                        text = item.get("text") or item.get("summary") or str(item)
                        context_parts.append(text)
                    else:
                        context_parts.append(str(item))

                return "\n".join(context_parts)
            except Exception as e:
                logger.warning(f"[Cognee Brain] Search failed: {e}")
                return ""

        try:
            return await asyncio.wait_for(_run_search(), timeout=timeout_sec)
        except asyncio.TimeoutError:
            logger.warning(f"[Cognee Brain] Search timed out (> {timeout_sec}s). Continuing without graph augmentation.")
            return ""

# Singleton instance
cognee_brain = CogneeBrain()
