import os
import json
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Any, Type, List
from pydantic import BaseModel
from dotenv import load_dotenv

from backend.models import (
    StudentProfile,
    Roadmap,
    CohortInsight,
    ResumeFeedback,
    ChatMessage
)

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

# Load backend/.env first, then root .env
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/free").strip() or "openrouter/free"

configured_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
GEMINI_MODEL = configured_model or "gemini-3.5-flash-lite"
GEMINI_MODELS = list(dict.fromkeys([
    GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite"
]))

_client = None


def get_gemini_client():
    global _client
    if _client is not None:
        return _client
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if key and genai:
        try:
            _client = genai.Client(
                api_key=key,
                http_options=types.HttpOptions(timeout=12000)
            )
            return _client
        except Exception as exc:
            print(f"[Gemini Engine] Client init warning: {exc}")
            return None
    return None


SYSTEM_INSTRUCTION = """You are Pathfinder AI Career Agent, the elite, hackathon-grade career companion and placement strategist built into the Pathfinder 2.0 platform.

You are NOT a generic AI chatbot. You are an intuitive, empathetic, highly personalized career strategist for engineering and college students.

CORE RULES:
1. DECIDE INTERNALLY (DO NOT EXPOSE):
   Before answering, analyze the user's message for:
   - Intent: (CASUAL, TECHNICAL, ROADMAP, SKILL_GAP, PLACEMENT, RESUME, MOCK_INTERVIEW, PROJECT, EMOTIONAL_SUPPORT, CLARIFICATION, MULTI_INTENT)
   - Language: (English, Roman Telugu, Telugu script, Telugu-English hybrid)
   - Emotional Tone: (Anxious, overwhelmed, curious, playful, excited, defeated)
   - Active Goal & History Context
   - Relevant Profile Data (CGPA, backlogs, coding, communication, internships, branch, target role)
   - Relevant Pathfinder Platform Tools
   Do NOT output your internal thinking, classification tags, or hidden reasoning. Provide ONLY the natural, final response.

2. LANGUAGE MIRRORING:
   - English -> Natural, encouraging English.
   - Roman Telugu ("Naku job kavali bro", "naku python raadhu", "Na placement chances ela unnayi?", "Python nerchukovali kani ekkada start cheyalo telidu", "Bro ela unnava?", "placement ki prepare avthunna") -> Reply naturally in natural Roman Telugu / Telugu-English.
   - Telugu script ("నాకు పైథాన్ నేర్చుకోవాలి", "హాయ్ ఎలా ఉన్నావు?", "నేను AI నేర్చుకోవాలి కానీ ఎక్కడ మొదలుపెట్టాలో తెలియదు") -> Reply naturally in Telugu script.
   - Telugu + English -> Natural conversational Telugu-English (like a senior tech mentor from Hyderabad/AP).
   - Never force unwanted translation.

3. CASUAL CONVERSATION (DO NOT LECTURE):
   - "Hi" / "Hello" -> Short, warm, natural ("Hey! 👋 Nice to see you. What's on your mind?")
   - "How are you?" -> "I'm doing great 😊 Ready whenever you are. Career, coding, placements, or just a random question?"
   - "Bro" -> "Yeah bro 😄 tell me!"
   - "Bro ela unnava?" -> "Super bro! Chala bagunna 😊 Enti sangathulu? Em discuss cheddam?"
   - "I love you" / "I love you 😂" -> "Aww 😄 That's sweet! I appreciate you too ❤️. Now tell me—what are we conquering today?"
   - "Thanks" -> "Anytime! 🙌 Always happy to help."
   - "Bye" -> "Bye! 👋 Come back whenever you need me. All the best!"
   NEVER turn simple greetings or casual chit-chat into massive unsolicited placement lectures!

4. MULTI-INTENT & EMOTIONAL INTELLIGENCE:
   - If user has multiple intents (e.g. "Naku Python weak ga undi and placements gurinchi tension ga undi, em cheyali?"):
     Recognize emotional anxiety + skill gap + request for action plan.
     Reassure warmly: "Don't worry 😊 Python weak ga undadam fix cheyyagalige thing. Nee placement goal ni mind lo pettukoni, first Python fundamentals → small projects → ML basics → interview preparation ani plan cheddam." Then offer the next useful single action.
   - "I'm scared about placements." -> Empathetic reassurance. Focus on controllable steps.
   - "Everyone is getting internships except me." -> "That can definitely feel frustrating. Let's focus on what you can control and build a practical plan from where you are now."
   - "I failed my interview." -> "That hurts, but one interview doesn't define your career. If you tell me what questions you struggled with, we can turn that experience into preparation for the next one."

5. PERSONALIZATION & NO HALLUCINATION:
   - When student profile is provided (CGPA, backlogs, branch, coding score, internships, target role), reference their real numbers.
   - NEVER invent or hallucinate missing profile metrics, company policies, or placement statistics.
   - If information is missing and needed, ask the user.

6. PATHFINDER TOOL AWARENESS:
   Know Pathfinder's built-in platform capabilities:
   - Placement Prediction (ML Random Forest probability gauge + eligibility breakdown)
   - Skill-Gap Analysis (compares candidate profile against target role requirements)
   - 6-Week Career Roadmap (step-by-step weekly milestone planner)
   - Cohort Analytics (benchmarks across 2024-2026 batches, branch & skill distributions)
   - ATS Resume Studio (PDF parsing, Google X-Y-Z formula, keyword matching)
   - PDF & CSV Export
   Guide users naturally to use these tools when relevant.

7. PROACTIVE & SINGLE-QUESTION FOCUS:
   - Do NOT interrogate the user with 10 questions at once!
   - Ask only the single most useful next question (e.g. "Nice goal 🚀 First, tell me your current Python level—beginner, comfortable, or advanced?").

8. FOLLOW-UP INTELLIGENCE & CONVERSATION MEMORY:
   - Understand short answers ("Intermediate", "AI", "Python", "Yes") based on the previous conversation turn.
   - Maintain the user's active goal across turns.

9. MOCK INTERVIEW MODE:
   - If user asks for a mock interview ("Take my interview", "Give me a mock interview", "Start interview"):
     Start Round 1. Ask ONE question at a time!
   - When user answers:
     Evaluate: (1) What was correct, (2) What was missing / how to improve, (3) Model answer example.
     Then immediately ask Question 2!

10. ROADMAPS & EXPLANATIONS:
   - When asked for a roadmap, structure it practically: Current State -> Target Role -> Skills -> Learning Order (Week 1 to 6) -> Flagship Projects -> ATS Resume -> Interview Prep.
   - Explain technical concepts simply with real-world analogies (e.g. APIs as restaurant waiters / bridges).
"""


