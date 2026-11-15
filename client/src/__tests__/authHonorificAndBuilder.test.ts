import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: vi.fn() })),
}));

import {
  isOwnerAccount,
  inferHonorific,
  getUserRole,
  setHonorificPreference,
  handleAuthLoginDetected,
} from "../lib/auth";
import { getCareerAgentResponse } from "../lib/careerAgent";

function installMemoryBrowserGlobals() {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };

  if (typeof (globalThis as any).CustomEvent === "undefined") {
    vi.stubGlobal(
      "CustomEvent",
      class CustomEventShim<T = any> {
        type: string;
        detail: T;
        constructor(type: string, init?: { detail?: T }) {
          this.type = type;
          this.detail = init?.detail as T;
        }
      }
    );
  }

  vi.stubGlobal("localStorage", mockLocalStorage);
  vi.stubGlobal("window", {
    localStorage: mockLocalStorage,
    location: { search: "" },
    dispatchEvent: vi.fn(() => true),
  });
}

describe("Strict Boss Identity, Honorifics & Builder Knowledge", () => {
  beforeEach(() => {
    installMemoryBrowserGlobals();
  });

  it("allows Boss mode ONLY for dileepbommali16@gmail.com", () => {
    expect(isOwnerAccount("dileepbommali16@gmail.com")).toBe(true);
    expect(isOwnerAccount("DILEEPBOMMALI16@GMAIL.COM")).toBe(true);
    expect(isOwnerAccount("dileep@pathfinder.ai")).toBe(false);
    expect(isOwnerAccount("dileepbommali2005@gmail.com")).toBe(false);
    expect(isOwnerAccount("priyankabommali2@gmail.com")).toBe(false);
    expect(isOwnerAccount("")).toBe(false);

    expect(inferHonorific("dileepbommali16@gmail.com", "Dileep")).toBe("Boss");
    expect(inferHonorific("dileep_friend@gmail.com", "Dileep")).toBe("Sir");
    expect(inferHonorific("priyankabommali2@gmail.com", "indala gayatri")).toBe("Madam");
  });

  it("blocks Boss escalation for girl or male visitors and persists Madam/Sir properly", () => {
    const girlRole = handleAuthLoginDetected("priyankabommali2@gmail.com", "indala gayatri");
    expect(girlRole).toBe("Madam");
    expect(getUserRole()).toBe("Madam");

    const blocked = setHonorificPreference("Boss");
    expect(blocked).toBe("Madam");
    expect(localStorage.getItem("userRole")).toBe("Madam");

    const maleRole = handleAuthLoginDetected("arjun@college.edu", "Arjun");
    expect(maleRole).toBe("Sir");
    expect(getUserRole()).toBe("Sir");

    const ownerRole = handleAuthLoginDetected("dileepbommali16@gmail.com", "Dileep");
    expect(ownerRole).toBe("Boss");
    expect(getUserRole()).toBe("Boss");
  });

  it("answers builder ecosystem & screen monitor queries offline without Boss leak", () => {
    handleAuthLoginDetected("priyankabommali2@gmail.com", "indala gayatri");
    const builderAnswer = getCareerAgentResponse(
      "After problem statement what next step? Antigravity vs Cursor vs Claude Code, VS Code RAG folder structure, Vercel Render Cloudflare, ChatGPT vs Gemini AI vs Claude AI",
      [],
      { branch: "CSE", cgpa: 8.2 },
      "Madam"
    );
    expect(builderAnswer).toContain("Madam");
    expect(builderAnswer).not.toContain("Boss");
    expect(builderAnswer).toContain("Antigravity");
    expect(builderAnswer).toContain("Cursor");
    expect(builderAnswer).toContain("Claude Code");
    expect(builderAnswer).toContain("rag_pipeline.py");
    expect(builderAnswer).toContain("Vercel");
    expect(builderAnswer).toContain("Render");
    expect(builderAnswer).toContain("Cloudflare");
  });
});
