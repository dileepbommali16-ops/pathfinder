import os
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uvicorn
from backend.api import app


def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = False):
    print(f"[Pathfinder 2.0] Backend starting on http://{host}:{port}")
    uvicorn.run("backend.api:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    run_server(port=port)
