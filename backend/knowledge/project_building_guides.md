# Pathfinder Step-by-Step Project Building Guides

This document provides the standard, reusable engineering teaching template that DAS AI uses to mentor students through project construction across all branches. It contains complete step-by-step guides for 5 primary branch groups across Small, Medium, and Hard tiers.

---

## 1. Reusable Project Teaching Template
Whenever DAS AI guides a student to build a project (including any NEW project idea proposed by the student), it strictly adheres to this structured methodology:

1. **Project Title & Goal**: Clear summary of the problem solved and core engineering competencies acquired.
2. **Difficulty Level & Time Estimate**: Small (1-2 days), Medium (1-2 weeks), Hard (3-4 weeks).
3. **Prerequisite Tools & Tech Stack**: Languages, frameworks, databases, and deployment platforms.
4. **Standard Folder Structure**: Clean, modular production directory tree.
5. **Step-by-Step Build Pipeline (Step 1 to N)**:
   - *What to do*: Concrete code/configuration implementation instructions.
   - *How to check it works*: Explicit test commands, HTTP curl checks, or terminal verification outputs.
6. **Common Mistakes & Edge Cases**: Architectural traps, concurrency bugs, and silent failures to avoid.
7. **How to Present to an Interviewer**: 60-second technical elevator pitch and STAR defense talking points.
8. **The Resume Line It Earns**: Formatted using the Google X-Y-Z formula (`Accomplished [X] as measured by [Y] by doing [Z]`).

---

## 2. Branch Group 1: CSE / IT / Web Systems

### Project 1 (Small - Step-by-Step): In-Memory Key-Value Store with TTL & REST API
- **Goal**: Master concurrency, thread-safe data structures, and REST API design without heavy external databases.
- **Level**: Small | **Time Estimate**: 2 days.
- **Tools**: Python 3.11, FastAPI, pytest, curl.
- **Folder Structure**:
  ```text
  kv-store/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── engine.py
  │   └── schemas.py
  ├── tests/
  │   └── test_engine.py
  ├── requirements.txt
  └── README.md
  ```
- **Step-by-Step Implementation**:
  - **Step 1 (Core Store Engine with Thread Safety)**:
    - *What to do*: In `app/engine.py`, create `class KeyValueStore` utilizing a standard Python dictionary protected by a `threading.Lock` or `threading.RLock`. Implement `set(key, value, ttl_seconds=None)`, `get(key)`, and `delete(key)`. For TTL, store expiry timestamp `time.time() + ttl_seconds`.
    - *How to check it works*: Run `python -c "from app.engine import KeyValueStore; s = KeyValueStore(); s.set('a', 1); assert s.get('a') == 1; print('OK')"` -> Outputs `OK`.
  - **Step 2 (Active TTL Eviction Worker)**:
    - *What to do*: Add a background daemon thread that runs every 500ms, samples 20 expired keys, and deletes them to prevent memory leaks from keys that are never queried again.
    - *How to check it works*: Set key with TTL of 1 second, sleep 1.5 seconds, verify key is evicted and memory is freed.
  - **Step 3 (FastAPI REST Interface)**:
    - *What to do*: In `app/main.py`, mount `POST /api/keys`, `GET /api/keys/{key}`, and `DELETE /api/keys/{key}` with Pydantic payload validation.
    - *How to check it works*: Run `uvicorn app.main:app --port 8000` and test with `curl -X POST http://localhost:8000/api/keys -H "Content-Type: application/json" -d '{"key":"user","value":"das","ttl":10}'` -> Receives `{"status":"ok"}`.
  - **Step 4 (Unit & Concurrency Tests)**:
    - *What to do*: In `tests/test_engine.py`, write a concurrent test spinning up 50 threads doing simultaneous reads/writes to ensure no race conditions occur.
    - *How to check it works*: Run `pytest tests/` -> 100% tests passing.
- **Common Mistakes**: Forgetting thread locks on dictionary mutation, leading to `RuntimeError: dictionary changed size during iteration`.
- **How to Present in Interview**: "I built a thread-safe in-memory store in Python with active TTL eviction and REST endpoints, benchmarking concurrent read/write throughput at 4,200 req/sec under race conditions."
- **Resume Line**: "Engineered a thread-safe in-memory key-value cache in Python with automated TTL eviction, sustaining 4,000+ concurrent requests with zero race conditions."

### Project 2 (Medium): Distributed Asynchronous Task Queue & Rate Limiter
- **Level**: Medium | **Tools**: FastAPI, Redis Streams, Docker, PostgreSQL.
- **Summary**: Token bucket rate limiting middleware + worker consumer group processing jobs with exponential backoff and dead-letter queues.

### Project 3 (Hard): Real-Time Collaborative Code Editor with CRDT & WebSockets
- **Level**: Hard | **Tools**: React 19, TypeScript, Node.js, WebSockets, Yjs CRDT.
- **Summary**: Multi-user concurrent code editor reconciling simultaneous typing conflicts without a centralized lock.

---

## 3. Branch Group 2: AIML / CSD / Data Science

