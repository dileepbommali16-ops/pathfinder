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
from fastapi import FastAPI, Request
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


# -----------------------------------------------------------------------------
# Pathfinder-Dedicated Brain & AI Reasoning Endpoint (Zero OS Tools)
# -----------------------------------------------------------------------------
@app.post("/api/chat")
async def chat_endpoint(request: Request):
    """
    Dedicated AI reasoning endpoint restricted purely to Pathfinder.
    Completely isolated from host OS, files, and commands.
    """
    try:
        body = await request.json()
        user_message = body.get("message", "").strip()
        if not user_message:
            return JSONResponse({"reply": "I am listening. How can I assist with your placement preparation?"})

        gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()

        # Check for Gemini 2.0 Flash reasoning
        if gemini_api_key:
            try:
                import google.genai as genai
                from google.genai import types

                client = genai.Client(api_key=gemini_api_key)
                system_instruction = (
                    "You are DAS, the dedicated senior AI career and technical coach for Pathfinder. "
                    "Your scope is strictly limited to the Pathfinder placement platform: cutoffs, "
                    "DSA roadmaps, resume feedback, and mock interviews. You have NO OS or laptop automation tools. "
                    "Keep answers concise, direct, inspiring, and authoritative."
                )

                response = client.models.generate_content(
                    model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
                    contents=user_message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                        max_output_tokens=300
                    )
                )
                reply = response.text.strip() if response.text else ""
                if reply:
                    return JSONResponse({"reply": reply})
            except Exception as e:
                pass

        # Intelligent Fallback matching Pathfinder Platform Knowledge
        lower_msg = user_message.lower()
        if "cutoff" in lower_msg or "stat" in lower_msg or "package" in lower_msg:
            reply = (
                "Based on the Pathfinder 2024-2026 cohort data, the highest recorded package is 44.6 LPA "
                "in CSE/AIML. The overall campus placement rate stands at 79.4%, with an average package of 8.5 LPA. "
                "Maintaining a CGPA above 7.5 with 0 active backlogs places you in Tier-1 eligibility!"
            )
        elif "roadmap" in lower_msg or "dsa" in lower_msg or "week" in lower_msg:
            reply = (
                "Our recommended 6-week Tier-1 DSA roadmap is structured as: Week 1 Arrays & Hashing, "
                "Week 2 Two Pointers & Sliding Window, Week 3 Stacks & Queues, Week 4 Binary Trees & BSTs, "
                "Week 5 Graphs (BFS/DFS), and Week 6 Dynamic Programming & Mock Rounds."
            )
        elif "interview" in lower_msg or "mock" in lower_msg:
            reply = (
                "Let's begin! Tell me: How would you design an LRU Cache with O(1) get and put operations, "
                "and which data structures would you select to ensure thread safety?"
            )
        elif "resume" in lower_msg or "project" in lower_msg:
            reply = (
                "For your resume, quantify impact using the Google XYZ formula: 'Accomplished [X], as measured by [Y], "
                "by doing [Z]'. Ensure all production links and GitHub repositories are publicly accessible."
            )
        else:
            reply = (
                f"As your Pathfinder AI Coach, I am dedicated to your technical growth and placement success. "
                f"Tell me more about your target company tier or specific technical challenge!"
            )

        return JSONResponse({"reply": reply})

    except Exception as exc:
        return JSONResponse({
            "reply": "I am your Pathfinder Career Coach. Ask me anything about placement readiness, DSA roadmaps, or mock interviews!"
        })


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

    uvicorn.run("main.py:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run()
