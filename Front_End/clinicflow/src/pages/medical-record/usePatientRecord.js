import { useState, useEffect, useMemo, useCallback } from "react";
import { medicalPatientService, visitService, doctorService } from "../../services/api";
import { toast } from "react-hot-toast";
import { deduplicateVisits, getLatestVitals, getLatestVisitWithPrescriptions } from "./medicalUtils";
import { generateMedicationAdministrationPdf } from "./prescriptionPdf";
import { authService } from "../../services/api";
/**
 * Owns all server-side data: patient record, visit list, doctor list.
 * Exposes loading states and a reload trigger.
 */
export function usePatientRecord(patientId) {
    const [patient, setPatient] = useState(null);
    const [visits, setVisits]   = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [clinic, setClinic]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingChart, setLoadingChart] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const latestVitals = useMemo(() => getLatestVitals(visits), [visits]);
    const latestVisitWithRx = useMemo(() => getLatestVisitWithPrescriptions(visits), [visits]);

    const loadPatientData = useCallback(async () => {
        try {
            const [patientRes, visitsRes] = await Promise.all([
                medicalPatientService.getById(patientId),
                visitService.getByPatient(patientId),
            ]);
            setPatient(patientRes.data);
            setVisits(deduplicateVisits(visitsRes.data || []));
        } catch {
            toast.error("Error loading patient records");
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    const loadDoctors = useCallback(async () => {
        try {
            const res = await doctorService.getAll();
            setDoctors(res.data || []);
            return res.data || [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }, []);

    const loadClinicInfo = useCallback(async () => {
        try {
            const tenantId = localStorage.getItem("clinicflow_tenantId");
            if (tenantId) {
                const res = await authService.getClinicProfile(tenantId);
                setClinic(res.data);
            }
        } catch (err) {
            console.error("Failed to load clinic info", err);
        }
    }, []);

    const fetchVisitById = useCallback(async (visitId) => {
        setLoadingChart(true);
        try {
            const res = await visitService.getById(visitId);
            return res.data;
        } catch {
            toast.error("Failed to load full medical chart.");
            return null;
        } finally {
            setLoadingChart(false);
        }
    }, []);

    const deleteVisit = useCallback(async (visitId) => {
        try {
            await visitService.delete(visitId);
            toast.success("Medical record deleted successfully.");
            await loadPatientData();
            return true;
        } catch {
            toast.error("Failed to delete record.");
            return false;
        }
    }, [loadPatientData]);

    const generateLatestMedicationPdf = useCallback(async () => {
        if (!latestVisitWithRx || !patient) {
            toast.error("No saved Medication & Administration found for this patient.");
            return false;
        }

        setGeneratingPdf(true);
        const loadingToast = toast.loading("Generating Medication & Administration PDF...");
        try {
            const res = await visitService.getById(latestVisitWithRx.id);
            const hasPrescription = (res.data?.prescriptions || []).some(
                (p) => p?.medicationName?.trim() || p?.dosage?.trim() || p?.instructions?.trim() || p?.duration?.trim()
            );

            if (!hasPrescription) {
                toast.error("The latest visit does not contain printable medications.", { id: loadingToast });
                return false;
            }

            await generateMedicationAdministrationPdf({ patient, visit: res.data, logoSrc: "/favicon.ico" });
            toast.success("Medication & Administration PDF generated.", { id: loadingToast });
            return true;
        } catch {
            toast.error("Failed to generate Medication & Administration PDF.", { id: loadingToast });
            return false;
        } finally {
            setGeneratingPdf(false);
        }
    }, [latestVisitWithRx, patient]);

    useEffect(() => {
        loadPatientData();
        loadDoctors();
        loadClinicInfo();
    }, [loadPatientData, loadDoctors, loadClinicInfo]);

    return {
        patient,
        visits,
        doctors,
        clinic,
        loading,
        latestVitals,
        latestVisitWithRx,
        reload: loadPatientData,
        loadDoctors,
        // actions
        loadingChart,
        generatingPdf,
        fetchVisitById,
        deleteVisit,
        generateLatestMedicationPdf,
    };
}
