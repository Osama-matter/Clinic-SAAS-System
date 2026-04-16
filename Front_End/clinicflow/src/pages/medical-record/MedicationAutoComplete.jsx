import React, { useEffect, useState, useRef } from "react";
import { Pill, Search, Loader2, Sparkles, Info } from "lucide-react";
import { drugService } from "../../services/api";

const useDebounce = (value, delay) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

const MedicationAutoComplete = ({ value, onChange, placeholder = "Search clinical drug registry..." }) => {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (!isOpen || debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        let cancelled = false;
        const fetchDrugs = async () => {
            setIsLoading(true);
            try {
                const response = await drugService.search(debouncedQuery, 10);
                if (!cancelled) {
                    setResults(response.data || []);
                }
            } catch (error) {
                console.error("Drug search failed", error);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchDrugs();
        return () => { cancelled = true; };
    }, [debouncedQuery, isOpen]);

    useEffect(() => {
        if (!isOpen && value !== query) {
            setQuery(value || "");
        }
    }, [value, isOpen]);

    const showDropdown = isOpen && (results.length > 0 || isLoading);

    return (
        <div className="relative min-w-0 w-full group/main">
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
                    }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="w-full p-3.5 pl-11 pr-10 border border-outline rounded-2xl bg-surface text-on-surface text-sm font-black outline-none focus:border-primary hover:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner placeholder:text-muted-foreground/30"
                />
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isOpen ? "text-primary" : "text-muted-foreground/30"}`} />
                {isLoading && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                )}
            </div>

            {showDropdown && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[9999] overflow-hidden rounded-[2rem] border border-outline bg-surface shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-8 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    
                    <div className="px-5 py-2.5 border-b border-outline/30 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Medication Findings</span>
                        </div>
                        <span className="text-[8px] font-black text-primary/40 uppercase">Smart Suggest</span>
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {results.map((drug) => (
                            <button
                                key={drug.id}
                                type="button"
                                className="group/item flex w-full items-center gap-4 border-b border-outline/10 px-5 py-4 text-left transition-all hover:bg-primary/5 last:border-b-0"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    setQuery(drug.name);
                                    onChange(drug.name);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary transition-all group-hover/item:scale-110 group-hover/item:bg-primary group-hover/item:text-white group-hover/item:shadow-lg group-hover/item:shadow-primary/20">
                                    <Pill className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-black text-on-surface">
                                            {drug.name}
                                        </span>
                                        {drug.dosage && (
                                            <span className="text-[10px] font-bold text-primary/60 px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                                                {drug.dosage}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 transition-colors group-hover/item:text-primary/60">
                                        <Info className="w-3 h-3" />
                                        <span className="truncate">{drug.form || "General formulation"}</span>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {results.length === 0 && isLoading && (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                                <Loader2 className="h-8 w-8 animate-spin opacity-20 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Consulting Drug Library...</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-slate-50/50 border-t border-outline/30 text-center">
                        <p className="text-[9px] font-bold text-slate-400">Select a drug to automatically apply clinical defaults</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicationAutoComplete;

