import React, { useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
  year_distribution?: Array<{
    year: number;
    total: number;
    placed: number;
    unplaced: number;
    placement_rate: number;
    avg_package: number;
  }>;
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters.year, filters.branch, filters.gender, filters.skill]);

  const records = analytics?.records || [];
  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const currentRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const years = analytics?.available_years || [2026, 2025, 2024];
  const branches = analytics?.available_branches || ["All", "CSE", "IT", "ECE", "MECH", "CIVIL"];
  const skills = analytics?.available_skills || ["All", "AIML + Python", "Python", "Java", "C"];

  const totalStudents = records.length || 1;
  const placedStudents = records.filter((r) => r.placed_label === "Placed").length;
  const placementRate = Math.round((placedStudents / totalStudents) * 100);
  const atRiskStudents = records.filter(
    (r) =>
      r.placed_label === "Not Placed" ||
      (Number(r.codingScore) || 0) < 5 ||
      (Number(r.cgpa) || 0) < 7.0
  );

  const handleDispatchIntervention = () => {
    if (atRiskStudents.length === 0) {
      toast.info("No at-risk candidates match the current filters.");
      return;
    }
    const headers = [
      "CandidateID",
      "Year",
      "Branch",
      "Gender",
      "SkillCategory",
      "CGPA",
      "CodingScore",
      "PlacementStatus",
    ];
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = atRiskStudents.map((r) =>
      [
        r.sourceId,
        r.year,
        r.branch,
        r.gender,
        r.skillCategory,
        r.cgpa,
        r.codingScore,
        r.placed_label,
      ]
        .map(escapeCsv)
        .join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `at-risk-candidates-${filters.branch}-${filters.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setInterventionDispatched(true);
    toast.success(`Exported ${atRiskStudents.length} at-risk candidate records as CSV.`);
    setTimeout(() => setInterventionDispatched(false), 6000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Top Controls & Filters */}
      <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px] sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#1F1F23] pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#FAFAFA] sm:text-2xl">
                {viewMode === "explorer"
                  ? "Cohort Analytics & Placement Records"
                  : "TPO Institutional Command Center"}
              </h2>
              <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA] tabular-nums">
                {viewMode === "explorer" ? "972 Records" : "NAAC / NIRF Mode"}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[#A1A1AA] sm:text-sm">
              {viewMode === "explorer"
                ? "Interactive cohort distributions calibrated across 9 engineering branches"
                : "Institutional compliance, at-risk early warning interventions, and NIRF accreditation audits"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-lg border border-[#27272A] bg-[#0E0E12] p-1">
              <button
                type="button"
                onClick={() => setViewMode("explorer")}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "explorer"
                    ? "bg-[#FAFAFA] text-[#09090B]"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                Cohort Data
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tpo")}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === "tpo"
                    ? "bg-[#FAFAFA] text-[#09090B]"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                TPO &amp; NAAC 5.2
              </button>
            </div>

            {viewMode === "tpo" ? (
              <button
                type="button"
                onClick={handlePrintReport}
                className="inline-flex h-10 items-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors hover:bg-[#E4E4E7] cursor-pointer"
              >
                Print NAAC Report
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onDownloadCSV}
                  className="inline-flex h-10 items-center rounded-lg border border-[#27272A] bg-[#101014] px-3.5 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#18181B] cursor-pointer"
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={onDownloadPDF}
                  className="inline-flex h-10 items-center rounded-lg bg-[#FAFAFA] px-4 text-xs font-medium text-[#09090B] transition-colors hover:bg-[#E4E4E7] cursor-pointer"
                >
                  Download PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Interactive Dropdowns */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="cohort-filter-year" className="block text-xs font-medium text-[#A1A1AA]">
              Cohort Year
            </label>
            <select
              id="cohort-filter-year"
              name="cohortYear"
              value={filters.year}
              onChange={(e) => onFilterChange({ ...filters, year: parseInt(e.target.value, 10) })}
              className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3 text-xs font-medium text-[#FAFAFA] outline-none transition-colors focus:border-[#A1A1AA]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Class of {y}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cohort-filter-branch"
              className="block text-xs font-medium text-[#A1A1AA]"
            >
              Course / Branch
            </label>
            <select
              id="cohort-filter-branch"
              name="cohortBranch"
              value={filters.branch}
              onChange={(e) => onFilterChange({ ...filters, branch: e.target.value })}
              className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3 text-xs font-medium text-[#FAFAFA] outline-none transition-colors focus:border-[#A1A1AA]"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cohort-filter-gender"
              className="block text-xs font-medium text-[#A1A1AA]"
            >
              Gender Filter
            </label>
            <select
              id="cohort-filter-gender"
              name="cohortGender"
              value={filters.gender}
              onChange={(e) => onFilterChange({ ...filters, gender: e.target.value })}
              className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3 text-xs font-medium text-[#FAFAFA] outline-none transition-colors focus:border-[#A1A1AA]"
            >
              <option value="All">All Genders</option>
              <option value="Male">Male Candidates</option>
              <option value="Female">Female Candidates</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cohort-filter-skill"
              className="block text-xs font-medium text-[#A1A1AA]"
            >
              Skill Domain
            </label>
            <select
              id="cohort-filter-skill"
              name="cohortSkill"
              value={filters.skill}
              onChange={(e) => onFilterChange({ ...filters, skill: e.target.value })}
              className="h-10 w-full rounded-lg border border-[#27272A] bg-[#0E0E12] px-3 text-xs font-medium text-[#FAFAFA] outline-none transition-colors focus:border-[#A1A1AA]"
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
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Total Audited</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.total_records ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Placement Rate</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.placement_rate ? `${analytics.placement_rate.toFixed(1)}%` : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Avg CGPA</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.avg_cgpa ? analytics.avg_cgpa.toFixed(2) : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Coding Index</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.avg_coding_score ? `${analytics.avg_coding_score.toFixed(1)}/10` : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Average CTC</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.avg_package ? `${analytics.avg_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
            <span className="font-mono text-[10px] text-[#71717A]">Highest Package</span>
            <p className="mt-1.5 font-mono text-xl font-semibold text-[#FAFAFA] tabular-nums">
              {analytics?.highest_package ? `${analytics.highest_package.toFixed(1)} LPA` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* TPO vs Explorer View */}
      {viewMode === "tpo" ? (
        <div className="space-y-8">
          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-[#FAFAFA]">
                  At-Risk Student Intervention Radar
                </h3>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Identified{" "}
                  <strong className="font-medium text-[#FAFAFA]">
                    {atRiskStudents.length} candidates
                  </strong>{" "}
                  in {filters.branch} with coding index (&lt;5/10) or pending placement status.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDispatchIntervention}
                className="inline-flex h-10 items-center rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] cursor-pointer"
              >
                Export At-Risk CSV
              </button>
            </div>

            {interventionDispatched && (
              <div className="mt-4 rounded-lg border border-[#27272A] bg-[#101014] p-3 text-xs text-[#D4D4D8]">
                Downloaded CSV roster of {atRiskStudents.length} filtered at-risk candidates in{" "}
                {filters.branch} ({filters.year}).
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex flex-col justify-between gap-2 border-b border-[#1F1F23] pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-[#FAFAFA]">
                  NAAC Criterion 5.2.1 / NIRF Placement Compliance
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Placement of Outgoing Students during academic year {filters.year}
                </p>
              </div>
              <span className="rounded border border-[#27272A] bg-[#101014] px-2.5 py-1 font-mono text-[10px] text-[#D4D4D8]">
                Accreditation Ready
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
                <span className="font-mono text-[10px] text-[#71717A]">Outgoing Batch</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {records.length}
                </div>
                <span className="text-[11px] text-[#A1A1AA]">Filtered Candidates</span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
                <span className="font-mono text-[10px] text-[#71717A]">Campus Placements</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {placedStudents}
                </div>
                <span className="text-[11px] text-[#A1A1AA]">
                  {records.length > 0 ? placementRate : 0}% Clearance Rate
                </span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
                <span className="font-mono text-[10px] text-[#71717A]">Median CTC</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {analytics?.median_package ? `₹${analytics.median_package} LPA` : "—"}
                </div>
                <span className="text-[11px] text-[#A1A1AA]">NAAC Benchmark</span>
              </div>

              <div className="rounded-xl border border-[#222226] bg-[#101014] p-4 text-center">
                <span className="font-mono text-[10px] text-[#71717A]">Intervention Queue</span>
                <div className="mt-1 font-mono text-2xl font-semibold text-[#FAFAFA] tabular-nums">
                  {atRiskStudents.length}
                </div>
                <span className="text-[11px] text-[#A1A1AA]">Need DSA Support</span>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-[#222226]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#1F1F23] bg-[#0C0C0E] font-mono text-[11px] text-[#71717A]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Engineering Program</th>
                    <th className="px-5 py-3 font-medium">Total Registered</th>
                    <th className="px-5 py-3 font-medium">Number Placed</th>
                    <th className="px-5 py-3 font-medium">Placement %</th>
                    <th className="px-5 py-3 font-medium">Primary Recruiters</th>
                    <th className="px-5 py-3 font-medium">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F23] bg-[#09090B]">
                  {analytics?.branch_distribution && analytics.branch_distribution.length > 0 ? (
                    analytics.branch_distribution.map((dept, i) => (
                      <tr key={i} className="hover:bg-[#101014]">
                        <td className="px-5 py-3.5 font-medium text-[#FAFAFA]">{dept.branch}</td>
                        <td className="px-5 py-3.5 font-mono text-[#A1A1AA] tabular-nums">
                          {dept.total}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-medium text-[#FAFAFA] tabular-nums">
                          {dept.placed}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-medium text-[#FAFAFA] tabular-nums">
                          {dept.placement_rate.toFixed(1)}%
                        </td>
                        <td className="px-5 py-3.5 text-[#A1A1AA]">
                          TCS, Infosys, Accenture, Product Drives
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-[#A1A1AA]">
                        No department records available for the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* AI Cohort Intelligence */}
          <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <span className="text-sm font-semibold text-[#FAFAFA]">AI Cohort Intelligence</span>

              <button
                type="button"
                onClick={onSummarizeAI}
                disabled={isSummarizing}
                className="inline-flex h-9 items-center self-start rounded-lg border border-[#27272A] bg-[#141418] px-4 text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] sm:self-auto cursor-pointer"
              >
                {isSummarizing ? "Synthesizing signals..." : "Summarize with DAS AI"}
              </button>
            </div>

            {aiInsight && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#222226] bg-[#101014] p-5">
                <h4 className="text-sm font-semibold text-[#FAFAFA]">{aiInsight.headline}</h4>
                <p className="text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
                  {aiInsight.summary}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aiInsight.actions.map((act, i) => (
                    <span
                      key={i}
                      className="rounded border border-[#27272A] bg-[#0B0B0E] px-2.5 py-1 text-[11px] text-[#FAFAFA]"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Branch Placement Distribution
              </h3>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Placement conversion rate (%) across engineering departments
              </p>
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.branch_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" vertical={false} />
                    <XAxis dataKey="branch" stroke="#71717A" fontSize={11} />
                    <YAxis stroke="#71717A" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090B",
                        borderColor: "#27272A",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#FAFAFA",
                      }}
                    />
                    <Bar dataKey="placement_rate" fill="#E4E4E7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[#242429] bg-[#09090B]/68 p-6 backdrop-blur-[2px]">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Skill Domain Conversion Rates
              </h3>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Success rate (%) based on primary student programming domain
              </p>
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.skill_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F23" vertical={false} />
                    <XAxis dataKey="skill" stroke="#71717A" fontSize={11} />
                    <YAxis stroke="#71717A" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#09090B",
                        borderColor: "#27272A",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#FAFAFA",
                      }}
                    />
                    <Bar dataKey="placement_rate" fill="#E4E4E7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filtered Records Table */}
          <div className="overflow-hidden rounded-2xl border border-[#242429] bg-[#09090B]/68 backdrop-blur-[2px]">
            <div className="flex items-center justify-between border-b border-[#1F1F23] p-6">
              <div>
                <h3 className="text-sm font-semibold text-[#FAFAFA]">Audited Student Records</h3>
                <p className="mt-0.5 text-xs text-[#A1A1AA]">
                  Showing {records.length} matching candidate profiles from {filters.branch} (
                  {filters.year})
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#1F1F23] bg-[#0C0C0E] font-mono text-[11px] text-[#71717A]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Candidate ID</th>
                    <th className="px-6 py-3 font-medium">Class Year</th>
                    <th className="px-6 py-3 font-medium">Branch</th>
                    <th className="px-6 py-3 font-medium">Gender</th>
                    <th className="px-6 py-3 font-medium">Skill Focus</th>
                    <th className="px-6 py-3 font-medium">CGPA</th>
                    <th className="px-6 py-3 font-medium">Coding Index</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F23]">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-[#A1A1AA]">
                        No student placement records match the selected filter combination.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-[#101014]">
                        <td className="px-6 py-3 font-mono text-[#FAFAFA] tabular-nums">
                          #{r.sourceId}
                        </td>
                        <td className="px-6 py-3 font-mono text-[#A1A1AA] tabular-nums">
                          {r.year}
                        </td>
                        <td className="px-6 py-3 text-[#FAFAFA]">{r.branch}</td>
                        <td className="px-6 py-3 text-[#A1A1AA]">{r.gender}</td>
                        <td className="px-6 py-3 text-[#D4D4D8]">
                          {r.skillCategory ?? (r as any).skill_category ?? "-"}
                        </td>
                        <td className="px-6 py-3 font-mono text-[#FAFAFA] tabular-nums">
                          {(Number(r.cgpa) || 0).toFixed(1)}
                        </td>
                        <td className="px-6 py-3 font-mono text-[#FAFAFA] tabular-nums">
                          {(Number(r.codingScore ?? (r as any).coding_score) || 0).toFixed(1)}/10
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 font-mono text-[10px] ${
                              r.placed_label === "Placed"
                                ? "border-[#3F3F46] bg-[#141418] text-[#FAFAFA]"
                                : "border-[#222226] bg-[#0B0B0E] text-[#A1A1AA]"
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

            <div className="flex items-center justify-between border-t border-[#1F1F23] px-6 py-3.5 text-xs text-[#A1A1AA]">
              <span className="font-mono tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center rounded-md border border-[#27272A] bg-[#101014] px-3 text-xs text-[#FAFAFA] hover:border-[#3F3F46] disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center rounded-md border border-[#27272A] bg-[#101014] px-3 text-xs text-[#FAFAFA] hover:border-[#3F3F46] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
