/**
 * Persistent Memory Manager for Pathfinder DAS Voice Agent (client/src/voice/memory.ts)
 * Stores student identity, goals, target companies, notes, and session command history
 * securely in browser localStorage and syncs with backend state.
 */

export interface StudentMemory {
  studentName: string;
  department: string;
  targetTier: "Tier 1" | "Tier 2" | "Tier 3";
  dreamCompany: string;
  cgpa: number;
  notes: { id: string; text: string; createdAt: string }[];
  recentActions: { action: string; target?: string; timestamp: string }[];
  reminders: { id: string; title: string; time: string; completed: boolean }[];
  voiceSettings: {
    language: string;
    autoSpeak: boolean;
    speechRate: number;
  };
}

const STORAGE_KEY = "pathfinder_das_memory";

const DEFAULT_MEMORY: StudentMemory = {
  studentName: "Student",
  department: "Computer Science & Engineering",
  targetTier: "Tier 1",
  dreamCompany: "Google / Razorpay",
  cgpa: 8.4,
  notes: [
    {
      id: "note_1",
      text: "Focusing on Graph BFS/DFS and Dynamic Programming for upcoming placement season.",
      createdAt: new Date().toLocaleDateString(),
    },
  ],
  recentActions: [
    {
      action: "System Initialized",
      target: "Executive Dashboard",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ],
  reminders: [
    {
      id: "rem_1",
      title: "Complete 2 LeetCode Mediums daily",
      time: "Daily 09:00 AM",
      completed: false,
    },
  ],
  voiceSettings: {
    language: "auto",
    autoSpeak: true,
    speechRate: 1.0,
  },
};

export class PathfinderMemoryManager {
  private static instance: PathfinderMemoryManager;
  private memory: StudentMemory;

  private constructor() {
    this.memory = this.load();
  }

  public static getInstance(): PathfinderMemoryManager {
    if (!PathfinderMemoryManager.instance) {
      PathfinderMemoryManager.instance = new PathfinderMemoryManager();
    }
    return PathfinderMemoryManager.instance;
  }

  private load(): StudentMemory {
    if (typeof window === "undefined") return DEFAULT_MEMORY;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_MEMORY, ...parsed };
      }
    } catch (e) {
      console.warn("[PathfinderMemory] Error loading memory:", e);
    }
    return DEFAULT_MEMORY;
  }

  public save(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.warn("[PathfinderMemory] Error saving memory:", e);
    }
  }

  public getMemory(): StudentMemory {
    return { ...this.memory };
  }

  public updateProfile(updates: Partial<Pick<StudentMemory, "studentName" | "dreamCompany" | "cgpa" | "targetTier" | "department">>): void {
    this.memory = { ...this.memory, ...updates };
    this.save();
  }

  public addNote(text: string): { id: string; text: string; createdAt: string } {
    const note = {
      id: `note_${Date.now()}`,
      text: text.trim(),
      createdAt: new Date().toLocaleDateString(),
    };
    this.memory.notes.unshift(note);
    if (this.memory.notes.length > 20) {
      this.memory.notes = this.memory.notes.slice(0, 20);
    }
    this.save();
    return note;
  }

  public recordAction(action: string, target?: string): void {
    this.memory.recentActions.unshift({
      action,
      target,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    if (this.memory.recentActions.length > 30) {
      this.memory.recentActions = this.memory.recentActions.slice(0, 30);
    }
    this.save();
  }

  public clearHistory(): void {
    this.memory.recentActions = [];
    this.save();
  }

  public updateVoiceSettings(settings: Partial<StudentMemory["voiceSettings"]>): void {
    this.memory.voiceSettings = { ...this.memory.voiceSettings, ...settings };
    this.save();
  }
}

export const memoryManager = PathfinderMemoryManager.getInstance();
