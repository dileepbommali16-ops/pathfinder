import { useState, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { trpc } from "../lib/trpc";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Bot,
  Briefcase,
  Check,
  Code2,
  Compass,
  ExternalLink,
  Filter,
  Globe,
  HelpCircle,
  Lightbulb,
  Loader2,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

export interface IndustryNewsFeedProps {
  userProfile: {
    cgpa: number;
    backlogs: number;
    coding: number;
    communication: number;
    internships: number;
    chance: number;
    label: string;
  };
  targetRole: string;
  targetTier: string;
  onConsultCoachWithTrend: (title: string, source: string, takeaway: string) => void;
}

const CATEGORIES = [
  { id: "all", label: "All Industry Trends" },
  { id: "placements", label: "Campus Placements 2025/26" },
  { id: "hiring", label: "Tech & IT Hiring" },
  { id: "dsa", label: "DSA & Coding Rounds" },
  { id: "internships", label: "Internships & PPOs" },
  { id: "ai_skills", label: "AI & Cloud Skills Demand" },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

export default function IndustryNewsFeed({
  userProfile,
  targetRole,
  targetTier,
  onConsultCoachWithTrend,
}: IndustryNewsFeedProps) {
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("pathfinder_saved_news_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, string>>({});

  const newsQuery = trpc.news.getFeed.useQuery(
    {
      query: submittedQuery || undefined,
      category: selectedCategory,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    }
  );

  const summarizeMutation = trpc.news.summarizeTrend.useMutation();

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedQuery(searchInput.trim());
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setSubmittedQuery("");
  };

  const toggleSaveArticle = (id: string) => {
    setSavedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("pathfinder_saved_news_ids", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleAnalyzeArticle = (item: any) => {
    if (expandedAnalysisId === item.id) {
      setExpandedAnalysisId(null);
      return;
    }
    setExpandedAnalysisId(item.id);
    if (!analysisCache[item.id]) {
      summarizeMutation.mutate(
        {
          title: item.title,
          snippet: item.snippet,
          category: item.category,
          userContext: {
            cgpa: userProfile.cgpa,
            coding: userProfile.coding,
            targetRole,
          },
        },
        {
          onSuccess: (res) => {
            setAnalysisCache((prev) => ({ ...prev, [item.id]: res }));
          },
        }
      );
    }
  };

  const allItems = newsQuery.data?.items || [];
  const filteredItems = useMemo(() => {
    if (showSavedOnly) {
      return allItems.filter((item) => savedIds.includes(item.id));
    }
    return allItems;
  }, [allItems, showSavedOnly, savedIds]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (diffHours <= 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.round(diffHours / 24);
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 30) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recent";
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "AI & Cloud Skills":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "DSA & Tech Rounds":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "Internships & Jobs":
        return "bg-violet-500/15 text-violet-300 border-violet-500/30";
      case "Tech Hiring":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl sm:p-8"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
              <Globe size={14} /> Google Search API & Live News Intelligence
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Industry Hiring Trends & Placement Feed
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-3xl">
              Real-time campus drive data, recruiter evaluation criteria, algorithmic testing patterns, and actionable placement tips curated specifically for BTech students.
            </p>
          </div>

          {/* Live Data Connection Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-[#0B0F19] px-3.5 py-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-300">
                {newsQuery.data?.provider || "Google Search Engine"}
              </span>
            </div>
            <button
              onClick={() => newsQuery.refetch()}
              disabled={newsQuery.isFetching}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-500/40 hover:text-white disabled:opacity-50"
              title="Fetch latest Google Search results"
            >
              <RefreshCw size={14} className={newsQuery.isFetching ? "animate-spin text-cyan-400" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search & Topic Filter Controls */}
        <div className="mt-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search hiring trends, company drives (e.g. 'TCS NQT 2026', 'Amazon OA', 'Fintech internships', 'DSA patterns')..."
                className="w-full rounded-2xl border border-slate-800 bg-[#0B0F19] pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-3 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition hover:opacity-95 active:scale-95"
            >
              <Search size={14} /> Search
            </button>
          </form>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
              <Filter size={12} /> Topics:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setShowSavedOnly(false);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat.id && !showSavedOnly
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}

            {/* Saved Articles Toggle */}
            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                showSavedOnly
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <Bookmark size={13} className={showSavedOnly ? "fill-amber-400 text-amber-400" : ""} />
              Saved Tips ({savedIds.length})
            </button>
          </div>
        </div>
      </motion.div>

      {/* Macro Hiring Signals Barometer (3 Key Takeaways) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Code2 size={16} /> OA Screening Benchmark
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Online Assessments (OAs) in 2025/2026 are heavily prioritizing <strong className="text-white">pattern recognition</strong> (Sliding Window, Binary Search, Trees) over brute-force solutions.
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Zap size={16} /> AI Project Premium
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Resumes featuring deployed applications with <strong className="text-white">real-time AI APIs (Gemini/OpenAI)</strong> and containerized pipelines receive a 35% higher interview conversion rate.
          </p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-violet-400">
            <Briefcase size={16} /> Pre-Placement Offers (PPOs)
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Over <strong className="text-white">40% of full-time hires</strong> at top product startups now originate from 6-month winter/summer internship performance.
          </p>
        </motion.div>
      </div>

      {/* Feed Status Summary */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <div>
          Showing {filteredItems.length} {showSavedOnly ? "saved" : "latest"} trends
          {submittedQuery ? ` matching "${submittedQuery}"` : ""}
        </div>
        {newsQuery.data?.lastUpdated && (
          <div>Updated: {new Date(newsQuery.data.lastUpdated).toLocaleTimeString()}</div>
        )}
      </div>

      {/* Loading Skeletons */}
      {newsQuery.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40 p-6"
            >
              <div className="h-4 w-1/4 rounded bg-slate-800" />
              <div className="mt-3 h-6 w-3/4 rounded bg-slate-800" />
              <div className="mt-3 h-16 w-full rounded bg-slate-800/60" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!newsQuery.isLoading && filteredItems.length === 0 && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
          <Newspaper size={40} className="mx-auto text-slate-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-300">No industry trends found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {showSavedOnly
              ? "You have not saved any placement tips yet. Click the bookmark icon on any article to save it."
              : `No news matched "${submittedQuery}". Try searching for broader terms like "campus placement", "DSA", or "IT hiring".`}
          </p>
          <button
            onClick={() => {
              setShowSavedOnly(false);
              handleResetSearch();
              setSelectedCategory("all");
            }}
            className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Feed Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => {
          const isSaved = savedIds.includes(item.id);
          const isExpanded = expandedAnalysisId === item.id;
          const deepAnalysis = analysisCache[item.id];

          return (
            <motion.div
              key={item.id || index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="group rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl transition hover:border-slate-700 sm:p-7"
            >
              {/* Card Meta Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${getCategoryBadgeClass(
                      item.category
                    )}`}
                  >
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-400">
                    <Globe size={12} className="text-slate-500" /> {item.source}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">{formatRelativeTime(item.pubDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleSaveArticle(item.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isSaved
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                    title={isSaved ? "Remove bookmark" : "Save placement tip"}
                  >
                    {isSaved ? <BookmarkCheck size={14} className="text-amber-400" /> : <Bookmark size={14} />}
                    {isSaved ? "Saved" : "Save"}
                  </button>

                  {/* External Article Link */}
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
                    title="Read original source"
                  >
                    <ExternalLink size={13} /> Source
                  </a>
                </div>
              </div>

              {/* Title & Snippet */}
              <div className="mt-4">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-black tracking-tight text-white transition hover:text-cyan-300 sm:text-lg"
                >
                  {item.title}
                </a>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.snippet}</p>
              </div>

              {/* Dual Intelligence Callout: Key Takeaway & Placement Tip */}
              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Lightbulb size={14} /> Key Industry Takeaway
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{item.keyTakeaway}</p>
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Target size={14} /> Actionable Placement Tip
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">{item.placementTip}</p>
                </div>
              </div>

              {/* In-demand Skills Tags */}
              {item.skills && item.skills.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                    Related Skills:
                  </span>
                  {item.skills.map((skill: string, sIdx: number) => (
                    <span
                      key={sIdx}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Expandable Gemini Deep-Dive Impact Box */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                          <Sparkles size={14} /> Gemini Tactical Impact Analysis (Adapted for {targetRole})
                        </div>
                        {summarizeMutation.isPending && (
                          <div className="flex items-center gap-1 text-[11px] text-violet-400">
                            <Loader2 size={12} className="animate-spin" /> Analyzing trend with candidate context...
                          </div>
                        )}
                      </div>
                      <div className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-slate-200">
                        {deepAnalysis || (
                          <span className="text-slate-400 italic">
                            Synthesizing hiring implications based on your CGPA ({userProfile.cgpa.toFixed(1)}) and coding score ({userProfile.coding}/10)...
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Card Footer Actions */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Action 1: Consult AI Placement Coach */}
                  <button
                    onClick={() =>
                      onConsultCoachWithTrend(item.title, item.source, item.keyTakeaway)
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-98"
                  >
                    <Bot size={14} /> Ask Coach About This Trend <ArrowRight size={13} />
                  </button>

                  {/* Action 2: Deep AI Tactical Analysis */}
                  <button
                    onClick={() => handleAnalyzeArticle(item)}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3.5 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-500/20 active:scale-98"
                  >
                    <Sparkles size={14} /> {isExpanded ? "Hide AI Breakdown" : "Personalized AI Impact"}
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  Target: {targetRole.split(" ")[0]} · {targetTier.split(" ")[0]}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
