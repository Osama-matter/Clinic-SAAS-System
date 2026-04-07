import React from "react";
import { ClipboardList } from "lucide-react";

const PatientBackgroundSection = ({ visitData, setVisitData }) => (
    <div className="bg-surface border border-outline p-8 rounded-[2.5rem] shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3 text-on-surface border-b border-outline/50 pb-5 mb-8">
            <ClipboardList className="w-6 h-6 text-slate-400" /> Patient Persistent Background
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { label: "Allergies", field: "allergies", placeholder: "e.g. Penicillin, Pollen" },
                { label: "Chronic Diseases", field: "chronicDiseases", placeholder: "e.g. DM, HTN" },
                { label: "Drug History", field: "drugHistory", placeholder: "Current medications..." }
            ].map((item) => (
                <div key={item.field}>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 pl-1 opacity-60">
                        {item.label}
                    </label>
                    <input
                        type="text"
                        value={visitData[item.field]}
                        onChange={(e) => setVisitData({ ...visitData, [item.field]: e.target.value })}
                        placeholder={item.placeholder}
                        className="w-full p-4 border border-outline rounded-2xl bg-surface-alt font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-inner placeholder:text-on-surface-variant/30 text-sm"
                    />
                </div>
            ))}
        </div>
    </div>
);

export default PatientBackgroundSection;
