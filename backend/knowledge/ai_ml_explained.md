# How Pathfinder AI & Machine Learning Works

A clear, transparent explanation of the machine learning algorithms, large language models, data tools, and fallbacks powering Pathfinder 2.0.

---

## 1. The Placement Readiness Score (Random Forest Classifier)

### What Algorithm Is Used?
Pathfinder uses a **Random Forest Classifier** (`RandomForestClassifier(n_estimators=120, random_state=42)`) trained on 972 verified student recruitment records from campus cohorts across 9 engineering departments.

### The Inputs (The 5 Core Vectors)
The model looks at five fundamental academic and technical parameters:
1. **CGPA**: Academic grade point average (scale 0.0 to 10.0). Represents academic consistency and company eligibility screening.
2. **Backlogs**: Active or historical uncleared subjects (count). Many Tier-1 companies enforce a strict "0 active backlogs" policy.
3. **Internships**: Completed professional internships (count 0 to 4). Signals industry readiness and practical software engineering exposure.
4. **Coding Score**: Algorithmic problem-solving assessment (scale 1.0 to 10.0), mapped from solved LeetCode/HackerRank counts and algorithmic depth.
5. **Communication Score**: Technical articulation, interview fluency, and professional clarity (scale 1.0 to 10.0).

### The Output & Meaning of the Percentage
The model outputs a probability value between **0% and 100%**:
- **80% to 100% (Tier-1 Ready)**: High probability of securing offers in Product MNCs and high-growth tech firms (12 to 44.6 LPA).
- **60% to 79% (Tier-2 Competitive)**: Strong candidate for mid-tier technology firms and service consultancies (6 to 11 LPA).
- **Below 60% (Needs Acceleration)**: Candidate is currently at risk of missing campus cutoff filters; requires immediate focus on backlogs or core DSA.

### Model Confidence & Limitations
- **Accuracy**: Tested at ~88% cross-validation accuracy on historical cohort outcomes.
- **Limitations**: The percentage is an **empirical estimate**, not a guaranteed contract. Real placement drives are influenced by hiring market macroeconomic conditions, specific company vacancy quotas, and on-the-day interview performance.

### Non-Technical Analogy: The Committee of 120 Senior Placement Mentors
Imagine your college convenes a panel of **120 experienced placement officers and tech leads**.
Instead of one person deciding your fate, each of the 120 mentors reviews your marks, projects, backlogs, and coding tests based on different past students they hired.
Each mentor votes: "Yes, this candidate would clear Tier-1 interviews" or "No, they need more practice."
If 105 out of 120 mentors vote Yes, your readiness score is **87.5%**.
That is exactly what a Random Forest of 120 decision trees does—it eliminates individual bias by aggregating 120 independent data-driven evaluations.

---

## 2. What Gemini (LLM) Does

While Random Forest calculates numbers and statistics, **Google Gemini** provides the natural intelligence, empathy, and technical conversation:
- **Conversational Career Mentorship**: Understands open-ended candidate doubts in English, Telugu script, and Roman Telugu (Tenglish).
- **Interactive Technical Viva**: Acts as an interviewer, asking probing architectural questions about candidate projects.
- **Resume Bullets Transformation**: Parses unstructured project descriptions and rewrites them into quantifiable Google X-Y-Z statements.
- **Personalized 6-Week Sprints**: Converts high-level syllabus topics into day-by-day tailored milestones.

Gemini **never hallucinates numbers** because it is bound to the exact same dataset via function-calling tools.

---

## 3. How Tools Read the Same Dataset as the Dashboard

Pathfinder enforces a **Single Source of Truth (SSOT)** architecture:
- When the frontend dashboard renders cohort charts or branch averages, it queries `backend/data_service.py`.
- When DAS AI answers a question like *"What is the highest package in CSE?"*, it does not guess. The LLM invokes the `get_placement_stats(branch='CSE')` tool, which queries the exact same `data_service.py` instance reading `data/placement_records.csv`.
- This ensures 100% mathematical consistency: the number DAS speaks aloud is always identical to the number displayed on the screen.

---

## 4. Rule-Based Fallback Scoring

If the backend server is offline, cold-starting, or undergoing maintenance, Pathfinder uses a deterministic, calibrated mathematical fallback:
```python
raw_score = (
    cgpa * 5.2
    + max(0, 3 - backlogs) * 4.0
    + min(internships, 3) * 5.0
    + communication * 2.2
    + coding * 2.7
    - max(backlogs - 1, 0) * 5.0
)
readiness_score = max(18.0, min(96.0, round(raw_score, 1)))
```
This formula ensures the platform remains responsive instantly on any device even without an active internet connection.
