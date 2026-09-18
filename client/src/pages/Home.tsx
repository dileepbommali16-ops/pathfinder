import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Bot,
  Check,
  Code2,
  Download,
  FileText,
  GraduationCap,
  History,
  Lightbulb,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

const chartTooltipStyle = {
  backgroundColor: "#111827",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#f8fafc",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
};

const btechCourses = ["CSE", "CSD", "EEE", "AIML", "IT", "CSM"];
const recentYears = ["2026", "2025", "2024", "2023"];

const defaults = {
  cgpa: 7.5,
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

  if (profile.cgpa < 7) suggestions.push("Target CGPA >= 7.0 to unlock tier-1 company cutoffs");
  if (profile.backlogs > 0) suggestions.push("Clear active backlogs to prevent campus drive disqualification");
  if (profile.internships === 0) suggestions.push("Complete at least 1 practical software development internship");
  if (profile.communication < 7) suggestions.push("Practice behavioral STAR answers and weekly mock interviews");
  if (profile.coding < 7) suggestions.push("Master Blind 75 / Top 150 LeetCode patterns");

  if (chance >= 78) {
    return { chance, label: "Strong Candidate Profile", tone: "strong", suggestions };
  }
  if (chance >= 58) {
    return { chance, label: "Solid Foundation", tone: "steady", suggestions };
  }
  return { chance, label: "Needs Targeted Improvement", tone: "focus", suggestions };
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="text-emerald-400">{icon}</span>{label}
        </span>
        <span className="font-semibold text-white">{value}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 transition-all duration-500"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
      mass: 0.8,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
    },
  },
};

