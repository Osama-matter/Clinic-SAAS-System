import { useState, useEffect, useRef, useCallback } from "react";
import { medicalPatientService, visitService } from "../../services/api";
import { toast } from "react-hot-toast";
import { calculateBmi, hydrateFormFromVisit, sortVisitsByDate, buildPatientUpdatePayload, buildVisitPayload } from "./medicalUtils";
import { EMPTY_VISIT_FORM, resolveUploadUrl } from "./utils";

/**
 * Owns the entire visit form state, row-level CRUD for dynamic tables,
 * file upload, carry-forward, and the unsaved-changes guard.
 */
export function useMedicalForm({ patient, visits, doctors }) {
    const [visitData, setVisitData]   = useState(EMPTY_VISIT_FORM);
    const [loadingChart, setLoadingChart] = useState(false);
    const isEditingRef = useRef(false);

    // ── Auto-seed doctorId once doctors list loads ──
    useEffect(() => {
        if (doctors.length > 0 && !isEditingRef.current) {
            setVisitData((prev) => ({
                ...prev,
                doctorId: prev.doctorId || doctors[0].id,
            }));
        }
    }, [doctors]);

    // ── Sync patient background fields ──
    useEffect(() => {
        if (!patient) return;
        setVisitData((prev) => ({
            ...prev,
            allergies:       patient.allergies       || "",
            chronicDiseases: patient.chronicDiseases || "",
            drugHistory:     patient.drugHistory     || "",
        }));
    }, [patient]);

    // ── Auto-calculate BMI ──
    useEffect(() => {
        const bmi = calculateBmi(visitData.weight, visitData.height);
        if (bmi && bmi !== visitData.bmi) {
            setVisitData((prev) => ({ ...prev, bmi }));
        }
    }, [visitData.weight, visitData.height]);

    // ── Unsaved changes detection ──
    const formHasUnsavedData = useCallback(() => (
        !!(
            visitData.symptoms?.trim()             ||
            visitData.bloodPressure?.trim()         ||
            visitData.heartRate?.trim()             ||
            visitData.temperature?.trim()           ||
            visitData.generalExamination?.trim()    ||
            visitData.diagnoses?.some((d) => d.icd10Code?.trim() || d.description?.trim()) ||
            visitData.prescriptions?.some((p) => p.medicationName?.trim())
        )
    ), [visitData]);

    // ── Load a visit into the form for editing ──
    const loadVisitForEdit = useCallback(async (visitId) => {
        isEditingRef.current = true;
        setLoadingChart(true);
        try {
            const res = await visitService.getById(visitId);
            setVisitData(hydrateFormFromVisit(res.data, patient));
            return true;
        } catch {
            toast.error("Failed to load chart for editing");
            return false;
        } finally {
            setLoadingChart(false);
        }
    }, [patient]);

    // ── Carry-forward from latest visit ──
    const carryForward = useCallback(async () => {
        if (!visits.length) {
            toast.error("No previous visits found to carry forward.");
            return;
        }
        const latest = sortVisitsByDate(visits)[0];
        setLoadingChart(true);
        try {
            const res = await visitService.getById(latest.id);
            const v = res.data;
            setVisitData((prev) => ({
                ...prev,
                symptoms: v.symptoms || "",
                diagnoses: v.diagnoses?.length > 0
                    ? v.diagnoses.map((d) => ({ icd10Code: d.icd10Code || "", description: d.description || "" }))
                    : prev.diagnoses,
                prescriptions: v.prescriptions?.length > 0
                    ? v.prescriptions.map((p) => ({ medicationName: p.medicationName || "", dosage: p.dosage || "", instructions: p.instructions || "", duration: p.duration || "" }))
                    : prev.prescriptions,
                allergies:       v.vitals?.allergies       || patient?.allergies       || "",
                chronicDiseases: v.vitals?.chronicDiseases || patient?.chronicDiseases || "",
                drugHistory:     v.vitals?.drugHistory     || patient?.drugHistory     || "",
            }));
            toast.success("Data carried forward from previous visit.");
        } catch {
            toast.error("Failed to load previous visit data.");
        } finally {
            setLoadingChart(false);
        }
    }, [visits, patient]);

    // ── Reset form after save or cancel ──
    const resetForm = useCallback(() => {
        isEditingRef.current = false;
        setVisitData((prev) => ({
            ...EMPTY_VISIT_FORM,
            doctorId:        prev.doctorId,
            allergies:       prev.allergies,
            chronicDiseases: prev.chronicDiseases,
            drugHistory:     prev.drugHistory,
            visitDate:       new Date().toISOString().substring(0, 16),
        }));
    }, []);

    // ── Row-level list updaters (diagnoses) ──
    const addDiagnosisRow     = () => setVisitData((p) => ({ ...p, diagnoses: [...p.diagnoses, { icd10Code: "", description: "" }] }));
    const removeDiagnosis     = (i) => setVisitData((p) => ({ ...p, diagnoses: p.diagnoses.filter((_, idx) => idx !== i) }));
    const updateDiagnosis     = (i, field, value) => setVisitData((p) => {
        const next = [...p.diagnoses]; next[i] = { ...next[i], [field]: value }; return { ...p, diagnoses: next };
    });

    // ── Prescriptions ──
    const addPrescriptionRow  = () => setVisitData((p) => ({ ...p, prescriptions: [...p.prescriptions, { medicationName: "", dosage: "", instructions: "", duration: "" }] }));
    const removePrescription  = (i) => setVisitData((p) => ({ ...p, prescriptions: p.prescriptions.filter((_, idx) => idx !== i) }));
    const updatePrescription  = (i, field, value) => setVisitData((p) => {
        const next = [...p.prescriptions]; next[i] = { ...next[i], [field]: value }; return { ...p, prescriptions: next };
    });

    // ── Lab orders ──
    const addLabOrderRow      = () => setVisitData((p) => ({ ...p, labOrders: [...p.labOrders, { testName: "" }] }));
    const removeLabOrder      = (i) => setVisitData((p) => ({ ...p, labOrders: p.labOrders.filter((_, idx) => idx !== i) }));
    const updateLabOrder      = (i, field, value) => setVisitData((p) => {
        const next = [...p.labOrders]; next[i] = { ...next[i], [field]: value }; return { ...p, labOrders: next };
    });

    // ── Imaging orders ──
    const addImagingRow       = () => setVisitData((p) => ({ ...p, imagingOrders: [...p.imagingOrders, { imagingType: "", bodyPart: "", imageData: null, imageUrl: null }] }));
    const removeImaging       = (i) => setVisitData((p) => ({ ...p, imagingOrders: p.imagingOrders.filter((_, idx) => idx !== i) }));
    const updateImaging       = (i, field, value) => setVisitData((p) => {
        const next = [...p.imagingOrders]; next[i] = { ...next[i], [field]: value }; return { ...p, imagingOrders: next };
    });
    const handleFileChange    = async (index, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => updateImaging(index, "imageData", reader.result);
        reader.readAsDataURL(file);
        try {
            const uploadRes = await visitService.uploadImage(file);
            const url = resolveUploadUrl(uploadRes);
            if (url) updateImaging(index, "imageUrl", url);
            toast.success("Clinical image uploaded successfully");
        } catch {
            toast.error("Failed to upload image to server storage");
        }
    };

    // ── Submit visit (create / update) + update patient background ──
    const submitVisit = useCallback(async ({ patientId, viewMode, onSuccessReload }) => {
        const effectiveDoctorId = visitData.doctorId || doctors[0]?.id || "";
        if (!effectiveDoctorId) {
            toast.error("Please select a doctor");
            return false;
        }

        if (!patient) {
            toast.error("Patient record not loaded");
            return false;
        }

        const patientPayload = buildPatientUpdatePayload(patient, visitData);
        const visitPayload   = buildVisitPayload({ patientId, visitData });

        try {
            await medicalPatientService.update(patientId, patientPayload);

            if (viewMode === "edit-visit") {
                visitPayload.id = visitData.id;
                await visitService.updateComprehensive(visitData.id, visitPayload);
                toast.success("Clinical record updated successfully!");
            } else {
                await visitService.createComprehensive(visitPayload);
                toast.success("Comprehensive clinical visit saved successfully!");
            }

            resetForm();
            if (typeof onSuccessReload === "function") onSuccessReload();
            return true;
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.title ||
                err?.response?.data?.message ||
                err?.message ||
                "Error saving clinical record";
            toast.error(msg);
            console.error("Medical record save failed", { status: err?.response?.status, data: err?.response?.data, err });
            return false;
        }
    }, [visitData, doctors, patient, resetForm]);

    // ── Results ──
    const addResultRow        = () => setVisitData((p) => ({ ...p, results: [...p.results, { labResult: "", imagingResult: "", otherResult: "", imageData: null, imageUrl: null }] }));
    const removeResult        = (i) => setVisitData((p) => ({ ...p, results: p.results.filter((_, idx) => idx !== i) }));
    const updateResult        = (i, field, value) => setVisitData((p) => {
        const next = [...p.results]; next[i] = { ...next[i], [field]: value }; return { ...p, results: next };
    });
    const handleResultFileChange = async (index, file) => {
        if (!file) return;
        try {
            const reader = new FileReader();
            reader.onloadend = () => updateResult(index, "imageData", reader.result);
            reader.readAsDataURL(file);
            const uploadRes = await visitService.uploadImage(file);
            const url = resolveUploadUrl(uploadRes);
            if (url) updateResult(index, "imageUrl", url);
            toast.success("Result image attached");
        } catch {
            toast.error("Failed to upload result image");
        }
    };

    return {
        visitData,
        setVisitData,
        loadingChart,
        isEditingRef,
        formHasUnsavedData,
        loadVisitForEdit,
        carryForward,
        resetForm,
        submitVisit,
        // Diagnosis
        addDiagnosisRow, updateDiagnosis, removeDiagnosis,
        // Prescriptions
        addPrescriptionRow, updatePrescription, removePrescription,
        // Lab orders
        addLabOrderRow, updateLabOrder, removeLabOrder,
        // Imaging
        addImagingRow, updateImaging, removeImaging, handleFileChange,
        // Results
        addResultRow, updateResult, removeResult, handleResultFileChange,
    };
}
