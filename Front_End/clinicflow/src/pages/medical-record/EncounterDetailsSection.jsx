import React from "react";
import { ClipboardList } from "lucide-react";

const EncounterDetailsSection = ({ visitData, setVisitData, doctors, viewMode }) => (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/50">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {viewMode === "edit-visit" ? "Edit Encounter Details" : "Encounter Details"}
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
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Chief Complaint / Symptoms
            </label>
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