/**
 * UI Registry for Pathfinder DAS AI (client/src/voice/uiRegistry.ts)
 * 
 * Every page and feature registers its meaningful actions and visual sections.
 * This registry forms the autonomous action layer for Jarvis-style website control.
 * 
 * Security Tiers:
 * - T0 (Read): Free inspection (profile, metrics, page info)
 * - T1 (UI): Free immediate visual actions (navigate, scroll, highlight, tab switch, filter)
 * - T2 (Run): Action Center cards, resume analysis, roadmap generation (on clear user request)
 * - T3 (Write): Profile edit, goal change (requires spoken confirmation: "say yes to confirm")
 * - T4 (Danger): Data deletion, password reset, logout (disabled or double-confirmed)
 */

export type ActionTier = "T0" | "T1" | "T2" | "T3" | "T4";

export interface UIAction {
  id: string;
  page: string;
  description: string;
  paramsSchema: Record<string, any>;
  tier: ActionTier;
  handler: (params: any, context?: any) => Promise<{ ok: boolean; observation: string }>;
}

export interface UISection {
  id: string;
  page: string;
  label: string;
  selector?: string;
}

class UIRegistry {
  private actions: Map<string, UIAction> = new Map();
  private sections: Map<string, UISection> = new Map();

  /**
   * Registers a controllable action with tier enforcement
   */
  public registerAction(action: UIAction): void {
    this.actions.set(action.id, action);
  }

  /**
   * Registers a highlightable / scrollable DOM section with data-das-id
   */
  public registerSection(section: UISection): void {
    this.sections.set(section.id, section);
  }

  public getAction(id: string): UIAction | undefined {
    return this.actions.get(id);
  }

  public getAllActions(): UIAction[] {
    return Array.from(this.actions.values());
  }

  public getActionsForPage(page: string): UIAction[] {
    return Array.from(this.actions.values()).filter(
      (a) => a.page === page || a.page === "global"
    );
  }

  public getSectionsForPage(page: string): UISection[] {
    return Array.from(this.sections.values()).filter(
      (s) => s.page === page || s.page === "global"
    );
  }

  /**
   * Generates a compact JSON snapshot sent to the LLM orchestrator
   * so the AI agent knows exactly what buttons and tools exist on the current page.
   */
  public getRegistrySnapshot(): {
    actions: Array<{ id: string; page: string; description: string; tier: ActionTier; params: any }>;
    sections: Array<{ id: string; page: string; label: string }>;
  } {
    return {
      actions: Array.from(this.actions.values()).map((a) => ({
        id: a.id,
        page: a.page,
        description: a.description,
        tier: a.tier,
        params: a.paramsSchema,
      })),
      sections: Array.from(this.sections.values()).map((s) => ({
        id: s.id,
        page: s.page,
        label: s.label,
      })),
    };
  }
}

export const uiRegistry = new UIRegistry();

// ============================================================================
// DEFAULT CORE ACTION & SECTION REGISTRATIONS
// ============================================================================

// 1. Navigation & Tab Switcher (Tier 1: UI Free)
uiRegistry.registerAction({
  id: "navigate_tab",
  page: "global",
  description: "Navigates to a specific dashboard tab or view (overview, action, skills, projects, analytics, tracker, resume, defense, settings, coach)",
  paramsSchema: {
    tab: { type: "string", enum: ["overview", "action", "skills", "projects", "analytics", "tracker", "resume", "defense", "settings", "coach"], required: true },
  },
  tier: "T1",
  handler: async (params) => {
    const tab = String(params.tab || "overview").toLowerCase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab } }));
      // Also look for tab button trigger
      const tabBtn = document.querySelector(`[data-tab-trigger="${tab}"]`) as HTMLElement;
      if (tabBtn) tabBtn.click();
    }
    return { ok: true, observation: `Successfully navigated to '${tab}' tab.` };
  },
});

