import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  Star,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Code2,
  Sparkles,
  Zap,
  XCircle,
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";
import { API_BASE } from "@/lib/apiClient";

export interface GitHubAuditResult {
  mode: "repo" | "profile";
  username: string;
  repoName?: string;
  repoFullName?: string;
  repoUrl?: string;
  avatarUrl: string;
  name: string;
  bio: string;
  publicRepos: number;
  originalRepos?: number;
  nontrivialRepos?: number;
  totalStars: number;
  forks?: number;
  followers: number;
  topLanguages: { name: string; percentage: number }[];
  authenticityScore: number;
  isVerified: boolean;
  verdict: string;
  accountAgeYears: number;
  strengths: string[];
  gaps: string[];
  repoMetrics?: {
    sizeKb: number;
    commitsSampled: number;
    distinctCommitDays: number;
    fileCount: number;
    readmeWords: number;
    hasTests: boolean;
    hasDocker: boolean;
    hasCi: boolean;
    hasManifest: boolean;
    isFork: boolean;
    lastPushedDaysAgo?: number | null;
    topicsCount: number;
  };
}

interface LiveSkillVerifierProps {
  currentProfile: StudentProfileState;
  onApplyVerifiedSkills?: (
    skills: string[],
    stats: { githubRepos: number; stars: number; authenticityScore?: number; targetUrl?: string }
  ) => void;
  onAuditComplete?: (score: number, data: GitHubAuditResult) => void;
}

