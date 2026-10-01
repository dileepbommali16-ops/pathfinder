import { StudentProfileState } from "@/components/dashboard/ProfileEvaluator";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const isTeluguScript = (text: string): boolean => {
  return /[\u0C00-\u0C7F]/.test(text);
};

const isRomanTelugu = (text: string): boolean => {
  const lower = text.toLowerCase();
  const keywords = [
    "naku", "naaku", "enti", "ela", "unnayi", "unnavu", "unnava", "kavali", "cheyali",
    "cheddam", "nerchukovali", "raadhu", "radhu", "gurinchi", "avthunna", "avthunda",
    "telidu", "thelidhu", "sangathulu", "chesuko", "padaku", "bhayapada", "chudochu",
    "bagunna", "em cheyali", "job kavali", "evaru", "ippudu", "manaki", "chances enti"
  ];
  return keywords.some(k => new RegExp(`\\b${k}\\b`, "i").test(lower));
};

export const getCareerAgentResponse = (
  message: string,
  history: ChatMessage[] = [],
  profile: StudentProfileState
): string => {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  // Find last assistant message to understand context / follow-ups
  let lastAssistantMsg = "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") {
      lastAssistantMsg = history[i].content.toLowerCase();
      break;
    }
  }

  // -------------------------------------------------------------
  // 1. FOLLOW-UP HANDLING & CONTEXTUAL MEMORY
  // -------------------------------------------------------------
  if (lastAssistantMsg) {
    // Follow-up: Python comfort level
    if (lastAssistantMsg.includes("python level") || lastAssistantMsg.includes("comfort with python")) {
      if (/intermediate|medium|comfortable|good|okay/i.test(lower)) {
        return "Awesome! 👍 Since you already have intermediate Python comfort, we won't waste time on basic loops. Let's dive straight into **NumPy + Pandas for data manipulation**, followed by building a real machine learning or backend project. How many hands-on projects have you built so far?";
      }
      if (/beginner|noob|start|basic|zero/i.test(lower)) {
        return "No worries at all! Starting from basics is completely fine 😊 Let's do a fast 10-day sprint: Syntax & Data Structures (Lists, Dicts, Sets) → Functions & Lambda → File I/O & OOP. Commit to 1 hour daily writing actual code. Ready to tackle Day 1?";
      }
    }

    // Follow-up: Mock Interview Round 1 (List vs Tuple)
    if (lastAssistantMsg.includes("list and a tuple") || lastAssistantMsg.includes("round 1")) {
      return `Great answer! 🎯 You nailed the core distinction.

**Evaluation & Feedback:**
- **What was correct:** Spot on—Lists are mutable (can be altered, appended, modified), while Tuples are immutable (read-only after creation).
- **Bonus Interviewer Points:** In Python, tuples have a smaller memory footprint and faster iteration speed. Because they are immutable, tuples are hashable and can be used as Dictionary keys, whereas lists cannot.

---
**Round 1 — Question 2 (Python & Core CS):**
*Explain the difference between a shallow copy and a deep copy in Python. In what practical scenario would a shallow copy create an unexpected bug?*

Take your shot!`;
    }

    // Follow-up: Mock Interview Round 2 (Shallow vs Deep Copy)
    if (lastAssistantMsg.includes("shallow copy and a deep copy")) {
      return `Excellent articulation! 🚀

**Evaluation & Feedback:**
- **What was correct:** Exactly—a shallow copy duplicates the outer container but keeps references to nested objects, whereas a deep copy recursively clones all child objects.
- **Real-World Impact:** Modifying a nested list or dict in a shallow copy inadvertently mutates the original object—a notorious bug in data pipelines.

---
**Round 1 — Question 3 (Algorithm & Complexity):**
*Given an array of integers, how would you find two numbers that sum up to a specific target in O(N) time complexity? Which data structure would you use?*`;
    }

    // Follow-up: Domain choice
    if (lastAssistantMsg.includes("which direction are you targeting") || lastAssistantMsg.includes("ai/ml or data analytics")) {
      if (/ai|ml|machine learning/i.test(lower)) {
        return "Got it! Focusing on **AI/ML** 🚀 Let's skip generic web tech and concentrate on: (1) Core Python & Matrix Math, (2) Scikit-Learn Supervised/Unsupervised models, (3) 1 End-to-end deployed model. What is your current comfort with Python?";
      }
    }
  }

  // -------------------------------------------------------------
  // 2. CASUAL CHAT & WARM HUMAN MIRRORING
  // -------------------------------------------------------------
  if (lower.includes("love you") || lower.includes("love u")) {
    return "Aww 😄 That's sweet! I appreciate you too ❤️\nNow let's get you closer to your career goals. What are we conquering today?";
  }

  if (["hi", "hello", "hey", "hii", "heyy", "hola", "namaste", "namaskaram"].includes(lower)) {
    return "Hey! 👋 Nice to meet you. What are you working on today? Placements, coding, mock interviews, or resume review?";
  }

  if (["how are you", "how are you?", "how r u", "how r u?"].includes(lower)) {
    return "I'm doing great, fully charged and ready to guide you! 😊 Career strategy, DSA patterns, mock interviews, or just a quick question—how can I help today?";
  }

  if (["bro", "brother", "yo bro", "hey bro"].includes(lower)) {
    return "Yeah bro 😄 tell me! What's on your mind today? Let's crack those placements!";
  }

  if (/bro ela unnava|ela unnav bro|ela unnaru|bagunnava/i.test(lower)) {
    return "Super bro! Chala bagunna 😊 Enti sangathulu? Placements, coding, or general discussion—em cheddam?";
  }

  if (lower.includes("python baaga istam") || lower.includes("python istam")) {
    return "Super! 🐍 Python is one of the most versatile and in-demand languages in tech today. Whether you want to crack Tier-1 Software Engineering (backend with FastAPI/Django, DSA) or transition into Data Science & AI/ML, Python gives you a massive advantage.\n\nAre you looking to use Python for Software Development, Data Engineering, or AI/Machine Learning?";
  }

  if (/placement kosam em nerchukovali|placements kosam em nerchukovali|em nerchukovali/i.test(lower)) {
    return `Placement crack cheyyడానికి ముఖ్యంగా 3 స్తంభాలు (Pillars) అవసరం:
1. **Core Problem Solving (DSA):** Blind 75 లో ముఖ్యమైన patterns — Arrays, Sliding Window, Two Pointers, Binary Search మరియు Trees (BFS/DFS).
2. **One Flagship Project:** ఒక full-stack లేదా AI project ని live deploy చేసి GitHub లో clear documentation తో ఉంచండి.
3. **Core CS Subjects & STAR Storytelling:** DBMS (SQL queries), OS basics, మరియు interview లో మీ projects ని STAR method లో వివరించగలగడం.

మీ ప్రస్తుత టార్గెట్ రోల్ (${profile.targetRole}) కి తగినట్టు వీక్లీ ప్లాన్ ఇస్తాను. రోజూ కోడింగ్ కి ఎంత సమయం కేటాయించగలరు?`;
  }

  if (["thanks", "thank you", "thx", "dhanyavadalu", "chala thanks"].includes(lower)) {
    return "Anytime! 🙌 Always here in your corner. What would you like to tackle next?";
  }

  if (["bye", "bye bro", "tata", "good night", "see you"].includes(lower)) {
    return "Bye! 👋 Keep up the high energy and momentum. Come back whenever you want to practice or review!";
  }

  if (lower.includes("about yourself") || lower.includes("who are you")) {
    return `I am **Pathfinder AI Career Agent**—your personalized campus placement mentor and career strategist! 🚀

I'm directly connected with your live candidate profile to:
- 🎯 Analyze placement probabilities and academic eligibility cutoffs
- 🔍 Diagnose skill gaps and prescribe 6-week acceleration roadmaps
- 🎙️ Conduct interactive technical and STAR mock interviews with real-time critique
- 📄 Optimize resumes using the Google X-Y-Z formula and ATS keyword scanners
- 💡 Recommend production-grade flagship projects with verified GitHub blueprints

What part of your career journey would you like to accelerate right now?`;
  }

  if (lower.includes("what can you do") || lower.includes("what are your features")) {
    return `Here is everything I can do for you right here inside Pathfinder:

1. 🎯 **Placement Strategy:** Analyze your CGPA (${profile.cgpa}), coding score (${profile.coding}/10), and backlogs (${profile.backlogs}) to maximize tier-1 shortlisting.
2. 🔍 **Skill-Gap Diagnosis:** Identify high-priority DSA, system design, or domain gaps for your target role.
3. 🗺️ **6-Week Custom Roadmap:** Step-by-step weekly milestone planning from foundations to campus drives.
4. 🎙️ **Interactive Mock Interviews:** Ask real technical and behavioral questions one by one with immediate feedback.
5. 📄 **ATS Resume Optimization:** Review project bullet points using the Google X-Y-Z formula.
6. 💡 **Flagship Project Mentorship:** Brainstorm production-grade full-stack and AI project architectures.

Where would you like to start?`;
  }

  // -------------------------------------------------------------
  // 3. TELUGU SCRIPT SCENARIOS
  // -------------------------------------------------------------
  if (isTeluguScript(msg)) {
    if (msg.includes("ఎలా ఉన్నావు") || msg.includes("ఎలా ఉన్నారు")) {
      return "హాయ్! నేను చాలా బాగున్నాను 😊 మీ ప్రిపరేషన్ ఎలా సాగుతోంది? ఈరోజు ప్లేస్‌మెంట్స్, కోడింగ్ లేదా రెజ్యూమ్ గురించి ఏమి మాట్లాడదాం?";
    }

    if (msg.includes("ఎక్కడ మొదలుపెట్టాలో") || msg.includes("ai నేర్చుకోవాలి") || msg.includes("పైథాన్ నేర్చుకోవాలి")) {
      return `చింతించకండి 😊 AI నేర్చుకోవడం చాలా సులభంగా క్రమపద్ధతిలో ప్రారంభించవచ్చు!

**మీ మొదటి 4 దశల ప్రణాళిక:**
1. **పైథాన్ బేసిక్స్ (2 వారాలు):** వేరియబుల్స్, లిస్ట్‌లు, డిక్షనరీలు, లూప్స్ మరియు ఫంక్షన్స్.
2. **డేటా లైబ్రరీలు (2 వారాలు):** NumPy (మ్యాట్రిక్స్ లెక్కలు), Pandas (డేటా అనాలిసిస్).
3. **మెషిన్ లెర్నింగ్ బేసిక్స్ (3 వారాలు):** Scikit-Learn తో Linear Regression, Decision Trees, Random Forest.
4. **ఒక లైవ్ ప్రాజెక్ట్:** ఉదాహరణకు స్టూడెంట్ ప్లేస్‌మెంట్ లేదా సేల్స్ ప్రిడిక్టర్ లాంటి ఎండ్-టు-ఎండ్ మోడల్.

ప్రస్తుతం మీకు పైథాన్ ఎంతవరకు తెలుసు—పూర్తిగా బిగినరా లేక కొద్దిగా వచ్చా?`;
    }

    return "నమస్కారం! నేను మీ పాత్‌ఫైండర్ AI కెరీర్ మెంటార్‌ని. మీ ప్లేస్‌మెంట్ ప్రిపరేషన్, డీఎస్ఏ (DSA), లేదా రెజ్యూమ్‌ను మెరుగుపరచడానికి నేను సిద్ధంగా ఉన్నాను. మీరు ప్రస్తుతం ఏ రోల్ కోసం ప్రిపేర్ అవుతున్నారు?";
  }

  // -------------------------------------------------------------
  // 4. ROMAN TELUGU & MULTI-INTENT SCENARIOS
  // -------------------------------------------------------------
  if ((lower.includes("weak") || lower.includes("raadhu") || lower.includes("radhu")) && 
      (lower.includes("tension") || lower.includes("bhayapada") || lower.includes("scared") || lower.includes("em cheyali"))) {
    return `Don't worry 😊 Python weak ga undadam fix cheyyagalige thing. Placements gurinchi tension padalsina avasaram ledhu, manam plan cheddam!

Nee placement goal ni mind lo pettukoni, step-by-step roadmap idigo:
1. **Python Fundamentals (Days 1–10):** Syntax, lists, dicts, loops, and basic functions.
2. **Small Practical Projects (Days 11–20):** Build small scripts (data cleaner, mini web scraper).
3. **Core DSA Patterns (Days 21–35):** Blind 75 easy/medium problems (Two Pointers, HashMaps, Sliding Window).
4. **Mock Interviews & Resume (Days 36–42):** Behavioral STAR stories and project reviews.

Roju 1–2 hours dedicate cheyagalava? Currently nee target role enti — Software Engineer (SDE) or Data/AI?`;
  }

  if ((lower.includes("python raadhu") || lower.includes("python radhu") || lower.includes("python thelidhu") || lower.includes("python raadu")) &&
      (lower.includes("ai") || lower.includes("job") || lower.includes("kavali"))) {
    return `Don't worry bro 😊 Python raakapovadam pedda problem kaadhu, easily nerchukovachu!

AI/ML job kavalante roadmap idigo:
1. **Python Fundamentals (2 Weeks):** Syntax, lists, dicts, loops, functions, and OOP basics.
2. **Data & Math Libraries (2 Weeks):** NumPy, Pandas, and Matplotlib.
3. **Machine Learning Basics (3 Weeks):** Scikit-Learn (Linear Regression, Decision Trees, Random Forest).
4. **1 Flagship Project:** Build an end-to-end ML model (like Pathfinder's Placement Predictor).

First step ga, roju 1 hour time spend cheyagalava Python basics ki?`;
  }

  if (lower.includes("job kavali")) {
    return `Tension padaku bro 😄 Manam plan cheddam! Placement crack cheyyadam step-by-step process.

First 3 essentials:
1. **Target Role Fix Chesuko:** SDE (Software Engineer), Data/AI, or Web Development?
2. **DSA Consistency:** Roju 2 LeetCode problems (Array/String patterns).
3. **One Solid Project:** Resume lo highlight cheyadaniki oka deployed project with live URL.

Tell me bro, nee branch (${profile.branch}) lo unna targets enti and target chestunna role enti?`;
  }

  if (lower.includes("gaps enti") || lower.includes("skills lo gap") || lower.includes("skill gap")) {
    return `Nee profile (CGPA: ${profile.cgpa}, Coding: ${profile.coding}/10) ni analyze chesi chusthe:

Based on current candidate benchmark:
- **Core DSA Patterns:** LeetCode medium frequency patterns practice cheyali (Two Pointers, Sliding Window).
- **Full-Stack / Deployed Project:** Live demo & GitHub unna production-grade project undali.
- **STAR Storytelling:** Technical interview rounds lo projects ni structured ga explain cheyagalagali.

Nuvvu dashboard lo **Skill Gap** section click chesthe visual breakdown kuda chudochu! Ee areas lo denitho start cheddam?`;
  }

  if (lower.includes("placement chances") && isRomanTelugu(lower)) {
    return `Nee profile (CGPA: ${profile.cgpa}, Backlogs: ${profile.backlogs}) ni batti, Pathfinder **Placement Prediction Engine** score evaluate chestundi:

- **Placements Eligibility:** ${profile.backlogs === 0 ? "0 Backlogs unte 90%+ campus company cutoffs clear avthayi." : `${profile.backlogs} backlogs ventane clear cheyali to meet cutoff.`}
- **Shortlisting Probability:** Rendu vishayalu decide chestayi: (1) DSA pattern coding score (${profile.coding}/10), (2) One deployed flagship project.

Nee profile parameters ni dashboard లోని **Calculate Readiness** button tho live check cheyochu! Ee roju DSA or Project lo deni mida focus cheddam?`;
  }

  // -------------------------------------------------------------
  // 5. EMOTIONAL INTELLIGENCE & REASSURANCE
  // -------------------------------------------------------------
  if (lower.includes("failed my interview") || lower.includes("interview fail") || lower.includes("rejected in interview")) {
    return `That hurts, but one interview doesn't define your career or your potential. Even the best senior engineers fail multiple interviews before landing the right offer.

Let's turn this setback into preparation:
1. **Did you get stuck on DSA, Core CS, or Project deep-dives?**
2. **Write down every question you were asked** right now while memory is fresh.
3. **Identify the exact weak point** so it never trips you up again.

Tell me—what specific questions or rounds gave you trouble? Let's dissect them together.`;
  }

  if (lower.includes("everyone is getting internships except me") || lower.includes("everyone getting placed") || lower.includes("nobody is hiring me")) {
    return `That can definitely feel frustrating and overwhelming. But comparing someone else's highlight reel to your behind-the-scenes only adds anxiety.

Let's focus strictly on what you can control right now:
1. Sharpening your core stack (Python/Java + SQL)
2. Shipping one impressive, deployed project that speaks for itself
3. Fixing your resume with the Google X-Y-Z formula

Let's build a practical plan from where you are now. What specific role is your #1 priority?`;
  }

  if (lower.includes("scared about placements") || lower.includes("placement tension") || lower.includes("anxious about placements")) {
    return `Placement fear is completely natural—almost every engineer goes through it. The good news is that campus hiring follows predictable patterns:

- Online screenings focus on 5-6 core DSA patterns
- Technical rounds focus on project architecture and basic CS fundamentals (OS, DBMS, Networks)
- HR rounds focus on STAR behavioral communication

When you break it down into daily 90-minute blocks, the fear disappears. What is your biggest concern right now—coding, CGPA, or interviews?`;
  }

  // -------------------------------------------------------------
  // 6. TECHNICAL, ROADMAP & MOCK INTERVIEW CORE SCENARIOS
  // -------------------------------------------------------------
  if (lower.includes("3rd year") || lower.includes("third year") || lower.includes("placements are coming")) {
    return `Being in 3rd year gives you the perfect runway before campus placement drives hit 🚀

Here is your prioritized game plan:
1. **Clear Active Backlogs & Keep CGPA >= 7.5:** Removes 90% of company eligibility cutoffs immediately.
2. **Blind 75 DSA Patterns:** Master Two-Pointers, Sliding Window, Trees, and Dynamic Programming.
3. **1 Flagship Deployed Project:** Build a production-grade full-stack or ML project with GitHub link and live demo.
4. **Core CS Fundamentals:** Revise OS (threads/processes), DBMS (indexing, ACID, SQL), and Computer Networks.

Your current CGPA is ${profile.cgpa}. Let's make sure you're cracking at least 2 pattern problems daily!`;
  }

  if (lower.includes("python or java") || lower.includes("java or python")) {
    return `Great question! Both are powerhouses for campus placements, but their strengths differ:

- **Choose Python if:**
  - You are targeting **AI/ML, Data Science, or Automation**.
  - You want rapid prototyping and clean syntax for online coding screening rounds.
  - You prefer working with modern AI frameworks (FastAPI, PyTorch, LangChain).

- **Choose Java if:**
  - You are targeting **Tier-1 Enterprise MNCs & Fintechs** (Amazon, Oracle, JPMorgan).
  - You want deep Object-Oriented Design (OOP) and Spring Boot backend enterprise roles.
  - Your campus placement drives strictly test Java-based DSA.

**Verdict:** If your goal is Software Engineering at large MNCs, Java is classic. If your goal is AI, Startups, or Data, Python is the clear winner. Which role are you leaning toward?`;
  }

  if (lower.includes("6 week roadmap") || lower.includes("six week roadmap") || lower.includes("make me a roadmap") || lower.includes("roadmap")) {
    return `### 🚀 6-Week Strategic Campus Placement Acceleration Roadmap

- **Week 1 (Foundations & Patterns):** Arrays, Strings, Two Pointers, Sliding Window. Solve 15 pattern problems.
- **Week 2 (Data Structures):** Binary Search, Monotonic Stacks, HashMaps, Recursion basics.
- **Week 3 (Trees & Graphs):** BFS/DFS, Binary Trees, Level-order traversal. Core CS: OS & DBMS fundamentals.
- **Week 4 (Flagship Project):** Build and deploy a full-stack or ML application with authentication and live URL.
- **Week 5 (System Design & Mock Rounds):** RESTful APIs, SQL joins/indexing, timed mock coding tests.
- **Week 6 (ATS Resume & Behavioral):** Optimize single-column resume with Google X-Y-Z formula, master 3 STAR stories.

You can also check the **6-Week Roadmap** tab on your dashboard for the visual weekly milestone tracker!`;
  }

  if (/give me a mock interview|take my interview|mock interview|start interview|interview/i.test(lower)) {
    return `Awesome! Let's do a real, interactive mock technical interview 😎

**Rules:**
- I will ask **one question at a time**.
- You answer naturally.
- I'll evaluate what was great, what was missing, and give you the model answer.
- Then we move to the next question.

---
**Round 1 — Core Data Structures & Python:**
*What is the difference between a \`list\` and a \`tuple\` in Python, and in what scenario would you choose a tuple over a list for performance or design?*

Take your shot!`;
  }

  if (lower.includes("ml interview") || lower.includes("machine learning interview")) {
    return `Awesome! Let's start with a foundational machine learning interview question:

**Question 1:**
*What is the difference between Overfitting and Underfitting, and what are 2 practical ways to prevent overfitting in a decision tree or neural network?*

Take your time and give your answer—I'll evaluate it and give you feedback!`;
  }

  if (lower.includes("based on my profile") || lower.includes("what should i improve")) {
    return `Looking at your active Pathfinder candidate profile:

- **Academic CGPA (${profile.cgpa}/10.0):** ${profile.cgpa >= 7.5 ? "Solid! Maintain this to guarantee eligibility across 95% of campus drives." : "Aim to push this above 7.5 to clear MNC cutoffs."}
- **DSA & Problem Solving (${profile.coding}/10):** Focus on Blind 75 pattern recognition (Two-Pointers, Sliding Window, BFS/DFS).
- **Internships (${profile.internships} Practical Experience):** Build at least one deployed full-stack or ML application with a live URL and clean GitHub README.
- **Active Backlogs (${profile.backlogs}):** ${profile.backlogs === 0 ? "Clean academic record!" : "Priority #1 is clearing backlogs before company drives begin."}
- **STAR Storytelling:** Prepare 3 structured stories for your technical and behavioral interviews.

Which of these areas feels like your biggest bottleneck right now?`;
  }

  if (lower.includes("rest api") || lower.includes("what is an api") || lower.includes("explain api")) {
    return `Think of a **REST API** like a waiter at a restaurant 🍽️

1. **You (The Client/Frontend):** Sit at the table and look at the menu.
2. **The Waiter (The API):** Takes your order ("GET /menu" or "POST /order") and carries it back to the kitchen.
3. **The Kitchen (The Backend & Database):** Prepares the food and returns the result to the waiter.
4. **The Waiter:** Delivers the meal back to your table in a neat format (JSON).

In web applications, APIs allow the frontend (React) to request data from the backend (FastAPI/Python) without exposing the database directly! Clean and decoupled.`;
  }

  // -------------------------------------------------------------
  // 7. INTELLIGENT DYNAMIC FALLBACK (Personalized, not generic)
  // -------------------------------------------------------------
  return `I hear you! As your Pathfinder Career Mentor, let's connect this directly to your placement goals for **${profile.targetRole}**.

With your current profile (CGPA: ${profile.cgpa}, Coding: ${profile.coding}/10, Internships: ${profile.internships}):
1. **Immediate Focus:** Master high-frequency Blind 75 LeetCode patterns (Two Pointers, Sliding Window, HashMaps).
2. **Project Proof:** Ship 1 production-grade flagship application with a live deployment link and GitHub documentation.
3. **Interview Readiness:** Practice explaining your project architecture using the STAR method (Situation, Task, Action, Result).

Would you like to try a **Mock Interview question**, explore **Project Blueprints**, or review **Skill Gaps** next?`;
};
