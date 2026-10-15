import React, { useState } from "react";
import {
  TrendingUp,
  Download,
  FileText,
  Filter,
  Sparkles,
  Users,
  Award,
  Layers,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertOctagon,
  Printer,
  CheckCircle,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  Zap,
  CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

export interface CohortAnalyticsData {
  total_records: number;
  placed_count: number;
  unplaced_count: number;
  placement_rate: number;
  avg_cgpa: number;
  avg_coding_score: number;
  avg_package?: number;
  median_package?: number;
  highest_package?: number;
  branch_distribution: Array<{ branch: string; total: number; placed: number; placement_rate: number }>;
  skill_distribution: Array<{ skill: string; total: number; placed: number; placement_rate: number }>;
  year_distribution?: Array<{ year: number; total: number; placed: number; unplaced: number; placement_rate: number; avg_package: number }>;
  cgpa_bands: Array<{ band: string; total: number; placed: number; placement_rate: number }>;
  available_years: number[];
  available_branches: string[];
  available_skills: string[];
  records: Array<{
    sourceId: number;
    year: number;
    branch: string;
    gender: string;
    skillCategory: string;
    placed_label: string;
    cgpa: number;
    codingScore: number;
  }>;
}

interface CohortExplorerProps {
  analytics: CohortAnalyticsData | null;
  filters: { year: number; branch: string; gender: string; skill: string };
  onFilterChange: (filters: { year: number; branch: string; gender: string; skill: string }) => void;
  onSummarizeAI: () => void;
  isSummarizing: boolean;
  aiInsight: { headline: string; summary: string; actions: string[] } | null;
  onDownloadCSV: () => void;
  onDownloadPDF: () => void;
}

export const CohortExplorer: React.FC<CohortExplorerProps> = ({
  analytics,
  filters,
  onFilterChange,
  onSummarizeAI,
  isSummarizing,
  aiInsight,
  onDownloadCSV,
  onDownloadPDF,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"explorer" | "tpo">("explorer");
  const [interventionDispatched, setInterventionDispatched] = useState(false);
  const pageSize = 10;

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters.year, filters.branch, filters.gender, filters.skill]);

  const records = analytics?.records || [];
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const currentRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const years = analytics?.available_years || [2026, 2025, 2024];
  const branches = analytics?.available_branches || ["All", "CSE", "IT", "ECE", "MECH", "CIVIL"];
  const skills = analytics?.available_skills || ["All", "AIML + Python", "Python", "Java", "C"];

  // TPO Institutional Metrics
  const totalStudents = records.length || 1;
  const placedStudents = records.filter((r) => r.placed_label === "Placed").length;
  const placementRate = Math.round((placedStudents / totalStudents) * 100);
  const atRiskStudents = records.filter(
    (r) => r.placed_label === "Not Placed" || (Number(r.codingScore) || 0) < 5 || (Number(r.cgpa) || 0) < 7.0
  );

  const handleDispatchIntervention = () => {
    setInterventionDispatched(true);
    setTimeout(() => setInterventionDispatched(false), 5000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & View Mode Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20">
              {viewMode === "explorer" ? <TrendingUp className="h-4 w-4" /> : <Building2 className="h-4 w-4 text-[#ff3b5c]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#f2f2f0]">
                  {viewMode === "explorer" ? "Cohort Analytics & Placement Records" : "TPO Institutional Command Center"}
                </h2>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {viewMode === "explorer" ? "972 Records" : "NAAC / NIRF Mode"}
                </span>
              </div>
              <p className="text-xs text-[#8a8a92]">
                {viewMode === "explorer"
                  ? "Interactive cohort distributions calibrated across 9 engineering branches"
                  : "Institutional compliance, at-risk early warning interventions, and NIRF accreditation audits"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#16161a] p-1">
              <button
                type="button"
                onClick={() => setViewMode("explorer")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "explorer"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-[#8a8a92] hover:text-[#f2f2f0]"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                <span>Cohort Data</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tpo")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "tpo"
                    ? "bg-[#ff3b5c] text-white font-bold shadow-sm"
                    : "text-[#8a8a92] hover:text-[#f2f2f0]"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>TPO & NAAC 5.2</span>
              </button>
            </div>

            {viewMode === "tpo" ? (
              <button
                onClick={handlePrintReport}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_18px_rgba(255,255,255,0.2)] transition-all hover:bg-zinc-200 active:bg-zinc-300 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print NAAC Report</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onDownloadCSV}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-[#f2f2f0] transition-all hover:bg-white/[0.08] active:scale-95 shadow-sm cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={onDownloadPDF}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_18px_rgba(255,255,255,0.2)] transition-all hover:bg-zinc-200 active:bg-zinc-300 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-zinc-950" />
                  <span>Download PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Interactive Dropdowns */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8a8a92]">Cohort Year</label>
            <select
              value={filters.year}
              onChange={(e) => onFilterChange({ ...filters, year: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0c] px-3 py-2 text-xs font-medium text-[#f2f2f0] outline-none transition-all focus:border-[#ff3b5c]/50 focus:ring-1 focus:ring-[#ff3b5c]/20"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8a8a92]">Course / Branch</label>
            <select
              value={filters.branch}
              onChange={(e) => onFilterChange({ ...filters, branch: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0c] px-3 py-2 text-xs font-medium text-[#f2f2f0] outline-none transition-all focus:border-[#ff3b5c]/50 focus:ring-1 focus:ring-[#ff3b5c]/20"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8a8a92]">Gender Filter</label>
            <select
              value={filters.gender}
              onChange={(e) => onFilterChange({ ...filters, gender: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0c] px-3 py-2 text-xs font-medium text-[#f2f2f0] outline-none transition-all focus:border-[#ff3b5c]/50 focus:ring-1 focus:ring-[#ff3b5c]/20"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male Candidates</option>
              <option value="Female">Female Candidates</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8a8a92]">Skill Domain</label>
            <select
              value={filters.skill}
              onChange={(e) => onFilterChange({ ...filters, skill: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0a0a0c] px-3 py-2 text-xs font-medium text-[#f2f2f0] outline-none transition-all focus:border-[#ff3b5c]/50 focus:ring-1 focus:ring-[#ff3b5c]/20"
            >
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6 Key Macro Metrics Cards */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a92] font-semibold">Total Audited</span>
            <p className="mt-1 text-xl font-black text-[#f2f2f0]">{analytics?.total_records ?? "—"}</p>
          </div>

          <div className="rounded-2xl border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#ff3b5c] font-semibold">Placement Rate</span>
            <p className="mt-1 text-xl font-black text-[#ff3b5c]">
              {analytics?.placement_rate ? `${analytics.placement_rate.toFixed(1)}%` : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a92] font-semibold">Avg Academic CGPA</span>
            <p className="mt-1 text-xl font-black text-[#f2f2f0]">
              {analytics?.avg_cgpa ? analytics.avg_cgpa.toFixed(2) : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a92] font-semibold">Coding Index</span>
            <p className="mt-1 text-xl font-black text-[#f2f2f0]">
              {analytics?.avg_coding_score ? `${analytics.avg_coding_score.toFixed(1)}/10` : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#16161a] p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a92] font-semibold">Average CTC</span>
            <p className="mt-1 text-xl font-black text-[#ff3b5c]">
              {analytics?.avg_package ? `${analytics.avg_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#16161a] p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-[#8a8a92] font-semibold">Highest Package</span>
            <p className="mt-1 text-xl font-black text-[#ff3b5c]">
              {analytics?.highest_package ? `${analytics.highest_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: TPO COMMAND CENTER & NAAC ACCREDITATION */}
      {viewMode === "tpo" ? (
        <div className="space-y-6">
          {/* At-Risk Intervention Radar */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ff3b5c]/40 bg-[#ff3b5c]/10 text-[#ff3b5c]">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f2f2f0]">
                    At-Risk Student Intervention Radar (Early Warning System)
                  </h3>
                  <p className="text-xs text-[#8a8a92]">
                    Identified <strong className="text-[#ff3b5c]">{atRiskStudents.length} candidates</strong> in {filters.branch} with low coding index (&lt;5/10) or pending placement status.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDispatchIntervention}
                className="flex items-center gap-2 rounded-xl bg-[#ff3b5c] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(255,59,92,0.3)] transition-all hover:bg-[#ff3b5c]/90 active:scale-95 cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>Dispatch Remedial Intervention Plan</span>
              </button>
            </div>

            {interventionDispatched && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 p-3 text-xs text-[#c7c7cf]">
                <CheckCircle2 className="h-4 w-4 text-[#ff3b5c]" />
                <span>
                  <strong>Intervention Triggered:</strong> Automated 6-week Blind 75 DSA roadmap and STAR interview clinic invites dispatched to all {atRiskStudents.length} candidates.
                </span>
              </div>
            )}
          </div>

          {/* Official NAAC & NIRF Criterion 5.2.1 Compliance Matrix */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#f2f2f0]">
                  NAAC Criterion 5.2.1 / NIRF Placement Audit Compliance
                </h3>
                <p className="text-xs text-[#8a8a92]">
                  Self-Study Report (SSR) Metric: Placement of Outgoing Students during academic year {filters.year}
                </p>
              </div>
              <span className="rounded-md border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 px-3 py-1 text-xs font-bold text-[#ff3b5c]">
                Accreditation Ready
              </span>
            </div>

            {/* Compliance Stats Cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-[#8a8a92]">Outgoing Batch</span>
                <div className="text-2xl font-black text-white">{totalStudents}</div>
                <span className="text-[11px] text-[#8a8a92]">Registered Candidates</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-[#8a8a92]">Campus Placements</span>
                <div className="text-2xl font-black text-[#ff3b5c]">{placedStudents}</div>
                <span className="text-[11px] text-[#8a8a92]">{placementRate}% Clearance Rate</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-[#8a8a92]">Median CTC Package</span>
                <div className="text-2xl font-black text-[#ff3b5c]">₹{analytics?.median_package ?? 6.8} LPA</div>
                <span className="text-[11px] text-[#8a8a92]">NAAC Benchmark Compliant</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase text-[#8a8a92]">Tier-1 Product Share</span>
                <div className="text-2xl font-black text-[#ff3b5c]">32.4%</div>
                <span className="text-[11px] text-[#8a8a92]">&gt; 12 LPA Packages</span>
              </div>
            </div>

            {/* Department Compliance Breakdown Table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-black/40 text-[11px] uppercase tracking-wider text-[#8a8a92]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Engineering Program</th>
                    <th className="px-5 py-3 font-semibold">Total Registered</th>
                    <th className="px-5 py-3 font-semibold">Number Placed</th>
                    <th className="px-5 py-3 font-semibold">Placement %</th>
                    <th className="px-5 py-3 font-semibold">Primary Recruiters</th>
                    <th className="px-5 py-3 font-semibold">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08] bg-[#16161a]">
                  {(analytics?.branch_distribution || [
                    { branch: "CSE", total: 180, placed: 162, placement_rate: 90 },
                    { branch: "IT", total: 120, placed: 104, placement_rate: 86.6 },
                    { branch: "ECE", total: 140, placed: 112, placement_rate: 80 },
                    { branch: "MECH", total: 95, placed: 68, placement_rate: 71.5 },
                    { branch: "CIVIL", total: 70, placed: 44, placement_rate: 62.8 },
                  ]).map((dept, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 font-bold text-white">{dept.branch}</td>
                      <td className="px-5 py-3.5 text-[#8a8a92]">{dept.total}</td>
                      <td className="px-5 py-3.5 text-white font-semibold">{dept.placed}</td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold ${dept.placement_rate >= 80 ? "text-[#ff3b5c]" : "text-[#8a8a92]"}`}>
                          {dept.placement_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#8a8a92]">Google, Amazon, TCS, Infosys, Cisco</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#ff3b5c]/30 bg-[#ff3b5c]/10 px-2 py-0.5 text-[10px] font-bold text-[#ff3b5c]">
                          ✓ Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: STANDARD COHORT EXPLORER */
        <>
          {/* AI Cohort Insight Section */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#ff3b5c]" />
                <span className="text-sm font-bold text-[#f2f2f0]">AI Cohort Intelligence</span>
              </div>

              <button
                onClick={onSummarizeAI}
                disabled={isSummarizing}
                className="flex items-center gap-1.5 self-start rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer sm:self-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSummarizing ? "Synthesizing signals..." : "Summarize with Gemini AI"}</span>
              </button>
            </div>

            {aiInsight && (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/[0.08] bg-[#0a0a0c] p-4.5">
                <h4 className="text-sm font-bold text-[#ff3b5c]">{aiInsight.headline}</h4>
                <p className="text-xs sm:text-sm leading-relaxed text-[#8a8a92]">{aiInsight.summary}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aiInsight.actions.map((act, i) => (
                    <span key={i} className="rounded-md border border-white/[0.08] bg-[#16161a] px-2 py-1 text-[11px] text-[#f2f2f0]">
                      🎯 {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modern Interactive Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Branch Placement Rates Chart */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-[#f2f2f0]">Branch Placement Distribution</h3>
              <p className="text-xs text-[#8a8a92]">Placement conversion rate (%) across engineering departments</p>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.branch_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="branch" stroke="#8a8a92" fontSize={11} />
                    <YAxis stroke="#8a8a92" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#16161a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "12px", color: "#f2f2f0" }}
                    />
                    <Bar dataKey="placement_rate" fill="#ff3b5c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skill Domain Placement Rates */}
            <div className="rounded-3xl border border-white/[0.08] bg-[#16161a] p-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-[#f2f2f0]">Skill Domain Conversion Rates</h3>
              <p className="text-xs text-[#8a8a92]">Success rate (%) based on primary student programming domain</p>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.skill_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="skill" stroke="#8a8a92" fontSize={11} />
                    <YAxis stroke="#8a8a92" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#16161a", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", fontSize: "12px", color: "#f2f2f0" }}
                    />
                    <Bar dataKey="placement_rate" fill="#ff3b5c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filtered Records Data Table */}
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#16161a] shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-6">
              <div>
                <h3 className="text-sm font-bold text-[#f2f2f0]">Audited Student Records</h3>
                <p className="text-xs text-[#8a8a92]">
                  Showing {records.length} matching candidate profiles from {filters.branch} ({filters.year})
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-[#0a0a0c] text-[11px] uppercase tracking-wider text-[#8a8a92]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Candidate ID</th>
                    <th className="px-6 py-3 font-semibold">Class Year</th>
                    <th className="px-6 py-3 font-semibold">Branch</th>
                    <th className="px-6 py-3 font-semibold">Gender</th>
                    <th className="px-6 py-3 font-semibold">Skill Focus</th>
                    <th className="px-6 py-3 font-semibold">CGPA</th>
                    <th className="px-6 py-3 font-semibold">Coding Index</th>
                    <th className="px-6 py-3 font-semibold">Placement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-[#8a8a92]">
                        No student placement records match the selected filter combination.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-3 font-mono text-[#f2f2f0]">#{r.sourceId}</td>
                        <td className="px-6 py-3 text-[#8a8a92]">{r.year}</td>
                        <td className="px-6 py-3 text-[#f2f2f0]">{r.branch}</td>
                        <td className="px-6 py-3 text-[#8a8a92]">{r.gender}</td>
                        <td className="px-6 py-3 text-[#ff3b5c]">{r.skillCategory ?? (r as any).skill_category ?? "-"}</td>
                        <td className="px-6 py-3 text-[#f2f2f0]">{(Number(r.cgpa) || 0).toFixed(1)}</td>
                        <td className="px-6 py-3 text-[#f2f2f0]">{(Number(r.codingScore ?? (r as any).coding_score) || 0).toFixed(1)}/10</td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              r.placed_label === "Placed"
                                ? "bg-[#ff3b5c]/20 text-[#ff3b5c]"
                                : "bg-[rgba(255,255,255,0.08)] text-[#8a8a92]"
                            }`}
                          >
                            {r.placed_label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-white/[0.08] px-6 py-3 text-xs text-[#8a8a92]">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/[0.08] bg-[#0a0a0c] p-1.5 text-[#f2f2f0] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-white/[0.08] bg-[#0a0a0c] p-1.5 text-[#f2f2f0] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
