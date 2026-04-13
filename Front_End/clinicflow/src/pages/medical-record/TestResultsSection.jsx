import React from "react";
import { Plus, Trash2, FileSearch, ImageIcon } from "lucide-react";
import { getFileUrl } from "../../services/api";

const RESULT_INPUTS = [
    { label: "Lab Findings",       field: "labResult",     icon: "🧪", placeholder: "Values / Interpretations" },
    { label: "Imaging Impression", field: "imagingResult", icon: "🎞️", placeholder: "Findings / Impressions" },
    { label: "Other Info",         field: "otherResult",   icon: "📝", placeholder: "External / Misc" },
];

const TestResultsSection = ({ visitData, addResultRow, updateResult, removeResult, handleResultFileChange }) => (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/50">
            <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Test Results</h2>
            </div>
            <button
                type="button"
                onClick={addResultRow}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-warning/30
                    bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
            >
                <Plus className="h-4 w-4" />
            </button>
        </div>

        <div className="space-y-4">
            {visitData.results.map((r, index) => (
                <div key={index}
                    className="group/result grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6
                        rounded-lg border border-border/30 bg-secondary/30 p-5 relative hover:border-border/60 transition-all">
                    <button
                        type="button"
                        onClick={() => removeResult(index)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground/30
                            hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover/result:opacity-100 z-10"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-semibold text-primary">
                                {index + 1}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Entry Details</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {RESULT_INPUTS.map(({ label, field, icon, placeholder }) => (
                                <div key={field} className="space-y-1.5">
                                    <label className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {icon} {label}
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder={placeholder}
                                        value={r[field]}
                                        onChange={(e) => updateResult(index, field, e.target.value)}
                                        className="w-full rounded-lg border border-border/30 bg-card/60 px-3 py-2 text-sm text-foreground outline-none
                                            focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Image upload */}
                    <div className="flex flex-col gap-3 border-l border-dashed border-border/30 pl-6">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Visual Evidence</span>
                        </div>

                        <label className="group/upload relative flex flex-1 min-h-[140px] cursor-pointer flex-col items-center justify-center
                            rounded-lg border-2 border-dashed border-border/30 bg-secondary/20 overflow-hidden
                            hover:border-primary/30 hover:bg-primary/5 transition-all">
                            {r.imageData || r.imageUrl ? (
                                <div className="absolute inset-0">
                                    <img
                                        src={r.imageUrl ? getFileUrl(r.imageUrl) : r.imageData}
                                        alt="Result Preview"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover/upload:scale-105"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-primary/60 opacity-0 group-hover/upload:opacity-100 transition-all">
                                        <div className="rounded-lg bg-card p-2 shadow-lg">
                                            <ImageIcon className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/30 bg-card/50 shadow-inner mb-2
                                        group-hover/upload:scale-110 transition-transform">
                                        <Plus className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Upload</span>
                                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mt-0.5">JPG · PNG · PDF</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleResultFileChange(index, e.target.files[0])}
                            />
                        </label>

                        {(r.imageData || r.imageUrl) && (
                            <button
                                type="button"
                                onClick={() => { updateResult(index, "imageData", null); updateResult(index, "imageUrl", null); }}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10
                                    py-1.5 text-[10px] font-medium uppercase tracking-wider text-destructive
                                    hover:bg-destructive hover:text-white transition-all"
                            >
                                <Trash2 className="h-3 w-3" /> Delete
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {visitData.results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground/50 py-4">
                    No results recorded during this visit.
                </p>
            )}
        </div>
    </div>
);

export default TestResultsSection;