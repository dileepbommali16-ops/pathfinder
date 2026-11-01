/**
 * auth.ts - Login-Time Auto Boss Detection & Identity Synchronization
 */
import { speaker } from "@/agent/audioIO";

export function handleAuthLoginDetected(email?: string, username?: string): "BOSS" | "SIR" {
  const normEmail = (email || "").toLowerCase().trim();
  const normUser = (username || "").toLowerCase().trim();

  const isBoss =
    normEmail === "dileepbommali2005@gmail.com" ||
    normEmail === "dileepbommali16@gmail.com" ||
    normEmail.includes("dileep") ||
    normUser.includes("dileep");

  if (typeof window !== "undefined") {
    if (isBoss) {
      localStorage.setItem("das_mode", "BOSS");
      localStorage.setItem("das_honorific_override", "Boss");
      try {
        speaker.streamChunk("Welcome back Boss. All systems online. Pathfinder is yours.");
      } catch {}
      return "BOSS";
    } else {
      localStorage.setItem("das_mode", "SIR");
      localStorage.setItem("das_honorific_override", "Sir");
      try {
        speaker.streamChunk("Welcome Sir. Pathfinder systems ready.");
      } catch {}
      return "SIR";
    }
  }

  return isBoss ? "BOSS" : "SIR";
}

