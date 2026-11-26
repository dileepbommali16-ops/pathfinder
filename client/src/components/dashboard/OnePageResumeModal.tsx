import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, ArrowLeft, Settings2 } from "lucide-react";
import {
  StudentProfileState,
  isPlaceholderCandidateEmail,
  isPlaceholderCandidateName,
  isProfileUnconfigured,
} from "@/types/profile";

interface OnePageResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfileState;
  onOpenProfile?: () => void;
}

function dedupeClean(items?: Array<string | null | undefined>): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const cleaned = String(raw || "").trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

export const OnePageResumeModal: React.FC<OnePageResumeModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenProfile,
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

  const unconfigured = isProfileUnconfigured(profile);

  const hasRealName = !isPlaceholderCandidateName(profile.fullName);
  const fullName = hasRealName ? profile.fullName.trim() : "";

  const rawEmail = (profile.email || "").trim();
  const email = !isPlaceholderCandidateEmail(rawEmail) ? rawEmail : "";

  const course = (profile.course || "").trim();
  const branch = (profile.branch || "").trim();
  const college = (profile.college || "").trim();
  const preferredLocation = (profile.preferredLocation || "").trim();
  const targetRole = (profile.targetRole || "").trim();
  const targetDomain = (profile.targetDomain || "").trim();

  const hasCgpa = Number(profile.cgpa) > 0;
  const cgpaText = hasCgpa ? `${Number(profile.cgpa).toFixed(2)} / 10.0` : "";
  const gradYear = !unconfigured && profile.graduationYear ? String(profile.graduationYear) : "";
  const tenthPct = Number(profile.tenthPercentage) > 0 ? Number(profile.tenthPercentage) : 0;
  const twelfthPct = Number(profile.twelfthPercentage) > 0 ? Number(profile.twelfthPercentage) : 0;

  const githubUrl = (profile.githubUrl || profile.codingProfiles?.github || "").trim();
  const leetcodeUrl = (profile.leetcodeUrl || profile.codingProfiles?.leetcode || "").trim();
  const linkedinUrl = (profile.linkedinUrl || profile.codingProfiles?.linkedin || "").trim();

  const profileLinks = [
    githubUrl ? { label: "GitHub", href: githubUrl } : null,
    leetcodeUrl ? { label: "LeetCode", href: leetcodeUrl } : null,
    linkedinUrl ? { label: "LinkedIn", href: linkedinUrl } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const technicalSkills = dedupeClean([
    ...(profile.technicalSkills || []),
    ...(profile.skills || []),
  ]);
  const programmingLanguages = dedupeClean([
    ...(profile.programmingLanguages || []),
    ...(profile.languages || []),
  ]);
  const tools = dedupeClean(profile.tools);
  const hasAnySkills =
    technicalSkills.length > 0 || programmingLanguages.length > 0 || tools.length > 0;

  const projectsCount = Math.max(0, Number(profile.projectsCount) || 0);
  const internshipsCount = Math.max(0, Number(profile.internships) || 0);
  const activeBacklogs = Math.max(0, Number(profile.activeBacklogs ?? profile.backlogs ?? 0));
  const certifications = dedupeClean(profile.certifications);

  const headerMetaParts = [email, branch, preferredLocation].filter(Boolean);
  const degreeHeading = branch
    ? course
      ? `${course} in ${branch}`
      : branch
    : "";

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto cursor-pointer print:static print:p-0 print:bg-white"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl border border-white/10 bg-[#000000] shadow-[0_16px_64px_rgba(0,0,0,0.85)] overflow-hidden my-auto cursor-default print:max-h-none print:my-0 print:border-0 print:shadow-none"
      >
        {/* Single Clean Action Bar (Pinned, Hidden during Print) */}
        <div className="print:hidden shrink-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#000000]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 hover:border-white/40 transition-all cursor-pointer active:scale-95"
              title="Return to Dashboard (Esc)"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">One-Page ATS Resume</h3>
              <span className="rounded-md border border-white/[0.14] bg-[#141418] px-2 py-0.5 font-mono text-[10px] font-medium text-[#D4D4D8]">
                Profile-Synced
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#141418] px-3.5 py-2 text-xs font-medium text-[#FAFAFA] hover:border-white/30 hover:bg-[#1C1C22] transition-all cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-white text-zinc-950 px-4 py-2 text-xs font-semibold transition-all hover:bg-zinc-200 active:scale-95 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Unconfigured Profile Notice (Hidden during Print) */}
        {unconfigured && (
          <div className="print:hidden shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#111116] px-4 sm:px-6 py-2.5 text-xs text-[#D4D4D8]">
            <span>
              Your profile has unconfigured fields. Populate your academic record, skills, and links
              in Profile Settings — no fabricated placeholders are injected.
            </span>
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="font-medium text-[#FAFAFA] underline underline-offset-4 hover:text-[#D4D4D8] cursor-pointer"
              >
                Open Profile Settings
              </button>
            )}
          </div>
        )}

        {/* Resume Sheet Preview (Prints as clean white page) */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-8 flex justify-center items-start bg-black/60 print:overflow-visible print:p-0 print:bg-white">
          <div
            id="printable-ats-resume"
            className="w-full max-w-[800px] bg-white text-zinc-900 p-8 sm:p-12 shadow-2xl rounded-sm font-sans text-xs leading-relaxed print:shadow-none print:p-0 print:m-0 print:w-full"
            style={{ minHeight: "1050px" }}
          >
            {/* 1. Header */}
            <div className="text-center border-b border-zinc-300 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 uppercase">
                {fullName || (
                  <span className="normal-case italic font-medium text-zinc-400">
                    Add your full name in Profile Settings
                  </span>
                )}
              </h1>

              {targetRole && (
                <div className="mt-1 text-[11px] font-semibold text-zinc-700">
                  {targetRole}
                  {targetDomain ? ` · ${targetDomain}` : ""}
                </div>
              )}

              {headerMetaParts.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-600 font-medium">
                  {headerMetaParts.map((item, idx) => (
                    <React.Fragment key={`${item}-${idx}`}>
                      {idx > 0 && <span>·</span>}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="mt-1.5 text-[11px] italic text-zinc-400 print:hidden">
                  Add email, branch, and preferred location in Profile Settings
                </div>
              )}

              {profileLinks.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-900 font-semibold">
                  {profileLinks.map((link, idx) => (
                    <React.Fragment key={link.label}>
                      {idx > 0 && <span>·</span>}
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:opacity-75"
                      >
                        {link.label}: {link.href.replace(/^https?:\/\//i, "")}
                      </a>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-[11px] italic text-zinc-400 print:hidden">
                  Add GitHub, LeetCode, or LinkedIn URLs in Profile Settings
                </div>
              )}
            </div>

            {/* 2. Education */}
            <div className="mt-5">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2.5">
                Education
              </h2>
              {degreeHeading || college || hasCgpa ? (
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <div>
                    <span className="font-bold text-zinc-900">
                      {degreeHeading || (
                        <span className="italic font-normal text-zinc-400">
                          Branch not set — Add in Profile Settings
                        </span>
                      )}
                    </span>
                    <div className="text-zinc-600 text-[11px]">
                      {college || (
                        <span className="italic text-zinc-400">
                          Institution not set — Add in Profile Settings
                        </span>
                      )}
                    </div>
                    {(tenthPct > 0 || twelfthPct > 0) && (
                      <div className="mt-0.5 text-[10px] text-zinc-500">
                        {[
                          tenthPct > 0 ? `Class X: ${tenthPct}%` : "",
                          twelfthPct > 0 ? `Class XII: ${twelfthPct}%` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="font-semibold text-zinc-800">
                      {cgpaText ? `CGPA: ${cgpaText}` : "CGPA: Add in Profile Settings"}
                    </span>
                    {gradYear && <div className="text-zinc-500">Class of {gradYear}</div>}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] italic text-zinc-500">
                  Education details not configured yet. Add your college, branch, CGPA, and
                  graduation year in Profile Settings.
                </p>
              )}
            </div>

            {/* 3. Technical Skills */}
            <div className="mt-5">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2.5">
                Technical Proficiencies
              </h2>
              {hasAnySkills ? (
                <div className="space-y-1.5 text-[11px]">
                  {technicalSkills.length > 0 && (
                    <div>
                      <strong className="text-zinc-900">Core Technical Skills:</strong>{" "}
                      <span className="text-zinc-700">{technicalSkills.join(", ")}</span>
                    </div>
                  )}
                  {programmingLanguages.length > 0 && (
                    <div>
                      <strong className="text-zinc-900">Programming Languages:</strong>{" "}
                      <span className="text-zinc-700">{programmingLanguages.join(", ")}</span>
                    </div>
                  )}
                  {tools.length > 0 && (
                    <div>
                      <strong className="text-zinc-900">Tools &amp; Platforms:</strong>{" "}
                      <span className="text-zinc-700">{tools.join(", ")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] italic text-zinc-500">
                  No technical skills recorded yet. Add your verified skills in Profile Settings.
                </p>
              )}
            </div>

            {/* 4. Projects & Internship Experience (Honest Profile-Driven Summary) */}
            <div className="mt-5">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2.5">
                Projects &amp; Experience
              </h2>
              {projectsCount > 0 || internshipsCount > 0 ? (
                <div className="space-y-2.5 text-[11px] text-zinc-700">
                  {internshipsCount > 0 && (
                    <div className="rounded border border-zinc-200 bg-zinc-50/70 p-3">
                      <div className="font-semibold text-zinc-900">
                        Internships Recorded: {internshipsCount}
                      </div>
                      <p className="mt-1 text-zinc-600">
                        Replace this section in your final document with each organization name,
                        role title, duration, and verified Google X-Y-Z outcomes.
                      </p>
                    </div>
                  )}
                  {projectsCount > 0 && (
                    <div className="rounded border border-zinc-200 bg-zinc-50/70 p-3">
                      <div className="font-semibold text-zinc-900">
                        Engineering Projects Recorded: {projectsCount}
                      </div>
                      <p className="mt-1 text-zinc-600">
                        Add each project&apos;s actual title, repository link, stack
                        {technicalSkills.length > 0
                          ? ` (e.g., ${technicalSkills.slice(0, 4).join(", ")})`
                          : ""}
                        , and measured impact metrics before submitting.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] italic text-zinc-500">
                  No projects or internships recorded yet. Update Projects and Internships in
                  Profile Settings.
                </p>
              )}
            </div>

            {/* 5. Certifications & Academic Standing */}
            <div className="mt-5">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-200 pb-1 mb-2.5">
                Certifications &amp; Academic Standing
              </h2>
              {certifications.length > 0 || !unconfigured ? (
                <ul className="list-disc list-outside pl-4 space-y-1 text-[11px] text-zinc-700">
                  {certifications.map((cert) => (
                    <li key={cert}>{cert}</li>
                  ))}
                  {!unconfigured && (
                    <li>
                      Academic standing:{" "}
                      <strong>
                        {activeBacklogs === 0
                          ? "0 active backlogs"
                          : `${activeBacklogs} active backlog${activeBacklogs === 1 ? "" : "s"}`}
                      </strong>
                      {hasCgpa ? ` · Current CGPA ${Number(profile.cgpa).toFixed(2)}/10.0` : ""}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-[11px] italic text-zinc-500">
                  Add certifications and academic details in Profile Settings to populate this
                  section.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
