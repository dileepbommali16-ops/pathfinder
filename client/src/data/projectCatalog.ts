export interface ProjectBlueprint {
  id: string;
  roleId?: string;
  title: string;
  domain: string;
  roleMatch?: string;
  difficulty: 'Intermediate' | 'Advanced' | string;
  techStack: string[];
  overview: string;
  features: string[];
  architectureSummary?: string;
  resumeBullet: string;
  psCode?: string;
  category?: 'software' | 'hardware' | string;
  branch?: string;
  organization?: string;
}

export const DEFAULT_PROJECT_CATALOG: ProjectBlueprint[] = [
  {
    "id": "proj-sde-1",
    "roleId": "sde",
    "title": "Distributed Asynchronous Job Queue & Rate Limiter",
    "domain": "Backend Systems & Concurrency",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "FastAPI",
      "Redis Streams",
      "Docker",
      "PostgreSQL"
    ],
    "overview": "A fault-tolerant distributed background task orchestrator with token-bucket rate limiting, worker consumer groups, and exponential backoff retry mechanisms.",
    "features": [
      "Token bucket rate-limiting middleware restricting client bursts",
      "Redis stream worker pool with consumer groups and dead-letter queue",
      "PostgreSQL state persistence with ACID transaction locks",
      "Prometheus & Grafana telemetry tracking job throughput"
    ],
    "architectureSummary": "Client -> FastAPI Gateway -> Token Bucket Redis Middleware -> Redis Task Stream -> Worker Consumer Group (x3) -> Postgres Persistence -> Prometheus Metrics.",
    "resumeBullet": "Engineered a distributed async task queue handling 3,500+ tasks/sec using Redis Streams and FastAPI, reducing job processing latency by 44% with zero message drop.",
    "category": "software",
    "branch": "CSE / IT / AIML"
  },
  {
    "id": "proj-fullstack-1",
    "roleId": "fullstack",
    "title": "Real-Time Collaborative Code & Canvas Studio",
    "domain": "Full-Stack Web & WebSockets",
    "difficulty": "Advanced",
    "techStack": [
      "React 19",
      "TypeScript",
      "Node.js",
      "WebSockets",
      "TailwindCSS"
    ],
    "overview": "Low-latency browser IDE supporting synchronized multi-user code editing, syntax highlighting, and live conflict-free replicated data types (CRDT).",
    "features": [
      "CRDT-based text reconciliation for simultaneous multi-cursor editing",
      "WebSocket heartbeat connection with auto-reconnect and state catchup",
      "Sandboxed in-browser code execution runtime via WebAssembly",
      "Modern dark glassmorphic design system built on TailwindCSS"
    ],
    "architectureSummary": "React Virtual DOM -> Yjs CRDT Provider -> Node.js WebSocket Hub -> Redis Pub/Sub Cluster -> Browser WebAssembly Runner.",
    "resumeBullet": "Built real-time collaborative code editor supporting 50+ concurrent users with sub-30ms typing synchronization latency using WebSockets, React 19, and Yjs CRDTs.",
    "category": "software",
    "branch": "CSE / IT / AIML"
  },
  {
    "id": "proj-ai-1",
    "roleId": "ai-engineer",
    "title": "Multi-Agent Regulatory Document Research Engine (RAG)",
    "domain": "Generative AI & Agentic Workflows",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "Google GenAI",
      "FastAPI",
      "Qdrant",
      "React"
    ],
    "overview": "Autonomous multi-agent research pipeline that ingests complex legal and financial PDFs, constructs hybrid vector indexes, and produces verified factual summaries with exact citation coordinates.",
    "features": [
      "Recursive semantic chunking preserving table hierarchies and headers",
      "Hybrid search combining BM25 keyword matching with dense Gemini embeddings",
      "Autonomous reflection agent verifying answer faithfulness against source context",
      "Interactive source bounding box highlighting in embedded PDF reader"
    ],
    "architectureSummary": "PDF Ingestion -> PyMuPDF OCR -> Gemini Embeddings -> Qdrant Vector DB -> Hybrid Ranker -> Gemini 3.5 Verification Agent -> React Citation UI.",
    "resumeBullet": "Architected an enterprise RAG agent achieving 94.6% factual faithfulness on complex 80-page financial audits by implementing hybrid retrieval and autonomous self-reflection verification.",
    "category": "software",
    "branch": "CSE / IT / AIML"
  },
  {
    "id": "proj-data-1",
    "roleId": "data-engineer",
    "title": "High-Throughput Financial Market Data Lake & Stream Processing",
    "domain": "Data Engineering & Stream Analytics",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "Apache Kafka",
      "DuckDB",
      "Apache Airflow",
      "Docker"
    ],
    "overview": "Automated data engineering pipeline capturing tick-by-tick financial market feeds, performing deduplication, aggregating rolling candles, and writing partitioned Parquet lakes.",
    "features": [
      "Idempotent ingestion consumer preventing duplicate transactions",
      "1-minute, 5-minute, and 1-hour rolling candlestick aggregations",
      "Partitioned Parquet storage queryable via DuckDB in milliseconds",
      "Airflow DAGs managing daily compaction, schema validation, and data quality checks"
    ],
    "architectureSummary": "Market WebSocket Stream -> Kafka Broker -> PySpark/DuckDB Stream Processor -> Partitioned Parquet Lakehouse -> Airflow Orchestrator -> Streamlit Dashboard.",
    "resumeBullet": "Developed a real-time data lake pipeline processing 1.2M market events/day with DuckDB and Kafka, achieving 18x faster historical query times compared to traditional relational stores.",
    "category": "software",
    "branch": "CSE / IT / AIML"
  },
  {
    "id": "proj-devops-1",
    "roleId": "devops-cloud",
    "title": "Automated Multi-Environment GitOps & Canary Deployment Engine",
    "domain": "Cloud Infrastructure & GitOps",
    "difficulty": "Advanced",
    "techStack": [
      "Kubernetes",
      "Docker",
      "Terraform",
      "GitHub Actions",
      "Prometheus"
    ],
    "overview": "A declarative GitOps workflow that spins up ephemeral preview environments on pull requests and manages canary rollouts with automated latency rollback triggers.",
    "features": [
      "Multi-stage Docker builds reducing production image footprint by 68%",
      "Automated ephemeral preview environments deployed per pull request",
      "Canary rollout controller rolling back deployments if HTTP 5xx error rate exceeds 1%",
      "Prometheus & Grafana alerting integrated with Discord/Slack webhooks"
    ],
    "architectureSummary": "GitHub PR -> GitHub Actions Matrix -> Docker Slim Build -> Terraform Cloud -> k3s Kubernetes Ingress -> Prometheus Health Watchdog.",
    "resumeBullet": "Designed automated GitOps CI/CD pipeline cutting deployment lead time from 45 mins to 3.8 mins while eliminating deployment-induced outages via automated canary rollback policies.",
    "category": "software",
    "branch": "CSE / IT / AIML"
  },
  {
    "id": "proj-embedded-1",
    "roleId": "embedded-iot",
    "title": "Industrial Edge Sensor Telemetry & Anomaly Node",
    "domain": "Embedded Systems & Edge Computing",
    "difficulty": "Advanced",
    "techStack": [
      "Embedded C",
      "FreeRTOS",
      "ESP32",
      "MQTT / TLS",
      "Grafana Cloud"
    ],
    "overview": "Low-power industrial monitoring device collecting multi-axis vibration and temperature metrics, executing edge threshold filters, and securely transmitting packets to cloud time-series stores.",
    "features": [
      "Preemptive multi-tasking FreeRTOS architecture with sensor collection and network queues",
      "Power management implementing deep sleep mode with 15\u00b5A quiescent draw",
      "Mutual TLS (mTLS) authentication for encrypted MQTT broker communication",
      "Watchdog timer recovery handling intermittent Wi-Fi / sensor dropouts"
    ],
    "architectureSummary": "I2C Vibration Sensor -> ESP32 Microcontroller (FreeRTOS) -> On-chip Edge Filter -> TLS/MQTT Client -> Cloud Broker -> Grafana Dashboard.",
    "resumeBullet": "Built edge IoT sensor node running FreeRTOS on ESP32 with 15\u00b5A deep sleep consumption, delivering 99.8% telemetry uptime over mTLS to Grafana cloud.",
    "category": "hardware",
    "branch": "ECE / EEE / IoT"
  },
  {
    "id": "sih-26146-bitcoin-forensics",
    "psCode": "SIH26146",
    "roleId": "sde",
    "category": "software",
    "branch": "CSE / IT / Cybersecurity",
    "title": "AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic",
    "domain": "Blockchain & Cybersecurity",
    "organization": "National Technical Research Organisation (NTRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "NetworkX",
      "Web3.py",
      "Neo4j",
      "FastAPI",
      "Scikit-Learn"
    ],
    "overview": "Automated cryptocurrency forensics platform that reconstructs Bitcoin UTXO transaction graphs, tracks high-risk peeling chains, and clusters mixing service transactions using graph neural networks.",
    "features": [
      "Real-time mempool WebSocket streamer parsing unconfirmed transaction graphs",
      "Multi-input clustering heuristics to group Bitcoin addresses under common ownership",
      "Peeling-chain trace algorithms detecting automated CoinJoin and Wasabi mixing hops",
      "Interactive Neo4j Bloom / Force-Directed subgraph canvas for law enforcement analysis"
    ],
    "architectureSummary": "Bitcoin RPC Node -> WebSocket Ingestion -> Neo4j Graph DB -> NetworkX Peeling Chain Tracker -> Graph Convolutional Network (GCN) -> FastAPI REST Engine -> React Cytoscape Visualizer.",
    "resumeBullet": "Engineered an AI Bitcoin forensics platform indexing 150k+ UTXO graph edges in Neo4j, detecting anonymized mixer transactions with 96.2% precision and sub-second trace latency."
  },
  {
    "id": "sih-26147-rf-signal-analysis",
    "psCode": "SIH26147",
    "roleId": "ai-engineer",
    "category": "software",
    "branch": "ECE / CSE / Aerospace",
    "title": "Automated Model for Analysis of .IQ & .wav Radio Files with Signal Parameter Extraction",
    "domain": "Space Technology & Signal Processing",
    "organization": "National Technical Research Organisation (NTRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "SciPy",
      "PyTorch",
      "GNU Radio",
      "NumPy",
      "FastAPI"
    ],
    "overview": "Deep learning radio-frequency telemetry analysis pipeline that ingests raw In-Phase/Quadrature (.IQ) and audio waveforms, extracts spectral parameters, and classifies modulation schemes.",
    "features": [
      "Binary .IQ stream parser calculating Short-Time Fourier Transform (STFT) spectrograms",
      "Automatic Modulation Classification (QPSK, FSK, BPSK, 16-QAM) via 2D ResNet tensors",
      "Signal-to-Noise Ratio (SNR) estimator and Doppler shift frequency drift tracker",
      "Real-time browser-based waterfall FFT spectrum audio visualizer"
    ],
    "architectureSummary": "Raw .IQ/.wav Ingestion -> STFT Spectrogram Generator -> ResNet18 Signal Classifier -> Scipy Peak Parameter Extractor -> FastAPI Telemetry API -> WebGL Waterfall Spectrogram.",
    "resumeBullet": "Developed an automated RF signal classification engine parsing raw .IQ binary feeds, achieving 93.8% modulation classification accuracy under severe -6dB SNR channel noise."
  },
  {
    "id": "sih-26153-network-attack-forecasting",
    "psCode": "SIH26153",
    "roleId": "sde",
    "category": "software",
    "branch": "CSE / IT / Cybersecurity",
    "title": "AI-Based Network Attack Forecasting & Threat Detection from Raw Network Traffic Data",
    "domain": "Cybersecurity & Systems",
    "organization": "National Technical Research Organisation (NTRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "Zeek / Suricata",
      "PyTorch LSTM",
      "Apache Kafka",
      "Elasticsearch"
    ],
    "overview": "Predictive cyber-defense framework that consumes live packet telemetry, identifies subtle reconnaissance anomalies, and forecasts impending DDoS and lateral movement attacks minutes ahead.",
    "features": [
      "High-throughput Zeek log pipeline streaming connection tuples to Kafka topic queues",
      "Temporal Graph Attention Network (GAT) predicting attacker kill-chain progression",
      "Real-time anomaly scoring eliminating 98% of false-positive alert fatigue",
      "Automated iptables / firewall rule synthesis for autonomous pre-emptive mitigation"
    ],
    "architectureSummary": "PCAP Network Tap -> Zeek Packet Parser -> Apache Kafka Stream -> PyTorch Temporal GAT Model -> Elasticsearch SIEM -> React Threat Timeline.",
    "resumeBullet": "Architected an AI network intrusion forecasting pipeline analyzing 25k packets/sec via Zeek and Kafka, predicting multi-stage server attacks 8.4 minutes before critical asset compromise."
  },
  {
    "id": "sih-26158-drone-3d-model-generator",
    "psCode": "SIH26158",
    "roleId": "ai-engineer",
    "category": "software",
    "branch": "CSE / ECE / Robotics",
    "title": "Single-Pass Drone Video to Accurate 3D Model Generation System",
    "domain": "Robotics & Computer Vision",
    "organization": "National Technical Research Organisation (NTRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "PyTorch",
      "Instant-NGP (NeRF)",
      "COLMAP",
      "Open3D",
      "Three.js"
    ],
    "overview": "Photogrammetry and Neural Radiance Fields (NeRF) pipeline transforming continuous single-pass aerial drone video into millimeter-precise textured 3D geometric meshes.",
    "features": [
      "Automated optical keyframe sampling with SuperPoint and LightGlue visual odometry",
      "Sparse structure-from-motion (SfM) camera pose estimation powered by COLMAP",
      "Instant-NGP GPU neural radiance reconstruction generating photorealistic dense 3D splats",
      "Exportable GLTF/OBJ mesh builder with interactive Three.js 3D measurement tools"
    ],
    "architectureSummary": "Drone 4K Video -> Optical Flow Keyframer -> COLMAP Pose Estimator -> Instant-NGP / 3D Gaussian Splatter -> Open3D Mesh Cleaner -> Three.js Browser Viewer.",
    "resumeBullet": "Engineered an aerial 3D reconstruction system translating single-pass drone videos into dense textured 3D terrain meshes in under 12 minutes using NeRF and Gaussian Splatting."
  },
  {
    "id": "sih-26162-nasa-fire-detection",
    "psCode": "SIH26162",
    "roleId": "data-engineer",
    "category": "software",
    "branch": "CSE / Data Science / Civil",
    "title": "AI-Based Detection & Classification of Industrial Fires Using NASA FIRMS Satellite Data",
    "domain": "Disaster Management & Geospatial AI",
    "organization": "National Technical Research Organisation (NTRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "GeoPandas",
      "GDAL",
      "XGBoost",
      "NASA FIRMS API",
      "Leaflet.js"
    ],
    "overview": "Autonomous satellite surveillance system cross-referencing NASA thermal anomaly data with OpenStreetMap industrial boundaries to detect, classify, and track hazardous industrial fires.",
    "features": [
      "Automated polling of NASA VIIRS (375m) and MODIS (1km) near-real-time thermal datasets",
      "Spatial polygon overlay identifying licensed flare stacks vs uncontrolled factory conflagrations",
      "XGBoost temporal persistence model eliminating solar glint and agricultural burn false alarms",
      "Emergency dispatch alert webhooks dispatching geo-coordinates and plume radius estimates"
    ],
    "architectureSummary": "NASA FIRMS API -> GeoPandas Spatial Join -> OpenStreetMap Industrial Index -> XGBoost Heat Classifier -> PostGIS Database -> Leaflet Geospatial Incident Map.",
    "resumeBullet": "Built an industrial disaster surveillance system monitoring 45,000 sq km from NASA FIRMS satellite telemetry, isolating industrial blazes with 97.4% precision in <3 minutes of satellite pass."
  },
  {
    "id": "sih-26167-satquery-ai-assistant",
    "psCode": "SIH26167",
    "roleId": "ai-engineer",
    "category": "software",
    "branch": "CSE / AIML / ECE",
    "title": "SatQuery AI: Interactive Vision-Language Assistant for Remote Sensing Satellite Imagery",
    "domain": "Space Technology & Multimodal AI",
    "organization": "Indian Space Research Organisation (ISRO)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "HuggingFace Transformers",
      "PaliGemma",
      "Qdrant",
      "FastAPI",
      "React"
    ],
    "overview": "Multimodal conversational assistant trained on satellite raster tiles (Chandrayaan-2, Bhuvan, Sentinel), allowing users to execute complex spatial intelligence queries using conversational English and Telugu.",
    "features": [
      "Vision-Language Model fine-tuned on multispectral remote sensing bands (Optical, NIR, SWIR)",
      "Natural language query answering (e.g. 'Identify illegal sand mining clusters along river banks')",
      "Vector retrieval with Qdrant indexing satellite tiles by semantic land-cover features",
      "Interactive bounding box grounding and temporal change detection overlays"
    ],
    "architectureSummary": "Satellite GeoTIFF Tile -> Multispectral Normalizer -> PaliGemma Multimodal Model -> Qdrant Spatial Embeddings -> FastAPI Conversational Gateway -> React Leaflet GIS Viewer.",
    "resumeBullet": "Created a multimodal vision-language assistant for ISRO satellite rasters enabling conversational spatial queries with 91.2% segmentation IoU and sub-4s response latency."
  },
  {
    "id": "sih-26168-dead-reckoning-navigation",
    "psCode": "SIH26168",
    "roleId": "sde",
    "category": "software",
    "branch": "ECE / EEE / Robotics / CSE",
    "title": "AI-ML Based Intelligent Dead Reckoning System for Seamless GNSS-Denied Navigation",
    "domain": "Smart Vehicles & Sensor Fusion",
    "organization": "Indian Space Research Organisation (ISRO)",
    "difficulty": "Advanced",
    "techStack": [
      "C++",
      "Python",
      "Extended Kalman Filter (EKF)",
      "PyTorch",
      "ROS2",
      "NumPy"
    ],
    "overview": "High-precision subterranean and urban canyon positioning system combining high-frequency 9-axis inertial measurement unit (IMU) data with neural network zero-velocity updates (ZUPT).",
    "features": [
      "Physics-informed recurrent neural network learning dynamic sensor bias corrections",
      "Extended Kalman Filter fusing wheel tick encoders, accelerometer, and gyroscope data",
      "Zero-Velocity Update (ZUPT) trigger suppressing cumulative distance drift to <1.2% over 10km",
      "Lightweight ROS2 node capable of running on embedded ARM Cortex or Jetson architectures"
    ],
    "architectureSummary": "9-DOF IMU Sensor Stream (100Hz) -> High-Pass Noise Filter -> PyTorch PINN Bias Estimator -> Extended Kalman Filter Fusion -> ROS2 Odometry Publisher -> 3D Path Visualizer.",
    "resumeBullet": "Engineered an intelligent dead-reckoning navigation system suppressing IMU drift to <1.1% over 5km in GNSS-denied tunnels using PyTorch neural networks and Extended Kalman Filters."
  },
  {
    "id": "sih-26117-sovereign-ai-workbench",
    "psCode": "SIH26117",
    "roleId": "ai-engineer",
    "category": "software",
    "branch": "CSE / IT / AIML",
    "title": "Sovereign On-Premise Agentic AI Workbench Using Open-Weight Multimodal LLMs",
    "domain": "Smart Automation & Industrial AI",
    "organization": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "vLLM",
      "Llama-3-Vision",
      "Ollama",
      "LangGraph",
      "ChromaDB",
      "Docker"
    ],
    "overview": "Fully air-gapped, sovereign enterprise AI platform for confidential industrial work, executing multimodal reasoning across technical engineering drawings (P&IDs) and maintenance manuals.",
    "features": [
      "100% offline air-gapped deployment with zero external network connectivity or telemetry leaks",
      "vLLM high-throughput inference engine serving 4-bit quantized open-weight vision models",
      "LangGraph agentic workflow automating incident root-cause analysis from technical logs",
      "Enterprise role-based access control with AES-256 encrypted vector database partitions"
    ],
    "architectureSummary": "Air-Gapped Client -> NGINX Reverse Proxy -> LangGraph Orchestrator -> vLLM Llama-3-Vision Engine -> ChromaDB Encrypted Embeddings -> Local Audit Logger.",
    "resumeBullet": "Deployed a sovereign on-premise agentic AI platform running 8B quantized multimodal LLMs on local GPUs with zero cloud leakage, speeding up industrial incident analysis by 60%."
  },
  {
    "id": "sih-26123-edge-ai-fleet-coordination",
    "psCode": "SIH26123",
    "roleId": "sde",
    "category": "software",
    "branch": "CSE / ECE / Robotics",
    "title": "Edge-AI Distributed Fleet Coordination & Collision Avoidance for Autonomous Mobile Robots",
    "domain": "Smart Automation & Robotics",
    "organization": "Bharat Electronics Limited (BEL)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "C++",
      "ROS2 Humble",
      "Zenoh / MQTT",
      "React",
      "Docker"
    ],
    "overview": "Decentralized multi-robot orchestration platform coordinating 30+ warehouse AMRs with peer-to-peer discovery, space-time conflict resolution, and dynamic deadlock prevention.",
    "features": [
      "Decentralized peer-to-peer discovery using the lightweight Zenoh networking protocol",
      "Space-Time Conflict-Based Search (CBS) solving multi-agent path finding (MAPF) in real-time",
      "Dynamic replanning avoiding static obstacles and human pedestrians within 50ms",
      "Web-based 2D/3D digital twin warehouse floor dashboard monitoring battery and fleet status"
    ],
    "architectureSummary": "AMR Robot Nodes -> Zenoh P2P Mesh -> Conflict-Based Search Solver -> TEB Local Planner -> Central Fleet Digital Twin -> WebSocket Telemetry.",
    "resumeBullet": "Architected a distributed fleet coordination engine for 25+ autonomous mobile robots in ROS2 with sub-10ms collision negotiation and zero operational deadlocks."
  },
  {
    "id": "sih-26127-citywide-anpr-tracking",
    "psCode": "SIH26127",
    "roleId": "ai-engineer",
    "category": "software",
    "branch": "CSE / IT / ECE",
    "title": "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking & Urban Traffic Analytics",
    "domain": "Smart Automation & Computer Vision",
    "organization": "Bharat Electronics Limited (BEL)",
    "difficulty": "Advanced",
    "techStack": [
      "Python",
      "YOLOv10",
      "DeepSORT",
      "OpenCV",
      "Redis",
      "ClickHouse",
      "FastAPI"
    ],
    "overview": "High-throughput smart city traffic surveillance platform performing multi-camera automatic number plate recognition (ANPR), cross-camera trajectory re-identification, and congestion prediction.",
    "features": [
      "YOLOv10 object detector executing real-time license plate detection across skewed angles",
      "DeepSORT multi-camera re-identification tracking vehicle paths across city intersections",
      "Redis streaming buffer handling 20+ concurrent RTSP video streams at 30 FPS",
      "ClickHouse columnar database executing spatial trajectory queries in under 15ms"
    ],
    "architectureSummary": "RTSP Camera Matrix (30x) -> YOLOv10 Plate Detector -> DeepSORT ReID Tracker -> Redis Stream Buffer -> ClickHouse DB -> React City Traffic Map.",
    "resumeBullet": "Built a city-scale traffic intelligence engine processing 16 concurrent 1080p RTSP camera streams at 28 FPS with 98.1% license plate extraction accuracy using YOLOv10 and DeepSORT."
  },
  {
    "id": "sih-26112-amr-warehouse-robot",
    "psCode": "SIH26112",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Robotics / Mechanical / ECE / EEE",
    "title": "Modular Autonomous Mobile Robot (AMR) Platform for Smart Warehouse Automation",
    "domain": "Robotics & Hardware Automation",
    "organization": "Autodesk",
    "difficulty": "Advanced",
    "techStack": [
      "SolidWorks CAD",
      "3D Printing",
      "STM32 Nucleo",
      "Raspberry Pi 5",
      "RPLiDAR A1",
      "ROS2 Nav2"
    ],
    "overview": "An industrial modular autonomous mobile robot engineered with differential drive, closed-loop PID stepper motors, 2D LiDAR SLAM navigation, and an automated top payload lifter.",
    "features": [
      "Chassis designed in SolidWorks with laser-cut aluminum baseplate and 50kg load capacity",
      "STM32 microcontroller running real-time closed loop PID velocity control with optical encoders",
      "Raspberry Pi 5 running ROS2 Nav2 stack for autonomous 2D LiDAR SLAM and path planning",
      "Autonomous magnetic docking station with wireless inductive LiFePO4 battery charging"
    ],
    "architectureSummary": "RPLiDAR A1 + Wheel Encoders -> STM32 Motor Controller -> UART Bridge -> Raspberry Pi 5 (ROS2 Nav2 Stack) -> Dual Planetary DC Motors -> Wireless Charge Dock.",
    "resumeBullet": "Fabricated a 50kg-payload autonomous mobile robot chassis from scratch using SolidWorks, STM32 PID controllers, and 2D LiDAR SLAM, achieving sub-2cm localization accuracy in warehouse aisles."
  },
  {
    "id": "sih-26113-robotic-exoskeleton",
    "psCode": "SIH26113",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Biomedical / Mechanical / ECE / Mechatronics",
    "title": "Wearable Robotic Exoskeleton / Human Augmentation Mobility Assistive System",
    "domain": "MedTech & Rehabilitation Robotics",
    "organization": "Autodesk",
    "difficulty": "Advanced",
    "techStack": [
      "Carbon Fiber / AL-6061",
      "Harmonic Drive BLDC",
      "MyoWare sEMG",
      "IMU 6-DOF",
      "ESP32",
      "FreeRTOS"
    ],
    "overview": "Active motorized lower-limb orthotic exoskeleton detecting user movement intentions via surface electromyography (sEMG) muscle electrodes and providing powered knee torque assistance.",
    "features": [
      "Ergonomic carbon fiber thigh/shank braces with quick-release orthopedic ratchets (< 3.8 kg)",
      "MyoWare 2.0 muscle electrodes capturing quadriceps and hamstring microvolt action potentials",
      "ESP32 running FreeRTOS with sub-18ms intent-to-actuation response latency",
      "High-torque brushless DC motor with compact 50:1 harmonic gearhead delivering 35 Nm torque"
    ],
    "architectureSummary": "Surface EMG Electrodes + Knee IMU -> ESP32 FreeRTOS Controller -> Gated Recurrent Unit (GRU) Gait Classifier -> CAN Bus Motor Driver -> Harmonic BLDC Actuator.",
    "resumeBullet": "Designed an active robotic lower-limb assistive exoskeleton utilizing surface EMG sensors and harmonic BLDC actuators, delivering 30 Nm walking assistance with 16ms intention detection latency."
  },
  {
    "id": "sih-26118-h2s-dosimeter-wristband",
    "psCode": "SIH26118",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Chemical / ECE / Instrumentation",
    "title": "Passive Colorimetric H2S Exposure-Dosimeter Wristband with Edge-AI Optical Reading",
    "domain": "Smart Automation & Industrial Safety",
    "organization": "Mangalore Refinery and Petrochemicals Limited (MRPL)",
    "difficulty": "Advanced",
    "techStack": [
      "Lead Acetate Reagent Strips",
      "Silicone IP67",
      "ESP32-S3-CAM",
      "BLE 5.0",
      "TinyML Chromaticity"
    ],
    "overview": "Intrinsically safe wearable toxic gas dosimeter that absorbs airborne Hydrogen Sulfide (H2S) passively and quantitatively measures cumulative worker exposure using onboard optical TinyML.",
    "features": [
      "Zero-power passive chemical absorption: chemical strip darkens proportionally to ppm-hours",
      "Calibrated internal LED chamber with miniature camera capturing strip color coordinates",
      "TinyML polynomial regression calculating exact cumulative dosage in parts-per-million (ppm)",
      "Bluetooth Low Energy (BLE) beacon transmitting automated vibration alerts at 10 ppm threshold"
    ],
    "architectureSummary": "Airborne H2S Gas -> Chemical Paper Matrix (Color Shift) -> ESP32-S3 Optical Chamber -> TinyML Colorimetric Regression Model -> BLE Radio -> Industrial Gateway.",
    "resumeBullet": "Engineered an intrinsically safe H2S dosimeter wristband combining colorimetric reactive membranes with an ESP32-S3 optical chromaticity engine, measuring toxic exposure from 1-100 ppm with \u00b14% accuracy."
  },
  {
    "id": "sih-26020-solar-khadi-spinning",
    "psCode": "SIH26020",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Mechanical / EEE / Production / Rural Tech",
    "title": "Innovative Solar Hand-Spinning Equipment for Khadi Artisan Productivity Enhancement",
    "domain": "Agriculture & Rural Micro-Enterprise",
    "organization": "Ministry of MSME",
    "difficulty": "Intermediate",
    "techStack": [
      "SolidWorks",
      "12V 100W BLDC Motor",
      "LiFePO4 12V 20Ah",
      "Solar MPPT",
      "PWM Speed Controller",
      "OLED RPM"
    ],
    "overview": "Solar-electric motorized hybrid multi-spindle yarn spinning machine designed to eliminate physical musculoskeletal strain and triple daily wage income for rural hand-spinning artisans.",
    "features": [
      "Low-cost rigid steel tubular frame with precision sealed bearings to minimize friction losses",
      "100W monocrystalline rooftop solar panel with MPPT charging a 12V 20Ah lithium battery",
      "Smooth PWM variable-speed control knob with OLED screen displaying real-time spindle RPM and yarn count",
      "Dual-drive hybrid mechanism allowing manual foot pedal operation during monsoon / grid outages"
    ],
    "architectureSummary": "100W Solar PV Module -> MPPT Charge Controller -> 12V LiFePO4 Battery -> Microcontroller PWM Driver -> High-Torque BLDC Motor -> Spindle Pulley Train -> OLED Telemetry.",
    "resumeBullet": "Developed a solar-hybrid multi-spindle Khadi spinning machine increasing artisan daily yarn productivity by 280% with zero muscular fatigue and a continuous 8-hour solar battery runtime."
  },
  {
    "id": "sih-26022-solar-drying-vacuum-pack",
    "psCode": "SIH26022",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Mechanical / EEE / AgriTech / Mechatronics",
    "title": "Smart Solar-Powered Drying & Compact Vacuum Packaging Automation System",
    "domain": "Agriculture & Rural FoodTech",
    "organization": "Ministry of MSME",
    "difficulty": "Advanced",
    "techStack": [
      "Solar Thermal Air Collector",
      "12V Exhaust Blowers",
      "DHT22 / SHT31 Sensors",
      "Arduino / ESP32",
      "12V Vacuum Pump"
    ],
    "overview": "Integrated solar-assisted thermal drying chamber with automated humidity-controlled air dampers and an integrated compact vacuum impulse packaging station for rural home-based artisans.",
    "features": [
      "Parabolic solar air collector generating 45\u00b0C - 60\u00b0C dry air flow without electric heating elements",
      "Microcontroller-actuated exhaust servo dampers maintaining optimal 12% moisture equilibrium",
      "Compact automated vacuum pump evacuating oxygen to prevent mold and extend shelf life to 18 months",
      "Impulse heat sealing wire sealing pouches in 2.5 seconds with acoustic completion buzzer"
    ],
    "architectureSummary": "Solar Thermal Collector -> Forced Air Fans -> SHT31 Humidity Feedback -> ESP32 Damper Controller -> Automated Vacuum Chamber -> Thermal Sealing Bar.",
    "resumeBullet": "Designed an off-grid solar thermal drying and automated vacuum packaging machine for rural artisans, reducing product drying time by 82% while maintaining optimal 7% moisture equilibrium."
  },
  {
    "id": "sih-26025-mine-subsidence-warning",
    "psCode": "SIH26025",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "Mining / Civil / ECE / EEE / IoT",
    "title": "AI-Enabled Low-Cost Real-Time Mine Subsidence Monitoring & Early Warning System",
    "domain": "Smart Automation & Geotechnical Safety",
    "organization": "Ministry of Coal",
    "difficulty": "Advanced",
    "techStack": [
      "Dual-Axis MEMS Tilt Sensor",
      "Geophone Seismic Sensor",
      "LoRa SX1262 (868MHz)",
      "STM32 Low-Power",
      "Solar Harvester",
      "IP68 Enclosure"
    ],
    "overview": "Rugged wireless geotechnical sensor mesh deployed across surface terrain over underground coal mines to measure sub-millimeter ground displacement and issue automated early evacuation alerts.",
    "features": [
      "Ultra-sensitive dual-axis MEMS inclinometer detecting angular ground tilts down to 0.001 degrees",
      "Long-Range LoRa SX1262 mesh network transmitting telemetry across 12km without cellular towers",
      "Edge microcontroller running TinyML vibration isolation filtering out heavy surface truck traffic",
      "Solar energy harvester with supercapacitors enabling 5-year maintenance-free autonomous operation"
    ],
    "architectureSummary": "MEMS Tilt + Geophone Sensors -> STM32 Low-Power MCU -> LoRa Transceiver (868MHz) -> Surface Gateway Node -> Cloud Anomaly Model -> Automated Emergency Siren & SMS.",
    "resumeBullet": "Built a low-cost LoRa geotechnical sensor mesh for underground coal mine monitoring, detecting surface tilt variations down to 0.005\u00b0 and providing automated subsidence alerts 36 hours in advance."
  },
  {
    "id": "sih-26026-narcotics-explosives-sniffer",
    "psCode": "SIH26026",
    "roleId": "embedded-iot",
    "category": "hardware",
    "branch": "ECE / Robotics / Instrumentation / Chemical",
    "title": "Mobile Quadruped Robot / Handheld Chemical Sensor Device for Real-Time Narcotics & Explosives Detection",
    "domain": "Homeland Security & Defense Robotics",
    "organization": "Ministry of Railways",
    "difficulty": "Advanced",
    "techStack": [
      "MOS Gas Sensor Array",
      "PID Photoionization Sensor",
      "Air Sampling Pump",
      "Jetson Orin Nano",
      "12-DOF Quadruped",
      "FLIR Thermal"
    ],
    "overview": "Autonomous robotic chemical detection sniffer utilizing an electronic nose array of metal-oxide sensors to sample atmospheric air and identify trace vapor signatures of explosives and narcotics.",
    "features": [
      "Active micro-diaphragm air intake pump drawing continuous air stream across heated sensor chamber",
      "Multi-channel chemical sensor array sensitive to RDX, TNT, Ammonium Nitrate, and opiate vapors",
      "Jetson Orin Nano running 1D-Convolutional Neural Network classifying chemical fingerprints in < 4 seconds",
      "Autonomous patrol mobility mounted on a 12-DOF robotic quadruped navigating railway platforms"
    ],
    "architectureSummary": "Air Sniffer Micro-Pump -> Multi-Channel Chemical Sensor Chamber -> 16-Bit ADC Digitizer -> Jetson Nano 1D-CNN Fingerprint Classifier -> Audio/Visual Alert -> RPF Control Room Stream.",
    "resumeBullet": "Engineered a robotic chemical sniffer platform for railway security detecting trace explosive and narcotic vapors down to 2 ppm within 3.5 seconds using a MOS sensor array and Jetson Orin Nano CNN inference."
  }
];
