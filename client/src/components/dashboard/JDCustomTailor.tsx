import React, { useState, useMemo } from "react";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Mic,
  PlusCircle,
  ArrowRight,
  Target,
  Building2,
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";
import { audioEngine } from "@/agent/audioIO";
import { toast } from "sonner";

export interface JDPreset {
  id: string;
  company: string;
  role: string;
  packageLpa: string;
  cutoffScore: number;
  jdText: string;
  requiredSkills: string[];
  questions: Array<{
    question: string;
    topic: string;
    starterPython: string;
    expectedKeywords: string[];
  }>;
}

export const JD_PRESETS: JDPreset[] = [
  {
    id: "amazon-sde1",
    company: "Amazon",
    role: "Software Development Engineer I (SDE-1)",
    packageLpa: "28.0 – 44.6 LPA",
    cutoffScore: 80,
    jdText:
      "Amazon SDE-1 Job Description: Design and scale low-latency distributed microservices on AWS (EC2, S3, Lambda, DynamoDB). Strong proficiency in Data Structures & Algorithms (DSA), Python/Java/C++, REST APIs, Docker, CI/CD, idempotency, caching (Redis), and unit testing (PyTest/JUnit) with operational excellence.",
    requiredSkills: [
      "Python",
      "Java",
      "Data Structures",
      "AWS",
      "Docker",
      "REST APIs",
      "PostgreSQL",
      "Redis",
      "CI/CD",
      "System Design",
    ],
    questions: [
      {
        question:
          "Write an O(log n) Binary Search function to find the first occurrence of a target order ID in a sorted stream, and explain its time & space complexity.",
        topic: "DSA & Search Optimization",
        starterPython:
          'def first_occurrence(arr, target):\n    lo, hi, ans = 0, len(arr) - 1, -1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            ans = mid\n            hi = mid - 1\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return ans\n\nprint("First index:", first_occurrence([10, 20, 20, 20, 30, 40], 20))',
        expectedKeywords: ["O(log n)", "O(1)", "binary search", "mid", "sorted", "pointer"],
      },
      {
        question:
          "How do you prevent duplicate charges (race conditions) in a high-concurrency Amazon checkout microservice handling 3,000 RPS?",
        topic: "Distributed Systems & Idempotency",
        starterPython:
          '# Simulate idempotent payment processing with atomic key lock\nprocessed_keys = {}\ndef process_payment(idempotency_key, amount):\n    if idempotency_key in processed_keys:\n        return {"status": "DUPLICATE_IGNORED", "tx": processed_keys[idempotency_key]}\n    processed_keys[idempotency_key] = f"TX_{len(processed_keys)+1}:{amount}"\n    return {"status": "CHARGED", "tx": processed_keys[idempotency_key]}\n\nprint(process_payment("order-101", 499))\nprint(process_payment("order-101", 499))',
        expectedKeywords: ["idempotency", "Redis", "atomic", "lock", "transaction", "PostgreSQL"],
      },
      {
        question:
          "Implement an LRU Cache or rate-limiter check in Python and explain how Redis TTL reduces p95 database read latency.",
        topic: "Caching & Low-Latency Systems",
        starterPython:
          'from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, cap: int):\n        self.cap = cap\n        self.cache = OrderedDict()\n    def get(self, k: int) -> int:\n        if k not in self.cache:\n            return -1\n        self.cache.move_to_end(k)\n        return self.cache[k]\n    def put(self, k: int, v: int) -> None:\n        if k in self.cache:\n            self.cache.move_to_end(k)\n        self.cache[k] = v\n        if len(self.cache) > self.cap:\n            self.cache.popitem(last=False)\n\nlru = LRUCache(2)\nlru.put(1, 100); lru.put(2, 200)\nprint("Get 1:", lru.get(1))',
        expectedKeywords: ["O(1)", "hash map", "doubly linked list", "OrderedDict", "eviction", "TTL"],
      },
    ],
  },
  {
    id: "deloitte-analyst",
    company: "Deloitte",
    role: "Technology Consulting Analyst (Full-Stack & Cloud)",
    packageLpa: "7.6 – 12.5 LPA",
    cutoffScore: 74,
    jdText:
      "Deloitte Consulting Analyst JD: Build enterprise web applications and data pipelines using Python, SQL (PostgreSQL/RDBMS), REST APIs (FastAPI/Spring Boot), React, Docker, AWS/Azure cloud services, Automated Testing (PyTest), and Agile/SDLC best practices with quantified client impact.",
    requiredSkills: [
      "Python",
      "SQL",
      "React",
      "FastAPI",
      "PostgreSQL",
      "Docker",
      "AWS",
      "Git",
      "REST APIs",
    ],
    questions: [
      {
        question:
          "Write a Python or SQL aggregation that finds top-performing departments by average package, and explain indexing & GROUP BY optimization.",
        topic: "SQL & Data Engineering",
        starterPython:
          'records = [("CSE", 14.5), ("CSE", 18.0), ("ECE", 8.5), ("AIML", 22.0), ("AIML", 19.0)]\nfrom collections import defaultdict\nby_dept = defaultdict(list)\nfor dept, lpa in records:\n    by_dept[dept].append(lpa)\nfor dept, vals in sorted(by_dept.items(), key=lambda x: -sum(x[1])/len(x[1])):\n    print(f"{dept}: avg={sum(vals)/len(vals):.2f} LPA")',
        expectedKeywords: ["GROUP BY", "index", "aggregation", "O(n)", "hash", "query"],
      },
      {
        question:
          "How do you secure an enterprise FastAPI REST endpoint for Deloitte clients against SQL injection, broken JWT auth, and rate-limit abuse?",
        topic: "API Security & Architecture",
        starterPython:
          'import hashlib, hmac\n\ndef verify_token(payload: str, signature: str, secret: str) -> bool:\n    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()\n    return hmac.compare_digest(expected, signature)\n\nsig = hmac.new(b"deloitte_key", b"user=boss", hashlib.sha256).hexdigest()\nprint("Token valid:", verify_token("user=boss", sig, "deloitte_key"))',
        expectedKeywords: ["JWT", "parameterized", "ORM", "rate limit", "CORS", "validation"],
      },
      {
        question:
          "Explain how you graduate a basic Streamlit prototype into a 3-tier Dockerized production system on AWS/Azure.",
        topic: "Cloud & Production Deployment",
        starterPython:
          'tiers = ["1. React + TypeScript Frontend (Vercel CDN)", "2. FastAPI Async REST Backend (Docker)", "3. PostgreSQL + Redis Cache (Managed Cloud)"]\nfor t in tiers:\n    print("Tier ->", t)',
        expectedKeywords: ["FastAPI", "PostgreSQL", "Docker", "CI/CD", "React", "decouple"],
      },
    ],
  },
  {
    id: "google-swe",
    company: "Google",
    role: "Software Engineer (University Graduate)",
    packageLpa: "32.0 – 44.6 LPA",
    cutoffScore: 85,
    jdText:
      "Google SWE JD: Solve large-scale algorithmic, graph, and distributed systems problems. Requires mastery of Data Structures & Algorithms, C++/Python/Java, concurrency, distributed storage, TypeScript/React, automated testing, and p99 latency optimization.",
    requiredSkills: [
      "Python",
      "C++",
      "Data Structures",
      "TypeScript",
      "React",
      "System Design",
      "Docker",
      "Git",
      "SQL",
    ],
    questions: [
      {
        question:
          "Implement Two-Sum / Subarray target lookup in O(n) time using a hash map and compare it against the O(n^2) brute-force approach.",
        topic: "Algorithms & Hash Maps",
        starterPython:
          'def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        seen[x] = i\n    return []\n\nprint("Indices:", two_sum([2, 7, 11, 15], 9))',
        expectedKeywords: ["O(n)", "hash map", "dictionary", "space complexity", "complement"],
      },
      {
        question:
          "Implement Breadth-First Search (BFS) shortest-path traversal across a service dependency graph and state its time complexity.",
        topic: "Graphs & Shortest Path",
        starterPython:
          'from collections import deque\n\ndef shortest_hops(graph, start, goal):\n    q = deque([(start, 0)])\n    visited = {start}\n    while q:\n        node, dist = q.popleft()\n        if node == goal:\n            return dist\n        for nxt in graph.get(node, []):\n            if nxt not in visited:\n                visited.add(nxt)\n                q.append((nxt, dist + 1))\n    return -1\n\ng = {"Gateway": ["Auth", "Cart"], "Cart": ["Pay"], "Auth": ["Pay"], "Pay": ["DB"]}\nprint("Shortest hops Gateway->DB:", shortest_hops(g, "Gateway", "DB"))',
        expectedKeywords: ["O(V + E)", "BFS", "queue", "visited", "shortest path"],
      },
      {
        question:
          "How do you design a real-time autocomplete or RAG search pipeline with sub-50ms p95 latency?",
        topic: "System Design & Search",
        starterPython:
          'class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.words = []\n\nroot = TrieNode()\nfor w in ["pathfinder", "placement", "python", "postgres"]:\n    cur = root\n    for ch in w:\n        cur = cur.children.setdefault(ch, TrieNode())\n        cur.words.append(w)\n\nprint("Prefix \'p\':", root.children["p"].words)',
        expectedKeywords: ["Trie", "caching", "vector", "index", "p95", "sharding"],
      },
    ],
  },
];

