/**
 * Action Dispatcher for Pathfinder DAS AI (client/src/voice/actionDispatcher.ts)
 * 
 * Central executor for agent actions received from the backend orchestrator.
 * Enforces security tiers (T0-T4), displays visual "acting" captions,
 * applies luminous highlight rings to target sections, and reports observations
 * back to /api/agent/action-result to advance the autonomous reasoning loop.
 */

import { uiRegistry, ActionTier } from "./uiRegistry";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://pathfinder-backend-klrp.onrender.com").replace(/\/+$/, "");

export interface DispatchedAction {
  runId: string;
  actionId: string;
  name: string;
  params: Record<string, any>;
  caption?: string;
}

export interface ActionExecutionResult {
  ok: boolean;
  observation: string;
  newPageContext?: Record<string, any>;
}

class ActionDispatcher {
  private activeHighlightTimer: number | null = null;
  private activeElement: HTMLElement | null = null;

  /**
   * Highlights a section with an animated cyan neon focus ring
   */
  public highlightSection(selectorOrDasId: string, durationMs: number = 3000): void {
    if (typeof document === "undefined") return;

    if (this.activeElement) {
      this.activeElement.classList.remove("ring-4", "ring-cyan-400", "ring-offset-2", "ring-offset-black", "transition-all", "duration-300", "animate-pulse");
      this.activeElement = null;
    }
    if (this.activeHighlightTimer) {
      window.clearTimeout(this.activeHighlightTimer);
      this.activeHighlightTimer = null;
    }

    let el: HTMLElement | null = null;
    if (selectorOrDasId.startsWith("[") || selectorOrDasId.startsWith("#") || selectorOrDasId.startsWith(".")) {
      el = document.querySelector(selectorOrDasId);
    } else {
      el = document.querySelector(`[data-das-id="${CSS.escape(selectorOrDasId)}"]`);
    }

    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-4", "ring-cyan-400", "ring-offset-2", "ring-offset-black", "transition-all", "duration-300", "animate-pulse");
    this.activeElement = el;

    this.activeHighlightTimer = window.setTimeout(() => {
      if (el) {
        el.classList.remove("ring-4", "ring-cyan-400", "ring-offset-2", "ring-offset-black", "transition-all", "duration-300", "animate-pulse");
      }
      this.activeElement = null;
      this.activeHighlightTimer = null;
    }, durationMs);
  }

  /**
   * Executes UI action with tier validation and observation reporting
   */
  public async executeUIAction(action: DispatchedAction): Promise<ActionExecutionResult> {
    const { runId, actionId, name, params, caption } = action;

    // 1. Check registry whitelist
    const registered = uiRegistry.getAction(name);
    if (!registered) {
      const observation = `Action '${name}' is not in the allowed UI registry.`;
      await this.reportObservation(runId, actionId, false, observation);
      return { ok: false, observation };
    }

    // 2. Dispatch visual Acting status event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("das-acting-event", {
          detail: { caption: caption || `Executing ${name}...`, tier: registered.tier, action: name }
        })
      );
    }

    // 3. Highlight target if provided
    if (params.section || params.target || params.tab) {
      const targetId = params.section || params.target || params.tab;
      this.highlightSection(targetId);
    }

    // 4. Execute registered handler
    try {
      const res = await registered.handler(params);
      await this.reportObservation(runId, actionId, res.ok, res.observation);
      return res;
    } catch (err: any) {
      const observation = `Failed to execute ${name}: ${err?.message || "Execution error"}`;
      await this.reportObservation(runId, actionId, false, observation);
      return { ok: false, observation };
    }
  }

  /**
   * Reports observation back to backend orchestrator to advance loop
   */
  public async reportObservation(
    runId: string,
    actionId: string,
    ok: boolean,
    observation: string,
    newPageContext?: Record<string, any>
  ): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/agent/action-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          actionId,
          ok,
          observation,
          newPageContext: newPageContext || {}
        })
      });
    } catch (e) {
      console.warn("[ActionDispatcher] Could not report action observation:", e);
    }
  }
}

export const actionDispatcher = new ActionDispatcher();
