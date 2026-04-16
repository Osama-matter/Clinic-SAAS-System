import React, { useState, useEffect, useRef, useCallback } from "react";
import { Beaker, Search, Loader2, Sparkles } from "lucide-react";
import { LAB_TESTS_LIST } from "./clinicalKnowledge";

const useDebounce = (value, delay) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

const fetchLabSuggestions = async (query) => {
    if (!query || query.length < 2) return [];
    try {
        const url = `https://clinicaltables.nlm.nih.gov/api/loinc_items/v3/search?type=question&terms=${encodeURIComponent(query)}&maxList=8&ef=LONG_COMMON_NAME`;
        const res = await fetch(url);
        const data = await res.json();
        // data[3] = array of extra fields [[LONG_COMMON_NAME], ...]
        // data[1] = array of LOINC codes
        const names = (data[3] || []).map((item, i) => ({
            name: item[0] || data[1]?.[i] || "",
            code: data[1]?.[i] || "",
            source: "loinc",
        })).filter(t => t.name);
        return names;
    } catch {
        return [];
    }
};

const LabAutoComplete = ({ value, onChange, placeholder = "Search lab tests..." }) => {
    const [query, setQuery] = useState(value || "");
    const [localResults, setLocalResults] = useState([]);
    const [loincResults, setLoincResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 350);

    // Local filter
    useEffect(() => {
        if (!isOpen) return;
        const filtered = LAB_TESTS_LIST.filter(test =>
            test.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        ).slice(0, 4);
        setLocalResults(filtered);
    }, [debouncedQuery, isOpen]);

    // LOINC API fetch
    useEffect(() => {
        if (!isOpen || debouncedQuery.length < 2) {
            setLoincResults([]);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        fetchLabSuggestions(debouncedQuery).then(results => {
            if (!cancelled) {
                // Deduplicate against local results
                const localNames = new Set(localResults.map(t => t.name.toLowerCase()));
                setLoincResults(results.filter(t => !localNames.has(t.name.toLowerCase())).slice(0, 5));
                setIsLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [debouncedQuery, isOpen, localResults]);

    useEffect(() => {
        if (!isOpen && value !== query) setQuery(value || "");
    }, [value, isOpen]);

    const allResults = [...localResults, ...loincResults];
    const showDropdown = isOpen && (allResults.length > 0 || isLoading);

    return (
        <div className="relative flex-1 min-w-0">
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="w-full rounded-md border border-border/30 bg-card/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all pl-9 pr-8"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/50 animate-spin" />
                )}
            </div>

            {showDropdown && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface border border-outline rounded-xl shadow-2xl z-[999] max-h-60 overflow-y-auto custom-scrollbar ring-8 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Local results section */}
                    {localResults.length > 0 && (
                        <>
                            <div className="px-3 py-1.5 border-b border-outline/30 bg-slate-50/50 flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">My List</span>
                            </div>
                            {localResults.map((test, i) => (
                                <ResultItem key={`local-${i}`} test={test} onSelect={() => { onChange(test.name); setQuery(test.name); setIsOpen(false); }} />
                            ))}
                        </>
                    )}

                    {/* LOINC results section */}
                    {loincResults.length > 0 && (
                        <>
                            <div className="px-3 py-1.5 border-b border-outline/30 bg-emerald-50/50 flex items-center gap-1.5">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">LOINC Suggestions</span>
                            </div>
                            {loincResults.map((test, i) => (
                                <ResultItem key={`loinc-${i}`} test={test} onSelect={() => { onChange(test.name); setQuery(test.name); setIsOpen(false); }} isExternal />
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const ResultItem = ({ test, onSelect, isExternal }) => (
    <div
        className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-outline/20 last:border-0 flex items-center gap-3 transition-colors group/item"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
    >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors group-hover/item:bg-emerald-500 group-hover/item:text-white ${isExternal ? "bg-emerald-50 text-emerald-500" : "bg-emerald-100/50 text-emerald-600"}`}>
            <Beaker className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-on-surface truncate block">{test.name}</span>
            {test.code && <span className="text-[10px] text-slate-400 font-mono">{test.code}</span>}
        </div>
    </div>
);

export default LabAutoComplete;