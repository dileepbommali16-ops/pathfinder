import React, { useState, useMemo } from "react";
import { StudentProfileState, isProfileUnconfigured } from "@/types/profile";
import { toast } from "sonner";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

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
          'tiers = ["1. React + TypeScript Frontend (Vercel CDN)", "2. FastAPI Async REST Backend (Docker)", "3. PostgreSQL + Redis Cache (Managed Cloud)"]\nfor t in tiers:\n    print("Tier:", t)',
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
          'from collections import deque\n\ndef shortest_hops(graph, start, goal):\n    q = deque([(start, 0)])\n    visited = {start}\n    while q:\n        node, dist = q.popleft()\n        if node == goal:\n            return dist\n        for nxt in graph.get(node, []):\n            if nxt not in visited:\n                visited.add(nxt)\n                q.append((nxt, dist + 1))\n    return -1\n\ng = {"Gateway": ["Auth", "Cart"], "Cart": ["Pay"], "Auth": ["Pay"], "Pay": ["DB"]}\nprint("Shortest hops:", shortest_hops(g, "Gateway", "DB"))',
        expectedKeywords: ["O(V + E)", "BFS", "queue", "visited", "shortest path"],
      },
      {
        question:
          "How do you design a real-time autocomplete or RAG search pipeline with sub-50ms p95 latency?",
        topic: "System Design & Search",
        starterPython:
          'class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.words = []\n\nroot = TrieNode()\nfor w in ["pathfinder", "placement", "python", "postgres"]:\n    cur = root\n    for ch in w:\n        cur = cur.children.setdefault(ch, TrieNode())\n        cur.words.append(w)\n\nprint("Prefix p:", root.children["p"].words)',
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
  apiBase: _apiBase,
  onAddSkillsToProfile,
  onOpenOnePageResume,
  onAskCoach,
  onLaunchInCodingArena,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(JD_PRESETS[0].id);
  const [customJdText, setCustomJdText] = useState<string>(JD_PRESETS[0].jdText);
  const [customCompany, setCustomCompany] = useState<string>(JD_PRESETS[0].company);
  const [customRole, setCustomRole] = useState<string>(JD_PRESETS[0].role);

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
    const userSkillList = Array.from(
      new Set(
        [
          ...(profile.technicalSkills || []),
          ...(profile.skills || []),
          ...(profile.tools || []),
          ...(profile.programmingLanguages || []),
        ]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
      )
    );
    const userSkillLower = new Set(userSkillList.map((s) => s.toLowerCase()));

    const trimmedJd = customJdText.trim();
    const hasJd = trimmedJd.length > 0;
    const detectedFromJd: string[] = [];
    if (hasJd) {
      for (const [rx, label] of SKILL_EXTRACT_PATTERNS) {
        if (rx.test(trimmedJd) && !detectedFromJd.includes(label)) {
          detectedFromJd.push(label);
        }
      }
    }

    const isExactPresetJd = trimmedJd === activePreset.jdText.trim();
    const targetSkills = !hasJd
      ? []
      : isExactPresetJd
        ? activePreset.requiredSkills
        : detectedFromJd;

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

    const profileEmpty =
      isProfileUnconfigured(profile) &&
      userSkillList.length === 0 &&
      (Number(profile.projectsCount) || 0) <= 0;

    let matchScore: number | null = null;
    if (hasJd && targetSkills.length > 0 && !profileEmpty) {
      const skillRatio = matched.length / targetSkills.length;
      const cgpaBonus =
        Number(profile.cgpa) > 0 ? Math.min(18, Math.max(0, (Number(profile.cgpa) - 6.5) * 6)) : 0;
      const projBonus = Math.min(14, Math.max(0, Number(profile.projectsCount) || 0) * 4);
      const backlogPenalty = Math.max(0, Number(profile.activeBacklogs ?? profile.backlogs ?? 0)) * 12;
      matchScore = Math.round(
        Math.max(0, Math.min(98, skillRatio * 68 + cgpaBonus + projBonus - backlogPenalty))
      );
    }

    const companyLabel = customCompany.trim() || "[Target Company]";
    const roleLabel = customRole.trim() || "[Target Role]";
    const branchLabel = (profile.branch || "").trim() || "[Branch]";
    const collegeLabel = (profile.college || "").trim() || "[Institution]";
    const cgpaClause =
      Number(profile.cgpa) > 0 ? ` (CGPA: ${Number(profile.cgpa).toFixed(1)}/10)` : "";
    const skillClause =
      matched.length > 0
        ? `hands-on experience in ${matched.slice(0, 6).join(", ")}`
        : userSkillList.length > 0
          ? `experience in ${userSkillList.slice(0, 5).join(", ")}`
          : "preparation aligned with [Add Your Skills]";
    const projectsCount = Math.max(0, Number(profile.projectsCount) || 0);
    const projectsClause =
      projectsCount > 0
        ? ` across ${projectsCount} engineering project${projectsCount === 1 ? "" : "s"}`
        : "";

    const tailoredSummary = `${branchLabel} undergraduate at ${collegeLabel}${cgpaClause} targeting ${roleLabel} at ${companyLabel}, with ${skillClause}${projectsClause}.`;

    const bulletStack =
      matched.length > 0
        ? matched.slice(0, 3).join(" + ")
        : userSkillList.length > 0
          ? userSkillList.slice(0, 3).join(" + ")
          : "[Your Tech Stack]";

    const tailoredBullet = `Accomplished [X%] [latency / throughput / reliability improvement] for [project or workload] aligned with ${companyLabel} requirements, as measured by [benchmark or test metric], by implementing a modular ${bulletStack} service with [testing / deployment workflow].`;

    return {
      hasJd,
      profileEmpty,
      matchScore,
      cutoff: activePreset.cutoffScore,
      matched,
      missing,
      tailoredSummary,
      tailoredBullet,
      questions: activePreset.questions,
    };
  }, [profile, customJdText, customCompany, customRole, activePreset]);

  return (
    <SpotlightSurface className="space-y-9 rounded-2xl p-8 sm:p-10">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 lg:flex-row lg:items-center">
        <div>
          <span className="inline-block rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
            JD Alignment &amp; Tailor
          </span>
          <h2
            className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-[28px]"
            style={{ textWrap: "balance" }}
          >
            Target Company JD Matcher, ATS Tailor &amp; Custom Viva
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm">
            Select a preset company JD or paste any job description to compute your keyword match,
            tailor Google X-Y-Z resume bullets, and launch targeted coding rounds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAskCoach && (
            <button
              type="button"
              onClick={() =>
                onAskCoach(
                  `I am targeting ${customRole || "a software role"} at ${customCompany || "my target company"} where my JD match is ${analysis.matchScore !== null ? `${analysis.matchScore}%` : "not calculated yet"} (reference cutoff ${analysis.cutoff}%). ${analysis.missing.length > 0
                    ? `My missing keywords are: ${analysis.missing.join(", ")}.`
                    : "Please advise on tailoring my resume and interview prep."
                  } How should I tailor my resume bullets and prep in the next 7 days?`
                )
              }
              className="pf-btn-secondary inline-flex h-10 items-center rounded-xl px-4 text-xs font-medium cursor-pointer"
            >
              Ask DAS
            </button>
          )}

          <button
            type="button"
            onClick={onOpenOnePageResume}
            className="pf-btn-primary inline-flex h-10 items-center rounded-xl px-5 text-xs font-medium active:scale-[0.98] cursor-pointer"
          >
            Export 1-Page ATS Resume
          </button>
        </div>
      </div>

      {/* Quick Company JD Presets */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-1 font-mono text-[11px] text-[#8A8A92]">Quick Company JDs</span>
        {JD_PRESETS.map((preset) => {
          const active = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`h-9 rounded-lg border px-4 text-xs font-medium transition-colors cursor-pointer ${active
                ? "border-white/[0.28] bg-[#18181F] text-[#FAFAFA]"
                : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                }`}
            >
              {preset.company} · {preset.role.split("(")[0].trim()} ({preset.packageLpa})
            </button>
          );
        })}
      </div>

      {/* Main Grid — Stacked Inputs So Long Role Titles Never Clip */}
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left 5 cols: Stacked Clean Typing Inputs & Alignment Gauge */}
        <div className="min-w-0 space-y-6 lg:col-span-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="jd-target-company"
                className="mb-2 block text-xs font-medium text-[#D4D4D8]"
              >
                Target Company
              </label>
              <input
                id="jd-target-company"
                name="jdTargetCompany"
                type="text"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                className="pf-input h-11 w-full rounded-xl px-4 text-sm text-[#FAFAFA]"
              />
            </div>
            <div>
              <label
                htmlFor="jd-target-role"
                className="mb-2 block text-xs font-medium text-[#D4D4D8]"
              >
                Target Role Title
              </label>
              <input
                id="jd-target-role"
                name="jdTargetRole"
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="pf-input h-11 w-full rounded-xl px-4 text-sm text-[#FAFAFA]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="jd-custom-textarea"
              className="mb-2 block text-xs font-medium text-[#D4D4D8]"
            >
              Company Job Description
            </label>
            <textarea
              id="jd-custom-textarea"
              name="jdCustomText"
              rows={5}
              value={customJdText}
              onChange={(e) => setCustomJdText(e.target.value)}
              placeholder="Paste any company Job Description here to compute exact match % and missing keywords..."
              className="pf-input w-full rounded-xl p-4 text-xs leading-relaxed text-[#FAFAFA] placeholder-[#8A8A92]"
            />
          </div>

          {/* Match Score Gauge Card */}
          <div className="pf-subpanel space-y-5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] text-[#8A8A92]">Live JD Alignment</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold text-[#FAFAFA] tabular-nums">
                    {analysis.matchScore !== null ? `${analysis.matchScore}%` : "—"}
                  </span>
                  <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                    vs {customCompany || "Target"} ({analysis.cutoff}% ref)
                  </span>
                </div>
              </div>
              <span className="rounded-md border border-white/[0.1] bg-black/50 px-3 py-1 font-mono text-[11px] text-[#FAFAFA] tabular-nums">
                {!analysis.hasJd
                  ? "Paste JD to Score"
                  : analysis.profileEmpty
                    ? "Profile Unconfigured"
                    : analysis.matchScore === null
                      ? "No Keywords Detected"
                      : analysis.matchScore >= analysis.cutoff
                        ? "Shortlist Ready"
                        : `${analysis.cutoff - analysis.matchScore}% Below Cutoff`}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#A1A1AA] to-[#FAFAFA] transition-[width] duration-500"
                style={{ width: `${analysis.matchScore ?? 0}%` }}
              />
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <span className="block text-xs font-medium text-[#D4D4D8]">
                  Matched Profile Skills ({analysis.matched.length})
                </span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {analysis.matched.length > 0 ? (
                    analysis.matched.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md border border-white/[0.12] bg-[#16161C] px-2.5 py-1 text-[11px] font-medium text-[#FAFAFA]"
                      >
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#8A8A92]">
                      {!analysis.hasJd
                        ? "Enter a job description above to detect matching skills."
                        : "No matching profile skills yet — add skills in Profile Settings or below."}
                    </span>
                  )}
                </div>
              </div>

              {analysis.missing.length > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#D4D4D8]">
                      Missing JD Keywords ({analysis.missing.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onAddSkillsToProfile(analysis.missing);
                        toast.success(
                          `Added ${analysis.missing.join(", ")} to your profile & recalculated JD match.`
                        );
                      }}
                      className="text-[11px] font-medium text-[#FAFAFA] underline underline-offset-4 hover:text-[#D4D4D8] cursor-pointer"
                    >
                      Add to my skills
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {analysis.missing.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md border border-white/[0.08] bg-black/50 px-2.5 py-1 text-[11px] text-[#A1A1AA]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 7 cols: Tailored Copy + 3 Custom Questions */}
        <div className="min-w-0 space-y-7 lg:col-span-7">
          <div className="pf-subpanel space-y-4 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-[#FAFAFA] sm:text-sm">
                  ATS Summary &amp; Google X-Y-Z Bullet Template ({customCompany || "Target"})
                </span>
                <span className="mt-0.5 block text-[11px] text-[#8A8A92]">
                  Replace bracketed [placeholders] with your own measured metrics before copying.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${analysis.tailoredSummary}\n• ${analysis.tailoredBullet}`
                  );
                  toast.success("Tailored JD summary & X-Y-Z template copied to clipboard.");
                }}
                className="pf-btn-secondary inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[11px] font-medium cursor-pointer"
              >
                Copy template
              </button>
            </div>
            <p className="rounded-xl border border-white/[0.07] bg-black/45 p-4 text-xs leading-relaxed text-[#A1A1AA]">
              <strong className="font-medium text-[#FAFAFA]">Executive Summary:</strong>{" "}
              {analysis.tailoredSummary}
            </p>
            <p className="rounded-xl border border-white/[0.07] bg-black/45 p-4 text-xs leading-relaxed text-[#A1A1AA]">
              <strong className="font-medium text-[#FAFAFA]">Google X-Y-Z Impact Bullet:</strong>{" "}
              {analysis.tailoredBullet}
            </p>
          </div>

          <div className="pf-subpanel space-y-5 rounded-2xl p-6 sm:p-7">
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
              <span className="text-xs font-semibold text-[#FAFAFA] sm:text-sm">
                3 Custom Technical Rounds from {customCompany} JD
              </span>
              <span className="font-mono text-[11px] text-[#8A8A92]">
                Open in Live Coding Arena
              </span>
            </div>

            <div className="space-y-4">
              {analysis.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.07] bg-black/45 p-4.5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-2">
                    <span className="inline-block rounded-md border border-white/[0.08] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                      Round {String(idx + 1).padStart(2, "0")} · {q.topic}
                    </span>
                    <p className="text-xs font-medium leading-relaxed text-[#FAFAFA]">
                      {q.question}
                    </p>
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
                    className="pf-btn-secondary inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-xs font-medium cursor-pointer"
                  >
                    Solve in Arena
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SpotlightSurface>
  );
};