const SKILL_EXTRACT_PATTERNS: Array<[RegExp, string]> = [
  [/\bpython\b/i, "Python"],
  [/\bjava\b/i, "Java"],
  [/\bc\+\+|\bcpp\b/i, "C++"],
  [/\btypescript\b/i, "TypeScript"],
  [/\bjavascript\b|\bjs\b/i, "JavaScript"],
  [/\breact\b/i, "React"],
  [/\bfastapi\b/i, "FastAPI"],
  [/\bsql\b/i, "SQL"],
  [/\bpostgres(?:ql)?\b/i, "PostgreSQL"],
  [/\bredis\b/i, "Redis"],
  [/\bdocker\b/i, "Docker"],
  [/\baws\b|\bamazon web services\b/i, "AWS"],
  [/\bci\/?cd\b|\bgithub actions\b/i, "CI/CD"],
  [/\bdata structures\b|\bdsa\b|\balgorithms\b/i, "Data Structures"],
  [/\bsystem design\b|\bmicroservices\b/i, "System Design"],
  [/\brest\s*apis?\b/i, "REST APIs"],
  [/\bgit\b|\bgithub\b/i, "Git"],
];

interface JDCustomTailorProps {
  profile: StudentProfileState;
  apiBase: string;
  onAddSkillsToProfile: (newSkills: string[]) => void;
  onOpenOnePageResume: () => void;
  onAskCoach?: (query: string) => void;
  onLaunchInCodingArena: (payload: {
    company: string;
    role: string;
    question: string;
    starterCode: string;
    expectedKeywords: string[];
  }) => void;
}

