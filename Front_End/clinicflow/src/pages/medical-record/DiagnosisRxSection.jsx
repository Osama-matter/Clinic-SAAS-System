import React, { useMemo } from "react";
import { Plus, Trash2, CheckCircle2, Pill, AlertTriangle } from "lucide-react";
import ICDAutoComplete from "./ICDAutoComplete";
import MedicationAutoComplete from "./MedicationAutoComplete";
import { checkDrugInteractions } from "./utils";

const DiagnosisRxSection = ({
    visitData,
    addDiagnosisRow, updateDiagnosis, removeDiagnosis,
    addPrescriptionRow, updatePrescription, removePrescription,
}) => {
    // ─── التحقق من التفاعلات الدوائية ───
    const interactionAlerts = useMemo(() => {
        return checkDrugInteractions(visitData.prescriptions);
    }, [visitData.prescriptions]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start relative">
            {/* Assessment/Diagnosis */}
            <div className="relative z-30 rounded-[2.5rem] border border-outline bg-surface p-4 shadow-sm group sm:p-8">
                <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -ml-16 -mt-16 group-hover:bg-red-500/10 transition-colors pointer-events-none" />

                <div className="relative z-10 mb-6 flex items-center justify-between border-b border-outline/50 pb-4 sm:mb-8 sm:pb-5">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-3 text-red-500">
                            <CheckCircle2 className="w-6 h-6 animate-pulse" /> Assessment
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 pl-9">Critical Findings & ICD-10</p>
                    </div>
                    <button
                        type="button"
                        onClick={addDiagnosisRow}
                        className="w-10 h-10 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all duration-300 shadow-sm hover:shadow-red-200"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4 relative z-10">
                    {visitData.diagnoses.map((diag, index) => (
                        <div
                            key={index}
                            className="group/row flex flex-col items-stretch gap-4 rounded-[2rem] border border-outline/60 bg-surface-alt/40 p-4 shadow-sm transition-all duration-300 hover:border-red-200 sm:flex-row sm:items-end sm:p-5"
                        >
                            <ICDAutoComplete
                                code={diag.icd10Code}
                                description={diag.description}
                                onChangeCode={(val) => updateDiagnosis(index, "icd10Code", val)}
                                onChangeDesc={(val) => updateDiagnosis(index, "description", val)}
                            />
                            <button
                                type="button"
                                onClick={() => removeDiagnosis(index)}
                                className="p-3.5 text-red-300 hover:text-white hover:bg-red-500 rounded-2xl transition-all active:scale-90 sm:mb-0.5 opacity-100 sm:opacity-0 group-hover/row:opacity-100 flex items-center justify-center border border-outline/30 sm:border-0"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {visitData.diagnoses.length === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-[2rem] border border-dashed border-outline/50">
                            <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No diagnoses recorded</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Prescriptions */}
            <div className="relative z-20 overflow-visible rounded-[2.5rem] border border-outline bg-surface p-4 shadow-sm group sm:p-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                <div className="relative z-10 mb-6 flex items-center justify-between border-b border-outline/50 pb-4 sm:mb-8 sm:pb-5">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-3 text-on-surface">
                            <Pill className="w-6 h-6 text-primary" /> Rx & Plan
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 pl-9">Medication & Administration</p>
                    </div>
                    <button
                        type="button"
                        onClick={addPrescriptionRow}
                        className="w-10 h-10 flex items-center justify-center text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-2xl transition-all duration-300 shadow-sm hover:shadow-primary-glow"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* ─── قسم التنبيهات الذكية ─── */}
                {interactionAlerts.length > 0 && (
                    <div className="relative z-50 mb-6 space-y-3 animate-bounce-short">
                        {interactionAlerts.map((alert, idx) => (
                            <div 
                                key={idx} 
                                className={`flex items-start gap-3 p-4 rounded-2xl border ${
                                    alert.severity === "Critical" 
                                        ? "bg-red-50 border-red-200 text-red-700" 
                                        : "bg-amber-50 border-amber-200 text-amber-700"
                                } shadow-sm`}
                            >
                                <AlertTriangle className={`w-5 h-5 shrink-0 ${alert.severity === "Critical" ? "animate-pulse" : ""}`} />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider mb-1">{alert.severity} Alert</p>
                                    <p className="text-sm font-bold leading-relaxed">{alert.message}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {alert.involved.map(drug => (
                                            <span key={drug} className="text-[10px] font-black px-2 py-0.5 bg-white/50 rounded-full border border-current opacity-70">
                                                {drug}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-6 relative z-10">
                    {visitData.prescriptions.map((rx, index) => (
                        <div
                            key={index}
                            className="relative flex flex-col gap-5 rounded-[2rem] border border-outline/60 bg-surface-alt/40 p-4 transition-all duration-300 group/rx hover:border-primary/30 sm:p-6"
                        >
                            <button
                                type="button"
                                onClick={() => removePrescription(index)}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/rx:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="md:col-span-2 lg:col-span-2">
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Medication Name
                                    </label>
                                    <MedicationAutoComplete
                                        value={rx.medicationName}
                                        onChange={(val) => updatePrescription(index, "medicationName", val)}
                                        placeholder="e.g. Amoxicillin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Dosage
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 500mg"
                                        value={rx.dosage}
                                        onChange={(e) => updatePrescription(index, "dosage", e.target.value)}
                                        className="w-full p-3.5 border border-outline rounded-xl bg-surface text-on-surface text-sm font-bold outline-none focus:border-primary hover:border-primary/30 transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 5 Days"
                                        value={rx.duration}
                                        onChange={(e) => updatePrescription(index, "duration", e.target.value)}
                                        className="w-full p-3.5 border border-outline rounded-xl bg-surface text-on-surface text-sm font-bold outline-none focus:border-primary hover:border-primary/30 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                        Administration Instructions
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1 Tab 3x/day after food"
                                        value={rx.instructions}
                                        onChange={(e) => updatePrescription(index, "instructions", e.target.value)}
                                        className="w-full p-3.5 border border-outline rounded-xl bg-surface text-on-surface text-sm font-bold outline-none focus:border-primary hover:border-primary/30 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {visitData.prescriptions.length === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-[2rem] border border-dashed border-outline/50">
                            <Pill className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No prescriptions recorded</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiagnosisRxSection;
