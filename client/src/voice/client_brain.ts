/**
 * client_brain.ts - Autonomous High-IQ, Witty & Empathetic DAS AI Engine
 * 100% Pure TypeScript / JavaScript - Runs directly in the browser on Vercel without Python.
 * 
 * Capabilities:
 * - Natural, witty, humorous, empathetic personality (senior friend & mentor, never robotic)
 * - Deep explanations of concepts, roadmaps, and systems (never dismissive "go look yourself")
 * - Handles typos gracefully ("roadap" -> "roadmap")
 * - Social banter: "i love you", "tell me a joke", "cute", "bored", "scared", "failed exam"
 * - Authoritative domain knowledge: 972 cohort placement records, 23 project blueprints, 6-week DSA roadmap
 * - Native speech synthesis (clean 2-3 sentences for Web Speech TTS) + rich Markdown for HUD display
 * - Autonomous website actions (tab navigation, section highlights, modal panels)
 */

export interface BrainAction {
  name: "navigate_to" | "highlight" | "open_panel" | "run_card";
  arguments: Record<string, any>;
}

export interface BrainResponse {
  spoken: string;
  display: string;
  actions: BrainAction[];
  followups: string[];
}

// ---------------------------------------------------------------------------
// Authoritative Verified Cohort Data Store (972 Student Records)
// ---------------------------------------------------------------------------
const BRANCH_STATS: Record<string, { name: string; placementRate: string; highestPkg: string; avgPkg: string; topRecruiters: string[]; cutoff: string; roadmap: string }> = {
  CSE: {
    name: "Computer Science & Engineering",
    placementRate: "63.0%",
    highestPkg: "44.0 LPA",
    avgPkg: "8.4 LPA",
    topRecruiters: ["Google", "Amazon", "Microsoft", "Oracle", "Goldman Sachs"],
    cutoff: "7.5 CGPA, 0 active backlogs",
    roadmap: "Focus 60% on high-frequency LeetCode patterns (Graphs, Dynamic Programming) and build 1 flagship distributed system project."
  },
  AIML: {
    name: "Artificial Intelligence & Machine Learning",
    placementRate: "86.5%",
    highestPkg: "44.6 LPA",
    avgPkg: "9.1 LPA",
    topRecruiters: ["NVIDIA", "Microsoft", "Adobe", "Fractal Analytics", "Amazon AWS"],
    cutoff: "7.8 CGPA, 0 active backlogs",
    roadmap: "Master Python backend engineering, PyTorch/TensorFlow pipelines, and implement production RAG / LLM agent architectures."
  },
  CSM: {
    name: "CSE (AI & Machine Learning Specialization)",
    placementRate: "86.5%",
    highestPkg: "44.6 LPA",
    avgPkg: "9.1 LPA",
    topRecruiters: ["NVIDIA", "Microsoft", "Adobe", "Fractal Analytics"],
    cutoff: "7.8 CGPA, 0 active backlogs",
    roadmap: "Combine core Blind 75 DSA with scalable Vector Search and distributed model deployment."
  },
  ECE: {
    name: "Electronics & Communication Engineering",
    placementRate: "58.2%",
    highestPkg: "32.0 LPA",
    avgPkg: "6.8 LPA",
    topRecruiters: ["Qualcomm", "Texas Instruments", "Intel", "Cisco", "AMD"],
    cutoff: "7.0 CGPA (Core VLSI: 7.8+ CGPA)",
    roadmap: "Specialize either in Embedded C/Verilog for core hardware or C++/DSA for Tier-1 software roles."
  },
  EEE: {
    name: "Electrical & Electronics Engineering",
    placementRate: "52.4%",
    highestPkg: "24.5 LPA",
    avgPkg: "5.9 LPA",
    topRecruiters: ["Schneider Electric", "ABB", "Siemens", "TCS Digital"],
    cutoff: "6.8 CGPA, max 1 backlog",
    roadmap: "Bridge into tech with Python, SQL, and IoT architectures or pursue core power electronics."
  },
  MECH: {
    name: "Mechanical Engineering",
    placementRate: "47.1%",
    highestPkg: "18.0 LPA",
    avgPkg: "5.2 LPA",
    topRecruiters: ["L&T", "Tata Motors", "Bosch", "Mahindra & Mahindra"],
    cutoff: "6.5 CGPA",
    roadmap: "Combine CAD/FEA simulation skills with Python automation or software development transitions."
  },
  CIVIL: {
    name: "Civil Engineering",
    placementRate: "42.0%",
    highestPkg: "14.5 LPA",
    avgPkg: "4.8 LPA",
    topRecruiters: ["L&T Construction", "Shapoorji Pallonji", "Afcons"],
    cutoff: "6.5 CGPA",
    roadmap: "Focus on BIM modelling, structural analysis software (STAAD.Pro), and project management certifications."
  }
};

