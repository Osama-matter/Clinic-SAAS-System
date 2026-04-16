import React from "react";
import { AlertTriangle, Heart, Pill, Clock, ShieldAlert } from "lucide-react";

function calcAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function daysSince(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
}

/**
 * StickyPatientHeader
 * Props:
 *  - patient: { name, dateOfBirth, allergies, chronicDiseases, drugHistory }
 *  - latestVisitDate: ISO string of last visit
 *  - currentMeds: array of { medicationName, dosage } from most recent visit
 *  - visible: boolean — controlled by scroll
 */
const StickyPatientHeader = ({ patient, latestVisitDate, currentMeds = [], visible }) => {
    if (!patient) return null;

    const age = calcAge(patient.dateOfBirth);
    const lastVisit = daysSince(latestVisitDate);
    const hasAllergies = !!patient.allergies;
    const hasChronic = !!patient.chronicDiseases;

    return (
        <div
            className={`
                fixed top-0 left-0 right-0 z-50
                transition-all duration-300 ease-in-out
                ${visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}
            `}
        >
            <div className="bg-surface/95 backdrop-blur-xl border-b border-outline shadow-xl shadow-black/10">
                <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3 lg:gap-6">

                    {/* Name + Age */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">
                            {patient.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                            <p className="font-black text-sm text-on-surface leading-tight truncate max-w-[160px]">{patient.name}</p>
                            {age !== null && (
                                <p className="text-[10px] font-bold text-on-surface-variant">{age} yrs</p>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-outline hidden sm:block" />

                    {/* CRITICAL — Allergies */}
                    {hasAllergies && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1.5 animate-pulse-slow">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-red-400">⚠ Allergy Alert</p>
                                <p className="text-xs font-bold text-red-500 leading-tight">{patient.allergies}</p>
                            </div>
                        </div>
                    )}

                    {/* Chronic Diseases */}
                    {hasChronic && (
                        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-1.5">
                            <Heart className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">Chronic</p>
                                <p className="text-xs font-bold text-orange-600 leading-tight truncate max-w-[140px]">{patient.chronicDiseases}</p>
                            </div>
                        </div>
                    )}

                    {/* Current Meds */}
                    {currentMeds.length > 0 && (
                        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-1.5">
                            <Pill className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Current Meds</p>
                                <p className="text-xs font-bold text-blue-600 leading-tight truncate max-w-[180px]">
                                    {currentMeds.slice(0, 2).map(m => m.medicationName).filter(Boolean).join(", ")}
                                    {currentMeds.length > 2 && ` +${currentMeds.length - 2}`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Last Visit */}
                    {lastVisit && (
                        <div className="flex items-center gap-2 bg-surface-alt border border-outline rounded-xl px-3 py-1.5 ms-auto">
                            <Clock className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Last Visit</p>
                                <p className="text-xs font-bold text-on-surface leading-tight">{lastVisit}</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default StickyPatientHeader;
