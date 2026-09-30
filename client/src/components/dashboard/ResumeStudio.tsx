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
  FileCheck
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

export const ResumeStudio: React.FC<ResumeStudioProps> = ({
  feedback,
  onAnalyze,
  isLoading,
  onDownloadFeedbackPDF,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const activeFeedback = feedback || DEFAULT_FEEDBACK;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerAnalysis = () => {
    onAnalyze(selectedFile, rawText);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Input Section */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">ATS Resume Intelligence Studio</h2>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Gemini Multimodal
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Upload your PDF resume or paste project bullets for automated ATS scoring, keyword detection, and structural improvement suggestions.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* PDF File Drag/Upload Area */}
            <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-slate-950/40 p-6 text-center transition-all duration-300 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02]">
              <label className="flex w-full cursor-pointer flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-emerald-400 transition-transform group-hover:scale-110 group-hover:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <span className="mt-3 text-xs font-bold text-white transition-colors group-hover:text-emerald-300">
                  {selectedFile ? selectedFile.name : "Click to browse or drop PDF resume"}
                </span>
                <span className="mt-1 text-[11px] text-slate-500">
                  PDF format · Maximum size 10MB
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 shadow-sm">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Ready for ATS Extraction</span>
                </div>
              )}
            </div>

            {/* Fallback Text Paste Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">
                Optional: Or paste project bullets / interview draft
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste resume text or individual project bullet points here..."
                rows={5}
                className="w-full rounded-2xl border border-white/[0.08] bg-slate-950/50 p-3.5 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Trigger Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleTriggerAnalysis}
              disabled={isLoading || (!selectedFile && !rawText.trim())}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all hover:brightness-110 hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] active:scale-95 disabled:opacity-50"
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
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* ATS Score Dial */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <span className="text-2xl font-black">{activeFeedback.score}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ATS Match Readiness</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    {activeFeedback.score >= 75 ? "Tier-1 Ready" : "Competitive"}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white">{activeFeedback.verdict}</h3>
              </div>
            </div>

            <button
              onClick={onDownloadFeedbackPDF}
              className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/[0.08] hover:text-white hover:border-white/20 sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download Feedback PDF</span>
            </button>
          </div>

          {/* 4 Detail Feedback Cards */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Strengths */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Candidate Strengths</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gaps & Improvements */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Critical Improvements</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ATS Keywords */}
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-400">
                <Key className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Recommended ATS Keywords</h4>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFeedback.ats_keywords.map((kw, i) => (
                  <span key={i} className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-300 shadow-sm">
                    +{kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Formatting Tips */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-purple-400">
                <LayoutTemplate className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Structural & Formatting Guidelines</h4>
              </div>
              <ul className="mt-3 space-y-2">
                {activeFeedback.formatting_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-purple-400 font-bold">•</span>
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

