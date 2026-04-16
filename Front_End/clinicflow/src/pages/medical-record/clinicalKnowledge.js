/**
 * clinicalKnowledge.js
 * Central repository for common clinical data to speed up documentation.
 */

export const LAB_TESTS_LIST = [
    { name: "CBC (Complete Blood Count)" },
    { name: "Liver Function Tests (LFT)" },
    { name: "Kidney Function Tests (KFT)" },
    { name: "RBS (Random Blood Sugar)" },
    { name: "HbA1c (Glycated Hemoglobin)" },
    { name: "Lipid Profile" },
    { name: "Thyroid Profile (T3, T4, TSH)" },
    { name: "Urine Analysis (R/M)" },
    { name: "CRP (C-Reactive Protein)" },
    { name: "ESR (Erythrocyte Sedimentation Rate)" },
    { name: "Electrolytes (Na, K, Cl)" },
    { name: "Vitamin D" },
    { name: "H. Pylori (Antigen/Antibody)" },
    { name: "Stool Analysis" },
    { name: "ECG (Electrocardiogram)" },
    { name: "Chest X-Ray (CXR)" },
    { name: "Abdominal Ultrasound (U/S)" },
];

export const MEDICATION_DEFAULTS = {
    "Amoxicillin": { dosage: "500mg", duration: "7 Days", instructions: "1 capsule 3x/day after food" },
    "Augmentin": { dosage: "1g", duration: "7 Days", instructions: "1 tablet 2x/day after food" },
    "Paracetamol": { dosage: "500mg", duration: "3 Days", instructions: "2 tablets PRN (when necessary) for pain/fever" },
    "Panadol": { dosage: "500mg", duration: "3 Days", instructions: "2 tablets PRN every 6-8 hours" },
    "Ibuprofen": { dosage: "400mg", duration: "5 Days", instructions: "1 tablet 3x/day with food" },
    "Metformin": { dosage: "500mg", duration: "30 Days", instructions: "1 tablet 2x/day with food" },
    "Amlodipine": { dosage: "5mg", duration: "30 Days", instructions: "1 tablet once daily in the morning" },
    "Atorvastatin": { dosage: "20mg", duration: "30 Days", instructions: "1 tablet once daily at bedtime" },
    "Omeprazole": { dosage: "20mg", duration: "14 Days", instructions: "1 capsule once daily 30 mins before breakfast" },
};

export const CLINICAL_PROTOCOLS = [
    {
        id: "uri",
        name: "Upper Respiratory Infection",
        icon: "🌡️",
        data: {
            symptoms: "Fever, cough, sore throat, and runny nose.",
            diagnoses: [{ icd10Code: "J06.9", description: "Acute upper respiratory infection, unspecified" }],
            prescriptions: [
                { medicationName: "Amoxicillin", dosage: "500mg", duration: "7 Days", instructions: "1x3 after food" },
                { medicationName: "Paracetamol", dosage: "500mg", duration: "3 Days", instructions: "2 tabs PRN for fever" }
            ],
            notes: "Rest and increased fluid intake recommended. Follow up if symptoms worsen."
        }
    },
    {
        id: "htn_followup",
        name: "HTN Follow-up",
        icon: "🩸",
        data: {
            symptoms: "Routine follow-up for blood pressure monitoring.",
            diagnoses: [{ icd10Code: "I10", description: "Essential (primary) hypertension" }],
            labOrders: [{ testName: "Lipid Profile" }, { testName: "ECG" }],
            notes: "Blood pressure is stable. Continue lifestyle modifications and medication adherence."
        }
    },
    {
        id: "dm_screen",
        name: "Diabetes Screen",
        icon: "🍬",
        data: {
            symptoms: "Increased thirst, frequent urination, and fatigue.",
            diagnoses: [{ icd10Code: "E11.9", description: "Type 2 diabetes mellitus without complications" }],
            labOrders: [
                { testName: "HbA1c" },
                { testName: "RBS" },
                { testName: "Lipid Profile" }
            ],
            notes: "Fasting laboratory tests ordered. Dietary counseling provided."
        }
    },
    {
        id: "gerd",
        name: "GERD / Gastritis",
        icon: "🔥",
        data: {
            symptoms: "Heartburn, acid regurgitation, and epigastric pain.",
            diagnoses: [{ icd10Code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis" }],
            prescriptions: [
                { medicationName: "Omeprazole", dosage: "20mg", duration: "14 Days", instructions: "1 cap once daily before breakfast" }
            ],
            notes: "Avoid spicy/fatty foods and eating late at night."
        }
    }
];
