import React from "react";
import { Save } from "lucide-react";

const VisitFormBottomBar = ({ submitting, viewMode, onCancel }) => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4
        pt-6 mt-4 border-t border-border/30">
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
            <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider">
                Session active — review before saving
            </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-muted-foreground
                    rounded-lg border border-border/50 bg-secondary/50 hover:bg-secondary transition-all
                    disabled:opacity-50 active:scale-95"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5
                    text-sm font-medium text-primary-foreground bg-primary rounded-lg
                    hover:opacity-90 transition-all shadow-lg shadow-primary/20
                    disabled:opacity-50 active:scale-95"
            >
                {submitting ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                {submitting
                    ? "Saving..."
                    : viewMode === "edit-visit"
                        ? "Update Record"
                        : "Commit & Save"}
            </button>
        </div>
    </div>
);

export default VisitFormBottomBar;