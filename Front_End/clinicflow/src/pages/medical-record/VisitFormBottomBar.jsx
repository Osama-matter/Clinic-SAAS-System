import React from "react";
import { Save } from "lucide-react";

const VisitFormBottomBar = ({ submitting, viewMode, onCancel }) => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-8 mt-4 border-t border-outline/50">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-on-surface-variant font-bold text-xs uppercase tracking-widest opacity-60">
                Session active • Review before saving
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-4 font-black text-on-surface-variant bg-surface-alt border border-outline hover:bg-surface-container rounded-2xl transition-all tracking-tight active:scale-95 disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-10 py-4 font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-2xl transition-all shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-3 tracking-tight text-base disabled:opacity-50"
            >
                {submitting ? (
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Save className="w-5 h-5" />
                )}
                {submitting
                    ? "Saving Record..."
                    : viewMode === "edit-visit"
                        ? "Update Record"
                        : "Commit Record & Save"}
            </button>
        </div>
    </div>
);

export default VisitFormBottomBar;