### Project 1 (Small - Step-by-Step): Production Sentiment Classifier API with Drift Detection
- **Goal**: Learn how to package an ML model as a production microservice with automated data drift monitoring.
- **Level**: Small | **Time Estimate**: 3 days.
- **Tools**: Scikit-Learn, FastAPI, NumPy, Pandas, Docker.
- **Folder Structure**:
  ```text
  sentiment-service/
  ├── model/
  │   ├── train.py
  │   └── classifier.joblib
  ├── service/
  │   ├── main.py
  │   └── monitor.py
  ├── tests/
  │   └── test_api.py
  ├── Dockerfile
  └── requirements.txt
  ```
- **Step-by-Step Implementation**:
  - **Step 1 (Train Baseline TF-IDF + Logistic Regression)**:
    - *What to do*: In `model/train.py`, train a TF-IDF vectorizer + Logistic Regression classifier on customer reviews, serialize with `joblib.dump()`.
    - *How to check it works*: Check test set F1-score > 0.85; output saved to `model/classifier.joblib`.
  - **Step 2 (FastAPI Inference Service)**:
    - *What to do*: Load model on startup in `service/main.py`. Provide `POST /predict` accepting `{"text": "..."}` returning `{"sentiment": "positive", "confidence": 0.94}`.
    - *How to check it works*: Send test curl: `curl -X POST http://localhost:8000/predict -d '{"text":"Fast delivery and great UI"}'` -> Returns positive with high confidence.
  - **Step 3 (Real-Time Input Drift Telemetry)**:
    - *What to do*: In `service/monitor.py`, track input token length distributions and prediction confidence percentiles. Flag alerts if low-confidence predictions exceed 25%.
    - *How to check it works*: Send 20 out-of-domain gibberish sentences; verify drift alert status logs `WARNING: Data Drift Detected`.
  - **Step 4 (Docker Containerization)**:
    - *What to do*: Build lightweight multi-stage Dockerfile (`python:3.11-slim`).
    - *How to check it works*: Run `docker build -t sentiment-api . && docker run -p 8000:8000 sentiment-api`.
- **Common Mistakes**: Loading the model inside the request handler instead of loading once at startup, creating severe latency bottlenecks.
- **How to Present**: "I developed and containerized a sub-20ms sentiment classifier with live confidence telemetry to alert engineers when customer linguistic patterns drift."
- **Resume Line**: "Deployed containerized sentiment classification API with Scikit-Learn and FastAPI, achieving sub-20ms inference latency and 89% F1-score with automated drift telemetry."

### Project 2 (Medium): Multi-Agent Regulatory Document Research Engine (RAG)
- **Level**: Medium | **Tools**: Google GenAI, ChromaDB / FAISS, LangChain / LlamaIndex, Python.
- **Summary**: Semantic vector search pipeline over complex financial/medical PDFs with citation verification.

### Project 3 (Hard): Distributed Feature Store & Offline-Online Parity Pipeline
- **Level**: Hard | **Tools**: PySpark, Redis, PostgreSQL, Great Expectations.
- **Summary**: Enterprise feature engineering system maintaining zero data leakage between training and inference.

---

## 4. Branch Group 3: ECE / EEE / IoT / Embedded Systems

### Project 1 (Small - Step-by-Step): ESP32 Real-Time Edge Sensor Telemetry Gateway
- **Goal**: Implement low-power hardware telemetry publishing over MQTT with automated reconnect and local flash buffering.
- **Level**: Small | **Time Estimate**: 3 days.
- **Tools**: ESP32 (or Wokwi Simulator), C++ / Arduino IDE, MQTT Broker (HiveMQ/Mosquitto), Python subscriber.
- **Folder Structure**:
  ```text
  esp32-telemetry/
  ├── firmware/
  │   └── src/main.cpp
  ├── gateway/
  │   └── listener.py
  ├── docs/
  │   └── circuit_diagram.png
  └── platformio.ini
  ```
- **Step-by-Step Implementation**:
  - **Step 1 (Sensor Reading & Serialization)**:
    - *What to do*: Read analog/I2C sensor (e.g. DHT22 or potentiometer) every 2 seconds, serialize into a compact JSON payload `{"devId":"esp-01","temp":26.4,"vcc":3.28}`.
    - *How to check it works*: Open Serial Monitor at 115200 baud; inspect periodic JSON logs.
  - **Step 2 (MQTT Connection & Reconnect Loop)**:
    - *What to do*: Connect to WiFi and MQTT broker using `PubSubClient`. Implement non-blocking reconnect if WiFi drops.
    - *How to check it works*: Disconnect router/hotspot; observe device buffering data locally and resuming transmission upon reconnect.
  - **Step 3 (Local SPIFFS Flash Queue on Network Failure)**:
    - *What to do*: When MQTT is disconnected, save readings to internal SPIFFS flash memory; replay them once connection is re-established.
    - *How to check it works*: Simulate 1-minute outage; verify zero sensor readings lost on dashboard.
  - **Step 4 (Python Backend Ingest & SQLite Logger)**:
    - *What to do*: Write `gateway/listener.py` subscribing to `sensors/esp-01/telemetry`, inserting readings into SQLite with microsecond timestamps.
    - *How to check it works*: Query `SELECT count(*) FROM readings;` in terminal.