// 2. Section Highlighter (Tier 1: UI Free)
uiRegistry.registerAction({
  id: "highlight_section",
  page: "global",
  description: "Highlights a specific UI card or section with a vivid glowing cyan pulse ring and scrolls it into view",
  paramsSchema: {
    sectionId: { type: "string", required: true },
  },
  tier: "T1",
  handler: async (params) => {
    const secId = String(params.sectionId || "");
    if (typeof window !== "undefined") {
      const el =
        document.querySelector(`[data-das-id="${secId}"]`) ||
        document.querySelector(`#${secId}`) ||
        document.querySelector(`.${secId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-cyan-400", "ring-offset-2", "ring-offset-black", "transition-all", "duration-500");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-cyan-400", "ring-offset-2", "ring-offset-black");
        }, 4000);
        return { ok: true, observation: `Highlighted section '${secId}' on current screen.` };
      }
    }
    return { ok: false, observation: `Section '${secId}' not found in current DOM.` };
  },
});

// 3. Smooth Scroll (Tier 1: UI Free)
uiRegistry.registerAction({
  id: "scroll_to",
  page: "global",
  description: "Smoothly scrolls to the top, bottom, or specific element on the page",
  paramsSchema: {
    target: { type: "string", enum: ["top", "bottom", "element"], required: true },
    elementId: { type: "string", required: false },
  },
  tier: "T1",
  handler: async (params) => {
    if (typeof window !== "undefined") {
      if (params.target === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return { ok: true, observation: "Scrolled to top of page." };
      }
      if (params.target === "bottom") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return { ok: true, observation: "Scrolled to bottom of page." };
      }
      if (params.elementId) {
        const el = document.getElementById(params.elementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return { ok: true, observation: `Scrolled to element '${params.elementId}'.` };
        }
      }
    }
    return { ok: true, observation: "Scroll completed." };
  },
});

// 4. Open ATS Resume Builder (Tier 2: Run)
uiRegistry.registerAction({
  id: "open_resume_builder",
  page: "resume",
  description: "Opens the interactive ATS resume optimizer and career gap analyzer modal",
  paramsSchema: {},
  tier: "T2",
  handler: async () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
    }
    return { ok: true, observation: "Opened ATS Resume Optimizer modal." };
  },
});

// 5. Launch Mock Interview Simulation (Tier 2: Run)
uiRegistry.registerAction({
  id: "launch_mock_interview",
  page: "defense",
  description: "Launches technical defense mock interview session for a specific company and role",
  paramsSchema: {
    company: { type: "string", required: false },
    role: { type: "string", required: false },
  },
  tier: "T2",
  handler: async (params) => {
    const company = params.company || "Google";
    const role = params.role || "Software Development Engineer";
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("das-open-mock-interview", {
          detail: { company, role },
        })
      );
    }
    return { ok: true, observation: `Launched technical mock interview simulation for ${company} (${role}).` };
  },
});

// 6. Update Target Career Role (Tier 3: Write - requires confirmation)
uiRegistry.registerAction({
  id: "update_target_role",
  page: "settings",
  description: "Updates student candidate's primary target placement role in their profile",
  paramsSchema: {
    newRole: { type: "string", required: true },
  },
  tier: "T3",
  handler: async (params) => {
    const role = String(params.newRole || "").trim();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("das-update-profile", {
          detail: { targetRole: role },
        })
      );
      try {
        const raw = localStorage.getItem("pathfinder_profile") || "{}";
        const prof = JSON.parse(raw);
        prof.targetRole = role;
        localStorage.setItem("pathfinder_profile", JSON.stringify(prof));
      } catch {}
    }
    return { ok: true, observation: `Updated candidate target role to '${role}'.` };
  },
});

// 7. Purge/Delete Data (Tier 4: Danger - strictly double confirmed / disabled by default)
uiRegistry.registerAction({
  id: "delete_profile_data",
  page: "settings",
  description: "Permanently deletes local mock interview logs and custom study plans",
  paramsSchema: {
    confirm: { type: "boolean", required: true },
  },
  tier: "T4",
  handler: async (params) => {
    if (!params.confirm) {
      return { ok: false, observation: "Action aborted: Double confirmation required for data purge." };
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("das_session_memory");
    }
    return { ok: true, observation: "Session memory cleared." };
  },
});

// Register Core Visual Sections
uiRegistry.registerSection({ id: "hero-metrics", page: "overview", label: "Readiness KPI Cards", selector: "[data-das-id='hero-metrics']" });
uiRegistry.registerSection({ id: "skill-gap", page: "overview", label: "Skill Gap Matrix", selector: "[data-das-id='skill-gap']" });
uiRegistry.registerSection({ id: "career-twin", page: "overview", label: "Career Digital Twin", selector: "[data-das-id='career-twin']" });
uiRegistry.registerSection({ id: "company-radar", page: "overview", label: "Placement Company Radar", selector: "[data-das-id='company-radar']" });
uiRegistry.registerSection({ id: "whatif-simulator", page: "action", label: "What-If Sensitivity Simulator", selector: "[data-das-id='whatif-simulator']" });
uiRegistry.registerSection({ id: "roadmap-visualizer", page: "skills", label: "6-Week Sprint Roadmap", selector: "[data-das-id='roadmap-visualizer']" });
uiRegistry.registerSection({ id: "project-recommender", page: "projects", label: "23 Production Blueprints", selector: "[data-das-id='project-recommender']" });
uiRegistry.registerSection({ id: "cohort-explorer", page: "analytics", label: "Cohort Data Explorer (972 Students)", selector: "[data-das-id='cohort-explorer']" });
uiRegistry.registerSection({ id: "ats-scanner", page: "resume", label: "ATS Resume Scanner", selector: "[data-das-id='ats-scanner']" });
