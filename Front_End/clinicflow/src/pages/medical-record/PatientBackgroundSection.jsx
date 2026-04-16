import React from "react";
import { AlertTriangle, Activity, Pill } from "lucide-react";

const FIELDS = [
    { label: "Allergies",        field: "allergies",       placeholder: "e.g. Penicillin, Pollen", icon: AlertTriangle, color: "text-destructive" },
    { label: "Chronic Diseases", field: "chronicDiseases", placeholder: "e.g. DM, HTN",           icon: Activity,      color: "text-warning" },
    { label: "Drug History",     field: "drugHistory",     placeholder: "Current medications...",   icon: Pill,          color: "text-info" },
];

const PatientBackgroundSection = ({ visitData, setVisitData }) => (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-md p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/10">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-wider text-on-surface-variant">
                Patient Background
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FIELDS.map(({ label, field, placeholder, icon: Icon, color }) => (
                <div key={field} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                        {label}
                    </label>
                    <input
                        type="text"
                        value={visitData[field]}
                        onChange={(e) => setVisitData({ ...visitData, [field]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-border/50 bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground outline-none
                            focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all
                            placeholder:text-muted-foreground/40"
                    />
                </div>
            ))}
        </div>
    </div>
);

export default PatientBackgroundSection;