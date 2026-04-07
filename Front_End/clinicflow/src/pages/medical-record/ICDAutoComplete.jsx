import React, { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import axios from "axios";

const ICDAutoComplete = ({ code, description, onChangeCode, onChangeDesc }) => {
    const [query, setQuery] = useState(description);
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

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
                    className="w-full p-3 border border-outline rounded-xl bg-surface text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors hover:border-primary/30"
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
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    className="w-full p-3 border border-outline rounded-xl bg-surface text-sm font-bold text-on-surface outline-none focus:border-primary transition-colors hover:border-primary/30"
                />
                {isOpen && results.length > 0 && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface border border-outline rounded-2xl shadow-2xl z-[9999] max-h-64 overflow-y-auto custom-scrollbar ring-8 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {results.map((r, i) => (
                            <div
                                key={i}
                                className="p-4 hover:bg-primary/5 cursor-pointer border-b border-outline/30 last:border-0 flex items-center gap-4 transition-colors text-on-surface group/item"
                                onClick={() => {
                                    onChangeCode(r[0]);
                                    onChangeDesc(r[1]);
                                    setQuery(r[1]);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg text-xs font-black shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                                    {r[0]}
                                </span>
                                <span className="text-sm font-bold leading-tight">{r[1]}</span>
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
