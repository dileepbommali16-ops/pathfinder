FROM python:3.11-slim

# System dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python requirements first (for faster Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code and production datasets
COPY backend/ ./backend/
COPY data/ ./data/

# Expose dynamic port assigned by Render
EXPOSE 10000

# Start FastAPI with Uvicorn + WebSocket Keep-Alive flags for Gemini Live API
CMD sh -c "uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-10000} --ws websockets --ws-ping-interval 20 --ws-ping-timeout 20 --timeout-keep-alive 120"
