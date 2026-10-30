/**
 * useAgentController - JARVIS-style hands-on website control for DAS voice agent.
 *
 * Parses action tags embedded in AI response text AND detects instant voice/text
 * website control intents (navigation, scrolling, modals, branch filters, profile updates).
 *
 * Supported action types:
 *   NAVIGATE_TAB   - Switch active dashboard tab (TabId)
 *   OPEN_MODAL     - Open a modal (one_page_resume, mock_interview, etc.)
 *   SCROLL_TO      - Smooth scroll (top, bottom, up, down, or element ID / heading)
 *   SET_FILTER     - Filter projects/blueprints/cohort by branch
 *   UPDATE_PROFILE - Live update candidate profile fields (cgpa, branch, backlogs, coding, targetRole)
 */

import { useCallback } from "react";
import type { TabId } from "@/components/dashboard/DashboardHeader";

export type AgentAction =
  | { type: "NAVIGATE_TAB"; target: TabId }
  | { type: "OPEN_MODAL"; target: string }
  | { type: "SCROLL_TO"; target: string }
  | { type: "SET_FILTER"; target: string }
  | { type: "UPDATE_PROFILE"; target: string };

export type AgentControllerOptions = {
  onNavigateTab?: (tab: TabId) => void;
  onOpenModal?: (modal: string) => void;
  onScrollTo?: (id: string) => void;
  onSetFilter?: (filter: string) => void;
  onUpdateProfile?: (field: string, value: any) => void;
  onActionExecuted?: (action: AgentAction) => void;
};

const ACTION_TAG_REGEX = /<!--\s*ACTION:\s*(\{[\s\S]*?\})\s*-->/gi;

const TAB_ALIASES: Record<string, TabId> = {
  overview: "overview",
  dashboard: "overview",
  home: "overview",
  main: "overview",
  executive: "overview",
  score: "overview",
  scorecard: "overview",

  interview: "interview",
  mock_interview: "interview",
  "mock-interview": "interview",
  mock: "interview",
  viva: "interview",

  action: "action",
  readiness: "action",
  command: "action",
  readiness_command: "action",
  "readiness-command": "action",
  action_center: "action",

  skills: "skills",
  roadmap: "skills",
  sprint: "skills",
  "6-week": "skills",
  "6_week": "skills",
  study_plan: "skills",
  skill_gap: "skills",

  coach: "coach",
  voice: "coach",
  das: "coach",
  jarvis: "coach",
  agent: "coach",
  copilot: "coach",

  projects: "projects",
  blueprints: "projects",
  project_blueprints: "projects",
  "project-blueprints": "projects",
  portfolio: "projects",

  analytics: "analytics",
  cohort: "analytics",
  cohort_analytics: "analytics",
  benchmarks: "analytics",
  placement_stats: "analytics",

  resume: "resume",
  ats: "resume",
  resume_studio: "resume",
  "resume-studio": "resume",
  scanner: "resume",
  cv: "resume",

  branches: "branches",
  courses: "branches",
  departments: "branches",
  streams: "branches",

  defense: "defense",
  project_defense: "defense",
  "project-defense": "defense",
  star: "defense",
  architecture_defense: "defense",

  profile: "profile",
  settings: "profile",
  ssot: "profile",
  edit_profile: "profile",

  roles: "roles",
  role_intelligence: "roles",
  target_role: "roles",
  salaries: "roles",

  missions: "missions",
  mission_tracker: "missions",
  tracker: "missions",
};

export function normalizeTabId(raw: string): TabId | null {
  if (!raw) return null;
  const clean = raw.toLowerCase().trim().replace(/^\/+/, "");
  if (TAB_ALIASES[clean]) return TAB_ALIASES[clean];
  for (const [alias, tabId] of Object.entries(TAB_ALIASES)) {
    if (clean.includes(alias)) return tabId;
  }
  return null;
}

/**
 * Strips all action tags from text, returning clean spoken text for TTS.
 */
export function extractSpokenText(text: string): string {
  return text.replace(ACTION_TAG_REGEX, "").trim();
}

/**
 * Parses all <!--ACTION: {...}--> tags from text (case-insensitive keys & types).
 */
