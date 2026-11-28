import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface SimulatorProfileInput {
    cgpa?: number;
    codingScore?: number;
    coding?: number;
    communicationScore?: number;
    communication?: number;
    internships?: number;
    backlogs?: number;
    activeBacklogs?: number;
    projectsCount?: number;
    projects?: number;
    technicalSkills?: string[];
    skills?: string[];
    targetRole?: string;
    githubUrl?: string;
    leetcodeUrl?: string;
}

interface PredictionResponse {
    chance: number;
    label: string;
    tone: string;
    strengths?: string[];
    priorities?: string[];
    breakdown?: Record<string, number>;
    data_source?: string;
}

interface GitHubVerifyResponse {
    mode: "repo" | "profile";
    username: string;
    repoName?: string;
    repoFullName?: string;
    repoUrl?: string;
    avatarUrl?: string;
    name?: string;
    bio?: string;
    publicRepos?: number;
    totalStars?: number;
    followers?: number;
    topLanguages?: string[];
    authenticityScore: number;
    isVerified: boolean;
    verdict: string;
    accountAgeYears?: number;
    strengths?: string[];
    gaps?: string[];
    repoMetrics?: {
        sizeKb?: number;
        commitsSampled?: number;
        distinctCommitDays?: number;
        fileCount?: number;
        readmeWords?: number;
        hasTests?: boolean;
        hasDocker?: boolean;
        hasCi?: boolean;
        hasManifest?: boolean;
        isFork?: boolean;
        lastPushedDaysAgo?: number;
    };
}

interface CounterfactualResult {
    action: string;
    detail: string;
    newChance: number;
    delta: number;
}

interface WhatIfGitHubSimulatorProps {
    profile?: SimulatorProfileInput;
    baselineChance?: number;
    apiBase: string;
    onAskCoach?: (prompt: string) => void;
}

const HIGH_IMPACT_SKILLS = [
    "AWS",
    "Docker",
    "Kubernetes",
    "System Design",
    "Redis",
    "CI/CD",
    "TypeScript",
    "PyTorch",
];

function extractBaseSkills(profile?: SimulatorProfileInput): string[] {
    const raw = profile?.technicalSkills ?? profile?.skills ?? [];
    return Array.isArray(raw) ? raw.map((s) => String(s).trim()).filter(Boolean) : [];
}

