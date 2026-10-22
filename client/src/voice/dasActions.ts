/**
 * Runs the UI actions the agent asked for. Allowlist only: anything else is ignored.
 * File: client/src/voice/dasActions.ts
 *
 * Add this CSS once (use your own accent variable):
 *   .das-highlight { outline: 2px solid var(--primary, #FF6B4A); outline-offset: 4px; border-radius: 8px; }
 */
import type { AgentAction } from "./agentClient";

export interface ActionHandlers {
  /** Switch to a page or tab by id (use your router or the activeTab setter in Home.tsx). */
  goToTab: (pageId: string) => void;
  /** Open a panel or drawer by id. */
  openPanel: (panelId: string) => void;
}

const HIGHLIGHT_CLASS = "das-highlight";
const HIGHLIGHT_MS = 2500;
const AFTER_NAVIGATION_MS = 500; // give the new tab time to render before scrolling to its widgets

export function runActions(actions: AgentAction[], handlers: ActionHandlers): void {
  const list = actions.slice(0, 3);
  const navigated = list.some((a) => a.type === "navigate_to");
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const action of list) {
    switch (action.type) {
      case "navigate_to":
        handlers.goToTab(action.target);
        break;
      case "open_panel":
        handlers.openPanel(action.target);
        break;
      case "scroll_to":
      case "highlight":
        window.setTimeout(
          () => {
            const el = document.querySelector(`[data-das-id="${CSS.escape(action.target)}"]`);
            if (!el) return; // element not on this page: do nothing, never guess
            el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
            if (action.type === "highlight") {
              el.classList.add(HIGHLIGHT_CLASS);
              window.setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), HIGHLIGHT_MS);
            }
          },
          navigated ? AFTER_NAVIGATION_MS : 0,
        );
        break;
      default:
        break; // unknown action types are ignored
    }
  }
}
