import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Code2,
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
  UserRound,
  Users,
} from "lucide-react";

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
  const { user, loading, isAuthenticated, logout } = useAuth();

  const result = useMemo(() => getResult(profile), [profile]);

  const update = (key: keyof Profile, value: number) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setHasPredicted(false);
  };

  const reset = () => {
    setProfile(defaults);
    setHasPredicted(false);
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

              <button onClick={() => setHasPredicted(true)} className="group mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3.5 font-bold text-[#07111f] shadow-lg shadow-emerald-300/10 transition hover:-translate-y-0.5 hover:bg-emerald-200 active:translate-y-0">
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

        <footer className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Pathfinder · Student Placement Predictor</span>
          <span className="flex items-center gap-2"><BriefcaseBusiness size={14} /> Educational demo — use real approved college data for final decisions.</span>
        </footer>
      </section>
    </main>
  );
}
