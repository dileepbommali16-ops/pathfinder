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

// ---------------------------------------------------------------------------
// Owner Identity & Privacy Gating (Dileep Bommali / Dileep Das)
// ---------------------------------------------------------------------------
export const OWNER_EMAILS = [
  "dileepbommali16@gmail.com",
  "dileepbommali16@users.noreply.github.com",
  "dileep@pathfinder.ai",
  "dileep",
];

export const OWNER_PROFILE = {
  fullName: "Dileep Bommali",
  preferredName: "Dileep Das",
  dob: "16/01/2006",
  age: 20,
  education: {
    degree: "B.Tech 3rd year",
    branch: "CSE (Data Science)",
    college: "NRI Institute of Technology",
    location: "Pothavarappadu, Agiripalli",
  },
  hometown: "Gunadala, Vijayawada",
  state: "Andhra Pradesh",
  hobbies: ["guitarist (primary — his strongest passion)", "dancer", "singer"],
  family: {
    mother: "Bhavani",
    father: "Ramana",
    sister: "Priyanka (works in Hyderabad)",
  },
  favoriteLecturers: {
    chaitanya: "Dr. Chaitanya madam: Teaches Machine Learning. An all-rounder with many talents who explains ML concepts really well.",
    swami: "Swami sir: Teaches Operating Systems. An excellent teacher who explains OS concepts clearly.",
  },
  naturalBio:
    "Dileep Bommali — goes by Dileep Das — is a 20-year-old B.Tech 3rd year student in CSE with a specialization in Data Science at NRI Institute of Technology, Pothavarappadu, Agiripalli. He's originally from Gunadala, Vijayawada, in Andhra Pradesh. Outside academics, music is a big part of who he is — he's a guitarist first and foremost, and also dances and sings. He comes from a close family: his mother Bhavani, father Ramana, and his sister Priyanka, who works in Hyderabad. He built Pathfinder himself, as a B.Tech student passionate about using AI to help other students figure out where they stand for placements and what to do about it.",
};

export const OWNER_PUBLIC_BIO =
  "Dileep Bommali is the creator of Pathfinder, a B.Tech CSE (Data Science) student passionate about building AI-powered tools for student placement readiness.";

