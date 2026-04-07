import React from "react";
import { Plus, Trash2, FileSearch, ImageIcon } from "lucide-react";
import { getFileUrl } from "../../services/api";

const TestResultsSection = ({ visitData, addResultRow, updateResult, removeResult, handleResultFileChange }) => (
    <div className="bg-surface border border-outline p-8 rounded-[2rem] shadow-sm">
        <div className="flex justify-between items-center border-b border-outline pb-4 mb-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-on-surface">
                <FileSearch className="w-6 h-6 text-orange-500" /> Test Results
            </h2>
            <button
                type="button"
                onClick={addResultRow}
                className="text-orange-600 bg-orange-50 hover:bg-orange-100 p-2 rounded-xl transition-colors"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
        <div className="space-y-6">
            {visitData.results.map((r, index) => (
                <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-8 bg-surface-alt/40 p-8 border border-outline/60 rounded-[2.5rem] relative group/result hover:bg-surface-alt/60 transition-all duration-300 shadow-sm"
                >
                    <button
                        type="button"
                        onClick={() => removeResult(index)}
                        className="absolute top-6 right-6 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover/result:opacity-100 z-10"
                        title="Remove Result Group"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black text-xs">
                                {index + 1}
                            </div>
                            <span className="text-xs font-black text-on-surface uppercase tracking-widest opacity-40">Entry Details</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: "Lab Findings", field: "labResult", icon: "🧪", placeholder: "Values / Interpretations" },
                                { label: "Imaging Impression", field: "imagingResult", icon: "🎞️", placeholder: "Findings / Impressions" },
                                { label: "Other Info", field: "otherResult", icon: "📝", placeholder: "External / Misc" }
                            ].map((input) => (
                                <div key={input.field}>
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                                        {input.icon} {input.label}
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder={input.placeholder}
                                        value={r[input.field]}
                                        onChange={(e) => updateResult(index, input.field, e.target.value)}
                                        className="w-full p-4 border border-outline rounded-2xl bg-surface text-on-surface text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-l border-outline/30 pl-8 border-dashed">
                        <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-primary opacity-40" />
                            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Visual Evidence</span>
                        </div>
                        
                        <label className="flex flex-col items-center justify-center gap-3 p-4 border-2 border-dashed border-outline/50 rounded-[2rem] cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group/upload relative overflow-hidden flex-1 min-h-[160px]">
                            {r.imageData || r.imageUrl ? (
                                <div className="absolute inset-0 w-full h-full">
                                    <img
                                        src={r.imageUrl ? getFileUrl(r.imageUrl) : r.imageData}
                                        alt="Result Preview"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/upload:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-primary/60 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-all duration-300">
                                        <div className="bg-white text-primary p-3 rounded-2xl shadow-2xl scale-50 group-hover/upload:scale-100 transition-transform">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center border border-outline shadow-inner group-hover/upload:scale-110 transition-all duration-300 group-hover/upload:shadow-lg">
                                        <Plus className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[10px] font-black text-on-surface uppercase tracking-[2px] mb-1">Upload</span>
                                        <span className="block text-[8px] font-bold text-on-surface-variant opacity-50 uppercase tracking-widest">JPG, PNG, PDF</span>
                                    </div>
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
                                onClick={() => {
                                    updateResult(index, "imageData", null);
                                    updateResult(index, "imageUrl", null);
                                }}
                                className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-3 h-3" /> Delete Attachment
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {visitData.results.length === 0 && (
                <p className="text-sm font-bold text-slate-400 text-center py-4">
                    No results recorded during this visit.
                </p>
            )}
        </div>
    </div>
);

export default TestResultsSection;