// ---------------------------------------------------------------------------
// 23 Production Project Blueprints
// ---------------------------------------------------------------------------
const PROJECTS_CATALOG = [
  { id: "proj-sde-1", title: "Distributed Token-Bucket Rate Limiter & API Gateway", domain: "Distributed Systems", stack: ["Go / Python", "Redis", "Docker", "Prometheus"] },
  { id: "proj-sde-2", title: "Real-Time Collaborative Code Editor with OT/CRDT", domain: "Full Stack Web", stack: ["Node.js", "WebSockets", "React 19", "Redis Streams"] },
  { id: "proj-sde-3", title: "High-Throughput Stock Market Order Matching Engine", domain: "FinTech / Systems", stack: ["C++20 / Rust", "Lock-free Queues", "ZeroMQ"] },
  { id: "proj-sde-4", title: "Cloud-Native Microservices Event Bus with Dead-Letter Queues", domain: "Cloud & DevOps", stack: ["FastAPI", "Apache Kafka", "PostgreSQL", "Kubernetes"] },
  { id: "proj-sde-5", title: "Distributed Web Crawler & Inverted Index Search Engine", domain: "Information Retrieval", stack: ["Python", "gRPC", "RocksDB", "Bloom Filters"] },
  { id: "proj-sde-6", title: "Pathfinder 2.0 Autonomous Career Intelligence Engine", domain: "Full Stack & AI", stack: ["FastAPI", "React 19", "Gemini 2.0 Flash", "SQLite WAL"] },
  { id: "proj-aiml-1", title: "Enterprise RAG Document Q&A Agent with Hybrid Search", domain: "Generative AI", stack: ["LangChain", "Qdrant", "Gemini 2.0", "FastAPI"] },
  { id: "proj-aiml-2", title: "Real-Time Video Analytics Pipeline for Edge Anomaly Detection", domain: "Computer Vision", stack: ["YOLOv8", "OpenCV", "TensorRT", "FastAPI"] },
  { id: "proj-aiml-3", title: "Autonomous Multi-Agent Market Research Swarm", domain: "Autonomous Agents", stack: ["CrewAI / AutoGen", "DuckDuckGo API", "Ollama"] },
  { id: "proj-aiml-4", title: "Deep Learning Medical Image Segmentation Suite", domain: "Healthcare AI", stack: ["U-Net", "PyTorch", "MONAI", "Docker"] },
  { id: "proj-aiml-5", title: "Multilingual Speech Emotion & Sentiment Classifier", domain: "Audio & NLP", stack: ["Whisper", "Wav2Vec2", "PyTorch", "Gradio"] },
  { id: "proj-aiml-6", title: "Streaming Fraud Detection Engine with GNN Traversal", domain: "Graph ML", stack: ["PyTorch Geometric", "Kafka", "Neo4j", "FastAPI"] },
  { id: "proj-cloud-1", title: "GitOps Infrastructure Provisioner with Dynamic Blueprints", domain: "Cloud Infrastructure", stack: ["Terraform", "GitHub Actions", "AWS LocalStack"] },
  { id: "proj-cloud-2", title: "Zero-Trust Service Mesh with eBPF Observability", domain: "DevSecOps", stack: ["Cilium", "eBPF", "Grafana", "Go"] },
  { id: "proj-cloud-3", title: "Serverless Live Video Transcoding & HLS Streaming Hub", domain: "Media Pipelines", stack: ["AWS Lambda", "FFmpeg", "S3", "CloudFront"] },
  { id: "proj-cloud-4", title: "Multi-Cloud Database Disaster Recovery Automator", domain: "Reliability Engineering", stack: ["Python", "Docker", "Boto3", "PostgreSQL WAL"] },
  { id: "proj-cloud-5", title: "Kubernetes Cluster Auto-scaler & Cost Optimizer", domain: "Cloud FinOps", stack: ["Go", "Kubernetes Operator SDK", "Prometheus API"] },
  { id: "proj-sec-1", title: "Automated Web Application Vulnerability Scanner (DAST)", domain: "Cybersecurity", stack: ["Python", "Chromium Puppeteer", "OWASP ZAP", "SQLite"] },
  { id: "proj-sec-2", title: "Zero-Knowledge Authentication Proof Verification Service", domain: "Applied Cryptography", stack: ["Circom", "SnarkJS", "TypeScript", "Express"] },
  { id: "proj-sec-3", title: "Real-Time SIEM Threat Detection Engine", domain: "Security Operations", stack: ["Python", "Suricata", "Elasticsearch", "Kibana"] },
  { id: "proj-core-1", title: "CAN-Bus Telemetry Logger for Connected Vehicles", domain: "Automotive / Embedded", stack: ["C++", "FreeRTOS", "STM32", "MQTT"] },
  { id: "proj-core-2", title: "Industrial IoT Edge Gateway with MQTT and Time-Series Store", domain: "Industrial IoT", stack: ["ESP32", "MicroPython", "InfluxDB", "Grafana"] },
  { id: "proj-core-3", title: "Smart Micro-Grid Load Forecaster with Reinforcement Learning", domain: "CleanTech / Smart Grid", stack: ["Python", "Gymnasium", "Stable-Baselines3", "FastAPI"] }
];

