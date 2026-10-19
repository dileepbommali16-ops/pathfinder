# Pathfinder 2.0: 25 Frequently Asked Questions (FAQ)

Honest, direct, and authoritative answers for judges, teachers, parents, recruiters, and engineering students.

---

### 1. What is Pathfinder in one sentence?
Pathfinder 2.0 is an autonomous career intelligence platform and 3D AI voice co-pilot that helps engineering students systematically prepare for and crack campus recruitment drives.

### 2. Why was Pathfinder created?
Over 80% of engineering students struggle during campus placements because they discover critical CGPA cutoffs, required DSA depth, and ATS resume barriers too late; Pathfinder eliminates this guesswork early.

### 3. Who is Pathfinder designed for?
Undergraduate engineering students (1st to 4th year across all departments), college Training & Placement Officers (TPOs), and technical mentors.

### 4. Is the placement data real?
Yes. The platform is anchored on an open-source college recruitment dataset (2,966 records) and enriched into 972 cohort placement records across 9 engineering departments representing actual campus hiring trends.

### 5. How accurate is the placement readiness score?
Our Random Forest Classifier operates with approximately 88% cross-validation accuracy on historical cohort placement benchmarks.

### 6. Does a high readiness score guarantee a job?
No. It is an empirical probability estimate based on past hiring patterns; real-world success also depends on interview day composure, specific company quotas, and market conditions.

### 7. What technology stack does Pathfinder use?
A Python 3.11 / FastAPI backend with Scikit-Learn and SQLite WAL mode, paired with a React 19 / TypeScript / TailwindCSS frontend and Google Gemini Flash intelligence.

### 8. Who is DAS AI?
DAS (Dedicated Placement Strategist) is Pathfinder's autonomous 3D conversational career mentor that features real-time voice interaction, facial lip-syncing, and full website navigation control.

### 9. How is Pathfinder different from generic roadmaps on YouTube or LeetCode?
Generic roadmaps give one-size-fits-all lists; Pathfinder calibrates its guidance specifically to your branch, your backlogs, your target corporate tier (Tier-1 vs Tier-2), and verified cohort cutoffs.

### 10. Does DAS AI work in languages other than English?
Yes. DAS understands and speaks in English, Telugu script, and Roman Telugu (Tenglish), switching automatically based on how the student speaks.

### 11. Can DAS control the website?
Yes. Using safe UI function-calling tools, DAS can navigate to any tab (e.g., Cohort Analytics, Project Blueprints), highlight sections, launch the resume builder, or trigger mock interviews.

### 12. What happens to DAS when I switch tabs or pages?
DAS is mounted in a persistent global application shell outside individual page views; the voice session, conversation history, and audio playback continue seamlessly without restarting.

### 13. How does the 6-Week Roadmap work?
It breaks down algorithmic preparation into daily milestones across 6 progressive weeks—from basic arrays and two-pointers up to advanced dynamic programming and system design.

### 14. What are the 23 Project Blueprints?
They are production-grade system architectures across software, AI, embedded IoT, core engineering, and cyber security with complete folder structures, implementation steps, and viva talking points.

### 15. How does the ATS Resume Studio work?
It parses resume text against Applicant Tracking System (ATS) screening algorithms, scores action verbs and quantifiable metrics, and rewrites weak bullets using Google's X-Y-Z formula.

### 16. What is the highest package recorded on the platform?
In the cohort analytics database, the highest recorded placement package is 44.6 LPA in CSE/AIML.

### 17. What is the average package across branches?
The overall historical average package is 8.5 LPA, with department averages ranging from 6.2 LPA in core branches to 9.1 LPA in CSE/AIML.

### 18. Does Pathfinder support non-CSE branches like Mechanical and Civil?
Yes. Pathfinder provides dedicated branch intelligence and tailored project blueprints for ECE, EEE, Mechanical, Civil, and Cyber Security.

### 19. How does Pathfinder handle candidate privacy?
Pathfinder does not store sensitive Personally Identifiable Information (PII) like phone numbers or government IDs; student profiles are stored locally in the browser and synced securely.

### 20. Is Pathfinder free for students?
Yes. The platform is designed to be accessible to all students to democratize quality placement mentorship.

### 21. What happens if the AI server or internet is slow?
Pathfinder includes an instant client-side offline intelligence engine (`careerAgent.js`) and rule-based mathematical scoring so the UI never freezes or leaves the student stranded.

### 22. Can a student practice mock viva interviews?
Yes. Pathfinder provides a STAR Architecture Defense Simulator where DAS AI grills the candidate on their project decisions, scalability trade-offs, and failure points.

### 23. What is the Live Skill Verifier?
A built-in utility that audits a candidate's GitHub repositories and commit histories to verify genuine code authorship and protect against resume fraud.

### 24. What is next on the Pathfinder roadmap?
Future enhancements include direct integration with college ERP systems, automated campus drive registration feeds, and peer-to-peer mock interview matching.

### 25. How do I explain Pathfinder to my parents or non-technical family?
"Think of Pathfinder as an expert personal cricket or sports coach for college placements. Instead of guessing if my practice is enough, it looks at how past students got hired, tests my readiness daily, gives me a 6-week practice plan, and helps me practice real interviews with an AI voice mentor."