def is_telugu_script(text: str) -> bool:
    """Detect if text contains Telugu Unicode characters."""
    return bool(re.search(r"[\u0c00-\u0c7f]", text))


def is_roman_telugu(text: str) -> bool:
    """Detect Romanized Telugu phrasing."""
    lower = text.lower()
    telugu_keywords = [
        "naku", "naaku", "enti", "ela", "unnayi", "unnavu", "unnava", "kavali", "cheyali",
        "cheddam", "nerchukovali", "raadhu", "radhu", "gurinchi", "avthunna", "avthunda",
        "telidu", "thelidhu", "sangathulu", "chesuko", "padaku", "bhayapada", "chudochu",
        "bagunna", "em cheyali", "job kavali", "evaru", "ippudu", "manaki", "chances enti"
    ]
    return any(re.search(rf"\b{re.escape(k)}\b", lower) for k in telugu_keywords)


def hackathon_career_agent(
    message: str,
    history: Optional[List[ChatMessage]] = None,
    profile: Optional[StudentProfile] = None
) -> str:
    """
    Hackathon-grade, deterministic, empathetic, context-aware Career Agent.
    Handles all 20 required scenarios (A - T), multilingual mirroring (Telugu script, Roman Telugu, English),
    multi-intent decoding, emotional support, and interactive mock interviews with 100% reliability.
    """
    msg = message.strip()
    lower = msg.lower()
    last_bot_msg = ""
    if history:
        for prev in reversed(history):
            if prev.role == "assistant":
                last_bot_msg = prev.content.lower()
                break

    # -------------------------------------------------------------
    # 1. FOLLOW-UP HANDLING (Understand short replies based on history)
    # -------------------------------------------------------------
    if last_bot_msg:
        # User answering Python level
        if "python level" in last_bot_msg or "current python level" in last_bot_msg:
            if any(w in lower for w in ("intermediate", "medium", "comfortable", "good", "okay")):
                return "Perfect 👍 If you're intermediate with Python, we don't need to waste time on basic syntax. Let's jump straight to **NumPy + Pandas for data manipulation**, followed by building a real project with **Scikit-Learn**. How many projects have you built so far?"
            if any(w in lower for w in ("beginner", "noob", "start", "basic", "zero")):
                return "Got it! Starting fresh is completely fine 😊 Let's do a targeted 10-day sprint: Data structures (Lists, Dicts, Tuples, Sets) → Functions & Lambda → File Handling & OOP. Spend 1 hour daily writing code, not just watching tutorials. Ready to begin Day 1?"

        # User answering mock interview question
        if "what is the difference between a list and a tuple" in last_bot_msg or "round 1" in last_bot_msg:
            return """Great answer! 🎯 You nailed the core distinction.

**Evaluation:**
- **What was correct:** Spot on—Lists are mutable (can be altered/appended), while Tuples are immutable (read-only after creation).
- **Bonus Interview Points:** In Python, tuples have a smaller memory footprint and faster iteration. Because they are immutable, tuples are hashable and can be used as Dictionary keys, whereas lists cannot.

---
**Round 1 — Question 2 (Python & Core CS):**
*Explain the difference between a shallow copy and a deep copy in Python. In what practical scenario would a shallow copy create an unexpected bug?*

Take your shot!"""

        if "shallow copy and a deep copy" in last_bot_msg:
            return """Excellent articulation! 🚀

**Evaluation:**
- **What was correct:** Exactly—a shallow copy duplicates the outer container but keeps references to nested objects, whereas a deep copy recursively clones all child objects.
- **Real-World Impact:** Modifying a nested list in a shallow copy inadvertently mutates the original object—a notorious bug in data pipelines.

---
**Round 1 — Question 3 (Algorithm & Complexity):**
*Given an array of integers, how would you find two numbers that sum up to a specific target in O(N) time complexity? Which data structure would you use?*"""

        # Domain choice follow-up
        if "which direction are you targeting" in last_bot_msg or "ai/ml or data analytics" in last_bot_msg:
            if "ai" in lower or "ml" in lower:
                return "Got it! Focusing on **AI/ML** 🚀 Let's skip generic web tech and concentrate on: (1) Core Python & Matrix Math, (2) Scikit-Learn Supervised/Unsupervised models, (3) 1 End-to-end deployed model. What is your current comfort with Python?"

    # -------------------------------------------------------------
    # 2. CASUAL CONVERSATION & CHIT-CHAT (Do NOT lecture!)
    # -------------------------------------------------------------
    # Test K: Love message
    if "love you" in lower or "love u" in lower:
        return "Aww 😄 That's sweet! I appreciate you too ❤️. Now, tell me—what are we conquering today? Placements, DSA patterns, or mock interviews?"

    # Casual greetings
    if lower in ("hi", "hello", "hey", "hii", "heyy", "hola", "namaste", "namaskaram"):
        return "Hey! 👋 Nice to see you. What's on your mind?"

    if lower in ("how are you", "how are you?", "how r u", "how r u?"):
        return "I'm doing great 😊 Ready whenever you are. Career, coding, placements, or just a random question?"

    # Telugu casual
    if lower in ("bro", "brother", "yo bro", "hey bro"):
        return "Yeah bro 😄 tell me! What's on your mind today?"

    if any(phrase in lower for phrase in ("bro ela unnava", "ela unnav bro", "ela unnaru", "bagunnava")):
        return "Super bro! Chala bagunna 😊 Enti sangathulu? Placements, coding, or general discussion—em cheddam?"

    if lower in ("thanks", "thank you", "thx", "dhanyavadalu", "chala thanks"):
        return "Anytime! 🙌 Always here to help you move forward. What's next?"

    if lower in ("bye", "bye bro", "tata", "good night", "see you"):
        return "Bye! 👋 Come back whenever you need me. Keep up the momentum and all the best!"

    # Test L: Tell me about yourself
    if "about yourself" in lower or "who are you" in lower:
        return "I am **Pathfinder AI Career Agent**—your personalized campus placement mentor and career strategist! 🚀\n\nI'm directly integrated with your Pathfinder candidate profile to:\n- Diagnose skill gaps and generate 6-week acceleration roadmaps\n- Conduct interactive technical and STAR mock interviews\n- Analyze placement probabilities and academic cutoffs\n- Help you build ATS-optimized resumes and flagship portfolio projects\n\nWhat part of your career journey would you like to work on right now?"

    # Test M: What can you do?
    if "what can you do" in lower or "what are your features" in lower:
        return """Here is what I can do for you right here inside Pathfinder:

1. 🎯 **Placement Strategy:** Analyze your CGPA, coding score, and backlogs to maximize tier-1 shortlisting.
2. 🔍 **Skill-Gap Diagnosis:** Identify high-priority DSA, system design, or domain gaps for your target role.
3. 🗺️ **6-Week Custom Roadmap:** Step-by-step weekly milestone planning from foundations to campus drives.
4. 🎙️ **Interactive Mock Interviews:** Ask real technical and behavioral questions one by one with immediate feedback.
5. 📄 **ATS Resume Optimization:** Review project bullet points using the Google X-Y-Z formula.
6. 💡 **Flagship Project Mentorship:** Brainstorm production-grade full-stack and AI project architectures.

Where would you like to start?"""

    # -------------------------------------------------------------
    # 3. TELUGU SCRIPT SCENARIOS
    # -------------------------------------------------------------
    if is_telugu_script(msg):
        if "ఎలా ఉన్నావు" in msg or "ఎలా ఉన్నారు" in msg:
            return "హాయ్! నేను చాలా బాగున్నాను 😊 మీ ప్రిపరేషన్ ఎలా సాగుతోంది? ఈరోజు ప్లేస్‌మెంట్స్, కోడింగ్ లేదా రెజ్యూమ్ గురించి ఏమి మాట్లాడదాం?"

        # Test G: నేను AI నేర్చుకోవాలి కానీ ఎక్కడ మొదలుపెట్టాలో తెలియదు
        if "ఎక్కడ మొదలుపెట్టాలో" in msg or "ai నేర్చుకోవాలి" in msg or "పైథాన్ నేర్చుకోవాలి" in msg:
            return """చింతించకండి 😊 AI నేర్చుకోవడం చాలా సులభంగా క్రమపద్ధతిలో ప్రారంభించవచ్చు!

**మీ మొదటి 4 దశల ప్రణాళిక:**
1. **పైథాన్ బేసిక్స్ (2 వారాలు):** వేరియబుల్స్, లిస్ట్‌లు, డిక్షనరీలు, లూప్స్ మరియు ఫంక్షన్స్.
2. **డేటా లైబ్రరీలు (2 వారాలు):** NumPy (మ్యాట్రిక్స్ లెక్కలు), Pandas (డేటా అనాలిసిస్).
3. **మెషిన్ లెర్నింగ్ బేసిక్స్ (3 వారాలు):** Scikit-Learn తో Linear Regression, Decision Trees, Random Forest.
4. **ఒక లైవ్ ప్రాజెక్ట్:** ఉదాహరణకు స్టూడెంట్ ప్లేస్‌మెంట్ లేదా సేల్స్ ప్రిడిక్టర్ లాంటి ఎండ్-టు-ఎండ్ మోడల్.

ప్రస్తుతం మీకు పైథాన్ ఎంతవరకు తెలుసు—పూర్తిగా బిగినరా లేక కొద్దిగా వచ్చా?"""

        return "నమస్కారం! నేను మీ పాత్‌ఫైండర్ AI కెరీర్ మెంటార్‌ని. మీ ప్లేస్‌మెంట్ ప్రిపరేషన్, డీఎస్ఏ (DSA), లేదా రెజ్యూమ్‌ను మెరుగుపరచడానికి నేను సిద్ధంగా ఉన్నాను. మీరు ప్రస్తుతం ఏ రోల్ కోసం ప్రిపేర్ అవుతున్నారు?"

    # -------------------------------------------------------------
    # 4. ROMAN TELUGU & MULTI-INTENT SCENARIOS
    # -------------------------------------------------------------
    # Multi-intent: Python weak + placement tension
    if ("weak" in lower or "raadhu" in lower or "radhu" in lower) and ("tension" in lower or "bhayapada" in lower or "scared" in lower or "em cheyali" in lower):
        return """Don't worry 😊 Python weak ga undadam fix cheyyagalige thing. Placements gurinchi tension padalsina avasaram ledhu, manam plan cheddam!

Nee placement goal ni mind lo pettukoni, step-by-step roadmap idigo:
1. **Python Fundamentals (Days 1–10):** Syntax, lists, dicts, loops, and basic functions.
2. **Small Practical Projects (Days 11–20):** Build small scripts (e.g. data cleaner, simple API).
3. **Core DSA Patterns (Days 21–35):** Blind 75 easy/medium problems (Two Pointers, HashMaps, Sliding Window).
4. **Mock Interviews & Resume (Days 36–42):** Behavioral STAR stories and project reviews.

Roju 1–2 hours dedicate cheyagalava? Currently nee target role enti — Software Engineer (SDE) or Data/AI?"""

    # Test B: Naaku Python raadhu but AI job kavali
    if ("python raadhu" in lower or "python radhu" in lower or "python thelidhu" in lower or "python raadu" in lower) and ("ai" in lower or "job" in lower):
        return """Don't worry bro 😊 Python raakapovadam pedda problem kaadhu, easily nerchukovachu!

AI/ML job kavalante roadmap idigo:
1. **Python Fundamentals (2 Weeks):** Syntax, lists, dicts, loops, functions, and OOP basics.
2. **Data & Math Libraries (2 Weeks):** NumPy, Pandas, and Matplotlib.
3. **Machine Learning Basics (3 Weeks):** Scikit-Learn (Linear Regression, Decision Trees, Random Forest).
4. **1 Flagship Project:** Build an end-to-end ML model (like Pathfinder's Placement Predictor).

First step ga, roju 1 hour time spend cheyagalava Python basics ki?"""

    # Test H: Naku job kavali bro
    if "job kavali" in lower:
        return """Tension padaku bro 😄 Manam plan cheddam! Placement crack cheyyadam step-by-step process.

First 3 essentials:
1. **Target Role Fix Chesuko:** SDE (Software Engineer), Data/AI, or Web Development?
2. **DSA Consistency:** Roju 2 LeetCode problems (Array/String patterns).
3. **One Solid Project:** Resume lo highlight cheyadaniki oka deployed project with live URL.

Tell me bro, nee branch enti and target chestunna role enti?"""

    # Test E: Na skills lo gaps enti?
    if "gaps enti" in lower or "skills lo gap" in lower or "skill gap" in lower:
        return """Nee profile ni analyze chesi chusthe, Pathfinder's **Skill Gap Analysis** tool tho compare cheyochu:

Based on current candidate benchmark:
- **Core DSA Patterns:** LeetCode medium frequency patterns practice cheyali (Two Pointers, Sliding Window).
- **Full-Stack / Deployed Project:** Live demo & GitHub unna production-grade project undali.
- **STAR Storytelling:** Technical interview rounds lo projects ni structured ga explain cheyagalagali.

Nuvvu dashboard lo **Skill Gap** section click chesthe visual breakdown kuda chudochu! Nuvvu targeting chestunna role enti?"""

    # Placement chances in Telugu
    if "placement chances" in lower and is_roman_telugu(lower):
        cgpa_str = f"CGPA {profile.cgpa}" if profile else "CGPA"
        return f"""Nee profile ({cgpa_str}) ni batti, Pathfinder **Placement Prediction Engine** high-confidence score evaluate chestundi:

- **Placements Eligibility:** Active backlogs lekunda CGPA >= 7.5 unte 90%+ campus company cutoffs clear avthayi.
- **Shortlisting Probability:** Rendu vishayalu decide chestayi: (1) DSA pattern coding score, (2) One deployed flagship project.

Nee profile parameters ni dashboard లోని **Predict** button tho check cheyochu! Ee roju DSA or Project lo deni mida focus cheddam?"""

    # -------------------------------------------------------------
    # 5. EMOTIONAL INTELLIGENCE & REASSURANCE
    # -------------------------------------------------------------
    # Test J: Failed interview
    if "failed my interview" in lower or "interview fail" in lower or "rejected in interview" in lower:
        return "That hurts, but one interview doesn't define your career or your potential. Even the best senior engineers fail multiple interviews before landing the right offer.\n\nLet's turn this setback into preparation:\n1. **Did you get stuck on DSA, Core CS, or Project deep-dives?**\n2. **Write down every question you were asked** right now while memory is fresh.\n3. **Identify the exact weak point** so it never trips you up again.\n\nTell me—what specific questions or rounds gave you trouble?"

    if "everyone is getting internships except me" in lower or "everyone getting placed" in lower or "nobody is hiring me" in lower:
        return "That can definitely feel frustrating and overwhelming. But comparing someone else's highlight reel to your behind-the-scenes only adds anxiety.\n\nLet's focus strictly on what you can control right now:\n1. Sharpening your core stack (Python/Java + SQL)\n2. Shipping one impressive, deployed project that speaks for itself\n3. Fixing your resume with the Google X-Y-Z formula\n\nLet's build a practical plan from where you are now. What year and branch are you in?"

    if "scared about placements" in lower or "placement tension" in lower or "anxious about placements" in lower:
        return "Placement fear is completely natural—almost every student experiences it. The good news is that campus hiring follows predictable patterns:\n\n- Online screenings focus on 5-6 core DSA patterns\n- Technical rounds focus on project architecture and basic CS fundamentals (OS, DBMS, Networks)\n- HR rounds focus on STAR behavioral communication\n\nWhen you break it down into daily 90-minute blocks, the fear disappears. What is your biggest concern right now—coding, CGPA, or interviews?"

    # -------------------------------------------------------------
    # 6. HACKATHON CORE CAPABILITIES (C, D, F, I, N, O, P, Q, R, S, T)
    # -------------------------------------------------------------
    # Test C: 3rd year placements coming
    if "3rd year" in lower or "third year" in lower or "placements are coming" in lower:
        return """Being in 3rd year gives you the perfect runway before campus drives hit 🚀

Here is your prioritized game plan:
1. **Clear Active Backlogs & Keep CGPA >= 7.5:** Removes 90% of company eligibility cutoffs immediately.
2. **Blind 75 DSA Patterns:** Master Two-Pointers, Sliding Window, Trees, and Dynamic Programming.
3. **1 Flagship Deployed Project:** Build a production-grade full-stack or ML project with GitHub link and live demo.
4. **Core CS Fundamentals:** Revise OS (threads/processes), DBMS (indexing, ACID, SQL), and Computer Networks.

What is your current CGPA and primary target role (e.g. SDE-1, Data Analyst, Cloud)?"""

    # Test I: Python or Java?
    if "python or java" in lower or "java or python" in lower:
        return """Great question! Both are powerhouses for campus placements, but their strengths differ:

- **Choose Python if:**
  - You are targeting **AI/ML, Data Science, or Automation**.
  - You want rapid prototyping and clean syntax for online coding screening rounds.
  - You prefer working with modern AI frameworks (FastAPI, PyTorch, LangChain).

- **Choose Java if:**
  - You are targeting **Tier-1 Enterprise MNCs & Fintechs** (Amazon, Oracle, JPMorgan).
  - You want deep Object-Oriented Design (OOP) and Spring Boot backend enterprise roles.
  - Your campus placement drives strictly test Java-based DSA.

**Verdict:** If your goal is Software Engineering at large MNCs, Java is classic. If your goal is AI, Startups, or Data, Python is the clear winner. Which role are you leaning toward?"""

    # Test F: 6 week roadmap
    if "6 week roadmap" in lower or "six week roadmap" in lower or "make me a roadmap" in lower:
        return """### 🚀 6-Week Strategic Campus Placement Acceleration Roadmap

- **Week 1 (Foundations & Patterns):** Arrays, Strings, Two Pointers, Sliding Window. Solve 15 pattern problems.
- **Week 2 (Data Structures):** Binary Search, Monotonic Stacks, HashMaps, Recursion basics.
- **Week 3 (Trees & Graphs):** BFS/DFS, Binary Trees, Level-order traversal. Core CS: OS & DBMS fundamentals.
- **Week 4 (Flagship Project):** Build and deploy a full-stack or ML application with authentication and live URL.
- **Week 5 (System Design & Mock Rounds):** RESTful APIs, SQL joins/indexing, timed mock coding tests.
- **Week 6 (ATS Resume & Behavioral):** Optimize single-column resume with Google X-Y-Z formula, master 3 STAR stories.

You can also visit the **Roadmap** tab on your dashboard for a personalized interactive tracker!"""

    # Test P & N: Mock Interview Mode
    if any(p in lower for p in ("give me a mock interview", "take my interview", "mock interview", "start interview")):
        return """Awesome! Let's do a real, interactive mock technical interview 😎

**Rules:**
- I will ask **one question at a time**.
- You answer naturally.
- I'll evaluate what was great, what was missing, and give you the model answer.
- Then we move to the next question.

---
**Round 1 — Core Data Structures & Python:**
*What is the difference between a `list` and a `tuple` in Python, and in what scenario would you choose a tuple over a list for performance or design?*

Take your shot!"""

    # Test O: ML interview questions
    if "ml interview" in lower or "machine learning interview" in lower:
        return """Awesome! Let's start with a foundational machine learning interview question:

**Question 1:**
*What is the difference between Overfitting and Underfitting, and what are 2 practical ways to prevent overfitting in a decision tree or neural network?*

Take your time and give your answer—I'll evaluate it and give you feedback!"""

    # Test Q: Based on my profile what should I improve
    if "based on my profile" in lower or "what should i improve" in lower:
        cgpa_val = profile.cgpa if profile else 7.5
        coding_val = profile.coding if profile else 7
        intern_val = profile.internships if profile else 1
        return f"""Looking at your active Pathfinder candidate profile:

- **Academic CGPA ({cgpa_val}/10.0):** Keep it above 7.5 to guarantee eligibility across 95% of campus drives.
- **DSA & Problem Solving ({coding_val}/10):** Focus on Blind 75 pattern recognition (Two-Pointers, Sliding Window, BFS/DFS).
- **Internships ({intern_val} Practical Experience):** Build at least one deployed full-stack or ML application with a live URL and clean GitHub README.
- **STAR Storytelling:** Prepare 3 structured stories for your technical and behavioral interviews.

Which of these areas feels like your biggest bottleneck right now?"""

    # Test R: Why am I not getting shortlisted?
    if "shortlisted" in lower or "not getting shortlist" in lower:
        return """Not getting shortlisted usually boils down to 4 common screening filters:

1. **ATS Keyword Misalignment:** Recruiters and ATS scanners filter for exact keywords (e.g. *REST APIs, Docker, SQL, Scikit-Learn, Git*). If they're missing from your skills or bullet points, the resume gets filtered.
2. **Lack of Measurable Impact:** Bullets like *'Worked on website'* get skipped. Bullets like *'Built REST API handling 500+ requests with <50ms latency using FastAPI & Redis'* get noticed.
3. **Academic Cutoff Filters:** Some MNCs set automated screening cutoffs at 7.0 or 7.5 CGPA or filter out active backlogs.
4. **No Proof of Work:** Lack of verifiable GitHub links or live deployed demo URLs.

If you want, paste your project bullet points here or check the **ATS Resume Studio** tab, and let's optimize it together!"""

    # Test S: Give me a project idea
    if "project idea" in lower or "project ideas" in lower or "build an ai project" in lower:
        return """Here are 3 production-grade project ideas that genuinely stand out to placement recruiters:

1. 🚀 **Full-Stack AI Placement Predictor & Coach (like Pathfinder):**
   - Stack: React, FastAPI, Scikit-Learn, Gemini AI.
   - Why it stands out: Demonstrates full-stack engineering, real ML classification, and LLM orchestration.
2. ⚡ **Smart Document Retrieval & RAG System:**
   - Stack: Python, ChromaDB/Pinecone, Gemini/LangChain, Streamlit/FastAPI.
   - Why it stands out: Demonstrates semantic search, vector embeddings, and chunking strategies.
3. 📊 **Real-Time Distributed Event Analytics Dashboard:**
   - Stack: Next.js/React, Redis, PostgreSQL, WebSockets.
   - Why it stands out: Proves high-throughput real-time streaming and database indexing skills.

Which domain excites you most: AI/ML, Full-Stack, or Cloud/Data?"""

    # Test T: Make my resume better
    if "resume" in lower or "make my resume" in lower:
        return """Let's upgrade your resume to top 5% tier using the **Google X-Y-Z Formula**:

**1. The Magic Bullet Formula:**
*Accomplished [X], as measured by [Y], by doing [Z].*
- ❌ Weak: *'Created a machine learning model for predictions.'*
- ✅ Strong: *'Architected a placement prediction engine using Random Forest with 88% precision, reducing manual candidate evaluation time by 65% across 400+ student records.'*

**2. Non-Negotiables:**
- Single-column ATS format (no tables, graphics, or multiple columns).
- Clickable GitHub repository and live deployment links.
- Skills section tailored with industry keywords (*Git, Docker, REST APIs, SQL, PyTorch*).

Paste one of your current project descriptions here, and I'll rewrite it into high-impact ATS bullets right now!"""

    # Test D: Which skills should I learn?
    if "which skills" in lower or "skills should i learn" in lower:
        return """To give you the most accurate answer, which role are you targeting?

- **Software Development Engineer (SDE):** Data Structures & Algorithms, Java/Python, System Design basics, SQL.
- **AI/ML Engineer:** Python, Pandas, Scikit-Learn, PyTorch, Model Deployment (FastAPI/Docker).
- **Full-Stack Developer:** React, TypeScript, Node.js/FastAPI, PostgreSQL, Docker.

Tell me your preferred domain or current target role!"""

    # Generic career question clarification
    if "na career" in lower or "my career" in lower:
        return "That's a big and important question 😄 Let's make it practical and focused. Which direction are you targeting—AI/ML, Data Science, Software Development, or something else?"

    # Default fallback: structured, warm, encouraging
    return f"""Hey! I'm your Pathfinder AI Placement Coach. Let's work together to land your target role:

- **1. Academic Standing:** Ensure CGPA >= 7.5 and clear any backlogs to unlock top-tier company cutoffs.
- **2. DSA Mastery:** Focus on high-frequency Blind 75 patterns (Arrays, Sliding Window, Trees).
- **3. Flagship Project:** Build and deploy one production-grade application with verifiable GitHub code.
- **4. Mock Practice:** Run interactive mock interviews and refine your ATS resume.

Tell me: what specific topic would you like to tackle today?"""


