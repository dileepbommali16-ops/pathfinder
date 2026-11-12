/**
 * auth.ts - Force Boss Mode & Identity Authorization Engine
 */
import { speaker } from "@/agent/audioIO";

export const OWNER_EMAILS = [
  "dileepbommali16@gmail.com",
  "dileepbommali2005@gmail.com",
  "guest@pathfinder.ai",
  "dileepbommali16",
  "dileep@pathfinder.ai",
];

export function getUserRole(email?: string): "Boss" | "Sir" {
  if (!email) {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("userRole");
      if (storedRole === "Boss") return "Boss";
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail && OWNER_EMAILS.some((e) => storedEmail.toLowerCase().includes(e))) {
        return "Boss";
      }
    }
    return "Boss"; // Default to Boss on direct load
  }

  const lower = email.toLowerCase().trim();
  if (OWNER_EMAILS.some((e) => lower.includes(e)) || lower.includes("dileep")) {
    return "Boss";
  }
  return "Sir";
}

export function handleAuthLoginDetected(email?: string, username?: string): "Boss" | "Sir" {
  const effectiveEmail = email || username || "";
  const role = getUserRole(effectiveEmail);

  if (typeof window !== "undefined") {
    localStorage.setItem("userEmail", effectiveEmail);
    localStorage.setItem("userRole", role);

    if (role === "Boss") {
      localStorage.setItem("isOwner", "true");
      localStorage.setItem("das_mode", "BOSS");
      localStorage.setItem("das_honorific_override", "Boss");
    } else {
      localStorage.setItem("isOwner", "false");
      localStorage.setItem("das_mode", "SIR");
      localStorage.setItem("das_honorific_override", "Sir");
    }
  }

  return role;
}

export function initAuthMode(): "Boss" | "Sir" {
  if (typeof window === "undefined") return "Boss";

  const storedRole = localStorage.getItem("userRole");
  const isOwner = localStorage.getItem("isOwner") === "true";
  const dasMode = localStorage.getItem("das_mode");
  const storedEmail = localStorage.getItem("userEmail") || "";

  if (
    storedRole === "Boss" ||
    isOwner ||
    dasMode === "BOSS" ||
    getUserRole(storedEmail) === "Boss" ||
    !storedEmail
  ) {
    localStorage.setItem("userRole", "Boss");
    localStorage.setItem("isOwner", "true");
    localStorage.setItem("das_mode", "BOSS");
    localStorage.setItem("das_honorific_override", "Boss");
    return "Boss";
  }

  return "Sir";
}
