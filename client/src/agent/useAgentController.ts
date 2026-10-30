/**
 * useAgentController - JARVIS-style hands-on website control for DAS voice agent.
 *
 * Parses action tags embedded in AI response text:
 *   <!--ACTION: {"type": "NAVIGATE_TAB", "target": "interview"}-->
 *
 * Supported action types:
 *   NAVIGATE_TAB   - Switch active dashboard tab (TabId)
 *   OPEN_MODAL     - Open a modal (mock_interview, project_details, etc.)
 *   SCROLL_TO      - Smooth scroll to element ID
 *   SET_FILTER     - Filter projects/blueprints by branch
 *
 * The ElevenLabs voice stream and 3D avatar lip-sync continue uninterrupted
 * while actions execute in the background.
 */

import { useCallback } from "react";
import type { TabId } from "@/components/dashboard/DashboardHeader";

export type AgentAction =
  | { type: "NAVIGATE_TAB"; target: TabId }
  | { type: "OPEN_MODAL"; target: string }
  | { type: "SCROLL_TO"; target: string }
  | { type: "SET_FILTER"; target: string };

export type AgentControllerOptions = {
  onNavigateTab?: (tab: TabId) => void;
  onOpenModal?: (modal: string) => void;
  onScrollTo?: (id: string) => void;
  onSetFilter?: (filter: string) => void;
  onActionExecuted?: (action: AgentAction) => void;
};

const ACTION_TAG_REGEX = /<!--ACTION:\s*(\{[\s\S]*?\})\s*-->/g;

/**
 * Strips all action tags from text, returning clean spoken text for ElevenLabs TTS.
 */
export function extractSpokenText(text: string): string {
  return text.replace(ACTION_TAG_REGEX, "").trim();
}

/**
 * Parses all action tags from text and returns an array of AgentAction objects.
 */
export function parseActionTags(text: string): AgentAction[] {
  const actions: AgentAction[] = [];
  let match: RegExpExecArray | null;
  ACTION_TAG_REGEX.lastIndex = 0;
  while ((match = ACTION_TAG_REGEX.exec(text))) {
    try {
      const payload = JSON.parse(match[1]);
      const { type, target } = payload;
      switch (type) {
        case "NAVIGATE_TAB":
          actions.push({ type: "NAVIGATE_TAB", target: target as TabId });
          break;
        case "OPEN_MODAL":
          actions.push({ type: "OPEN_MODAL", target: String(target) });
          break;
        case "SCROLL_TO":
          actions.push({ type: "SCROLL_TO", target: String(target) });
          break;
        case "SET_FILTER":
          actions.push({ type: "SET_FILTER", target: String(target) });
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

export function useAgentController(options: AgentControllerOptions = {}) {
  const {
    onNavigateTab,
    onOpenModal,
    onScrollTo,
    onSetFilter,
    onActionExecuted,
  } = options;

  const executeAction = useCallback((action: AgentAction) => {
    switch (action.type) {
      case "NAVIGATE_TAB":
        onNavigateTab?.(action.target);
        break;
      case "OPEN_MODAL":
        onOpenModal?.(action.target);
        break;
      case "SCROLL_TO":
        onScrollTo?.(action.target);
        break;
      case "SET_FILTER":
        onSetFilter?.(action.target);
        break;
    }
    onActionExecuted?.(action);
  }, [onNavigateTab, onOpenModal, onScrollTo, onSetFilter, onActionExecuted]);

  const executeActions = useCallback((actions: AgentAction[]) => {
    actions.forEach((action) => executeAction(action));
  }, [executeAction]);

  return {
    extractSpokenText,
    parseActionTags,
    executeAction,
    executeActions,
  };
}

export default useAgentController;
