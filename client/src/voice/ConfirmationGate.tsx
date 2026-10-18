/**
 * ConfirmationGate.tsx - UI-Issued Action Authorization Gate
 * Enforces the architectural invariant:
 * "The confirmation token must come from a UI click/button the user presses -- never let the AI self-approve its own action."
 * Protects state mutations, route navigation, and external tool dispatches.
 */

import React, { useState } from "react";
import { ShieldCheck, ArrowRight, X, AlertCircle, CheckCircle } from "lucide-react";

export interface PendingAction {
  id: string;
  type: "navigate_tab" | "open_resume_builder" | "start_audit" | "export_report";
  label: string;
  description: string;
  payload?: any;
  targetTab?: string;
}

interface ConfirmationGateProps {
  pendingAction: PendingAction | null;
  onConfirm: (action: PendingAction, uiToken: string) => void;
  onDismiss: () => void;
  className?: string;
}

export const ConfirmationGate: React.FC<ConfirmationGateProps> = ({
  pendingAction,
  onConfirm,
  onDismiss,
  className = "",
}) => {
  if (!pendingAction) return null;

  const handleApprove = () => {
    // Generate secure UI confirmation token
    const uiIssuedToken = `ui_auth_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    onConfirm(pendingAction, uiIssuedToken);
  };

  return (
    <div
      className={`relative flex items-center justify-between gap-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 via-slate-950/90 to-blue-950/80 px-4 py-3 shadow-xl backdrop-blur-xl animate-slideUp text-white ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-inner">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Action Confirmation Required</span>
            <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/30">
              UI-Token-Gated
            </span>
          </div>
          <p className="text-xs text-slate-200 font-medium truncate">{pendingAction.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          <span>Dismiss</span>
        </button>

        <button
          type="button"
          onClick={handleApprove}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
        >
          <span>Approve Action</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
