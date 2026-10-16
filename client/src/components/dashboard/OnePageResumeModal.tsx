import React, { useEffect } from "react";
import {
  X,
  Printer,
  Download,
  FileText,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Building,
  GraduationCap,
  ArrowLeft
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";

interface OnePageResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfileState;
}

export const OnePageResumeModal: React.FC<OnePageResumeModalProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const fullName = profile.fullName || "Candidate Name";
  const email = profile.email || "candidate@pathfinder.ai";
  const branch = profile.branch || "Computer Science & Engineering";
  const college = profile.college || "Institute of Technology";
  const cgpa = profile.cgpa ? profile.cgpa.toFixed(1) : "8.2";
  const gradYear = profile.graduationYear || 2026;
  const skills = profile.technicalSkills?.length
    ? profile.technicalSkills
    : ["Python", "TypeScript", "FastAPI", "React", "PostgreSQL", "Docker", "Data Structures & Algorithms"];

  const githubUrl = profile.codingProfiles?.github || "https://github.com/candidate";
  const leetcodeUrl = profile.codingProfiles?.leetcode || "https://leetcode.com/candidate";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto cursor-pointer"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0a0b10] shadow-[0_16px_64px_rgba(0,0,0,0.85)] overflow-hidden my-8 cursor-default"
      >
        
        {/* Top Controls Bar (Sticky, Hidden during Print) */}
        <div className="print:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.08] bg-[#11131c]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Return to AI Coach / Main Dashboard (Esc)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#f8fafc]">One-Page ATS Resume</h3>
              <span className="rounded-full border border-[#ffffff]/30 bg-[#ffffff]/10 px-2 py-0.5 text-[10px] font-bold text-[#ffffff]">
                Google X-Y-Z
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-950 px-3.5 py-2 text-xs font-bold transition-all hover:bg-zinc-200 active:scale-95 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close resume modal"
              className="rounded-xl border border-white/10 bg-black/40 p-2 text-[#94a3b8] hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Resume Sheet Preview (Prints as clean white page) */}
        <div className="p-4 sm:p-8 flex justify-center bg-black/60">
          <div
            id="printable-ats-resume"
            className="w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs leading-relaxed print:shadow-none print:p-0 print:m-0 print:w-full"
            style={{ minHeight: "1050px" }}
          >
            {/* 1. Header */}
            <div className="text-center border-b border-zinc-300 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 uppercase">{fullName}</h1>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-600 font-medium">
                <span>{email}</span>
                <span>•</span>
                <span>{profile.branch || "B.Tech Computer Science"}</span>
                <span>•</span>
                <span>{profile.preferredLocation || "India"}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-900 font-semibold">
                <a href={githubUrl} target="_blank" rel="noreferrer" className="underline hover:opacity-75">
                  GitHub Profile
                </a>
                <span>•</span>
                <a href={leetcodeUrl} target="_blank" rel="noreferrer" className="underline hover:opacity-75">
                  LeetCode Profile
                </a>
              </div>
            </div>

            {/* 2. Education */}
            <div className="mt-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2">
                Education
              </h2>
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-bold text-zinc-900">Bachelor of Technology in {branch}</span>
                  <div className="text-zinc-600 text-[11px]">{college}</div>
                </div>
                <div className="text-right text-[11px]">
                  <span className="font-semibold text-zinc-800">CGPA: {cgpa} / 10.0</span>
                  <div className="text-zinc-500">Expected: {gradYear}</div>
                </div>
              </div>
            </div>

            {/* 3. Technical Skills */}
            <div className="mt-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2">
                Technical Proficiencies
              </h2>
              <div className="space-y-1 text-[11px]">
                <div>
                  <strong className="text-zinc-900">Languages & Core:</strong>{" "}
                  <span className="text-zinc-700">{skills.slice(0, 5).join(", ")}, SQL, C++</span>
                </div>
                <div>
                  <strong className="text-zinc-900">Frameworks & Cloud:</strong>{" "}
                  <span className="text-zinc-700">FastAPI, React 19, Node.js, Docker, Redis Streams, TailwindCSS</span>
                </div>
                <div>
                  <strong className="text-zinc-900">CS Fundamentals:</strong>{" "}
                  <span className="text-zinc-700">Data Structures & Algorithms, DBMS (ACID & Indexing), Operating Systems, System Design</span>
                </div>
              </div>
            </div>

            {/* 4. Flagship Projects */}
            <div className="mt-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2">
                Flagship Engineering Projects
              </h2>

              {/* Project 1 */}
              <div className="mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-zinc-900">
                    Distributed Asynchronous Task Queue & Rate Limiter
                  </span>
                  <span className="text-[10px] text-zinc-500">Python, FastAPI, Redis Streams, Docker</span>
                </div>
                <ul className="mt-1 list-disc list-outside pl-4 space-y-0.5 text-[11px] text-zinc-700">
                  <li>
                    Architected a distributed background worker system processing <strong>3,500+ tasks/sec</strong> using Redis Streams and token-bucket concurrency middleware.
                  </li>
                  <li>
                    Eliminated message loss under network partitions by implementing dead-letter queues and atomic PostgreSQL state commitments.
                  </li>
                  <li>
                    Reduced average job turnaround latency by <strong>44%</strong> through async non-blocking FastAPI worker pipelines.
                  </li>
                </ul>
              </div>

              {/* Project 2 */}
              <div className="mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-zinc-900">
                    Real-Time Collaborative Code & Canvas Studio
                  </span>
                  <span className="text-[10px] text-zinc-500">React 19, TypeScript, WebSockets, CRDTs</span>
                </div>
                <ul className="mt-1 list-disc list-outside pl-4 space-y-0.5 text-[11px] text-zinc-700">
                  <li>
                    Engineered browser-based multi-user code editor supporting <strong>50+ concurrent users</strong> with sub-30ms keystroke reconciliation.
                  </li>
                  <li>
                    Integrated conflict-free replicated data types (CRDTs) to ensure zero merge collisions during simultaneous cursor edits.
                  </li>
                  <li>
                    Containerized in-browser WebAssembly sandbox to execute untrusted code safely with zero server-side execution vulnerability.
                  </li>
                </ul>
              </div>
            </div>

            {/* 5. Experience / Academic Milestones */}
            <div className="mt-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2">
                Academic & Problem Solving Achievements
              </h2>
              <ul className="list-disc list-outside pl-4 space-y-0.5 text-[11px] text-zinc-700">
                <li>
                  Solved <strong>150+ DSA problems</strong> across LeetCode & HackerRank covering Sliding Window, Dynamic Programming, and Graph Traversals.
                </li>
                <li>
                  Maintained strict <strong>zero active backlogs</strong> throughout academic semesters, qualifying for 100% of Tier-1 campus recruitment drives.
                </li>
                <li>
                  Active participant in Smart India Hackathon & Open Source engineering initiatives with verified GitHub contributions.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Controls Bar (Hidden during Print) */}
        <div className="print:hidden sticky bottom-0 z-40 flex items-center justify-between border-t border-white/[0.08] bg-[#11131c]/95 backdrop-blur-xl px-6 py-3.5 shadow-lg">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>← Back to AI Coach / Dashboard</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-950 px-4 py-2.5 text-xs font-bold transition-all hover:bg-zinc-200 active:scale-95 shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
