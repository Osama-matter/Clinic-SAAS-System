import React, { useState } from "react";
import { Stethoscope, ChevronDown } from "lucide-react";

const SYSTEMS = [
    {
        key: "resp", label: "🫁 Respiratory System", color: "blue",
        fields: ["Inspection", "Palpation", "Percussion", "Auscultation"],
        placeholders: { Auscultation: "Breath sounds, wheeze..." },
    },
    {
        key: "cvs", label: "❤️ Cardiovascular System", color: "rose",
        fields: ["Pulse", "HeartSounds", "Murmurs", "Edema"],
    },
    {
        key: "cns", label: "🧠 Nervous System", color: "purple",
        fields: ["Consciousness", "MotorPower", "Sensation", "Reflexes"],
    },
    {
        key: "git", label: "🍽️ Gastrointestinal", color: "orange",
        fields: ["Inspection", "Palpation", "Percussion", "Auscultation"],
    },
    {
        key: "msk", label: "🦴 Musculoskeletal", color: "amber",
        fields: ["Swelling", "Tenderness", "Rom", "Deformity"],
        fieldLabels: { Rom: "Range of Motion" },
    },
    {
        key: "skin", label: "🧴 Skin & Dermatology", color: "emerald",
        fields: ["Rash", "Ulcers", "Pigmentation", "Infection"],
    },
];

const COLOR_MAP = {
    blue:    { bar: "bg-blue-500",    bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   glow: "bg-blue-500"    },
    rose:    { bar: "bg-rose-500",    bg: "bg-rose-50",    border: "border-rose-200",   text: "text-rose-700",   glow: "bg-rose-500"    },
    purple:  { bar: "bg-purple-500",  bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700", glow: "bg-purple-500"  },
    orange:  { bar: "bg-orange-500",  bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700", glow: "bg-orange-500"  },
    amber:   { bar: "bg-amber-500",   bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",  glow: "bg-amber-500"   },
    emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700",glow: "bg-emerald-500" },
};

// ── helper: هل فيه أي قيمة مكتوبة في الـ system ده؟
const systemHasData = (sys, visitData) =>
    sys.fields.some((f) => visitData[`${sys.key}_${f}`]?.trim());

const ExaminationSection = ({ visitData, setVisitData }) => {
    // كل system مغلق by default — الدكتور يفتح اللي يحتاجه بس
    const [openSystems, setOpenSystems] = useState({});

    const toggleSystem = (key) =>
        setOpenSystems((prev) => ({ ...prev, [key]: !prev[key] }));

    // ── Set All to Normal: نفس اللوجيك القديم بالظبط ──
    const setAllToNormal = () => {
        const normalValues = {};
        SYSTEMS.forEach((sys) => {
            sys.fields.forEach((f) => {
                normalValues[`${sys.key}_${f}`] = "Normal";
            });
        });
        setVisitData((prev) => ({
            ...prev,
            ...normalValues,
            generalExamination:
                prev.generalExamination ||
                "General condition is good. Patient is conscious, alert, and oriented.",
        }));
        // افتح كل الـ systems بعد "Set All to Normal" عشان الدكتور يشوف القيم
        const allOpen = {};
        SYSTEMS.forEach((s) => (allOpen[s.key] = true));
        setOpenSystems(allOpen);
    };

    return (
        <div className="bg-surface border border-outline p-8 rounded-[2rem] shadow-sm">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline pb-4 mb-6">
                <h2 className="text-xl font-black flex items-center gap-3 text-on-surface">
                    <Stethoscope className="w-6 h-6 text-emerald-500" />
                    Physical Examination & Orders
                </h2>
                <button
                    type="button"
                    onClick={setAllToNormal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 shadow-sm transition-all hover:bg-emerald-600 hover:text-white active:scale-95"
                >
                    <Stethoscope className="w-4 h-4" /> Set All to Normal
                </button>
            </div>

            {/* ── General Examination + Notes (محتفظين بترتيبهم القديم) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        General Examination Findings
                    </label>
                    <textarea
                        rows={3}
                        value={visitData.generalExamination}
                        onChange={(e) =>
                            setVisitData({ ...visitData, generalExamination: e.target.value })
                        }
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
                        onChange={(e) =>
                            setVisitData({ ...visitData, localExamination: e.target.value })
                        }
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
                        onChange={(e) =>
                            setVisitData({ ...visitData, notes: e.target.value })
                        }
                        className="w-full p-4 border border-outline rounded-xl bg-surface-alt outline-none focus:border-primary font-medium"
                    />
                </div>
            </div>

            {/* ── Local Examination Header ── */}
            <div className="flex items-center gap-3 border-b border-outline pb-4 mb-6">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-on-surface">
                        Local Examination (By Systems)
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tap a system to expand — only fill what's relevant
                    </p>
                </div>
            </div>

            {/* ── Accordion Systems ── */}
            <div className="flex flex-col gap-3">
                {SYSTEMS.map((sys) => {
                    const c = COLOR_MAP[sys.color];
                    const isOpen = !!openSystems[sys.key];
                    const hasData = systemHasData(sys, visitData);

                    return (
                        <div
                            key={sys.key}
                            className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                                isOpen
                                    ? `${c.border} shadow-sm`
                                    : hasData
                                    ? `${c.border} bg-surface`
                                    : "border-outline bg-surface"
                            }`}
                        >
                            {/* ── Accordion Header / Toggle ── */}
                            <button
                                type="button"
                                onClick={() => toggleSystem(sys.key)}
                                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-alt"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* color bar */}
                                    <span className={`w-1 h-5 rounded-full shrink-0 ${c.bar}`} />
                                    <span className="text-sm font-black text-on-surface truncate">
                                        {sys.label}
                                    </span>
                                    {/* badge "filled" لو فيه data */}
                                    {hasData && !isOpen && (
                                        <span
                                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}
                                        >
                                            Filled
                                        </span>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                                        isOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {/* ── Accordion Body ── */}
                            {isOpen && (
                                <div className="px-5 pb-5 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {sys.fields.map((f) => (
                                            <div key={f}>
                                                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 pl-1 opacity-60">
                                                    {sys.fieldLabels?.[f] ||
                                                        f.replace(/([A-Z])/g, " $1").trim()}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={visitData[`${sys.key}_${f}`]}
                                                    onChange={(e) =>
                                                        setVisitData({
                                                            ...visitData,
                                                            [`${sys.key}_${f}`]: e.target.value,
                                                        })
                                                    }
                                                    className="w-full p-3 border border-outline rounded-xl bg-surface text-sm font-bold text-on-surface outline-none focus:border-primary transition-all hover:border-primary/30 shadow-inner focus:shadow-none"
                                                    placeholder={
                                                        sys.placeholders?.[f] || "Findings..."
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExaminationSection;