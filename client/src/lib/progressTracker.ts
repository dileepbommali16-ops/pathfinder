/**
 * My Progress Journey store.
 *
 * Records only things the signed-in user (or guest) actually did in this browser:
 * real ML predictions returned by the backend, ATS resume scans, Coding Arena
 * verdicts and mock interview / project defense scores. Nothing is pre-filled.
 */

export type ProgressEventType = "prediction" | "ats" | "arena" | "interview" | "defense";

export interface ProgressEvent {
  id: string;
  type: ProgressEventType;
  score: number;
  label: string;
  detail?: string;
  at: number;
}

export const PROGRESS_UPDATED_EVENT = "pathfinder-progress-updated";
const MAX_EVENTS = 200;

const getIdentity = (): string => {
  if (typeof window === "undefined") return "guest";
  try {
    const raw =
      localStorage.getItem("pathfinder_session_email") || localStorage.getItem("userEmail") || "guest";
    return raw.trim().toLowerCase() || "guest";
  } catch {
    return "guest";
  }
};

export const getProgressStorageKey = (): string => `pathfinder_progress_log_v1_${getIdentity()}`;

export const getRoadmapCompletedCount = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const email = (localStorage.getItem("userEmail") || "guest").trim().toLowerCase() || "guest";
    const saved = localStorage.getItem(`pathfinder_roadmap_completed_v1_${email}`);
    if (!saved) return 0;
    const parsed = JSON.parse(saved) as Record<string, boolean>;
    return Object.values(parsed).filter(Boolean).length;
  } catch {
    return 0;
  }
};

export const readProgressEvents = (): ProgressEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getProgressStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e) =>
          e &&
          typeof e.type === "string" &&
          typeof e.score === "number" &&
          Number.isFinite(e.score) &&
          typeof e.at === "number"
      )
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
};

const writeProgressEvents = (events: ProgressEvent[]) => {
  try {
    localStorage.setItem(getProgressStorageKey(), JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // storage full or blocked: progress simply isn't persisted
  }
  try {
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT));
  } catch {
    // ignore
  }
};

export const recordProgressEvent = (
  type: ProgressEventType,
  score: number,
  label: string,
  detail?: string
): void => {
  if (typeof window === "undefined") return;
  const value = Number(score);
  if (!Number.isFinite(value)) return;
  const clamped = Math.max(0, Math.min(100, Math.round(value * 10) / 10));
  const events = readProgressEvents();

  // Predictions re-run on many profile edits; only log when the real score changes.
  if (type === "prediction") {
    const lastPrediction = [...events].reverse().find((e) => e.type === "prediction");
    if (lastPrediction && Math.abs(lastPrediction.score - clamped) < 0.05) return;
  }

  events.push({
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    score: clamped,
    label: String(label || "").slice(0, 120),
    detail: detail ? String(detail).slice(0, 200) : undefined,
    at: Date.now(),
  });
  writeProgressEvents(events);
};

export const clearProgressEvents = (): void => {
  if (typeof window === "undefined") return;
  writeProgressEvents([]);
};
