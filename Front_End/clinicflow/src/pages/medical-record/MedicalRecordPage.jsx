import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { medicalPatientService, visitService, doctorService } from "../../services/api";
import { toast } from "react-hot-toast";
import { ArrowLeft, Plus, Activity, FileDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

import { EMPTY_VISIT_FORM, resolveUploadUrl } from "./utils";
import { generateMedicationAdministrationPdf } from "./prescriptionPdf";
import EncounterDetailsSection from "./EncounterDetailsSection";
import PatientBackgroundSection from "./PatientBackgroundSection";
import VitalsSection from "./VitalsSection";
import ExaminationSection from "./ExaminationSection";
import LabImagingOrdersSection from "./LabImagingOrdersSection";
import TestResultsSection from "./TestResultsSection";
import DiagnosisRxSection from "./DiagnosisRxSection";
import VisitFormBottomBar from "./VisitFormBottomBar";
import VisitHistoryList from "./VisitHistoryList";
import VisitChartDetail from "./VisitChartDetail";

const MedicalRecordPage = () => {
    const { id } = useParams();
    const { user } = useAuth();

    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 'history' | 'new-visit' | 'chart-detail' | 'edit-visit'
    const [viewMode, setViewMode] = useState("history");
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [loadingChart, setLoadingChart] = useState(false);
    const [generatingPrescription, setGeneratingPrescription] = useState(false);

    const [visitData, setVisitData] = useState(EMPTY_VISIT_FORM);
    // ✅ FIX: track whether we're editing so loadDoctors doesn't override visitData
    const isEditingRef = React.useRef(false);

    useEffect(() => {
        loadData();
        loadDoctors();
    }, [id]);

    const loadData = async () => {
        try {
            const [patientRes, visitsRes] = await Promise.all([
                medicalPatientService.getById(id),
                visitService.getByPatient(id),
            ]);
            setPatient(patientRes.data);

            // ✅ FIX 1: Deduplicate visits by id to prevent duplicate cards
            const rawVisits = visitsRes.data || [];
            const uniqueVisits = rawVisits.filter(
                (v, index, self) => index === self.findIndex((t) => t.id === v.id)
            );
            setVisits(uniqueVisits);

            // Sync persistent data
            setVisitData((prev) => ({
                ...prev,
                allergies: patientRes.data.allergies || "",
                chronicDiseases: patientRes.data.chronicDiseases || "",
                drugHistory: patientRes.data.drugHistory || "",
            }));
        } catch (err) {
            toast.error("Error loading patient records");
        } finally {
            setLoading(false);
        }
    };

    const loadDoctors = async () => {
        try {
            const res = await doctorService.getAll();
            setDoctors(res.data || []);
            // ✅ FIX: only preset doctorId if not editing (don't overwrite loaded visit's doctor)
            if (res.data && res.data.length > 0 && !isEditingRef.current) {
                setVisitData((prev) => ({
                    ...prev,
                    doctorId: prev.doctorId || res.data[0].id,
                }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openFullChart = async (visitId) => {
        setLoadingChart(true);
        try {
            const res = await visitService.getById(visitId);
            setSelectedVisit(res.data);
            setViewMode("chart-detail");
        } catch (err) {
            toast.error("Failed to load full medical chart.");
            console.error(err);
        } finally {
            setLoadingChart(false);
        }
    };

    // ✅ FIX 5: BMI Auto-calculation with proper functional update to avoid stale closure
    useEffect(() => {
        if (visitData.weight && visitData.height) {
            const w = parseFloat(visitData.weight);
            const h = parseFloat(visitData.height) / 100;
            if (w > 0 && h > 0) {
                const bmiVal = (w / (h * h)).toFixed(1);
                setVisitData((prev) => {
                    if (prev.bmi === bmiVal) return prev;
                    return { ...prev, bmi: bmiVal };
                });
            }
        }
    }, [visitData.weight, visitData.height]);

    const openEditVisit = async (visitId) => {
        isEditingRef.current = true; // ✅ prevent loadDoctors from overriding form data
        setLoadingChart(true);
        try {
            const res = await visitService.getById(visitId);
            const v = res.data;
            setVisitData({
                id: v.id,
                doctorId: v.doctorId,
                visitType: v.visitType,
                visitDate: new Date(
                    new Date(v.visitDate).getTime() - new Date().getTimezoneOffset() * 60000
                )
                    .toISOString()
                    .slice(0, 16),
                symptoms: v.symptoms || "",
                notes: v.notes || "",
                // Vitals
                bloodPressure: v.vitals?.bloodPressure || "",
                heartRate: v.vitals?.heartRate || "",
                temperature: v.vitals?.temperature || "",
                po2: v.vitals?.po2 || "",
                rbs: v.vitals?.rbs || "",
                weight: v.vitals?.weight || "",
                height: v.vitals?.height || "",
                bmi: v.vitals?.bmi || "",
                // Examination
                generalExamination: v.examination?.generalExamination || "",
                localExamination: v.examination?.localExamination || "",
                physicalNotes: v.examination?.physicalNotes || "",
                // Respiratory
                resp_Inspection: v.examination?.resp_Inspection || "",
                resp_Palpation: v.examination?.resp_Palpation || "",
                resp_Percussion: v.examination?.resp_Percussion || "",
                resp_Auscultation: v.examination?.resp_Auscultation || "",
                // CVS
                cvs_Pulse: v.examination?.cvs_Pulse || "",
                cvs_HeartSounds: v.examination?.cvs_HeartSounds || "",
                cvs_Murmurs: v.examination?.cvs_Murmurs || "",
                cvs_Edema: v.examination?.cvs_Edema || "",
                // CNS
                cns_Consciousness: v.examination?.cns_Consciousness || "",
                cns_MotorPower: v.examination?.cns_MotorPower || "",
                cns_Sensation: v.examination?.cns_Sensation || "",
                cns_Reflexes: v.examination?.cns_Reflexes || "",
                // GIT
                git_Inspection: v.examination?.git_Inspection || "",
                git_Palpation: v.examination?.git_Palpation || "",
                git_Percussion: v.examination?.git_Percussion || "",
                git_Auscultation: v.examination?.git_Auscultation || "",
                // MSK
                msk_Swelling: v.examination?.msk_Swelling || "",
                msk_Tenderness: v.examination?.msk_Tenderness || "",
                msk_Rom: v.examination?.msk_Rom || "",
                msk_Deformity: v.examination?.msk_Deformity || "",
                // Skin
                skin_Rash: v.examination?.skin_Rash || "",
                skin_Ulcers: v.examination?.skin_Ulcers || "",
                skin_Pigmentation: v.examination?.skin_Pigmentation || "",
                skin_Infection: v.examination?.skin_Infection || "",
                // Dynamic tables
                diagnoses:
                    v.diagnoses?.length > 0
                        ? v.diagnoses.map((d) => ({ icd10Code: d.icd10Code || "", description: d.description || "" }))
                        : [{ icd10Code: "", description: "" }],
                prescriptions:
                    v.prescriptions?.length > 0
                        ? v.prescriptions.map((p) => ({
                            medicationName: p.medicationName || "",
                            dosage: p.dosage || "",
                            instructions: p.instructions || "",
                            duration: p.duration || "",
                        }))
                        : [{ medicationName: "", dosage: "", instructions: "", duration: "" }],
                labOrders:
                    v.labOrders?.length > 0
                        ? v.labOrders.map((l) => ({ testName: l.testName || "" }))
                        : [{ testName: "" }],
                imagingOrders:
                    v.imagingOrders?.length > 0
                        ? v.imagingOrders.map((i) => ({
                            imagingType: i.imagingType || "",
                            bodyPart: i.bodyPart || "",
                            imageUrl: i.imageUrl || null,
                            imageData: i.imageData || null,
                        }))
                        : [{ imagingType: "", bodyPart: "", imageData: null, imageUrl: null }],
                results:
                    v.results?.length > 0
                        ? v.results.map((r) => ({
                            labResult: r.labResult || "",
                            imagingResult: r.imagingResult || "",
                            otherResult: r.otherResult || "",
                            imageData: r.imageData || null,
                            imageUrl: r.imageUrl || null,
                        }))
                        : [{ labResult: "", imagingResult: "", otherResult: "", imageData: null, imageUrl: null }],
                allergies: patient?.allergies || "",
                chronicDiseases: patient?.chronicDiseases || "",
                drugHistory: patient?.drugHistory || "",
            });
            setViewMode("edit-visit");
        } catch (err) {
            toast.error("Failed to load chart for editing");
            console.error(err);
        } finally {
            setLoadingChart(false);
        }
    };

    const handleDeleteVisit = async (visitId) => {
        if (!window.confirm("Are you sure you want to permanently delete this comprehensive medical record?")) return;
        try {
            await visitService.delete(visitId);
            toast.success("Medical record deleted successfully.");
            loadData();
        } catch (err) {
            toast.error("Failed to delete record.");
        }
    };

    // ─── Lists Management ───
    const handleGenerateMedicationAdministration = async () => {
        const latestVisitSummary = [...visits]
            .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
            .find((visit) =>
                (visit.prescriptions || []).some(
                    (item) =>
                        item?.medicationName?.trim() ||
                        item?.dosage?.trim() ||
                        item?.instructions?.trim() ||
                        item?.duration?.trim()
                )
            );

        if (!latestVisitSummary) {
            toast.error("No saved Medication & Administration found for this patient.");
            return;
        }

        setGeneratingPrescription(true);
        const loadingToast = toast.loading("Generating Medication & Administration PDF...");
        try {
            const response = await visitService.getById(latestVisitSummary.id);
            const latestVisit = response.data;
            const hasPrescription = (latestVisit?.prescriptions || []).some(
                (item) =>
                    item?.medicationName?.trim() ||
                    item?.dosage?.trim() ||
                    item?.instructions?.trim() ||
                    item?.duration?.trim()
            );

            if (!hasPrescription) {
                toast.error("The latest visit does not contain printable medications.", { id: loadingToast });
                return;
            }

            await generateMedicationAdministrationPdf({
                patient,
                visit: latestVisit,
                logoSrc: "/favicon.ico",
            });

            toast.success("Medication & Administration PDF generated.", { id: loadingToast });
        } catch (error) {
            console.error("Medication PDF generation failed", error);
            toast.error("Failed to generate Medication & Administration PDF.", { id: loadingToast });
        } finally {
            setGeneratingPrescription(false);
        }
    };

    const addDiagnosisRow = () =>
        setVisitData((prev) => ({ ...prev, diagnoses: [...prev.diagnoses, { icd10Code: "", description: "" }] }));
    const updateDiagnosis = (index, field, value) => {
        const updated = [...visitData.diagnoses];
        updated[index][field] = value;
        setVisitData({ ...visitData, diagnoses: updated });
    };
    const removeDiagnosis = (index) =>
        setVisitData((prev) => ({ ...prev, diagnoses: prev.diagnoses.filter((_, i) => i !== index) }));

    const addPrescriptionRow = () =>
        setVisitData((prev) => ({
            ...prev,
            prescriptions: [...prev.prescriptions, { medicationName: "", dosage: "", instructions: "", duration: "" }],
        }));
    const updatePrescription = (index, field, value) => {
        const updated = [...visitData.prescriptions];
        updated[index][field] = value;
        setVisitData({ ...visitData, prescriptions: updated });
    };
    const removePrescription = (index) =>
        setVisitData((prev) => ({ ...prev, prescriptions: prev.prescriptions.filter((_, i) => i !== index) }));

    const addLabOrderRow = () =>
        setVisitData((prev) => ({ ...prev, labOrders: [...prev.labOrders, { testName: "" }] }));
    const updateLabOrder = (index, field, value) => {
        const updated = [...visitData.labOrders];
        updated[index][field] = value;
        setVisitData({ ...visitData, labOrders: updated });
    };
    const removeLabOrder = (index) =>
        setVisitData((prev) => ({ ...prev, labOrders: prev.labOrders.filter((_, i) => i !== index) }));

    const addImagingRow = () =>
        setVisitData((prev) => ({
            ...prev,
            imagingOrders: [...prev.imagingOrders, { imagingType: "", bodyPart: "", imageData: null, imageUrl: null }],
        }));
    const updateImaging = (index, field, value) => {
        const updated = [...visitData.imagingOrders];
        updated[index][field] = value;
        setVisitData({ ...visitData, imagingOrders: updated });
    };
    const removeImaging = (index) =>
        setVisitData((prev) => ({ ...prev, imagingOrders: prev.imagingOrders.filter((_, i) => i !== index) }));

    const addResultRow = () =>
        setVisitData((prev) => ({
            ...prev,
            results: [
                ...prev.results,
                { labResult: "", imagingResult: "", otherResult: "", imageData: null, imageUrl: null },
            ],
        }));
    const updateResult = (index, field, value) => {
        const newResults = [...visitData.results];
        newResults[index][field] = value;
        setVisitData({ ...visitData, results: newResults });
    };

    const handleResultFileChange = async (index, file) => {
        if (!file) return;
        try {
            const reader = new FileReader();
            reader.onloadend = () => updateResult(index, "imageData", reader.result);
            reader.readAsDataURL(file);

            const uploadResponse = await visitService.uploadImage(file);
            const imageUrl = resolveUploadUrl(uploadResponse);
            if (imageUrl) updateResult(index, "imageUrl", imageUrl);
            toast.success("Result image attached");
        } catch (err) {
            toast.error("Failed to upload result image");
        }
    };
    const removeResult = (index) =>
        setVisitData((prev) => ({ ...prev, results: prev.results.filter((_, i) => i !== index) }));

    const handleFileChange = async (index, file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setVisitData((prev) => {
                const newOrders = [...prev.imagingOrders];
                newOrders[index] = { ...newOrders[index], imageData: reader.result };
                return { ...prev, imagingOrders: newOrders };
            });
        };
        reader.readAsDataURL(file);

        try {
            const uploadResponse = await visitService.uploadImage(file);
            const serverUrl = resolveUploadUrl(uploadResponse);
            if (serverUrl) {
                setVisitData((prev) => {
                    const newOrders = [...prev.imagingOrders];
                    newOrders[index] = { ...newOrders[index], imageUrl: serverUrl };
                    return { ...prev, imagingOrders: newOrders };
                });
            }
            toast.success("Clinical image uploaded successfully");
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Failed to upload image to server storage");
        }
    };

    const handleSubmitVisit = async (e) => {
        e.preventDefault();
        const effectiveDoctorId = visitData.doctorId || doctors[0]?.id || "";
        if (!effectiveDoctorId) {
            toast.error("Please select a doctor");
            return;
        }

        const hasVitals =
            visitData.bloodPressure || visitData.heartRate || visitData.temperature ||
            visitData.po2 || visitData.rbs || visitData.weight || visitData.height;

        // ✅ FIX 2: Check ALL examination fields, not just 3
        const hasExam =
            visitData.generalExamination || visitData.localExamination || visitData.physicalNotes ||
            visitData.resp_Inspection || visitData.resp_Palpation || visitData.resp_Percussion || visitData.resp_Auscultation ||
            visitData.cvs_Pulse || visitData.cvs_HeartSounds || visitData.cvs_Murmurs || visitData.cvs_Edema ||
            visitData.cns_Consciousness || visitData.cns_MotorPower || visitData.cns_Sensation || visitData.cns_Reflexes ||
            visitData.git_Inspection || visitData.git_Palpation || visitData.git_Percussion || visitData.git_Auscultation ||
            visitData.msk_Swelling || visitData.msk_Tenderness || visitData.msk_Rom || visitData.msk_Deformity ||
            visitData.skin_Rash || visitData.skin_Ulcers || visitData.skin_Pigmentation || visitData.skin_Infection;

        const patientUpdatePayload = {
            id: patient.id,
            name: patient.name,
            phone: patient.phone,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            allergies: visitData.allergies,
            chronicDiseases: visitData.chronicDiseases,
            drugHistory: visitData.drugHistory,
        };

        const payload = {
            patientId: id,
            doctorId: effectiveDoctorId,
            visitType: visitData.visitType || 1,
            visitDate: new Date(visitData.visitDate || new Date().toISOString()).toISOString(),
            symptoms: visitData.symptoms,
            notes: visitData.notes,

            vitals: hasVitals
                ? {
                    bloodPressure: visitData.bloodPressure || null,
                    heartRate: visitData.heartRate ? parseInt(visitData.heartRate) : null,
                    temperature: visitData.temperature ? parseFloat(visitData.temperature) : null,
                    po2: visitData.po2 ? parseFloat(visitData.po2) : null,
                    rbs: visitData.rbs ? parseFloat(visitData.rbs) : null,
                    weight: visitData.weight ? parseFloat(visitData.weight) : null,
                    height: visitData.height ? parseFloat(visitData.height) : null,
                    bmi: visitData.bmi ? parseFloat(visitData.bmi) : null,
                }
                : null,

            examination: hasExam
                ? {
                    generalExamination: visitData.generalExamination,
                    localExamination: visitData.localExamination,
                    physicalNotes: visitData.physicalNotes,
                    resp_Inspection: visitData.resp_Inspection,
                    resp_Palpation: visitData.resp_Palpation,
                    resp_Percussion: visitData.resp_Percussion,
                    resp_Auscultation: visitData.resp_Auscultation,
                    cvs_Pulse: visitData.cvs_Pulse,
                    cvs_HeartSounds: visitData.cvs_HeartSounds,
                    cvs_Murmurs: visitData.cvs_Murmurs,
                    cvs_Edema: visitData.cvs_Edema,
                    cns_Consciousness: visitData.cns_Consciousness,
                    cns_MotorPower: visitData.cns_MotorPower,
                    cns_Sensation: visitData.cns_Sensation,
                    cns_Reflexes: visitData.cns_Reflexes,
                    git_Inspection: visitData.git_Inspection,
                    git_Palpation: visitData.git_Palpation,
                    git_Percussion: visitData.git_Percussion,
                    git_Auscultation: visitData.git_Auscultation,
                    msk_Swelling: visitData.msk_Swelling,
                    msk_Tenderness: visitData.msk_Tenderness,
                    msk_Rom: visitData.msk_Rom,
                    msk_Deformity: visitData.msk_Deformity,
                    skin_Rash: visitData.skin_Rash,
                    skin_Ulcers: visitData.skin_Ulcers,
                    skin_Pigmentation: visitData.skin_Pigmentation,
                    skin_Infection: visitData.skin_Infection,
                }
                : null,

            diagnoses: visitData.diagnoses
                .filter((d) => d.icd10Code?.trim() || d.description?.trim())
                .map((d) => ({
                    icd10Code: d.icd10Code || "",
                    description: d.description || "",
                })),
            prescriptions: visitData.prescriptions
                .filter((p) => p.medicationName?.trim() || p.dosage?.trim() || p.instructions?.trim() || p.duration?.trim())
                .map((p) => ({
                    medicationName: p.medicationName || "",
                    dosage: p.dosage || "",
                    instructions: p.instructions || "",
                    duration: p.duration || "",
                })),
            labOrders: visitData.labOrders
                .filter((l) => l.testName?.trim())
                .map((l) => ({
                    testName: l.testName || "",
                })),
            imagingOrders: visitData.imagingOrders
                .filter((i) => i.imagingType?.trim() || i.bodyPart?.trim() || i.imageUrl || i.imageData)
                .map((i) => ({
                    imagingType: i.imagingType || "",
                    bodyPart: i.bodyPart || "",
                    imageData: i.imageData || null,
                    imageUrl: i.imageUrl || null,
                })),
            results: visitData.results
                .filter(
                    (r) =>
                        r.labResult?.trim() !== "" ||
                        r.imagingResult?.trim() !== "" ||
                        r.otherResult?.trim() !== "" ||
                        r.imageUrl
                )
                .map((r) => ({
                    labResult: r.labResult || "",
                    imagingResult: r.imagingResult || "",
                    otherResult: r.otherResult || "",
                    imageUrl: r.imageUrl || "",
                })),
        };

        setSubmitting(true);
        try {
            await medicalPatientService.update(id, patientUpdatePayload);

            if (viewMode === "edit-visit") {
                payload.id = visitData.id;
                await visitService.updateComprehensive(visitData.id, payload);
                toast.success("Clinical record updated successfully!");
            } else {
                await visitService.createComprehensive(payload);
                toast.success("Comprehensive clinical visit saved successfully!");
            }

            setViewMode("history");
            loadData();
            isEditingRef.current = false; // ✅ reset edit flag

            // Reset form (keep allergies/chronic/drug from patient)
            setVisitData((prev) => ({
                ...EMPTY_VISIT_FORM,
                doctorId: prev.doctorId,
                allergies: prev.allergies,
                chronicDiseases: prev.chronicDiseases,
                drugHistory: prev.drugHistory,
                visitDate: new Date().toISOString().substring(0, 16),
            }));
        } catch (err) {
            const apiMessage =
                err?.response?.data?.detail ||
                err?.response?.data?.title ||
                err?.response?.data?.message ||
                err?.message ||
                "Error saving clinical record";
            toast.error(apiMessage);
            console.error("Medical record save failed", {
                status: err?.response?.status,
                data: err?.response?.data,
                payload,
                error: err,
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading)
        return (
            <Layout>
                <div className="p-10 text-center animate-pulse font-bold text-slate-400">
                    Loading Clinical Sandbox...
                </div>
            </Layout>
        );
    if (!patient)
        return (
            <Layout>
                <div className="p-10 text-center text-red-500 font-bold">Patient record not found.</div>
            </Layout>
        );

    const isFormMode = viewMode === "new-visit" || viewMode === "edit-visit";

    return (
        <Layout title={`${patient.name} - Clinical Record`}>
            <div className="mx-auto max-w-[1300px] space-y-8 overflow-x-hidden pb-40">

                {/* Top Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        to="/patients"
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline bg-surface px-4 py-2 text-center font-bold text-slate-400 transition-colors hover:text-primary hover:shadow-sm sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4" /> Patients Directory
                    </Link>

                    <div className="flex w-full overflow-hidden rounded-xl border border-outline bg-surface p-1 shadow-sm sm:w-auto">
                        <button
                            onClick={() => setViewMode("history")}
                            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:px-6 ${viewMode === "history" ? "bg-primary text-white shadow-md" : "text-on-surface-variant hover:bg-surface-alt"
                                }`}
                        >
                            History Log
                        </button>
                        <button
                            onClick={() => setViewMode("new-visit")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:px-6 ${viewMode === "new-visit"
                                ? "bg-emerald-500 text-white shadow-md"
                                : "text-emerald-500 hover:bg-emerald-500/10"
                                }`}
                        >
                            <Plus className="w-4 h-4" /> Start Visit
                        </button>
                    </div>
                </div>

                {/* Patient Profile Card */}
                <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-outline bg-surface p-5 shadow-sm sm:gap-6 sm:p-8">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full" />
                    <div className="relative z-10 min-w-0 flex-1">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <h1 className="min-w-0 flex-1 text-2xl font-black text-on-surface sm:text-4xl">
                            <span className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner align-middle sm:h-12 sm:w-12">
                                {patient.gender === 1 ? "👨" : patient.gender === 2 ? "👩" : "👤"}
                            </span>
                            <span className="inline-block max-w-full break-words align-middle">{patient.name}</span>
                            </h1>
                            <button
                                type="button"
                                onClick={handleGenerateMedicationAdministration}
                                disabled={generatingPrescription}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/35 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                                <FileDown className="h-4 w-4" />
                                {generatingPrescription ? "Generating..." : "Generate Medication & Administration"}
                            </button>
                        </div>
                        <div className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant sm:flex-row sm:flex-wrap sm:gap-6">
                            <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary/40" /> {patient.phone}
                            </span>
                            <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary/40" /> DOB:{" "}
                                {new Date(patient.dateOfBirth).toLocaleDateString()}
                            </span>
                        </div>
                        {(patient.allergies || patient.chronicDiseases || patient.drugHistory) && (
                            <div className="mt-5 flex flex-wrap gap-3">
                                {patient.allergies && (
                                    <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-3 h-3" /> Allergies: {patient.allergies}
                                    </span>
                                )}
                                {patient.chronicDiseases && (
                                    <span className="bg-orange-500/10 border border-orange-500/20 text-orange-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                        Chronic: {patient.chronicDiseases}
                                    </span>
                                )}
                                {patient.drugHistory && (
                                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                                        Drugs: {patient.drugHistory}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── NEW/EDIT VISIT COMPREHENSIVE FORM ─── */}
                {isFormMode && (
                    <form onSubmit={handleSubmitVisit} className="space-y-8 animate-fade-in">
                        <EncounterDetailsSection
                            visitData={visitData}
                            setVisitData={setVisitData}
                            doctors={doctors}
                            viewMode={viewMode}
                        />
                        <PatientBackgroundSection
                            visitData={visitData}
                            setVisitData={setVisitData}
                        />
                        <VitalsSection
                            visitData={visitData}
                            setVisitData={setVisitData}
                        />
                        <ExaminationSection
                            visitData={visitData}
                            setVisitData={setVisitData}
                        />
                        <LabImagingOrdersSection
                            visitData={visitData}
                            addLabOrderRow={addLabOrderRow}
                            updateLabOrder={updateLabOrder}
                            removeLabOrder={removeLabOrder}
                            addImagingRow={addImagingRow}
                            updateImaging={updateImaging}
                            removeImaging={removeImaging}
                            handleFileChange={handleFileChange}
                        />
                        <TestResultsSection
                            visitData={visitData}
                            addResultRow={addResultRow}
                            updateResult={updateResult}
                            removeResult={removeResult}
                            handleResultFileChange={handleResultFileChange}
                        />
                        <DiagnosisRxSection
                            visitData={visitData}
                            addDiagnosisRow={addDiagnosisRow}
                            updateDiagnosis={updateDiagnosis}
                            removeDiagnosis={removeDiagnosis}
                            addPrescriptionRow={addPrescriptionRow}
                            updatePrescription={updatePrescription}
                            removePrescription={removePrescription}
                        />
                        <VisitFormBottomBar
                            submitting={submitting}
                            viewMode={viewMode}
                            onCancel={() => { isEditingRef.current = false; setViewMode("history"); }}
                        />
                    </form>
                )}

                {/* ─── HISTORY LOG VIEW ─── */}
                {viewMode === "history" && (
                    <VisitHistoryList
                        visits={visits}
                        loadingChart={loadingChart}
                        openFullChart={openFullChart}
                        openEditVisit={openEditVisit}
                        handleDeleteVisit={handleDeleteVisit}
                    />
                )}

                {/* ─── FULL CHART DETAIL VIEW ─── */}
                {viewMode === "chart-detail" && selectedVisit && (
                    <VisitChartDetail
                        selectedVisit={selectedVisit}
                        onBack={() => setViewMode("history")}
                    />
                )}
            </div>
        </Layout>
    );
};

export default MedicalRecordPage;
