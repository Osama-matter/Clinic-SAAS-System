// ─── BMI ─────────────────────────────────────────────────────────────────────

export function calculateBmi(weightKg, heightCm) {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (!w || !h || w <= 0 || h <= 0) return "";
    return (w / (h * h)).toFixed(1);
}

// ─── Age & Date Helpers ───────────────────────────────────────────────────────

/** Returns integer age from a Date-of-Birth string/Date. */
export function calcAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

/** Returns human-friendly string like "Today", "Yesterday", or "14d ago". */
export function daysSince(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
}

// ─── Visit deduplication + sorting ───────────────────────────────────────────

export function deduplicateVisits(visits = []) {
    return visits.filter((v, idx, self) => idx === self.findIndex((t) => t.id === v.id));
}

export function sortVisitsByDate(visits = []) {
    return [...visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getLatestVitals(visits = []) {
    for (const v of sortVisitsByDate(visits)) {
        if (v.vitals && Object.values(v.vitals).some((val) => val !== null && val !== "")) {
            return v.vitals;
        }
    }
    return null;
}

export function getLatestVisitWithPrescriptions(visits = []) {
    return sortVisitsByDate(visits).find((v) =>
        (v.prescriptions || []).some(
            (p) => p?.medicationName?.trim() || p?.dosage?.trim() || p?.instructions?.trim() || p?.duration?.trim()
        )
    ) ?? null;
}

// ─── Payload builder ─────────────────────────────────────────────────────────

function hasVitals(f) {
    return !!(f.bloodPressure || f.heartRate || f.temperature || f.po2 || f.rbs || f.weight || f.height);
}

function hasExam(f) {
    return !!(
        f.generalExamination || f.localExamination || f.physicalNotes ||
        f.resp_Inspection || f.resp_Palpation || f.resp_Percussion || f.resp_Auscultation ||
        f.cvs_Pulse || f.cvs_HeartSounds || f.cvs_Murmurs || f.cvs_Edema ||
        f.cns_Consciousness || f.cns_MotorPower || f.cns_Sensation || f.cns_Reflexes ||
        f.git_Inspection || f.git_Palpation || f.git_Percussion || f.git_Auscultation ||
        f.msk_Swelling || f.msk_Tenderness || f.msk_Rom || f.msk_Deformity ||
        f.skin_Rash || f.skin_Ulcers || f.skin_Pigmentation || f.skin_Infection
    );
}

export function buildVisitPayload({ patientId, visitData }) {
    const f = visitData;
    return {
        patientId,
        doctorId: f.doctorId,
        visitType: f.visitType || 1,
        visitDate: new Date(f.visitDate || new Date().toISOString()).toISOString(),
        symptoms: f.symptoms,
        notes: f.notes,
        vitals: hasVitals(f)
            ? {
                bloodPressure: f.bloodPressure || null,
                heartRate: f.heartRate ? parseInt(f.heartRate) : null,
                temperature: f.temperature ? parseFloat(f.temperature) : null,
                po2: f.po2 ? parseFloat(f.po2) : null,
                rbs: f.rbs ? parseFloat(f.rbs) : null,
                weight: f.weight ? parseFloat(f.weight) : null,
                height: f.height ? parseFloat(f.height) : null,
                bmi: f.bmi ? parseFloat(f.bmi) : null,
            }
            : null,
        examination: hasExam(f)
            ? {
                generalExamination: f.generalExamination,
                localExamination: f.localExamination,
                physicalNotes: f.physicalNotes,
                resp_Inspection: f.resp_Inspection,
                resp_Palpation: f.resp_Palpation,
                resp_Percussion: f.resp_Percussion,
                resp_Auscultation: f.resp_Auscultation,
                cvs_Pulse: f.cvs_Pulse,
                cvs_HeartSounds: f.cvs_HeartSounds,
                cvs_Murmurs: f.cvs_Murmurs,
                cvs_Edema: f.cvs_Edema,
                cns_Consciousness: f.cns_Consciousness,
                cns_MotorPower: f.cns_MotorPower,
                cns_Sensation: f.cns_Sensation,
                cns_Reflexes: f.cns_Reflexes,
                git_Inspection: f.git_Inspection,
                git_Palpation: f.git_Palpation,
                git_Percussion: f.git_Percussion,
                git_Auscultation: f.git_Auscultation,
                msk_Swelling: f.msk_Swelling,
                msk_Tenderness: f.msk_Tenderness,
                msk_Rom: f.msk_Rom,
                msk_Deformity: f.msk_Deformity,
                skin_Rash: f.skin_Rash,
                skin_Ulcers: f.skin_Ulcers,
                skin_Pigmentation: f.skin_Pigmentation,
                skin_Infection: f.skin_Infection,
            }
            : null,
        diagnoses: f.diagnoses
            .filter((d) => d.icd10Code?.trim() || d.description?.trim())
            .map((d) => ({ icd10Code: d.icd10Code || "", description: d.description || "" })),
        prescriptions: f.prescriptions
            .filter((p) => p.medicationName?.trim() || p.dosage?.trim() || p.instructions?.trim() || p.duration?.trim())
            .map((p) => ({ medicationName: p.medicationName || "", dosage: p.dosage || "", instructions: p.instructions || "", duration: p.duration || "" })),
        labOrders: f.labOrders
            .filter((l) => l.testName?.trim())
            .map((l) => ({ testName: l.testName || "" })),
        imagingOrders: f.imagingOrders
            .filter((i) => i.imagingType?.trim() || i.bodyPart?.trim() || i.imageUrl || i.imageData)
            .map((i) => ({ imagingType: i.imagingType || "", bodyPart: i.bodyPart || "", imageData: i.imageData || null, imageUrl: i.imageUrl || null })),
        results: f.results
            .filter((r) => r.labResult?.trim() || r.imagingResult?.trim() || r.otherResult?.trim() || r.imageUrl)
            .map((r) => ({ labResult: r.labResult || "", imagingResult: r.imagingResult || "", otherResult: r.otherResult || "", imageUrl: r.imageUrl || "" })),
    };
}

export function buildPatientUpdatePayload(patient, visitData) {
    return {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        allergies: visitData.allergies,
        chronicDiseases: visitData.chronicDiseases,
        drugHistory: visitData.drugHistory,
    };
}

// ─── Form hydration from API response ────────────────────────────────────────

export function hydrateFormFromVisit(v, patient) {
    return {
        id: v.id,
        doctorId: v.doctorId,
        visitType: v.visitType,
        visitDate: new Date(new Date(v.visitDate).getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16),
        symptoms: v.symptoms || "",
        notes: v.notes || "",
        bloodPressure: v.vitals?.bloodPressure || "",
        heartRate: v.vitals?.heartRate || "",
        temperature: v.vitals?.temperature || "",
        po2: v.vitals?.po2 || "",
        rbs: v.vitals?.rbs || "",
        weight: v.vitals?.weight || "",
        height: v.vitals?.height || "",
        bmi: v.vitals?.bmi || "",
        generalExamination: v.examination?.generalExamination || "",
        localExamination: v.examination?.localExamination || "",
        physicalNotes: v.examination?.physicalNotes || "",
        resp_Inspection: v.examination?.resp_Inspection || "",
        resp_Palpation: v.examination?.resp_Palpation || "",
        resp_Percussion: v.examination?.resp_Percussion || "",
        resp_Auscultation: v.examination?.resp_Auscultation || "",
        cvs_Pulse: v.examination?.cvs_Pulse || "",
        cvs_HeartSounds: v.examination?.cvs_HeartSounds || "",
        cvs_Murmurs: v.examination?.cvs_Murmurs || "",
        cvs_Edema: v.examination?.cvs_Edema || "",
        cns_Consciousness: v.examination?.cns_Consciousness || "",
        cns_MotorPower: v.examination?.cns_MotorPower || "",
        cns_Sensation: v.examination?.cns_Sensation || "",
        cns_Reflexes: v.examination?.cns_Reflexes || "",
        git_Inspection: v.examination?.git_Inspection || "",
        git_Palpation: v.examination?.git_Palpation || "",
        git_Percussion: v.examination?.git_Percussion || "",
        git_Auscultation: v.examination?.git_Auscultation || "",
        msk_Swelling: v.examination?.msk_Swelling || "",
        msk_Tenderness: v.examination?.msk_Tenderness || "",
        msk_Rom: v.examination?.msk_Rom || "",
        msk_Deformity: v.examination?.msk_Deformity || "",
        skin_Rash: v.examination?.skin_Rash || "",
        skin_Ulcers: v.examination?.skin_Ulcers || "",
        skin_Pigmentation: v.examination?.skin_Pigmentation || "",
        skin_Infection: v.examination?.skin_Infection || "",
        diagnoses: v.diagnoses?.length > 0
            ? v.diagnoses.map((d) => ({ icd10Code: d.icd10Code || "", description: d.description || "" }))
            : [{ icd10Code: "", description: "" }],
        prescriptions: v.prescriptions?.length > 0
            ? v.prescriptions.map((p) => ({ medicationName: p.medicationName || "", dosage: p.dosage || "", instructions: p.instructions || "", duration: p.duration || "" }))
            : [{ medicationName: "", dosage: "", instructions: "", duration: "" }],
        labOrders: v.labOrders?.length > 0
            ? v.labOrders.map((l) => ({ testName: l.testName || "" }))
            : [{ testName: "" }],
        imagingOrders: v.imagingOrders?.length > 0
            ? v.imagingOrders.map((i) => ({ imagingType: i.imagingType || "", bodyPart: i.bodyPart || "", imageUrl: i.imageUrl || null, imageData: i.imageData || null }))
            : [{ imagingType: "", bodyPart: "", imageData: null, imageUrl: null }],
        results: v.results?.length > 0
            ? v.results.map((r) => ({ labResult: r.labResult || "", imagingResult: r.imagingResult || "", otherResult: r.otherResult || "", imageData: r.imageData || null, imageUrl: r.imageUrl || null }))
            : [{ labResult: "", imagingResult: "", otherResult: "", imageData: null, imageUrl: null }],
        allergies: patient?.allergies || "",
        chronicDiseases: patient?.chronicDiseases || "",
        drugHistory: patient?.drugHistory || "",
    };
}
