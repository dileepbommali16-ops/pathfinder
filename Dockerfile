FROM python:3.11-slim

# System dependencies install cheyyadam
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python environments & buffering settings
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code and datasets
COPY backend/ ./backend/
COPY data/ ./data/

# Render default dynamic port
EXPOSE 10000

# Uvicorn with WebSocket Ping-Pong, Keep-Alive & 16MB Max Frame Size for 24kHz Audio
CMD sh -c "uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-10000} --ws websockets --ws-ping-interval 20 --ws-ping-timeout 20 --ws-max-size 16777216 --timeout-keep-alive 120"
