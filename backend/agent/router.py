from fastapi import APIRouter
from backend.agent.live_proxy import router as ws_router
from backend.agent.puck_voice import PUCK_SAMPLE_RATE

router = APIRouter()
router.include_router(ws_router)

@router.get("/agent/status")
async def agent_voice_status():
    return {
        "agent_name": "DAS 3D Co-Pilot",
        "voice_profile": "Puck",
        "sample_rate_hz": PUCK_SAMPLE_RATE,
        "websocket_url": "wss://pathfinder-backend-klrp.onrender.com/agent/ws",
        "multilingual": ["Telugu", "English", "Hindi"],
        "honorific_modes": ["Boss (Dileep)", "Sir (Client/Evaluator)"]
    }

agent_router = router
