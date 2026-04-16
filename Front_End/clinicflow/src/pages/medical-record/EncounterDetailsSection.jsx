import React from "react";
import { ClipboardList, Sparkles, Loader2 } from "lucide-react";

const EncounterDetailsSection = ({ visitData, setVisitData, doctors, viewMode, onAiAssist, aiLoading }) => (

    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/10">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                {viewMode === "edit-visit" ? "Edit Encounter" : "Encounter Details"}
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assign Doctor
                </label>
                <select
                    value={visitData.doctorId}
                    onChange={(e) => setVisitData({ ...visitData, doctorId: e.target.value })}
                    className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground outline-none
                        focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name} ({d.specialty})
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Visit Type
                </label>
                <select
                    value={visitData.visitType}
                    onChange={(e) => setVisitData({ ...visitData, visitType: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground outline-none
                        focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                >
                    <option value={1}>Initial Consultation</option>
                    <option value={2}>Follow-Up</option>
                    <option value={3}>Emergency</option>
                    <option value={4}>Routine Checkup</option>
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date &amp; Time
                </label>
                <input
                    type="datetime-local"
                    value={visitData.visitDate}
                    onChange={(e) => setVisitData({ ...visitData, visitDate: e.target.value })}
                    className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground outline-none
                        focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
            </div>
        </div>

        <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Chief Complaint / Symptoms
                </label>
                <button
                    type="button"
                    onClick={onAiAssist}
                    disabled={aiLoading}
                    className="group relative flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4 group-hover:animate-pulse" />
                    )}
                    <span>{aiLoading ? "Consulting AI..." : "✨ Magic AI Assist"}</span>
                </button>
            </div>

            <textarea
                rows={3}
                value={visitData.symptoms}
                onChange={(e) => setVisitData({ ...visitData, symptoms: e.target.value })}
                placeholder="Patient's primary symptoms or reason for visit..."
                className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none
                    focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-none
                    placeholder:text-muted-foreground/40"
            />
        </div>
    </div>
);

export default EncounterDetailsSection;