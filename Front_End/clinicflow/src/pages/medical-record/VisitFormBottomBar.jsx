import React from "react";
import { Save } from "lucide-react";

const VisitFormBottomBar = ({ submitting, viewMode, onCancel }) => (
    <div className="relative mt-12 py-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Session Status</p>
                    <p className="text-sm font-bold text-slate-700 mt-1">Ready to commit clinical record</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all disabled:opacity-50"
                >
                    Discard Changes
                </button>
                <button
                    type="submit"
                    id="submit-clinical-record"
                    disabled={submitting}
                    className="group relative flex w-full sm:w-auto items-center justify-center gap-4 overflow-hidden rounded-xl bg-emerald-500 px-12 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/20 transition-all hover:-translate-y-1 hover:shadow-emerald-500/40 disabled:opacity-50 active:scale-95"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {submitting ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    )}
                    <span>
                        {submitting
                            ? "Committing..."
                            : viewMode === "edit-visit"
                                ? "Update Medical Record"
                                : "Commit & Save Record"}
                    </span>
                    <span className="hidden lg:inline-block ml-3 text-[10px] opacity-40 py-1 px-2 rounded bg-black/20 font-mono">⌘S</span>
                </button>
            </div>
        </div>
    </div>
);

export default VisitFormBottomBar;