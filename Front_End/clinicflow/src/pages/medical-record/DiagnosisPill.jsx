import React from "react";
import { CheckCircle2 } from "lucide-react";

const DiagnosisPill = ({ diagnosis }) => (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive">
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {diagnosis.icd10Code && (
            <span className="font-mono text-[10px] opacity-60">{diagnosis.icd10Code}</span>
        )}
        {diagnosis.description}
    </span>
);

export default DiagnosisPill;