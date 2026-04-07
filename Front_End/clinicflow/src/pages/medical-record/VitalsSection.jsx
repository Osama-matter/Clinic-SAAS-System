import React from "react";
import { Activity } from "lucide-react";
import { isVitalDanger } from "./utils";

const VITAL_FIELDS = [
    { label: "BP (mmHg)", field: "bloodPressure", placeholder: "120/80" },
    { label: "Pulse (BPM)", field: "heartRate", placeholder: "72", type: "number" },
    { label: "Temp (°C)", field: "temperature", placeholder: "37.0", type: "number", step: "0.1" },
    { label: "PO2 (%)", field: "po2", placeholder: "98", type: "number", step: "0.1" },
    { label: "RBS (mg/dL)", field: "rbs", placeholder: "110", type: "number", step: "0.1" },
    { label: "Weight (kg)", field: "weight", placeholder: "70.5", type: "number", step: "0.1" },
    { label: "Height (cm)", field: "height", placeholder: "175", type: "number", step: "0.1" },
    { label: "BMI", field: "bmi", placeholder: "22.5", type: "number", step: "0.1", readOnly: true },
];

const VitalsSection = ({ visitData, setVisitData }) => (
    <div className="bg-surface border border-outline p-8 rounded-[2rem] shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3 text-on-surface border-b border-outline pb-4 mb-6">
            <Activity className="w-6 h-6 text-rose-500" /> Triage & Vitals
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {VITAL_FIELDS.map((v) => (
                <div
                    key={v.field}
                    className={`vital-box transition-all duration-300 ${isVitalDanger(v.field, visitData[v.field])
                        ? "bg-red-50 border-red-200 ring-4 ring-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                        : "bg-surface-alt border-outline"
                        }`}
                >
                    <label
                        className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 pl-1 ${isVitalDanger(v.field, visitData[v.field]) ? "text-red-500" : "text-slate-400"
                            }`}
                    >
                        {v.label}
                    </label>
                    <input
                        type={v.type || "text"}
                        step={v.step}
                        placeholder={v.placeholder}
                        value={visitData[v.field]}
                        onChange={(e) => setVisitData((p) => ({ ...p, [v.field]: e.target.value }))}
                        readOnly={v.readOnly}
                        className={`w-full p-3 bg-transparent text-sm font-bold text-on-surface outline-none text-center ${isVitalDanger(v.field, visitData[v.field]) ? "text-red-600 !font-black" : ""
                            } ${v.readOnly ? "cursor-default" : ""}`}
                    />
                </div>
            ))}
        </div>
    </div>
);

export default VitalsSection;
