import React, { useState } from "react";
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
} from "lucide-react";

export interface ResumeFeedbackData {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  ats_keywords: string[];
  formatting_tips: string[];
}

interface ResumeStudioProps {
  feedback: ResumeFeedbackData | null;
  onAnalyze: (file: File | null, text: string) => void;
  isLoading: boolean;
  onDownloadFeedbackPDF: () => void;
  onApplyResumeSkills?: (skills: string[]) => void;
}

const DEFAULT_FEEDBACK: ResumeFeedbackData = {
  score: 78,
  verdict: "Strong technical foundation with measurable project work. Quantifying latency and throughput metrics will elevate ATS ranking.",
  strengths: [
    "Clean chronological structure with clear technical skills section",
    "Highlighted full-stack web and database technologies",
    "Good coverage of standard engineering coursework"
  ],
  improvements: [
    "Rewrite project bullets using the Google X-Y-Z formula (Accomplished X measured by Y doing Z)",
    "Add live deployed URLs and verified GitHub repository links",
    "Include unit testing frameworks (Jest, PyTest) and CI/CD exposure"
  ],
  ats_keywords: ["REST APIs", "Data Structures", "PostgreSQL", "Docker", "Unit Testing", "Git", "System Design"],
  formatting_tips: [
    "Use a single-column layout without complex two-column tables",
    "Keep file size under 2MB in selectable text PDF format",
    "Ensure section headers match standard ATS taxonomies"
  ]
};

