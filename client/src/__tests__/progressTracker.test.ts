import { beforeEach, describe, expect, it } from "vitest";
import {
  clearProgressEvents,
  getProgressStorageKey,
  getRoadmapCompletedCount,
  readProgressEvents,
  recordProgressEvent,
} from "../lib/progressTracker";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const storageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as any).window = {
    dispatchEvent: () => true,
  };
  (globalThis as any).localStorage = storageMock;
  (globalThis as any).CustomEvent = class {
    type: string;
    detail: any;
    constructor(type: string, init?: { detail?: any }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
  return store;
}

describe("progressTracker real-activity store", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("starts empty with zero pre-filled fake events", () => {
    expect(readProgressEvents()).toEqual([]);
    expect(getRoadmapCompletedCount()).toBe(0);
  });

  it("clamps scores to [0, 100], deduplicates unchanged consecutive predictions, and records real events", () => {
    localStorage.setItem("pathfinder_session_email", "Deepika@example.com");
    expect(getProgressStorageKey()).toBe("pathfinder_progress_log_v1_deepika@example.com");

    recordProgressEvent("prediction", 61.9, "Developing Foundation", "CSE · CGPA 8.1");
    recordProgressEvent("prediction", 61.92, "Developing Foundation", "Duplicate within tolerance");
    expect(readProgressEvents()).toHaveLength(1);

    recordProgressEvent("prediction", 120, "Upper Bound Test");
    recordProgressEvent("ats", -5, "Lower Bound Test");
    recordProgressEvent("arena", 84, "HIRE · Amazon", "Binary Search (python)");
    recordProgressEvent("interview", 76, "Razorpay · Technical", "DAS AI");

    const events = readProgressEvents();
    expect(events).toHaveLength(5);
    expect(events[1].score).toBe(100);
    expect(events[2].score).toBe(0);
    expect(events[3].type).toBe("arena");
    expect(events[4].type).toBe("interview");
  });

  it("clears history cleanly and counts completed roadmap weeks", () => {
    localStorage.setItem("userEmail", "guest@pathfinder.ai");
    localStorage.setItem(
      "pathfinder_roadmap_completed_v1_guest@pathfinder.ai",
      JSON.stringify({ 0: true, 1: false, 2: true, 3: true })
    );
    expect(getRoadmapCompletedCount()).toBe(3);

    recordProgressEvent("ats", 82, "ATS resume scan");
    expect(readProgressEvents()).toHaveLength(1);

    clearProgressEvents();
    expect(readProgressEvents()).toEqual([]);
  });
});
