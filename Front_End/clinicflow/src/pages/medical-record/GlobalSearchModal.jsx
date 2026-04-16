import React, { useState, useEffect, useRef } from "react";
import { Search, User, Phone, ArrowRight, X, Clock, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { medicalPatientService } from "../../services/api";

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState([]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Load recent patients from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("clinicflow_recent_patients");
        if (saved) setRecent(JSON.parse(saved));
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                // In a real system, we'd use a server-side search param
                // Here we fetch and filter for simulation of global search
                const res = await medicalPatientService.getAll();
                const filtered = res.data.filter(p => 
                    p.name.toLowerCase().includes(query.toLowerCase()) ||
                    p.phoneNumber?.includes(query)
                ).slice(0, 5);
                setResults(filtered);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (patient) => {
        // Update recent patients
        const updatedRecent = [patient, ...recent.filter(p => p.id !== patient.id)].slice(0, 5);
        localStorage.setItem("clinicflow_recent_patients", JSON.stringify(updatedRecent));
        
        navigate(`/patients/${patient.id}/medical-record`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            {/* Command Palette */}
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-outline bg-surface shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                
                {/* Search Input */}
                <div className="flex items-center gap-4 border-b border-outline p-6">
                    <Search className="h-6 w-6 text-primary" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search patients by name or phone..."
                        className="flex-1 bg-transparent text-xl font-bold text-on-surface outline-none placeholder:text-muted-foreground/30"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") onClose();
                        }}
                    />
                    <div className="flex items-center gap-1 shrink-0 px-3 py-1 bg-slate-100 rounded-xl border border-outline">
                        <span className="text-[10px] font-black text-slate-400">ESC</span>
                    </div>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4">
                    {loading && (
                        <div className="py-12 text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Searching Registry...</p>
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm font-bold">No patients found matching "{query}"</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Search Results</h3>
                            {results.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    className="group flex w-full items-center justify-between gap-4 rounded-2xl p-4 transition-all hover:bg-primary/5 hover:translate-x-1"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-on-surface">{p.name}</p>
                                            <p className="text-xs font-bold text-muted-foreground">#{p.patientId || p.id.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="hidden sm:block">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                <Phone className="h-3 w-3" />
                                                <span>{p.phoneNumber || "No phone"}</span>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length < 2 && recent.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Patients</h3>
                            {recent.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    className="group flex w-full items-center gap-4 rounded-2xl p-4 transition-all hover:bg-surface-alt"
                                >
                                    <Clock className="h-5 w-5 text-slate-300" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-black text-on-surface">{p.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.phoneNumber || "No Phone"}</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length < 2 && recent.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <Command className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-60">Ready to search across your clinic...</p>
                        </div>
                    )}
                </div>

                {/* Footer Shortcuts */}
                <div className="flex items-center justify-between border-t border-outline bg-slate-50/50 p-4 px-8">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <kbd className="rounded-md border border-outline bg-white px-2 py-0.5 text-[10px] font-black shadow-sm">Enter</kbd>
                            <span className="text-[10px] font-bold text-slate-400">to select</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="rounded-md border border-outline bg-white px-2 py-0.5 text-[10px] font-black shadow-sm">↑↓</kbd>
                            <span className="text-[10px] font-bold text-slate-400">to navigate</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">ClinicFlow Power Search</p>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
