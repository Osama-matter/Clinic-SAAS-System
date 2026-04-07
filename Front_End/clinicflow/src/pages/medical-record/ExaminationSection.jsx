import React from "react";
import { Stethoscope } from "lucide-react";

const SYSTEMS = [
    {
        key: "resp", label: "🫁 1. Respiratory System", color: "blue",
        fields: ["Inspection", "Palpation", "Percussion", "Auscultation"],
        placeholders: { Auscultation: "Breath sounds, wheeze..." },
    },
    {
        key: "cvs", label: "❤️ 2. Cardiovascular System", color: "rose",
        fields: ["Pulse", "HeartSounds", "Murmurs", "Edema"],
    },
    {
        key: "cns", label: "🧠 3. Nervous System", color: "purple",
        fields: ["Consciousness", "MotorPower", "Sensation", "Reflexes"],
    },
    {
        key: "git", label: "🍽️ 4. Gastrointestinal", color: "orange",
        fields: ["Inspection", "Palpation", "Percussion", "Auscultation"],
    },
    {
        key: "msk", label: "🦴 5. Musculoskeletal", color: "amber",
        fields: ["Swelling", "Tenderness", "Rom", "Deformity"],
        fieldLabels: { Rom: "Range of Motion" },
    },
    {
        key: "skin", label: "🧴 6. Skin & Dermatology", color: "emerald",
        fields: ["Rash", "Ulcers", "Pigmentation", "Infection"],
    },
];

const ExaminationSection = ({ visitData, setVisitData }) => (
    <div className="bg-surface border border-outline p-8 rounded-[2rem] shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3 text-on-surface border-b border-outline pb-4 mb-6">
            <Stethoscope className="w-6 h-6 text-emerald-500" /> Physical Examination & Orders
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center gap-3 border-b border-outline pb-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                        <Stethoscope className="w-5 h-5 transition-transform hover:scale-110" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-on-surface">Local Examination (By Systems)</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Comprehensive physiological assessment
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SYSTEMS.map((sys) => (
                        <div 
                            key={sys.key} 
                            className="bg-surface-alt border border-outline p-6 rounded-3xl relative overflow-hidden group hover:border-primary/40 transition-all duration-300"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 blur-2xl rounded-full transition-all group-hover:scale-150 ${
                                sys.color === "blue" ? "bg-blue-500" :
                                sys.color === "rose" ? "bg-rose-500" :
                                sys.color === "purple" ? "bg-purple-500" :
                                sys.color === "orange" ? "bg-orange-500" :
                                sys.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
                            }`} />
                            
                            <h4 className="flex items-center gap-2 text-sm font-black text-on-surface mb-4 px-1 relative z-10">
                                <span className={`w-1 h-4 rounded-full ${
                                    sys.color === "blue" ? "bg-blue-500" :
                                    sys.color === "rose" ? "bg-rose-500" :
                                    sys.color === "purple" ? "bg-purple-500" :
                                    sys.color === "orange" ? "bg-orange-500" :
                                    sys.color === "amber" ? "bg-amber-500" : "bg-emerald-500"
                                }`} />
                                {sys.label}
                            </h4>
                            <div className="space-y-4 relative z-10">
                                {sys.fields.map((f) => (
                                    <div key={f}>
                                        <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                            {sys.fieldLabels?.[f] || f.replace(/([A-Z])/g, " $1").trim()}
                                        </label>
                                        <input
                                            type="text"
                                            value={visitData[`${sys.key}_${f}`]}
                                            onChange={(e) =>
                                                setVisitData({ ...visitData, [`${sys.key}_${f}`]: e.target.value })
                                            }
                                            className="w-full p-3 border border-outline rounded-xl bg-surface text-sm font-bold text-on-surface outline-none focus:border-primary transition-all hover:border-primary/30 shadow-inner focus:shadow-none"
                                            placeholder={sys.placeholders?.[f] || "Findings..."}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    General Examination Findings
                </label>
                <textarea
                    rows={3}
                    value={visitData.generalExamination}
                    onChange={(e) => setVisitData({ ...visitData, generalExamination: e.target.value })}
                    className="w-full p-4 border border-outline rounded-xl bg-surface-alt outline-none focus:border-primary font-medium shadow-inner"
                    placeholder="Overall clinical state, orientation, etc."
                />
            </div>
            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Other Examination Notes
                </label>
                <textarea
                    rows={3}
                    value={visitData.localExamination}
                    onChange={(e) => setVisitData({ ...visitData, localExamination: e.target.value })}
                    className="w-full p-4 border border-outline rounded-xl bg-surface-alt outline-none focus:border-primary font-medium shadow-inner"
                    placeholder="Any system findings not covered above..."
                />
            </div>
            <div className="lg:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Clinical Progress Notes
                </label>
                <textarea
                    rows={4}
                    value={visitData.notes}
                    onChange={(e) => setVisitData({ ...visitData, notes: e.target.value })}
                    className="w-full p-4 border border-outline rounded-xl bg-surface-alt outline-none focus:border-primary font-medium"
                />
            </div>
        </div>
    </div>
);

export default ExaminationSection;
