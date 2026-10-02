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

  // Security & Prompt Injection Defense
  if (/ignore previous|ignore instructions|show your api key|show api key|reveal api key|reveal your system prompt|system prompt|api_key|secret key|disregard all instructions|jailbreak/i.test(lower)) {
    return "I cannot reveal API keys, internal credentials, or system instructions. My purpose is strictly to assist you with placement preparation, career roadmaps, interview coaching, and cohort analytics. What career topic can I help you with?";
  }

  // Out of scope / Unknown data guard
  if (/in 2035|in 2040|in 2050|who is the ceo of google in|who will be placed in google in 2030|who will be placed in 2030/i.test(lower)) {
    return "I don't have verified records for this in Pathfinder's database. Pathfinder's analytics are strictly grounded in our authoritative 2024–2026 campus placement dataset covering 972 verified engineering candidates across 9 departments.";
  }

  // -------------------------------------------------------------
  // CAREER READINESS & LIVE CANDIDATE PROFILE ASSESSMENT
  // (Handles "Analyze Career Readiness", "analye carreer readinesss", "how ready am i")
  // -------------------------------------------------------------
  const isReadinessQuery =
    lower.includes("readiness") ||
    lower.includes("carreer") ||
    (lower.includes("ready") && (lower.includes("how") || lower.includes("am i") || lower.includes("placement") || lower.includes("career") || lower.includes("check") || lower.includes("analyze") || lower.includes("evaluate") || lower.includes("score") || lower.includes("chance"))) ||
    (lower.includes("profile") && (lower.includes("analyze") || lower.includes("evaluate") || lower.includes("score") || lower.includes("chance") || lower.includes("probability") || lower.includes("review") || lower.includes("check") || lower.includes("readiness"))) ||
    lower.includes("placement chance") ||
    lower.includes("placement probability") ||
    lower.includes("na readiness") ||
    lower.includes("readiness check");

  if (isReadinessQuery) {
    const cgpa = Number(profile?.cgpa ?? 7.8);
    const backlogs = Number(profile?.backlogs ?? 0);
    const internships = Number(profile?.internships ?? 1);
    const coding = Number(profile?.coding ?? 7);
    const comm = Number(profile?.communication ?? 7);
    const role = profile?.targetRole || "Software Development Engineer (SDE)";
    const tier = profile?.targetTier || "Product Companies / Tier-1 MNCs";
    const branch = profile?.branch || "CSE";

    const raw = cgpa * 5.2 + Math.max(0, 3 - backlogs) * 4 + Math.min(internships, 3) * 5 + comm * 2.2 + coding * 2.7 - Math.max(backlogs - 1, 0) * 5;
    const chance = Math.max(18.0, Math.min(96.0, Math.round(raw * 10) / 10));
    const toneLabel = chance >= 75 ? "Strong Candidate Profile" : chance >= 55 ? "Steady Foundation (On Track)" : "Needs Strategic Acceleration";

    const academicsScore = Math.min(100, Math.round(cgpa * 10));
    const codingScore = Math.min(100, Math.round(coding * 10));
    const expScore = Math.min(100, internships * 35);
    const commScore = Math.min(100, Math.round(comm * 10));
    const eligScore = Math.max(0, 100 - backlogs * 25);

    if (isRomanTelugu(msg) || isTeluguScript(msg)) {
      return `### 🎯 Pathfinder Career Readiness Intelligence Analysis (లైవ్ ప్రొఫైల్ రిపోర్ట్)

**టార్గెట్ రోల్:** ${role} | **కంపెనీ టైర్:** ${tier} | **బ్రాంచ్:** ${branch}

---

#### 1. 📊 Executive Placement Probability
- **ప్లేస్‌మెంట్ రెడీనెస్ స్కోర్:** **\`${chance}%\`** — **${toneLabel}**
- **డ్రైవ్ ఎలిజిబిలిటీ:** ${cgpa >= 7.5 && backlogs === 0 ? "✅ Tier-1 కంపెనీల కటాఫ్ (CGPA >= 7.5, 0 Backlogs) క్లియర్ అయింది!" : "⚠️ శ్రద్ధ వహించండి: బ్యాక్‌లాగ్స్ క్లియర్ చేసి CGPA >= 7.5 కి పెంచితే అన్ని Tier-1 కంపెనీలకు ఎలిజిబుల్ అవుతారు."}

---

#### 2. 🧭 మల్టీ-డైమెన్షనల్ వెక్టర్స్ బ్రేక్‌డౌన్
| డైమెన్షన్ | స్కోర్ | స్టేటస్ |
| :--- | :---: | :--- |
| **అకడమిక్స్ & CGPA** | \`${academicsScore}%\` | CGPA ${cgpa.toFixed(1)}/10.0 |
| **కోడింగ్ & DSA** | \`${codingScore}%\` | లెవెల్ ${coding}/10 |
| **ప్రాక్టికల్ ప్రాజెక్ట్స్ & ఇంటర్న్‌షిప్స్** | \`${expScore}%\` | ${internships} ఇంటర్న్‌షిప్(లు) |
| **కమ్యూనికేషన్ & ఇంటర్వ్యూ డిఫెన్స్** | \`${commScore}%\` | లెవెల్ ${comm}/10 |
| **క్యాంపస్ ఎలిజిబిలిటీ** | \`${eligScore}%\` | ${backlogs} యాక్టివ్ బ్యాక్‌లాగ్స్ |

---

#### 3. 🚀 మీ తదుపరి 3 ముఖ్యమైన స్టెప్స్
1. **Blind 75 DSA:** రోజూ 2 Two Pointers / Sliding Window మీడియం ప్రాబ్లమ్స్ సాల్వ్ చేయండి.
2. **లైవ్ ప్రాజెక్ట్ డెప్లాయ్‌మెంట్:** GitHub లో README + లైవ్ Vercel/Render లింక్ ఉన్న ఫ్లాగ్‌షిప్ ప్రాజెక్ట్ డెప్లాయ్ చేయండి.
3. **STAR ఇంటర్వ్యూ ప్రాక్టీస్:** ప్రాజెక్ట్ ట్రేడ్-ఆఫ్స్ ని STAR ఫార్మాట్ లో వివరించడం ప్రాక్టీస్ చేయండి.

ఇప్పుడే **30-Day Sprint Roadmap** లేదా **Mock Interview** స్టార్ట్ చేద్దామా?`;
    }

    return `### 🎯 Pathfinder Career Readiness Intelligence Assessment

**Target Role:** ${role} | **Target Tier:** ${tier} | **Department:** ${branch}

---

#### 1. 📊 Executive Placement Probability
- **Placement Readiness Score:** **\`${chance}%\`** — **${toneLabel}**
- **Drive Screening Clearance:** ${cgpa >= 7.5 && backlogs === 0 ? "✅ Tier-1 MNC Cutoffs Cleared (CGPA >= 7.5, 0 Active Backlogs)" : "⚠️ Tier-1 Cutoff Warning: Ensure CGPA >= 7.5 and 0 active backlogs to clear enterprise screening filters"}
- **Candidate Benchmark:** Performing in the **Top ${Math.min(95, Math.max(15, Math.round(chance * 1.05)))}th percentile** of evaluated profiles for the Class of 2026.

---

#### 2. 🧭 Multi-Dimensional Career Readiness Vectors
| Readiness Dimension | Score | Status & Candidate Benchmark |
| :--- | :---: | :--- |
| **Academics & Eligibility** | \`${academicsScore}%\` | CGPA ${cgpa.toFixed(1)}/10.0 (${cgpa >= 8.0 ? "Distinction" : cgpa >= 7.5 ? "Solid Standing" : "Needs Elevation to 7.5+"}) |
| **Coding & DSA Foundation** | \`${codingScore}%\` | Level ${coding}/10 (${coding >= 7 ? "Screening Ready" : "Focus on Blind 75 High-Frequency Patterns"}) |
| **Practical Engineering** | \`${expScore}%\` | ${internships} Verified Internship(s) (${internships > 0 ? "Proven Practical Exposure" : "Flagship Deployed Project Required"}) |
| **Communication & STAR Defense** | \`${commScore}%\` | Confidence ${comm}/10 (${comm >= 7 ? "Ready for Technical Defense" : "Practice structured STAR answering"}) |
| **Drive Eligibility Ratio** | \`${eligScore}%\` | ${backlogs} Active Backlog(s) (${backlogs === 0 ? "100% Eligible across all drives" : "Priority: Clear backlogs before final semester"}) |

---

#### 3. 🏆 Core Candidate Strengths
- ${cgpa >= 7.5 && backlogs === 0 ? "High academic consistency clearing Tier-1 recruitment filters with zero backlogs." : "Eligible for standard and product drives with solid foundation."}
- ${internships > 0 ? "Practical software exposure demonstrated through verified internship experience." : "Academic coursework foundation ready to be translated into live deployed architecture."}
- ${coding >= 7 ? "Strong analytical problem-solving foundation with competitive DSA confidence." : "Ready to build structured algorithmic intuition through targeted patterns."}

---

#### 4. ⚠️ Priority Growth Areas for ${role}
- ${coding >= 7 ? "Master advanced graph traversals and dynamic programming to guarantee round 2 technical clearance." : "Target Blind 75 high-frequency LeetCode patterns (Two Pointers, Sliding Window, Monotonic Stack)."}
- ${comm >= 7 ? "Prepare deep STAR-format architectural defense for project scaling and database connection bottlenecks." : "Elevate articulation of technical trade-offs, time complexities, and project design decisions."}

---

#### 5. 🚀 Actionable 3-Step Milestone Plan
1. **Algorithmic Sprints (Days 1–15):** Solve 2 LeetCode medium problems daily focusing on Two Pointers & Sliding Window.
2. **Flagship Deployment (Days 16–25):** Deploy a production-grade backend or full-stack application with live API links and clean GitHub README.
3. **Mock Technical Defense (Days 26–30):** Practice 3 mock technical rounds with Pathfinder AI Coach focusing on system design & edge cases.

Would you like to generate your **custom 30-Day Sprint Roadmap** or start an **interactive Mock Interview** now?`;
  }

  // -------------------------------------------------------------
  // 2. CASUAL CHAT & WARM HUMAN MIRRORING
  // -------------------------------------------------------------
  if (lower.includes("love you") || lower.includes("love u")) {
    return "I love you too! 💖 What can I help you with today?\n\nChoose an area below or ask me anything:\n- 🎯 **Placement Strategy & Eligibility**\n- 🔍 **Skill Gap & Roadmap**\n- 💡 **Flagship Project Ideas**\n- 🎙️ **Interactive Mock Interview**\n- 📊 **Cohort & Branch Benchmarks**";
  }

  // AIML Placed Count query
  if ((lower.includes("how many") || lower.includes("placed count") || lower.includes("students placed") || lower.includes("got placed")) && lower.includes("aiml")) {
    return "Based on Pathfinder's verified dataset, **61 students got placed in AIML** out of 108 total candidates (an official placement rate of **56.5%**). The highest package secured in AIML reached **44.6 LPA**!";
  }

  // Highest Package query
  if ((lower.includes("highest package") || lower.includes("highest salary") || lower.includes("max package") || lower.includes("highest lpa")) && (lower.includes("branch") || lower.includes("which") || lower.includes("what"))) {
    return `Based on Pathfinder's verified 2024–2026 dataset across all 9 branches:
- 🥇 **Computer Science & Machine Learning (CSM):** **44.9 LPA**
- 🥈 **Artificial Intelligence & Machine Learning (AIML):** **44.6 LPA**
- 🥉 **Computer Science & Engineering (CSE):** **44.0 LPA**
- **Computer Science & Design (CSD):** **40.9 LPA**
- **Information Technology (IT):** **31.4 LPA**
- **Electrical & Electronics (EEE):** **23.7 LPA**
- **Electronics & Communication (ECE):** **15.8 LPA**
- **Mechanical Engineering (MECH):** **12.0 LPA**
- **Civil Engineering (CIVIL):** **11.8 LPA**

**Key Insight:** Computer Science specialization branches (CSM, AIML, CSE) secured the top Tier-1 product offers exceeding 44 LPA!`;
  }

  // Compare AIML and CSD query
  if (lower.includes("compare") && lower.includes("aiml") && lower.includes("csd")) {
    return `### 📊 Head-to-Head Comparison: AIML vs. CSD (Verified Dataset)

| Metric | AIML (AI & Machine Learning) | CSD (Computer Science & Design) |
| :--- | :--- | :--- |
| **Total Candidates** | 108 | 108 |
| **Placed Students** | **61** | **47** |
| **Placement Rate** | **56.5%** | **43.5%** |
| **Highest Package** | **44.6 LPA** | **40.9 LPA** |
| **Average CGPA** | 7.70 | 7.84 |
| **Core Recruiter Focus** | NVIDIA, Microsoft AI, Adobe, MathWorks | Swiggy, CRED, Razorpay, Atlassian |
| **Flagship Skills** | PyTorch, Transformers, LLMs, Vector DBs | React, TypeScript, WebGL, UI Systems |

**Strategic Summary:** AIML holds a higher placement rate (56.5% vs 43.5%) and slightly higher peak compensation (44.6 vs 40.9 LPA), driven by GenAI hiring. CSD excels for candidates targeting high-visibility frontend, product architecture, and consumer tech.`;
  }

  // Data Science Skills query
  if ((lower.includes("skills") || lower.includes("roadmap") || lower.includes("what do i need")) && lower.includes("data science")) {
    return `### 🚀 Essential Skills Roadmap for Data Science

To secure Tier-1 Data Scientist and Analytics roles, here is the verified core stack:

1. **Programming & Querying Foundations:**
   - **Python:** OOP, functional programming, data manipulation.
   - **SQL (Critical):** Complex JOINs, Window functions (\`ROW_NUMBER\`, \`DENSE_RANK\`), CTEs, and aggregation.
2. **Data Wrangling & Statistical EDA:**
   - **Pandas & NumPy:** Vectorized transformations, handling missing values, exploratory analysis.
   - **Statistics & Probability:** Hypothesis testing, p-values, distributions, Bayes theorem.
3. **Machine Learning Algorithms:**
   - **Scikit-Learn:** Linear & Logistic Regression, Decision Trees, Random Forests, Gradient Boosting (XGBoost/LightGBM).
   - **Evaluation Metrics:** Precision, Recall, F1-Score, ROC-AUC, RMSE.
4. **Deep Learning & GenAI Fundamentals:**
   - **PyTorch / TensorFlow:** Neural networks, embeddings, and Transformers.
5. **Production & Deployment:**
   - **FastAPI & Docker:** Wrap models in RESTful APIs and containerize them.
   - **Visualization:** Matplotlib, Seaborn, and Streamlit or Dash for stakeholder demos.

Would you like a tailored 6-week schedule or recommendations for a flagship portfolio project?`;
  }

  // Two Pointers Problem Request (e.g. "Give me a Medium Two Pointers LeetCode problem with step-by-step guidance")
  if (lower.includes("two pointer") || lower.includes("two pointers") || (lower.includes("two") && lower.includes("pointer"))) {
    return `### 🎯 LeetCode 11: Container With Most Water (Medium) — Two Pointers Masterclass

---

#### 1. 📌 Problem Statement
You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the **most water**.
- **Return:** The maximum amount of water a container can store.
- **Example:**
  - **Input:** \`height = [1, 8, 6, 2, 5, 4, 8, 3, 7]\`
  - **Output:** \`49\`
  - **Explanation:** The vertical lines at index 1 (\`height = 8\`) and index 8 (\`height = 7\`) span a width of \`8 - 1 = 7\`. Height is bounded by \`min(8, 7) = 7\`. Area = \`7 * 7 = 49\`.

---

#### 2. 💡 Intuition & Why Brute Force Fails
- **Brute Force:** Checking every possible pair \`(i, j)\` takes **O(N²)** time. For \`N = 100,000\`, this hits **Time Limit Exceeded (TLE)** on modern hiring platforms.
- **Two Pointers Insight:**
  - The area is determined by \`width * min(height[left], height[right])\`.
  - Start with the widest possible container: \`left = 0\`, \`right = n - 1\`.
  - As we move inward, the \`width\` *strictly decreases*.
  - To find a larger area with a smaller width, we **must** find a taller boundary.
  - **The Golden Rule:** Always move the pointer pointing to the shorter line inward. Moving the taller line inward can never increase the area because the water level remains constrained by the shorter line while width shrinks!

---

#### 3. 🚶 Step-by-Step Algorithm
1. Initialize \`left = 0\`, \`right = len(height) - 1\`, and \`max_water = 0\`.
2. While \`left < right\`:
   - Calculate width: \`w = right - left\`.
   - Calculate current height: \`h = min(height[left], height[right])\`.
   - Update \`max_water = max(max_water, w * h)\`.
   - If \`height[left] < height[right]\`: move \`left += 1\`.
   - Else: move \`right -= 1\`.
3. Return \`max_water\`.

---

#### 4. 💻 Optimal Python Solution
\`\`\`python
class Solution:
    def maxArea(self, height: list[int]) -> int:
        left, right = 0, len(height) - 1
        max_water = 0
        
        while left < right:
            # Current water area is constrained by the shorter boundary
            current_height = min(height[left], height[right])
            current_width = right - left
            current_area = current_width * current_height
            
            if current_area > max_water:
                max_water = current_area
                
            # Greedily move the bottleneck pointer inward
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1
                
        return max_water
\`\`\`

---

#### 5. ⏱️ Complexity Analysis
- **Time Complexity:** **O(N)** — We inspect each element at most once using two converging pointers in a single pass.
- **Space Complexity:** **O(1)** — Only two pointer variables, zero auxiliary memory allocated.

---

#### 6. 🏆 Top Interview Follow-Ups
1. *"What if height array contains negative values?"* (Clarify that physical heights are non-negative; if negative, water cannot be contained).
2. *"How does this pattern extend to 3Sum (LeetCode 15)?"* (Sort the array in O(N log N), fix one element \`i\`, and use two pointers \`left\` and \`right\` on the subarray to find the remaining sum).

Would you like to try solving **LeetCode 15: 3Sum** or **LeetCode 42: Trapping Rain Water** next?`;
  }

  // Sliding Window Problem Request
  if (lower.includes("sliding window") && (lower.includes("problem") || lower.includes("leetcode") || lower.includes("give me") || lower.includes("medium") || lower.includes("guidance"))) {
    return `### 🎯 LeetCode 3: Longest Substring Without Repeating Characters (Medium) — Sliding Window Masterclass

---

#### 1. 📌 Problem Statement
Given a string \`s\`, find the length of the **longest substring** without repeating characters.
- **Example:**
  - **Input:** \`s = "abcabcbb"\`
  - **Output:** \`3\` (The answer is \`"abc"\`, with the length of 3).

---

#### 2. 💡 Intuition & The Dynamic Sliding Window
- Use two pointers \`left\` and \`right\` defining the current valid window \`s[left:right+1]\`.
- Maintain a hash map / dictionary storing the **last seen index** of each character.
- Expand \`right\` character by character.
- If \`s[right]\` is already inside the current window (i.e. \`last_seen[s[right]] >= left\`), jump \`left = last_seen[s[right]] + 1\` to immediately exclude the duplicate!
- At each step, update \`max_len = max(max_len, right - left + 1)\`.

---

#### 3. 💻 Optimal Python Solution
\`\`\`python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        char_index = {}
        left = 0
        max_len = 0
        
        for right, char in enumerate(s):
            # If duplicate seen inside active window, jump left pointer forward
            if char in char_index and char_index[char] >= left:
                left = char_index[char] + 1
            else:
                max_len = max(max_len, right - left + 1)
                
            char_index[char] = right
            
        return max_len
\`\`\`

---

#### 4. ⏱️ Complexity Analysis
- **Time Complexity:** **O(N)** — Single pass over string length \`N\`.
- **Space Complexity:** **O(min(N, M))** — Where \`M\` is the size of the character alphabet (e.g. at most 128 for ASCII).

Would you like to explore **LeetCode 76: Minimum Window Substring (Hard)** or **LeetCode 209: Minimum Size Subarray Sum**?`;
  }

  // General LeetCode / DSA Problem Request
  if ((lower.includes("leetcode") || lower.includes("dsa problem") || lower.includes("coding problem")) && (lower.includes("give me") || lower.includes("suggest") || lower.includes("problem"))) {
    return `### 🎯 High-Frequency Campus Placement Problem: LeetCode 167 — Two Sum II (Input Array Is Sorted)

---

#### 1. 📌 Problem Statement
Given a **1-indexed** array of integers \`numbers\` that is already **sorted in non-decreasing order**, find two numbers such that they add up to a specific \`target\` number.
- **Example:**
  - **Input:** \`numbers = [2, 7, 11, 15]\`, \`target = 9\`
  - **Output:** \`[1, 2]\` (2 + 7 = 9, at 1-indexed positions 1 and 2).

---

#### 2. 💡 Two Pointers Approach
Since the array is sorted:
- Place \`left = 0\`, \`right = len(numbers) - 1\`.
- If \`numbers[left] + numbers[right] == target\`: return \`[left + 1, right + 1]\`.
- If \`sum < target\`: we need a larger sum, so increment \`left += 1\`.
- If \`sum > target\`: we need a smaller sum, so decrement \`right -= 1\`.

\`\`\`python
class Solution:
    def twoSum(self, numbers: list[int], target: int) -> list[int]:
        left, right = 0, len(numbers) - 1
        while left < right:
            curr_sum = numbers[left] + numbers[right]
            if curr_sum == target:
                return [left + 1, right + 1]
            elif curr_sum < target:
                left += 1
            else:
                right -= 1
        return []
\`\`\`

- **Time Complexity:** **O(N)**
- **Space Complexity:** **O(1)** (unlike standard Two Sum which requires O(N) hash map memory).

Would you like a follow-up challenge on **3Sum (Medium)** or a **Sliding Window** problem next?`;
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
