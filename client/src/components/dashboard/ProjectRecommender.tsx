import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ProjectBlueprint,
  DEFAULT_PROJECT_CATALOG,
  findBestMatchingBlueprint,
  buildProjectExecutionSteps,
} from "../../data/projectCatalog";
import { SpotlightSurface } from "@/components/ui/TitaniumPrimitives";

interface ProjectRecommenderProps {
  targetRole?: string;
  onAskCoach: (query: string) => void;
  apiBase?: string;
}

type CategoryTab = "all" | "starter" | "software" | "hardware";

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
  const [expandedGuideId, setExpandedGuideId] = useState<string | null>(null);

  const focusAndHighlightBlueprint = useCallback(
    (rawQueryOrId: string, shouldOpenGuide = true) => {
      const q = String(rawQueryOrId || "").trim();
      if (!q) return;

      const { project: matched, index: bpNum } = findBestMatchingBlueprint(q, projectsList);
      if (!matched) return;

      setActiveTab("all");
      setSearchQuery("");
      setHighlightedId(matched.id);
      if (shouldOpenGuide) {
        setExpandedGuideId(matched.id);
      }

      try {
        const prev = (window as any).__DAS_PAGE_CONTEXT__ || {};
        const nextCtx = {
          ...prev,
          activeTab: "projects",
          activeProject: matched.title,
          projectTitle: matched.title,
          blueprintNumber: bpNum,
          cardContext: `Blueprint #${String(bpNum).padStart(2, "0")}: ${matched.title} (${matched.difficulty})`,
          timestamp: Date.now(),
        };
        (window as any).__DAS_PAGE_CONTEXT__ = nextCtx;
        window.dispatchEvent(new CustomEvent("das:page-context", { detail: nextCtx }));
      } catch { }

      const scrollCardIntoCenter = () => {
        const el = document.getElementById(`project-card-${matched.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      };
      window.setTimeout(scrollCardIntoCenter, 140);
      window.setTimeout(scrollCardIntoCenter, 420);

      window.setTimeout(() => {
        setHighlightedId((curr) => (curr === matched.id ? null : curr));
      }, 14000);
    },
    [projectsList]
  );

  useEffect(() => {
    const consumePendingHighlight = () => {
      if (typeof window === "undefined") return;
      const pending = (window as any).__DAS_PENDING_PROJECT_HIGHLIGHT__;
      if (pending && Date.now() - Number(pending.ts || 0) < 15000) {
        delete (window as any).__DAS_PENDING_PROJECT_HIGHLIGHT__;
        focusAndHighlightBlueprint(
          pending.projectId || pending.query || pending.target || "",
          pending.openGuide !== false
        );
      }
    };

    consumePendingHighlight();

    const handleHighlight = (e: any) => {
      if (typeof window !== "undefined") {
        delete (window as any).__DAS_PENDING_PROJECT_HIGHLIGHT__;
      }
      const q = String(
        e?.detail?.projectId || e?.detail?.query || e?.detail?.target || ""
      ).trim();
      if (!q) return;
      focusAndHighlightBlueprint(q, e?.detail?.openGuide !== false);
    };

    const handleOpenBlueprintNum = (e: any) => {
      const n = Number(e?.detail?.blueprintNumber || 0);
      if (n >= 1) {
        focusAndHighlightBlueprint(`blueprint ${n}`, true);
      }
    };

    const handleFilterProjects = (e: any) => {
      const branch = String(e?.detail?.branch || e?.detail?.query || "").trim();
      setActiveTab("all");
      setSearchQuery(branch);
    };

    window.addEventListener("das-highlight-project", handleHighlight);
    window.addEventListener("das-open-blueprint", handleOpenBlueprintNum);
    window.addEventListener("das-filter-projects", handleFilterProjects);
    return () => {
      window.removeEventListener("das-highlight-project", handleHighlight);
      window.removeEventListener("das-open-blueprint", handleOpenBlueprintNum);
      window.removeEventListener("das-filter-projects", handleFilterProjects);
    };
  }, [focusAndHighlightBlueprint]);

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
      const diff = (proj.difficulty || "").toLowerCase();
      if (activeTab === "starter" && diff !== "starter" && diff !== "intermediate") return false;
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
      starter: projectsList.filter((p) => {
        const d = (p.difficulty || "").toLowerCase();
        return d === "starter" || d === "intermediate";
      }).length,
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
                { id: "starter", label: "Small & Starter", count: counts.starter },
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
            const catalogIdx = Math.max(
              1,
              projectsList.findIndex((item) => item.id === proj.id) + 1
            );
            const isCopied = copiedId === proj.id;
            const isHardware = (proj.category || "").toLowerCase() === "hardware";
            const isHighlighted = highlightedId === proj.id;
            const isGuideOpen = expandedGuideId === proj.id;
            const diffLower = (proj.difficulty || "").toLowerCase();
            const isSmall = diffLower === "starter";
            const isMedium = diffLower === "intermediate";
            const bpSize = isSmall ? "small" : isMedium ? "medium" : "large";
            const buildSteps = buildProjectExecutionSteps(proj, catalogIdx);
            const bpData = JSON.stringify({
              id: proj.id,
              blueprintNumber: catalogIdx,
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
                  blueprintNumber: catalogIdx,
                  cardContext: `Blueprint #${String(catalogIdx).padStart(2, "0")}: ${proj.title} (${proj.domain || proj.category || "Blueprint"})`,
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
                data-blueprint-number={catalogIdx}
                data-blueprint-size={bpSize}
                data-size={bpSize}
                data-blueprint-data={bpData}
                data-difficulty={proj.difficulty}
                onMouseEnter={notifyActiveProject}
                onClick={notifyActiveProject}
                className={`flex flex-col justify-between rounded-2xl border p-7 sm:p-9 transition-all duration-200 ${isHighlighted
                  ? "border-[#FAFAFA] bg-[#14141A]/95 ring-2 ring-white/35 shadow-[0_0_40px_rgba(255,255,255,0.12)]"
                  : "pf-titanium-card"
                  }`}
              >
                <div className="space-y-4">
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-white/[0.14] bg-[#16161D] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#FAFAFA] tabular-nums">
                        #{String(catalogIdx).padStart(2, "0")}
                      </span>
                      <span className="rounded border border-[#27272A] bg-[#101014] px-2 py-0.5 font-mono text-[10px] font-medium text-[#FAFAFA]">
                        {isHardware ? "Hardware & Embedded" : "Software Systems"}
                      </span>
                      {proj.domain && (
                        <span className="rounded border border-[#222226] bg-[#0C0C0E] px-2 py-0.5 text-[10px] text-[#A1A1AA]">
                          {proj.domain}
                        </span>
                      )}
                      {isHighlighted && (
                        <span className="rounded border border-[#FAFAFA]/50 bg-[#FAFAFA] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#09090B]">
                          Selected by DAS
                        </span>
                      )}
                    </div>

                    <span className="rounded border border-[#27272A] bg-[#0C0C0E] px-2 py-0.5 font-mono text-[10px] text-[#D4D4D8]">
                      {isSmall ? "Starter · 4–6 Days" : isMedium ? "Intermediate · 1–2 Wks" : proj.difficulty}
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

                  {isGuideOpen && (
                    <div
                      data-build-guide={proj.id}
                      className="space-y-3 rounded-xl border border-white/[0.16] bg-[#0B0B10] p-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                        <span className="font-mono text-[11px] font-semibold text-[#FAFAFA]">
                          5-Step Build &amp; Deployment Roadmap · Blueprint #{String(catalogIdx).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedGuideId(null)}
                          className="font-mono text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      <ol className="space-y-2.5">
                        {buildSteps.map((st) => (
                          <li key={st.phase} className="space-y-0.5 text-xs leading-relaxed">
                            <div className="font-medium text-[#FAFAFA]">
                              <span className="mr-2 font-mono text-[10px] text-[#8A8A92]">
                                {st.phase}
                              </span>
                              {st.title}
                            </div>
                            <p className="text-[11px] leading-relaxed text-[#A1A1AA]">{st.detail}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      notifyActiveProject();
                      setExpandedGuideId((prev) => (prev === proj.id ? null : proj.id));
                    }}
                    className="pf-btn-secondary inline-flex h-10 w-full items-center justify-center rounded-lg px-3 text-xs font-medium text-[#FAFAFA] active:scale-[0.98] cursor-pointer"
                  >
                    {isGuideOpen ? "Hide Build Steps" : "How to Build (5 Steps)"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      notifyActiveProject();
                      setExpandedGuideId(proj.id);
                      try {
                        sessionStorage.setItem("pathfinder_blueprint_voice_trigger", "true");
                      } catch { }
                      onAskCoach(
                        `Explain step-by-step how to build Blueprint #${String(catalogIdx).padStart(2, "0")} '${proj.title}' (${proj.techStack.join(", ")}), including VS Code folder layout, core pipeline (${proj.architectureSummary || proj.domain}), deployment on Vercel and Render, and viva defense points.`
                      );
                    }}
                    className="pf-btn-primary inline-flex h-10 w-full items-center justify-center rounded-lg px-3 text-xs font-medium active:scale-[0.98] cursor-pointer"
                  >
                    Ask DAS to Explain Build
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