export function parseActionTags(text: string): AgentAction[] {
  const actions: AgentAction[] = [];
  let match: RegExpExecArray | null;
  const rx = new RegExp(ACTION_TAG_REGEX.source, "gi");
  while ((match = rx.exec(text))) {
    try {
      const payload = JSON.parse(match[1]);
      const rawType = String(payload.type || "").toUpperCase().trim();
      const rawTarget = String(
        payload.target ?? payload.tab ?? payload.modal ?? payload.filter ?? payload.id ?? payload.route ?? ""
      ).trim();

      switch (rawType) {
        case "NAVIGATE_TAB":
        case "NAVIGATE":
        case "OPEN_TAB": {
          const tab = normalizeTabId(rawTarget);
          if (tab) {
            actions.push({ type: "NAVIGATE_TAB", target: tab });
          }
          break;
        }
        case "OPEN_MODAL":
          if (rawTarget) actions.push({ type: "OPEN_MODAL", target: rawTarget });
          break;
        case "SCROLL_TO":
        case "SCROLL":
          if (rawTarget) actions.push({ type: "SCROLL_TO", target: rawTarget });
          break;
        case "SET_FILTER":
        case "FILTER":
          if (rawTarget) actions.push({ type: "SET_FILTER", target: rawTarget.toUpperCase() });
          break;
        case "UPDATE_PROFILE":
          if (payload.field && payload.value !== undefined) {
            actions.push({ type: "UPDATE_PROFILE", target: `${payload.field}:${payload.value}` });
          } else if (rawTarget) {
            actions.push({ type: "UPDATE_PROFILE", target: rawTarget });
          }
          break;
        default:
          break;
      }
    } catch {
      // Ignore malformed action tags
    }
  }
  return actions;
}

/**
 * Detects direct user voice/text commands so website automation works with zero latency
 * even before or without LLM action tags.
 */
export function detectInstantClientActions(query: string): AgentAction[] {
  const q = (query || "").toLowerCase().trim();
  if (!q) return [];
  const actions: AgentAction[] = [];

  // 1. Scroll commands
  if (/\b(scroll\s*down|go\s*down|move\s*down|kindaki\s*scroll|kinda\s*chudu)\b/i.test(q)) {
    actions.push({ type: "SCROLL_TO", target: "down" });
  } else if (/\b(scroll\s*up|go\s*up|move\s*up|paiki\s*scroll|paina\s*chudu)\b/i.test(q)) {
    actions.push({ type: "SCROLL_TO", target: "up" });
  } else if (/\b(scroll\s*(to\s*)?top|top\s*of\s*page)\b/i.test(q)) {
    actions.push({ type: "SCROLL_TO", target: "top" });
  } else if (/\b(scroll\s*(to\s*)?bottom|bottom\s*of\s*page|footer)\b/i.test(q)) {
    actions.push({ type: "SCROLL_TO", target: "bottom" });
  }

  // 2. Live Profile Update commands (e.g. "set my cgpa to 8.5", "change branch to ECE")
  const cgpaMatch = q.match(/\b(?:set|change|update|my)\s+cgpa\s+(?:to|is|=)?\s*(\d+(?:\.\d+)?)/i);
  if (cgpaMatch) {
    const val = parseFloat(cgpaMatch[1]);
    if (val >= 0 && val <= 10) {
      actions.push({ type: "UPDATE_PROFILE", target: `cgpa:${val}` });
    }
  }

  const backlogMatch = q.match(/\b(?:set|change|update|my)\s+backlogs?\s+(?:to|is|=)?\s*(\d+)/i);
  if (backlogMatch) {
    actions.push({ type: "UPDATE_PROFILE", target: `backlogs:${parseInt(backlogMatch[1], 10)}` });
  }

  const branchSetMatch = q.match(/\b(?:set|change|update|switch)\s+(?:my\s+)?branch\s+(?:to\s+)?(cse|ece|eee|mech|civil|it|aiml|csm|csd)\b/i);
  if (branchSetMatch) {
    actions.push({ type: "UPDATE_PROFILE", target: `branch:${branchSetMatch[1].toUpperCase()}` });
  }

  // 3. Branch filter for projects / cohort
  const filterMatch = q.match(/\b(?:filter|show)\s+(?:projects?|blueprints?|cohort)?\s*(?:for|by|in)?\s*\b(cse|ece|eee|mech|civil|it|aiml)\b/i);
  if (filterMatch && !branchSetMatch) {
    actions.push({ type: "SET_FILTER", target: filterMatch[1].toUpperCase() });
  }

  // 4. 1-Page Resume Modal trigger
  if (/\b(one[\s-]?page\s*resume|1[\s-]?page\s*resume|resume\s*builder\s*modal|download\s*resume\s*template)\b/i.test(q)) {
    actions.push({ type: "OPEN_MODAL", target: "one_page_resume" });
    return actions;
  }

  // 5. Tab Navigation commands (English + Telugu/Tenglish)
  const hasNavVerb =
    /\b(open|go\s*to|take\s*me\s*to|navigate|switch\s*to|show|launch|start|pull\s*up|chupinchu|open\s*chey|vellu|teesukellu)\b/i.test(
      q
    );

  if (hasNavVerb) {
    if (/\b(mock\s*interview|interview|viva)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "interview" });
    } else if (/\b(6[\s-]?week|roadmap|sprint|study\s*plan|skill\s*gap|skills)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "skills" });
    } else if (/\b(project\s*defense|star\s*defense|defense\s*simulator|viva\s*defense)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "defense" });
    } else if (/\b(projects?|blueprints?|portfolio)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "projects" });
    } else if (/\b(resume|ats|cv\s*scanner|resume\s*studio)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "resume" });
    } else if (/\b(cohort|analytics|benchmarks?|972|placement\s*stats)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "analytics" });
    } else if (/\b(readiness\s*command|action\s*center|readiness)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "action" });
    } else if (/\b(branches|courses|departments|streams)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "branches" });
    } else if (/\b(profile|settings|ssot|my\s*details)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "profile" });
    } else if (/\b(roles?|role\s*intelligence|salary|salaries)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "roles" });
    } else if (/\b(missions?|mission\s*tracker|daily\s*goals)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "missions" });
    } else if (/\b(voice\s*coach|full\s*coach|das\s*coach)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "coach" });
    } else if (/\b(dashboard|overview|home|main\s*page)\b/i.test(q)) {
      actions.push({ type: "NAVIGATE_TAB", target: "overview" });
    }
  }

  return actions;
}