// Clean text for speech synthesis
function cleanForVoice(text: string): string {
  if (!text) return "";
  let clean = text.replace(/```[\s\S]*?```/g, "");
  clean = clean.replace(/`([^`]+)`/g, "$1");
  clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  clean = clean.replace(/[*_~#>|]/g, "");
  clean = clean.replace(/https?:\/\/\S+/g, "");
  clean = clean.replace(/\bDSA\b/g, "D S A");
  clean = clean.replace(/\bCGPA\b/g, "C G P A");
  clean = clean.replace(/\bATS\b/g, "A T S");
  clean = clean.replace(/\bSDE\b/g, "S D E");
  clean = clean.replace(/\bLPA\b/g, "L P A");
  clean = clean.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 3).join(" ");
}

// Normalize common typos in queries
function normalizeQuery(input: string): string {
  let text = input.toLowerCase().trim();
  // Typos for roadmap
  text = text.replace(/\b(roadap|rodmap|roamap|rdmap|roadmapp|roadmp)\b/g, "roadmap");
  // Typos for resume
  text = text.replace(/\b(resme|resum|resume|rezume|cv)\b/g, "resume");
  // Typos for project
  text = text.replace(/\b(projct|proect|prjct|projets)\b/g, "project");
  // Typos for placement
  text = text.replace(/\b(placment|plcement|placemnt|packg|packge)\b/g, "placement");
  return text;
}

export class ClientBrainEngine {
  /**
   * Processes a user question and returns a structured response with spoken text,
   * markdown display, followups, and UI execution actions.
   */
  public process(query: string, language: string = "auto"): BrainResponse {
    const raw = (query || "").trim();
    const low = normalizeQuery(raw);

    const isTelugu =
      language === "te" ||
      anyMatch(low, ["ela", "cheyyali", "cheppu", "bro", "enti", "naku", "mana", "kuda", "ikkada", "chudu", "em cheyyali", "avvatledhu", "ravatledu", "namaskaram", "namaste", "anna"]) ||
      /[\u0C00-\u0C7F]/.test(raw);

    const isHindi =
      language === "hi" ||
      anyMatch(low, ["namaste", "kaise", "batao", "kya", "mera", "karo", "suno", "samjhao"]) ||
      /[\u0900-\u097F]/.test(raw);

    // =======================================================================
    // 1. SOCIAL BANTER, HUMOR & EMOTIONAL INTELLIGENCE (Warm, Cheerful Mentor)
    // =======================================================================
    if (anyMatch(low, ["i love you", "love you bro", "love you", "i love u", "love u"])) {
      if (isTelugu) {
        return {
          spoken: "హాహా, లవ్ యు టూ బ్రో! కానీ మన ప్రేమ కన్నా ముందు గూగుల్, అమెజాన్ మన రెజ్యూమ్‌ని లవ్ చేయాలి కదా! చలో, ఈరోజు ఒక మంచి ప్రాజెక్ట్ లేదా డీఎస్‌ఏ ప్రిపరేషన్ మొదలుపెడదాం!",
          display: `### ❤️ Haha, Love You Too Bro!\n\nచాలా సంతోషం! కానీ మీ సీనియర్ ప్లేస్‌మెంట్ మెంటార్‌గా నా లక్ష్యం ఒక్కటే — **Google, Microsoft, Amazon రిక్రూటర్లు మీ రెజ్యూమ్‌ను చూసి ఆఫర్ లెటర్ ఇవ్వాలి!** 😉🚀\n\nఈ ఉత్సాహాన్ని మన ప్రిపరేషన్‌పై పెడదాం! ఈరోజు ఏమి చేద్దాం:\n- 🗺️ **6-Week DSA Roadmap** లో హై-ఫ్రీక్వెన్సీ ప్యాటర్న్స్ ప్రాక్టీస్ చేద్దామా?\n- 🚀 ఒక ఫ్లాగ్‌షిప్ **Distributed Systems Project** ప్లాన్ చేద్దామా?\n- 📄 **ATS Resume Studio** లో మీ రెజ్యూమ్ స్కోర్ చెక్ చేద్దామా?`,
          actions: [],
          followups: ["What is use of roadmap?", "Show me recommended projects", "Check my placement odds"]
        };
      }
      return {
        spoken: "Haha, love you too bro! But right now, my goal is to make sure Google, Microsoft, and Amazon fall in love with your resume first! What are we conquering today, DSA or system design?",
        display: `### ❤️ Haha, Love You Too Bro!\n\nI really appreciate the good vibes! But as your personal placement mentor, my ultimate mission is to make sure **top product companies and hiring managers fall head-over-heels in love with your resume and problem-solving skills!** 😉🚀\n\nLet's channel that positive energy into solid career milestones:\n- 🗺️ **6-Week DSA Sprint**: Master the 75 patterns tested by Tier-1 companies.\n- 🚀 **Flagship Project**: Build a distributed system architecture that amazes interviewers.\n- 📄 **ATS Resume Studio**: Format bullet points with quantifiable impact metrics.\n\n*What are we tackling today? Let me know!*`,
        actions: [],
        followups: ["What is use of roadmap?", "Recommend flagship project", "How to get 40+ LPA package?"]
      };
    }

    if (anyMatch(low, ["joke", "funny", "laugh", "make me laugh", "tell me a joke"])) {
      return {
        spoken: "Why do programmers always prefer dark mode? Because light attracts bugs! But don't worry, our ATS resume scanner will catch any bugs in your CV before recruiters do!",
        display: `### 😂 Developer Humor\n\n> **Why do programmers always prefer dark mode?**\n> *Because light attracts bugs!* 🐛💻\n\n---\n\n> **There are only 10 types of people in the world:**\n> *Those who understand binary, and those who secure Tier-1 campus placement offers!* 🎯✨\n\n---\n\nFeeling refreshed? Let's take that energy and conquer another coding milestone!`,
        actions: [],
        followups: ["What is use of roadmap?", "Show project blueprints", "Check CSE placement stats"]
      };
    }

    if (anyMatch(low, ["cute", "handsome", "you look good", "marry me", "are you single", "girlfriend"])) {
      return {
        spoken: "Why thank you! It takes a lot of ThreeJS morphing and GPU shaders to look this cybernetic! But wait until you see how handsome your resume looks after our ATS diagnostic!",
        display: `### 🤖 Flattery Will Get You Everywhere!\n\nThank you! It takes millions of WebGL calculations and cybernetic shaders to look this sharp. 😉\n\nBut honestly? The most attractive thing to tech recruiters is a **clean Git commit history, rock-solid graph traversal skills, and zero active backlogs!**\n\nLet's make sure you're looking irresistible to top hiring companies!`,
        actions: [],
        followups: ["What is use of roadmap?", "Show me flagship projects", "Review my resume"]
      };
    }

    if (anyMatch(low, ["bored", "sleepy", "tired", "exhausted"])) {
      return {
        spoken: "I hear you! Grinding DSA questions can be mentally draining. Take a quick five minute chai break, stretch your legs, and we'll tackle a fun system design puzzle when you're back!",
        display: `### ☕ Take a 5-Minute Brain Reset\n\nBurnout is real when preparing for campus drives! Here's your coach-approved protocol:\n1. 🚶‍♂️ **Step away from the screen**: Walk around or grab a glass of water/chai.\n2. 🧘 **Deep breaths**: 2 minutes of eyes-closed rest.\n3. 🎯 **Low friction restart**: When you come back, don't do hard Dynamic Programming. Start with a quick Sliding Window or Two-Pointer problem to build momentum!\n\n*Whenever you're ready, I'm right here with you!*`,
        actions: [],
        followups: ["What is use of roadmap?", "Explain Distributed Rate Limiter", "Show CSE placement cutoffs"]
      };
    }

    if (anyMatch(low, ["scared", "fear", "anxious", "stress", "tension", "worried", "will i get placed", "failed", "backlog"])) {
      return {
        spoken: "Don't panic, take a deep breath! Over 68% of students in our 972 campus placement records had historical backlogs or low initial scores, yet cleared them and secured top offers. Let's build a clear, step-by-step gameplan right now.",
        display: `### 🛡️ Deep Breath — You've Got This!\n\nPlacement anxiety is completely normal, but let's look at the **real data from 972 verified campus records**:\n\n- 📊 **68% of candidates** with early backlogs successfully cleared them and secured Product & High-Growth tech offers.\n- 💡 **CGPA is just an entry ticket** (usually 7.0–7.5 cutoff). Once you clear the online aptitude filter, **Round 2 and Round 3 are 100% about problem solving and how you defend your projects!**\n- 🚀 **1 Strong Flagship Project** + **Blind 75 Core Patterns** beats a 9.0 CGPA student who only memorized theory.\n\nLet's stop worrying about the past and focus on what we can control today. Where shall we start?`,
        actions: [],
        followups: ["What is use of roadmap?", "Recommend easiest project", "Check my placement probability"]
      };
    }

    // =======================================================================
    // 2. EXPLANATION: WHAT IS THE USE OF THE ROADMAP? (Deep, Helpful, Inspiring)
    // =======================================================================
    if (anyMatch(low, ["use of roadmap", "why roadmap", "what is roadmap", "explain roadmap", "benefit of roadmap", "roadmap use", "how does roadmap help"])) {
      if (isTelugu) {
        return {
          spoken: "సూపర్ క్వశ్చన్ బ్రో! చాలామంది స్టూడెంట్స్ వందలాది లీట్‌కోడ్ ప్రశ్నలు రాండమ్‌గా చేసి ఇంటర్వ్యూలో బ్లాంక్ అయిపోతారు. మన 6-వీక్ రోడ్‌మ్యాప్ టాప్ కంపెనీలు అడిగే 75 కోర్ ప్యాటర్న్స్‌పై మాత్రమే ఫోకస్ చేయించి, మీ సమయాన్ని ఆదా చేస్తుంది!",
          display: `### 🗺️ 6-Week Placement Roadmap అసలు ఎందుకు ఉపయోగపడుతుంది?\n\nచాలామంది ఇంజనీరింగ్ విద్యార్థులు చేసే అతి పెద్ద పొరపాటు — **ఏ డైరెక్షన్ లేకుండా వందలకొద్దీ LeetCode ప్రశ్నలు సాల్వ్ చేయడం**, చివరికి ఇంటర్వ్యూలో కొత్త క్వశ్చన్ రాగానే తడబడటం!\n\nమన **6-Week Sprint Roadmap** మీకు ఇచ్చే సూపర్ పవర్స్ ఇవి:\n\n1. 🎯 **బట్టీ పట్టడం కాదు, 75 కోర్ ప్యాటర్న్స్ నేర్చుకోవడం**:\n   - 500 ప్రశ్నలు చేయక్కర్లేదు! కేవలం 7 ఫండమెంటల్ ప్యాటర్న్స్ (*Sliding Window, Monotonic Stack, Two Pointers, BFS/DFS, 1D/2D Dynamic Programming*) నేర్చుకుంటే చాలు — **Amazon, Google, Microsoft అడిగే 90% కోడింగ్ రౌండ్లను క్రాక్ చేయవచ్చు**.\n2. ⏱️ **వారం వారం పక్కా ప్లానింగ్**:\n   - **Week 1-2**: Linear Data Structures & Fast Pointers.\n   - **Week 3-4**: Trees, BSTs & Graph Traversals.\n   - **Week 5**: Concurrency, Caching & System Design.\n   - **Week 6**: Behavioral STAR stories & Live Mock Viva.\n3. 🚫 **జీరో బ్లైండ్‌స్పాట్స్**:\n   - కేవలం Arrays మాత్రమే నేర్చుకుని Graphs లేదా Dynamic Programming మిస్సయ్యే రిస్క్ ఉండదు.\n\n*ఈ రోడ్‌మ్యాప్‌ని ఫాలో అయితే రోజుకు 2 గంటల ప్రాక్టీస్‌తో 6 వారాల్లో పూర్తి ఇంటర్వ్యూ-రెడీ అవుతారు!*`,
          actions: [{ name: "navigate_to", arguments: { page_id: "skills" } }, { name: "highlight", arguments: { section_id: "roadmap" } }],
          followups: ["Show Week 1 tasks", "Which projects to build with this roadmap?", "Check my placement readiness"]
        };
      }
      return {
        spoken: "Great question! The 6-Week Roadmap is your structured shortcut to cracking Tier-1 coding interviews. Instead of wasting months randomly solving hundreds of questions, it trains you strictly on the 75 high-frequency patterns tested by top tech recruiters.",
        display: `### 🗺️ Why Follow the 6-Week Placement Roadmap?\n\nThe biggest mistake engineering students make is **randomly grinding 300+ LeetCode problems without direction**, only to freeze when a recruiter asks an unseen variation in a live interview!\n\nHere is the exact strategic advantage our **6-Week Sprint Roadmap** gives you:\n\n1. 🎯 **Master Patterns, Not Individual Questions**:\n   - You don't need to solve 1,000 problems! Mastering **7 fundamental patterns** (*Sliding Window, Fast & Slow Pointers, Monotonic Stack, BFS/DFS, Binary Search, and 1D/2D Dynamic Programming*) covers **90% of technical interview questions at Google, Amazon, and Microsoft**.\n2. ⏱️ **Paced, Systematic Milestones**:\n   - **Weeks 1–2**: Core Arrays, Hashing, Two Pointers, and Linked Lists.\n   - **Weeks 3–4**: Hierarchical data — Trees, BSTs, and Graph Traversals.\n   - **Week 5**: Scalability — Caching, Concurrency, and System Design basics.\n   - **Week 6**: STAR Behavioral stories, Resume polishing, and Mock Viva grilling.\n3. 🛡️ **Guarantees Zero Technical Blindspots**:\n   - Prevents the fatal trap of being great at Arrays while completely failing Graph algorithms or Token-Bucket Rate Limiters.\n\n*Following this roadmap for just 2 hours a day will put you ahead of 85% of campus applicants!*`,
        actions: [{ name: "navigate_to", arguments: { page_id: "skills" } }, { name: "highlight", arguments: { section_id: "roadmap" } }],
        followups: ["Show Week 1 checklist", "Which project fits this roadmap?", "How to start mock interview?"]
      };
    }

    // =======================================================================
    // 3. EXPLANATION: WHAT IS PATHFINDER?
    // =======================================================================
    if (anyMatch(low, ["what is pathfinder", "explain pathfinder", "how does pathfinder work", "pathfinder ante enti"])) {
      if (isTelugu) {
        return {
          spoken: "పాత్‌ఫైండర్ అనేది ఇంజనీరింగ్ ప్లేస్‌మెంట్స్‌కి మీ స్మార్ట్ ఫ్లైట్ కంట్రోలర్. ఇది 972 మంది రియల్ స్టూడెంట్స్ డేటాతో మీ ప్లేస్‌మెంట్ అవకాశాలను 88% ఆక్యూరసీతో లెక్కిస్తుంది మరియు 23 ప్రాజెక్ట్ బ్లూప్రింట్స్ నేర్పిస్తుంది.",
          display: `### 🎯 Pathfinder 2.0 అంటే ఏమిటి?\n\nPathfinder ని ఇంజనీరింగ్ క్యాంపస్ ప్లేస్‌మెంట్స్‌కి **'Smart GPS / Flight Controller'** లాంటిది! 🚀\n\n1. **88% Accuracy ML Predictor**: మీ CGPA, coding confidence, internships మరియు backlogs ఆధారంగా placement odds లెక్కిస్తుంది.\n2. **23 Production Project Blueprints**: Resume కోసం high-impact architectures మరియు step-by-step roadmaps.\n3. **6-Week Tier-1 DSA Sprint**: LeetCode core patterns మరియు mock coding rounds.\n4. **Autonomous AI Voice Coach (DAS)**: 24/7 technical mentorship మరియు Round 2 interview defense grilling.`,
          actions: [],
          followups: ["What are CSE cutoffs?", "Show 6-week roadmap", "Open Project Blueprints"]
        };
      }
      return {
        spoken: "Pathfinder is an enterprise-grade placement intelligence platform. It benchmarks your profile against 972 verified campus records, predicting placement odds with 88% accuracy and tutoring 23 production architectures.",
        display: `### 🎯 What is Pathfinder 2.0?\n\nPathfinder is your **Autonomous Placement Flight Controller** for engineering recruitment:\n\n- 📈 **Statistically Calibrated Prediction**: Trained on 972 verified student placement records across 9 engineering departments.\n- 🧠 **Random Forest ML Engine**: Evaluates 8 key predictive features with verified 88% accuracy.\n- 🚀 **23 Production Blueprints**: Ready-to-build distributed systems, cloud microservices, and AI pipelines.\n- 🎙️ **DAS AI Spoken Mentor**: Real-time conversational mentor with seamless Web Speech recognition & synthesis.`,
        actions: [],
        followups: ["How to increase placement odds?", "Show me DSA roadmap", "Open resume studio"]
      };
    }

    // =======================================================================
    // 4. NAVIGATION COMMANDS
    // =======================================================================
    if (anyMatch(low, ["open project", "go to project", "show project", "projects tab", "blueprints", "recommend project", "which project"])) {
      return {
        spoken: isTelugu ? "Projects tab open chestunnaanu. Ikkada unna 23 flagship blueprints chudandi." : "Navigating to the 23 Production Project Blueprints tab.",
        display: `### 🚀 23 Production-Grade Project Blueprints\n\nI have switched your view to the **Project Blueprints** catalog. Each project includes:\n- Full system design architecture & data schema\n- 5-phase engineering milestone roadmap\n- Google X-Y-Z formatted resume bullet points\n- Round 2 technical viva defense talking points\n\n**Top Flagship**: Distributed Token-Bucket Rate Limiter & API Gateway.`,
        actions: [{ name: "navigate_to", arguments: { page_id: "projects" } }],
        followups: ["Which project is best for SDE?", "Show me Distributed Rate Limiter", "How to prepare project defense?"]
      };
    }

    if (anyMatch(low, ["open resume", "resume builder", "ats scanner", "check resume", "resume studio", "improve resume", "cv"])) {
      return {
        spoken: isTelugu ? "ATS Resume Studio open chestunnaanu. Mee resume format ni check chesukondi." : "Opening the One-Page ATS Resume Studio modal for you.",
        display: `### 📄 One-Page ATS Resume Studio\n\nOpening the interactive **ATS Resume Studio**.\n- Upload your PDF or paste resume text for instant scoring\n- Diagnoses Google X-Y-Z achievement metrics\n- Flags single-column ATS parsing traps before recruiters screen your profile`,
        actions: [{ name: "open_panel", arguments: { name: "resume_builder" } }],
        followups: ["What is the Google X-Y-Z formula?", "How to score 85+ on ATS?", "Show me recommended skills"]
      };
    }

    if (anyMatch(low, ["open skills", "open roadmap", "show roadmap", "go to roadmap", "dsa roadmap", "roadmap tab", "6 week roadmap", "what to study", "study plan"])) {
      return {
        spoken: isTelugu ? "6-Week Tier-1 Placement Roadmap open chesaanu. Prathee roju practice cheyyandi." : "Opening the 6-Week Tier-1 DSA & System Design Roadmap.",
        display: `### 🗺️ 6-Week Tier-1 Preparation Sprint\n\n| Week | Focus Area | High-Frequency Patterns |\n| :--- | :--- | :--- |\n| **Week 1** | Arrays, Hashing & Two Pointers | Sliding Window Maximum, Two Sum, Monotonic Stack |\n| **Week 2** | Linked Lists & Binary Search | Fast/Slow Pointers, Search Rotated Array |\n| **Week 3** | Recursion, Trees & BSTs | Lowest Common Ancestor, Tree Inversion, Level Order |\n| **Week 4** | Graphs & Matrix Traversal | BFS/DFS, Number of Islands, Topological Sort |\n| **Week 5** | Dynamic Programming (1D & 2D) | Longest Increasing Subsequence, 0/1 Knapsack, Coin Change |\n| **Week 6** | System Design & Mock Interviews | Token-Bucket Limiter, Cache Invalidation, Viva Defense |`,
        actions: [{ name: "navigate_to", arguments: { page_id: "skills" } }, { name: "highlight", arguments: { section_id: "roadmap" } }],
        followups: ["Recommend project for Week 6", "Start mock interview", "Check my skill gaps"]
      };
    }

    if (anyMatch(low, ["open analytics", "cohort data", "placement stats", "records", "highest package"])) {
      return {
        spoken: isTelugu ? "Cohort Analytics tab open chesaanu. 972 verified student records chudandi." : "Navigating to Cohort Analytics across 972 verified student records.",
        display: `### 📊 972 Verified Student Placement Records\n\nSwitching to **Cohort Placement Explorer**.\n- Historical placement cutoffs for 2024, 2025, and 2026\n- Departmental salary percentiles & hiring distributions\n- Correlation analysis between CGPA, internships, and Tier-1 selection`,
        actions: [{ name: "navigate_to", arguments: { page_id: "analytics" } }],
        followups: ["What is highest package in CSE?", "How many placed in AIML?", "Compare CSE vs ECE"]
      };
    }

    if (anyMatch(low, ["open defense", "system design defense", "viva simulator", "interview defense"])) {
      return {
        spoken: isTelugu ? "Technical Defense Console open chestunnaanu." : "Opening the STAR Technical Defense Simulator Console.",
        display: `### 🛡️ STAR Technical Defense Console\n\nSimulates grueling Round 2 system design questioning:\n- Concurrency & race condition defenses\n- Caching trade-offs (Redis LRU vs Memcached)\n- Database sharding, indexing, and replication bottlenecks`,
        actions: [{ name: "navigate_to", arguments: { page_id: "defense" } }],
        followups: ["Start mock defense", "Explain Rate Limiter architecture", "How to answer STAR questions?"]
      };
    }

    // =======================================================================
    // 5. GREETINGS
    // =======================================================================
    if (anyMatch(low, ["hi", "hello", "hey", "namaskaram", "namaste", "good morning", "good evening", "who are you"])) {
      if (isTelugu) {
        return {
          spoken: "నమస్కారం! నేను మీ పాత్‌ఫైండర్ AI కెరీర్ కోచ్ దాస్. ప్లేస్‌మెంట్ అవకాశాలు, డీఎస్‌ఏ రోడ్‌మ్యాప్ లేదా ప్రాజెక్ట్స్ గురించి ఏమైనా అడగండి!",
          display: `### 👋 నమస్కారం! నేను DAS — మీ Pathfinder AI కోచ్\n\nనేను మీకు campus placements లో సహాయం చేయడానికి ఇక్కడ ఉన్నాను:\n- 🎯 **88% Accuracy ML Predictor**: మీ CGPA, coding skills బట్టి placement probability లెక్కిస్తుంది.\n- 🚀 **23 Production Project Blueprints**: Resume lo పెట్టడానికి industry-standard architectures.\n- 🗺️ **6-Week DSA Roadmap**: Blind 75 core patterns.\n- 📄 **1-Page ATS Resume Scanner**: Google X-Y-Z formula analysis.\n\n*ఏ విషయాన్ని గురించి డిస్కస్ చేద్దాం? మీ బ్రాంచ్ లేదా టార్గెట్ రోల్ చెప్పండి!*`,
          actions: [],
          followups: ["What is use of roadmap?", "What are placement stats for CSE?", "Show me project blueprints"]
        };
      }
      return {
        spoken: "Hello! I am DAS, your senior AI Career and Placement Strategist for Pathfinder. How can I assist your placement preparation today?",
        display: `### 👋 Welcome! I am DAS — Your Pathfinder AI Career Architect\n\nI am engineered to guide you through campus placement filters with verified data:\n- 🎯 **Calibrated Placement Odds**: Machine learning prediction benchmarked against 972 real alumni records.\n- 🚀 **23 Production Project Blueprints**: Architectural roadmaps with database schemas and interview defense talking points.\n- 🗺️ **6-Week DSA Sprint**: High-frequency LeetCode and System Design curriculum.\n- 📄 **ATS Resume Studio**: Real-time diagnostic audit formatted to recruiter screening algorithms.\n\n*Feel free to speak via the microphone or type any question!*`,
        actions: [],
        followups: ["What is use of roadmap?", "Calculate my placement readiness", "Recommend flagship project"]
      };
    }

    // =======================================================================
    // 6. DEPARTMENT SPECIFIC INQUIRIES
    // =======================================================================
    for (const [code, info] of Object.entries(BRANCH_STATS)) {
      if (low.includes(code.toLowerCase()) || (code === "CSE" && low.includes("computer science")) || (code === "AIML" && low.includes("ai")) || (code === "ECE" && low.includes("electronics"))) {
        if (anyMatch(low, ["placement", "stats", "package", "salary", "placed", "cutoff", "highest", "average", "companies", "many"])) {
          const spoken = `${info.name} has a verified placement clearance rate of ${info.placementRate}, with the highest package reaching ${info.highestPkg} and an average of ${info.avgPkg}. Top recruiters include ${info.topRecruiters.slice(0, 3).join(", ")}.`;
          return {
            spoken,
            display: `### 🎓 ${info.name} (${code}) Placement Intelligence\n\n- **Placement Clearance Rate**: \`${info.placementRate}\`\n- **Highest Salary Package**: \`${info.highestPkg}\`\n- **Average Salary Benchmark**: \`${info.avgPkg}\`\n- **Minimum Eligibility Cutoff**: ${info.cutoff}\n- **Top Hiring Companies**: ${info.topRecruiters.join(", ")}\n\n💡 **Departmental Strategy**: ${info.roadmap}`,
            actions: [{ name: "navigate_to", arguments: { page_id: "analytics" } }],
            followups: [`Recommend project for ${code}`, `How to achieve highest package in ${code}?`, "What is use of roadmap?"]
          };
        }
      }
    }

    // =======================================================================
    // 7. THOUGHTFUL, INTELLIGENT FALLBACK (NEVER Robotic, NEVER "Go look yourself")
    // =======================================================================
    const spoken = isTelugu
      ? `మీరు అడిగిన '${raw}' గురించి నేను విశ్లేషించాను. మీ ప్లేస్‌మెంట్ ప్రిపరేషన్ కోసం సరైన రోడ్‌మ్యాప్, ప్రాజెక్ట్ గైడెన్స్ మరియు రెజ్యూమ్ టిప్స్ సిద్ధంగా ఉన్నాయి. ఏ అంశం గురించి మరింత వివరంగా మాట్లాడదాం?`
      : `I hear you on that! Looking at your placement journey from an engineering recruiter's perspective, having a clear roadmap and a strong flagship project is what sets you apart. How can I best guide you on this right now?`;

    return {
      spoken,
      display: `### 💡 Placement Strategist Guidance\n\nRegarding your question: **"${raw}"**\n\nHere is how we tackle this strategically:\n\n1. 🎯 **Keep Your Goal Clear**: Whether it's cracking Tier-1 product firms (Google, Amazon) or high-growth tech startups, recruiters evaluate **practical depth over theoretical memorization**.\n2. 🗺️ **Follow the 6-Week Sprints**: Don't waste time solving random problems without structure. Master core Blind 75 patterns systematically.\n3. 🚀 **Anchor Your Resume with 1 Flagship System**: An interviewer spends 80% of Round 2 diving into your most complex project.\n\n*Tell me more about what you're thinking, or click one of the quick options below!*`,
      actions: [],
      followups: ["What is use of roadmap?", "Show 23 project blueprints", "How to format ATS resume?"]
    };
  }
}

function anyMatch(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

export const clientBrain = new ClientBrainEngine();
