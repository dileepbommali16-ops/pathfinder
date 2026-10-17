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
        Falls back to high-fidelity localized knowledge base if Cognee is offline or empty.
        """
        if self.is_ready:
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
                res = await asyncio.wait_for(_run_search(), timeout=timeout_sec)
                if res.strip():
                    return res
            except asyncio.TimeoutError:
                logger.warning(f"[Cognee Brain] Search timed out (> {timeout_sec}s). Falling back to internal knowledge graph.")

        return self._search_fallback_knowledge(query)

    def _search_fallback_knowledge(self, query: str) -> str:
        """
        Grounding knowledge base for Pathfinder platform, slide decks, technical architecture,
        candidate profile (CSE branch), DSA roadmaps, mock interviews, and 23 project blueprints.
        """
        q = query.lower()
        matched_chunks = []

        # 1. Architecture & Slide Decks
        if any(w in q for w in ["slide", "architecture", "system", "pipeline", "diagram", "how does", "bottleneck", "cognee", "ollama", "three", "avatar", "render"]):
            matched_chunks.append(
                "PATHFINDER ARCHITECTURE & SLIDE DECK SPECIFICATION:\n"
                "- 3-Tier Multi-Modal Real-Time Architecture:\n"
                "  1. Perception Layer: Client-side Web Speech STT, floating chat HUD, and real-time WebAudio AnalyserNode with low-latency FFT frequency analysis (<50ms).\n"
                "  2. Reasoning & Graph RAG Layer: FastAPI WebSocket router (/ws/das-agent) connected to Cognee Brain Graph RAG vector/entity graph store + Ollama streaming inference with Senior Tech Lead persona.\n"
                "  3. Embodied Multi-Modal Synthesis: Sub-100ms streaming TTS sentence chunking with Edge-TTS, driving a Three.js 3D cybernetic human face (split cyan wireframe grid on left, glossy metallic blue on right) with procedural eye blinking (3-5s), continuous skeletal micro-sway, and lip-sync."
            )

        # 2. Candidate Profile & CSE Branch Context
        if any(w in q for w in ["profile", "candidate", "cse", "branch", "alice", "student", "college", "cgpa", "tier", "eligibility"]):
            matched_chunks.append(
                "CANDIDATE PROFILE DATA (CSE BRANCH CONTEXT):\n"
                "- Name: Alice Wonderland | Branch: Computer Science & Engineering (CSE) | Class: 2026.\n"
                "- Academic Metrics: CGPA 7.8/10.0, Zero Backlogs, High placement eligibility (100% cutoff clearance for Tier-1/Tier-2).\n"
                "- Technical Strengths: Data Structures & Algorithms (Rating 7/10), Full-Stack Systems (Rating 7/10), 3 Production Projects.\n"
                "- Target Goals: Software Development Engineer (SDE) at Tier-1 Product Companies (Microsoft, Amazon, Google, Atlassian).\n"
                "- Recommended Focus: System design scalability drills, advanced Dynamic Programming, and STAR method behavioral mock interviews."
            )

        # 3. DSA Roadmap & Placement Preparation
        if any(w in q for w in ["dsa", "roadmap", "algorithm", "data structure", "leetcode", "prep", "interview", "mock"]):
            matched_chunks.append(
                "DSA ROADMAP & MOCK INTERVIEW FRAMEWORK:\n"
                "- 6-Week Structured Mastery:\n"
                "  * Week 1: Arrays, Two Pointers, Sliding Window, Prefix Sums.\n"
                "  * Week 2: Linked Lists, Stacks, Queues, Monotonic Stack problems.\n"
                "  * Week 3: Trees, Binary Search Trees, BFS/DFS tree traversals, Tries.\n"
                "  * Week 4: Heaps & Priority Queues, Graph Algorithms (BFS/DFS, Dijkstra, Topological Sort).\n"
                "  * Week 5: Dynamic Programming (0/1 Knapsack, Longest Common Subsequence, Interval DP).\n"
                "  * Week 6: Low-Level Object Oriented Design & System Design essentials (Caching, Sharding, Load Balancing).\n"
                "- Mock Interview Simulator: Voice-driven behavioral and coding evaluation evaluating logic, edge cases, and communication."
            )

        # 4. Project Blueprints
        if any(w in q for w in ["project", "blueprint", "portfolio", "build", "resume"]):
            matched_chunks.append(
                "PATHFINDER 23 PROJECT BLUEPRINTS:\n"
                "- Tier-1 Portfolio Blueprints across Distributed Systems, AI/ML, Cloud & DevOps:\n"
                "  * High-Throughput Distributed Cache with LRU eviction and consistent hashing.\n"
                "  * Real-Time Collaborative Document Editor using Operational Transformation & WebSockets.\n"
                "  * Enterprise RAG Knowledge Search Engine using Hybrid Vector & Graph embeddings.\n"
                "  * Microservices API Gateway with sliding-window rate limiting, circuit breaker, and JWT auth.\n"
                "  * Real-time Multi-Modal Voice Agent with WebGL 3D avatar rendering and audio-reactive phoneme sync."
            )

        if not matched_chunks:
            matched_chunks.append(
                "PATHFINDER SYSTEM OVERVIEW:\n"
                "Pathfinder is a comprehensive career intelligence and placement readiness platform featuring real-time AI mentoring, ML placement probability scoring across 972 cohort records, 23 production project blueprints, and the DAS 3D AI Voice Agent."
            )

        return "\n\n".join(matched_chunks)

# Singleton instance
cognee_brain = CogneeBrain()
