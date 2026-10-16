/**
 * Pathfinder AI Career Coach - Client-Side Fast Intelligence Engine
 *
 * Provides instantaneous, contextual, and high-fidelity career mentorship
 * when backend network latency, cloud sleep, or offline states are detected.
 * Adheres strictly to the Pathfinder Context Assembly & Anti-Repetition architecture.
 */

export const getCareerAgentResponse = (message = "", history = [], profile = {}) => {
  const text = (message || "").toLowerCase().trim();
  const branch = profile?.branch || "CSE";
  const cgpa = profile?.cgpa ? Number(profile.cgpa).toFixed(1) : "7.8";
  const backlogs = Number(profile?.backlogs || 0);
  const coding = Number(profile?.coding || 7);
  const targetRole = profile?.target_role || profile?.targetRole || "Software Development Engineer (SDE-1)";
  const targetTier = profile?.target_tier || profile?.targetTier || "Product MNCs (Tier-1)";
  const candidateName = profile?.fullName || profile?.username || "Candidate";

  // Check last replies for repetition avoidance
  const recentAssistantTexts = (history || [])
    .filter((m) => m?.role === "assistant")
    .slice(-3)
    .map((m) => (m.content || "").toLowerCase());

  // 1. Casual Greetings & Social Queries ("hi", "hello", "hi baby", "hey", "namaste")
  const isGreeting = /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|yo|hola|hi\s*baby|sup)[\s!.,?]*$/i.test(text);
  if (isGreeting) {
    if (recentAssistantTexts.length > 0 && recentAssistantTexts[recentAssistantTexts.length - 1].includes("how can i help you today")) {
      return `👋 **Hey there ${candidateName}! Ready when you are!**\n\nWhat would you like to tackle next? We can run a **mock technical interview**, review **23 production projects for ${branch}**, or build your **6-week placement sprint**. Just tap one of the quick commands above or type your question! 🚀`;
    }
    return `👋 **Hello ${candidateName}! Welcome back to Pathfinder AI Career Coach.**\n\nI am connected to your live candidate profile (**${branch}** • **${cgpa} CGPA** • Target: **${targetRole}**).\n\nHere is what we can do right now:\n1. 💡 **Explain Pathfinder simply in 5 lines**\n2. 🎙️ **Start an interactive Mock Interview**\n3. 🗺️ **Generate your 6-Week Placement Roadmap**\n4. 🚀 **Curate high-impact project ideas for ${branch}**\n\nWhat's on your mind today?`;
  }

  // 2. Explain Pathfinder Simply in 5 lines
  if (
    text.includes("explain pathfinder simply") ||
    text.includes("in 5 lines") ||
    text.includes("what is pathfinder") ||
    text.includes("what pathfinder does") ||
    text.includes("how does pathfinder work")
  ) {
    return `🎯 **Pathfinder in 5 Simple Lines:**\n\n` +
      `1. **Placement Probability Engine:** Uses a Random Forest ML model trained on 972 verified student recruitment records (88% accuracy) to calculate your live placement probability.\n` +
      `2. **Benchmark & Cutoff Matching:** Compares your CGPA, backlogs, and coding metrics against real cutoffs for Tier-1 Product MNCs (Amazon, Microsoft) vs Tier-2 companies.\n` +
      `3. **23 Production Project Blueprints:** Provides complete full-stack architectures, Docker configs, and viva defense talking points for high-impact resume projects.\n` +
      `4. **Interactive AI Career Mentor:** Real-time conversational coach powered by Gemini Flash that conducts technical mock interviews and multi-lingual voice prep.\n` +
      `5. **Single-Page ATS Resume Studio:** Automatically structures and audits your resume bullets using Google's X-Y-Z formula to clear automated recruiter screeners.`;
  }

  // 3. Explain to Non-Technical Person / Real-Life Analogy
  if (
    text.includes("non-technical") ||
    text.includes("analogy") ||
    text.includes("explain to parents") ||
    text.includes("layman")
  ) {
    return `💡 **Explaining Pathfinder with a Real-Life Analogy:**\n\n` +
      `Imagine you are preparing to run a competitive 42km marathon, but you don't know if your current running speed is enough to win a medal. ` +
      `Instead of guessing and hoping for the best, you hire an experienced Olympic coach who has coached 1,000 previous runners to gold medals.\n\n` +
      `That coach:\n` +
      `1. **Tests your current fitness:** (Analyzes your CGPA, coding ability, and problem-solving speed).\n` +
      `2. **Gives you an exact score:** (Shows your statistical probability of clearing the trials based on past marathon runners).\n` +
      `3. **Identifies weak muscles:** (Tells you exactly which skills you need to train—like Arrays, DBMS, or System Design).\n` +
      `4. **Gives you a week-by-week training calendar:** (Structured 6-week sprint so you are in peak shape on placement day).\n\n` +
      `**Pathfinder is that personal Olympic coach for engineering students**, transforming campus recruitment stress into a clear, measurable roadmap to an engineering career! 🎓✨`;
  }

  // 4. Project Ideas for Branch
  if (
    text.includes("project ideas for my branch") ||
    text.includes("project ideas") ||
    text.includes("recommend projects") ||
    (text.includes("project") && (text.includes("idea") || text.includes("suggest") || text.includes("branch")))
  ) {
    return `🚀 **Curated Flagship Project Architectures for ${branch} Engineers:**\n\n` +
      `### 1. 🌐 Enterprise Real-Time Collaborative Canvas (Tier-1 SDE)\n` +
      `- **Tech Stack:** React 19, TypeScript, WebSockets, Redis Pub/Sub, CRDTs (Yjs)\n` +
      `- **Architecture Highlight:** Sub-50ms conflict-free state synchronization with local undo/redo trees.\n` +
      `- **Resume Impact:** *"Engineered high-concurrency collaborative whiteboard handling 5,000 concurrent state deltas with zero merge conflicts."*\n\n` +
      `### 2. ⚡ Low-Latency Microservices Gateway with Distributed Tracing\n` +
      `- **Tech Stack:** Go/FastAPI, Docker, Envoy Proxy, Prometheus, OpenTelemetry\n` +
      `- **Architecture Highlight:** Token bucket rate limiting with Circuit Breaker pattern handling 10k RPS.\n` +
      `- **Resume Impact:** *"Built high-throughput API gateway with resilient backpressure and structured request logging."*\n\n` +
      `### 3. 🧠 Hybrid Semantic Search Engine with Vector Embeddings\n` +
      `- **Tech Stack:** Python 3.11, Qdrant/Pinecone, Gemini Embeddings, FastAPI, React\n` +
      `- **Architecture Highlight:** Sub-10ms HNSW vector similarity search combined with BM25 keyword filtering.\n` +
      `- **Resume Impact:** *"Architected hybrid search pipeline yielding 94% Top-3 relevance over 50,000 document records."*\n\n` +
      `💡 *Would you like to build any of these step-by-step? Just say "Let's build Project 1 step by step" and I will guide your milestones!*`;
  }

  // 5. Step-by-Step Project Building Tutor
  if (text.includes("step by step") || text.includes("build this project") || text.includes("start with step 1")) {
    return `🛠️ **Step-by-Step Architecture Guide: Production Engineering Project**\n\n` +
      `Let's build your flagship capstone following the 5-phase engineering milestone order:\n\n` +
      `### 📌 Step 1: System Architecture & Data Model (Today's Focus)\n` +
      `1. **Define Core Entities:** Create your ER diagram and TypeScript interface schemas for entities, sessions, and events.\n` +
      `2. **API Contract:** Design RESTful OpenAPI specifications or WebSocket event schemas before writing any server code.\n` +
      `3. **Repository Setup:** Initialize GitHub repository with pre-commit linters, TypeScript strict mode, and Dockerfile.\n\n` +
      `**Your First Action Item:**\n` +
      `Write out your database models or event payload schema. When you have them ready, reply with them here and I will review your foreign keys and indexing strategy! 🚀`;
  }

  // 6. Telugu / Tenglish Queries
  const isTelugu = /(naku|kavali|cheppu|ela|cheyyali|bro|andi|job|placements|preparation|chudu|telugu|em|ehe|avvali|kodithe)/i.test(text);
  if (isTelugu) {
    return `హాయ్! కంగారు పడకండి bro/andi! మీ ప్రొఫైల్ (${branch} • ${cgpa} CGPA • ${targetRole}) చూశాను. క్యాంపస్ ప్లేస్‌మెంట్స్ సాధించడానికి 4-స్టెప్ రోడ్‌మ్యాప్ ఇదిగోండి:\n\n` +
      `1. **Coding & DSA ఫౌండేషన్స్:**\n` +
      `   - Arrays, Strings, HashMaps, Two Pointers, Sliding Window కాన్సెప్ట్స్ పై డైలీ 2 ప్రాబ్లమ్స్ సాల్వ్ చేయండి.\n` +
      `   - మీ ప్రస్తుత కోడింగ్ కాన్ఫిడెన్స్ (${coding}/10) నుండి 8+/10 కి చేరడానికి LeetCode Top 75 లిస్ట్ కంప్లీట్ చేయండి.\n\n` +
      `2. **2 స్ట్రాంగ్ ప్రొడక్షన్ ప్రాజెక్ట్స్:**\n` +
      `   - రెగ్యులర్ కాలేజీ ప్రాజెక్ట్స్ కాకుండా, లైవ్ డిప్లాయ్‌మెంట్ (Vercel/Render) మరియు AI API/డేటాబేస్ ఇంటిగ్రేషన్ ఉన్న ప్రాజెక్ట్స్ గిట్‌హబ్‌లో పెట్టండి.\n\n` +
      `3. **కోర్ సబ్జెక్ట్స్ రివిజన్:**\n` +
      `   - DBMS (SQL queries, Indexing, Transactions)\n` +
      `   - Operating Systems (Threads, Deadlocks, Memory Management)\n` +
      `   - Computer Networks (TCP/IP, HTTP/HTTPS, DNS).\n\n` +
      `4. **సింగిల్ పేజ్ ATS రెజ్యూమ్ & మాక్ ఇంటర్వ్యూస్:**\n` +
      `   - Google X-Y-Z ఫార్మాట్ లో ప్రాజెక్ట్ ఇంపాక్ట్ రాయండి. ఇక్కడ మాక్ ఇంటర్వ్యూస్ ప్రాక్టీస్ చేయండి.\n\n` +
      `ఏ రోల్ టార్గెట్ చేస్తున్నారో చెబితే, ఇంకా డీటైల్డ్ ప్లాన్ ఇస్తాను bro! 🚀`;
  }

  // 7. 6-Week Roadmap Requests
  if (text.includes("roadmap") || text.includes("6-week") || text.includes("schedule") || text.includes("plan")) {
    return `### 🗺️ Tailored 6-Week Placement Sprint for ${targetRole} (${branch})\n` +
      `*Grounding Metrics: ${cgpa} CGPA | Coding Confidence: ${coding}/10 | Target: ${targetTier}*\n\n` +
      `* **Week 1: Core DSA Sprints (Linear Structures)**\n` +
      `  * Day 1-3: Arrays, Two-Pointer patterns, Sliding Window optimizations.\n` +
      `  * Day 4-7: HashMaps, Frequency counters, Strings, and Monotonic Stacks.\n` +
      `  * *Milestone:* 25 solved problems with optimal $O(n)$ space-time bounds.\n\n` +
      `* **Week 2: Non-Linear Mastery & Recursion**\n` +
      `  * Day 8-11: Binary Trees, BST traversals, BFS/DFS level-order traversals.\n` +
      `  * Day 12-14: Heaps/Priority Queues and Two-Heap pattern for median finding.\n` +
      `  * *Milestone:* Master tree recursion and edge-case handling.\n\n` +
      `* **Week 3: Advanced Algorithmic Patterns & Graph Traversal**\n` +
      `  * Day 15-18: Connected Components, Topological Sort, Dijkstra's shortest path.\n` +
      `  * Day 19-21: Dynamic Programming 1D/2D (Knapsack, LCS, LIS).\n` +
      `  * *Milestone:* Solve 5 medium graph questions without looking at hints.\n\n` +
      `* **Week 4: High-Yield Flagship Portfolio Project**\n` +
      `  * Architect and deploy an end-to-end full-stack app featuring real-time caching (Redis) or Vector Embeddings (Qdrant/Gemini).\n` +
      `  * Add unit testing, Dockerfile, and CI/CD workflow badges.\n` +
      `  * *Milestone:* Public GitHub repo with interactive demo link.\n\n` +
      `* **Week 5: CS Core Engineering Fundamentals**\n` +
      `  * DBMS: Normalization, ACID properties, B-Tree indexes, indexing write-penalties.\n` +
      `  * OS: Process vs Threads, Virtual Memory, Inverted Page Tables, Mutex vs Semaphore.\n` +
      `  * Networks: TCP 3-way handshake, OSI layers, TLS encryption, WebSocket vs HTTP/2.\n\n` +
      `* **Week 6: STAR Behavioral Defense & Timed Mock OAs**\n` +
      `  * Complete 3 timed mock assessments simulating Hackerrank/CodeSignal interfaces.\n` +
      `  * Structure 4 project stories using STAR (Situation, Task, Action, Result).\n` +
      `  * *Milestone:* Interview-ready with zero speech hesitations!`;
  }

  // 8. Mock Interview Inquiries
  if (text.includes("mock") || text.includes("interview") || text.includes("question") || text.includes("star")) {
    return `### 🎙️ Technical Interview Simulation for ${targetRole}\n\n` +
      `Here is your first technical screening question:\n\n` +
      `**Problem: Maximum Subarray Sum (Kadane's Algorithm)**\n` +
      `> *"Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum. Must run in $O(n)$ time and $O(1)$ extra space."*\n\n` +
      `**Recruiter Evaluation Checklist:**\n` +
      `1. **Clarify Constraints:** Can array elements be all negative? (Yes, in which case the answer is the largest single negative value).\n` +
      `2. **Brute Force vs Optimal:** Explain why nested loops are $O(n^2)$ and how running sum prefix elimination achieves $O(n)$.\n` +
      `3. **Core Formula:**\n` +
      `   \`\`\`python\n` +
      `   curr_sum = max(num, curr_sum + num)\n` +
      `   max_sum = max(max_sum, curr_sum)\n` +
      `   \`\`\`\n\n` +
      `Whenever you're ready, reply with your approach or type **"next question"** to proceed to System Design!`;
  }

  // 9. Cutoffs, Backlogs & Eligibility
  if (text.includes("cutoff") || text.includes("backlog") || text.includes("eligib") || text.includes("tier-1")) {
    const backlogAdvice = backlogs > 0
      ? `⚠️ **Active Backlogs (${backlogs}):** You should prioritize clearing these in the upcoming supply exams. Most Product Tier-1 companies require 0 active backlogs at the time of joining, though some allow up to 1 history backlog if cleared before graduation.`
      : `✅ **Clean Academic Record:** Having 0 active backlogs qualifies you for over 95% of campus drives without screening restrictions.`;

    return `### 📊 Campus Recruitment Eligibility & Cutoff Analysis\n` +
      `*Profile: ${branch} | CGPA: ${cgpa}/10.0*\n\n` +
      `${backlogAdvice}\n\n` +
      `* **Tier-1 Product Companies (Microsoft, Amazon, Adobe, Oracle):**\n` +
      `  * *Cutoff:* Typically **7.5+ CGPA** (some relax to 7.0 for exceptional coding rankings).\n` +
      `  * *Your Status:* ${Number(cgpa) >= 7.5 ? "✅ Eligible for all Tier-1 drives." : "⚠️ Just below 7.5; compensate with top-tier competitive programming scores and open-source contributions."}\n\n` +
      `* **Tier-2 MNCs & Product Scaleups (Accenture Advanced, TCS Digital, Hexaware, Cognizant GenC Next):**\n` +
      `  * *Cutoff:* **6.5+ CGPA** with 0 or 1 active backlog.\n` +
      `  * *Your Status:* ✅ Fully eligible.\n\n` +
      `* **Key Action:** Maintain consistent performance in online assessments (OAs) to secure shortlist slots regardless of batch size.`;
  }

  // 10. Default Comprehensive Career Mentorship
  return `### 🚀 Pathfinder AI Career Coach Guidance\n` +
    `*Tailored for ${targetRole} • ${branch} Engineering Stream*\n\n` +
    `Based on your current profile metrics (${cgpa} CGPA, Coding Confidence: ${coding}/10), here are the top 3 tactical priorities to accelerate your placement readiness:\n\n` +
    `1. **Systematic Problem Solving:**\n` +
    `   Focus on high-frequency campus patterns: Sliding Window, Binary Search, Monotonic Stack, and Tree BFS/DFS. Aim for 100+ solved problems across these core categories.\n\n` +
    `2. **Flagship Project Architecture:**\n` +
    `   Ensure your resume features at least one production project with a live link, Docker configuration, and demonstrable database scaling or modern AI API integration.\n\n` +
    `3. **STAR Method Articulation:**\n` +
    `   Prepare your project defense using **Situation, Task, Action, and Result** to articulate engineering trade-offs clearly to technical hiring managers.\n\n` +
    `Feel free to ask for a **6-week sprint**, **mock interview questions**, or **branch-specific salary benchmarks**!`;
};
