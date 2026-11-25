import React, { useEffect, useState } from "react";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Key,
  LayoutTemplate,
  Loader2,
  FileCheck,
  Building,
  Award,
  Wrench,
  ShieldAlert,
  ArrowRight,
  Target,
} from "lucide-react";

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
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleTriggerAnalysis = () => {
    onAnalyze(selectedFile, rawText);
  };

  const handleSyncToProfile = () => {
    if (!feedback || !onApplyResumeSkills) return;
    const syncPool = Array.from(
      new Set([
        ...(feedback.missing_skills || []),
        ...(feedback.ats_keywords || []),
      ].filter(Boolean))
    ).slice(0, 12);
    if (syncPool.length === 0) return;
    onApplyResumeSkills(syncPool);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const companyMatches = feedback?.company_matches || [];
  const activeCompanyMatch =
    companyMatches.find((c) => c.company === selectedCompanyName) || companyMatches[0] || null;

  const scoreTone =
    !feedback
      ? "border-white/20 text-[#f8fafc]"
      : feedback.score >= 76
      ? "border-[#242429] text-[#f8fafc]"
      : feedback.score >= 55
      ? "border-[#242429] text-[#f8fafc]"
      : "border-[#242429] text-[#f8fafc]";

  const tierTone =
    !feedback
      ? "border-white/15 bg-[#000000] text-[#94a3b8]"
      : feedback.score >= 76
      ? "border-[#242429] bg-[#18181B] text-[#f8fafc]"
      : feedback.score >= 55
      ? "border-[#242429] bg-[#18181B] text-[#f8fafc]"
      : "border-[#242429] bg-[#18181B] text-[#f8fafc]";

  return (
    <div className="space-y-6">
      {/* Upload & Input Section */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#000000] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#000000] text-[#f8fafc] shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-[#f8fafc]">
                    Senior Enterprise &amp; Deloitte ATS Audit Studio
                  </h2>
                  <span className="rounded-full border border-[#242429] bg-[#000000] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f8fafc]">
                    Uninflated Hiring Manager Review
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  Upload your PDF resume or paste project bullets for an honest Senior Deloitte / Big-Tech screening audit: missing enterprise skills, certifications, beyond-Streamlit project upgrades, and Google X-Y-Z rewrites.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* PDF File Drag/Upload Area */}
            <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#000000] p-6 text-center transition-all duration-300 hover:border-white/35">
              <label className="flex w-full cursor-pointer flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-[#000000] text-[#f8fafc] transition-transform group-hover:scale-110">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="mt-3 text-xs font-bold text-[#f8fafc]">
                  {selectedFile ? selectedFile.name : "Click to browse or drop PDF resume"}
                </span>
                <span className="mt-1 text-[11px] text-[#94a3b8]">
                  PDF format · Selectable text · Up to 50MB
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="my-3 inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-[#000000] px-5 py-2.5 text-xs font-bold text-[#f8fafc] shadow-md transition-all hover:bg-[#000000] hover:border-white/45 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Select PDF Resume</span>
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
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#000000] px-3 py-1 text-[11px] font-medium text-[#f8fafc] shadow-sm">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Ready for Senior Hiring Manager Scan</span>
                </div>
              )}
            </div>

            {/* Text Paste Box */}
            <div className="space-y-2">
              <label htmlFor="resume-raw-text-input" className="text-xs font-semibold text-[#94a3b8]">
                Or paste full resume text / skills &amp; project bullets
              </label>
              <textarea
                id="resume-raw-text-input"
                name="resumeRawText"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                data-agent-id="resume-text-input"
                placeholder="Paste your resume text (Education, Skills, Projects, Certifications, Experience) here..."
                rows={6}
                className="w-full rounded-2xl border border-white/10 bg-[#000000] p-3.5 text-xs text-[#f8fafc] outline-none transition-all placeholder:text-[#94a3b8]/60 focus:border-white/35 focus:ring-1 focus:ring-white/15"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleTriggerAnalysis}
              data-agent-id="analyze-resume-btn"
              disabled={isLoading || (!selectedFile && !rawText.trim())}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-[#000000] px-6 py-3 text-xs font-bold text-[#f8fafc] shadow-md transition-all hover:bg-[#000000] hover:border-white/45 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Running Senior Deloitte &amp; Big-Tech Audit...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Tailored ATS Feedback</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Empty Pre-Upload State — Never Fake Scores! */}
      {!feedback && (
        <div
          data-agent-id="resume-awaiting-scan"
          className="rounded-xl border border-white/10 bg-[#000000] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#242429] bg-[#000000] text-[#f8fafc]">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#f8fafc]">
                  Awaiting Your Resume — Zero-Fluff Senior Hiring Manager Audit
                </h3>
                <span className="rounded-full border border-white/15 bg-[#000000] px-2.5 py-0.5 text-[10px] font-semibold text-[#94a3b8]">
                  No Mock Scores Shown Until You Scan
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Upload your actual PDF or paste your resume above. You will receive an uninflated score (0-100) benchmarked against Deloitte Technology Consulting, Amazon, Google, Microsoft, TCS Digital / Infosys, and AI Startups — including exact missing enterprise skills, high-ROI certifications, concrete project upgrades beyond basic Streamlit notebooks, and Google X-Y-Z bullet rewrites.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Authentic Diagnostic Results */}
      {feedback && (
        <div
          data-agent-id="resume-audit-results"
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[#000000] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        >
          <div className="relative z-10 space-y-6">
            {/* Top Score & Action Row */}
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div
                  data-agent-id="resume-score-dial"
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border bg-[#000000] shadow-sm ${scoreTone}`}
                >
                  <span className="text-2xl font-black leading-none">{feedback.score}</span>
                  <span className="mt-0.5 text-[9px] font-semibold text-[#94a3b8]">/100</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      ATS Baseline Match
                    </span>
                    <span
                      data-agent-id="resume-tier-badge"
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tierTone}`}
                    >
                      {feedback.recruiter_readiness_tier ||
                        (feedback.score >= 76
                          ? "Tier-1 Interview Ready"
                          : feedback.score >= 55
                          ? "Developing / Needs Stronger Stack"
                          : "Major Overhaul Needed")}
                    </span>
                    {feedback.evaluation_source && (
                      <span className="rounded-full border border-white/10 bg-[#000000] px-2.5 py-0.5 text-[10px] font-medium text-[#94a3b8]">
                        {feedback.evaluation_source}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#f8fafc] leading-snug">
                    {feedback.verdict}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                {onApplyResumeSkills && (
                  <button
                    type="button"
                    onClick={handleSyncToProfile}
                    className="flex items-center gap-2 rounded-xl border border-white/25 bg-[#000000] px-4 py-2.5 text-xs font-bold text-[#f8fafc] transition-all hover:bg-[#000000] hover:border-white/45 active:scale-95 shadow-sm cursor-pointer"
                  >
                    {applied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Skills Synced to Profile!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Sync Missing Skills to Profile</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onDownloadFeedbackPDF}
                  data-agent-id="download-resume-pdf-btn"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#000000] px-4 py-2.5 text-xs font-semibold text-[#f8fafc] transition-all hover:bg-[#000000] hover:border-white/30 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#f8fafc]" />
                  <span>Download Feedback PDF</span>
                </button>
              </div>
            </div>

            {/* Candid Senior Deloitte / Hiring Manager Critique + 5-Axis Breakdown */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 rounded-2xl border border-white/15 bg-[#000000] p-5 space-y-3">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <ShieldAlert className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Senior Deloitte &amp; Big-Tech Manager Critique
                  </h4>
                </div>
                <p
                  data-agent-id="manager-critique-text"
                  className="text-xs text-[#e2e8f0] leading-relaxed"
                >
                  {feedback.manager_critique || feedback.verdict}
                </p>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-semibold text-[#94a3b8]">Detected Stack:</span>
                    {(feedback.detected_skills && feedback.detected_skills.length > 0
                      ? feedback.detected_skills
                      : ["None / Thin Core Stack"]
                    ).map((sk, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-white/10 bg-[#000000] px-2 py-0.5 font-medium text-[#f8fafc]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                  {feedback.detected_projects && feedback.detected_projects.length > 0 && (
                    <div className="text-[11px] text-[#94a3b8]">
                      <span className="font-semibold text-[#cbd5e1]">Detected Projects: </span>
                      {feedback.detected_projects.join(" · ")}
                    </div>
                  )}
                </div>
              </div>

              {feedback.breakdown && (
                <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#000000] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Rubric Breakdown
                  </h4>
                  <div className="space-y-2.5">
                    {SCORE_BAR_LABELS.map(({ key, label }) => {
                      const val = feedback.breakdown?.[key] ?? 0;
                      const barColor =
                        val >= 75 ? "bg-[#18181B]" : val >= 50 ? "bg-[#18181B]" : "bg-[#18181B]";
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#94a3b8]">{label}</span>
                            <span className="font-bold text-[#f8fafc]">{val}/100</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
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

            {/* Company Target ATS Benchmarker (Deloitte + Big Tech + Startups) */}
            {companyMatches.length > 0 && activeCompanyMatch && (
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-[#f8fafc]" />
                    <span className="text-xs font-bold text-[#f8fafc]">
                      Target Recruiter ATS Match Index:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {companyMatches.map((cm) => (
                      <button
                        key={cm.company}
                        type="button"
                        onClick={() => setSelectedCompanyName(cm.company)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                          activeCompanyMatch.company === cm.company
                            ? "border border-white/40 bg-[#000000] text-white shadow-sm"
                            : "border border-white/10 bg-[#000000] text-[#94a3b8] hover:text-white"
                        }`}
                      >
                        {cm.company} ({cm.match_score}%)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 border-t border-white/10 pt-3 md:grid-cols-2">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#94a3b8]">Recruiter Cutoff:</span>
                      <span className="font-bold text-[#f8fafc]">
                        {activeCompanyMatch.cutoff_score}/100
                      </span>
                      <span className="text-[#94a3b8]">· Your Resume Match:</span>
                      <span
                        data-agent-id="company-match-score"
                        className={`font-black ${
                          activeCompanyMatch.match_score >= activeCompanyMatch.cutoff_score
                            ? "text-[#f8fafc]"
                            : activeCompanyMatch.match_score >= 45
                            ? "text-[#f8fafc]"
                            : "text-[#f8fafc]"
                        }`}
                      >
                        {activeCompanyMatch.match_score}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#cbd5e1]">{activeCompanyMatch.verdict}</p>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#f8fafc] font-semibold">Matched:</span>
                      {activeCompanyMatch.matched_keywords.length > 0 ? (
                        activeCompanyMatch.matched_keywords.map((k, i) => (
                          <span
                            key={i}
                            className="rounded border border-[#242429] bg-[#18181B] px-1.5 py-0.5 text-[#f8fafc]"
                          >
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#94a3b8]">None matched yet</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#f8fafc] font-semibold">
                        Missing for {activeCompanyMatch.company}:
                      </span>
                      {activeCompanyMatch.missing_keywords.length > 0 ? (
                        activeCompanyMatch.missing_keywords.map((k, i) => (
                          <span
                            key={i}
                            className="rounded border border-[#242429] bg-[#18181B] px-1.5 py-0.5 text-[#f8fafc]"
                          >
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#f8fafc]">All core keywords covered</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Critical Improvements & Missing Enterprise Skills */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <AlertTriangle className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Critical Hiring Blockers &amp; Improvements
                  </h4>
                </div>
                <ul data-agent-id="critical-improvements-list" className="mt-3 space-y-2">
                  {(feedback.improvements || []).map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#f8fafc] leading-relaxed">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/15 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <Key className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Missing Enterprise Skills (Add to Resume)
                  </h4>
                </div>
                <div data-agent-id="missing-skills-list" className="mt-3 flex flex-wrap gap-2">
                  {(feedback.missing_skills || []).map((sk, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-[#242429] bg-[#000000] px-2.5 py-1 text-xs font-medium text-[#f8fafc]"
                    >
                      + {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Certifications & Beyond-Streamlit Project Upgrades */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <Award className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Recommended Certifications (Deloitte &amp; Tier-1)
                  </h4>
                </div>
                <ul data-agent-id="recommended-certifications-list" className="mt-3 space-y-2">
                  {(feedback.recommended_certifications || []).map((cert, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#e2e8f0] leading-relaxed">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{cert}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <Wrench className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Project Upgrade Blueprint (Beyond Basic Streamlit)
                  </h4>
                </div>
                <ul data-agent-id="project-upgrade-list" className="mt-3 space-y-2">
                  {(feedback.project_upgrade_plan || feedback.project_suggestions || []).map((up, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#e2e8f0] leading-relaxed">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{up}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Google X-Y-Z Bullet Rewrites */}
            {feedback.rewritten_bullets && feedback.rewritten_bullets.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5 space-y-3">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Google X-Y-Z Resume Bullet Upgrades (Before vs After)
                  </h4>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {feedback.rewritten_bullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-[#000000] p-3.5 space-y-2 text-xs"
                    >
                      <div className="text-[#94a3b8]">
                        <span className="font-bold text-[#f8fafc]">Before: </span>
                        {item.before}
                      </div>
                      <div className="flex items-start gap-1.5 text-[#f8fafc]">
                        <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#f8fafc]" />
                        <span>
                          <span className="font-bold text-[#f8fafc]">After: </span>
                          {item.after}
                        </span>
                      </div>
                      {item.reason && (
                        <div className="text-[11px] text-[#94a3b8] border-t border-white/5 pt-1.5">
                          Why it works: {item.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths, ATS Keywords, & Formatting Guidelines */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#f8fafc]">
                  <CheckCircle2 className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Candidate Strengths
                  </h4>
                </div>
                <ul data-agent-id="candidate-strengths-list" className="mt-3 space-y-2">
                  {(feedback.strengths || []).map((str, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#e2e8f0] leading-relaxed">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#94a3b8]">
                  <Key className="h-4 w-4 text-[#f8fafc]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Recommended ATS Keywords
                  </h4>
                </div>
                <div data-agent-id="ats-keywords-list" className="mt-3 flex flex-wrap gap-2">
                  {(feedback.ats_keywords || []).map((kw, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-white/10 bg-[#000000] px-2.5 py-1 text-xs font-medium text-[#f8fafc] shadow-sm"
                    >
                      +{kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#000000] p-5">
                <div className="flex items-center gap-2 text-[#94a3b8]">
                  <LayoutTemplate className="h-4 w-4 text-[#f8fafc]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#f8fafc]">
                    Structural &amp; Formatting Guidelines
                  </h4>
                </div>
                <ul data-agent-id="formatting-guidelines-list" className="mt-3 space-y-2">
                  {(feedback.formatting_tips || []).map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#94a3b8] leading-relaxed">
                      <span className="text-[#f8fafc] font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
