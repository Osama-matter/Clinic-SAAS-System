import React from "react";
import { CheckCircle2 } from "lucide-react";

const DiagnosisPill = ({ diagnosis }) => (
    <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">
        <CheckCircle2 className="w-3 h-3" />
        {diagnosis.icd10Code && (
            <span className="font-mono text-[10px] opacity-70 tracking-tighter">{diagnosis.icd10Code}</span>
        )}
        {diagnosis.description}
    </span>
);

export default DiagnosisPill;
