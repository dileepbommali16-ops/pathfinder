import React, { useState, useEffect, useMemo } from "react";
import {
  Lightbulb,
  Code2,
  Layers,
  ArrowRight,
  Sparkles,
  Bot,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Cpu,
  Laptop,
  Trophy,
  Building2,
  GraduationCap
} from "lucide-react";
import {
  ProjectBlueprint,
  DEFAULT_PROJECT_CATALOG
} from "../../data/projectCatalog";

interface ProjectRecommenderProps {
  targetRole?: string;
  onAskCoach: (query: string) => void;
  apiBase?: string;
}

type CategoryTab = "all" | "software" | "hardware";

export const ProjectRecommender: React.FC<ProjectRecommenderProps> = ({
  targetRole,
  onAskCoach,
  apiBase,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectBlueprint[]>(DEFAULT_PROJECT_CATALOG);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState<string>("" );

  useEffect(() => {
    let isMounted = true;
    const url = apiBase ? `${apiBase}/api/data/projects` : "/api/data/projects";

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          setProjectsList(data);
        }
      })
      .catch((err) => {
        // Silently preserve high-fidelity default catalog if offline
        console.warn("Projects API fetch notice, using fallback catalog:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBase]);

  const handleCopyBullet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered projects computation
  const filteredProjects = useMemo(() => {
    return projectsList.filter((proj) => {
      // Category filter
      const cat = (proj.category || "").toLowerCase();
      if (activeTab === "software" && cat !== "software") return false;
      if (activeTab === "hardware" && cat !== "hardware") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = proj.title.toLowerCase().includes(q);
        const matchesDomain = (proj.domain || "").toLowerCase().includes(q);
        const matchesOverview = (proj.overview || "").toLowerCase().includes(q);
        const matchesBranch = (proj.branch || "").toLowerCase().includes(q);
        const matchesOrg = (proj.organization || "").toLowerCase().includes(q);
        const matchesTech = proj.techStack.some((t) => t.toLowerCase().includes(q));

        if (
          !matchesTitle &&
          !matchesDomain &&
          !matchesOverview &&
          !matchesBranch &&
          !matchesOrg &&
          !matchesTech
        ) {
          return false;
        }
      }

      return true;
    });
  }, [projectsList, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: projectsList.length,
      software: projectsList.filter((p) => (p.category || "").toLowerCase() === "software").length,
      hardware: projectsList.filter((p) => (p.category || "").toLowerCase() === "hardware").length,
    };
  }, [projectsList]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#11131c] p-6 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-3 py-1 text-xs font-semibold text-[#7c3aed]">
              <Lightbulb className="h-3.5 w-3.5" />
              Flagship Portfolio & System Architectures
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs text-[#94a3b8]">
              Target: {targetRole || "All Engineering Branches (CSE, ECE, EEE, Mech, Civil, Mining)"}
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#f8fafc] sm:text-3xl">
            Engineering Portfolio & System Architecture Blueprints
          </h1>

          <p className="text-sm leading-relaxed text-[#94a3b8]">
            Top recruiters and technical evaluators look for production-grade end-to-end engineered systems over simple tutorials. Explore <strong className="text-[#7c3aed]">{counts.software} Software & GenAI RAG</strong> and <strong className="text-[#7c3aed]">{counts.hardware} Hardware & IoT</strong> architectures spanning full-stack pipelines, robotics, enterprise GraphRAG, and embedded firmware. Click any project to discuss system architecture with the AI Coach!
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/20"
                : "border border-white/[0.08] bg-[#0a0b10] text-[#94a3b8] hover:border-[#7c3aed]/30 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>All Architectures</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${activeTab === "all" ? "bg-black/30 text-white" : "bg-white/10 text-[#94a3b8]"}`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("software")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "software"
                ? "bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/20"
                : "border border-white/[0.08] bg-[#0a0b10] text-[#94a3b8] hover:border-[#7c3aed]/30 hover:text-white"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>Software Systems</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${activeTab === "software" ? "bg-black/30 text-white" : "bg-white/10 text-[#94a3b8]"}`}>
              {counts.software}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("hardware")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "hardware"
                ? "bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/20"
                : "border border-white/[0.08] bg-[#0a0b10] text-[#94a3b8] hover:border-[#7c3aed]/30 hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Hardware & Embedded</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${activeTab === "hardware" ? "bg-black/30 text-white" : "bg-white/10 text-[#94a3b8]"}`}>
              {counts.hardware}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, branch, tech, or domain..."
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0b10] py-2 pl-9 pr-3 text-xs text-[#f8fafc] placeholder-[#94a3b8] outline-none transition focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#0a0b10] p-12 text-center">
          <p className="text-sm font-semibold text-[#94a3b8]">No project blueprints matched your filter or search criteria.</p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs font-bold text-[#7c3aed] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {filteredProjects.map((proj) => {
            const isCopied = copiedId === proj.id;
            const isHardware = (proj.category || "").toLowerCase() === "hardware";

            return (
              <div
                key={proj.id}
                className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#0a0b10] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-300 hover:border-[#7c3aed]/30 hover:bg-[#11131c]"
              >
                <div className="space-y-4">
                  {/* Badges / Header */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-white/[0.08] bg-[#11131c] text-[#f8fafc]">
                        {isHardware ? <Cpu className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
                        {isHardware ? "Hardware & Embedded" : "Software Systems"}
                      </span>
                      {proj.domain && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#11131c] px-2 py-0.5 text-[10px] font-medium text-[#7c3aed]">
                          {proj.domain}
                        </span>
                      )}
                    </div>

                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-[#94a3b8]">
                      {proj.difficulty}
                    </span>
                  </div>

                  {/* Sponsoring Org & Branch Tagging */}
                  {(proj.organization || proj.branch) && (
                    <div className="space-y-1">
                      {proj.organization && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7c3aed]">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#7c3aed]" />
                          <span>Org: {proj.organization}</span>
                        </div>
                      )}
                      {proj.branch && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#94a3b8]">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                          <span>Branches: {proj.branch}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title & Overview */}
                  <div>
                    <h2 className="text-base font-bold text-[#f8fafc] tracking-tight leading-snug">
                      {proj.title}
                    </h2>
                    <p className="mt-2 text-xs text-[#94a3b8] leading-relaxed line-clamp-3">
                      {proj.overview}
                    </p>
                  </div>

                  {/* Architecture Summary (if present) */}
                  {proj.architectureSummary && (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#11131c] p-3 text-[11px] leading-relaxed text-[#f8fafc]">
                      <span className="font-bold text-[#7c3aed]">Architecture: </span>
                      {proj.architectureSummary}
                    </div>
                  )}

                  {/* Tech Stack Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-lg border border-white/[0.08] bg-[#11131c] px-2 py-0.5 text-[11px] font-medium text-[#f8fafc]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Key Implementation Features */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                      Key Implementation Features:
                    </span>
                    <ul className="space-y-1.5">
                      {proj.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#f8fafc]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#7c3aed] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resume Ready Bullet */}
                  <div className="rounded-2xl border border-white/[0.08] bg-[#11131c] p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#94a3b8]">
                      <span>Google X-Y-Z Resume Bullet:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyBullet(proj.id, proj.resumeBullet)}
                        className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:text-[#7c3aed] transition-colors cursor-pointer"
                        title="Copy bullet point to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-[#7c3aed]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] italic text-[#94a3b8] leading-relaxed">
                      "{proj.resumeBullet}"
                    </p>
                  </div>
                </div>

                {/* Action Button: Handoff to AI Coach */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                        try {
                          if (window.speechSynthesis.paused) {
                            window.speechSynthesis.resume();
                          }
                          const dummy = new SpeechSynthesisUtterance("");
                          dummy.volume = 0;
                          window.speechSynthesis.speak(dummy);
                        } catch {}
                      }
                      try {
                        sessionStorage.setItem("pathfinder_blueprint_voice_trigger", "true");
                      } catch {}
                      onAskCoach(
                        `Let's discuss how to build '${proj.title}'. What should the complete system architecture, component stack, 5-phase build roadmap, and top technical interview defense talking points look like?`
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/30 py-2.5 text-xs font-bold text-white transition-all hover:bg-[#7c3aed]/20 hover:border-[#7c3aed]/50 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Bot className="h-3.5 w-3.5 text-[#7c3aed]" />
                    <span>Discuss Architecture with AI Coach</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