export const LiveSkillVerifier: React.FC<LiveSkillVerifierProps> = ({
  currentProfile,
  onApplyVerifiedSkills,
  onAuditComplete,
}) => {
  const [githubInput, setGithubInput] = useState(
    currentProfile.githubUrl || currentProfile.codingProfiles?.github || ""
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<GitHubAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = githubInput.trim();
    if (!cleanInput) {
      setError("Please enter a GitHub repository URL or username (e.g. https://github.com/user/repo).");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const resp = await fetch(`${API_BASE}/api/verify-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url_or_username: cleanInput }),
      });

      const payload = await resp.json().catch(() => null);
      if (!resp.ok) {
        const msg =
          payload?.detail ||
          payload?.message ||
          `GitHub audit failed (HTTP ${resp.status}). Verify the repository or handle exists and is public.`;
        setError(msg);
        return;
      }

      if (!payload || typeof payload.authenticityScore !== "number") {
        setError("Unexpected response received from GitHub audit engine. Please retry.");
        return;
      }

      const audited = payload as GitHubAuditResult;
      setResult(audited);
      onAuditComplete?.(audited.authenticityScore, audited);
    } catch {
      setError(
        "Unable to reach the GitHub audit backend right now. Please check your connection and retry (no fake score generated)."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSyncToProfile = () => {
    if (!result || !onApplyVerifiedSkills) return;
    const extractedSkills = (result.topLanguages || []).map((l) => l.name);
    onApplyVerifiedSkills(extractedSkills, {
      githubRepos: result.publicRepos,
      stars: result.totalStars,
      authenticityScore: result.authenticityScore,
      targetUrl: result.repoUrl || (result.username ? `https://github.com/${result.username}` : undefined),
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const isStrongScore = (result?.authenticityScore ?? 0) >= 62;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#000000] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
      <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-[#ffffff]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ffffff]/30 bg-[#ffffff]/10 text-[#ffffff] shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-[#f8fafc] sm:text-2xl">
                  Live Technical Footprint &amp; Fraud Shield
                </h3>
                <span className="rounded-full border border-[#ffffff]/30 bg-[#ffffff]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffffff]">
                  Senior Engineering Audit
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#94a3b8]">
                Paste any public GitHub project URL or profile handle to run an authentic codebase inspection (size, commits, tests, README depth, Docker/CI — zero fake inflation).
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleVerify} className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#94a3b8]">
              <GitBranch className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              placeholder="Paste GitHub repo URL (https://github.com/user/project) or @username..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-3.5 pl-10 pr-4 text-xs font-medium text-[#f8fafc] outline-none transition-all placeholder:text-[#94a3b8] focus:border-[#ffffff]/60 focus:ring-1 focus:ring-[#ffffff]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || !githubInput.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#2B2024] px-6 py-3.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(124,58,237,0.3)] transition-all hover:bg-[#2B2024] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Inspecting Live Codebase...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Audit GitHub Footprint</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2B2024]/50 bg-[#2B2024]/15 p-3.5 text-xs text-[#f8fafc]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#f8fafc]" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#000000] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Repo or User Profile Header */}
              <div className="flex items-center gap-4">
                <img
                  src={result.avatarUrl}
                  alt={result.username}
                  className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-md"
                  onError={(e) => {
                    (e.target as any).src =
                      "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
                  }}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-bold text-[#f8fafc]">{result.name}</h4>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        result.isVerified
                          ? "border-[#2B2024] bg-[#2B2024] text-[#f8fafc]"
                          : "border-[#2B2024] bg-[#2B2024] text-[#f8fafc]"
                      }`}
                    >
                      {result.mode === "repo"
                        ? result.isVerified
                          ? "✓ Production-Grade Repo"
                          : "⚠ Starter / Developing Repo"
                        : result.isVerified
                        ? "✓ Verified Engineering Profile"
                        : "⚠ Early / Thin Footprint"}
                    </span>
                    {result.repoUrl && (
                      <a
                        href={result.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#94a3b8] hover:text-white"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8]">
                    @{result.username} · {result.mode === "repo" ? "Single Repository Inspection" : `${result.accountAgeYears}+ Years on GitHub`}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300 line-clamp-2">{result.bio}</p>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="flex flex-wrap items-center gap-3">
                {result.mode === "repo" && result.repoMetrics ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center min-w-[90px]">
                      <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Code Size</span>
                      <div className="text-lg font-black text-[#f8fafc]">{result.repoMetrics.sizeKb} KB</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center min-w-[95px]">
                      <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Commits</span>
                      <div className="text-lg font-black text-[#f8fafc]">
                        {result.repoMetrics.commitsSampled}
                        <span className="text-[11px] font-medium text-[#94a3b8]"> ({result.repoMetrics.distinctCommitDays}d)</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center min-w-[95px]">
                    <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Original Repos</span>
                    <div className="text-lg font-black text-[#f8fafc]">
                      {result.originalRepos ?? result.publicRepos}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-center min-w-[85px]">
                  <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Stars</span>
                  <div className="text-lg font-black text-[#ffffff] flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-[#ffffff]" />
                    <span>{result.totalStars}</span>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 text-center min-w-[115px] ${
                    isStrongScore
                      ? "border-[#2B2024] bg-[#2B2024]"
                      : "border-[#2B2024] bg-[#2B2024]"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Audit Score</span>
                  <div className={`text-lg font-black ${isStrongScore ? "text-[#f8fafc]" : "text-[#f8fafc]"}`}>
                    {result.authenticityScore}/100
                  </div>
                </div>
              </div>
            </div>

            {/* Repo Engineering Signals Strip */}
            {result.mode === "repo" && result.repoMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-white/[0.08] pt-4 text-xs">
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-[#94a3b8]">README</span>
                  <span className="font-bold text-white">{result.repoMetrics.readmeWords}w</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-[#94a3b8]">Tests</span>
                  <span className={result.repoMetrics.hasTests ? "font-bold text-[#f8fafc]" : "font-bold text-[#f8fafc]"}>
                    {result.repoMetrics.hasTests ? "Present" : "Missing"}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-[#94a3b8]">Docker</span>
                  <span className={result.repoMetrics.hasDocker ? "font-bold text-[#f8fafc]" : "font-bold text-[#f8fafc]"}>
                    {result.repoMetrics.hasDocker ? "Present" : "Missing"}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-[#94a3b8]">CI/CD</span>
                  <span className={result.repoMetrics.hasCi ? "font-bold text-[#f8fafc]" : "font-bold text-[#f8fafc]"}>
                    {result.repoMetrics.hasCi ? "Active" : "Missing"}
                  </span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between">
                  <span className="text-[#94a3b8]">Root Files</span>
                  <span className="font-bold text-white">{result.repoMetrics.fileCount}</span>
                </div>
              </div>
            )}

            {/* Language Breakdown */}
            <div className="border-t border-white/[0.08] pt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Verified Codebase Languages:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(result.topLanguages || []).length > 0 ? (
                  result.topLanguages.map((lang) => (
                    <div
                      key={lang.name}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-xs text-[#f8fafc]"
                    >
                      <Code2 className="h-3.5 w-3.5 text-[#ffffff]" />
                      <span className="font-semibold">{lang.name}</span>
                      <span className="text-[11px] text-[#94a3b8]">({lang.percentage}%)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-[#94a3b8]">No primary language metadata detected.</span>
                )}
              </div>
            </div>

            {/* Senior Engineering Strengths & Gaps */}
            <div className="grid gap-4 md:grid-cols-2 border-t border-white/[0.08] pt-4">
              <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#f8fafc]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Signals</span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {(result.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#f8fafc] mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/35 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#f8fafc]">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Hiring Manager Critique &amp; Gaps</span>
                </div>
                {(result.gaps || []).length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    {result.gaps.map((g, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <XCircle className="h-3.5 w-3.5 text-[#f8fafc] shrink-0 mt-0.5" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#94a3b8]">No major engineering hygiene blockers detected in this audit.</p>
                )}
              </div>
            </div>

            {/* Verdict & Sync */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/40 p-3.5 text-xs">
              <div className="flex items-center gap-2 text-[#f8fafc]">
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${isStrongScore ? "text-[#f8fafc]" : "text-[#f8fafc]"}`} />
                <span>
                  <strong>Audit Verdict:</strong> {result.verdict}
                </span>
              </div>

              {onApplyVerifiedSkills && (
                <button
                  type="button"
                  onClick={handleSyncToProfile}
                  className="flex items-center gap-1.5 rounded-xl bg-[#2B2024] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-[#2B2024] active:scale-95 shadow-sm cursor-pointer"
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Verified Footprint Synced!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Sync Audit &amp; Skills to Profile</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
