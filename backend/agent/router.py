from fastapi import APIRouter
from backend.agent.live_proxy import router as ws_router
from backend.agent.puck_voice import PUCK_SAMPLE_RATE
from backend.config import get_settings

router = APIRouter()
router.include_router(ws_router)

@router.get("/agent/status")
async def agent_voice_status():
    base = get_settings().backend_public_url.rstrip("/")
    ws_base = base.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
    return {
        "agent_name": "DAS 3D Autonomous Agent",
        "voice_profile": "DAS Neural",
        "sample_rate_hz": PUCK_SAMPLE_RATE,
        "websocket_url": f"{ws_base}/agent/ws",
        "multilingual": ["Telugu", "English", "Hindi"],
        "honorific_modes": ["Boss (Dileep)", "Madam (Guest)", "Sir (Guest)"]
    }

agent_router = router