- **Common Mistakes**: Using blocking `delay()` in firmware which halts the WiFi network stack, causing watchdog timer crashes.
- **How to Present**: "I built an edge IoT telemetry gateway in C++ on ESP32 that guarantees zero data loss during network dropouts using SPIFFS flash queuing and asynchronous MQTT pub/sub."
- **Resume Line**: "Engineered ESP32 IoT telemetry firmware with SPIFFS failover buffering and MQTT pub/sub, ensuring zero packet loss across simulated 10-minute network outages."

### Project 2 (Medium): CAN-Bus Automotive Telemetry Logger & Protocol Analyzer
- **Level**: Medium | **Tools**: STM32 / Arduino, MCP2515 CAN Controller, Python, Wireshark.
- **Summary**: Real-time automotive diagnostic interface decoding OBD-II engine frames.

### Project 3 (Hard): FPGA-Based Hardware Accelerator for Digital Signal Processing (DSP)
- **Level**: Hard | **Tools**: Verilog / VHDL, Xilinx Vivado, PYNQ-Z2 board.
- **Summary**: Pipelined 16-point Fast Fourier Transform (FFT) hardware module executing at 100MHz with fixed-point arithmetic.

---

## 5. Branch Group 4: Mechanical / Civil / Core Engineering

### Project 1 (Small - Step-by-Step): Parametric FEA Stress Analysis Automator in Python
- **Goal**: Automate structural beam deflection and stress distribution calculations using Python and NumPy.
- **Level**: Small | **Time Estimate**: 3 days.
- **Tools**: Python, NumPy, Matplotlib, SciPy.
- **Step-by-Step Implementation**:
  - **Step 1 (Stiffness Matrix Assembly)**: Formulate global stiffness matrix $[K]$ for 1D/2D beam elements based on Young's modulus and cross-sectional area.
  - **Step 2 (Boundary Conditions & Load Vector)**: Apply fixed/pinned support constraints and external point/distributed loads.
  - **Step 3 (System Solver)**: Solve displacement vector $\{u\} = [K]^{-1}\{F\}$ using `scipy.linalg.solve`.
  - **Step 4 (Visual Plotting)**: Render shear force and bending moment diagrams using Matplotlib.
- **Resume Line**: "Developed parametric finite element beam solver in Python, reducing manual structural deflection calculations by 85% with validated analytical accuracy."

### Project 2 (Medium): Computational Fluid Dynamics (CFD) Airfoil Drag Predictor
- **Level**: Medium | **Tools**: OpenFOAM, Python, ParaView, PyFoam.
- **Summary**: Automated mesh generation and lift/drag coefficient extraction over NACA airfoils.

### Project 3 (Hard): Digital Twin Vibrational Predictive Maintenance Engine
- **Level**: Hard | **Tools**: Raspberry Pi, Accelerometer (ADXL345), Python, Scikit-Learn.
- **Summary**: Edge vibration FFT anomaly detector predicting industrial motor bearing wear.

---

## 6. Branch Group 5: Cyber Security / Cloud Infrastructure

### Project 1 (Small - Step-by-Step): Automated SSL Certificate & HTTP Security Header Auditor
- **Goal**: Build a CLI scanner that inspects HTTPS TLS ciphers, expiry, and missing security headers (HSTS, CSP, X-Frame-Options).
- **Level**: Small | **Time Estimate**: 2 days.
- **Tools**: Python, `ssl`, `cryptography`, `requests`, `click`.
- **Step-by-Step Implementation**:
  - **Step 1 (TLS Handshake & Certificate Parser)**: Connect via SSL socket, extract issuer, expiry date, and signature algorithm.
  - **Step 2 (Security Header Verification)**: Query URL and check for `Strict-Transport-Security`, `Content-Security-Policy`, and `X-Content-Type-Options`.
  - **Step 3 (Vulnerability Scoring & Colored Output)**: Assign score out of 100 and display remediation recommendations.
- **Resume Line**: "Built security auditing CLI in Python evaluating SSL certificate validity and HTTP security headers, identifying 12+ standard OWASP misconfigurations."

### Project 2 (Medium): Zero-Trust Reverse Proxy with JWT & Role-Based Access Control (RBAC)
- **Level**: Medium | **Tools**: Go / Python, Docker, Redis, OAuth2/OIDC.
- **Summary**: High-throughput gateway verifying cryptographic JWT signatures before routing traffic to backend microservices.

### Project 3 (Hard): Honeypot Detection & Real-Time SIEM Threat Telemetry Pipeline
- **Level**: Hard | **Tools**: Docker, Python, Suricata / Snort, ELK Stack (Elasticsearch, Logstash, Kibana).
- **Summary**: Deployed low-interaction SSH/HTTP honeypot logging live brute-force attack telemetry and geographic attacker mapping.
