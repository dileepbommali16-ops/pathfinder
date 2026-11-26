import React, { useState, useEffect, useMemo } from "react";
import { ProjectBlueprint, DEFAULT_PROJECT_CATALOG } from "../../data/projectCatalog";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const handleHighlight = (e: any) => {
      const q = String(e?.detail?.query || e?.detail?.target || e?.detail?.projectId || "")
        .toLowerCase()
        .trim();
      if (!q) return;

      let matched = projectsList.find((p) => p.id.toLowerCase() === q);
      if (
        !matched &&
        (q.includes("chinna") ||
          q.includes("small") ||
          q.includes("beginner") ||
          q.includes("starter") ||
          q.includes("easy") ||
          q.includes("log") ||
          q.includes("anomaly") ||
          q.includes("detector"))
      ) {
        matched =
          projectsList.find(
            (p) =>
              p.title.toLowerCase().includes("anomaly") ||
              p.overview.toLowerCase().includes("anomaly") ||
              p.difficulty.toLowerCase().includes("intermediate") ||
              p.id === "proj-sde-1"
          ) || projectsList[0];
      }
      if (!matched) {
        matched = projectsList.find(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.techStack.some((t) => t.toLowerCase().includes(q)) ||
            p.domain.toLowerCase().includes(q) ||
            p.overview.toLowerCase().includes(q)
        );
      }

      if (matched) {
        const cat = (matched.category || "").toLowerCase();
        if (cat === "hardware") setActiveTab("hardware");
        else if (cat === "software") setActiveTab("software");
        else setActiveTab("all");

        setSearchQuery("");
        setHighlightedId(matched.id);

        setTimeout(() => {
          const el = document.getElementById(`project-card-${matched!.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 180);

        setTimeout(() => {
          setHighlightedId((curr) => (curr === matched!.id ? null : curr));
        }, 8000);
      }
    };

    window.addEventListener("das-highlight-project", handleHighlight);
    return () => {
      window.removeEventListener("das-highlight-project", handleHighlight);
    };
  }, [projectsList]);

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

  const filteredProjects = useMemo(() => {
    return projectsList.filter((proj) => {
      const cat = (proj.category || "").toLowerCase();
      if (activeTab === "software" && cat !== "software") return false;
      if (activeTab === "hardware" && cat !== "hardware") return false;

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
    <div className="space-y-10">
      {/* Single Clean Module Header */}
      <SpotlightSurface className="rounded-2xl p-8 sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-white/[0.1] bg-[#141418] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
            {counts.all} Blueprints
          </span>
          <span className="text-xs text-[#A1A1AA]">
            Target: {targetRole || "All Engineering Branches (CSE, ECE, EEE, Mech, Civil, Mining)"}
          </span>
        </div>

        <h1
          className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#FAFAFA] sm:text-3xl"
          style={{ textWrap: "balance" }}
        >
          Flagship Engineering Portfolio &amp; System Blueprints
        </h1>

        <p
          className="mt-2.5 max-w-3xl text-xs leading-[1.65] text-[#A1A1AA] sm:text-sm"
          style={{ textWrap: "pretty" }}
        >
          Explore <strong className="font-medium text-[#FAFAFA]">{counts.software} Software &amp; GenAI RAG</strong> and{" "}
          <strong className="font-medium text-[#FAFAFA]">{counts.hardware} Hardware &amp; IoT</strong>{" "}
          architectures spanning full-stack pipelines, robotics, GraphRAG, and embedded firmware.
        </p>

        {/* Filter Tabs & Spacious Search Input */}
        <div className="mt-7 flex flex-col gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {(
              [
                { id: "all", label: "All Architectures", count: counts.all },
                { id: "software", label: "Software Systems", count: counts.software },
                { id: "hardware", label: "Hardware & Embedded", count: counts.hardware },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-medium transition-colors cursor-pointer ${activeTab === t.id
                  ? "border-white/[0.28] bg-[#18181F] text-[#FAFAFA]"
                  : "border-white/[0.07] bg-[#0E0E12] text-[#A1A1AA] hover:border-white/[0.16] hover:text-[#FAFAFA]"
                  }`}
              >
                <span>{t.label}</span>
                <span className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-[#D4D4D8] tabular-nums">
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="w-full sm:w-80">
            <input
              id="project-blueprint-search"
              name="projectBlueprintSearch"
              aria-label="Search project blueprints"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, branch, tech, or domain..."
              className="pf-input h-10 w-full rounded-xl px-4 text-xs text-[#FAFAFA] placeholder-[#8A8A92]"
            />
          </div>
        </div>
      </SpotlightSurface>

      {/* Projects 2-Column Spacious Grid */}
      {filteredProjects.length === 0 ? (
        <div className="pf-titanium-card rounded-2xl p-14 text-center">
          <p className="text-sm font-medium text-[#A1A1AA]">
            No project blueprints matched your filter or search criteria.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs font-medium text-[#FAFAFA] underline underline-offset-4 cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          {filteredProjects.map((proj) => {
            const isCopied = copiedId === proj.id;
            const isHardware = (proj.category || "").toLowerCase() === "hardware";
            const isHighlighted = highlightedId === proj.id;
            const isSmall =
              (proj.difficulty || "").toLowerCase() === "intermediate" ||
              (proj.title || "").toLowerCase().includes("anomaly") ||
              (proj.title || "").toLowerCase().includes("telemetry") ||
              proj.id === "proj-sde-1";
            const isMedium = !isSmall && (proj.techStack?.length || 0) <= 4;
            const bpSize = isSmall ? "small" : isMedium ? "medium" : "large";
            const bpData = JSON.stringify({
              id: proj.id,
              title: proj.title,
              size: bpSize,
              difficulty: proj.difficulty,
              domain: proj.domain,
              techStack: proj.techStack,
              overview: proj.overview,
              architectureSummary: proj.architectureSummary,
            });

            const notifyActiveProject = () => {
              try {
                const prev = (window as any).__DAS_PAGE_CONTEXT__ || {};
                const nextCtx = {
                  ...prev,
                  activeProject: proj.title,
                  projectTitle: proj.title,
                  cardContext: `${proj.title} (${proj.domain || proj.category || "Blueprint"})`,
                  timestamp: Date.now(),
                };
                (window as any).__DAS_PAGE_CONTEXT__ = nextCtx;
                window.dispatchEvent(new CustomEvent("das:page-context", { detail: nextCtx }));
              } catch { }
            };

            return (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                data-project-id={proj.id}
                data-blueprint-size={bpSize}
                data-size={bpSize}
                data-blueprint-data={bpData}
                data-difficulty={proj.difficulty}
                onMouseEnter={notifyActiveProject}
                onClick={notifyActiveProject}
                className={`flex flex-col justify-between rounded-2xl border p-7 sm:p-9 transition-colors duration-200 ${isHighlighted
                  ? "border-[#FAFAFA] bg-[#14141A]/90 ring-2 ring-white/30"
                  : "pf-titanium-card"
                  }`}
              >
                <div className="space-y-4">
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] font-medium text-[#FAFAFA]">
                        {isHardware ? "Hardware & Embedded" : "Software Systems"}
                      </span>
                      {proj.domain && (
                        <span className="rounded border border-[#222226] bg-[#0C0C0E] px-2 py-0.5 text-[10px] text-[#A1A1AA]">
                          {proj.domain}
                        </span>
                      )}
                      {isHighlighted && (
                        <span className="rounded border border-[#FAFAFA]/40 bg-[#18181E] px-2 py-0.5 font-mono text-[10px] font-medium text-[#FAFAFA]">
                          Recommended
                        </span>
                      )}
                    </div>

                    <span className="rounded border border-[#222226] bg-[#0C0C0E] px-2 py-0.5 font-mono text-[10px] text-[#A1A1AA]">
                      {proj.difficulty}
                    </span>
                  </div>

                  {(proj.organization || proj.branch) && (
                    <div className="space-y-1 text-[11px] text-[#A1A1AA]">
                      {proj.organization && (
                        <div className="text-[#D4D4D8]">Org: {proj.organization}</div>
                      )}
                      {proj.branch && <div>Branches: {proj.branch}</div>}
                    </div>
                  )}

                  {/* Title & Overview */}
                  <div>
                    <h2 className="text-base font-semibold leading-snug tracking-tight text-[#FAFAFA]">
                      {proj.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#A1A1AA]">
                      {proj.overview}
                    </p>
                  </div>

                  {proj.architectureSummary && (
                    <div className="rounded-xl border border-[#222226] bg-[#101014] p-3 text-[11px] leading-relaxed text-[#D4D4D8]">
                      <span className="font-medium text-[#FAFAFA]">Architecture: </span>
                      {proj.architectureSummary}
                    </div>
                  )}

                  {/* Tech Stack Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded border border-[#222226] bg-[#101014] px-2 py-0.5 text-[11px] font-medium text-[#E4E4E7]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 pt-1">
                    <span className="block font-mono text-[10px] text-[#8A8A92]">
                      Key Implementation Features
                    </span>
                    <ul className="space-y-1.5">
                      {proj.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs leading-snug text-[#D4D4D8]"
                        >
                          <span className="font-mono text-[10px] text-[#8A8A92] tabular-nums">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resume Ready Bullet */}
                  <div className="space-y-1.5 rounded-xl border border-[#222226] bg-[#101014] p-3.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#A1A1AA]">
                      <span>Google X-Y-Z Resume Bullet</span>
                      <button
                        type="button"
                        onClick={() => handleCopyBullet(proj.id, proj.resumeBullet)}
                        className="text-[10px] font-medium text-[#FAFAFA] hover:underline cursor-pointer"
                        title="Copy bullet point to clipboard"
                      >
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#A1A1AA]">
                      {proj.resumeBullet}
                    </p>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      notifyActiveProject();
                      try {
                        sessionStorage.setItem("pathfinder_blueprint_voice_trigger", "true");
                      } catch { }
                      onAskCoach(
                        `Let's discuss how to build '${proj.title}'. What should the complete system architecture, component stack, 5-phase build roadmap, and top technical interview defense talking points look like?`
                      );
                    }}
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#27272A] bg-[#141418] text-xs font-medium text-[#FAFAFA] transition-colors hover:border-[#3F3F46] hover:bg-[#1C1C22] active:scale-[0.98] cursor-pointer"
                  >
                    Discuss Architecture with AI Coach
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
