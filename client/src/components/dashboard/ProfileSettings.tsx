import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  GraduationCap,
  BookOpen,
  Code,
  Target,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Building,
  Check,
  AlertCircle
} from "lucide-react";
import { StudentProfileState } from "@/types/profile";

interface ProfileSettingsProps {
  profile: StudentProfileState;
  onSaveProfile: (updated: StudentProfileState) => Promise<void>;
  onResetToDefaults: () => void;
  apiBase: string;
}

const BRANCHES = [
  "AIML",
  "CSD",
  "CSE",
  "CSM",
  "IT",
  "ECE",
  "EEE",
  "Mechanical",
  "Civil",
  "Cyber Security",
  "IoT",
  "Data Science",
  "Other"
];

const ROLES = [
  "Software Development Engineer (SDE)",
  "Data Scientist / ML Engineer",
  "Cloud & DevOps Engineer",
  "QA & Automation Engineer",
  "Full-Stack Web Developer",
  "Product / Systems Analyst"
];

const TIERS = [
  "Product Companies / Tier-1 MNCs",
  "High-Growth Tech Startups",
  "Global Capability Centers (GCC)",
  "Service MNCs / Consultancies"
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onSaveProfile,
  onResetToDefaults,
  apiBase
}) => {
  const [formData, setFormData] = useState<StudentProfileState>({ ...profile });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      const mult = formData.cgpaFormulaMultiplier || 9.5;
      const updated: StudentProfileState = {
        ...formData,
        percentage: Math.round(formData.cgpa * mult * 10) / 10,
        backlogs: formData.activeBacklogs
      };
      await onSaveProfile(updated);
      setSuccessMsg("Profile saved! Platform calculations and AI context updated.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <User className="h-3.5 w-3.5" />
              <span>Single Source of Truth</span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-white">Profile & Candidate Settings</h1>
            <p className="mt-1 text-xs text-slate-400">
              Update your academic marks, backlogs, skills, or target role. All dashboard widgets and AI assistants will recalculate immediately.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetToDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="rounded-3xl border border-white/[0.08] bg-slate-900/50 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        {/* Section 1: Identity & College */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>Academic Identity</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Candidate Full Name</label>
              <input
                type="text"
                id="settings-full-name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">College / Institute</label>
              <input
                type="text"
                id="settings-college"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Branch / Department</label>
              <select
                id="settings-branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Course & Year</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                  placeholder="e.g. B.Tech"
                />
                <input
                  type="text"
                  value={formData.currentYear}
                  onChange={(e) => setFormData({ ...formData, currentYear: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none"
                  placeholder="e.g. 4th Year"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Academics & Formula */}
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Academic Performance & Live Conversion</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Current CGPA (0 - 10)</label>
                <span className="font-bold text-emerald-400">{formData.cgpa.toFixed(2)}</span>
              </div>
              <input
                type="number"
                id="settings-cgpa"
                step="0.05"
                min="0"
                max="10"
                value={formData.cgpa}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const cgpa = isNaN(val) ? 0 : val;
                  const mult = formData.cgpaFormulaMultiplier || 9.5;
                  setFormData({
                    ...formData,
                    cgpa,
                    percentage: Math.round(cgpa * mult * 10) / 10
                  });
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Live Converted Percentage</label>
              <input
                type="number"
                disabled
                value={(formData.cgpa * (formData.cgpaFormulaMultiplier || 9.5)).toFixed(1)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-emerald-300 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Conversion Multiplier</label>
              <select
                id="settings-formula"
                value={formData.cgpaFormulaMultiplier || 9.5}
                onChange={(e) => {
                  const mult = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    cgpaFormulaMultiplier: mult,
                    percentage: Math.round(formData.cgpa * mult * 10) / 10
                  });
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              >
                <option value={9.5}>AICTE / Standard (× 9.5)</option>
                <option value={10.0}>Direct Scale (× 10.0)</option>
                <option value={9.0}>State University (× 9.0)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">10th Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.tenthPercentage}
                onChange={(e) => setFormData({ ...formData, tenthPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">12th / Diploma (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.twelfthPercentage}
                onChange={(e) => setFormData({ ...formData, twelfthPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Active Standing Backlogs</label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.activeBacklogs}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setFormData({ ...formData, activeBacklogs: val, backlogs: val });
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Skills & Ratings */}
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Skills, Projects & Self-Assessments</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Flagship Projects Count</label>
              <input
                type="number"
                min="0"
                max="20"
                value={formData.projectsCount}
                onChange={(e) => setFormData({ ...formData, projectsCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Verified Internships Count</label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.internships}
                onChange={(e) => setFormData({ ...formData, internships: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Coding & DSA Confidence</label>
                <span className="font-bold text-cyan-400">{formData.coding} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.coding}
                onChange={(e) => setFormData({ ...formData, coding: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Communication & Interview Confidence</label>
                <span className="font-bold text-amber-400">{formData.communication} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Target Career Role */}
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span>Target Role & Preferences</span>
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Target Role</label>
              <select
                id="settings-target-role"
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Target Company Tier</label>
              <select
                id="settings-target-tier"
                value={formData.targetTier}
                onChange={(e) => setFormData({ ...formData, targetTier: e.target.value, preferredCompanyType: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save CTA Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
          <button
            type="submit"
            id="btn-save-settings"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving & Recalculating...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
