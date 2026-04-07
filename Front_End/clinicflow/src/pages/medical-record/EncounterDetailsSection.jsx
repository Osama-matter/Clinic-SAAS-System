import React from "react";
import { ClipboardList } from "lucide-react";

const EncounterDetailsSection = ({ visitData, setVisitData, doctors, viewMode }) => (
    <div className="bg-surface border border-outline p-8 rounded-[2.5rem] shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3 text-on-surface border-b border-outline/50 pb-5 mb-8">
            <ClipboardList className="w-6 h-6 text-primary" />{" "}
            {viewMode === "edit-visit" ? "Edit Encounter Details" : "Encounter Details"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                    Assign Doctor
                </label>
                <select
                    value={visitData.doctorId}
                    onChange={(e) => setVisitData({ ...visitData, doctorId: e.target.value })}
                    className="w-full p-4 border border-outline rounded-2xl bg-surface-alt font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name} ({d.specialty})
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                    Visit Type
                </label>
                <select
                    value={visitData.visitType}
                    onChange={(e) => setVisitData({ ...visitData, visitType: parseInt(e.target.value) })}
                    className="w-full p-4 border border-outline rounded-2xl bg-surface-alt font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                >
                    <option value={1}>Initial Consultation</option>
                    <option value={2}>Follow-Up</option>
                    <option value={3}>Emergency</option>
                    <option value={4}>Routine Checkup</option>
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                    Date & Time
                </label>
                <input
                    type="datetime-local"
                    value={visitData.visitDate}
                    onChange={(e) => setVisitData({ ...visitData, visitDate: e.target.value })}
                    className="w-full p-4 border border-outline rounded-2xl bg-surface-alt font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                />
            </div>
        </div>
        <div className="mt-8">
            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                Chief Complaint / Symptoms
            </label>
            <textarea
                rows={3}
                value={visitData.symptoms}
                onChange={(e) => setVisitData({ ...visitData, symptoms: e.target.value })}
                placeholder="Patient's primary symptoms or reason for visit..."
                className="w-full p-5 border border-outline rounded-2xl bg-surface-alt text-on-surface outline-none focus:border-primary font-bold placeholder:text-on-surface-variant/30 shadow-inner"
            />
        </div>
    </div>
);

export default EncounterDetailsSection;
