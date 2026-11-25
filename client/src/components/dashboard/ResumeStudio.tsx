import React, { useEffect, useState } from "react";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

export interface ResumeScoreBreakdown {
  impact: number;
  skills_match: number;
  projects: number;
  education: number;
  formatting: number;
}

export interface BulletRewriteItem {
  before: string;
  after: string;
  reason?: string;
}

export interface CompanyMatchItem {
  company: string;
  cutoff_score: number;
  match_score: number;
  verdict: string;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface ResumeFeedbackData {
  score: number;
  recruiter_readiness_tier?: string;
  verdict: string;
  manager_critique?: string;
  breakdown?: ResumeScoreBreakdown;
  detected_skills?: string[];
  detected_projects?: string[];
  strengths: string[];
  improvements: string[];
  missing_skills?: string[];
  recommended_certifications?: string[];
  project_upgrade_plan?: string[];
  ats_keywords: string[];
  missing_keywords?: string[];
  formatting_tips: string[];
  rewritten_bullets?: BulletRewriteItem[];
  action_plan?: string[];
  project_suggestions?: string[];
  company_matches?: CompanyMatchItem[];
  evaluation_source?: string;
}

interface ResumeStudioProps {
  feedback: ResumeFeedbackData | null;
  onAnalyze: (file: File | null, text: string) => void;
  isLoading: boolean;
  onDownloadFeedbackPDF: () => void;
  onApplyResumeSkills?: (skills: string[]) => void;
}

const SCORE_BAR_LABELS: Array<{ key: keyof ResumeScoreBreakdown; label: string }> = [
  { key: "impact", label: "Quantified Impact & Metrics" },
  { key: "skills_match", label: "Enterprise Stack Match" },
  { key: "projects", label: "Production Project Depth" },
  { key: "education", label: "CS Core & Certifications" },
  { key: "formatting", label: "ATS Formatting Hygiene" },
];

export const ResumeStudio: React.FC<ResumeStudioProps> = ({
  feedback,
  onAnalyze,
  isLoading,
  onDownloadFeedbackPDF,
  onApplyResumeSkills,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("Deloitte");
  const [applied, setApplied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (feedback?.company_matches && feedback.company_matches.length > 0) {
      const hasCurrent = feedback.company_matches.some((c) => c.company === selectedCompanyName);
      if (!hasCurrent) {
        setSelectedCompanyName(feedback.company_matches[0].company);
      }
    }
  }, [feedback, selectedCompanyName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerAnalysis = () => {
    onAnalyze(selectedFile, rawText);
  };

  const handleSyncToProfile = () => {
    if (!feedback || !onApplyResumeSkills) return;
    const syncPool = Array.from(
      new Set(
        [...(feedback.missing_skills || []), ...(feedback.ats_keywords || [])].filter(Boolean)
      )
    ).slice(0, 12);
    if (syncPool.length === 0) return;
    onApplyResumeSkills(syncPool);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const companyMatches = feedback?.company_matches || [];
  const activeCompanyMatch =
    companyMatches.find((c) => c.company === selectedCompanyName) || companyMatches[0] || null;

  return (
    <div className="space-y-10">
      {/* Upload & Input Section */}
      <SpotlightSurface className="rounded-2xl p-8 sm:p-10">
        <div className="border-b border-white/[0.08] pb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
              Uninflated Review
            </span>
          </div>
          <h2
            className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-[28px]"
            style={{ textWrap: "balance" }}
          >
            ATS Resume Studio &amp; Diagnostic Scanner
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm">
            Upload your PDF resume or paste project bullets for an uninflated screening audit:
            missing enterprise skills, certifications, project upgrades, and Google X-Y-Z rewrites.
          </p>
        </div>

        <div className="mt-7 grid gap-8 md:grid-cols-2 lg:gap-10">
          {/* Clean PDF Dropzone (Zero Icons) */}
          <div className="pf-subpanel flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.18] p-8 text-center transition-colors hover:border-white/[0.34]">
            <label className="flex w-full cursor-pointer flex-col items-center">
              <span className="text-sm font-medium text-[#FAFAFA]">
                {selectedFile ? selectedFile.name : "Drop PDF resume here or browse"}
              </span>
              <span className="mt-1.5 font-mono text-[11px] text-[#71717A]">
                PDF format · Selectable text · Up to 50MB
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="pf-btn-secondary mt-5 inline-flex h-10 items-center justify-center rounded-xl px-5 text-xs font-medium active:scale-[0.98] cursor-pointer"
              >
                Select PDF Resume
              </button>

              <input
                id="resume-pdf-upload"
                name="resumePdfUpload"
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <div className="mt-4 rounded-md border border-white/[0.1] bg-[#141418] px-3 py-1 font-mono text-[11px] text-[#D4D4D8]">
                Ready for Hiring Manager Scan
              </div>
            )}
          </div>

          {/* Clean Text Paste Box */}
          <div className="space-y-2.5">
            <label
              htmlFor="resume-raw-text-input"
              className="block text-xs font-medium text-[#D4D4D8]"
            >
              Or paste resume text / skills &amp; project bullets
            </label>
            <textarea
              id="resume-raw-text-input"
              name="resumeRawText"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              data-agent-id="resume-text-input"
              placeholder="Paste your resume text (Education, Skills, Projects, Certifications, Experience) here..."
              rows={7}
              className="pf-input w-full rounded-xl p-4 text-xs leading-relaxed text-[#FAFAFA] placeholder-[#52525B]"
            />
          </div>
        </div>

        <div className="mt-7 flex justify-end">
          <button
            onClick={handleTriggerAnalysis}
            data-agent-id="analyze-resume-btn"
            disabled={isLoading || (!selectedFile && !rawText.trim())}
            className="pf-btn-primary inline-flex h-11 items-center justify-center rounded-xl px-6 text-xs font-medium active:scale-[0.98] disabled:opacity-45 cursor-pointer"
          >
            {isLoading ? "Running Hiring Manager Audit..." : "Generate Tailored ATS Feedback"}
          </button>
        </div>
      </SpotlightSurface>

      {/* Empty Pre-Upload State */}
      {!feedback && (
        <div
          data-agent-id="resume-awaiting-scan"
          className="pf-titanium-card rounded-2xl p-8 sm:p-10"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-[#FAFAFA] sm:text-base">
              Awaiting Your Resume — Zero-Fluff Senior Hiring Manager Audit
            </h3>
            <span className="rounded-md border border-white/[0.1] bg-[#121216] px-2.5 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
              No mock scores shown until scan
            </span>
          </div>
          <p className="mt-2.5 max-w-3xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm">
            Upload your actual PDF or paste your resume above to receive an uninflated score (0-100)
            benchmarked against Deloitte, Amazon, Google, Microsoft, TCS Digital, and AI startups —
            including missing enterprise skills, certifications, and Google X-Y-Z bullet rewrites.
          </p>
        </div>
      )}

      {/* Diagnostic Results */}
      {feedback && (
        <div
          data-agent-id="resume-audit-results"
          className="pf-titanium-card space-y-9 rounded-2xl p-8 sm:p-10"
        >
          {/* Top Score & Action Row */}
          <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div
                data-agent-id="resume-score-dial"
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-[#27272A] bg-[#101014]"
              >
                <span className="font-mono text-2xl font-semibold leading-none text-[#FAFAFA] tabular-nums">
                  {feedback.score}
                </span>
                <span className="mt-1 font-mono text-[9px] text-[#71717A] tabular-nums">/100</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-[#A1A1AA]">ATS Baseline Match</span>
                  <span
                    data-agent-id="resume-tier-badge"
                    className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 text-[10px] font-medium text-[#FAFAFA]"
                  >
                    {feedback.recruiter_readiness_tier ||
                      (feedback.score >= 76
                        ? "Tier-1 Interview Ready"
                        : feedback.score >= 55
                          ? "Developing / Needs Stronger Stack"
                          : "Major Overhaul Needed")}
                  </span>
                  {feedback.evaluation_source && (
                    <span className="rounded border border-[#222226] bg-[#0C0C0E] px-2 py-0.5 font-mono text-[10px] text-[#71717A]">
                      {feedback.evaluation_source}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium leading-snug text-[#FAFAFA]">
                  {feedback.verdict}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {onApplyResumeSkills && (
                <button
                  type="button"
                  onClick={handleSyncToProfile}
                  className="inline-flex h-10 items-center rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] active:scale-[0.98] cursor-pointer"
                >
                  {applied ? "Skills synced to profile" : "Sync missing skills to profile"}
                </button>
              )}

              <button
                type="button"
                onClick={onDownloadFeedbackPDF}
                data-agent-id="download-resume-pdf-btn"
                className="inline-flex h-10 items-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors hover:bg-[#E4E4E7] cursor-pointer"
              >
                Download Feedback PDF
              </button>
            </div>
          </div>

          {/* Critique + Rubric Breakdown */}
          <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
            <div className="space-y-4 rounded-xl border border-[#222226] bg-[#101014] p-6 lg:col-span-3">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Senior Deloitte &amp; Big-Tech Manager Critique
              </h4>
              <p
                data-agent-id="manager-critique-text"
                className="text-xs leading-relaxed text-[#D4D4D8]"
              >
                {feedback.manager_critique || feedback.verdict}
              </p>

              <div className="space-y-2 border-t border-[#1F1F23] pt-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-medium text-[#A1A1AA]">Detected Stack:</span>
                  {(feedback.detected_skills && feedback.detected_skills.length > 0
                    ? feedback.detected_skills
                    : ["None / Thin Core Stack"]
                  ).map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded border border-[#27272A] bg-[#0B0B0E] px-2 py-0.5 font-medium text-[#FAFAFA]"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
                {feedback.detected_projects && feedback.detected_projects.length > 0 && (
                  <div className="text-[11px] text-[#A1A1AA]">
                    <span className="font-medium text-[#D4D4D8]">Detected Projects: </span>
                    {feedback.detected_projects.join(" · ")}
                  </div>
                )}
              </div>
            </div>

            {feedback.breakdown && (
              <div className="space-y-4 rounded-xl border border-[#222226] bg-[#101014] p-6 lg:col-span-2">
                <h4 className="text-xs font-semibold text-[#FAFAFA]">Rubric Breakdown</h4>
                <div className="space-y-3">
                  {SCORE_BAR_LABELS.map(({ key, label }) => {
                    const val = feedback.breakdown?.[key] ?? 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#A1A1AA]">{label}</span>
                          <span className="font-mono font-medium text-[#FAFAFA] tabular-nums">
                            {val}/100
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-sm bg-[#18181B]">
                          <div
                            className="h-full bg-[#FAFAFA] transition-[width] duration-500"
                            style={{ width: `${Math.max(4, Math.min(100, val))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Company Target ATS Benchmarker */}
          {companyMatches.length > 0 && activeCompanyMatch && (
            <div className="space-y-4 rounded-xl border border-[#222226] bg-[#101014] p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <span className="text-xs font-semibold text-[#FAFAFA]">
                  Target Recruiter ATS Match Index
                </span>
                <div className="flex flex-wrap gap-2">
                  {companyMatches.map((cm) => (
                    <button
                      key={cm.company}
                      type="button"
                      onClick={() => setSelectedCompanyName(cm.company)}
                      className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${activeCompanyMatch.company === cm.company
                        ? "border-[#FAFAFA]/45 bg-[#18181E] text-[#FAFAFA]"
                        : "border-[#222226] bg-[#0B0B0E] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#FAFAFA]"
                        }`}
                    >
                      {cm.company} ({cm.match_score}%)
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 border-t border-[#1F1F23] pt-4 md:grid-cols-2">
                <div className="space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#A1A1AA]">Recruiter Cutoff:</span>
                    <span className="font-mono font-semibold text-[#FAFAFA] tabular-nums">
                      {activeCompanyMatch.cutoff_score}/100
                    </span>
                    <span className="text-[#71717A]">·</span>
                    <span className="text-[#A1A1AA]">Your Resume Match:</span>
                    <span
                      data-agent-id="company-match-score"
                      className="font-mono font-semibold text-[#FAFAFA] tabular-nums"
                    >
                      {activeCompanyMatch.match_score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#D4D4D8]">{activeCompanyMatch.verdict}</p>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-[#FAFAFA]">Matched:</span>
                    {activeCompanyMatch.matched_keywords.length > 0 ? (
                      activeCompanyMatch.matched_keywords.map((k, i) => (
                        <span
                          key={i}
                          className="rounded border border-[#3F3F46] bg-[#141418] px-2 py-0.5 text-[#FAFAFA]"
                        >
                          {k}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#71717A]">None matched yet</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-[#FAFAFA]">
                      Missing for {activeCompanyMatch.company}:
                    </span>
                    {activeCompanyMatch.missing_keywords.length > 0 ? (
                      activeCompanyMatch.missing_keywords.map((k, i) => (
                        <span
                          key={i}
                          className="rounded border border-[#27272A] bg-[#0B0B0E] px-2 py-0.5 text-[#A1A1AA]"
                        >
                          {k}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#D4D4D8]">All core keywords covered</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Critical Improvements & Missing Enterprise Skills */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Critical Hiring Blockers &amp; Improvements
              </h4>
              <ul data-agent-id="critical-improvements-list" className="mt-3.5 space-y-2.5">
                {(feedback.improvements || []).map((imp, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#E4E4E7]">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Missing Enterprise Skills (Add to Resume)
              </h4>
              <div data-agent-id="missing-skills-list" className="mt-3.5 flex flex-wrap gap-2">
                {(feedback.missing_skills || []).map((sk, i) => (
                  <span
                    key={i}
                    className="rounded border border-[#27272A] bg-[#0B0B0E] px-2.5 py-1 text-xs font-medium text-[#D4D4D8]"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Certifications & Project Upgrades */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Recommended Certifications (Deloitte &amp; Tier-1)
              </h4>
              <ul data-agent-id="recommended-certifications-list" className="mt-3.5 space-y-2.5">
                {(feedback.recommended_certifications || []).map((cert, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#D4D4D8]">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Project Upgrade Blueprint
              </h4>
              <ul data-agent-id="project-upgrade-list" className="mt-3.5 space-y-2.5">
                {(feedback.project_upgrade_plan || feedback.project_suggestions || []).map((up, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#D4D4D8]">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{up}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Google X-Y-Z Bullet Rewrites */}
          {feedback.rewritten_bullets && feedback.rewritten_bullets.length > 0 && (
            <div className="space-y-4 rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Google X-Y-Z Resume Bullet Upgrades (Before vs After)
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {feedback.rewritten_bullets.map((item, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 rounded-lg border border-[#1F1F23] bg-[#0B0B0E] p-4 text-xs"
                  >
                    <div className="text-[#A1A1AA]">
                      <span className="font-medium text-[#FAFAFA]">Before: </span>
                      {item.before}
                    </div>
                    <div className="text-[#FAFAFA]">
                      <span className="font-medium">After: </span>
                      {item.after}
                    </div>
                    {item.reason && (
                      <div className="border-t border-[#1F1F23] pt-2 text-[11px] text-[#71717A]">
                        Why it works: {item.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths, ATS Keywords & Formatting */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">Candidate Strengths</h4>
              <ul data-agent-id="candidate-strengths-list" className="mt-3.5 space-y-2.5">
                {(feedback.strengths || []).map((str, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#D4D4D8]">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">Recommended ATS Keywords</h4>
              <div data-agent-id="ats-keywords-list" className="mt-3.5 flex flex-wrap gap-2">
                {(feedback.ats_keywords || []).map((kw, i) => (
                  <span
                    key={i}
                    className="rounded border border-[#27272A] bg-[#0B0B0E] px-2.5 py-1 text-xs font-medium text-[#FAFAFA]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#222226] bg-[#101014] p-6">
              <h4 className="text-xs font-semibold text-[#FAFAFA]">
                Structural &amp; Formatting Guidelines
              </h4>
              <ul data-agent-id="formatting-guidelines-list" className="mt-3.5 space-y-2.5">
                {(feedback.formatting_tips || []).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#A1A1AA]">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
