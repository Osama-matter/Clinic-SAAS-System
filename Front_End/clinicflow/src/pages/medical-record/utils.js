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

export const resolveUploadUrl = (uploadResponse) => {
    if (!uploadResponse) return null;
    if (typeof uploadResponse === "string") return uploadResponse;
    if (uploadResponse?.data?.url) return uploadResponse.data.url;
    if (uploadResponse?.url) return uploadResponse.url;
    return null;
};
