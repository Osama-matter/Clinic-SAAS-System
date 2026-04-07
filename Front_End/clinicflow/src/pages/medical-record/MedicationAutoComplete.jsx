import React, { useEffect, useState } from "react";
import { Pill } from "lucide-react";
import { drugService } from "../../services/api";

const MedicationAutoComplete = ({ value, onChange, placeholder = "Search medicine..." }) => {
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const timeout = setTimeout(async () => {
            try {
                setLoading(true);
                const trimmedQuery = query.trim();
                const response = await drugService.search(trimmedQuery, 12);
                setResults(response.data || []);
            } catch (error) {
                console.error("Drug search failed", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [query, isOpen]);

    useEffect(() => {
        if (!isOpen && value !== query) {
            setQuery(value || "");
        }
    }, [value, isOpen, query]);

    return (
        <div className="relative min-w-0 w-full">
            <input
                type="text"
                placeholder={placeholder}
                value={query}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={() => setTimeout(() => setIsOpen(false), 180)}
                className="w-full p-3.5 border border-outline rounded-xl bg-surface text-on-surface text-sm font-bold outline-none focus:border-primary hover:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
            />

            {isOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[9999] overflow-hidden rounded-2xl border border-outline bg-surface shadow-2xl ring-8 ring-black/5">
                    {loading && (
                        <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400">
                            Loading medicines...
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                            {results.map((drug) => (
                                <button
                                    key={drug.id}
                                    type="button"
                                    className="flex w-full items-start gap-3 border-b border-outline/30 px-4 py-3 text-left transition-colors hover:bg-primary/5 last:border-b-0"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setQuery(drug.name);
                                        onChange(drug.name);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                                        <Pill className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-black text-on-surface">
                                            {drug.name}
                                        </span>
                                        {drug.form && (
                                            <span className="mt-1 block text-xs font-bold text-on-surface-variant/70">
                                                {drug.form}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && results.length === 0 && (
                        <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400">
                            No medicines found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MedicationAutoComplete;