/**
 * Determines whether the current user is the Owner ("Boss") or another user ("Sir").
 * Owner: Dileep Bommali (or explicit Boss mode). Everyone else: "Sir".
 */
export function resolveHonorific(profile?: any, userEmail?: string, username?: string): "Boss" | "Sir" {
  try {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("das_honorific_override");
      if (override === "Boss" || override === "Sir") {
        return override;
      }
      const savedUserRaw = localStorage.getItem("pathfinder_user");
      if (savedUserRaw) {
        const u = JSON.parse(savedUserRaw);
        const uEmail = String(u?.email || userEmail || "").toLowerCase().trim();
        const uName = String(u?.username || u?.full_name || u?.fullName || username || "").toLowerCase().trim();
        const uRole = String(u?.role || "").toLowerCase().trim();

        if (u?.is_owner === true || uRole === "owner" || uRole === "admin") {
          return "Boss";
        }

        const ownerEmails = [
          "dileepbommali16@gmail.com",
          "bommali.dileep@gmail.com",
          "dileepbommali16@users.noreply.github.com",
          "dileep@pathfinder.ai",
        ];
        if (ownerEmails.includes(uEmail) || uName.includes("dileep")) {
          return "Boss";
        }

        // A specific non-owner user is logged in -> address them respectfully as "Sir"
        if (
          (uEmail && uEmail !== "candidate@pathfinder.ai") ||
          (uName && uName !== "student" && uName !== "candidate")
        ) {
          return "Sir";
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const pName = String(profile?.fullName || profile?.username || username || "").toLowerCase().trim();
  const pEmail = String(profile?.email || userEmail || "").toLowerCase().trim();
  if (pName.includes("dileep") || pEmail.includes("dileep")) {
    return "Boss";
  }
  if (pName && pName !== "student" && pName !== "candidate" && !pName.includes("alex")) {
    return "Sir";
  }

  // Default owner session on Boss's workspace
  return "Boss";
}

export function useAgentController(options: AgentControllerOptions = {}) {
  const {
    onNavigateTab,
    onOpenModal,
    onScrollTo,
    onSetFilter,
    onUpdateProfile,
    onActionExecuted,
  } = options;

  const executeAction = useCallback(
    (action: AgentAction) => {
      switch (action.type) {
        case "NAVIGATE_TAB":
          onNavigateTab?.(action.target);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("das-navigate-tab", { detail: { tab: action.target } }));
          }
          break;
        case "OPEN_MODAL":
          onOpenModal?.(action.target);
          if (typeof window !== "undefined") {
            if (action.target === "one_page_resume" || action.target === "resume") {
              window.dispatchEvent(new CustomEvent("das-open-resume-builder"));
            } else if (action.target === "mock_interview" || action.target === "interview") {
              window.dispatchEvent(new CustomEvent("das-open-mock-interview"));
            }
          }
          break;
        case "SCROLL_TO":
          onScrollTo?.(action.target);
          break;
        case "SET_FILTER":
          onSetFilter?.(action.target);
          break;
        case "UPDATE_PROFILE": {
          const [field, val] = action.target.split(":");
          if (field && val !== undefined) {
            onUpdateProfile?.(field, val);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("das-update-profile", { detail: { field, value: val } })
              );
            }
          }
          break;
        }
      }
      onActionExecuted?.(action);
    },
    [onNavigateTab, onOpenModal, onScrollTo, onSetFilter, onUpdateProfile, onActionExecuted]
  );

  const executeActions = useCallback(
    (actions: AgentAction[]) => {
      const seen = new Set<string>();
      actions.forEach((action) => {
        const key = `${action.type}:${action.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          executeAction(action);
        }
      });
    },
    [executeAction]
  );

  return {
    extractSpokenText,
    parseActionTags,
    detectInstantClientActions,
    executeAction,
    executeActions,
  };
}

export default useAgentController;