export default function Home() {
  const [profile, setProfile] = useState<Profile>(defaults);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [activeTab, setActiveTab] = useState<"calculator" | "analytics" | "coach" | "resume">("calculator");
  const [filters, setFilters] = useState({ year: "2025", branch: "", gender: "", skillCategory: "" });
  const { user, loading, isAuthenticated, logout } = useAuth();

  // AI Placement Coach State (Gemini 3.5 Flash)
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "system" | "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hello! I am your Pathfinder AI Placement Coach, powered by Gemini 3.5. How can I assist with your interview prep, DSA strategy, or campus readiness today?",
    },
  ]);
  const aiChat = trpc.ai.chat.useMutation({
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    },
  });

  // Resume ATS Analyzer State (Gemini 3.5 Flash)
  const [resumeText, setResumeText] = useState("");
  const resumeAnalyze = trpc.resume.analyze.useMutation();

  const result = useMemo(() => getResult(profile), [profile]);
  const recordsQuery = trpc.placement.records.useQuery(filters, { refetchOnWindowFocus: false });
  const yearRecordsQuery = trpc.placement.records.useQuery({ year: filters.year }, { refetchOnWindowFocus: false });
  const savePrediction = trpc.predictions.save.useMutation();
  const records = recordsQuery.data ?? [];
  const yearRecords = yearRecordsQuery.data ?? [];

  const filterOptions = useMemo(() => ({
    years: recentYears,
    branches: Array.from(new Set([...btechCourses, ...yearRecords.map((record) => record.branch)])),
    genders: ["Male", "Female"],
    skills: ["AIML + Python", ...Array.from(new Set(yearRecords.map((record) => record.skillCategory))).sort()],
  }), [yearRecords]);

  const coursePlacement = useMemo(() => {
    const byCourse = new Map<string, { placed: number; total: number }>();
    yearRecords.forEach((record) => {
      const current = byCourse.get(record.branch) ?? { placed: 0, total: 0 };
      byCourse.set(record.branch, { placed: current.placed + record.placed, total: current.total + 1 });
    });
    return Array.from(byCourse, ([course, value]) => ({
      course,
      placementRate: Math.round((value.placed / value.total) * 100),
      students: value.total,
    })).sort((a, b) => b.placementRate - a.placementRate);
  }, [yearRecords]);

  const skillPlacement = useMemo(() => {
    const bySkill = new Map<string, { placed: number; total: number }>();
    yearRecords.forEach((record) => {
      const current = bySkill.get(record.skillCategory) ?? { placed: 0, total: 0 };
      bySkill.set(record.skillCategory, { placed: current.placed + record.placed, total: current.total + 1 });
    });
    return Array.from(bySkill, ([skill, value]) => ({
      skill: skill.length > 18 ? `${skill.slice(0, 18)}…` : skill,
      placementRate: Math.round((value.placed / value.total) * 100),
      students: value.total,
    })).sort((a, b) => b.placementRate - a.placementRate);
  }, [yearRecords]);

  const placementSplit = useMemo(() => {
    const placed = records.filter((record) => record.placed === 1).length;
    const total = records.length || 1;
    return [
      { name: "Placed", value: Math.round((placed / total) * 100), color: "#10B981" },
      { name: "Not placed", value: Math.round(((total - placed) / total) * 100), color: "#F43F5E" },
    ];
  }, [records]);

  const cohortSkills = useMemo(() => {
    const average = (key: "cgpa" | "codingScore" | "communicationScore" | "internships") =>
      records.length
        ? Math.round(
            (records.reduce((sum, record) => sum + record[key], 0) / records.length) *
              (key === "internships" ? 10 : 1)
          )
        : 0;
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
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, values]) => ({
        month: String(year),
        score: Math.round((values.placed / values.total) * 100),
      }));
  }, [records]);

  const update = (key: keyof Profile, value: number) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setHasPredicted(false);
  };

  const reset = () => {
    setProfile(defaults);
    setHasPredicted(false);
  };

  const updateFilter = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const exportCsv = () => {
    const headers = [
      "year",
      "branch",
      "gender",
      "skillCategory",
      "placed",
      "cgpa",
      "codingScore",
      "communicationScore",
      "internships",
    ];
    const csv = [
      headers.join(","),
      ...records.map((record) =>
        [
          record.year,
          record.branch,
          record.gender,
          record.skillCategory,
          record.placed ? "Placed" : "Not placed",
          (record.cgpa / 10).toFixed(1),
          (record.codingScore / 10).toFixed(1),
          (record.communicationScore / 10).toFixed(1),
          record.internships,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pathfinder-placement-${filters.year || "all-years"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveCurrentPrediction = () => {
    setHasPredicted(true);
    if (isAuthenticated) savePrediction.mutate({ ...profile, chance: result.chance });
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || aiChat.isPending) return;
    const userMsg = { role: "user" as const, content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput("");
    aiChat.mutate({ messages: updated });
  };

  return (
    <main className="min-h-screen bg-[#090D16] text-white selection:bg-emerald-500/30">
      {/* Aurora Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-70">
        <div className="absolute -left-40 top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-[-10rem] top-20 h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-16rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-violet-500/10 blur-[130px]" />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-20 border-b border-slate-800/80 bg-[#090D16]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-[#090D16] shadow-lg shadow-emerald-500/20">
              <GraduationCap size={22} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-sm font-black tracking-[0.2em] text-emerald-400">PATHFINDER</p>
              <p className="text-xs text-slate-400">Campus Placement Readiness & Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            {loading ? (
              <span className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Checking account
              </span>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
                <span className="flex items-center gap-2 px-2 text-xs font-semibold text-emerald-300">
                  <UserRound size={14} /> <span className="max-w-[120px] truncate">{user.name || user.email || "Student"}</span>
                </span>
                <button
                  onClick={() => void logout()}
                  className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <LogOut size={13} /> Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startLogin()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:text-white"
                >
                  <LogIn size={14} /> Log in
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-8">
          {[
            { id: "calculator", label: "Readiness Calculator", icon: Target },
            { id: "analytics", label: "Cohort Analytics", icon: TrendingUp },
            { id: "coach", label: "AI Placement Coach (LLM)", icon: Bot },
            { id: "resume", label: "ATS Resume Review (LLM)", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === id
                  ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "border border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <Icon size={15} />
              {label}
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Main Tab Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
        <AnimatePresence mode="wait">
          {activeTab === "calculator" && (
            <motion.div
              key="calculator"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]"
            >
              {/* Left: Input Sliders */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <Sparkles size={13} /> Assessment Parameters
                    </span>
                    <h2 className="mt-3 text-2xl font-black sm:text-3xl">Evaluate Placement Readiness</h2>
                    <p className="mt-1 text-xs text-slate-400">Adjust your academic & skill profile to calculate probability score.</p>
                  </div>
                  <button
                    onClick={reset}
                    title="Reset form"
                    className="rounded-xl border border-slate-700 bg-slate-800/60 p-2.5 text-slate-400 transition hover:border-slate-600 hover:text-white"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Cumulative CGPA</span>
                        <span className="text-emerald-400">{profile.cgpa.toFixed(1)} / 10.0</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="10"
                        step="0.1"
                        value={profile.cgpa}
                        onChange={(e) => update("cgpa", Number(e.target.value))}
                        className="h-2 w-full cursor-pointer accent-emerald-400"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Active Backlogs</span>
                        <span className={profile.backlogs === 0 ? "text-emerald-400" : "text-rose-400"}>
                          {profile.backlogs} {profile.backlogs === 0 ? "(Clean)" : "Active"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="6"
                        value={profile.backlogs}
                        onChange={(e) => update("backlogs", Number(e.target.value))}
                        className="h-2 w-full cursor-pointer accent-emerald-400"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Internships Completed</span>
                      <span className="text-cyan-400">{profile.internships} completed</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={profile.internships}
                      onChange={(e) => update("internships", Number(e.target.value))}
                      className="h-2 w-full cursor-pointer accent-cyan-400"
                    />
                  </label>

                  <div className="space-y-4 border-t border-slate-800 pt-5">
                    <ScoreBar label="Communication Skills" value={profile.communication} icon={<MessageCircle size={16} />} />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={profile.communication}
                      onChange={(e) => update("communication", Number(e.target.value))}
                      className="h-2 w-full cursor-pointer accent-emerald-400"
                    />

                    <ScoreBar label="Coding & Problem Solving" value={profile.coding} icon={<Code2 size={16} />} />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={profile.coding}
                      onChange={(e) => update("coding", Number(e.target.value))}
                      className="h-2 w-full cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <button
                    onClick={saveCurrentPrediction}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-3.5 text-sm font-extrabold text-[#090D16] shadow-lg shadow-emerald-500/25 transition hover:brightness-110 active:scale-[0.99]"
                  >
                    Save Assessment & Get Snapshot <ArrowRight size={17} />
                  </button>
                </div>
              </motion.div>

              {/* Right: Results & Insights */}
              <div className="space-y-6">
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-[#0c1322] p-6 shadow-2xl backdrop-blur-xl sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Scorecard</span>
                      <h3 className="mt-1 text-2xl font-black">Estimated Chance</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        result.tone === "strong"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : result.tone === "steady"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {result.label}
                    </span>
                  </div>

                  <div className="my-8 flex items-center justify-center">
                    <div
                      className="relative grid h-44 w-44 place-items-center rounded-full border-[12px] border-slate-800"
                      style={{
                        background: `conic-gradient(#10B981 ${result.chance}%, rgba(16, 185, 129, 0.1) 0)`,
                      }}
                    >
                      <div className="grid h-[130px] w-[130px] place-items-center rounded-full bg-[#090D16]">
                        <div className="text-center">
                          <p className="text-4xl font-black text-white">{result.chance}%</p>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">Placement Probability</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommended Action Items</p>
                    <div className="mt-3 space-y-2.5">
                      {result.suggestions.map((suggestion) => (
                        <div key={suggestion} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                            <Check size={11} />
                          </span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Benchmark vs Cohort */}
                <motion.div
                  variants={cardVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <TrendingUp size={14} /> Benchmark vs 2024–2026 Cohort
                  </div>
                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400">
                        <span>Your CGPA ({profile.cgpa.toFixed(1)}) vs Peer Average (7.2)</span>
                        <span className={profile.cgpa >= 7.2 ? "text-emerald-400" : "text-amber-400"}>
                          {profile.cgpa >= 7.2 ? "+ Above" : "- Below"}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.min(100, (profile.cgpa / 10) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400">
                        <span>Internships ({profile.internships}) vs Peer Average (0.8)</span>
                        <span className={profile.internships >= 1 ? "text-cyan-400" : "text-amber-400"}>
                          {profile.internships >= 1 ? "+ Above" : "- Below"}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${Math.min(100, (profile.internships / 3) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

        {activeTab === "analytics" && (
          <motion.section
            key="analytics"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            {/* Header & Export */}
            <motion.div
              variants={cardVariants}
              className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:flex-row sm:items-center"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Cohort Insights</span>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">Placement Signals & Distributions</h2>
                <p className="mt-1 text-xs text-slate-400">Filter historical data across {records.length} sampled candidate profiles.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportCsv}
                  disabled={!records.length}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-xs font-bold text-[#090D16] shadow-sm transition hover:brightness-110 disabled:opacity-40"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </motion.div>

            {/* Filter Chips Bar */}
            <motion.div
              variants={cardVariants}
              className="grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {([
                ["year", "Graduation Year", filterOptions.years],
                ["branch", "Engineering Branch", filterOptions.branches],
                ["gender", "Gender", filterOptions.genders],
                ["skillCategory", "Skill Tier", filterOptions.skills],
              ] as const).map(([key, label, options]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                  <select
                    value={filters[key]}
                    onChange={(e) => updateFilter(key, e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#0F172A] px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-emerald-400"
                  >
                    <option value="">All {label}s</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </motion.div>

            {/* Visual Charts Grid */}
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Donut Chart */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <p className="text-sm font-bold text-white">Placement Outcomes</p>
                <p className="text-xs text-slate-400">Placed vs Not Placed ratio</p>
                <div className="relative mt-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={placementSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={4} stroke="none">
                        {placementSplit.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${val}%`, "Students"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-3xl font-black text-white">{placementSplit[0]?.value ?? 0}%</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">Placed</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Placed</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Not Placed</span>
                </div>
              </motion.div>

              {/* Profile vs Cohort Skills */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <p className="text-sm font-bold text-white">Your Profile vs Cohort Average</p>
                <p className="text-xs text-slate-400">Normalized score / 100</p>
                <div className="mt-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cohortSkills} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barGap={6}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="student" name="Your Profile" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cohort" name="Cohort Average" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Your Profile</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Cohort Avg</span>
                </div>
              </motion.div>

              {/* Yearly Trend */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <p className="text-sm font-bold text-white">Year-over-Year Campus Trend</p>
                <p className="text-xs text-slate-400">Placement rate progression</p>
                <div className="mt-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={readinessTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[40, 95]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(val) => [`${val}%`, "Placement Rate"]} />
                      <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: "#8B5CF6", r: 4 }} activeDot={{ r: 6, fill: "#10B981" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-xs text-slate-400">
                  <span>Current Class Placement:</span>
                  <span className="font-bold text-violet-400">{readinessTrend[readinessTrend.length - 1]?.score ?? 0}%</span>
                </div>
              </motion.div>
            </div>

            {/* Course & Skill Rankings */}
            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <p className="text-sm font-bold text-white">Engineering Branch Placement Success</p>
                <p className="text-xs text-slate-400">Selected year: {filters.year}</p>
                <div className="mt-4 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coursePlacement} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="course" width={65} tick={{ fill: "#e2e8f0", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}%`, "Placement rate"]} />
                      <Bar dataKey="placementRate" fill="#10B981" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                variants={cardVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6"
              >
                <p className="text-sm font-bold text-white">Skill Tier Impact</p>
                <p className="text-xs text-slate-400">Hiring rate by candidate skill domain</p>
                <div className="mt-4 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillPlacement} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                      <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="skill" width={110} tick={{ fill: "#e2e8f0", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${v}%`, "Placement rate"]} />
                      <Bar dataKey="placementRate" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}

        {activeTab === "coach" && (
          <motion.section
            key="coach"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <motion.div
              variants={cardVariants}
              className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl sm:p-8"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                    <Bot size={14} /> Powered by Gemini 3.5 Flash LLM
                  </div>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">AI Placement Mentor</h2>
                  <p className="text-xs text-slate-400">Ask real-time questions about interview prep, DSA problem roadmaps, and STAR answers.</p>
                </div>
              </div>

              {/* Quick Prompt Starters */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "How to raise placement probability from 65% to 85%?",
                  "Top 5 high-yield DSA patterns for campus drives",
                  "STAR method answer for 'Tell me about a challenging bug'",
                  "How to explain an academic gap in HR round",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-cyan-300 transition hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Thread */}
              <motion.div
                variants={cardVariants}
                className="mt-6 space-y-4 rounded-2xl border border-slate-800/80 bg-[#0B0F19] p-4 sm:p-6"
              >
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed sm:text-sm ${
                          msg.role === "user"
                            ? "bg-emerald-500/20 text-white border border-emerald-500/30"
                            : "bg-slate-900/80 text-slate-200 border border-slate-800 whitespace-pre-line"
                        }`}
                      >
                        <p className="mb-1 text-[11px] font-bold text-slate-400">
                          {msg.role === "user" ? "You" : "Gemini Placement Coach"}
                        </p>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {aiChat.isPending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
                        <Loader2 size={15} className="animate-spin text-cyan-400" />
                        Generating personalized advice...
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(chatInput);
                  }}
                  className="flex gap-2 border-t border-slate-800 pt-4"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about DSA, projects, or behavioral interview prep..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || aiChat.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-[#090D16] transition hover:brightness-110 disabled:opacity-40"
                  >
                    <Send size={14} /> Send
                  </button>
                </form>
              </motion.div>
            </motion.div>
          </motion.section>
        )}

        {activeTab === "resume" && (
          <motion.section
            key="resume"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6"
          >
            <motion.div
              variants={cardVariants}
              className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl sm:p-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
                <Sparkles size={14} /> Powered by Gemini 3.5 Flash LLM
              </div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">ATS Resume Reviewer</h2>
              <p className="text-xs text-slate-400">Paste your raw resume text to analyze keyword density, prioritized skill gaps, and ATS readiness.</p>

              <div className="mt-6 space-y-4">
                <textarea
                  rows={8}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content here (Education, Technical Skills, Projects, Experience, Certifications)..."
                  className="w-full rounded-2xl border border-slate-800 bg-[#0B0F19] p-4 text-xs text-slate-200 outline-none focus:border-violet-400"
                />

                <button
                  onClick={() => resumeAnalyze.mutate({ resumeText })}
                  disabled={resumeText.length < 30 || resumeAnalyze.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-xs font-extrabold text-[#090D16] transition hover:brightness-110 disabled:opacity-40"
                >
                  {resumeAnalyze.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Analyze Resume with Gemini
                </button>
              </div>

              {/* Analysis Result */}
              {resumeAnalyze.data && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="mt-8 space-y-6 rounded-2xl border border-slate-800 bg-[#0B0F19] p-6"
                >
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-violet-400">Executive Summary</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{resumeAnalyze.data.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Key Strengths Identified</h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {resumeAnalyze.data.strengths.map((str, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-slate-200">
                          <Check size={14} className="text-emerald-400" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Prioritized Skill Gaps</h3>
                    <div className="mt-2 space-y-2">
                      {resumeAnalyze.data.skillGaps.map((gap, i) => (
                        <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{gap.skill}</span>
                            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                              {gap.priority} Priority
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400">{gap.reason}</p>
                          <p className="mt-1 font-semibold text-cyan-300">Action: {gap.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Immediate Next Steps</h3>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-300">
                      {resumeAnalyze.data.nextSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
      </div>
    </main>
  );
}