export const JDCustomTailor: React.FC<JDCustomTailorProps> = ({
  profile,
  apiBase,
  onAddSkillsToProfile,
  onOpenOnePageResume,
  onAskCoach,
  onLaunchInCodingArena,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(JD_PRESETS[0].id);
  const [customJdText, setCustomJdText] = useState<string>(JD_PRESETS[0].jdText);
  const [customCompany, setCustomCompany] = useState<string>(JD_PRESETS[0].company);
  const [customRole, setCustomRole] = useState<string>(JD_PRESETS[0].role);
  const [isSpeakingVerdict, setIsSpeakingVerdict] = useState<boolean>(false);

  const activePreset = useMemo(
    () => JD_PRESETS.find((p) => p.id === selectedPresetId) || JD_PRESETS[0],
    [selectedPresetId]
  );

  const handleSelectPreset = (preset: JDPreset) => {
    setSelectedPresetId(preset.id);
    setCustomCompany(preset.company);
    setCustomRole(preset.role);
    setCustomJdText(preset.jdText);
  };

  const analysis = useMemo(() => {
    const userSkillList = [
      ...(profile.technicalSkills || []),
      ...(profile.skills || []),
      ...(profile.tools || []),
      ...(profile.programmingLanguages || []),
    ];
    const userSkillLower = new Set(userSkillList.map((s) => s.toLowerCase().trim()));

    // Extract required skills from customJdText + preset
    const detectedFromJd: string[] = [];
    for (const [rx, label] of SKILL_EXTRACT_PATTERNS) {
      if (rx.test(customJdText) && !detectedFromJd.includes(label)) {
        detectedFromJd.push(label);
      }
    }
    const targetSkills =
      detectedFromJd.length >= 4 ? detectedFromJd : activePreset.requiredSkills;

    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of targetSkills) {
      const rl = req.toLowerCase();
      const hasIt = Array.from(userSkillLower).some(
        (u) => u === rl || u.includes(rl) || rl.includes(u)
      );
      if (hasIt) matched.push(req);
      else missing.push(req);
    }

    const skillRatio = matched.length / Math.max(1, targetSkills.length);
    const cgpaBonus = Math.min(18, Math.max(0, (profile.cgpa - 6.5) * 6));
    const projBonus = Math.min(14, (profile.projectsCount || 0) * 4);
    const backlogPenalty = (profile.activeBacklogs || 0) * 12;
    const rawMatch = Math.round(
      Math.max(18, Math.min(98, skillRatio * 68 + cgpaBonus + projBonus - backlogPenalty))
    );

    const tailoredSummary = `Results-driven ${profile.branch || "CSE"} undergraduate at ${
      profile.college || "DR RVR NRI DEEMED TO BE UNIVERSITY"
    } (CGPA: ${profile.cgpa.toFixed(1)}/10) targeting ${customRole} at ${customCompany}. Proven hands-on execution across ${
      matched.slice(0, 6).join(", ") || "Python, SQL, React, and REST APIs"
    } with ${profile.projectsCount || 2} production-grade capstones and measurable latency & reliability outcomes.`;

    const tailoredBullet = `Accomplished a 42% p95 response latency reduction for ${customCompany}-grade workloads as measured by automated benchmark telemetry by architecting a modular ${
      matched.slice(0, 3).join(" + ") || "FastAPI + PostgreSQL + React"
    } service with Docker containerization and CI/CD validation.`;

    return {
      matchScore: rawMatch,
      cutoff: activePreset.cutoffScore,
      matched,
      missing,
      tailoredSummary,
      tailoredBullet,
      questions: activePreset.questions,
    };
  }, [profile, customJdText, customCompany, customRole, activePreset]);

  return (
    <div className="glass-depth-card rounded-xl border border-white/[0.08] bg-[#000000] p-6 sm:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#242429] bg-[#18181B] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#f8fafc]">
            <Sparkles className="h-3.5 w-3.5 text-[#f8fafc]" />
            <span>1-Click JD to Custom Prep &amp; Resume Tailor</span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-black text-[#f8fafc]">
            Target Company JD Matcher, ATS Tailor &amp; Custom Viva Generator
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#94a3b8]">
            Select a Tier-1 company JD or paste any job description to compute your real skill match %, auto-tailor Google X-Y-Z resume bullets, and launch custom coding interview questions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onAskCoach && (
            <button
              type="button"
              onClick={() =>
                onAskCoach(
                  `I am targeting ${customRole} at ${customCompany} where my JD match is ${analysis.matchScore}% (cutoff ${analysis.cutoff}%). ${
                    analysis.missing.length > 0
                      ? `My missing keywords are: ${analysis.missing.join(", ")}.`
                      : "I match all detected technical keywords."
                  } How should I tailor my resume bullets and prep in the next 7 days?`
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#000000] px-3 py-2 text-xs font-semibold text-[#f8fafc] hover:bg-[#27272A] transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#f8fafc]" />
              <span>Ask Coach about this</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const verdictMsg = `Your current profile matches ${analysis.matchScore} percent for ${customRole} at ${customCompany}. ${
                analysis.missing.length > 0
                  ? `Add ${analysis.missing.slice(0, 3).join(", ")} to cross the ${analysis.cutoff} percent shortlist bar.`
                  : "You clear the technical keyword cutoff!"
              }`;
              audioEngine.unlockAudio();
              audioEngine.clearAudioQueue();
              window.dispatchEvent(
                new CustomEvent("das-interviewer-prompt", {
                  detail: { question: verdictMsg, track: "jd" },
                })
              );
              setIsSpeakingVerdict(true);
              void audioEngine
                .speakTextPuckOrLocal(verdictMsg, apiBase)
                .finally(() => setIsSpeakingVerdict(false));
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#000000] px-3.5 py-2 text-xs font-bold text-[#f8fafc] hover:bg-[#27272A] transition cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5 text-[#f8fafc]" />
            <span>{isSpeakingVerdict ? "Speaking Verdict..." : "Hear DAS JD Verdict"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenOnePageResume}
            className="inline-flex items-center gap-2 rounded-xl border border-[#242429] bg-[#18181B] px-4 py-2 text-xs font-bold text-[#f8fafc] shadow-sm hover:brightness-110 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export 1-Page Tailored ATS Resume</span>
          </button>
        </div>
      </div>

      {/* 1-Click Company JD Preset Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mr-1">
          Quick Company JDs:
        </span>
        {JD_PRESETS.map((preset) => {
          const active = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                active
                  ? "border border-white/25 bg-[#18181B] text-[#f8fafc] shadow-sm"
                  : "border border-white/[0.08] bg-[#000000] text-[#94a3b8] hover:border-white/20 hover:text-[#f8fafc]"
              }`}
            >
              {preset.company} · {preset.role.split("(")[0].trim()} ({preset.packageLpa})
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left JD Input & Match Breakdown | Right Tailored Bullets & 3 Custom Questions */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 cols: JD Input + Real Match Meter */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="jd-target-company"
                className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
              >
                Target Company
              </label>
              <input
                id="jd-target-company"
                name="jdTargetCompany"
                type="text"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#000000] px-3 py-2 text-xs font-semibold text-[#f8fafc] outline-none focus:border-white/35"
              />
            </div>
            <div>
              <label
                htmlFor="jd-target-role"
                className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
              >
                Target Role Title
              </label>
              <input
                id="jd-target-role"
                name="jdTargetRole"
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#000000] px-3 py-2 text-xs font-semibold text-[#f8fafc] outline-none focus:border-white/35"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="jd-custom-textarea"
              className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
            >
              Paste or Edit Company Job Description (JD)
            </label>
            <textarea
              id="jd-custom-textarea"
              name="jdCustomText"
              rows={4}
              value={customJdText}
              onChange={(e) => setCustomJdText(e.target.value)}
              placeholder="Paste any company Job Description here to compute exact match % and missing keywords..."
              className="w-full rounded-2xl border border-white/[0.08] bg-[#000000] p-3 text-xs text-[#f8fafc] outline-none focus:border-white/35 leading-relaxed"
            />
          </div>

          {/* Match Score Gauge Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#000000] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Live JD Alignment Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[#f8fafc]">{analysis.matchScore}%</span>
                  <span className="text-xs text-[#94a3b8]">
                    vs {customCompany} Cutoff ({analysis.cutoff}%)
                  </span>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold border ${
                  analysis.matchScore >= analysis.cutoff
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                    : "border-white/15 bg-[#18181B] text-[#f8fafc]"
                }`}
              >
                {analysis.matchScore >= analysis.cutoff
                  ? "Shortlist Ready"
                  : `${analysis.cutoff - analysis.matchScore}% Below Cutoff`}
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#000000] border border-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#18181B] via-white/75 to-white transition-all duration-500"
                style={{ width: `${analysis.matchScore}%` }}
              />
            </div>

            {/* Matched vs Missing Keywords */}
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Matched Profile Skills ({analysis.matched.length}):
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {analysis.matched.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200"
                    >
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.missing.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#f8fafc] flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                      Missing JD Keywords ({analysis.missing.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onAddSkillsToProfile(analysis.missing);
                        toast.success(
                          `Added ${analysis.missing.join(", ")} to your profile & recalculated JD match!`
                        );
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f8fafc] hover:text-white underline cursor-pointer"
                    >
                      <PlusCircle className="h-3 w-3" />
                      <span>Add to My Skills</span>
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {analysis.missing.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-lg border border-white/15 bg-[#18181B] px-2 py-0.5 text-[11px] font-semibold text-[#f8fafc]"
                      >
                        + {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 cols: Tailored Google X-Y-Z Resume Copy + 3 Custom Interview Questions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#000000] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f8fafc] flex items-center gap-1.5">
                <Target className="h-4 w-4 text-[#f8fafc]" />
                <span>Auto-Tailored ATS Resume Summary &amp; Google X-Y-Z Bullet ({customCompany})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${analysis.tailoredSummary}\n• ${analysis.tailoredBullet}`
                  );
                  toast.success("Tailored JD summary & X-Y-Z bullet copied to clipboard!");
                }}
                className="rounded-lg border border-white/15 bg-[#18181B] px-2.5 py-1 text-[11px] font-bold text-[#f8fafc] hover:brightness-110 cursor-pointer"
              >
                Copy Bullets
              </button>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed bg-[#000000] rounded-xl p-3 border border-white/10">
              <strong className="text-[#f8fafc]">Executive Summary:</strong> {analysis.tailoredSummary}
            </p>
            <p className="text-xs text-[#94a3b8] leading-relaxed bg-[#000000] rounded-xl p-3 border border-white/10">
              <strong className="text-[#f8fafc]">Google X-Y-Z Impact Bullet:</strong> •{" "}
              {analysis.tailoredBullet}
            </p>
          </div>

          {/* 3 Custom JD Technical Interview Questions */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#000000] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f8fafc] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#f8fafc]" />
                <span>3 Custom Technical Rounds Extracted from {customCompany} JD</span>
              </span>
              <span className="text-[11px] text-[#94a3b8]">
                Click any question to solve live with DAS Voice + Code Compiler
              </span>
            </div>

            <div className="space-y-2.5">
              {analysis.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#000000] p-3 hover:border-white/25 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#18181B] border border-white/15 px-2 py-0.5 text-[10px] font-bold text-[#f8fafc]">
                        Round {idx + 1} · {q.topic}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#f8fafc] leading-relaxed">{q.question}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onLaunchInCodingArena({
                        company: customCompany,
                        role: customRole,
                        question: q.question,
                        starterCode: q.starterPython,
                        expectedKeywords: q.expectedKeywords,
                      })
                    }
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#18181B] px-3 py-2 text-xs font-bold text-[#f8fafc] hover:brightness-110 transition cursor-pointer"
                  >
                    <span>Solve in Live Arena</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
