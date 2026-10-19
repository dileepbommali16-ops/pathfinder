"""
Pathfinder DAS Agent: Standalone Web Agent Application (main.py)
Pathfinder DAS Autonomous Core Pipeline:
- Strictly isolated to Pathfinder website context
- Web-native secure architecture with zero OS control dependencies
- 3D Cybernetic Blue Face Viewport with live idle breathing, eye blinking (3-5s), and Viseme lip-sync
- Gemini Live WebSocket integration with 'Puck' voice configuration
- Initial greeting: "Hi sir, I'm your Pathfinder AI agent, how can I help you?"
"""

import os
import sys
import io
import json
import re
import time
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

# Ensure UTF-8 on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Load Environment Variables (.env)
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.avatar import avatar_controller
from core.viseme import viseme_engine
from ui import ui_router, PATHFINDER_KNOWLEDGE_SUMMARY

# Initialize Application
app = FastAPI(
    title="Pathfinder DAS AI Voice Agent",
    description="Standalone Web-Dedicated 3D Cybernetic Voice Agent for Pathfinder Career Intelligence",
    version="2.0.0"
)

# Enable CORS for all local and deployed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Assets (/avatar for das_head.jpg texture and models)
public_avatar_dir = ROOT_DIR / "public" / "avatar"
client_avatar_dir = ROOT_DIR / "client" / "public" / "avatar"

if public_avatar_dir.exists():
    app.mount("/avatar", StaticFiles(directory=str(public_avatar_dir)), name="avatar")
elif client_avatar_dir.exists():
    app.mount("/avatar", StaticFiles(directory=str(client_avatar_dir)), name="avatar")

# Mount UI Router
app.include_router(ui_router)


# Health Endpoint reporting Gemini, OpenRouter, and Knowledge files status
@app.get("/api/health")
async def health_endpoint():
    """Reports Gemini status, knowledge-files status, dataset status, and service health."""
    from backend.knowledge_loader import get_site_map, _cached_knowledge
    from backend.data_service import get_placement_df

    df = get_placement_df()
    sitemap = get_site_map()
    gemini_key = bool(os.getenv("GEMINI_API_KEY", "").strip())
    openrouter_key = bool(os.getenv("OPENROUTER_API_KEY", "").strip())

    return {
        "status": "healthy",
        "service": "Pathfinder DAS Autonomous AI Agent",
        "gemini_configured": gemini_key,
        "openrouter_configured": openrouter_key,
        "knowledge_files": {
            "loaded_count": len(_cached_knowledge),
            "documents": list(_cached_knowledge.keys()),
            "sitemap_pages": len(sitemap.get("pages", []))
        },
        "dataset": {
            "total_records": len(df),
            "columns": list(df.columns) if not df.empty else []
        },
        "uptime": "operational"
    }


