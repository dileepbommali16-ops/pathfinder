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
  ChevronRight
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
  const pageSize = 10;

  const records = analytics?.records || [];
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const currentRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const years = analytics?.available_years || [2026, 2025, 2024];
  const branches = analytics?.available_branches || ["All", "CSE", "IT", "ECE", "MECH", "CIVIL"];
  const skills = analytics?.available_skills || ["All", "AIML + Python", "Python", "Java", "C"];

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Bar */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
        {/* Subtle background ambient mesh */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.05] blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Cohort Analytics & Benchmarks</h2>
              <p className="text-xs text-slate-400">Filterable dataset over 650 verified student placement records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadCSV}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-white/[0.08] active:scale-95 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:brightness-110 active:scale-95"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Dropdowns */}
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Year */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Cohort Year</label>
            <select
              value={filters.year}
              onChange={(e) => onFilterChange({ ...filters, year: parseInt(e.target.value, 10) })}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Course / Branch</label>
            <select
              value={filters.branch}
              onChange={(e) => onFilterChange({ ...filters, branch: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => onFilterChange({ ...filters, gender: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Skill Domain */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Skill Domain</label>
            <select
              value={filters.skill}
              onChange={(e) => onFilterChange({ ...filters, skill: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            >
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6 Metric Cards for Filtered Results */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-6 border-t border-slate-800/80 pt-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Students</span>
            <p className="mt-1 text-xl font-black text-white">{analytics?.total_records || 0}</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">Placed</span>
            <p className="mt-1 text-xl font-black text-emerald-400">{analytics?.placed_count || 0}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Unplaced</span>
            <p className="mt-1 text-xl font-black text-slate-300">{analytics?.unplaced_count || 0}</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">Placement Rate</span>
            <p className="mt-1 text-xl font-black text-emerald-300">{analytics ? `${analytics.placement_rate.toFixed(1)}%` : "—"}</p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">Avg Package</span>
            <p className="mt-1 text-xl font-black text-cyan-400">
              {analytics?.avg_package ? `${analytics.avg_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Highest Package</span>
            <p className="mt-1 text-xl font-black text-amber-300">
              {analytics?.highest_package ? `${analytics.highest_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* AI Cohort Insight Section */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">AI Cohort Intelligence</span>
          </div>

          <button
            onClick={onSummarizeAI}
            disabled={isSummarizing}
            className="flex items-center gap-1.5 self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 sm:self-auto"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isSummarizing ? "Synthesizing signals..." : "Summarize with Gemini AI"}</span>
          </button>
        </div>

        {aiInsight && (
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4.5">
            <h4 className="text-sm font-bold text-emerald-300">{aiInsight.headline}</h4>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{aiInsight.summary}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {aiInsight.actions.map((act, i) => (
                <span key={i} className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200">
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
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white">Branch Placement Distribution</h3>
          <p className="text-xs text-slate-400">Placement conversion rate (%) across engineering departments</p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.branch_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="branch" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                />
                <Bar dataKey="placement_rate" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Domain Placement Rates */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white">Skill Domain Conversion Rates</h3>
          <p className="text-xs text-slate-400">Success rate (%) based on primary student programming domain</p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.skill_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="skill" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                />
                <Bar dataKey="placement_rate" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Year-over-Year Class Trends */}
        {analytics?.year_distribution && analytics.year_distribution.length > 0 && (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Year-over-Year Placement Conversion & Average Compensation</h3>
                <p className="text-xs text-slate-400">Class of 2024, 2025, and 2026 progression across 972 verified candidates</p>
              </div>
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/20">
                Authoritative Cohort
              </span>
            </div>
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.year_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar dataKey="placement_rate" name="Placement Rate (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avg_package" name="Avg Package (LPA)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Cohort Records Paginated Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/60 shadow-xl backdrop-blur-xl">
        <div className="border-b border-slate-800/80 px-6 py-4">
          <h3 className="text-sm font-bold text-white">Candidate Cohort Sample ({records.length} records)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Year</th>
                <th className="px-6 py-3.5">Branch</th>
                <th className="px-6 py-3.5">Gender</th>
                <th className="px-6 py-3.5">Domain</th>
                <th className="px-6 py-3.5">CGPA</th>
                <th className="px-6 py-3.5">Coding</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentRecords.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-400">{r.sourceId}</td>
                  <td className="px-6 py-3 text-slate-300">{r.year}</td>
                  <td className="px-6 py-3 font-semibold text-white">{r.branch}</td>
                  <td className="px-6 py-3 text-slate-300">{r.gender}</td>
                  <td className="px-6 py-3 text-emerald-400">{r.skillCategory}</td>
                  <td className="px-6 py-3 text-slate-200">{r.cgpa.toFixed(1)}</td>
                  <td className="px-6 py-3 text-slate-200">{r.codingScore.toFixed(1)}/10</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.placed_label === "Placed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {r.placed_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-3 text-xs text-slate-400">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
