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
    topLanguages?: unknown[];
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

function toLangName(item: unknown): string {
    if (typeof item === "string") return item;
    if (Array.isArray(item) && item.length > 0) return String(item[0] ?? "");
    if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return String(o.language ?? o.name ?? o.lang ?? "");
    }
    return "";
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

    const [optimizing, setOptimizing] = useState<boolean>(false);
    const [counterfactuals, setCounterfactuals] = useState<CounterfactualResult[]>([]);

    const [githubInput, setGithubInput] = useState<string>(profile?.githubUrl || "");
    const [ghLoading, setGhLoading] = useState<boolean>(false);
    const [ghError, setGhError] = useState<string>("");
    const [ghResult, setGhResult] = useState<GitHubVerifyResponse | null>(null);

    const debounceRef = useRef<number | null>(null);

    const combinedSkills = useMemo(() => {
        return Array.from(new Set([...baseSkills, ...extraSkills]));
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

    useEffect(() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            runLiveSimulation();
        }, 320);
        return () => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
        };
    }, [runLiveSimulation]);

    const runCounterfactualOptimizer = async () => {
        setOptimizing(true);
        setCounterfactuals([]);
        const currentScore = simResult?.chance ?? baselineChance;

        const scenarios: { action: string; detail: string; overrides: Record<string, unknown> }[] = [
            {
                action: "Verify GitHub Proof (85/100)",
                detail: "Unlocks Proof-Verified tier",
                overrides: { github_verified_score: 85 },
            },
            {
                action: "Pass ATS Resume Scan (85%)",
                detail: "Unlocks Resume Evidence",
                overrides: { ats_score: 85 },
            },
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

    const runGitHubVerify = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const cleaned = githubInput.trim();
        if (!cleaned) {
            setGhError("Enter a GitHub username (e.g. octocat) or repository URL.");
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

    const topLangLabels = useMemo(
        () => (ghResult?.topLanguages || []).map(toLangName).filter(Boolean),
        [ghResult]
    );

    const skillCrossCheck = useMemo(() => {
        if (!ghResult) return { proven: [] as string[], unproven: [] as string[] };
        const langs = topLangLabels.map((l) => l.toLowerCase());
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
    }, [ghResult, baseSkills, topLangLabels]);

    return (
        <div className="space-y-6">
            {/* Header Card — Titanium Monochrome */}
            <div className="pf-titanium-card rounded-2xl border border-white/[0.08] bg-[#09090B]/90 p-6 backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#A1A1AA]">
                            Explainable ML · Counterfactual Lab &amp; Proof of Work
                        </span>
                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#FAFAFA] sm:text-2xl">
                            What-If ML Simulator &amp; GitHub Proof Verifier
                        </h2>
                        <p className="mt-1.5 text-sm text-[#A1A1AA]">
                            Adjust sliders to simulate live Random Forest placement probability changes, rank your
                            fastest path past the 75% Tier-1 cutoff, and verify claimed resume skills against real GitHub code.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetSliders}
                        className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-white/25 hover:bg-white/[0.08]"
                    >
                        Reset to My Profile
                    </button>
                </div>
            </div>

            {/* Main 2-Column Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* LEFT COLUMN: Interactive What-If ML Simulator */}
                <div className="pf-titanium-card space-y-5 rounded-2xl border border-white/[0.08] bg-[#09090B]/90 p-6 backdrop-blur-md lg:col-span-7">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A92]">
                                Live Simulated Placement Probability
                            </p>
                            <div className="mt-1.5 flex items-baseline gap-3">
                                <span className="text-4xl font-semibold tabular-nums tracking-tight text-[#FAFAFA]">
                                    {liveChance.toFixed(1)}%
                                </span>
                                <span
                                    className={`rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${deltaFromBase > 0
                                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                            : deltaFromBase < 0
                                                ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                                                : "border-white/10 bg-white/[0.04] text-[#A1A1AA]"
                                        }`}
                                >
                                    {deltaFromBase > 0 ? `+${deltaFromBase.toFixed(1)}%` : `${deltaFromBase.toFixed(1)}%`} vs current
                                </span>
                            </div>
                            <p className="mt-1.5 text-xs text-[#8A8A92]">
                                {simLoading
                                    ? "Recalculating on Random Forest ML engine..."
                                    : simResult?.label || "Random Forest ML Engine"}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={runCounterfactualOptimizer}
                            disabled={optimizing}
                            className="pf-btn-primary inline-flex h-10 items-center rounded-xl bg-[#FAFAFA] px-4 text-xs font-semibold text-[#09090B] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {optimizing ? "Running ML Scenarios..." : "Find Fastest Path to 75%+"}
                        </button>
                    </div>

                    {/* Monochrome Titanium Progress Bar with 75% Tier-1 Marker */}
                    <div>
                        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-[#8A8A92]">
                            <span>0%</span>
                            <span className="text-[#D4D4D8]">Tier-1 Cutoff · 75%</span>
                            <span>100%</span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                            <div
                                className="h-full rounded-full bg-[#FAFAFA] transition-all duration-300"
                                style={{ width: `${liveChance}%` }}
                            />
                            <div
                                className="absolute top-0 h-full w-0.5 bg-white/60"
                                style={{ left: "75%" }}
                                title="Tier-1 Cutoff (75%)"
                            />
                        </div>
                    </div>

                    {simError && (
                        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                            {simError}
                        </p>
                    )}

                    {/* Interactive Sliders Grid */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        {[
                            { label: "CGPA", value: cgpa, display: cgpa.toFixed(1), min: 5.0, max: 10.0, step: 0.1, onChange: setCgpa },
                            { label: "Coding Index (DSA)", value: coding, display: `${coding.toFixed(1)} / 10`, min: 1.0, max: 10.0, step: 0.1, onChange: setCoding },
                            { label: "Communication & Viva", value: communication, display: `${communication.toFixed(1)} / 10`, min: 1.0, max: 10.0, step: 0.1, onChange: setCommunication },
                            { label: "Internships", value: internships, display: String(internships), min: 0, max: 5, step: 1, onChange: setInternships },
                            { label: "Deployed Projects", value: projectsCount, display: String(projectsCount), min: 0, max: 10, step: 1, onChange: setProjectsCount },
                            { label: "Active Backlogs", value: backlogs, display: String(backlogs), min: 0, max: 5, step: 1, onChange: setBacklogs },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                            >
                                <div className="mb-2 flex items-center justify-between text-xs">
                                    <span className="font-medium text-[#A1A1AA]">{item.label}</span>
                                    <span className="font-mono font-semibold tabular-nums text-[#FAFAFA]">{item.display}</span>
                                </div>
                                <input
                                    type="range"
                                    min={item.min}
                                    max={item.max}
                                    step={item.step}
                                    value={item.value}
                                    onChange={(e) => item.onChange(Number(e.target.value))}
                                    className="h-1.5 w-full cursor-pointer accent-white"
                                />
                            </div>
                        ))}
                    </div>

                    {/* High-Impact Skill Toggles */}
                    <div>
                        <p className="mb-2.5 text-xs font-medium text-[#8A8A92]">
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
                                        className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${alreadyInProfile
                                                ? "border-white/20 bg-white/[0.08] text-[#D4D4D8] opacity-80"
                                                : active
                                                    ? "border-[#FAFAFA] bg-[#FAFAFA] text-[#09090B]"
                                                    : "border-white/[0.1] bg-white/[0.02] text-[#A1A1AA] hover:border-white/25 hover:text-[#FAFAFA]"
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
                        <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-4">
                            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#A1A1AA]">
                                ML Sensitivity Ranking — Highest ROI Actions
                            </p>
                            <div className="mt-3 space-y-2">
                                {counterfactuals.map((cf, idx) => (
                                    <div
                                        key={cf.action}
                                        className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#09090B]/90 px-3.5 py-2.5 text-xs"
                                    >
                                        <div>
                                            <span className="mr-2 font-mono text-[#8A8A92]">0{idx + 1}</span>
                                            <span className="font-medium text-[#FAFAFA]">{cf.action}</span>
                                            <span className="ml-2 text-[#8A8A92]">({cf.detail})</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono tabular-nums">
                                            <span className="text-[#A1A1AA]">{cf.newChance.toFixed(1)}%</span>
                                            <span
                                                className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${cf.delta > 0
                                                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                                        : "border-white/10 bg-white/[0.04] text-[#8A8A92]"
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
                <div className="pf-titanium-card space-y-5 rounded-2xl border border-white/[0.08] bg-[#09090B]/90 p-6 backdrop-blur-md lg:col-span-5">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A92]">
                            Anti-Fake-Resume Proof Check
                        </p>
                        <h3 className="mt-1.5 text-lg font-semibold text-[#FAFAFA]">
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
                            placeholder="e.g. octocat or repo URL"
                            className="w-full rounded-xl border border-white/[0.12] bg-black/60 px-3.5 py-2.5 text-xs text-[#FAFAFA] placeholder-[#71717A] focus:border-white/35 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={ghLoading}
                            className="shrink-0 rounded-xl bg-[#FAFAFA] px-4 py-2.5 text-xs font-semibold text-[#09090B] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {ghLoading ? "Auditing..." : "Verify"}
                        </button>
                    </form>

                    {ghError && (
                        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                            {ghError}
                        </p>
                    )}

                    {ghResult ? (
                        <div className="space-y-4">
                            {/* Score & Verdict Card */}
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
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
                                        <span className="text-2xl font-semibold tabular-nums text-[#FAFAFA]">
                                            {ghResult.authenticityScore}
                                        </span>
                                        <span className="text-xs text-[#8A8A92]">/100</span>
                                        <div>
                                            <span
                                                className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${ghResult.isVerified
                                                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                                        : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                                                    }`}
                                            >
                                                {ghResult.isVerified ? "PROOF VERIFIED" : "PROOF NEEDED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs leading-relaxed text-[#D4D4D8]">{ghResult.verdict}</p>

                                {topLangLabels.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {topLangLabels.map((label, idx) => (
                                            <span
                                                key={`${label}-${idx}`}
                                                className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Repo Engineering Signals */}
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
                                                    ? "border-white/20 bg-white/[0.06] text-[#FAFAFA]"
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
                                <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A92]">
                                        Resume vs. GitHub Code Audit
                                    </p>
                                    {skillCrossCheck.proven.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-medium text-emerald-300">
                                                Proven in Public Code ({skillCrossCheck.proven.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {skillCrossCheck.proven.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300"
                                                    >
                                                        ✓ {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {skillCrossCheck.unproven.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-medium text-amber-300">
                                                Claimed on Resume — No Repo Evidence Yet ({skillCrossCheck.unproven.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {skillCrossCheck.unproven.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300"
                                                    >
                                                        ! {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {onAskCoach && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onAskCoach(
                                            `Grill me like an SDE-1 interviewer on my GitHub ${ghResult.repoFullName || ghResult.username
                                            } (Authenticity ${ghResult.authenticityScore}/100, languages: ${topLangLabels.join(
                                                ", "
                                            )}). Ask 1 tough architecture question first.`
                                        )
                                    }
                                    className="w-full rounded-xl border border-white/[0.14] bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-[#FAFAFA] transition-colors hover:border-white/30 hover:bg-white/[0.1]"
                                >
                                    Grill Me on This Repo (AI Coach)
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6 text-center">
                            <p className="text-xs font-medium text-[#D4D4D8]">
                                Ready to verify live GitHub repositories
                            </p>
                            <p className="mt-1 text-[11px] text-[#8A8A92]">
                                Try entering <span className="font-mono text-[#FAFAFA]">octocat</span> or a full
                                repository URL to test live code authenticity scoring.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatIfGitHubSimulator;