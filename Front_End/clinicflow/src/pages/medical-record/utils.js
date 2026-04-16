export const EMPTY_VISIT_FORM = {
    doctorId: "",
    visitType: 1,
    visitDate: new Date().toISOString().substring(0, 16),
    symptoms: "",
    notes: "",
    // Vitals
    bloodPressure: "", heartRate: "", temperature: "", po2: "", rbs: "",
    weight: "", height: "", bmi: "",
    // Examination
    generalExamination: "", localExamination: "", physicalNotes: "",
    // Respiratory
    resp_Inspection: "", resp_Palpation: "", resp_Percussion: "", resp_Auscultation: "",
    // CVS
    cvs_Pulse: "", cvs_HeartSounds: "", cvs_Murmurs: "", cvs_Edema: "",
    // CNS
    cns_Consciousness: "", cns_MotorPower: "", cns_Sensation: "", cns_Reflexes: "",
    // GIT
    git_Inspection: "", git_Palpation: "", git_Percussion: "", git_Auscultation: "",
    // MSK
    msk_Swelling: "", msk_Tenderness: "", msk_Rom: "", msk_Deformity: "",
    // Skin
    skin_Rash: "", skin_Ulcers: "", skin_Pigmentation: "", skin_Infection: "",
    // Dynamic tables
    diagnoses: [{ icd10Code: "", description: "" }],
    prescriptions: [{ medicationName: "", dosage: "", instructions: "", duration: "" }],
    labOrders: [{ testName: "" }],
    imagingOrders: [{ imagingType: "", bodyPart: "", imageData: null, imageUrl: null }],
    results: [{ labResult: "", imagingResult: "", otherResult: "", imageData: null, imageUrl: null }],
    // Patient persistent data
    allergies: "", chronicDiseases: "", drugHistory: "",
};

export const isVitalDanger = (field, val) => {
    if (!val) return false;
    const num = parseFloat(val);
    if (field === "bloodPressure") {
        const parts = val.toString().split("/");
        if (parts.length === 2) {
            const s = parseInt(parts[0]), d = parseInt(parts[1]);
            return s > 140 || s < 90 || d > 90 || d < 60;
        }
    }
    if (field === "heartRate") return num > 110 || num < 50;
    if (field === "temperature") return num > 38.0 || num < 35.5;
    if (field === "po2") return num < 94;
    if (field === "rbs") return num > 200 || num < 70;
    if (field === "bmi") return num > 30 || num < 18.5;
    return false;
};

export const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const num = parseFloat(bmi);
    if (num < 18.5) return { label: "Underweight", color: "text-blue-500", bg: "bg-blue-50" };
    if (num < 25) return { label: "Normal", color: "text-emerald-500", bg: "bg-emerald-50" };
    if (num < 30) return { label: "Overweight", color: "text-amber-500", bg: "bg-amber-50" };
    return { label: "Obese", color: "text-red-500", bg: "bg-red-50" };
};

// ─── Smart Prescription Helpers ───

/**
 * Allergy Mapping: Maps generic allergy categories to medication keywords.
 */
const ALLERGY_MAP = {
    "penicillin": ["amoxicillin", "augmentin", "ampicillin", "penicillin", "clavam"],
    "sulfa": ["septrin", "bactrim", "sulfamethoxazole", "trimethoprim"],
    "nsaid": ["aspirin", "ibuprofen", "diclofenac", "voltaren", "naproxen", "cataflam", "brufen"],
    "aspirin": ["aspirin", "ecosprin", "jusprin"]
};

/**
 * Drug Interaction Rules Database
 */
const DRUG_INTERACTION_RULES = [
    { drugs: ["Aspirin", "Warfarin", "Marevan"], severity: "High", message: "CRITICAL: High bleeding risk (Drug-Drug Interaction)!" },
    { drugs: ["Ciprofloxacin", "Theophylline"], severity: "Medium", message: "Warning: Potential toxicity (Cipro + Theo)." },
    { drugs: ["Metformin", "Contrast"], severity: "High", message: "Risk: Kidney function concern (Lactic Acidosis)." },
    { drugs: ["Sildenafil", "Nitroglycerin"], severity: "Critical", message: "DANGER: Sudden BP drop - Do not combine!" },
    { drugs: ["Ibuprofen", "Aspirin", "Naproxen"], severity: "Medium", message: "Note: Concurrent NSAID use increases GI risk." },
    { drugs: ["Clopidogrel", "Aspirin"], severity: "Medium", message: "Warning: Dual antiplatelet therapy - high bleeding risk." },
    { drugs: ["Amiodarone", "Warfarin"], severity: "High", message: "CRITICAL: Amiodarone dramatically increases Warfarin effect - INR monitoring required." }
];

/**
 * Drug Synonym Map: Clinical-equivalent drug names that should never be co-prescribed.
 * Key = canonical name, Values = array of synonyms (all lowercase)
 */
const DRUG_SYNONYMS = [
    { canonical: "Acetaminophen",  synonyms: ["acetaminophen", "paracetamol", "panadol", "tylenol", "panadeine", "efferalgan", "acetaminofen"] },
    { canonical: "Ibuprofen",      synonyms: ["ibuprofen", "brufen", "advil", "motrin", "nurofen"] },
    { canonical: "Diclofenac",     synonyms: ["diclofenac", "voltaren", "cataflam", "voltarol"] },
    { canonical: "Amoxicillin",    synonyms: ["amoxicillin", "amoxil", "trimox", "augmentin", "co-amoxiclav"] },
    { canonical: "Metronidazole",  synonyms: ["metronidazole", "flagyl", "anaerobyl"] },
    { canonical: "Omeprazole",     synonyms: ["omeprazole", "losec", "prilosec", "omepral"] },
    { canonical: "Atorvastatin",   synonyms: ["atorvastatin", "lipitor", "atorva"] },
];

/**
 * Comprehensive Safety Engine for Prescriptions
 */
export const checkSafetyAlerts = (prescriptions, patientAllergies = "") => {
    const alerts = [];
    const normalizedAllergies = (patientAllergies || "").toLowerCase();
    
    // 1. Filter valid drug names
    const drugEntries = prescriptions
        .map((p, index) => ({ name: p.medicationName?.toLowerCase().trim(), index }))
        .filter(d => !!d.name);

    const drugNames = drugEntries.map(d => d.name);

    // 2. Duplicate Detection
    const seen = new Set();
    const duplicates = new Set();
    drugNames.forEach(name => {
        if (seen.has(name)) duplicates.add(name);
        seen.add(name);
    });
    
    duplicates.forEach(name => {
        alerts.push({
            type: "Duplicate",
            severity: "High",
            message: `Duplicate Medication: "${name.toUpperCase()}" appears more than once. Remove one to prevent overdose.`,
            involved: [name]
        });
    });

    // 2b. Synonym Duplicate Detection (e.g. Paracetamol + Acetaminophen)
    DRUG_SYNONYMS.forEach(group => {
        const matchingDrugs = drugNames.filter(name =>
            group.synonyms.some(syn => name.includes(syn))
        );
        if (matchingDrugs.length >= 2) {
            // Only warn if not already flagged as exact duplicate
            const uniqueMatches = [...new Set(matchingDrugs)];
            if (uniqueMatches.length >= 2 || matchingDrugs.length > uniqueMatches.length) {
                alerts.push({
                    type: "Same Drug",
                    severity: "Critical",
                    message: `CLINICAL SAFETY: "${matchingDrugs.map(m => m.toUpperCase()).join('" and "')}" are the same drug (${group.canonical}). Co-prescribing risks toxic overdose!`,
                    involved: matchingDrugs
                });
            }
        }
    });

    // 3. Allergy Cross-Referencing
    drugEntries.forEach(drug => {
        // Direct match check
        if (normalizedAllergies.includes(drug.name)) {
            alerts.push({
                type: "Allergy",
                severity: "Critical",
                message: `ALLERGY ALERT: Patient is allergic to "${drug.name.toUpperCase()}".`,
                involved: [drug.name]
            });
            return; // Skip group check if direct match found
        }

        // Group-based check (e.g., Penicillin group)
        Object.entries(ALLERGY_MAP).forEach(([allergyKey, drugList]) => {
            if (normalizedAllergies.includes(allergyKey)) {
                if (drugList.some(item => drug.name.includes(item))) {
                    alerts.push({
                        type: "Allergy",
                        severity: "Critical",
                        message: `ALLERGY ALERT: Patient has ${allergyKey.toUpperCase()} allergy. Cross-reactivity with "${drug.name.toUpperCase()}".`,
                        involved: [drug.name]
                    });
                }
            }
        });
    });

    // 4. Drug Interaction Check
    DRUG_INTERACTION_RULES.forEach(rule => {
        const matches = rule.drugs.filter(rDrug => 
            drugNames.some(dName => dName.includes(rDrug.toLowerCase()))
        );
        
        if (matches.length >= 2) {
            alerts.push({
                type: "Interaction",
                severity: rule.severity,
                message: rule.message,
                involved: matches
            });
        }
    });

    return alerts;
};


export const resolveUploadUrl = (uploadResponse) => {
    if (!uploadResponse) return null;
    if (typeof uploadResponse === "string") return uploadResponse;
    if (uploadResponse?.data?.url) return uploadResponse.data.url;
    if (uploadResponse?.url) return uploadResponse.url;
    return null;
};
