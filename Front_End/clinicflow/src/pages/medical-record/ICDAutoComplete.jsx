import React, { useState, useEffect, useMemo, useRef } from "react";
import { Edit } from "lucide-react";
import axios from "axios";

const ICDAutoComplete = ({ code, description, onChangeCode, onChangeDesc }) => {
    const [query, setQuery] = useState(description);
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef(null);

    const safeResults = useMemo(() => (Array.isArray(results) ? results : []), [results]);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (query && query.length > 2 && isOpen) {
                try {
                    const res = await axios.get(
                        `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${query}`
                    );
                    setResults(res.data[3] || []);
                } catch (e) { }
            } else {
                setResults([]);
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [query, isOpen]);

    // Sync external changes
    useEffect(() => {
        if (description !== query && !isOpen) {
            setQuery(description);
        }
    }, [description, isOpen]);

    useEffect(() => {
        if (!isOpen) setActiveIndex(-1);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setActiveIndex(safeResults.length > 0 ? 0 : -1);
    }, [isOpen, safeResults.length]);

    useEffect(() => {
        if (!isOpen || activeIndex < 0) return;
        const el = listRef.current?.querySelector(`[data-icd-index="${activeIndex}"]`);
        if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }, [activeIndex, isOpen]);

    const selectResult = (r) => {
        onChangeCode(r[0]);
        onChangeDesc(r[1]);
        setQuery(r[1]);
        setIsOpen(false);
    };

    const highlightMatch = (text, q) => {
        const s = (text || "").toString();
        const needle = (q || "").toString().trim();
        if (!needle) return s;
        const idx = s.toLowerCase().indexOf(needle.toLowerCase());
        if (idx < 0) return s;
        const before = s.slice(0, idx);
        const match = s.slice(idx, idx + needle.length);
        const after = s.slice(idx + needle.length);
        return (
            <>
                {before}
                <span className="font-black text-primary">{match}</span>
                {after}
            </>
        );
    };

    return (
        <div className="relative flex-1 min-w-0 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(80px,120px)_1fr]">
            <div className="relative">
                <label className="block text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1.5 pl-1">
                    ICD-10 Code
                </label>
                <input
                    type="text"
                    placeholder="E11.9"
                    value={code}
                    onChange={(e) => onChangeCode(e.target.value)}
                    className="w-full p-3 border-0 !border-transparent rounded-xl bg-surface-alt text-sm font-bold text-on-surface outline-none focus:ring-0 focus:outline-none transition-colors shadow-none"
                />
            </div>
            <div className="relative">
                <label className="block text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1.5 pl-1">
                    Diagnosis Description
                </label>
                <input
                    type="text"
                    placeholder="Enter diagnosis or search ICD..."
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChangeDesc(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                            setIsOpen(true);
                            return;
                        }
                        if (!isOpen) return;

                        if (e.key === "Escape") {
                            e.preventDefault();
                            setIsOpen(false);
                            return;
                        }
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveIndex((i) => Math.min(safeResults.length - 1, (i < 0 ? 0 : i + 1)));
                        }
                        if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i - 1)));
                        }
                        if (e.key === "Enter") {
                            if (activeIndex >= 0 && activeIndex < safeResults.length) {
                                e.preventDefault();
                                selectResult(safeResults[activeIndex]);
                            }
                        }
                    }}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="w-full p-3 border-0 !border-transparent rounded-xl bg-surface-alt text-sm font-bold text-on-surface outline-none focus:ring-0 focus:outline-none transition-colors shadow-none"
                />
                {isOpen && safeResults.length > 0 && (
                    <div
                        ref={listRef}
                        className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface border rounded-lg z-[9999] max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                        style={{ borderColor: "var(--border-color-strong)" }}
                    >
                        {safeResults.map((r, i) => (
                            <div
                                key={i}
                                data-icd-index={i}
                                className={[
                                    "p-4 cursor-pointer border-b border-outline/30 last:border-0 flex items-center gap-4 transition-colors text-on-surface group/item",
                                    i === activeIndex ? "bg-primary/5" : "hover:bg-primary/5",
                                ].join(" ")}
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectResult(r)}
                            >
                                <span className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg text-xs font-black shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                                    {highlightMatch(r[0], query)}
                                </span>
                                <span className="text-sm font-bold leading-tight">{highlightMatch(r[1], query)}</span>
                            </div>
                        ))}
                    </div>
                )}
                {!code && query && !isOpen && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200">
                        <Edit className="w-2.5 h-2.5" /> Custom
                    </div>
                )}
            </div>
        </div>
    );
};

export default ICDAutoComplete;