export const WhatIfGitHubSimulator: React.FC<WhatIfGitHubSimulatorProps> = ({
    profile,
    baselineChance = 67.3,
    apiBase,
    onAskCoach,
}) => {
    const initialCgpa = Number(profile?.cgpa ?? 8.1);
    const initialCoding = Number(profile?.codingScore ?? profile?.coding ?? 8.0);
    const initialComm = Number(profile?.communicationScore ?? profile?.communication ?? 7.0);
    const initialInternships = Number(profile?.internships ?? 1);
    const initialProjects = Number(profile?.projectsCount ?? profile?.projects ?? 3);
    const initialBacklogs = Number(profile?.backlogs ?? profile?.activeBacklogs ?? 0);
    const baseSkills = useMemo(() => extractBaseSkills(profile), [profile]);

    // What-If Simulator State
    const [cgpa, setCgpa] = useState<number>(initialCgpa);
    const [coding, setCoding] = useState<number>(initialCoding);
    const [communication, setCommunication] = useState<number>(initialComm);
    const [internships, setInternships] = useState<number>(initialInternships);
    const [projectsCount, setProjectsCount] = useState<number>(initialProjects);
    const [backlogs, setBacklogs] = useState<number>(initialBacklogs);
    const [extraSkills, setExtraSkills] = useState<string[]>([]);

    const [simResult, setSimResult] = useState<PredictionResponse | null>(null);
    const [simLoading, setSimLoading] = useState<boolean>(false);
    const [simError, setSimError] = useState<string>("");

    // Counterfactual Optimizer State
    const [optimizing, setOptimizing] = useState<boolean>(false);
    const [counterfactuals, setCounterfactuals] = useState<CounterfactualResult[]>([]);

    // GitHub Proof-of-Work State
    const [githubInput, setGithubInput] = useState<string>(profile?.githubUrl || "");
    const [ghLoading, setGhLoading] = useState<boolean>(false);
    const [ghError, setGhError] = useState<string>("");
    const [ghResult, setGhResult] = useState<GitHubVerifyResponse | null>(null);

    const debounceRef = useRef<number | null>(null);

    const combinedSkills = useMemo(() => {
        const merged = new Set([...baseSkills, ...extraSkills]);
        return Array.from(merged);
    }, [baseSkills, extraSkills]);

    const buildPredictPayload = useCallback(
        (overrides: Record<string, unknown> = {}) => ({
            cgpa,
            coding,
            communication,
            internships,
            backlogs,
            projects_count: projectsCount,
            skills: combinedSkills,
            target_role: profile?.targetRole || "Software Development Engineer (SDE)",
            github_url: githubInput || profile?.githubUrl || "",
            leetcode_url: profile?.leetcodeUrl || "",
            ...(ghResult ? { github_verified_score: ghResult.authenticityScore } : {}),
            ...overrides,
        }),
        [
            cgpa,
            coding,
            communication,
            internships,
            backlogs,
            projectsCount,
            combinedSkills,
            profile?.targetRole,
            profile?.githubUrl,
            profile?.leetcodeUrl,
            githubInput,
            ghResult,
        ]
    );

    const runLiveSimulation = useCallback(async () => {
        setSimLoading(true);
        setSimError("");
        try {
            const res = await fetch(`${apiBase}/api/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildPredictPayload()),
            });
            if (!res.ok) throw new Error(`Prediction API returned ${res.status}`);
            const data: PredictionResponse = await res.json();
            setSimResult(data);
        } catch (err) {
            setSimError(err instanceof Error ? err.message : "Could not reach ML prediction engine.");
        } finally {
            setSimLoading(false);
        }
    }, [apiBase, buildPredictPayload]);

    // Debounced live ML prediction whenever any slider or skill changes
    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            runLiveSimulation();
        }, 320);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [runLiveSimulation]);

    // Counterfactual Optimizer: tests 4 real single-action scenarios against Random Forest
    const runCounterfactualOptimizer = async () => {
        setOptimizing(true);
        setCounterfactuals([]);
        const currentScore = simResult?.chance ?? baselineChance;

        const scenarios: { action: string; detail: string; overrides: Record<string, unknown> }[] = [
            {
                action: "+1 Real Internship",
                detail: `Internships ${internships} → ${Math.min(5, internships + 1)}`,
                overrides: { internships: Math.min(5, internships + 1) },
            },
            {
                action: "Add Cloud & System Design",
                detail: "+ AWS, Docker, System Design",
                overrides: {
                    skills: Array.from(new Set([...combinedSkills, "AWS", "Docker", "System Design"])),
                },
            },
            {
                action: "Boost Coding Index (+1.5)",
                detail: `Coding ${coding.toFixed(1)} → ${Math.min(10, coding + 1.5).toFixed(1)}`,
                overrides: { coding: Math.min(10, Number((coding + 1.5).toFixed(1))) },
            },
            {
                action: "Raise CGPA (+0.5)",
                detail: `CGPA ${cgpa.toFixed(1)} → ${Math.min(10, cgpa + 0.5).toFixed(1)}`,
                overrides: { cgpa: Math.min(10, Number((cgpa + 0.5).toFixed(1))) },
            },
            {
                action: "Build +2 Deployed Projects",
                detail: `Projects ${projectsCount} → ${Math.min(12, projectsCount + 2)}`,
                overrides: { projects_count: Math.min(12, projectsCount + 2) },
            },
        ];

        try {
            const results = await Promise.all(
                scenarios.map(async (sc) => {
                    const res = await fetch(`${apiBase}/api/predict`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(buildPredictPayload(sc.overrides)),
                    });
                    if (!res.ok) return null;
                    const data: PredictionResponse = await res.json();
                    const newChance = Number(data.chance.toFixed(1));
                    return {
                        action: sc.action,
                        detail: sc.detail,
                        newChance,
                        delta: Number((newChance - currentScore).toFixed(1)),
                    };
                })
            );

            const ranked = results
                .filter((r): r is CounterfactualResult => r !== null)
                .sort((a, b) => b.delta - a.delta);
            setCounterfactuals(ranked);
        } catch {
            setSimError("Counterfactual optimizer could not reach backend.");
        } finally {
            setOptimizing(false);
        }
    };

    // GitHub Proof-of-Work Verification
    const runGitHubVerify = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const cleaned = githubInput.trim();
        if (!cleaned) {
            setGhError("Enter a GitHub username (e.g. github.com/username/repo) or repository URL.");
            return;
        }
        setGhLoading(true);
        setGhError("");
        try {
            const res = await fetch(`${apiBase}/api/verify-github`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url_or_username: cleaned }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.detail || `GitHub verifier returned ${res.status}`);
            }
            const data: GitHubVerifyResponse = await res.json();
            setGhResult(data);
        } catch (err) {
            setGhError(err instanceof Error ? err.message : "Failed to verify GitHub profile/repo.");
        } finally {
            setGhLoading(false);
        }
    };

    const resetSliders = () => {
        setCgpa(initialCgpa);
        setCoding(initialCoding);
        setCommunication(initialComm);
        setInternships(initialInternships);
        setProjectsCount(initialProjects);
        setBacklogs(initialBacklogs);
        setExtraSkills([]);
        setCounterfactuals([]);
    };

    const toggleSkill = (skill: string) => {
        setExtraSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    const liveChance = Math.max(0, Math.min(100, Number((simResult?.chance ?? baselineChance).toFixed(1))));
    const deltaFromBase = Number((liveChance - baselineChance).toFixed(1));

    // Cross-check claimed resume skills against detected GitHub proof
    const skillCrossCheck = useMemo(() => {
        if (!ghResult) return { proven: [] as string[], unproven: [] as string[] };
        const toLangName = (item: unknown): string => {
            if (typeof item === "string") return item;
            if (Array.isArray(item) && item.length > 0) return String(item[0]);
            if (item && typeof item === "object") {
                const o = item as Record<string, unknown>;
                return String(o.language ?? o.name ?? o.lang ?? "");
            }
            return "";
        };
        const langs = (ghResult.topLanguages || []).map((l) => toLangName(l).toLowerCase()).filter(Boolean);
        const proven: string[] = [];
        const unproven: string[] = [];

        for (const skill of baseSkills) {
            const s = skill.toLowerCase();
            const matchedLang = langs.some((l) => l.includes(s) || s.includes(l));
            const matchedDocker = s.includes("docker") && Boolean(ghResult.repoMetrics?.hasDocker);
            const matchedCi = s.includes("ci") && Boolean(ghResult.repoMetrics?.hasCi);
            const matchedReactOrTs =
                (s.includes("react") || s.includes("next") || s.includes("vite")) &&
                (langs.includes("typescript") || langs.includes("javascript"));
            const matchedFastApi =
                (s.includes("fastapi") || s.includes("django") || s.includes("flask") || s.includes("ml")) &&
                langs.includes("python");

            if (matchedLang || matchedDocker || matchedCi || matchedReactOrTs || matchedFastApi) {
                proven.push(skill);
            } else {
                unproven.push(skill);
            }
        }
        return { proven, unproven };
    }, [ghResult, baseSkills]);

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D12] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#5BC0DE]/30 bg-[#5BC0DE]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#5BC0DE]">
                            Explainable ML · Counterfactual Lab + Proof of Work
                        </span>
                        <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-[#FAFAFA] sm:text-2xl">
                            What-If ML Simulator &amp; GitHub Proof Verifier
                        </h2>
                        <p className="mt-1 text-sm text-[#A1A1AA]">
                            Drag sliders to simulate real Random Forest placement probability changes, find your
                            fastest path past the 75% Tier-1 cutoff, and verify claimed resume skills against real GitHub code.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetSliders}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-[#FAFAFA] transition-colors hover:bg-white/[0.08]"
                    >
                        Reset to My Profile
                    </button>
                </div>
            </div>

            {/* Main 2-Column Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* LEFT COLUMN: Interactive What-If ML Simulator */}
                <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0D0D12] p-5 sm:p-6 lg:col-span-7">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A92]">
                                Live Simulated Placement Probability
                            </p>
                            <div className="mt-1 flex items-baseline gap-3">
                                <span className="text-4xl font-bold tabular-nums text-[#FAFAFA]">
                                    {liveChance.toFixed(1)}%
                                </span>
                                <span
                                    className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${deltaFromBase > 0
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : deltaFromBase < 0
                                            ? "bg-rose-500/15 text-rose-300"
                                            : "bg-white/10 text-[#A1A1AA]"
                                        }`}
                                >
                                    {deltaFromBase > 0 ? `+${deltaFromBase.toFixed(1)}%` : `${deltaFromBase.toFixed(1)}%`} vs current
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[#A1A1AA]">
                                {simLoading
                                    ? "Recalculating on Random Forest ML engine..."
                                    : simResult?.label || "Random Forest ML Engine"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={runCounterfactualOptimizer}
                            disabled={optimizing}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#5BC0DE]/40 bg-[#5BC0DE]/15 px-4 py-2.5 text-xs font-semibold text-[#5BC0DE] transition-colors hover:bg-[#5BC0DE]/25 disabled:opacity-50"
                        >
                            {optimizing ? "Running ML Scenarios..." : "Find Fastest Path to 75%+"}
                        </button>
                    </div>

                    {/* Progress Bar with 75% Tier-1 Marker */}
                    <div>
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                            <span>0%</span>
                            <span className="text-[#5BC0DE]">Tier-1 Cutoff · 75%</span>
                            <span>100%</span>
                        </div>
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${liveChance >= 75
                                    ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                                    : "bg-gradient-to-r from-[#5BC0DE] to-indigo-400"
                                    }`}
                                style={{ width: `${liveChance}%` }}
                            />
                            <div
                                className="absolute top-0 h-full w-0.5 bg-white/70"
                                style={{ left: "75%" }}
                                title="Tier-1 Cutoff (75%)"
                            />
                        </div>
                    </div>

                    {simError && (
                        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                            {simError}
                        </p>
                    )}

                    {/* Interactive Sliders Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                            {
                                label: "CGPA",
                                value: cgpa,
                                display: cgpa.toFixed(1),
                                min: 5.0,
                                max: 10.0,
                                step: 0.1,
                                onChange: setCgpa,
                            },
                            {
                                label: "Coding Index (DSA)",
                                value: coding,
                                display: `${coding.toFixed(1)} / 10`,
                                min: 1.0,
                                max: 10.0,
                                step: 0.1,
                                onChange: setCoding,
                            },
                            {
                                label: "Communication & Viva",
                                value: communication,
                                display: `${communication.toFixed(1)} / 10`,
                                min: 1.0,
                                max: 10.0,
                                step: 0.1,
                                onChange: setCommunication,
                            },
                            {
                                label: "Internships",
                                value: internships,
                                display: String(internships),
                                min: 0,
                                max: 5,
                                step: 1,
                                onChange: setInternships,
                            },
                            {
                                label: "Deployed Projects",
                                value: projectsCount,
                                display: String(projectsCount),
                                min: 0,
                                max: 10,
                                step: 1,
                                onChange: setProjectsCount,
                            },
                            {
                                label: "Active Backlogs",
                                value: backlogs,
                                display: String(backlogs),
                                min: 0,
                                max: 5,
                                step: 1,
                                onChange: setBacklogs,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                            >
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-medium text-[#D4D4D8]">{item.label}</span>
                                    <span className="font-mono font-semibold text-[#5BC0DE]">{item.display}</span>
                                </div>
                                <input
                                    type="range"
                                    min={item.min}
                                    max={item.max}
                                    step={item.step}
                                    value={item.value}
                                    onChange={(e) => item.onChange(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer accent-[#5BC0DE]"
                                />
                            </div>
                        ))}
                    </div>

                    {/* High-Impact Skill Toggles */}
                    <div>
                        <p className="mb-2 text-xs font-medium text-[#A1A1AA]">
                            Toggle High-Impact Skills to Simulate Resume Upgrades:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {HIGH_IMPACT_SKILLS.map((skill) => {
                                const alreadyInProfile = baseSkills.some(
                                    (s) => s.toLowerCase() === skill.toLowerCase()
                                );
                                const active = alreadyInProfile || extraSkills.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        type="button"
                                        disabled={alreadyInProfile}
                                        onClick={() => toggleSkill(skill)}
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${alreadyInProfile
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 opacity-80"
                                            : active
                                                ? "border-[#5BC0DE]/50 bg-[#5BC0DE]/20 text-[#FAFAFA]"
                                                : "border-white/10 bg-white/[0.03] text-[#A1A1AA] hover:border-white/25 hover:text-white"
                                            }`}
                                    >
                                        {alreadyInProfile ? `✓ ${skill}` : active ? `+ ${skill}` : skill}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Counterfactual Optimizer Results */}
                    {counterfactuals.length > 0 && (
                        <div className="rounded-xl border border-[#5BC0DE]/25 bg-[#5BC0DE]/[0.05] p-4">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-[#5BC0DE]">
                                ML Sensitivity Ranking — Highest ROI Actions Right Now
                            </p>
                            <div className="mt-3 space-y-2">
                                {counterfactuals.map((cf, idx) => (
                                    <div
                                        key={cf.action}
                                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#09090B]/80 px-3.5 py-2.5 text-xs"
                                    >
                                        <div>
                                            <span className="mr-2 font-mono text-[#5BC0DE]">#{idx + 1}</span>
                                            <span className="font-semibold text-[#FAFAFA]">{cf.action}</span>
                                            <span className="ml-2 text-[#8A8A92]">({cf.detail})</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className="text-[#A1A1AA]">{cf.newChance.toFixed(1)}%</span>
                                            <span
                                                className={`rounded px-1.5 py-0.5 font-semibold ${cf.delta > 0
                                                    ? "bg-emerald-500/15 text-emerald-300"
                                                    : "bg-white/10 text-[#A1A1AA]"
                                                    }`}
                                            >
                                                {cf.delta > 0 ? `+${cf.delta.toFixed(1)}%` : `${cf.delta.toFixed(1)}%`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: GitHub Proof-of-Work Verifier */}
                <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#0D0D12] p-5 sm:p-6 lg:col-span-5">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-400">
                            Anti-Fake-Resume Proof Check
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-[#FAFAFA]">
                            GitHub Proof-of-Work Verifier
                        </h3>
                        <p className="mt-1 text-xs text-[#A1A1AA]">
                            Paste any GitHub username or repository URL to audit real code signals and cross-check
                            claimed resume skills. Verified scores feed directly into your ML simulation.
                        </p>
                    </div>

                    <form onSubmit={runGitHubVerify} className="flex gap-2">
                        <input
                            type="text"
                            value={githubInput}
                            onChange={(e) => setGithubInput(e.target.value)}
                            placeholder="e.g. dileepbommali16-ops or repo URL"
                            className="w-full rounded-lg border border-white/15 bg-[#09090B] px-3.5 py-2.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:border-[#5BC0DE] focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={ghLoading}
                            className="shrink-0 rounded-lg bg-[#FAFAFA] px-4 py-2.5 text-xs font-semibold text-[#09090B] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {ghLoading ? "Auditing..." : "Verify"}
                        </button>
                    </form>

                    {ghError && (
                        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                            {ghError}
                        </p>
                    )}

                    {ghResult ? (
                        <div className="space-y-4">
                            {/* Score & Verdict Card */}
                            <div className="rounded-xl border border-white/[0.08] bg-[#09090B] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {ghResult.avatarUrl && (
                                            <img
                                                src={ghResult.avatarUrl}
                                                alt={ghResult.username}
                                                className="h-10 w-10 rounded-full border border-white/15"
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-[#FAFAFA]">
                                                {ghResult.repoFullName || ghResult.name || ghResult.username}
                                            </p>
                                            <p className="font-mono text-[11px] text-[#8A8A92]">
                                                @{ghResult.username} · {ghResult.publicRepos ?? 0} repos · ★{" "}
                                                {ghResult.totalStars ?? 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold tabular-nums text-[#FAFAFA]">
                                            {ghResult.authenticityScore}
                                        </span>
                                        <span className="text-xs text-[#8A8A92]">/100</span>
                                        <div>
                                            <span
                                                className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${ghResult.isVerified
                                                    ? "bg-emerald-500/15 text-emerald-300"
                                                    : "bg-amber-500/15 text-amber-300"
                                                    }`}
                                            >
                                                {ghResult.isVerified ? "PROOF VERIFIED" : "PROOF NEEDED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-[#D4D4D8]">{ghResult.verdict}</p>

                                {ghResult.topLanguages && ghResult.topLanguages.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {ghResult.topLanguages && ghResult.topLanguages.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {ghResult.topLanguages.map((lang: unknown, idx: number) => {
                                                    const label =
                                                        typeof lang === "string"
                                                            ? lang
                                                            : Array.isArray(lang)
                                                                ? String(lang[0] ?? "")
                                                                : lang && typeof lang === "object"
                                                                    ? String((lang as Record<string, unknown>).language ?? (lang as Record<string, unknown>).name ?? "")
                                                                    : "";
                                                    if (!label) return null;
                                                    return (
                                                        <span
                                                            key={`${label}-${idx}`}
                                                            className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]"
                                                        >
                                                            {label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Repo Engineering Signals (if a specific repo URL was audited) */}
                            {ghResult.repoMetrics && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {[
                                        { label: "Tests Detected", ok: Boolean(ghResult.repoMetrics.hasTests) },
                                        { label: "Dockerized", ok: Boolean(ghResult.repoMetrics.hasDocker) },
                                        { label: "CI/CD Pipeline", ok: Boolean(ghResult.repoMetrics.hasCi) },
                                        {
                                            label: `Commits (${ghResult.repoMetrics.commitsSampled ?? 0})`,
                                            ok: (ghResult.repoMetrics.commitsSampled ?? 0) >= 5,
                                        },
                                    ].map((sig) => (
                                        <div
                                            key={sig.label}
                                            className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${sig.ok
                                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                                : "border-white/[0.06] bg-white/[0.02] text-[#8A8A92]"
                                                }`}
                                        >
                                            {sig.ok ? "✓ " : "○ "}
                                            {sig.label}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Resume vs. GitHub Skill Cross-Check */}
                            {baseSkills.length > 0 && (
                                <div className="rounded-xl border border-white/[0.08] bg-[#09090B] p-4 space-y-3">
                                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A92]">
                                        Resume vs. GitHub Code Audit
                                    </p>
                                    {skillCrossCheck.proven.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-medium text-emerald-400">
                                                Proven in Public Code ({skillCrossCheck.proven.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {skillCrossCheck.proven.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300"
                                                    >
                                                        ✓ {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {skillCrossCheck.unproven.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-medium text-amber-400">
                                                Claimed on Resume — No Repo Evidence Yet ({skillCrossCheck.unproven.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {skillCrossCheck.unproven.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300"
                                                    >
                                                        ! {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Optional AI Repo Grill CTA */}
                            {onAskCoach && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onAskCoach(
                                            `Grill me like an SDE-1 interviewer on my GitHub ${ghResult.repoFullName || ghResult.username
                                            } (Authenticity ${ghResult.authenticityScore}/100, languages: ${(
                                                ghResult.topLanguages || []
                                            ).join(", ")}). Ask 1 tough architecture question first.`
                                        )
                                    }
                                    className="w-full rounded-lg border border-[#5BC0DE]/40 bg-[#5BC0DE]/15 px-4 py-2.5 text-xs font-semibold text-[#5BC0DE] transition-colors hover:bg-[#5BC0DE]/25"
                                >
                                    Grill Me on This Repo (AI Coach)
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-white/10 bg-[#09090B]/60 p-6 text-center">
                            <p className="text-xs font-medium text-[#D4D4D8]">
                                Ready to verify live GitHub repositories
                            </p>
                            <p className="mt-1 text-[11px] text-[#71717A]">
                                Try entering <span className="font-mono text-[#5BC0DE]">dileepbommali16-ops</span> or
                                a full repository URL to test live code authenticity scoring.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatIfGitHubSimulator;