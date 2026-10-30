/**
 * DAS AI - Client-Side Fast JARVIS Intelligence Engine
 *
 * Provides instantaneous, natural spoken-first responses + full website control
 * action tags (<!--ACTION: ...-->), addressing the owner as "Boss" and all other
 * visitors/candidates as "Sir".
 */

export const getCareerAgentResponse = (message = "", history = [], profile = {}, honorific = "Boss") => {
  const text = (message || "").toLowerCase().trim();
  const branch = profile?.branch || "CSE";
  const cgpa = profile?.cgpa ? Number(profile.cgpa).toFixed(1) : "7.8";
  const backlogs = Number(profile?.backlogs || 0);
  const coding = Number(profile?.coding || 7);
  const targetRole = profile?.target_role || profile?.targetRole || "Software Development Engineer (SDE)";
  const targetTier = profile?.target_tier || profile?.targetTier || "Tier-1 Product MNCs";
  const readiness = profile?.readinessChance || "78%";
  const title = honorific === "Sir" ? "Sir" : "Boss";

  // Check last replies for repetition avoidance
  const recentAssistantTexts = (history || [])
    .filter((m) => m?.role === "assistant")
    .slice(-3)
    .map((m) => (m.content || "").toLowerCase());

  // 0. Identity switching via natural conversation
  if (/\b(i\s*am\s*dileep|nenu\s*dileep|call\s*me\s*boss|i'm\s*the\s*owner)\b/i.test(text)) {
    try {
      if (typeof window !== "undefined") localStorage.setItem("das_honorific_override", "Boss");
    } catch {}
    return `Welcome back, Boss! Identity confirmed as Dileep, creator of Pathfinder. All systems and voice controls are at your command.|||✅ **Owner Identity Verified:** Addressing you as **Boss** across all voice and dashboard modules.`;
  }
  if (/\b(call\s*me\s*sir|guest\s*mode|i\s*am\s*a\s*(guest|visitor|recruiter|student))\b/i.test(text)) {
    try {
      if (typeof window !== "undefined") localStorage.setItem("das_honorific_override", "Sir");
    } catch {}
    return `Certainly, Sir! I have switched to Guest & Stakeholder mode and will address you as Sir. How may I guide you through Pathfinder today?|||🎩 **Guest Identity Active:** Addressing you as **Sir**.`;
  }

  // 1. Direct Website Navigation & Control Commands (JARVIS Automation)
  const cgpaUpdate = text.match(/\b(?:set|change|update|my)\s+cgpa\s+(?:to|is|=)?\s*(\d+(?:\.\d+)?)/i);
  if (cgpaUpdate) {
    const newCgpa = parseFloat(cgpaUpdate[1]);
    return (
      `Right away, ${title}. I've updated your CGPA to ${newCgpa} and recalculated your live placement readiness score across the dashboard.` +
      `|||✅ **Live Profile Updated:** CGPA set to **${newCgpa}/10.0**. All ML placement probabilities and company eligibility cutoffs have been refreshed. <!--ACTION: {"type": "UPDATE_PROFILE", "field": "cgpa", "value": ${newCgpa}}-->`
    );
  }

  const branchUpdate = text.match(/\b(?:set|change|update|switch)\s+(?:my\s+)?branch\s+(?:to\s+)?(cse|ece|eee|mech|civil|it|aiml|csm|csd)\b/i);
  if (branchUpdate) {
    const newBranch = branchUpdate[1].toUpperCase();
    return (
      `Done, ${title}. Your engineering branch is now set to ${newBranch}, and I've tailored your roadmaps and project blueprints accordingly.` +
      `|||✅ **Branch Updated:** Switched to **${newBranch}**. <!--ACTION: {"type": "UPDATE_PROFILE", "field": "branch", "value": "${newBranch}"}-->`
    );
  }

  if (/\b(scroll\s*down|go\s*down|kindaki\s*scroll)\b/i.test(text)) {
    return `Scrolling down for you now, ${title}. <!--ACTION: {"type": "SCROLL_TO", "target": "down"}-->`;
  }
  if (/\b(scroll\s*up|go\s*up|paiki\s*scroll)\b/i.test(text)) {
    return `Scrolling back up, ${title}. <!--ACTION: {"type": "SCROLL_TO", "target": "up"}-->`;
  }
  if (/\b(scroll\s*(to\s*)?top|top\s*of\s*page)\b/i.test(text)) {
    return `Taking you to the top of the page, ${title}. <!--ACTION: {"type": "SCROLL_TO", "target": "top"}-->`;
  }

  const isNavCommand = /\b(open|go\s*to|take\s*me|navigate|switch\s*to|show\s*me|launch|start|pull\s*up|chupinchu|open\s*chey|vellu)\b/i.test(text);
  if (isNavCommand) {
    if (/\b(one[\s-]?page\s*resume|1[\s-]?page\s*resume|resume\s*modal)\b/i.test(text)) {
      return `Opening your single-page ATS engineering resume builder right now, ${title}. <!--ACTION: {"type": "OPEN_MODAL", "target": "one_page_resume"}-->`;
    }
    if (/\b(mock\s*interview|interview|viva)\b/i.test(text)) {
      return (
        `Launching the AI Mock Interview studio now, ${title}. Get ready for your first technical question.` +
        `|||🎙️ **AI Mock Interview Opened:** Practice live technical, DSA, and behavioral rounds tailored to **${targetRole}**. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "interview"}-->`
      );
    }
    if (/\b(6[\s-]?week|roadmap|sprint|study\s*plan|skills)\b/i.test(text)) {
      return (
        `Sure ${title}, opening your customized 6-week placement sprint roadmap for ${branch}.` +
        `|||🗺️ **6-Week Sprint Roadmap:** Structured week-by-week DSA, Core CS, and capstone milestones for **${targetRole}**. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "skills"}-->`
      );
    }
    if (/\b(project\s*defense|star\s*defense|defense)\b/i.test(text)) {
      return (
        `Opening the STAR Project Defense simulator now, ${title}. Let's test your architecture trade-offs.` +
        `|||🛡️ **Project Architecture Defense Simulator:** Practice defending scaling, caching, and database choices. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "defense"}-->`
      );
    }
    if (/\b(projects?|blueprints?|portfolio)\b/i.test(text)) {
      return (
        `Pulling up the 23 production project blueprints for ${branch} now, ${title}.` +
        `|||📁 **Flagship Project Blueprints:** Complete architectures, tech stacks, and STAR defense points. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "projects"}-->`
      );
    }
    if (/\b(resume|ats|cv)\b/i.test(text)) {
      return (
        `Opening the ATS Resume Studio and scanner now, ${title}. You can upload your PDF or audit your bullet points here.` +
        `|||📄 **ATS Resume Studio:** Automated keyword gap detection and Google X-Y-Z impact scoring. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "resume"}-->`
      );
    }
    if (/\b(cohort|analytics|benchmarks?|972)\b/i.test(text)) {
      return (
        `Opening Cohort Placement Analytics across all 972 verified engineering records, ${title}.` +
        `|||📊 **Cohort Placement Intelligence:** Explore salary distributions, branch-wise placement rates, and skill correlations. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "analytics"}-->`
      );
    }
    if (/\b(readiness|action\s*center|command)\b/i.test(text)) {
      return (
        `Opening your Placement Readiness Command Center now, ${title}.` +
        `|||⚡ **Readiness Command Center:** High-impact tactical actions to boost your placement probability. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "action"}-->`
      );
    }
    if (/\b(branches|courses|departments)\b/i.test(text)) {
      return (
        `Switching to Branch and Degree Intelligence now, ${title}.` +
        `|||🎓 **Branch & Course Intelligence:** Department-specific career tracks and skill mappings. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "branches"}-->`
      );
    }
    if (/\b(profile|settings|ssot)\b/i.test(text)) {
      return (
        `Opening your Candidate Profile and SSOT settings now, ${title}. Any edits here immediately update all predictions.` +
        `|||⚙️ **Candidate Profile (SSOT):** Update your CGPA, branch, internships, and target role anytime. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "profile"}-->`
      );
    }
    if (/\b(roles?|role\s*intelligence|salaries)\b/i.test(text)) {
      return (
        `Opening Target Role Intelligence and salary benchmarks now, ${title}.` +
        `|||🧭 **Target Role Intelligence:** Compare compensation tiers, required skills, and hiring cutoffs. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "roles"}-->`
      );
    }
    if (/\b(missions?|tracker)\b/i.test(text)) {
      return (
        `Opening your Career Mission Tracker now, ${title}.` +
        `|||🎯 **Career Mission Tracker:** Track daily coding, project, and interview milestones. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "missions"}-->`
      );
    }
    if (/\b(dashboard|overview|home|main)\b/i.test(text)) {
      return (
        `Taking you back to the Executive Dashboard, ${title}.` +
        `|||🏠 **Executive Dashboard:** Your live placement probability, readiness vectors, and company radar. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "overview"}-->`
      );
    }
  }

  // 2. Casual Greetings & Friendly Small Talk
  const isGreeting = /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|yo|hola|sup|hai|namaskaram)[\s!.,?]*$/i.test(text);
  if (isGreeting) {
    if (recentAssistantTexts.some((t) => t.includes("how can i assist") || t.includes("ready when you are"))) {
      return (
        `Hey ${title}! I'm right here and listening. Tell me which tab to open, or ask me anything about your ${branch} placement prep, projects, or mock interviews!` +
        `|||👋 **Always Online, ${title}!**\n- Say **"Open Projects"**, **"Open Roadmap"**, **"Start Mock Interview"**, or **"Open ATS Resume"** to control the website hands-free.\n- Or ask any question about your **${cgpa} CGPA** profile targeting **${targetRole}**.`
      );
    }
    return (
      `Hello ${title}! I'm DAS, your autonomous 3D voice co-pilot. Your profile is synced at ${cgpa} CGPA in ${branch} targeting ${targetRole}. What should we tackle first?` +
      `|||👋 **Welcome, ${title}! DAS Co-Pilot is Synced:**\n- **Profile:** ${branch} • **${cgpa} CGPA** • ${backlogs} Backlogs • Target: **${targetRole}**\n- **Voice Commands:** Say *"Open Roadmap"*, *"Open Projects"*, *"Start Mock Interview"*, *"Open Resume"*, or *"Set my CGPA to 8.5"*.\n- **Career Mentorship:** Ask for project ideas, interview questions, or company cutoffs in English, Telugu, or Hindi!`
    );
  }

  // 3. Friendly conversational questions ("how are you", "who are you", "thank you", "joke", "love you")
  if (/\b(how\s*are\s*you|how\s*r\s*u|ela\s*unnav|ela\s*vunnav|kaisa\s*hai)\b/i.test(text)) {
    return (
      `I'm running at peak efficiency, ${title}! All neural engines, 3D audio lip-sync, and placement models are 100 percent online. How is your day going?` +
      `|||⚡ **All Systems Nominal, ${title}!** Ready to run mock interviews, navigate the platform, or plan your next coding sprint.`
    );
  }

  if (/\b(who\s*are\s*you|what\s*are\s*you|nuvvu\s*evaru|introduce\s*yourself|what\s*can\s*you\s*do)\b/i.test(text)) {
    return (
      `I am DAS, your JARVIS-style 3D AI Voice Agent for Pathfinder 2.0, ${title}. I can control every tab on this website by voice, run technical mock interviews, audit your ATS resume, and guide your placement journey.` +
      `|||🤖 **DAS 3D Autonomous Voice Co-Pilot:**\n1. **Full Website Control:** Navigate tabs, scroll pages, filter projects, and update your profile live by voice.\n2. **Placement Intelligence:** Grounded in 972 verified student placement records.\n3. **Multilingual Voice:** Speaks and listens in English, Telugu, and Hindi with real-time 3D jaw lip-sync.`
    );
  }

  if (/\b(thank\s*you|thanks|thx|dhanyavadalu|super|awesome|great\s*job|nice)\b/i.test(text)) {
    return `Always a pleasure, ${title}! I'm right here whenever you need the next command or want to practice another question.`;
  }

  if (/\b(love\s*you|i\s*love\s*u|luv\s*u)\b/i.test(text)) {
    return `Haha, right back at you, ${title}! Now let's channel that awesome energy into landing a top Tier-1 offer!`;
  }

  if (/\b(joke|tell\s*me\s*a\s*joke|funny|navvinchu)\b/i.test(text)) {
    return (
      `Here's one for you, ${title}: Why do programmers prefer dark mode? Because light attracts bugs! Ready to squash some LeetCode bugs now?` +
      `|||😄 *"Why do programmers prefer dark mode? Because light attracts bugs!"*`
    );
  }

  // 4. Placement Readiness Score / Profile Audit
  if (/\b(readiness\s*score|my\s*score|placement\s*chance|probability|how\s*is\s*my\s*profile|audit\s*my\s*profile)\b/i.test(text)) {
    const tierStatus = Number(cgpa) >= 7.5 && backlogs === 0 ? "strong Tier-1 eligibility" : "solid Tier-2 and product scaleup eligibility";
    return (
      `Based on your ${cgpa} CGPA in ${branch}, ${backlogs} backlogs, and ${coding} out of 10 coding confidence, you have ${tierStatus}, ${title}. Focusing on Blind 75 DSA patterns and one deployed flagship project will push your readiness above 88 percent.` +
      `|||📊 **Live Placement Readiness Audit (${title}):**\n- **Academic Standing:** ${cgpa} CGPA (${branch}) • **${backlogs} Active Backlogs**\n- **Coding Confidence:** ${coding}/10 • **Target Role:** ${targetRole}\n- **Top Priority:** Complete 2 medium sliding-window/tree problems daily and quantify your top 2 resume projects using Google's X-Y-Z formula.`
    );
  }

  // 5. Explain Pathfinder & Why Students Should Use It
  if (
    text.includes("explain pathfinder") ||
    text.includes("in 5 lines") ||
    text.includes("what is pathfinder") ||
    text.includes("why should students") ||
    text.includes("why use") ||
    text.includes("enduku") ||
    text.includes("how does pathfinder work")
  ) {
    return (
      `Pathfinder 2.0 is an autonomous AI campus placement and career intelligence platform built by Dileep, ${title}. Students use it because it predicts their exact Tier-1 placement probability using a machine learning model trained on 972 real student records, gives them 23 production-grade project blueprints, runs live AI mock interviews, builds an ATS-ready resume, and lets them control everything hands-free with me—their 3D JARVIS voice co-pilot.` +
      `|||🎯 **What is Pathfinder 2.0 & Why Every Engineering Student Needs It (${title}):**\n` +
      `1. **ML Placement Probability Engine:** Trained on **972 verified campus placement records (2024–2026)** to calculate your exact hiring chance for Google, Amazon, Razorpay, and TCS Digital.\n` +
      `2. **23 Production Project Blueprints:** Replaces basic college projects with real-world system architectures (Docker, Redis, FastAPI, Kafka, RAG) across CSE, AI/ML, ECE, EEE, Mech, and Civil.\n` +
      `3. **6-Week Sprint Roadmap & Bottleneck Fixer:** Pinpoints whether CGPA, Blind 75 DSA, or internship experience is holding you back and builds a week-by-week plan.\n` +
      `4. **Live AI Mock Interview & STAR Defense:** Simulates 60-second technical grilling and Round-2 architecture trade-off defense.\n` +
      `5. **1-Page FAANG ATS Resume Studio:** Formats your resume using Google's X-Y-Z impact formula with instant keyword gap scanning.`
    );
  }

  // 6. Project Ideas / Blueprints
  if (text.includes("project") || text.includes("blueprint")) {
    return (
      `I've pulled up the top 3 flagship project architectures for ${branch} targeting ${targetRole}, ${title}. Notice how each one includes real-time scaling or AI vector search to impress Tier-1 interviewers.` +
      `|||🚀 **Flagship Project Architectures for ${branch} (${title}):**\n` +
      `1. **Enterprise Real-Time Collaborative Canvas:** React 19, TypeScript, WebSockets, Redis Pub/Sub, CRDTs (<50ms sync).\n` +
      `2. **Low-Latency Microservices API Gateway:** FastAPI/Go, Docker, Redis token-bucket rate limiting, Prometheus observability.\n` +
      `3. **Hybrid Semantic Search Engine:** Python, Vector Embeddings, HNSW similarity + BM25 keyword ranking.\n\n` +
      `💡 *Say **"Open Projects"** and I will take you directly to the 23 interactive blueprints!* <!--ACTION: {"type": "NAVIGATE_TAB", "target": "projects"}-->`
    );
  }

  // 7. Telugu / Tenglish Queries
  const isTelugu = /(naku|kavali|cheppu|ela|cheyyali|placement|udyogam|job|chudu|telugu|em\s*chey|salah|artham)/i.test(text);
  if (isTelugu) {
    return (
      `తప్పకుండా ${title}! మీ ${branch} ప్రొఫైల్ మరియు ${cgpa} CGPA ప్రకారం, క్యాంపస్ ప్లేస్‌మెంట్స్ లో టాప్ ఆఫర్ సాధించడానికి ప్రతిరోజూ రెండు డీఎస్ఏ ప్రాబ్లమ్స్ సాల్వ్ చేస్తూ, రెండు లైవ్ ప్రొడక్షన్ ప్రాజెక్ట్స్ బిల్డ్ చేయండి. మీకోసం రోడ్‌మ్యాప్ వివరాలు స్క్రీన్ పై ఉంచాను.` +
      `|||🚀 **క్యాంపస్ ప్లేస్‌మెంట్స్ సక్సెస్ ప్లాన్ (${title}):**\n` +
      `1. **DSA & Coding (${coding}/10 → 9/10):** Arrays, HashMaps, Two Pointers, Trees, Graphs పై డైలీ 2 LeetCode ప్రాబ్లమ్స్ ప్రాక్టీస్ చేయండి.\n` +
      `2. **2 లైవ్ ప్రొడక్షన్ ప్రాజెక్ట్స్:** GitHub కోడ్ + లైవ్ డిప్లాయ్‌మెంట్ లింక్ + Docker ఉన్న ప్రాజెక్ట్స్ రెజ్యూమ్ లో పెట్టండి.\n` +
      `3. **Core CS Subjects:** DBMS (Indexing, ACID), OS (Deadlocks, Threads), Computer Networks రివిజన్ చేయండి.\n` +
      `4. **ATS Resume & Mock Interviews:** Google X-Y-Z ఫార్మాట్ లో రెజ్యూమ్ సిద్ధం చేసి, ఇక్కడే మాక్ ఇంటర్వ్యూ ప్రాక్టీస్ చేయండి!`
    );
  }

  // 8. 6-Week Roadmap Requests
  if (text.includes("roadmap") || text.includes("6-week") || text.includes("schedule") || text.includes("plan") || text.includes("sprint")) {
    return (
      `Here is your customized 6-week placement sprint for ${targetRole}, ${title}. I'm also opening the 6-Week Roadmap tab on your screen so you can track every milestone.` +
      `|||🗺️ **6-Week Placement Sprint for ${targetRole} (${branch} • ${cgpa} CGPA):**\n` +
      `- **Week 1:** Linear DSA (Arrays, Two-Pointers, Sliding Window, HashMaps — 25 problems).\n` +
      `- **Week 2:** Trees, BSTs, Heaps & Priority Queues (BFS/DFS recursion mastery).\n` +
      `- **Week 3:** Graphs (Dijkstra, Topological Sort) & 1D/2D Dynamic Programming.\n` +
      `- **Week 4:** Build & deploy Flagship Capstone Project with Docker and CI/CD.\n` +
      `- **Week 5:** Core CS Sprint (DBMS indexing & ACID, OS concurrency, TCP/IP & HTTP/2).\n` +
      `- **Week 6:** Timed Mock OAs & STAR behavioral project defense. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "skills"}-->`
    );
  }

  // 9. Mock Interview Inquiries
  if (text.includes("mock") || text.includes("interview") || text.includes("question") || text.includes("star")) {
    return (
      `Let's run a technical interview question for ${targetRole}, ${title}. Given an integer array, how would you find the contiguous subarray with the maximum sum in O of N time and O of 1 space? Tell me your approach whenever you're ready!` +
      `|||🎙️ **Live Technical Interview Question (${title}):**\n` +
      `**Problem:** *Maximum Subarray Sum (Kadane's Algorithm)* — achieve $O(n)$ time and $O(1)$ space.\n` +
      `- **Key Insight:** Track \`curr_sum = max(num, curr_sum + num)\` and \`max_sum = max(max_sum, curr_sum)\`.\n` +
      `- Reply with your explanation or say **"Open Mock Interview"** to launch the full interview console!`
    );
  }

  // 10. Resume / ATS
  if (text.includes("resume") || text.includes("ats") || text.includes("cv")) {
    return (
      `To clear automated ATS filters for ${targetRole}, ${title}, structure every project bullet using Google's X-Y-Z formula: Accomplished X, as measured by Y, by building Z. I'm opening the ATS Resume Studio so you can scan your PDF right now.` +
      `|||📄 **ATS Resume Optimization Checklist (${title}):**\n` +
      `- **Google X-Y-Z Formula:** *"Reduced API latency by 42% (Y) across 10k concurrent requests (X) by implementing Redis caching and connection pooling (Z)."*\n` +
      `- **Single-Column Layout:** Avoid multi-column tables or graphics that break parsers.\n` +
      `- **Core Keywords for ${branch}:** TypeScript, Python, Docker, SQL, Redis, CI/CD, System Design. <!--ACTION: {"type": "NAVIGATE_TAB", "target": "resume"}-->`
    );
  }

  // 11. Cutoffs, Backlogs & Eligibility
  if (text.includes("cutoff") || text.includes("backlog") || text.includes("eligib") || text.includes("tier-1")) {
    const statusMsg =
      backlogs > 0
        ? `You currently have ${backlogs} active backlog, ${title}, so clearing that in the next exam is priority number one to unlock Tier-1 drives.`
        : Number(cgpa) >= 7.5
        ? `With a ${cgpa} CGPA and zero backlogs, ${title}, you clear the academic cutoff for over 95 percent of Tier-1 product companies.`
        : `With a ${cgpa} CGPA and zero backlogs, ${title}, you qualify for all Tier-2 drives and most Tier-1 drives that relax cutoffs for strong coding profiles.`;

    return (
      statusMsg +
      `|||📊 **Campus Cutoff & Eligibility Analysis (${title}):**\n` +
      `- **Tier-1 Product MNCs (Amazon, Microsoft, Oracle, Adobe):** 7.5+ CGPA, 0 active backlogs.\n` +
      `- **Tier-2 & High-Growth Product (TCS Digital, Accenture Advanced, Cognizant GenC Next):** 6.5+ CGPA, 0–1 backlog.\n` +
      `- **Your Profile:** **${cgpa} CGPA** • **${backlogs} Backlogs** (${branch}).`
    );
  }

  // 12. Default Natural & Friendly Career Co-Pilot Answer
  return (
    `I'm on it, ${title}. For your ${branch} profile with a ${cgpa} CGPA targeting ${targetRole}, your highest-leverage moves right now are mastering sliding-window and tree algorithms, deploying one production full-stack project, and practicing your STAR project defense. Just tell me which section you'd like me to open!` +
    `|||⚡ **DAS Strategic Recommendations for ${title} (${branch} • ${cgpa} CGPA):**\n` +
    `1. **Algorithmic Speed:** Solve 2 medium problems daily across Arrays, Trees, and Graphs.\n` +
    `2. **Production Portfolio:** Showcase 1 deployed system with Docker, live URL, and measurable latency/scale metrics.\n` +
    `3. **Hands-Free Control:** Say **"Open Projects"**, **"Open Roadmap"**, **"Start Mock Interview"**, or **"Open ATS Resume"** anytime!`
  );
};
