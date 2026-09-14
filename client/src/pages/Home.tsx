import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Code2,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserRound,
  Users,
} from "lucide-react";

const chartTooltipStyle = {
  backgroundColor: "#0d1a2b",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#fff",
};

const defaults = {
  cgpa: 7.2,
  backlogs: 0,
  internships: 1,
  communication: 7,
  coding: 7,
};

type Profile = typeof defaults;

type Result = {
  chance: number;
  label: string;
  tone: "strong" | "steady" | "focus";
  suggestions: string[];
};

function getResult(profile: Profile): Result {
  const score =
    profile.cgpa * 5.2 +
    Math.max(0, 3 - profile.backlogs) * 4 +
    Math.min(profile.internships, 3) * 5 +
    profile.communication * 2.2 +
    profile.coding * 2.7 -
    Math.max(profile.backlogs - 1, 0) * 5;

  const chance = Math.max(18, Math.min(96, Math.round(score)));
  const suggestions: string[] = [];

  if (profile.cgpa < 7) suggestions.push("Push your CGPA above 7.0");
  if (profile.backlogs > 0) suggestions.push("Clear active backlogs first");
  if (profile.internships === 0) suggestions.push("Add one practical internship");
  if (profile.communication < 7) suggestions.push("Practice mock interviews weekly");
  if (profile.coding < 7) suggestions.push("Build DSA and coding consistency");

  if (chance >= 78) {
    return { chance, label: "Strong profile", tone: "strong", suggestions };
  }
  if (chance >= 58) {
    return { chance, label: "Good foundation", tone: "steady", suggestions };
  }
  return { chance, label: "Needs focused improvement", tone: "focus", suggestions };
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="text-emerald-300">{icon}</span>{label}
        </span>
        <span className="font-semibold text-white">{value}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500" style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [filters, setFilters] = useState({ year: "", branch: "", gender: "", skillCategory: "" });
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const { user, loading, isAuthenticated, logout } = useAuth();

  const result = useMemo(() => getResult(profile), [profile]);
  const recordsQuery = trpc.placement.records.useQuery(filters, { refetchOnWindowFocus: false });
  const historyQuery = trpc.predictions.history.useQuery(undefined, { enabled: isAuthenticated, refetchOnWindowFocus: false });
  const savePrediction = trpc.predictions.save.useMutation({ onSuccess: () => historyQuery.refetch() });
  const resumeAnalysis = trpc.resume.analyze.useMutation();
  const uploadCsv = trpc.placement.uploadCsv.useMutation({ onSuccess: () => recordsQuery.refetch() });
  const records = recordsQuery.data ?? [];

  const filterOptions = useMemo(() => ({
    years: Array.from(new Set(records.map((record) => String(record.year)))),
    branches: Array.from(new Set(records.map((record) => record.branch))),
    genders: Array.from(new Set(records.map((record) => record.gender))),
    skills: Array.from(new Set(records.map((record) => record.skillCategory))),
  }), [records]);

  const placementSplit = useMemo(() => {
    const placed = records.filter((record) => record.placed === 1).length;
    const total = records.length || 1;
    return [
      { name: "Placed", value: Math.round((placed / total) * 100), color: "#9ef5cb" },
      { name: "Not placed", value: Math.round(((total - placed) / total) * 100), color: "#334155" },
    ];
  }, [records]);

  const cohortSkills = useMemo(() => {
    const average = (key: "cgpa" | "codingScore" | "communicationScore" | "internships") => records.length ? Math.round(records.reduce((sum, record) => sum + record[key], 0) / records.length * (key === "internships" ? 10 : 1)) : 0;
    return [
      { skill: "CGPA", student: Math.round(profile.cgpa * 10), cohort: average("cgpa") },
      { skill: "Coding", student: profile.coding * 10, cohort: average("codingScore") },
      { skill: "Communication", student: profile.communication * 10, cohort: average("communicationScore") },
      { skill: "Internships", student: profile.internships * 10, cohort: average("internships") },
    ];
  }, [profile, records]);

  const readinessTrend = useMemo(() => {
    const byYear = new Map<number, { placed: number; total: number }>();
    records.forEach((record) => {
      const current = byYear.get(record.year) ?? { placed: 0, total: 0 };
      byYear.set(record.year, { placed: current.placed + (record.placed === 1 ? 1 : 0), total: current.total + 1 });
    });
    return Array.from(byYear.entries()).sort(([a], [b]) => a - b).map(([year, values]) => ({ month: String(year), score: Math.round((values.placed / values.total) * 100) }));
  }, [records]);

  const update = (key: keyof Profile, value: number) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setHasPredicted(false);
  };

  const reset = () => {
    setProfile(defaults);
    setHasPredicted(false);
  };

  const updateFilter = (key: keyof typeof filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const saveCurrentPrediction = () => {
    setHasPredicted(true);
    if (isAuthenticated) savePrediction.mutate({ ...profile, chance: result.chance });
  };
  const readResumeFile = (file: File) => {
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setResumeText(String(reader.result ?? ""));
    reader.readAsText(file);
  };
  const readCsvFile = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => uploadCsv.mutate({ content: String(reader.result ?? "") });
    reader.readAsText(file);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-80">
        <div className="absolute -left-40 top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-40 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-amber-300/5 blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-300 text-[#07111f] shadow-lg shadow-emerald-300/20">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-emerald-300">PATHFINDER</p>
            <p className="text-xs text-slate-400">Placement readiness</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="hidden items-center gap-2 lg:flex"><Users size={16} /> Built for students</span>
          {loading ? (
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-400"><Loader2 size={15} className="animate-spin" /> Checking account</span>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1.5">
              <span className="flex items-center gap-2 px-2 text-emerald-100"><UserRound size={15} /> <span className="max-w-[120px] truncate">{user.name || user.email || "Student"}</span></span>
              <button onClick={() => void logout()} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"><LogOut size={14} /> Log out</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => startLogin()} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-200"><LogIn size={15} /> Log in</button>
              <button onClick={() => startLogin()} className="hidden rounded-full bg-emerald-300 px-4 py-2 font-bold text-[#07111f] transition hover:bg-emerald-200 sm:block">Create account</button>
            </div>
          )}
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="grid items-end gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="max-w-2xl animate-[rise_500ms_ease-out_both]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <Sparkles size={14} /> Your next opportunity starts here
            </div>
            <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">
              Know where you <span className="text-emerald-300">stand.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Get a quick placement-readiness estimate from your academics, skills, and practical experience — then see exactly what to improve next.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 text-sm text-slate-300">
              {[
                [<Target size={16} />, "Profile check"],
                [<TrendingUp size={16} />, "Actionable feedback"],
                [<BadgeCheck size={16} />, "Student-friendly"],
              ].map(([icon, label]) => (
                <span key={String(label)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="text-emerald-300">{icon}</span>{label}
                </span>
              ))}
            </div>
            {!isAuthenticated && !loading && (
              <p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><UserRound size={15} /> Log in to save your profile and track progress in the next update.</p>
            )}
          </div>

          <div className="relative animate-[rise_650ms_ease-out_both]">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-emerald-300/30 via-cyan-300/10 to-transparent blur-xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-[#0d1a2b]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
              <div className="mb-7 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">01 / Your profile</p>
                  <h2 className="mt-2 text-2xl font-bold">Let&apos;s check your readiness</h2>
                </div>
                <button onClick={reset} aria-label="Reset form" className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-white/25 hover:text-white">
                  <RotateCcw size={17} />
                </button>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">CGPA</span>
                  <input type="number" min="0" max="10" step="0.1" value={profile.cgpa} onChange={(e) => update("cgpa", Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/10" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Active backlogs</span>
                  <input type="number" min="0" max="20" value={profile.backlogs} onChange={(e) => update("backlogs", Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/10" />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="flex justify-between text-sm text-slate-300"><span>Internships completed</span><span className="font-semibold text-white">{profile.internships}</span></span>
                  <input type="range" min="0" max="5" value={profile.internships} onChange={(e) => update("internships", Number(e.target.value))} className="h-2 w-full cursor-pointer accent-emerald-300" />
                </label>
              </div>

              <div className="mt-7 space-y-5 border-t border-white/10 pt-6">
                <ScoreBar label="Communication" value={profile.communication} icon={<MessageCircle size={16} />} />
                <input aria-label="Communication score" type="range" min="1" max="10" value={profile.communication} onChange={(e) => update("communication", Number(e.target.value))} className="-mt-3 h-2 w-full cursor-pointer accent-emerald-300" />
                <ScoreBar label="Coding confidence" value={profile.coding} icon={<Code2 size={16} />} />
                <input aria-label="Coding score" type="range" min="1" max="10" value={profile.coding} onChange={(e) => update("coding", Number(e.target.value))} className="-mt-3 h-2 w-full cursor-pointer accent-emerald-300" />
              </div>

              <button onClick={saveCurrentPrediction} className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3.5 font-bold text-[#07111f] shadow-lg shadow-emerald-300/10 transition hover:-translate-y-0.5 hover:bg-emerald-200 active:translate-y-0">
                Calculate my chance <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><Lightbulb size={17} /> Why this helps</div>
            <h3 className="mt-4 text-2xl font-bold tracking-tight">Small improvements compound.</h3>
            <p className="mt-3 leading-7 text-slate-400">Use your result as a starting point, not a final verdict. Track one skill every week and revisit your profile before placement season.</p>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
              <div><p className="text-2xl font-black text-white">5</p><p className="mt-1 text-xs text-slate-500">signals</p></div>
              <div><p className="text-2xl font-black text-white">1</p><p className="mt-1 text-xs text-slate-500">quick check</p></div>
              <div><p className="text-2xl font-black text-white">∞</p><p className="mt-1 text-xs text-slate-500">retries</p></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#10283b] to-[#0d1a2b] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">02 / Your result</p>
                <h3 className="mt-3 text-2xl font-bold">Placement readiness</h3>
              </div>
              {hasPredicted && <span className="rounded-full bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">Updated now</span>}
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-[190px_1fr] sm:items-center">
              <div className="relative grid aspect-square place-items-center rounded-full border-[14px] border-emerald-300/20 bg-[#0a1726]" style={{ background: `conic-gradient(#9ef5cb ${result.chance}%, rgba(158,245,203,0.10) 0)` }}>
                <div className="grid aspect-square w-[calc(100%-20px)] place-items-center rounded-full bg-[#0a1726]">
                  <div className="text-center"><p className="text-5xl font-black tracking-[-0.06em] text-white">{result.chance}%</p><p className="mt-1 text-xs uppercase tracking-widest text-slate-500">estimated</p></div>
                </div>
              </div>
              <div>
                <p className={`text-lg font-bold ${result.tone === "strong" ? "text-emerald-300" : result.tone === "steady" ? "text-amber-200" : "text-orange-300"}`}>{result.label}</p>
                <p className="mt-2 leading-7 text-slate-400">{hasPredicted ? "Here is your current snapshot based on the details you entered." : "Enter your profile and calculate to see your snapshot."}</p>
                <div className="mt-5 space-y-3">
                  {(result.suggestions.length ? result.suggestions.slice(0, 3) : ["Keep building projects", "Stay consistent with practice", "Prepare for mock interviews"]).map((suggestion) => (
                    <div key={suggestion} className="flex items-center gap-3 text-sm text-slate-300"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-300/15 text-emerald-300"><Check size={13} /></span>{suggestion}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#0b1727]/90 p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">03 / Placement analytics</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">See the signals behind the score.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A visual snapshot of the current profile compared with a sample student cohort.</p>
            </div>
            <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100">{records.length} public records · 2015 cohort</span>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["year", "Year", filterOptions.years],
              ["branch", "Branch", filterOptions.branches],
              ["gender", "Gender", filterOptions.genders],
              ["skillCategory", "Skill category", filterOptions.skills],
            ] as const).map(([key, label, options]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                <select value={filters[key]} onChange={(event) => updateFilter(key, event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#102033] px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-emerald-300/60">
                  <option value="">All {label.toLowerCase()}s</option>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[0.8fr_1.2fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-semibold text-white">Placement outcomes</p><p className="mt-1 text-xs text-slate-500">Sample cohort</p></div>
                <Target size={18} className="text-emerald-300" />
              </div>
              <div className="relative mt-3 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={placementSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={76} paddingAngle={4} stroke="none">
                      {placementSplit.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}%`, "Students"]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><p className="text-3xl font-black text-white">68%</p><p className="text-[10px] uppercase tracking-widest text-slate-500">placed</p></div></div>
              </div>
              <div className="flex justify-center gap-4 text-xs text-slate-400"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300" />Placed</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-600" />Not placed</span></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Profile vs cohort</p><p className="mt-1 text-xs text-slate-500">Normalized score / 100</p></div><TrendingUp size={18} className="text-cyan-300" /></div>
              <div className="mt-5 h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cohortSkills} margin={{ top: 5, right: 0, left: -22, bottom: 0 }} barGap={5}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="student" name="Your profile" fill="#9ef5cb" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="cohort" name="Cohort average" fill="#3b6874" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs text-slate-400"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300" />Your profile</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#3b6874]" />Cohort average</span></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Readiness trend</p><p className="mt-1 text-xs text-slate-500">Illustrative progress</p></div><Sparkles size={18} className="text-amber-200" /></div>
              <div className="mt-5 h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={readinessTrend} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[40, 90]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value}%`, "Readiness"]} />
                    <Line type="monotone" dataKey="score" name="Readiness" stroke="#f5d88a" strokeWidth={3} dot={{ fill: "#f5d88a", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#9ef5cb" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400"><span>Historical placement rate</span><span className="font-semibold text-amber-200">{readinessTrend[0]?.score ?? 0}%</span></div>
            </div>
          </div>
        </section>

        {isAuthenticated && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">04 / Your profile</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight">Prediction history</h2>
                <p className="mt-2 text-sm text-slate-400">Every saved readiness check stays on your account.</p>
              </div>
              <UserRound size={22} className="text-emerald-300" />
            </div>
            <div className="mt-6 overflow-x-auto">
              {historyQuery.data?.length ? (
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Date</th><th className="pb-3">Chance</th><th className="pb-3">CGPA</th><th className="pb-3">Coding</th><th className="pb-3">Communication</th><th className="pb-3">Internships</th></tr></thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {historyQuery.data.map((entry) => <tr key={entry.id}><td className="py-3 text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</td><td className="py-3 font-bold text-emerald-300">{entry.chance}%</td><td className="py-3">{(entry.cgpa / 10).toFixed(1)}</td><td className="py-3">{entry.coding}/10</td><td className="py-3">{entry.communication}/10</td><td className="py-3">{entry.internships}</td></tr>)}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-slate-500">Calculate your chance above to create your first saved prediction.</div>
              )}
            </div>
          </section>
        )}

        {isAuthenticated && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-emerald-300/15 bg-gradient-to-br from-[#10283b] to-[#0d1a2b] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">05 / AI career coach</p><h2 className="mt-3 flex items-center gap-2 text-2xl font-bold"><BrainCircuit size={23} className="text-emerald-300" /> Resume skill analyzer</h2><p className="mt-2 text-sm leading-6 text-slate-400">Paste your resume or upload a text file. AI will identify placement-focused skill gaps and next actions.</p></div>
                <FileText size={22} className="text-cyan-300" />
              </div>
              <textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste resume text here..." className="mt-6 min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-[#081522] px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-emerald-300/60" />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-300/40 hover:text-white"><Upload size={15} /> {resumeFileName || "Upload .txt / .md"}<input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={(event) => event.target.files?.[0] && readResumeFile(event.target.files[0])} /></label>
                <button disabled={resumeAnalysis.isPending || resumeText.trim().length < 80} onClick={() => resumeAnalysis.mutate({ resumeText })} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-[#07111f] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40">{resumeAnalysis.isPending ? "Analyzing..." : "Analyze my resume"}</button>
                {resumeAnalysis.error && <span className="text-xs text-rose-300">{resumeAnalysis.error.message}</span>}
              </div>
              {resumeAnalysis.data && <div className="mt-6 space-y-5 border-t border-white/10 pt-5"><p className="text-sm leading-6 text-slate-300">{resumeAnalysis.data.summary}</p><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Skills to improve</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{resumeAnalysis.data.skillGaps.map((gap) => <div key={gap.skill} className="rounded-xl border border-white/10 bg-white/[0.04] p-3"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-white">{gap.skill}</span><span className={`text-[10px] font-bold uppercase ${gap.priority === "High" ? "text-rose-300" : gap.priority === "Medium" ? "text-amber-200" : "text-emerald-300"}`}>{gap.priority}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{gap.reason}</p><p className="mt-2 text-xs font-medium text-cyan-200">Action: {gap.action}</p></div>)}</div></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Next steps</p><ul className="mt-2 space-y-1 text-sm text-slate-300">{resumeAnalysis.data.nextSteps.map((step) => <li key={step}>• {step}</li>)}</ul></div></div>}
            </div>

            {user?.role === "admin" && <div className="rounded-[2rem] border border-amber-300/15 bg-white/[0.03] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Admin tools</p><h2 className="mt-3 flex items-center gap-2 text-2xl font-bold"><Upload size={22} className="text-amber-200" /> Update placement data</h2><p className="mt-2 text-sm leading-6 text-slate-400">Upload a validated CSV to replace the dashboard dataset. Required columns: year, branch, gender, skillCategory, placed, cgpa, codingScore, communicationScore, internships.</p><label className="mt-6 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300/30 bg-amber-300/5 text-center transition hover:bg-amber-300/10"><Upload size={24} className="text-amber-200" /><span className="text-sm font-semibold text-amber-100">{csvFileName || "Choose CSV file"}</span><span className="text-xs text-slate-500">Maximum 3 MB</span><input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && readCsvFile(event.target.files[0])} /></label>{uploadCsv.isPending && <p className="mt-3 text-xs text-amber-100">Validating and importing records...</p>}{uploadCsv.data && <p className="mt-3 text-xs text-emerald-300">Successfully imported {uploadCsv.data.count} records.</p>}{uploadCsv.error && <p className="mt-3 text-xs text-rose-300">{uploadCsv.error.message}</p>}</div>}
          </section>
        )}

        <footer className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Pathfinder · Student Placement Predictor</span>
          <span className="flex items-center gap-2"><BriefcaseBusiness size={14} /> Public campus placement dataset · 215 student records · 2015 cohort.</span>
        </footer>
      </section>
    </main>
  );
}
