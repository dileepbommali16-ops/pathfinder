/**
 * authListener.ts - Auto Honorific & Boss Account Verification Engine
 * - Runs on every page load
 * - ONLY grants Boss mode to dileepbommali16@gmail.com
 * - Auto-assigns Madam (female accounts) or Sir (male/guest accounts)
 */
import { OWNER_EMAIL, isOwnerAccount, getUserRole, getHonorificKey } from "@/lib/auth";

export const BOSS_EMAILS = [OWNER_EMAIL];

export function isBossUser(email?: string): boolean {
  if (!email) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userEmail") || localStorage.getItem("email") || "";
      return stored ? isOwnerAccount(stored) : false;
    }
    return false;
  }
  return isOwnerAccount(email);
}

export function initAuthListener() {
  if (typeof window === "undefined") return;

  const applyAuth = (email?: string, username?: string) => {
    const resolved = getUserRole(email, username);
    const key = getHonorificKey(email, username);
    localStorage.setItem("das_mode", resolved.toUpperCase());
    localStorage.setItem("userRole", resolved);
    localStorage.setItem("isOwner", resolved === "Boss" ? "true" : "false");
    (window as any).DASFace?.setMood?.(key);
  };

  // Run automatically on page load
  applyAuth();

  // Listen for login/logout events
  window.addEventListener("storage", (e) => {
    if (e.key === "userEmail" || e.key === "userName" || e.key === "das_mode") {
      applyAuth();
    }
  });

  window.addEventListener("das-auth-change", ((e: CustomEvent) => {
    applyAuth(e.detail?.email, e.detail?.username);
  }) as EventListener);
}

// Auto-run on module import
if (typeof window !== "undefined") {
  initAuthListener();
}