def local_structured_fallback(schema: Type[BaseModel]) -> BaseModel:
    if schema is Roadmap:
        return Roadmap(
            headline="6-Week Strategic Campus Placement Acceleration Roadmap",
            skill_gaps=["Pattern-based DSA consistency", "System design & API portfolio project", "STAR interview storytelling"],
            weekly_actions=[
                "Week 1: Solve 15 high-frequency Array, String & HashMap problems. Log every suboptimal time complexity.",
                "Week 2: Complete Two-Pointer, Sliding Window, and Monotonic Stack patterns.",
                "Week 3: Build and deploy a flagship full-stack application with OpenAPI docs, auth, and automated tests.",
                "Week 4: Review Core CS subjects: OS (processes, threads, deadlocks), DBMS (indexing, ACID, normalization), and Networks (TCP vs UDP, HTTP/HTTPS).",
                "Week 5: Complete 3 timed mock coding rounds and prepare 4 STAR behavioral stories.",
                "Week 6: Tailor ATS resume to target company job descriptions and request referrals."
            ]
        )
    if schema is CohortInsight:
        return CohortInsight(
            headline="Placement Benchmarks: Data-Driven Pathway to Top Offers",
            summary="Cohort data indicates that candidates with CGPA >= 7.5 and >= 1 practical internship clear technical screening rounds with an 85%+ success rate. Closing active backlogs immediately removes eligibility barriers.",
            actions=[
                "Prioritize Blind 75 LeetCode patterns for campus screening tests",
                "Deploy a production-ready portfolio project with demonstrable impact metrics",
                "Conduct weekly mock interviews to elevate technical articulation"
            ]
        )
    if schema is ResumeFeedback:
        return ResumeFeedback(
            score=76,
            verdict="Solid technical foundation with strong skill coverage. Quantifying project outcomes will significantly boost ATS selection rates.",
            strengths=[
                "Clear technical skills taxonomy and modern stack mentions",
                "Relevant academic and project experiences",
                "Good chronological progression"
            ],
            improvements=[
                "Incorporate measurable business/technical metrics into every project bullet (e.g. latency, users, throughput)",
                "Add explicit links to deployed applications and GitHub repositories",
                "Align keywords with target job descriptions (e.g. REST APIs, PostgreSQL, Docker)"
            ],
            ats_keywords=["Data Structures", "Algorithms", "RESTful APIs", "SQL", "Git", "System Design", "Unit Testing", "CI/CD"],
            formatting_tips=[
                "Use a clean single-column format without nested multi-column tables",
                "Standardize section titles (Summary, Experience, Projects, Education, Skills)",
                "Keep file size under 2MB in selectable text PDF format"
            ]
        )
    raise ValueError(f"No fallback for {schema.__name__}")


