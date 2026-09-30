import os
import sys
from pathlib import Path
from typing import Optional

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


def run_server(host: Optional[str] = None, port: Optional[int] = None, reload: bool = False):
    host = host or os.getenv("HOST", "0.0.0.0")
    port = port or int(os.getenv("PORT", "8000"))
    print(f"[Pathfinder 2.0] Backend starting on http://{host}:{port}")
    uvicorn.run("backend.api:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    run_server(host=host, port=port)
