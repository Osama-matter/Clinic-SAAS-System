import React, { useRef } from "react";
import {
    Activity,
    ArrowLeft,
    Beaker,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Download,
    FileSearch,
    ImageIcon,
    Pill,
    Printer,
    Stethoscope,
    UserRound,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";
import { getFileUrl } from "../../services/api";
import { isVitalDanger } from "./utils";

const formatVisitType = (visitType) => {
    switch (visitType) {
        case 1:
            return "Initial Consultation";
        case 2:
            return "Follow-Up";
        case 3:
            return "Emergency";
        default:
            return "Routine Checkup";
    }
};

const getAssetSrc = (item) => {
    if (!item) return null;
    if (item.imageUrl) return getFileUrl(item.imageUrl);
    if (item.imageData) return item.imageData;
    return null;
};

const hasText = (value) => typeof value === "string" && value.trim() !== "";

const ValueBlock = ({ label, value, className = "" }) => {
    if (!hasText(value)) return null;
    return (
        <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70 ${className}`}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {label}
            </p>
            <p dir="auto" className="whitespace-pre-wrap break-words text-sm font-semibold leading-7 text-slate-800 dark:text-slate-100">
                {value}
            </p>
        </div>
    );
};

const VisitChartDetail = ({ selectedVisit, onBack }) => {
    const chartRef = useRef(null);

    const imagingOrders = selectedVisit.imagingOrders || [];
    const results = selectedVisit.results || [];
    const diagnoses = selectedVisit.diagnoses || [];
    const prescriptions = selectedVisit.prescriptions || [];
    const labOrders = selectedVisit.labOrders || [];
    const examination = selectedVisit.examination;
    const vitals = selectedVisit.vitals;

    const handleExportPDF = async () => {
        const element = chartRef.current;
        if (!element) return;

        const loadingToast = toast.loading("Generating PDF...");
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Visit_Chart_${selectedVisit.id.substring(0, 8)}.pdf`);
            toast.success("PDF exported successfully", { id: loadingToast });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF", { id: loadingToast });
        }
    };

    const systemGroups = [
        {
            title: "Respiratory",
            value: [
                examination?.resp_Inspection,
                examination?.resp_Palpation,
                examination?.resp_Percussion,
                examination?.resp_Auscultation,
            ]
                .filter(Boolean)
                .join(" | "),
        },
        {
            title: "Cardiovascular",
            value: [
                examination?.cvs_Pulse,
                examination?.cvs_HeartSounds,
                examination?.cvs_Murmurs,
                examination?.cvs_Edema,
            ]
                .filter(Boolean)
                .join(" | "),
        },
        {
            title: "Nervous System",
            value: [
                examination?.cns_Consciousness,
                examination?.cns_MotorPower,
                examination?.cns_Sensation,
                examination?.cns_Reflexes,
            ]
                .filter(Boolean)
                .join(" | "),
        },
        {
            title: "GIT",
            value: [
                examination?.git_Inspection,
                examination?.git_Palpation,
                examination?.git_Percussion,
                examination?.git_Auscultation,
            ]
                .filter(Boolean)
                .join(" | "),
        },
        {
            title: "Musculoskeletal",
            value: [
                examination?.msk_Swelling,
                examination?.msk_Tenderness,
                examination?.msk_Rom,
                examination?.msk_Deformity,
            ]
                .filter(Boolean)
                .join(" | "),
        },
        {
            title: "Skin",
            value: [
                examination?.skin_Rash,
                examination?.skin_Ulcers,
                examination?.skin_Pigmentation,
                examination?.skin_Infection,
            ]
                .filter(Boolean)
                .join(" | "),
        },
    ].filter((item) => hasText(item.value));

    const vitalCards = [
        { label: "Blood Pressure", field: "bloodPressure", value: vitals?.bloodPressure, unit: "mmHg" },
        { label: "Heart Rate", field: "heartRate", value: vitals?.heartRate, unit: "BPM" },
        { label: "Temperature", field: "temperature", value: vitals?.temperature, unit: "deg C" },
        { label: "O2 Saturation", field: "po2", value: vitals?.po2, unit: "%" },
        { label: "RBS", field: "rbs", value: vitals?.rbs, unit: "mg/dL" },
        { label: "Weight", field: "weight", value: vitals?.weight, unit: "kg" },
        { label: "Height", field: "height", value: vitals?.height, unit: "cm" },
        { label: "BMI", field: "bmi", value: vitals?.bmi, unit: "" },
    ].filter((item) => item.value !== null && item.value !== undefined && item.value !== "");

    return (
        <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-outline bg-surface p-4 shadow-sm">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-2xl border border-outline bg-surface-alt px-5 py-3 text-sm font-bold text-on-surface-variant transition-all hover:border-primary/30 hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="rounded-2xl border border-outline bg-surface-alt p-3 text-on-surface-variant transition-all hover:border-primary/30 hover:text-primary"
                        title="Print Chart"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/40"
                    >
                        <Download className="h-4 w-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            <div
                ref={chartRef}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 text-slate-900 shadow-2xl print:border-0 print:shadow-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
                <div className="border-b border-slate-200 bg-white px-8 py-8 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/20">
                                    <ClipboardList className="h-7 w-7" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                        Clinical Record
                                    </h1>
                                    <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                                        Medical encounter summary
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm font-bold">
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    {new Date(selectedVisit.visitDate).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </div>
                                <div className="rounded-2xl border border-primary/10 bg-primary/10 px-4 py-2 text-primary">
                                    {formatVisitType(selectedVisit.visitType)}
                                </div>
                            </div>
                        </div>

                        <div className="min-w-[260px] rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Patient Information
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    <UserRound className="h-6 w-6" />
                                </div>
                                <div className="font-sans">
                                    <p className="text-sm font-black text-slate-900 dark:text-white">Patient Record</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        ID: {selectedVisit.patientId?.substring(0, 8)}...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8 px-8 py-8 font-sans">
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-8">
                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-5 flex items-center gap-3">
                                    <FileSearch className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Symptoms and Notes</h2>
                                </div>
                                <div className="grid gap-4">
                                    <ValueBlock
                                        label="Chief Complaint"
                                        value={selectedVisit.symptoms || "No symptoms recorded."}
                                    />
                                    <ValueBlock label="Clinical Notes" value={selectedVisit.notes} />
                                </div>
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-5 flex items-center gap-3">
                                    <Stethoscope className="h-5 w-5 text-emerald-500" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Physical Examination</h2>
                                </div>

                                {examination ? (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <ValueBlock label="General Examination" value={examination.generalExamination} />
                                        <ValueBlock label="Local Examination" value={examination.localExamination} />
                                        <ValueBlock
                                            label="Additional Notes"
                                            value={examination.physicalNotes}
                                            className="lg:col-span-2"
                                        />
                                        {systemGroups.map((group) => (
                                            <ValueBlock key={group.title} label={group.title} value={group.value} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                        No structured physical examination documented.
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-5 flex items-center gap-3">
                                    <ImageIcon className="h-5 w-5 text-indigo-500" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Imaging and Attachments</h2>
                                </div>

                                {imagingOrders.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-5">
                                        {imagingOrders.map((img, index) => {
                                            const imageSrc = getAssetSrc(img);
                                            return (
                                                <div
                                                    key={`${img.id || "img"}-${index}`}
                                                    className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
                                                >
                                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                                                        <div className="min-w-0">
                                                            <p dir="auto" className="truncate text-sm font-black text-slate-900 dark:text-white">
                                                                {img.imagingType || "Imaging Order"}
                                                            </p>
                                                            {hasText(img.bodyPart) && (
                                                                <p dir="auto" className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                                    {img.bodyPart}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {imageSrc ? (
                                                        <a href={imageSrc} target="_blank" rel="noreferrer" className="block bg-slate-950">
                                                            <img
                                                                src={imageSrc}
                                                                alt="Imaging attachment"
                                                                className="h-64 w-full object-contain"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <div className="flex h-64 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                            No attachment uploaded
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                        No imaging orders or uploaded images available for this visit.
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-5 flex items-center gap-3">
                                    <Beaker className="h-5 w-5 text-orange-500" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Lab Results and Reports</h2>
                                </div>

                                <div className="space-y-5">
                                    {results.length > 0 ? (
                                        results.map((result, index) => {
                                            const resultImage = getAssetSrc(result);
                                            return (
                                                <div
                                                    key={`${result.id || "result"}-${index}`}
                                                    className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                                                >
                                                    <div className="grid gap-4">
                                                        <ValueBlock label="Lab Result" value={result.labResult} />
                                                        <ValueBlock label="Imaging Result" value={result.imagingResult} />
                                                        <ValueBlock label="Other Notes" value={result.otherResult} />
                                                    </div>

                                                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                                        {resultImage ? (
                                                            <a href={resultImage} target="_blank" rel="noreferrer" className="block bg-slate-950">
                                                                <img
                                                                    src={resultImage}
                                                                    alt="Result attachment"
                                                                    className="h-full min-h-[220px] w-full object-contain"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <div className="flex min-h-[220px] items-center justify-center text-sm font-semibold text-slate-400 dark:text-slate-500">
                                                                No result image
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                            No test results recorded for this visit.
                                        </div>
                                    )}

                                    {labOrders.length > 0 && (
                                        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                                Requested Tests
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {labOrders.map((lab, index) => (
                                                    <span
                                                        key={`${lab.id || "lab"}-${index}`}
                                                        dir="auto"
                                                        className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
                                                    >
                                                        {lab.testName || "Unnamed test"}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-8">
                            <section className="rounded-[2rem] border border-rose-200 bg-rose-50/70 p-6 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/5">
                                <div className="mb-5 flex items-center gap-3">
                                    <Activity className="h-5 w-5 text-rose-500" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Vitals</h2>
                                </div>

                                {vitalCards.length > 0 ? (
                                    <div className="grid gap-3">
                                        {vitalCards.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                                    {item.label}
                                                </p>
                                                <div className="mt-2 flex items-end gap-2">
                                                    <span
                                                        className={`text-2xl font-black ${
                                                            isVitalDanger(item.field, item.value)
                                                                ? "text-rose-600 dark:text-rose-400"
                                                                : "text-slate-900 dark:text-white"
                                                        }`}
                                                    >
                                                        {item.value}
                                                    </span>
                                                    {item.unit && (
                                                        <span className="pb-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                                                            {item.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-rose-200 bg-white/70 p-5 text-sm font-semibold text-slate-500 dark:border-rose-500/20 dark:bg-slate-800/40 dark:text-slate-400">
                                        No vitals captured.
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-5 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-purple-500" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Assessment and Diagnoses</h2>
                                </div>

                                {diagnoses.length > 0 ? (
                                    <div className="space-y-3">
                                        {diagnoses.map((diagnosis, index) => (
                                            <div
                                                key={`${diagnosis.id || "dx"}-${index}`}
                                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                                            >
                                                {hasText(diagnosis.icd10Code) && (
                                                    <span className="mb-2 inline-flex rounded-lg bg-purple-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                                                        {diagnosis.icd10Code}
                                                    </span>
                                                )}
                                                <p dir="auto" className="break-words text-sm font-bold text-slate-800 dark:text-slate-100">
                                                    {diagnosis.description || "Diagnosis entry"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                        No diagnoses recorded.
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[2rem] border border-primary/10 bg-primary p-6 text-white shadow-xl shadow-primary/20">
                                <div className="mb-5 flex items-center gap-3">
                                    <Pill className="h-5 w-5" />
                                    <h2 className="text-lg font-black">RX and Plan</h2>
                                </div>

                                {prescriptions.length > 0 ? (
                                    <div className="space-y-4">
                                        {prescriptions.map((prescription, index) => (
                                            <div
                                                key={`${prescription.id || "rx"}-${index}`}
                                                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                                            >
                                                {hasText(prescription.medicationName) && (
                                                    <p dir="auto" className="text-base font-black">
                                                        {prescription.medicationName}
                                                    </p>
                                                )}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {hasText(prescription.dosage) && (
                                                        <span className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                                                            {prescription.dosage}
                                                        </span>
                                                    )}
                                                    {hasText(prescription.duration) && (
                                                        <span className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                                                            {prescription.duration}
                                                        </span>
                                                    )}
                                                </div>
                                                {hasText(prescription.instructions) && (
                                                    <p
                                                        dir="auto"
                                                        className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-black/10 p-3 text-sm font-semibold text-white/90"
                                                    >
                                                        {prescription.instructions}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-sm font-semibold text-white/80">
                                        No medications or treatment plan recorded.
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:border-slate-800 dark:text-slate-500 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            ClinicFlow Verified Record
                        </div>
                        <div className="break-all">Digital Reference: {selectedVisit.id}</div>
                        <div>Mattar Clinic (c) {new Date().getFullYear()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitChartDetail;