const TARGET_COMPANIES = [
  { id: "amazon", name: "Amazon", reqKeywords: ["AWS", "Microservices", "Scalability", "System Design"], benchmark: 82 },
  { id: "google", name: "Google", reqKeywords: ["Algorithms", "Data Structures", "Distributed Systems", "C++"], benchmark: 88 },
  { id: "microsoft", name: "Microsoft", reqKeywords: ["Azure", "TypeScript", "CI/CD", "Testing"], benchmark: 80 },
  { id: "tcs", name: "TCS / Infosys", reqKeywords: ["Java", "SQL", "OOPs", "Agile"], benchmark: 70 },
  { id: "startup", name: "Fast-Growth AI Startup", reqKeywords: ["FastAPI", "React", "Docker", "LLMs"], benchmark: 76 }
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
  const [targetCompany, setTargetCompany] = useState(TARGET_COMPANIES[0].id);
  const [applied, setApplied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const activeFeedback = feedback || DEFAULT_FEEDBACK;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerAnalysis = () => {
    onAnalyze(selectedFile, rawText);
  };

  const handleSyncToProfile = () => {
    if (onApplyResumeSkills && activeFeedback.ats_keywords?.length) {
      onApplyResumeSkills(activeFeedback.ats_keywords);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  const activeCompanyData = TARGET_COMPANIES.find(c => c.id === targetCompany) || TARGET_COMPANIES[0];
  const companyMatchScore = Math.min(99, Math.max(30, Math.round(activeFeedback.score * (activeCompanyData.benchmark / 80))));

  return (
    <div className="space-y-6">
      {/* Upload & Input Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_15px_rgba(199, 111, 59,0.2)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-[#eae6e0]">ATS Resume Intelligence & Auto-Sync</h2>
                  <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c76f3b]">
                    Gemini Multimodal
                  </span>
                </div>
                <p className="text-xs text-[#938e87]">
                  Upload your PDF resume or paste project bullets for automated ATS scoring, company-specific match indexing, and 1-click profile synchronization.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* PDF File Drag/Upload Area */}
            <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/[0.08] bg-[#141318] p-6 text-center transition-all duration-300 hover:border-[#c76f3b]/50 hover:bg-[#c76f3b]/[0.02]">
              <label className="flex w-full cursor-pointer flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#c76f3b] transition-transform group-hover:scale-110 shadow-[0_0_20px_rgba(199, 111, 59,0.15)]">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="mt-3 text-xs font-bold text-[#eae6e0] transition-colors group-hover:text-[#c76f3b]">
                  {selectedFile ? selectedFile.name : "Click to browse or drop PDF resume"}
                </span>
                <span className="mt-1 text-[11px] text-[#938e87]">
                  PDF format · Maximum size 10MB
                </span>

                {/* Primary Crimson Upload Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="my-3 inline-flex items-center justify-center gap-2 rounded-xl bg-[#c76f3b] px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(199, 111, 59,0.35)] transition-all hover:bg-[#8c3a2e] hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Select PDF Resume</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-3 py-1 text-[11px] font-medium text-[#c76f3b] shadow-sm">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Ready for ATS Extraction</span>
                </div>
              )}
            </div>

            {/* Fallback Text Paste Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#938e87]">
                Optional: Or paste project bullets / interview draft
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste resume text or individual project bullet points here..."
                rows={5}
                className="w-full rounded-2xl border border-white/[0.08] bg-[#141318] p-3.5 text-xs text-[#eae6e0] outline-none transition-all placeholder:text-[#938e87]/60 focus:border-[#c76f3b]/60 focus:ring-1 focus:ring-[#c76f3b]/20"
              />
            </div>
          </div>

          {/* Trigger Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleTriggerAnalysis}
              disabled={isLoading || (!selectedFile && !rawText.trim())}
              className="flex items-center gap-2 rounded-xl bg-[#c76f3b] px-6 py-3 text-xs font-bold text-white shadow-[0_0_25px_rgba(199, 111, 59,0.35)] transition-all hover:bg-[#8c3a2e] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning Resume with Gemini...</span>
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

      {/* Scored Results & Diagnostic Feedback */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#1c1a22] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-[#c76f3b]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* ATS Score Dial */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c76f3b]/30 bg-[#c76f3b]/10 text-[#c76f3b] shadow-[0_0_20px_rgba(199, 111, 59,0.2)]">
                <span className="text-2xl font-black">{activeFeedback.score}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#938e87]">ATS Baseline Match</span>
                  <span className="rounded-full border border-[#c76f3b]/30 bg-[#c76f3b]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#c76f3b]">
                    {activeFeedback.score >= 75 ? "Tier-1 Ready" : "Competitive"}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-[#eae6e0]">{activeFeedback.verdict}</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {onApplyResumeSkills && (
                <button
                  type="button"
                  onClick={handleSyncToProfile}
                  className="flex items-center gap-2 rounded-xl bg-[#c76f3b] px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#8c3a2e] active:scale-95 shadow-sm cursor-pointer"
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Skills Synced to Profile!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Sync Keywords to Profile</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={onDownloadFeedbackPDF}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[#eae6e0] transition-all hover:bg-white/[0.08] hover:text-white hover:border-white/20 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-[#c76f3b]" />
                <span>Download Feedback PDF</span>
              </button>
            </div>
          </div>

          {/* Company Target ATS Benchmarker */}
          <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#141318] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-[#c76f3b]" />
                <span className="text-xs font-bold text-[#eae6e0]">Target Recruiter ATS Match Index:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_COMPANIES.map(company => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setTargetCompany(company.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      targetCompany === company.id
                        ? "bg-[#c76f3b] text-white shadow-sm"
                        : "border border-white/[0.08] bg-[#1c1a22] text-[#938e87] hover:text-white"
                    }`}
                  >
                    {company.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#938e87]">Recruiter Cutoff Score:</span>
                <span className="font-bold text-[#eae6e0]">{activeCompanyData.benchmark}/100</span>
                <span className="text-[#938e87]">· Your Match:</span>
                <span className={`font-black ${companyMatchScore >= activeCompanyData.benchmark ? "text-[#c76f3b]" : "text-[#938e87]"}`}>
                  {companyMatchScore}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#938e87]">
                <span>Essential Keywords for {activeCompanyData.name}:</span>
                <div className="flex gap-1 font-semibold text-[#eae6e0]">
                  {activeCompanyData.reqKeywords.map((k, i) => (
                    <span key={i} className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Detail Feedback Cards */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[#c76f3b]">
                <CheckCircle2 className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#eae6e0]">Candidate Strengths</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#eae6e0]">
                    <span className="text-[#c76f3b] font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps & Improvements */}
            <div className="rounded-2xl border border-[#c76f3b]/20 bg-[#141318] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[#c76f3b]">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#eae6e0]">Critical Improvements</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#eae6e0]">
                    <span className="text-[#c76f3b] font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ATS Keywords */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[#938e87]">
                <Key className="h-4 w-4 text-[#c76f3b]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#eae6e0]">Recommended ATS Keywords</h4>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFeedback.ats_keywords.map((kw, i) => (
                  <span key={i} className="rounded-lg border border-white/[0.08] bg-[#1c1a22] px-2.5 py-1 text-xs font-medium text-[#eae6e0] shadow-sm">
                    +{kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Formatting Tips */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141318] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[#938e87]">
                <LayoutTemplate className="h-4 w-4 text-[#c76f3b]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#eae6e0]">Structural & Formatting Guidelines</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.formatting_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#938e87]">
                    <span className="text-[#c76f3b] font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

