import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, ClipboardList, Pill, Beaker, Info, ArrowRight, CircleDashed } from "lucide-react";

/**
 * AISuggestionDrawer - Decision Center
 * Allows doctors to review and selectively apply AI suggestions.
 */
const AISuggestionDrawer = ({ isOpen, onClose, suggestion, onApply, isLoading }) => {
    // Selection state
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(true);
    const [selectedMeds, setSelectedMeds] = useState([]);
    const [selectedLabs, setSelectedLabs] = useState([]);

    // Initialize selection when suggestion changes
    useEffect(() => {
        if (suggestion) {
            setSelectedDiagnosis(true);
            setSelectedMeds(suggestion.medications?.map((_, i) => i) || []);
            setSelectedLabs(suggestion.labs?.map((_, i) => i) || []);
        }
    }, [suggestion]);

    if (!isOpen) return null;

    const toggleMed = (index) => {
        setSelectedMeds(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const toggleLab = (index) => {
        setSelectedLabs(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleApply = () => {
        const filteredSuggestion = {
            ...suggestion,
            diagnosis: selectedDiagnosis ? suggestion.diagnosis : null,
            medications: suggestion.medications?.filter((_, i) => selectedMeds.includes(i)) || [],
            labs: suggestion.labs?.filter((_, i) => selectedLabs.includes(i)) || [],
            notes: suggestion.notes // Notes always included if diagnosis is selected or just as summary
        };
        onApply(filteredSuggestion);
    };

    const totalSelected = (selectedDiagnosis ? 1 : 0) + selectedMeds.length + selectedLabs.length;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI Decision Center</h2>
                                <p className="text-[10px] font-bold text-blue-500 uppercase">Review Clinical Proposals</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-all hover:rotate-90"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        {isLoading ? (
                            <div className="flex h-64 flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-600/10 border-t-blue-600" />
                                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-blue-600 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-900">Analyzing Case Data...</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Negotiating Medical Models</p>
                                </div>
                            </div>
                        ) : suggestion ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8"
                            >
                                {/* Diagnosis Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                                            <ClipboardList className="h-3.5 w-3.5" />
                                            <span>Assessment Proposal</span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedDiagnosis(!selectedDiagnosis)}
                                            className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md transition-all ${
                                                selectedDiagnosis ? "text-blue-600 bg-blue-50" : "text-slate-300 bg-slate-50"
                                            }`}
                                        >
                                            {selectedDiagnosis ? "Included" : "Excluded"}
                                        </button>
                                    </div>
                                    <div 
                                        onClick={() => setSelectedDiagnosis(!selectedDiagnosis)}
                                        className={`cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                                            selectedDiagnosis 
                                                ? "border-blue-200 bg-blue-50/30 border-l-4 border-l-blue-600 shadow-md shadow-blue-500/5" 
                                                : "border-slate-100 bg-white opacity-40 grayscale"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`text-lg font-black ${selectedDiagnosis ? "text-slate-900" : "text-slate-400"}`}>
                                                {suggestion.diagnosis}
                                            </h3>
                                            {selectedDiagnosis && <Check className="h-5 w-5 text-blue-600" />}
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                            {suggestion.notes}
                                        </p>
                                    </div>
                                </section>

                                {/* Medications Section */}
                                {suggestion.medications?.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                                            <Pill className="h-3.5 w-3.5" />
                                            <span>Medication Choices</span>
                                        </div>
                                        <div className="space-y-3">
                                            {suggestion.medications.map((m, i) => {
                                                const isSelected = selectedMeds.includes(i);
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => toggleMed(i)}
                                                        className={`cursor-pointer flex items-start gap-4 rounded-2xl border p-4 transition-all duration-300 group ${
                                                            isSelected 
                                                                ? "border-slate-200 bg-white shadow-sm ring-2 ring-blue-500/10" 
                                                                : "border-slate-100 bg-slate-50/50 opacity-40"
                                                        }`}
                                                    >
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                                                            isSelected ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white border-slate-200 text-slate-300"
                                                        }`}>
                                                            {isSelected ? <Check className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-black ${isSelected ? "text-slate-900" : "text-slate-400"}`}>
                                                                {m.medicationName}
                                                            </p>
                                                            <div className="mt-1 flex flex-wrap gap-2">
                                                                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{m.dosage}</span>
                                                                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{m.duration}</span>
                                                            </div>
                                                            {isSelected && m.instructions && (
                                                                <p className="mt-2 text-[10px] italic text-slate-400 font-medium">
                                                                    {m.instructions}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* Labs Section */}
                                {suggestion.labs?.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                                            <Beaker className="h-3.5 w-3.5" />
                                            <span>Investigations</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {suggestion.labs.map((l, i) => {
                                                const isSelected = selectedLabs.includes(i);
                                                return (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => toggleLab(i)}
                                                        className={`cursor-pointer flex items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                                                            isSelected ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-white opacity-40 shadow-none"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-emerald-500 animate-pulse" : "bg-slate-200"}`} />
                                                            <span className={`text-xs font-black ${isSelected ? "text-slate-700" : "text-slate-400"}`}>{l.testName}</span>
                                                        </div>
                                                        <Check className={`h-4 w-4 transition-all ${isSelected ? "text-emerald-500 scale-100" : "opacity-0 scale-50"}`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                )}

                                {/* Safety Warning Banner */}
                                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Clinical Disclaimer</p>
                                        <p className="text-[11px] font-bold text-amber-700/80 leading-relaxed">
                                            AI proposals are generated for assistance. The physician retains full responsibility for final diagnosis and therapy decisions.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center py-24 text-slate-300">
                                <Sparkles className="h-16 w-16 mx-auto opacity-10 mb-6" />
                                <p className="text-xs font-black uppercase tracking-widest italic">No clinical proposal available</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-100 p-6 bg-slate-50/80 backdrop-blur-sm">
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl bg-white border border-slate-200 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={!suggestion || isLoading || totalSelected === 0}
                                className="flex-[2] flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-700 hover:-translate-y-1 disabled:opacity-50 disabled:grayscale"
                            >
                                <Check className="h-4 w-4" />
                                Apply {totalSelected > 0 ? `${totalSelected} Selected` : "Decisions"}
                                <ArrowRight className="h-4 w-4 opacity-50 ml-1" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AISuggestionDrawer;
