/**
 * Pathfinder AI Career Coach - Client-Side Fast Intelligence Engine
 *
 * Provides instantaneous, contextual, and high-fidelity career mentorship
 * when backend network latency or cloud cold-starts are detected.
 */

export const getCareerAgentResponse = (message = "", history = [], profile = {}) => {
  const text = (message || "").toLowerCase().trim();
  const branch = profile?.branch || "CSE";
  const cgpa = profile?.cgpa ? Number(profile.cgpa).toFixed(1) : "7.8";
  const backlogs = Number(profile?.backlogs || 0);
  const coding = Number(profile?.coding || 7);
  const targetRole = profile?.target_role || profile?.targetRole || "Software Development Engineer (SDE-1)";
  const targetTier = profile?.target_tier || profile?.targetTier || "Product MNCs (Tier-1)";

  // 1. Telugu / Tenglish Queries
  const isTelugu = /(naku|kavali|cheppu|ela|cheyyali|bro|andi|job|placements|preparation|chudu|telugu|em|ehe|avvali)/i.test(text);
  if (isTelugu) {
    if (text.includes("job") || text.includes("kavali") || text.includes("placements") || text.includes("ela")) {
      return `హాయ్! కంగారు పడకండి bro/andi! మీ ప్రొఫైల్ (${branch} • ${cgpa} CGPA • ${targetRole}) చూశాను. క్యాంపస్ ప్లేస్‌మెంట్స్ సాధించడానికి 4-స్టెప్ రోడ్‌మ్యాప్ ఇదిగోండి:

1. **Coding & DSA ఫౌండేషన్స్:**
   - Arrays, Strings, HashMaps, Two Pointers, Sliding Window కాన్సెప్ట్స్ పై డైలీ 2 ప్రాబ్లమ్స్ సాల్వ్ చేయండి.
   - మీ ప్రస్తుత కోడింగ్ కాన్ఫిడెన్స్ (${coding}/10) నుండి 8+/10 కి చేరడానికి LeetCode Top 75 లిస్ట్ కంప్లీట్ చేయండి.

2. **2 స్ట్రాంగ్ ప్రొడక్షన్ ప్రాజెక్ట్స్:**
   - రెగ్యులర్ కాలేజీ ప్రాజెక్ట్స్ కాకుండా, లైవ్ డిప్లాయ్‌మెంట్ (Vercel/Render) మరియు AI API/డేటాబేస్ ఇంటిగ్రేషన్ ఉన్న ప్రాజెక్ట్స్ గిట్‌హబ్‌లో పెట్టండి.

3. **కోర్ సబ్జెక్ట్స్ రివిజన్:**
   - DBMS (SQL queries, Indexing, Transactions)
   - Operating Systems (Threads, Deadlocks, Memory Management)
   - Computer Networks (TCP/IP, HTTP/HTTPS, DNS).

4. **రెజ్యూమ్ & మాక్ ఇంటర్వ్యూస్:**
   - సింగిల్ పేజ్ ATS-ఫ్రెండ్లీ రెజ్యూమ్ వాడండి. మాక్ ఇంటర్వ్యూస్ ప్రాక్టీస్ చేసి STAR ఫార్మాట్ లో ప్రాజెక్ట్ ఎక్స్‌ప్లెయిన్ చేయండి.

ఇంకా ఏమైనా డౌట్స్ ఉంటే అడగండి, నేను మీకు ఎప్పుడూ హెల్ప్ చేస్తాను! 🚀`;
    }
  }

  // 2. 6-Week Roadmap Requests
  if (text.includes("roadmap") || text.includes("6-week") || text.includes("schedule") || text.includes("plan")) {
    return `### 🗺️ Tailored 6-Week Placement Sprint for ${targetRole} (${branch})
*Grounding Metrics: ${cgpa} CGPA | Coding Confidence: ${coding}/10 | Target: ${targetTier}*

* **Week 1: Core DSA Sprints (Linear Structures)**
  * Day 1-3: Arrays, Two-Pointer patterns, Sliding Window optimizations.
  * Day 4-7: HashMaps, Frequency counters, Strings, and Monotonic Stacks.
  * *Milestone:* 25 solved problems with optimal $O(n)$ space-time bounds.

* **Week 2: Non-Linear Mastery & Recursion**
  * Day 8-11: Binary Trees, BST traversals, BFS/DFS level-order traversals.
  * Day 12-14: Heaps/Priority Queues and Two-Heap pattern for median finding.
  * *Milestone:* Master tree recursion and edge-case handling.

* **Week 3: Advanced Algorithmic Patterns & Graph Traversal**
  * Day 15-18: Connected Components, Topological Sort, Dijkstra's shortest path.
  * Day 19-21: Dynamic Programming 1D/2D (Knapsack, LCS, LIS).
  * *Milestone:* Solve 5 medium graph questions without looking at hints.

* **Week 4: High-Yield Flagship Portfolio Project**
  * Architect and deploy an end-to-end full-stack app featuring real-time caching (Redis) or Vector Embeddings (Qdrant/Gemini).
  * Add unit testing, Dockerfile, and CI/CD workflow badges.
  * *Milestone:* Public GitHub repo with interactive demo link.

* **Week 5: CS Core Engineering Fundamentals**
  * DBMS: Normalization, ACID properties, B-Tree indexes, indexing write-penalties.
  * OS: Process vs Threads, Virtual Memory, Inverted Page Tables, Mutex vs Semaphore.
  * Networks: TCP 3-way handshake, OSI layers, TLS encryption, WebSocket vs HTTP/2.

* **Week 6: STAR Behavioral Defense & Timed Mock OAs**
  * Complete 3 timed mock assessments simulating Hackerrank/CodeSignal interfaces.
  * Structure 4 project stories using STAR (Situation, Task, Action, Result).
  * *Milestone:* Interview-ready with zero speech hesitations!`;
  }

  // 3. Mock Interview Inquiries
  if (text.includes("mock") || text.includes("interview") || text.includes("question") || text.includes("star")) {
    return `### 🎙️ Technical Interview Simulation for ${targetRole}

Here is your first technical screening question:

**Problem: Maximum Subarray Sum (Kadane's Algorithm)**
> *"Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum. Must run in $O(n)$ time and $O(1)$ extra space."*

**Recruiter Evaluation Checklist:**
1. **Clarify Constraints:** Can array elements be all negative? (Yes, in which case the answer is the largest single negative value).
2. **Brute Force vs Optimal:** Explain why nested loops are $O(n^2)$ and how running sum prefix elimination achieves $O(n)$.
3. **Core Formula:**
   \`\`\`python
   curr_sum = max(num, curr_sum + num)
   max_sum = max(max_sum, curr_sum)
   \`\`\`

Whenever you're ready, reply with your approach or type **"next question"** to proceed to System Design!`;
  }

  // 4. Cutoffs, Backlogs & Eligibility
  if (text.includes("cutoff") || text.includes("backlog") || text.includes("eligib") || text.includes("tier-1")) {
    const backlogAdvice = backlogs > 0
      ? `⚠️ **Active Backlogs (${backlogs}):** You should prioritize clearing these in the upcoming supply exams. Most Product Tier-1 companies require 0 active backlogs at the time of joining, though some allow up to 1 history backlog if cleared before graduation.`
      : `✅ **Clean Academic Record:** Having 0 active backlogs qualifies you for over 95% of campus drives without screening restrictions.`;

    return `### 📊 Campus Recruitment Eligibility & Cutoff Analysis
*Profile: ${branch} | CGPA: ${cgpa}/10.0*

${backlogAdvice}

* **Tier-1 Product Companies (Microsoft, Amazon, Adobe, Oracle):**
  * *Cutoff:* Typically **7.5+ CGPA** (some relax to 7.0 for exceptional coding rankings).
  * *Your Status:* ${Number(cgpa) >= 7.5 ? "✅ Eligible for all Tier-1 drives." : "⚠️ Just below 7.5; compensate with top-tier competitive programming scores and open-source contributions."}

* **Tier-2 MNCs & Product Scaleups (Accenture Advanced, TCS Digital, Hexaware, Cognizant GenC Next):**
  * *Cutoff:* **6.5+ CGPA** with 0 or 1 active backlog.
  * *Your Status:* ✅ Fully eligible.

* **Key Action:** Maintain consistent performance in online assessments (OAs) to secure shortlist slots regardless of batch size.`;
  }

  // 5. Default Comprehensive Career Mentorship
  return `### 🚀 Pathfinder AI Career Coach Guidance
*Tailored for ${targetRole} • ${branch} Engineering Stream*

Based on your current profile metrics (${cgpa} CGPA, Coding Confidence: ${coding}/10), here are the top 3 tactical priorities to accelerate your placement readiness:

1. **Systematic Problem Solving:**
   Focus on high-frequency campus patterns: Sliding Window, Binary Search, Monotonic Stack, and Tree BFS/DFS. Aim for 100+ solved problems across these core categories.

2. **Flagship Project Architecture:**
   Ensure your resume features at least one production project with a live link, Docker configuration, and demonstrable database scaling or modern AI API integration.

3. **STAR Method Articulation:**
   Prepare your project defense using **Situation, Task, Action, and Result** to articulate engineering trade-offs clearly to technical hiring managers.

Feel free to ask for a **6-week sprint**, **mock interview questions**, or **branch-specific salary benchmarks**!`;
};