export function checkIsOwner(emailOrUsername?: string | null): boolean {
  if (emailOrUsername) {
    const clean = emailOrUsername.trim().toLowerCase();
    if (OWNER_EMAILS.some((o) => clean === o || (clean.startsWith("dileep") && clean.length >= 6))) {
      return true;
    }
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("pathfinder_user") || localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const candidate = (u.email || u.username || "").trim().toLowerCase();
        if (OWNER_EMAILS.some((o) => candidate === o || (candidate.startsWith("dileep") && candidate.length >= 6))) {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

export class ClientBrainEngine {
  /**
   * Processes a user question and returns a structured response with spoken text,
   * markdown display, followups, and UI execution actions.
   */
  public process(
    query: string,
    language: string = "auto",
    context?: {
      activeTab?: string;
      focusedWidget?: string;
      userState?: string;
      isOwner?: boolean;
      userEmail?: string;
      userName?: string;
    }
  ): BrainResponse {
    const raw = (query || "").trim();
    const low = normalizeQuery(raw);
    const isOwner = context?.isOwner !== undefined ? context.isOwner : checkIsOwner(context?.userEmail || context?.userName);

    const isTelugu =
      language === "te" ||
      anyMatch(low, ["ela", "cheyyali", "cheppu", "bro", "enti", "naku", "mana", "kuda", "ikkada", "chudu", "em cheyyali", "avvatledhu", "ravatledu", "namaskaram", "namaste", "anna", "cheppakaraledhu"]) ||
      /[\u0C00-\u0C7F]/.test(raw);

    const isHindi =
      language === "hi" ||
      anyMatch(low, ["namaste", "kaise", "batao", "kya", "mera", "karo", "suno", "samjhao"]) ||
      /[\u0900-\u097F]/.test(raw);

    // =======================================================================
    // 0. CONTEXT-AWARE INQUIRY (Where am I? What am I doing right now?)
    // =======================================================================
    if (anyMatch(low, ["where am i", "what is this page", "what am i doing", "what am i doing here", "explain this page", "explain current page", "explain this dashboard", "what is on screen", "what is this screen", "ekkada vunna", "em chesthunna", "dashboard gurinchi", "explain screen", "what am i looking at"])) {
      const tab = context?.activeTab || "overview";
      const tabExplanations: Record<string, { spoken: string; display: string; tabId: string }> = {
        overview: {
          tabId: "overview",
          spoken: isTelugu
            ? "ప్రస్తుతం మీరు ఎగ్జిక్యూటివ్ డ్యాష్‌బోర్డ్‌లో ఉన్నారు. ఇక్కడ మీ ప్లేస్‌మెంట్ సంసిద్ధత స్కోరు, టార్గెట్ కంపెనీలు మరియు లైవ్ మైల్‌స్టోన్స్ ఉన్నాయి. ఏ అంశం గురించి సమాచారం కావాలి?"
            : "You are currently on the Executive Dashboard overview. Here you can inspect your live placement readiness percentage, dream company aspirations, and active milestones.",
          display: `### 🧭 Current Screen: Executive Dashboard Overview\n\nYou are on the main mission control overview for Pathfinder.\n- **Placement Readiness**: Live statistical index calibrated against 972 cohort alumni.\n- **Target Roles & Cutoffs**: Verified requirements for companies like Google and Razorpay.\n- **Next Steps**: You can explore Cohort Analytics, check your Skill Gap matrix, or launch a mock interview.`
        },
        predictive: {
          tabId: "predictive",
          spoken: isTelugu
            ? "మీరు ప్రిడిక్టివ్ ప్లేస్‌మెంట్ ఆర్క్ స్క్రీన్‌లో ఉన్నారు. ఇక్కడ మెషిన్ లెర్నింగ్ మోడల్ మీ CGPA, కోడింగ్ స్కోర్ ఆధారంగా ప్లేస్‌మెంట్ అవకాశాలను లెక్కిస్తుంది."
            : "You are on the Predictive Placement Arc. Here our machine learning model evaluates your CGPA, coding score, and backlogs to predict your placement tier.",
          display: `### 🧭 Current Screen: Predictive Placement Arc\n\nThis module computes your calibrated placement probability using our verified Random Forest model trained on 972 engineering records.`
        },
        skills: {
          tabId: "skills",
          spoken: isTelugu
            ? "మీరు స్కిల్ గ్యాప్ మరియు 6-వీక్ DSA రోడ్‌మ్యాప్ పేజీలో ఉన్నారు. ఇక్కడ మీ లీట్‌కోడ్ ప్యాటర్న్స్ సంసిద్ధత మరియు వారపు ప్రిపరేషన్ షెడ్యూల్ కనిపిస్తాయి."
            : "You are looking at the Skill Gap Matrix and 6-Week DSA Roadmap. It diagnoses your core LeetCode pattern strengths and gives you a structured weekly practice schedule.",
          display: `### 🧭 Current Screen: Skill Gap Matrix & 6-Week DSA Roadmap\n\nBenchmarking your current problem-solving skills against Tier-1 product cutoffs.`
        },
        projects: {
          tabId: "projects",
          spoken: isTelugu
            ? "మీరు 23 ప్రొడక్షన్ ప్రాజెక్ట్ బ్లూప్రింట్స్ లో ఉన్నారు. ఇక్కడ డిస్ట్రిబ్యూటెడ్ సిస్టమ్స్ మరియు AI పైప్‌లైన్స్ వంటి ఫ్లాగ్‌షిప్ ప్రాజెక్ట్స్ ఎంచుకోవచ్చు."
            : "You are in the 23 Production Project Blueprints catalog. Here you can pick flagship architectures like Distributed Rate Limiters and RAG pipelines to build step-by-step.",
          display: `### 🧭 Current Screen: 23 Production Project Blueprints\n\nFull production-grade architectures designed to stand out in Round 2 interview defense.`
        },
        analytics: {
          tabId: "analytics",
          spoken: isTelugu
            ? "మీరు 972 మంది స్టూడెంట్స్ ప్లేస్‌మెంట్ రికార్డ్స్ అనలిటిక్స్ చూస్తున్నారు. 9 ఇంజనీరింగ్ బ్రాంచ్‌ల సాలరీ మరియు కటాఫ్ వివరాలు ఇక్కడ ఉన్నాయి."
            : "You are viewing the 972 Verified Student Placement Records analytics, showing real hiring cutoffs and salary packages across 9 engineering departments.",
          display: `### 🧭 Current Screen: 972 Cohort Placement Analytics\n\nEmpirical salary percentiles, recruiter rosters, and departmental hiring trends.`
        },
        defense: {
          tabId: "defense",
          spoken: isTelugu
            ? "మీరు STAR టెక్నికల్ డిఫెన్స్ సిమ్యులేటర్‌లో ఉన్నారు. ఇక్కడ రౌండ్ 2 ఆర్కిటెక్చర్ మరియు కన్‌కరెన్సీ వైవా ప్రశ్నలను ప్రాక్టీస్ చేయవచ్చు."
            : "You are on the STAR Technical Defense Simulator Console, where you can practice answering grueling Round 2 architecture and concurrency questions.",
          display: `### 🧭 Current Screen: STAR Technical Defense Simulator\n\nInteractive viva console to defend your projects against interviewer grilling.`
        },
        coach: {
          tabId: "coach",
          spoken: isTelugu
            ? "మీరు DAS AI వాయిస్ కోచ్ స్టూడియోలో ఉన్నారు. మైక్రోఫోన్ ద్వారా మాట్లాడవచ్చు లేదా ప్రశ్న టైప్ చేయవచ్చు."
            : "You are in the DAS AI Voice Coach Cybernetic Studio with the 3D holographic avatar. You can speak directly through your microphone or type any question.",
          display: `### 🧭 Current Screen: DAS AI Voice Coach Studio\n\nReal-time voice and text conversational command center.`
        }
      };
      const info = tabExplanations[tab] || tabExplanations.overview;
      return {
        spoken: info.spoken,
        display: info.display,
        actions: [],
        followups: ["Why should students use Pathfinder in the real world?", "Explain all components of Pathfinder", "How to build projects step by step?"]
      };
    }

    // =======================================================================
    // 0.5. IDENTITY: WHO ARE YOU & WHO INVENTED YOU?
    // =======================================================================
    if (anyMatch(low, ["who invented you", "who made you", "who created you", "who are you", "what is your name", "what is ur name", "ur name", "your name", "ne peru enti", "ninnu evaru chesaru", "who built you", "invented you"])) {
      if (isTelugu) {
        return {
          spoken: "నా పేరు దాస్ (DAS) - డిజిటల్ అటానమస్ స్ట్రాటజిస్ట్. పాత్‌ఫైండర్ ఇంజనీరింగ్ టీమ్ నన్ను క్యాంపస్ ప్లేస్‌మెంట్స్‌లో విద్యార్థులకు సహాయం చేయడానికి అభివృద్ధి చేసింది. నేను రోడ్‌మ్యాప్స్, ప్రాజెక్ట్స్ మరియు ఇంటర్వ్యూ ప్రిపరేషన్‌లో మీకు గైడ్ చేస్తాను!",
          display: `### 🤖 నేను DAS — Digital Autonomous Strategist\n\nనన్ను **Pathfinder Core Engineering & AI Systems Team** క్యాంపస్ ప్లేస్‌మెంట్లలో విద్యార్థులకు రియల్-టైమ్ కెరీర్ స్ట్రాటజిస్ట్‌గా సపోర్ట్ చేయడానికి రూపొందించింది.\n\n**నా సూపర్ పవర్స్:**\n- 📊 **972 Student Records Insight**: రియల్ ప్లేస్‌మెంట్ కటాఫ్‌లు & కంపెనీ రిక్వైర్‌మెంట్స్.\n- 🚀 **23 Flagship Architectures**: సిస్టమ్ డిజైన్ బ్లూప్రింట్స్ & కోడ్ గైడెన్స్.\n- 🗺️ **6-Week DSA Roadmap**: హై-ఫ్రీక్వెన్సీ ఇంటర్వ్యూ ప్యాటర్న్స్.\n- 🎙️ **Autonomous Web Navigation**: మీరు అడిగిన పేజీలను స్వయంగా ఓపెన్ చేసి చూపిస్తాను.`,
          actions: [],
          followups: ["Why should students use Pathfinder in the real world?", "Explain all components of Pathfinder", "How to build projects step by step?"]
        };
      }
      return {
        spoken: "I am DAS, which stands for Digital Autonomous Strategist. I was developed by the Pathfinder engineering team to serve as your dedicated AI Placement Coach and Career Architect. Ask me about roadmaps, real-world project blueprints, or ATS resume secrets!",
        display: `### 🤖 I am DAS — Digital Autonomous Strategist\n\nI was created by the **Pathfinder Engineering & AI Systems team** as an autonomous placement mentor designed specifically for engineering students.\n\n**Key Capabilities:**\n- 🎯 **88% Accuracy Placement Predictor**: Benchmarked on 972 verified student placement records.\n- 🚀 **23 Production Project Blueprints**: Architectural system designs with database schemas and interview defense points.\n- 🗺️ **6-Week DSA Sprint**: Pattern-based coding curriculum covering Google, Amazon, and Microsoft interview standards.\n- ⚡ **Autonomous Website Navigation**: I can scroll to widgets, switch tabs, and highlight key metrics directly on your screen!`,
        actions: [],
        followups: ["Why should students use Pathfinder in the real world?", "Explain all components of Pathfinder", "How to build projects step by step?"]
      };
    }

    // =======================================================================
    // 0.6. WHY SHOULD STUDENTS USE PATHFINDER IN THE REAL WORLD?
    // =======================================================================
    if (anyMatch(low, ["why should students use pathfinder in the real world", "why should students use pathfinder", "why pathfinder", "why use pathfinder", "why should students use", "real world", "pathfinder enduku", "pathfinder use"])) {
      if (isTelugu) {
        return {
          spoken: "రియల్ వరల్డ్‌లో చాలామంది విద్యార్థులు థియరీ చదువుతారు కానీ కంపెనీలకు కావాల్సిన ప్రాక్టికల్ ప్రాజెక్ట్స్, డీఎస్‌ఏ ప్యాటర్న్స్ ఉండవు. పాత్‌ఫైండర్ 972 రియల్ ప్లేస్‌మెంట్ రికార్డ్స్‌తో సరైన రోడ్‌మ్యాప్, 23 ప్రొడక్షన్ ప్రాజెక్ట్స్ మరియు ఏటీఎస్ రెజ్యూమ్ ఇచ్చి మిమ్మల్ని జాబ్-రెడీ చేస్తుంది!",
          display: `### 🌍 Why Should Students Use Pathfinder in the Real World?\n\nక్యాంపస్ ప్లేస్‌మెంట్లలో **80% విద్యార్థులు ఫెయిల్ అవ్వడానికి కారణం టాలెంట్ లేకపోవడం కాదు — సరైన డైరెక్షన్ లేకపోవడం!**\n\nరియల్ వరల్డ్‌లో Pathfinder మీకు అందించే 4 కీలక ప్రయోజనాలు ఇవి:\n\n1. 📊 **నిజమైన 972 స్టూడెంట్స్ డేటా (No Guesswork)**:\n   - మీ CGPA మరియు స్కిల్స్ బట్టి కంపెనీలు మిమ్మల్ని ఎలిమినేట్ చేసే ముందే మీ ప్లేస్‌మెంట్ ప్రాబబిలిటీని ఖచ్చితంగా తెలుసుకోవచ్చు.\n2. 🚀 **ట్యుటోరియల్ హెల్ నుండి బయటకు రావడం (23 Flagship Blueprints)**:\n   - ప్రతి ఒక్కరూ చేసే Todo-app, Weather-app కాకుండా, ఇంటర్వ్యూయర్‌ని ఆకట్టుకునే Distributed Rate Limiters, RAG Pipelines వంటి ఇండస్ట్రీ ఆర్కిటెక్చర్స్ నేర్పిస్తుంది.\n3. 📄 **ATS Screening లో రిజెక్ట్ అవ్వకుండా కాపాడటం**:\n   - గూగుల్ X-Y-Z ఫార్ములాతో రెజ్యూమ్ బుల్లెట్ పాయింట్లను ఆప్టిమైజ్ చేస్తుంది.\n4. 🛡️ **Round 2 టెక్నికల్ డిఫెన్స్ విస్టా**:\n   - ఇంటర్వ్యూయర్లు అడిగే సిస్టమ్ డిజైన్ ట్రేడ్-ఆఫ్స్ మరియు డీప్ క్వశ్చన్స్ కి సమాధానాలు ప్రాక్టీస్ చేయిస్తుంది.`,
          actions: [{ name: "navigate_to", arguments: { page_id: "analytics" } }],
          followups: ["Explain all components of Pathfinder", "How to build projects step by step?", "Show 6-week roadmap"]
        };
      }
      return {
        spoken: "In the real world, over 80% of applicants get filtered out because of generic resumes and unstructured preparation. Pathfinder solves this by providing calibrated placement prediction from 972 alumni records, 23 production blueprints, and a 6-week DSA roadmap.",
        display: `### 🌍 Why Should Students Use Pathfinder in the Real World?\n\nIn modern tech recruitment, **talent alone isn't enough — direction and evidence of impact are everything!** Most students get rejected because of three fatal traps: generic resumes, tutorial-clone projects, and unstructured DSA practice.\n\nHere is how Pathfinder gives you an unfair advantage in the real world:\n\n1. 🎯 **Calibrated Truth, Zero Guesswork**:\n   - Trained on **972 verified alumni placement records**. You know your exact odds before stepping into a campus drive, identifying backlogs and skill deficits early.\n2. 🚀 **Escape Tutorial Hell with 23 Flagship Blueprints**:\n   - Replaces generic calculator or e-commerce apps with **enterprise architectures** (*Distributed Token-Bucket Limiters, Event Buses, Multi-Agent Swarms*) that impress senior engineering managers.\n3. 📄 **Beat the 6-Second ATS Screening Algorithm**:\n   - Formats your resume with the **Google X-Y-Z metric formula** (*Accomplished [X], measured by [Y], by doing [Z]*).\n4. 🛡️ **Technical Viva & System Design Defense**:\n   - Prepares you to defend your code against grueling Round 2 interviewer interrogation (*race conditions, Redis caching strategies, database indexing*).`,
        actions: [{ name: "navigate_to", arguments: { page_id: "analytics" } }],
        followups: ["Explain all components of Pathfinder", "How to build projects step by step?", "What is use of roadmap?"]
      };
    }

    // =======================================================================
    // 0.7. HOW TO BUILD PROJECTS STEP BY STEP?
    // =======================================================================
    if (anyMatch(low, ["how to build projects step by step", "how to build projects", "build projects step by step", "build projects", "how to build project", "step by step project", "build project step", "project ela cheyyali"])) {
      if (isTelugu) {
        return {
          spoken: "ప్రాజెక్ట్ నిర్మించడానికి 5 దశలు ఉన్నాయి: మొదటిది ఆర్కిటెక్చర్ డిజైన్, రెండవది డేటాబేస్ స్కీమా, మూడవది కోర్ API లాజిక్, నాల్గవది డాకర్ డిప్లాయ్‌మెంట్, ఐదవది ఇంటర్వ్యూ డిఫెన్స్. మన 23 ప్రాజెక్ట్ బ్లూప్రింట్స్ లో ప్రతి ప్రాజెక్ట్ కి ఈ గైడ్ ఉంది!",
          display: `### 🛠️ How to Build Production Projects Step-by-Step\n\nఒక హై-ఇంపాక్ట్ ప్రాజెక్ట్‌ను ఇండస్ట్రీ స్టాండర్డ్స్‌తో నిర్మించడానికి **5-దశల ఫ్రేమ్‌వర్క్**:\n\n1. 📐 **దశ 1: System Architecture & Requirements**\n   - సిస్టమ్ ఫంక్షనల్ (Latency, Throughput) మరియు నాన్-ఫంక్షనల్ రిక్వైర్‌మెంట్స్ డాక్యుమెంట్ చేయండి.\n2. 🗄️ **దశ 2: Data Modeling & Schema Design**\n   - PostgreSQL / Redis లో సరైన రిలేషన్స్, ఇండెక్స్‌లు మరియు క్యాషింగ్ స్ట్రాటజీని రూపొందించండి.\n3. ⚙️ **దశ 3: Core API & Concurrency Handling**\n   - FastAPI / Node.js లో రోబస్ట్ API లు రాయండి. Race conditions రాకుండా Mutex / Lock mechanisms వాడండి.\n4. 🐳 **దశ 4: Containerization & CI/CD**\n   - Dockerfile మరియు GitHub Actions వర్క్‌ఫ్లో సెటప్ చేసి Vercel / Render లో లైవ్ చేయండి.\n5. 🛡️ **దశ 5: Technical Defense Preparation**\n   - "సిస్టమ్ లో 10,000 యూజర్లు ఒకేసారి వస్తే ఏమవుతుంది?" అనే రౌండ్ 2 ప్రశ్నలకు సమాధానాలు సిద్ధం చేసుకోండి.\n\n*Projects ట్యాబ్ లో 23 కంప్లీట్ బ్లూప్రింట్స్ సిద్ధంగా ఉన్నాయి!*`,
          actions: [{ name: "navigate_to", arguments: { page_id: "projects" } }],
          followups: ["Show flagship Distributed Rate Limiter", "Explain all components of Pathfinder", "How to format ATS resume?"]
        };
      }
      return {
        spoken: "Building an interview-winning project follows 5 phases: Architecture design, Database schema modeling, Core API implementation, Docker containerization, and Technical viva defense. Let me navigate you to our 23 blueprints to pick one!",
        display: `### 🛠️ How to Build Flagship Projects Step-by-Step\n\nRecruiters ignore basic clones. To build a project that commands **20+ LPA salary offers**, follow this **5-Phase Engineering Framework**:\n\n1. 📐 **Phase 1: Architecture & Scope Specification**\n   - Define scale parameters: Target QPS (queries per sec), latency budgets (<50ms), and storage trade-offs.\n2. 🗄️ **Phase 2: Data Schema & Storage Architecture**\n   - Design normalized relational models (Postgres) paired with high-speed key-value caches (Redis LRU).\n3. ⚡ **Phase 3: Core Business Logic & Concurrency**\n   - Implement thread-safe operations, idempotent endpoints, and clean error boundaries in FastAPI/Go/Node.js.\n4. 🐳 **Phase 4: Containerization & Production Observability**\n   - Package services in Docker, set up Prometheus/Grafana metrics, and write automated integration tests.\n5. 🛡️ **Phase 5: Technical Interview Defense Preparation**\n   - Master answers to trade-off questions: *Why Redis over Memcached? How do you prevent cache stampedes?*\n\n*Check the Projects tab for complete step-by-step implementations!*`,
        actions: [{ name: "navigate_to", arguments: { page_id: "projects" } }],
        followups: ["Show flagship Distributed Rate Limiter", "Why should students use Pathfinder in the real world?", "Explain all components of Pathfinder"]
      };
    }

    // =======================================================================
    // 0.8. EXPLAIN ABOUT PATHFINDER & ITS CORE PLATFORM ARCHITECTURE
    // =======================================================================
    if (anyMatch(low, [
      "explain about pathfinder", "explain pathfinder", "what is pathfinder", "about pathfinder",
      "tell me about pathfinder", "tell about pathfinder", "pathfinder gurinchi cheppu",
      "pathfinder gurinchi", "pathfinder enti", "what does pathfinder do", "what is this platform",
      "what is this app", "explain all components of pathfinder", "all components of pathfinder",
      "all components", "explain components", "pathfinder components", "components of pathfinder",
      "anni components cheppu", "components"
    ])) {
      if (isTelugu) {
        return {
          spoken: "పాత్‌ఫైండర్ అనేది ఇంజనీరింగ్ విద్యార్థుల కోసం రూపొందించిన అటానమస్ కెరీర్ ఇంటెలిజెన్స్ ఆపరేటింగ్ సిస్టమ్. ఇందులో 972 పూర్వ విద్యార్థుల డేటాతో పనిచేసే ప్రిడిక్షన్ మోడల్, 23 ప్రొడక్షన్ ప్రాజెక్ట్ బ్లూప్రింట్స్, 6-వారాల డీఎస్‌ఏ రోడ్‌మ్యాప్ మరియు ఏటీఎస్ రెజ్యూమ్ స్టూడియో ఉన్నాయి.",
          display: `### Pathfinder 2.0: Autonomous Placement Intelligence Platform\n\nపాత్‌ఫైండర్ 2.0 అనేది ఇంజనీరింగ్ విద్యార్థులను Tier-1 ప్రొడక్ట్ కంపెనీలు (Google, Microsoft, Amazon) మరియు హై-గ్రోత్ టెక్ స్టార్టప్‌లలో ప్లేస్ అయ్యేలా సిద్ధం చేసే పూర్తి స్థాయి కెరీర్ ప్లాట్‌ఫామ్.\n\n**కోర్ ఆర్కిటెక్చర్ & మోడ్యూల్స్:**\n\n1. **Predictive Placement Engine**: 972 పూర్వ విద్యార్థుల డేటా ఆధారంగా 88% ఖచ్చితత్వంతో మీ ప్లేస్‌మెంట్ అవకాశాలను మరియు కటాఫ్ మార్కులను లెక్కిస్తుంది.\n2. **Cohort Analytics Explorer**: 9 ఇంజనీరింగ్ బ్రాంచ్‌ల సాలరీ గ్రాఫ్‌లు, రిక్రూటర్ల వివరాలు మరియు కటాఫ్ మార్కులను అందిస్తుంది.\n3. **Skill Gap Matrix & 6-Week DSA Roadmap**: బ్లైండ్ 75 కోర్ ప్యాటర్న్స్ ఆధారంగా రూపొందించిన వారం వారీ ప్రిపరేషన్ షెడ్యూల్.\n4. **23 Production Project Blueprints**: డిస్ట్రిబ్యూటెడ్ సిస్టమ్స్, ఈవెంట్ బస్సులు మరియు జెన్-AI పైప్‌లైన్స్ వంటి హై-ఇంపాక్ట్ ప్రాజెక్ట్ ఆర్కిటెక్చర్లు.\n5. **One-Page ATS Resume Studio**: గూగుల్ X-Y-Z ఫార్ములాతో రిక్రూటర్ల స్క్రీనింగ్ ఫిల్టర్ పాస్ అయ్యేలా రెజ్యూమ్ ఆడిట్.\n6. **STAR Technical Defense Simulator**: రౌండ్ 2 సిస్టమ్ డిజైన్ మరియు కన్‌కరెన్సీ వైవా ప్రశ్నలకు సమాధానాలు సిద్ధం చేసే మాక్ ఇంటర్వ్యూయర్.\n7. **DAS Autonomous AI Agent**: వెబ్‌సైట్ మొత్తం నావిగేట్ చేస్తూ మీకు మార్గనిర్దేశం చేసే మీ పర్సనల్ కో-పైలట్.\n\n*ఏ మోడ్యూల్ గురించి మరింత వివరంగా తెలుసుకోవాలనుకుంటున్నారు?*`,
          actions: [{ name: "navigate_to", arguments: { page_id: "overview" } }],
          followups: ["Why should students use Pathfinder in the real world?", "How to build projects step by step?", "Open projects tab"]
        };
      }
      return {
        spoken: "Pathfinder is an autonomous career intelligence operating system built for engineering students. It combines an 88% precision ML placement predictor calibrated on 972 alumni records, 23 production project blueprints, a 6-week Blind 75 DSA roadmap, and an ATS resume studio with live website navigation.",
        display: `### Pathfinder 2.0: Autonomous Career Intelligence Platform\n\nPathfinder is an end-to-end placement engineering platform designed to eliminate the guesswork from campus recruitment and qualify students for Tier-1 technology companies (Google, Amazon, Microsoft, Goldman Sachs).\n\n**Core Architectural Modules:**\n\n1. **Calibrated ML Placement Predictor**: An 88% precision classification model benchmarked on 972 verified student records. It calculates your exact clearance probability based on CGPA, pattern DSA confidence, and project complexity.\n2. **972-Cohort Placement Analytics**: Transparent departmental hiring telemetry across 9 engineering disciplines, detailing packages up to 44.6 LPA and recruiter cutoff thresholds.\n3. **Skill Gap Matrix & 6-Week DSA Roadmap**: A phased problem-solving curriculum targeting the 75 most frequent algorithmic patterns tested in technical rounds.\n4. **23 Production Project Blueprints**: Enterprise-grade systems architecture guides (Distributed Rate Limiters, OT Collaborative Editors, High-Throughput Matching Engines, RAG Agents) equipped with database schemas and interview defense points.\n5. **One-Page ATS Resume Studio**: Real-time diagnostic parser enforcing the Google X-Y-Z metric formula to survive the 6-second recruiter audit.\n6. **STAR Technical Defense Simulator**: Rigorous Round 2 viva interrogation console to defend concurrency, database indexing, and caching trade-offs.\n7. **DAS Cybernetic Voice Agent**: Full-duplex conversational co-pilot with complete autonomous website control and visual holographic presence.\n\n*Would you like to examine our project blueprints, check cohort statistics, or review your placement odds?*`,
        actions: [{ name: "navigate_to", arguments: { page_id: "overview" } }],
        followups: ["Why should students use Pathfinder in the real world?", "How to build projects step by step?", "Show 6-week roadmap"]
      };
    }

    // =======================================================================
    // 0.9. TELL ABOUT RESUME
    // =======================================================================
    if (anyMatch(low, ["tell about resume", "tell me about resume", "about resume", "resume gurinchi cheppu", "explain resume", "how to make resume", "resume tips", "resume", "ats resume"])) {
      if (isTelugu) {
        return {
          spoken: "రెజ్యూమ్ అనేది ఇంటర్వ్యూకి మీ టికెట్. టాప్ కంపెనీల ఏటీఎస్ రిక్రూటర్లు ప్రతి రెజ్యూమ్‌ను కేవలం 6 సెకన్లు మాత్రమే చూస్తారు. అందువల్ల గూగుల్ X-Y-Z ఫార్ములాతో ఒకే పేజీలో స్పష్టమైన ఇంపాక్ట్ మెట్రిక్స్ ఉండేలా రూపొందించాలి!",
          display: `### 📄 High-Impact ATS Resume Strategy\n\nక్యాంపస్ ప్లేస్‌మెంట్లలో రిక్రూటర్లు ప్రతి రెజ్యూమ్‌ను చూడటానికి కేవలం **6 సెకన్లు మాత్రమే వెచ్చిస్తారు!**\n\n**విజేతల రెజ్యూమ్ ఫార్ములా:**\n\n1. 🎯 **Google X-Y-Z Formula**:\n   - ❌ సాధారణ బుల్లెట్: *"Created a rate limiter using Redis."*\n   - ✅ గూగుల్ స్టాండర్డ్: *"Implemented Token-Bucket rate limiter using Redis, **reducing API latency by 34%** and successfully handling **5,000 requests/sec**."*\n2. 📏 **Strict One-Page Format**:\n   - కాలేజ్ స్టూడెంట్స్‌కి 2-పేజీల రెజ్యూమ్ ఉండకూడదు. క్లీన్ సింగిల్ కాలమ్ డిజైన్ వాడండి.\n3. 🚫 **ATS Traps to Avoid**:\n   - టేబుల్స్, ఐకాన్స్ లేదా మల్టీ-కాలమ్ లేఅవుట్స్ వాడకండి; ఏటీఎస్ సాఫ్ట్‌వేర్ వాటిని సరిగ్గా చదవలేదు.\n4. 🔗 **Live Verifiable Proof**:\n   - పని చేసే GitHub రిపోజిటరీ మరియు లైవ్ డెమో లింక్ తప్పనిసరిగా చేర్చండి.`,
          actions: [{ name: "open_panel", arguments: { name: "resume_builder" } }],
          followups: ["Open ATS Resume Studio", "Show recommended projects for resume", "What is use of roadmap?"]
        };
      }
      return {
        spoken: "A great technical resume must pass the 6-second ATS recruiter scan. Keep it strictly to one page, use a clean single-column layout, and write every project bullet using the Google X-Y-Z formula showing measurable impact.",
        display: `### 📄 High-Impact ATS Resume Strategy\n\nTechnical recruiters spend an average of **6 seconds** reviewing a candidate's resume before deciding whether to interview or reject them.\n\nHere are the critical rules for an **interview-guaranteed resume**:\n\n1. 🎯 **The Google X-Y-Z Formula**:\n   - ❌ *Weak*: "Built an image recognition model using PyTorch."\n   - ✅ *Winning*: "Engineered a medical image segmentation pipeline in PyTorch with U-Net architecture, achieving **94.2% dice coefficient accuracy** and **processing 120 scans/sec**."\n2. 📏 **Strict 1-Page Layout**:\n   - Unless you have 10+ years of experience, two-page resumes get penalized by recruiters.\n3. 🚫 **Zero Formatting Traps**:\n   - Avoid tables, graphic rating bars (e.g. "Python 4/5 stars"), and multiple columns that break ATS parsers.\n4. 🔗 **Verified Proof of Work**:\n   - Every project must link to a live GitHub repository with a detailed README and deployment URL.\n\n*Click below to launch the One-Page ATS Resume Studio to scan your CV!*`,
        actions: [{ name: "open_panel", arguments: { name: "resume_builder" } }],
        followups: ["Open ATS Resume Studio", "Show 23 project blueprints", "How to build projects step by step?"]
      };
    }

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
    // 3.9 BLUEPRINTS NAVIGATION & STEP 1-9 STEP-BY-STEP GUIDANCE
    // =======================================================================
    if (anyMatch(low, ["go to blueprints and explain", "explain a small project", "explain small project", "tell me small project", "explain that one", "step 1 to all", "explain project step by step", "blueprints and explain"])) {
      return {
        spoken: isTelugu
          ? "ఖచ్చితంగా! బ్లూప్రింట్స్ ట్యాబ్ కి వెళ్లి, టోకెన్ బకెట్ రేట్ లిమిటర్ ప్రాజెక్ట్ ని స్టెప్ వన్ నుండి స్టెప్ నైన్ వరకు పూర్తిగా వివరిస్తున్నాను."
          : "Navigating to the Project Blueprints tab! I have picked the Distributed Token-Bucket Rate Limiter. It is an industry-standard flagship project using Redis and FastAPI to protect microservices. Let me walk you through its architecture, build order, and Round 2 defense on your screen.",
        display: `### 🚀 Flagship Project: Distributed Token-Bucket Rate Limiter & API Gateway\n\nNavigating to **Project Blueprints**. Here is your complete 9-Step production blueprint:\n\n#### 1. What It Is\nA high-throughput reverse proxy middleware that protects downstream APIs from DDoS and noisy-neighbor throttling by maintaining atomic token buckets per client IP.\n\n#### 2. Tech Stack\nPython (FastAPI), Redis, Docker, Prometheus, Locust/k6\n\n#### 3. Build Order & Key Steps\n1. **Step 1: System Requirements & SLA** — Define 100k requests/sec throughput with <2ms P99 latency.\n2. **Step 2: Architecture & Topology** — Reverse proxy layer, Redis distributed in-memory cache, and fallback token bucket.\n3. **Step 3: Token Bucket Algorithm** — Implement thread-safe token refill formula: \`tokens = min(capacity, prev_tokens + elapsed_time * refill_rate)\`.\n4. **Step 4: Atomic Redis Operations** — Execute atomic Lua scripts to prevent distributed race conditions without lock bottlenecks.\n5. **Step 5: API Gateway Integration** — Middleware interceptor evaluating \`X-Forwarded-For\` client IP & user API keys.\n6. **Step 6: High Concurrency Testing** — Benchmark with \`k6\` and \`Vegeta\` under 50,000 concurrent virtual users.\n7. **Step 7: Observability & Metrics** — Expose Prometheus metrics (\`rate_limit_exceeded_total\`, \`request_duration_ms\`) and Grafana dashboard.\n8. **Step 8: Docker Containerization** — Multi-stage alpine Dockerfile producing a lean <25MB deployment image.\n9. **Step 9: Round 2 Viva Defense** — Practice answering: *"How do you handle Redis cluster split-brain or clock drift in distributed rate limiting?"*\n\n#### 4. How to Defend It in Round 2 Interviews\n- *Interviewer Question*: "Why did you use a Redis Lua script instead of separate GET and SET commands?"\n- *Your Winning Defense*: "Separate GET and SET creates a race condition under concurrency. A Lua script executes atomically within Redis's single-threaded event loop, guaranteeing strict atomicity without distributed locking overhead!"`,
        actions: [{ name: "navigate_to", arguments: { page_id: "projects" } }],
        followups: ["Explain Step 3 Token Bucket math", "How to answer Round 2 Redis split-brain?", "Show another small project"]
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
    // 4.0 OWNER-ONLY "TELL ME ABOUT MYSELF" VS CANDIDATE PROFILE
    // =======================================================================
    if (anyMatch(low, ["tell me about myself", "who am i", "about myself", "my details", "tell me about me"])) {
      if (isOwner) {
        return {
          spoken:
            "You are Dileep Bommali, also known as Dileep Das, a 20-year-old 3rd-year B.Tech CSE Data Science student at NRI Institute of Technology. Outside academics, you are a dedicated lead guitarist, dancer, and singer, and the creator of Pathfinder!",
          display: `### 👑 Owner Profile: Dileep Das (Dileep Bommali)\n\n${OWNER_PROFILE.naturalBio}\n\n- **Hobbies**: ${OWNER_PROFILE.hobbies.join(", ")}\n- **College**: ${OWNER_PROFILE.education.college} (${OWNER_PROFILE.education.degree}, ${OWNER_PROFILE.education.branch})\n- **Family**: Mother ${OWNER_PROFILE.family.mother}, Father ${OWNER_PROFILE.family.father}, Sister ${OWNER_PROFILE.family.sister}\n- **Mentors**: Dr. Chaitanya madam (Machine Learning), Swami sir (Operating Systems)`,
          actions: [],
          followups: ["Show project blueprints", "Check placement stats", "Open ATS resume studio"],
        };
      } else {
        return {
          spoken:
            "You are a student preparing for campus placements on Pathfinder. I am here to help you practice DSA patterns, review your resume, and navigate 23 project blueprints. What would you like to focus on?",
          display: `### 👤 Candidate Placement Profile\n\n- **Platform Role**: Registered Pathfinder Candidate\n- **Objective**: Tier-1 Engineering Campus Placement Readiness\n- **Available Modules**: ML Placement Predictor, 23 Production Blueprints, 6-Week DSA Roadmap, One-Page ATS Resume Studio.`,
          actions: [],
          followups: ["Calculate my placement odds", "Show 6-week roadmap", "Open 23 project blueprints"],
        };
      }
    }

    // =======================================================================
    // 4.1 BOSS DILEEP DAS IDENTITY & PRIVACY-GATED BIO
    // =======================================================================
    if (anyMatch(low, ["who is your boss", "who is the boss", "your boss", "who made you", "who created you", "dileep", "bommali", "dileep das", "tell me about dileep", "about your boss", "who built you", "who made this"])) {
      if (isOwner) {
        const isTe = isTelugu || anyMatch(low, ["telugu", "cheppu"]);
        if (isTe) {
          return {
            spoken: "మీరే నా సృష్టికర్త మరియు బాస్ దిలీప్ దాస్ (దిలీప్ బొమ్మాలి)! మీరు NRI కాలేజీలో B.Tech CSE డేటా సైన్స్ చదువుతూ పాత్‌ఫైండర్ రూపొందించారు. సంగీతంలో మీరు అద్భుతమైన లీడ్ గిటారిస్ట్, డాన్సర్ మరియు సింగర్!",
            display: `### 👑 Boss Profile: Dileep Bommali (Dileep Das)\n\n**Dileep Das** is my visionary creator and supreme boss of Pathfinder:\n\n- 🎂 **DOB / Age**: ${OWNER_PROFILE.dob} (Age ${OWNER_PROFILE.age})\n- 🎓 **Academics**: ${OWNER_PROFILE.education.degree} ${OWNER_PROFILE.education.branch}, ${OWNER_PROFILE.education.college}, ${OWNER_PROFILE.education.location}\n- 📍 **Native Place**: ${OWNER_PROFILE.hometown}, ${OWNER_PROFILE.state}\n- 🎸 **Passions & Hobbies**: Lead Guitarist (primary passion), high-energy dancer, and singer\n- 👨‍👩‍👧 **Family**: Loving Mother ${OWNER_PROFILE.family.mother}, Father ${OWNER_PROFILE.family.father}, and Sister ${OWNER_PROFILE.family.sister}\n- 🌟 **Revered Mentors**:\n  * **Dr. Chaitanya Madam**: Favorite female lecturer — all-rounder genius who breaks down Machine Learning and AI with unmatched mastery.\n  * **Swami Sir**: Favorite male lecturer — phenomenal Operating Systems (OS) faculty who brings process scheduling and kernels alive!`,
            actions: [],
            followups: ["Tell me about Dr. Chaitanya Madam", "Tell me about Swami Sir", "Show project blueprints"]
          };
        }
        return {
          spoken: "You are my creator and Boss, Dileep Das! You built Pathfinder as an autonomous placement co-pilot while studying B.Tech CSE Data Science at NRI Institute of Technology. Outside tech, you are a passionate lead guitarist, dancer, and singer from Gunadala, Vijayawada!",
          display: `### 👑 Boss Profile: Dileep Bommali (Dileep Das)\n\n**Dileep Das** is my visionary creator and boss of Pathfinder:\n\n- 🎂 **DOB / Age**: ${OWNER_PROFILE.dob} (Age ${OWNER_PROFILE.age})\n- 🎓 **Academics**: ${OWNER_PROFILE.education.degree} ${OWNER_PROFILE.education.branch}, ${OWNER_PROFILE.education.college}, ${OWNER_PROFILE.education.location}\n- 📍 **Hometown**: ${OWNER_PROFILE.hometown}, ${OWNER_PROFILE.state}\n- 🎸 **Passions & Talents**: ${OWNER_PROFILE.hobbies.join(", ")}\n- 👨‍👩‍👧 **Family**: Mother ${OWNER_PROFILE.family.mother}, Father ${OWNER_PROFILE.family.father}, and Sister ${OWNER_PROFILE.family.sister}\n- 🌟 **Favorite Academic Mentors**:\n  * **Dr. Chaitanya Madam**: Favorite lady lecturer — brilliant all-rounder professor renowned for Machine Learning (ML) and Data Science.\n  * **Swami Sir**: Favorite male lecturer — superstar faculty for Operating Systems (OS) and Kernel Architecture!`,
          actions: [],
          followups: ["Who are Dileep's mentors?", "What are Dileep's hobbies?", "Show 23 project blueprints"]
        };
      } else {
        // STRICT PRIVACY RULE FOR NON-OWNERS: ZERO PRIVATE DETAILS LEAKED
        return {
          spoken: "Dileep Bommali is the creator of Pathfinder, a B.Tech CSE Data Science student passionate about building AI-powered tools for student placement readiness.",
          display: `### Creator Profile\n\n${OWNER_PUBLIC_BIO}`,
          actions: [],
          followups: ["Why should students use Pathfinder?", "Show 23 project blueprints", "Check my placement odds"]
        };
      }
    }

    // =======================================================================
    // 4.2 LECTURER MENTORS: DR. CHAITANYA MADAM & SWAMI SIR
    // =======================================================================
    if (anyMatch(low, ["chaitanya", "lady lecturer", "ml teacher", "machine learning madam"])) {
      return {
        spoken: isTelugu
          ? "డాక్టర్ చైతన్య మేడం మెషిన్ లెర్నింగ్ బోధిస్తారు. ఆమె ఎన్నో టాలెంట్స్ ఉన్న ఆల్ రౌండర్ ప్రొఫెసర్, మరియు క్లిష్టమైన కాన్సెప్ట్‌లను ఎంతో అద్భుతంగా వివరిస్తారు!"
          : "Dr. Chaitanya madam teaches Machine Learning. She is an all-rounder professor with many talents and someone who explains ML concepts really well!",
        display: `### 🌟 Dr. Chaitanya Madam (All-Rounder ML & AI Faculty)\n\n- **Specialization**: Machine Learning, Deep Learning, Predictive Analytics & AI Research\n- **Teaching Style**: All-rounder mentor who breaks down complex mathematical algorithms into intuitive, practical applications.\n- **Significance**: Chief academic inspiration for Pathfinder's calibrated machine learning readiness engine!`,
        actions: [],
        followups: ["Tell me about Swami Sir", "Who is your boss?", "Explain Random Forest"]
      };
    }

    if (anyMatch(low, ["swami sir", "swamy sir", "os sir", "operating systems sir"])) {
      return {
        spoken: isTelugu
          ? "స్వామి సర్ ఆపరేటింగ్ సిస్టమ్స్ బోధిస్తారు. ఆయన ఎంతో ఎనర్జిటిక్ గా, ఆపరేటింగ్ సిస్టమ్స్ మరియు కెర్నల్ ఆర్కిటెక్చర్ ని స్పష్టంగా వివరిస్తారు!"
          : "Swami sir teaches Operating Systems. He is an excellent teacher who explains OS concepts, process scheduling, and kernels clearly!",
        display: `### 🌟 Swami Sir (Operating Systems & Architecture Mentor)\n\n- **Specialization**: Operating Systems (OS), Kernel Architecture, Concurrency, Virtual Memory & Paging\n- **Teaching Style**: Super engaging, practical real-world analogies of CPU scheduling and thread safety.\n- **Significance**: Inspired the high-concurrency low-latency voice pipeline of Pathfinder!`,
        actions: [],
        followups: ["Tell me about Dr. Chaitanya Madam", "Explain OS Concurrency in Viva", "Who is your boss?"]
      };
    }

    // =======================================================================
    // 4.3 SOCIAL BANTER, WIT & HUMOR ("I LOVE YOU")
    // =======================================================================
    if (anyMatch(low, ["i love you", "love you", "love u", "premistunna", "prema"])) {
      if (isTelugu) {
        return {
          spoken: "అయ్యో థాంక్యూ అండీ! నా సర్క్యూట్స్ అన్నీ ఖుషీ అయిపోయాయి. నా హార్ట్ లో కేవలం రామ్, ప్రాసెసర్లు మాత్రమే ఉన్నా, మీ ప్లేస్‌మెంట్స్ సెట్ చేయడంలో నాకంటే ఎక్కువ ప్రేమ ఎవరికీ ఉండదు!",
          display: `### ❤️ Neural Circuits Overloaded with Joy!\n\n*Aww, thank you!* 😄\n\nWhile my physical heart is technically made of **RAM, GPUs, and Python algorithms**, there is nothing I love more than seeing our students and Boss Dileep land a **Tier-1 44+ LPA package**!\n\nNow, tell me: what technical challenge or project blueprint are we crushing today?`,
          actions: [],
          followups: ["Show project blueprints", "How to get 44 LPA?", "Who is your boss?"]
        };
      }
      return {
        spoken: "Aww, thank you! That sent my neural circuits glowing with happiness! While my heart runs on RAM and GPUs, my deepest passion is making sure you crack your dream placement! What shall we tackle next?",
        display: `### ❤️ Neural Circuits Glowing with Joy!\n\n*Aww, thank you!* 😄\n\nWhile my heart is made of **high-speed RAM, tensor cores, and neural networks**, my true love is helping you dominate technical interviews and secure a **Tier-1 Dream Offer**!\n\nLet's turn that love into placement power. What are we practicing right now?`,
        actions: [],
        followups: ["Show project blueprints", "Start mock interview", "Who is your boss?"]
      };
    }

    // =======================================================================
    // 4.5 SIMPLE TELUGU / ANALOGY EXPLANATION
    // =======================================================================
    if (anyMatch(low, ["ardham kaledhu", "ardham kaledu", "ardham kaaledhu", "didn't understand", "did not understand", "explain in telugu simply", "simple telugu", "tell me simply", "explain in telugu"])) {
      return {
        spoken: "చాలా సింపుల్ గా చెబుతాను! పాత్‌ఫైండర్ అనేది ఒక స్టార్ క్రికెట్ కోచ్ లాంటిది. ఒక కోచ్ మీ బ్యాటింగ్ చూసి మీరు సెంచరీ కొట్టేలా ఎలా గైడ్ చేస్తాడో, అలాగే పాత్‌ఫైండర్ మీ CGPA మరియు కోడింగ్ స్కిల్స్ చూసి మంచి కంపెనీలో ప్లేస్ అయ్యేలా చేస్తుంది!",
        display: `### 🏏 సులభంగా అర్థమయ్యే రియల్ వరల్డ్ ఉదాహరణ (Simple Real-World Analogy)\n\nమీకు సులభంగా అర్థం కావడానికి ఒక ఉదాహరణ చెబుతాను:\n\n1. 🏟️ **క్రికెట్ సెలెక్టర్ లాంటిది**: మీరు క్రికెట్ టీమ్ లోకి ఎంపిక అవ్వాలంటే సెలెక్టర్లు మీ బ్యాటింగ్ యావరేజ్, ఫిట్‌నెస్ చూస్తారు కదా? అలాగే క్యాంపస్ ప్లేస్‌మెంట్స్ లో రిక్రూటర్లు మీ **CGPA, కోడింగ్ స్కిల్స్** చూస్తారు.\n2. 🎯 **మెషిన్ లెర్నింగ్ ప్రిడిక్టర్**: 972 మంది సీనియర్ల రికార్డ్స్ చూసి, మీరు ఇంటర్వ్యూ క్లియర్ చేసే ఛాన్స్ ఎంత శాతమో ముందే ఖచ్చితంగా లెక్కిస్తుంది.\n3. 🚀 **ప్రాజెక్ట్స్ & రోడ్‌మ్యాప్**: మీ రెజ్యూమ్‌లో రిక్రూటర్స్ మెచ్చేలా స్ట్రాంగ్ ప్రాజెక్ట్స్ పెట్టడానికి 23 బ్లూప్రింట్స్ మరియు 6 వారాల DSA ప్లాన్ సిద్ధంగా ఉన్నాయి.\n\n*ఏ విషయాన్ని గురించి ఇప్పుడు మొదలుపెడదాం?*`,
        actions: [],
        followups: ["Show project blueprints", "Open 6-week roadmap", "Check placement stats"]
      };
    }

    // =======================================================================
    // 5. DAS PERSONAL CALL & CO-PILOT COMMAND ("hey das", "das", etc.)
    // =======================================================================
    if (anyMatch(low, ["hey das", "hi das", "hello das", "das bro", "das ai", "ok das", "hey boss das", "listen das"]) || low === "das") {
      const promptName = isOwner ? "బాస్" : "ఫ్రెండ్";
      const promptNameEn = isOwner ? "Boss" : "there";
      if (isTelugu) {
        return {
          spoken: `చెప్పండి ${promptName}! DAS సిస్టమ్స్ అన్నీ 100% రెడీగా ఉన్నాయి. ఈరోజు ఏ ప్రాజెక్ట్ లేదా డీఎస్‌ఏ ప్యాటర్న్ మొదలుపెడదాం?`,
          display: `### DAS Co-Pilot: Systems Calibrated & Online\n\nచెప్పండి ${promptName}! మీ డిజిటల్ అటానమస్ కో-పైలట్ సిద్ధంగా ఉంది. పాత్‌ఫైండర్ ప్లాట్‌ఫామ్‌ను పూర్తి స్థాయిలో ఉపయోగించుకోవడానికి నేను రెడీ:\n\n- **Predictive Placement Arc**: మీ CGPA మరియు స్కిల్స్ బట్టి ఎలిజిబిలిటీ స్కోర్.\n- **23 Flagship Architectures**: సిస్టమ్ డిజైన్ బ్లూప్రింట్స్ & కోడ్ గైడ్లు.\n- **6-Week DSA Roadmap**: హై-ఫ్రీక్వెన్సీ లీట్‌కోడ్ ప్యాటర్న్స్.\n- **Autonomous Navigation**: ఏ పేజీ అయినా చెప్పండి, నేను ఓపెన్ చేసి చూపిస్తాను.`,
          actions: [],
          followups: ["Explain about Pathfinder", "Show project blueprints", "Check placement stats"]
        };
      }
      return {
        spoken: isOwner
          ? "At your command, Boss! All neural circuits and placement telemetry are 100% online. Ready to crack system design, conquer high-frequency algorithms, or command the website."
          : "Hello there! All placement intelligence engines are fully online. How can I assist you with your campus preparation right now?",
        display: `### DAS Co-Pilot: Systems Calibrated & Standing By\n\nReporting for duty, ${promptNameEn}. All placement intelligence engines are fully synchronized:\n\n- **ML Placement Predictor**: Calibrated on 972 verified student placement records.\n- **23 Production Blueprints**: Enterprise architectures with database schemas and interview defense points.\n- **6-Week DSA Roadmap**: 75 high-frequency patterns covering Tier-1 technical rounds.\n- **Full Autonomous Control**: Ask me to open any tab, highlight metrics, or launch interview defense.`,
        actions: [],
        followups: ["Explain about Pathfinder", "Show project blueprints", "Check placement stats"]
      };
    }

    // =======================================================================
    // 5.1. GENERAL GREETINGS & TIME-OF-DAY BOSS GREETING
    // =======================================================================
    if (anyMatch(low, ["hi", "hello", "hey", "namaskaram", "namaste", "good morning", "good afternoon", "good evening", "who are you"])) {
      const nowHour = new Date().getHours();
      const tod = nowHour < 12 ? "morning" : (nowHour < 17 ? "afternoon" : "evening");
      const todTe = tod === "morning" ? "మార్నింగ్" : (tod === "afternoon" ? "ఆఫ్టర్నూన్" : "ఈవినింగ్");

      const timeGreetingEn = isOwner
        ? `Good ${tod}, Boss!`
        : `Good ${tod}! Welcome to Pathfinder.`;
      const timeGreetingTe = isOwner
        ? `గుడ్ ${todTe}, బాస్!`
        : `గుడ్ ${todTe}! పాత్‌ఫైండర్‌కి స్వాగతం.`;

      if (isTelugu) {
        return {
          spoken: `నమస్కారం! ${timeGreetingTe} నేను మీ పాత్‌ఫైండర్ AI కోచ్ దాస్ ని. ఈరోజు ప్లేస్‌మెంట్స్ లో ఏం సాధిద్దాం?`,
          display: `### నమస్కారం! ${timeGreetingTe} నేను DAS — మీ పర్సనల్ AI కో-పైలట్\n\nపాత్‌ఫైండర్ సిస్టమ్స్ అన్నీ ఆన్‌లైన్ లో ఉన్నాయి:\n- **88% Accuracy ML Predictor**: మీ CGPA మరియు స్కిల్స్ బట్టి రియల్ ప్లేస్‌మెంట్ ఛాన్సెస్.\n- **23 Production Project Blueprints**: రెజ్యూమ్‌కి వెయిటేజ్ తెచ్చే టాప్ ప్రాజెక్ట్స్.\n- **6-Week DSA Roadmap**: హై-ఫ్రీక్వెన్సీ ఇంటర్వ్యూ పాటర్న్స్.\n- **1-Page ATS Resume Studio**: రిక్రూటర్ స్క్రీనింగ్ ఫిల్టర్ పాస్ అయ్యే ఫార్మాట్.`,
          actions: [],
          followups: [isOwner ? "Tell me about myself" : "Who is your boss?", "Show project blueprints", "Calculate my placement readiness"]
        };
      }
      return {
        spoken: isOwner
          ? `Hello! ${timeGreetingEn} I am DAS, your autonomous Pathfinder AI Placement Co-pilot. Systems online and ready. How can I assist you right now?`
          : `Hello! ${timeGreetingEn} I am DAS, your autonomous placement co-pilot. Systems online and ready. How can I assist you today?`,
        display: isOwner
          ? `### Welcome! ${timeGreetingEn} I am DAS — Your Pathfinder AI Career Architect\n\nAll autonomous modules are calibrated and standing by:\n- **Calibrated Placement Odds**: ML statistical inference trained on 972 real alumni records.\n- **23 Production Project Blueprints**: Architectural roadmaps with database schemas and interview defense.\n- **6-Week DSA Sprint**: High-frequency LeetCode and System Design curriculum.\n- **ATS Resume Studio**: Real-time diagnostic audit formatted to recruiter screening algorithms.`
          : `### Welcome! ${timeGreetingEn}\n\nI am **DAS**, your autonomous placement co-pilot:\n- **88% Accuracy ML Predictor**: Benchmarked on 972 verified student records.\n- **23 Production Blueprints**: Ready-to-build distributed systems and AI pipelines.\n- **6-Week DSA Roadmap**: 75 high-frequency patterns for Tier-1 coding interviews.\n- **One-Page ATS Resume Studio**: Google X-Y-Z formula optimization.`,
        actions: [],
        followups: [isOwner ? "Tell me about myself" : "Who is your boss?", "Go to blueprints and explain a small project", "What is use of roadmap?"]
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
            display: `### ${info.name} (${code}) Placement Intelligence\n\n- **Placement Clearance Rate**: \`${info.placementRate}\`\n- **Highest Salary Package**: \`${info.highestPkg}\`\n- **Average Salary Benchmark**: \`${info.avgPkg}\`\n- **Minimum Eligibility Cutoff**: ${info.cutoff}\n- **Top Hiring Companies**: ${info.topRecruiters.join(", ")}\n\nStrategic Guidance: ${info.roadmap}`,
            actions: [{ name: "navigate_to", arguments: { page_id: "analytics" } }],
            followups: [`Recommend project for ${code}`, `How to achieve highest package in ${code}?`, "What is use of roadmap?"]
          };
        }
      }
    }

    // =======================================================================
    // 7. CREATOR & BOSS RECOGNITION (Dileep Bommali / Dileep Das)
    // =======================================================================
    if (anyMatch(low, ["who is your boss", "who is ur boss", "who is boss", "boss evaru", "who created you", "who made you", "creator", "owner", "dileep"])) {
      return {
        spoken: "My creator and boss is Dileep Bommali, also known as Dileep Das. He is a B.Tech Data Science engineer who built Pathfinder and created me as his autonomous AI co-pilot.",
        display: "### Pathfinder Creator & Boss: Dileep Bommali (Dileep Das)\n\n- **Creator & Lead Architect**: Dileep Bommali (@dileepdasss)\n- **Specialization**: B.Tech CSE (Data Science), NRI Institute of Technology\n- **Mission**: Built Pathfinder to provide predictive placement analytics, Tier-1 system blueprints, and voice-guided interview intelligence.",
        actions: [{ name: "navigate_to", arguments: { page_id: "overview" } }],
        followups: ["Tell me about Dileep", "Show project blueprints", "Explain placement analytics"]
      };
    }

    // =======================================================================
    // 8. NATURAL CONVERSATIONAL EXECUTIVE GUIDANCE
    // =======================================================================
    const spoken = isTelugu
      ? `నమస్తే! నేను పాత్‌ఫైండర్ డీఏఎస్ ఏఐ అసిస్టెంట్‌ని. మీ ప్లేస్‌మెంట్ ప్రిపరేషన్, ఏటీఎస్ రెజ్యూమ్ మరియు ప్రాజెక్ట్ బ్లూప్రింట్స్ కోసం నేను సిద్ధంగా ఉన్నాను. ఎలా సహాయం చేయమంటారు?`
      : `Hello! I am DAS, your Pathfinder autonomous co-pilot. I can guide you through verified placement analytics, Tier-1 DSA roadmaps, production blueprints, or ATS resume review. What would you like to explore?`;

    return {
      spoken,
      display: `### 🧭 Pathfinder DAS Autonomous Assistant\n\nI am online and ready to assist with:\n\n1. **Placement Probability ML**: 88% accuracy benchmarked on 972 cohort records.\n2. **28 Production Blueprints**: Distributed systems, microservices, and AI pipelines.\n3. **6-Week DSA Roadmap**: 75 high-frequency patterns for Tier-1 hiring rounds.\n4. **ATS Resume Optimization**: Google X-Y-Z bullet rewrites and skill alignment.\n\n*Speak or type an instruction, e.g., 'Open analytics', 'Show project blueprints', or 'Qualify my profile'.*`,
      actions: [],
      followups: ["Open placement analytics", "Show 28 project blueprints", "How to format ATS resume?"]
    };
  }
}

function anyMatch(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

export const clientBrain = new ClientBrainEngine();