# -----------------------------------------------------------------------------
# Pathfinder-Dedicated Brain & AI Reasoning Endpoint (Zero OS Tools)
# -----------------------------------------------------------------------------
# Pathfinder-Dedicated Brain & AI Reasoning Pipeline (Zero OS Tools)
# -----------------------------------------------------------------------------
async def process_chat_reasoning(user_message: str) -> dict:
    """
    Unified AI reasoning engine for Pathfinder DAS Voice Agent.
    Evaluates specific domain queries (projects, real-world, components, cutoffs),
    OpenRouter/Gemini LLM reasoning, or structured contextual fallback.
    Returns rich payload supporting all frontends.
    """
    lower_msg = user_message.lower().strip()
    actions = []
    followups = []

    # Step-by-Step Project Building Guide
    if any(w in lower_msg for w in ["build project", "how to build", "step by step", "make project", "project guide"]):
        spoken = "To build placement-ready projects step by step, follow four key milestones: System Architecture, Robust Engineering, Automated Verification and Deployment, and Resume Metric Impact. Would you like to start with a project for your branch?"
        display = (
            "### 🛠️ Step-by-Step Production Project Guide\n\n"
            "1. **Step 1: System Architecture** — Design clean REST/WebSocket API schemas with payload validation (Pydantic) and modular folder trees.\n"
            "2. **Step 2: Robust Engineering** — Implement thread-safe storage, active caching (Redis), rate-limiting middleware, and database transaction locks.\n"
            "3. **Step 3: Verification & Deployment** — Write automated pytest unit tests and containerize with multi-stage Dockerfiles deployed live.\n"
            "4. **Step 4: Resume Impact** — Quantify your achievement using Google's X-Y-Z formula and verify commit authenticity with Pathfinder's Live Skill Verifier."
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "projects"}}]
        followups = ["Show me medium projects for CSE", "Explain project folder structure", "How to present in interview?"]

    # Real-World Purpose & Why Students Must Use Pathfinder
    elif any(w in lower_msg for w in ["why pathfinder", "why use", "real world", "purpose", "why student", "what problem", "enduku", "em use"]):
        spoken = "In the real world, over 80 percent of engineering students discover critical company cutoffs, required D S A depth, and A T S filters too late. Pathfinder solves this placement readiness crisis with verified data from 972 cohort alumni. Shall I check your readiness score?"
        display = (
            "### 🎯 Real-World Problem Solved by Pathfinder\n\n"
            "- **The Placement Gap**: Over 80% of graduates struggle in campus recruitment because company cutoffs (minimum 7.5 CGPA, 0 active backlogs, Blind 75 DSA) are discovered too late.\n"
            "- **Generic Advice Failure**: Standard online roadmaps fail to account for branch differences or target corporate tiers (Product MNC Tier-1 vs Service Tier-2).\n"
            "- **The Pathfinder Bridge**: Uses calibrated Machine Learning trained on 972 verified student cohort records to give you an exact readiness score, daily 6-week sprints, 23 production blueprints, and 24/7 mock viva coaching."
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "overview"}}]
        followups = ["What is my placement score?", "Show me the 6-week roadmap", "Explain all components"]

    # Explanation of All Components
    elif any(w in lower_msg for w in ["all component", "all feature", "explain all", "all module", "sections", "every feature", "explaina all"]):
        spoken = "Pathfinder comprises 8 core intelligence pillars: the Placement Readiness Dashboard, Cohort Analytics, the 6-Week D S A Roadmap, 23 Project Blueprints, A T S Resume Studio, Live Skill Verifier, Mock Interview Simulator, and D A S Voice Coach. Which pillar would you like to explore?"
        display = (
            "### ⚡ Pathfinder 2.0 Core Architecture Pillars\n\n"
            "1. **Placement Readiness Dashboard**: Real-time 0-100% score gauge with What-If sensitivity simulation.\n"
            "2. **Cohort Placement Analytics**: 972 student cohort records across 9 departments with salary distributions up to 44.6 LPA.\n"
            "3. **6-Week Structured DSA Roadmap**: Day-by-day algorithmic problem curriculum.\n"
            "4. **23 Production Project Blueprints**: End-to-end architectures with Docker and viva defense talking points.\n"
            "5. **One-Page ATS Resume Studio**: Google X-Y-Z formula optimizer and PDF exporter.\n"
            "6. **Live Skill Verifier**: Anti-fraud GitHub commit and code authorship auditor.\n"
            "7. **AI Mock Interview Simulator**: Timed viva coding practice with live multi-vector scoring.\n"
            "8. **DAS Autonomous 3D Voice Coach**: Continuous spoken mentorship with full website navigation control."
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "overview"}}]
        followups = ["Take me to Cohort Analytics", "Open Project Blueprints", "What is the 6-week roadmap?"]

    # Cutoffs, packages, statistics
    elif any(w in lower_msg for w in ["cutoff", "stat", "package", "salary", "lpa", "highest", "average"]):
        spoken = "Based on our 972 cohort placement records, the highest package recorded is 44.6 L P A in C S E and A I M L, the overall placement rate is 79.4 percent, and the average salary is 8.5 L P A. Maintaining a C G P A above 7.5 qualifies you for Tier-1 drives."
        display = (
            "### 📊 Verified Cohort Placement Statistics\n\n"
            "- **Highest Recorded Package**: **44.6 LPA** (CSE / AIML Tier-1 Product MNCs)\n"
            "- **Overall Placement Rate**: **79.4%** across 972 verified candidates\n"
            "- **Average Package**: **8.5 LPA**\n"
            "- **Minimum CGPA for Tier-1**: **7.5+** with zero active backlogs"
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "analytics"}}]
        followups = ["Show me branch wise stats", "What skills are needed for 44.6 LPA?", "Check my eligibility"]

    # Roadmaps / DSA
    elif any(w in lower_msg for w in ["roadmap", "dsa", "week", "leetcode", "algorithm"]):
        spoken = "Our 6-week Tier-1 D S A roadmap covers Arrays and Hashing in Week 1, Two Pointers and Sliding Window in Week 2, Stacks and Queues in Week 3, Binary Trees in Week 4, Graphs in Week 5, and Dynamic Programming in Week 6. Ready to start?"
        display = (
            "### 🗺️ 6-Week Tier-1 Placement Sprint\n\n"
            "- **Week 1**: Arrays, Hashing, Two Pointers, Time Complexity Analysis\n"
            "- **Week 2**: Sliding Window, Linked Lists, Stacks & Queues\n"
            "- **Week 3**: Binary Search, Trees, Binary Search Trees\n"
            "- **Week 4**: Graphs (BFS, DFS), Heaps, Priority Queues\n"
            "- **Week 5**: Dynamic Programming (1D & 2D), Greedy Algorithms\n"
            "- **Week 6**: Mock Technical Interviews & System Design Foundations"
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "skills"}}]
        followups = ["Open the roadmap tab", "Give me Week 1 problems", "Explain Two Pointers"]

    # Interviews / Viva
    elif any(w in lower_msg for w in ["interview", "mock", "question", "viva", "practice"]):
        spoken = "Let's practice! Technical viva question: explain how an L R U Cache operates in O of 1 time complexity for both get and put operations, and why combining a Doubly Linked List with a Hash Map is optimal."
        display = (
            "### 🎙️ Technical Interview Practice: LRU Cache\n\n"
            "**Question**: Explain how an **LRU (Least Recently Used) Cache** achieves $O(1)$ time complexity for both `get` and `put` operations.\n\n"
            "**Key Concepts to Explain**:\n"
            "1. Why a Hash Map alone is insufficient (no ordering).\n"
            "2. Why a Doubly Linked List allows $O(1)$ node removal and head insertion.\n"
            "3. How Hash Map keys point directly to Doubly Linked List node references."
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "interview"}}]
        followups = ["Tell me the answer", "Give me another question", "Start mock viva mode"]

    # Resume
    elif any(w in lower_msg for w in ["resume", "cv", "ats"]):
        spoken = "For an A T S clearing resume, structure your bullets using Google's X-Y-Z formula: Accomplished X, as measured by Y, by doing Z. Keep it to one page with live GitHub and deployment links. Would you like me to open the resume studio?"
        display = (
            "### 📄 ATS Resume Optimization Guidelines\n\n"
            "- **The Google X-Y-Z Formula**: *'Accomplished [X], as measured by [Y], by doing [Z]'*.\n"
            "- **Single Page Rule**: Strictly 1 crisp page for undergraduate campus drives.\n"
            "- **Proof of Work**: Every project must include a live deployment link and public GitHub repository."
        )
        actions = [{"name": "open_panel", "arguments": {"name": "resume_builder"}}]
        followups = ["Open ATS Resume Studio", "Give me a project resume bullet", "Scan my resume"]

    # Name / Identity
    elif any(w in lower_msg for w in ["name", "who are you", "what are you", "call you"]):
        spoken = "Hello! I am D A S, your autonomous 3D A I career and placement coach for Pathfinder. I specialize in placement strategy, D S A roadmap mastery, resume optimization, and mock technical interviews. How can I help you today?"
        display = (
            "### 🤖 Meet DAS AI (Dedicated Placement Strategist)\n\n"
            "I am your autonomous 3D AI placement co-pilot on Pathfinder. Here is what I can do for you:\n"
            "- 🗺️ **Personalized Roadmaps**: 6-week structured DSA & core CS sprint schedule.\n"
            "- 🛠️ **Project Mentorship**: Step-by-step guidance across 23 production blueprints.\n"
            "- 🎙️ **Live Mock Vivas**: High-pressure technical interview drills with voice input.\n"
            "- 🚀 **Autonomous Website Control**: Voice navigation to any tab or section."
        )
        actions = []
        followups = ["What is Pathfinder?", "Check my placement readiness", "Give me project ideas"]

    # Greetings (word boundary regex)
    elif re.search(r'\b(hello|hi|hey|good morning|good evening|namaste)\b', lower_msg):
        spoken = "Hi sir! I'm D A S, your Pathfinder A I agent. I am ready to guide your placement journey. What would you like to explore—D S A roadmaps, company cutoffs, or mock interviews?"
        display = (
            "👋 **Hi! I am DAS, your Pathfinder AI Placement Co-Pilot.**\n\n"
            "What would you like to explore today?\n"
            "- 📊 Check placement cutoffs and salary benchmarks\n"
            "- 🗺️ Generate your customized 6-Week DSA roadmap\n"
            "- 🛠️ Pick a production-grade portfolio project\n"
            "- 🎙️ Practice a mock technical interview"
        )
        actions = []
        followups = ["Show me the highest package", "What is the 6-week roadmap?", "Explain Pathfinder"]

    # General About Website / Pathfinder (catch-all)
    elif any(w in lower_msg for w in ["website", "about this", "pathfinder", "platform", "portal"]):
        spoken = "Pathfinder 2.0 is an enterprise career intelligence platform featuring real-time cohort analytics across 972 student records, predictive placement models, 6-week structured D S A learning roadmaps, and an interactive 3D voice coach."
        display = (
            "### 🌐 About Pathfinder 2.0\n\n"
            "Pathfinder is an autonomous campus placement co-pilot designed to eliminate preparation guesswork.\n"
            "It combines verified cohort telemetry from 972 students, Random Forest placement probability scoring, 23 production project blueprints, and 24/7 conversational coaching."
        )
        actions = [{"name": "navigate_to", "arguments": {"page_id": "overview"}}]
        followups = ["Why should students use it?", "Explain all components", "Show me the dataset"]

    else:
        # OpenRouter / Gemini LLM reasoning
        openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        spoken = ""
        display = ""

        if openrouter_key and user_message:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=4.0) as client:
                    payload = {
                        "model": os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-lightning:free"),
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are DAS, the dedicated senior AI career & placement coach for the Pathfinder platform (this website). "
                                    "Pathfinder is an enterprise Career Intelligence portal featuring 972 cohort records, 6-week DSA roadmaps, "
                                    "23 project blueprints, ATS resume builders, and placement predictions up to 44.6 LPA. "
                                    "Provide concise, authoritative, spoken answers in 1 to 3 sentences maximum. Be inspiring and direct."
                                )
                            },
                            {"role": "user", "content": user_message}
                        ]
                    }
                    res = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={"Authorization": f"Bearer {openrouter_key}", "Content-Type": "application/json"},
                        json=payload
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                        if reply and "Which website" not in reply:
                            from backend.voice.structured_brain import format_voice_response
                            v_res = format_voice_response(reply)
                            spoken = v_res.get("spoken", reply)
                            display = v_res.get("display", reply)
            except Exception:
                pass

        if not spoken:
            if not user_message:
                spoken = "Hi sir, I'm your Pathfinder AI agent, how can I help you with your placement preparation today?"
                display = "Hi sir, I'm your Pathfinder AI agent. Speak or type to explore cutoffs, projects, or roadmaps."
            else:
                spoken = (
                    f"Regarding your query: As your Pathfinder placement coach, I recommend focusing on strong foundational D S A skills, "
                    f"maintaining your C G P A above 7.5, and completing 2 production projects with live deployments."
                )
                display = f"### 💡 Pathfinder Guidance\n\n{spoken}"
            actions = [{"name": "navigate_to", "arguments": {"page_id": "skills"}}]
            followups = ["Show me the 6-week roadmap", "What are the 23 project blueprints?", "Check my eligibility"]

    # Sentence chunking for WebAudio / SpeechSynthesis
    raw_sentences = [s.strip() for s in re.split(r'[.!?]+', spoken) if s.strip()]
    sentences = raw_sentences if raw_sentences else [spoken]

    return {
        "reply": spoken,
        "spoken": spoken,
        "spoken_summary": spoken,
        "display": display,
        "screen_details": display,
        "sentences": sentences,
        "provider": "Pathfinder Autonomous Core",
        "actions": actions,
        "followups": followups,
        "is_error": False
    }