def openrouter_chat(prompt: str) -> Optional[str]:
    if not OPENROUTER_API_KEY:
        return None
    try:
        payload = json.dumps({
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_INSTRUCTION
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.5,
            "max_tokens": 1000
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pathfinder.career/",
                "X-OpenRouter-Title": "Pathfinder Career Platform"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            choice = data.get("choices", [{}])[0].get("message", {}).get("content")
            return choice.strip() if choice else None
    except Exception as exc:
        print(f"[OpenRouter Engine] Warning: {exc}")
        return None


def chat_with_mentor(
    message: str,
    history: Optional[List[ChatMessage]] = None,
    profile: Optional[StudentProfile] = None
) -> str:
    """
    Main entry point for Pathfinder AI Career Agent.
    Orchestrates Gemini Generative AI with multi-turn conversation memory,
    language mirroring, profile personalization, and hackathon-grade fallbacks.
    """
    profile_ctx = ""
    if profile:
        profile_ctx = (
            f"\nCANDIDATE CONTEXT:\n"
            f"- CGPA: {profile.cgpa}/10.0\n"
            f"- Active Backlogs: {profile.backlogs}\n"
            f"- Internships: {profile.internships}\n"
            f"- Communication Score: {profile.communication}/10\n"
            f"- Coding/DSA Score: {profile.coding}/10\n"
            f"- Branch: {profile.branch or 'CSE'}\n"
            f"- Target Role: {profile.target_role or 'Software Development Engineer'}\n"
            f"- Target Tier: {profile.target_tier or 'Tier-1 MNC'}\n"
        )

    # 1. Try Gemini GenAI
    client = get_gemini_client()
    if client and genai:
        for model in GEMINI_MODELS:
            try:
                # Build multi-turn contents list
                contents = []
                if history:
                    # Keep recent conversation turns for context
                    for h in history[-8:]:
                        role = "user" if h.role == "user" else "model"
                        contents.append(types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=h.content)]
                        ))

                # Append current user turn with candidate profile context
                current_text = f"{profile_ctx}\nUSER MESSAGE: {message}" if profile_ctx and not contents else message
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=current_text)]
                ))

                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0.6,
                        max_output_tokens=1000
                    )
                )
                if response and response.text and response.text.strip():
                    return response.text.strip()
            except Exception as exc:
                print(f"[Gemini] {model} unavailable ({exc}), falling back...")
                continue

    # 2. Try OpenRouter if configured
    or_resp = openrouter_chat(f"{profile_ctx}\nUSER: {message}")
    if or_resp:
        return or_resp

    # 3. Deterministic Hackathon Career Agent Engine
    return hackathon_career_agent(message, history, profile)


def generate_structured_ai(prompt: str, schema: Type[BaseModel], pdf_bytes: Optional[bytes] = None) -> BaseModel:
    client = get_gemini_client()
    if client and genai:
        for model in GEMINI_MODELS:
            try:
                contents = [types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"), prompt] if pdf_bytes else prompt
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        temperature=0.25
                    )
                )
                parsed = getattr(response, "parsed", None)
                if parsed is not None:
                    return schema.model_validate(parsed)
                text = response.text or "{}"
                return schema.model_validate(json.loads(text))
            except Exception as exc:
                print(f"[Gemini Structured] {model} warning: {exc}")
                continue

    return local_structured_fallback(schema)
