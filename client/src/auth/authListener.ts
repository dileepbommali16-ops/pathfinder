/**
 * authListener.ts - Boss Auto Switch Engine
 * - Runs on every page load
 * - Auto-detects Boss vs Sir with zero manual buttons
 * - Configures DAS mode and mood state
 */

export const BOSS_EMAILS = [
  "dileepbommali16@gmail.com",
  "dileepbommali2005@gmail.com",
  "dileep@pathfinder.ai",
  "boss@pathfinder.ai",
  "dileepbommali16",
];

export function isBossUser(email?: string): boolean {
  if (!email) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userEmail") || localStorage.getItem("email") || "";
      if (stored) {
        return BOSS_EMAILS.some((e) => stored.toLowerCase().includes(e)) || stored.toLowerCase().includes("dileep");
      }
    }
    return true; // Default to Boss
  }
  const low = email.toLowerCase().trim();
  return BOSS_EMAILS.some((e) => low.includes(e)) || low.includes("dileep");
}

export function initAuthListener() {
  if (typeof window === "undefined") return;

  const applyAuth = (email?: string) => {
    const isBoss = isBossUser(email);
    if (isBoss) {
      localStorage.setItem("das_mode", "BOSS");
      localStorage.setItem("userRole", "Boss");
      localStorage.setItem("isOwner", "true");
      (window as any).DASFace?.setMood?.("boss");
    } else {
      localStorage.setItem("das_mode", "SIR");
      localStorage.setItem("userRole", "Sir");
      localStorage.setItem("isOwner", "false");
      (window as any).DASFace?.setMood?.("sir");
    }
  };

  // Run automatically on page load
  applyAuth();

  // Listen for login/logout events
  window.addEventListener("storage", (e) => {
    if (e.key === "userEmail" || e.key === "das_mode") {
      applyAuth();
    }
  });

  window.addEventListener("das-auth-change", ((e: CustomEvent) => {
    applyAuth(e.detail?.email);
  }) as EventListener);
}

// Auto-run on module import
if (typeof window !== "undefined") {
  initAuthListener();
}