# Unified REST Chat Endpoints (handles both /api/chat and /api/voice/chat)
@app.post("/api/chat")
@app.post("/api/voice/chat")
async def chat_endpoint(request: Request):
    """
    Dedicated AI reasoning endpoint for Pathfinder DAS Voice Agent.
    Accepts payload keys: message, text, or query.
    Returns unified payload compatible with VoicePanel, DASGlobalDock, and Studio.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    user_message = (body.get("message") or body.get("text") or body.get("query") or "").strip()
    result = await process_chat_reasoning(user_message)
    return JSONResponse(result)


# Unified Real-Time WebSocket Gateways (/ws/voice and /ws/das-agent)
@app.websocket("/ws/voice")
@app.websocket("/ws/das-agent")
async def ws_voice_unified_endpoint(websocket: WebSocket):
    """
    Bi-directional WebSocket connection for instant voice interaction,
    continuous transcription, and state synchronization.
    """
    await websocket.accept()
    greeting = "Hi sir, I'm your Pathfinder AI agent, how can I help you?"
    try:
        await websocket.send_json({
            "type": "turn_response",
            "spoken_summary": greeting,
            "screen_details": greeting,
            "sentences": [greeting],
            "provider": "Pathfinder Autonomous Core",
            "is_error": False
        })
        await websocket.send_json({"type": "turn_complete"})
    except Exception:
        pass

    try:
        while True:
            raw_msg = await websocket.receive_text()
            data = json.loads(raw_msg)
            user_text = (data.get("text") or data.get("message") or "").strip()
            if user_text:
                await websocket.send_json({"type": "state_change", "state": "thinking"})
                result = await process_chat_reasoning(user_text)
                await websocket.send_json({
                    "type": "turn_response",
                    "spoken_summary": result["spoken_summary"],
                    "screen_details": result["screen_details"],
                    "sentences": result["sentences"],
                    "provider": result["provider"],
                    "actions": result.get("actions", []),
                    "followups": result.get("followups", []),
                    "is_error": False
                })
                await websocket.send_json({"type": "turn_complete"})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass



def run():
    """Starts the standalone Pathfinder DAS Agent server."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print("\n" + "=" * 60)
    print("🚀 PATHFINDER 2.0: DAS AI VOICE AGENT INITIALIZED")
    print("=" * 60)
    print(f"• Studio UI Viewport: http://localhost:{port}/")
    print(f"• Voice Profile: Puck (Male Prebuilt Config)")
    print(f"• System Persona: DAS (Dedicated Placement Strategist)")
    print(f"• Initial Greeting: \"Hi sir, I'm your Pathfinder AI agent, how can I help you?\"")
    print(f"• OS Automation: COMPLETELY REMOVED (Website-Dedicated Mode)")
    print("=" * 60 + "\n")

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    run()
