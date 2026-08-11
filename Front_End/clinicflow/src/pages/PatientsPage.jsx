import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { medicalPatientService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { queryKeys, usePatientsQuery } from "../hooks/queries";
import { useInfinitePagination } from "../hooks/useInfinitePagination";
import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Save,
  Search,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  gender: 0,
  dateOfBirth: "",
  allergies: "",
  chronicDiseases: "",
  drugHistory: "",
};

const getValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      return value;
    }
  }

  return "";
};

const parseGenderValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return [1, 2, 3].includes(value) ? value : 0;
  }

  const normalized = `${value}`.trim().toLowerCase();

  if (["1", "male", "m", "man", "ذكر"].includes(normalized)) {
    return 1;
  }

  if (["2", "female", "f", "woman", "انثى", "أنثى"].includes(normalized)) {
    return 2;
  }

  if (["3", "other", "o", "unknown"].includes(normalized)) {
    return 3;
  }

  return 0;
};

const parseDateToInputValue = (value) => {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = `${value}`.trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const parseKeyValueText = (raw) => {
  const parsed = {};

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.search(/[:=]/);
      if (separatorIndex <= 0) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (key && value) {
        parsed[key] = value;
      }
    });

  return Object.keys(parsed).length ? parsed : null;
};

const parseUrlQrContent = (raw) => {
  try {
    const url = new URL(raw);
    const params = Object.fromEntries(url.searchParams.entries());

    if (!Object.keys(params).length) {
      return null;
    }

    return {
      ...params,
      bookingReference: params.ref || params.bookingReference || "",
    };
  } catch {
    return null;
  }
};

const parseQrContent = (rawValue) => {
  const raw = `${rawValue || ""}`.trim();
  if (!raw) {
    throw new Error("empty");
  }

  let source = null;

  try {
    source = JSON.parse(raw);
  } catch {
    source = parseUrlQrContent(raw);

    if (!source) {
      source =
        raw.includes("=") && raw.includes("&")
          ? Object.fromEntries(new URLSearchParams(raw).entries())
          : parseKeyValueText(raw);
    }
  }

  if (!source || typeof source !== "object") {
    throw new Error("invalid");
  }

  const normalized = source.patient || source.data || source.profile || source;

  return {
    name: `${getValue(normalized, ["name", "fullName", "patientName"])}`.trim(),
    phone: `${getValue(normalized, ["phone", "phoneNumber", "mobile", "mobileNumber"])}`.trim(),
    email: `${getValue(normalized, ["email", "mail"])}`.trim(),
    bookingReference: `${getValue(normalized, ["bookingReference", "ref"])}`.trim(),
    gender: parseGenderValue(getValue(normalized, ["gender", "sex"])),
    dateOfBirth: parseDateToInputValue(
      getValue(normalized, ["dateOfBirth", "dob", "birthDate", "birth_date"])
    ),
    allergies: `${getValue(normalized, ["allergies", "allergy", "knownAllergies"])}`.trim(),
    chronicDiseases: `${getValue(normalized, [
      "chronicDiseases",
      "chronic",
      "chronicDisease",
      "medicalHistory",
    ])}`.trim(),
    drugHistory: `${getValue(normalized, [
      "drugHistory",
      "medications",
      "medicines",
      "currentMedications",
    ])}`.trim(),
  };
};

const PatientsPage = () => {
  const { isAdmin, isReceptionist, isDoctor } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [manualQrValue, setManualQrValue] = useState("");
  const [scannerStatus, setScannerStatus] = useState("");
  const [scannerError, setScannerError] = useState("");
  const [processingScan, setProcessingScan] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameRef = useRef(null);
  const detectorRef = useRef(null);
  const handlingScanResultRef = useRef(false);
  const isStaff = isAdmin || isReceptionist || isDoctor;
  const isAr = lang === "ar";
  const queryClient = useQueryClient();
  const patientsQuery = usePatientsQuery(isStaff);
  const rawPatientsData = patientsQuery.data;
  const patients = Array.isArray(rawPatientsData) ? rawPatientsData : rawPatientsData?.items || [];
  const loading = patientsQuery.isLoading && patients.length === 0;
  const refreshing = patientsQuery.isFetching && patients.length > 0;
  const deferredSearch = useDeferredValue(search);
  const scannerSupported =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    if (!showScanner) {
      stopScanner();
      return undefined;
    }

    if (!scannerSupported) {
      setScannerStatus("");
      setScannerError(
        isAr
          ? "المتصفح الحالي لا يدعم قراءة QR بالكاميرا. الصق محتوى الـ QR يدويًا بالأسفل."
          : "This device does not support in-app QR camera scanning. Paste the QR content manually below."
      );
      return undefined;
    }

    startScanner();
    return () => stopScanner();
  }, [showScanner, scannerSupported, isAr]);

  const stopScanner = () => {
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
    }

    scanFrameRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    detectorRef.current = null;
    handlingScanResultRef.current = false;
  };

  const closeScanner = () => {
    stopScanner();
    setShowScanner(false);
    setProcessingScan(false);
    setScannerStatus("");
    setScannerError("");
    setManualQrValue("");
  };

  const createPatientMutation = useMutation({
    mutationFn: (payload) => medicalPatientService.create(payload),
    onSuccess: (response, payload) => {
      const createdPatient = response?.data || {
        ...payload,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKeys.patients, (current = []) => [createdPatient, ...current]);
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, payload }) => medicalPatientService.update(id, { id, ...payload }),
    onSuccess: (response, variables) => {
      const updatedPatient = response?.data || { id: variables.id, ...variables.payload };

      queryClient.setQueryData(queryKeys.patients, (current = []) =>
        current.map((patient) =>
          patient.id === variables.id ? { ...patient, ...updatedPatient } : patient
        )
      );
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (id) => medicalPatientService.delete(id),
    onMutate: async (id) => {
      setDeletingId(id);
      await queryClient.cancelQueries({ queryKey: queryKeys.patients });
      const previousPatients = queryClient.getQueryData(queryKeys.patients) || [];

      queryClient.setQueryData(queryKeys.patients, (current = []) =>
        current.filter((patient) => patient.id !== id)
      );

      return { previousPatients };
    },
    onError: (_error, _id, context) => {
      if (context?.previousPatients) {
        queryClient.setQueryData(queryKeys.patients, context.previousPatients);
      }
    },
    onSettled: () => {
      setDeletingId(null);
      setConfirmDelete(null);
    },
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode("add");
    setShowModal(true);
  };

  const openEdit = (event, patient) => {
    event.preventDefault();
    event.stopPropagation();

    setForm({
      name: patient.name || "",
      phone: patient.phone || patient.phoneNumber || "",
      email: patient.email || "",
      gender: patient.gender ?? 0,
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.substring(0, 10) : "",
      allergies: patient.allergies || "",
      chronicDiseases: patient.chronicDiseases || "",
      drugHistory: patient.drugHistory || "",
    });
    setEditingId(patient.id);
    setModalMode("edit");
    setShowModal(true);
  };

  const createPatientPayload = (payload) => ({
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || "",
    gender: Number(payload.gender) || 0,
    dateOfBirth: payload.dateOfBirth,
    allergies: payload.allergies?.trim() || null,
    chronicDiseases: payload.chronicDiseases?.trim() || null,
    drugHistory: payload.drugHistory?.trim() || null,
  });

  const hasRequiredPatientFields = (payload) =>
    !!payload.name?.trim() && !!payload.dateOfBirth;

  const createPatientFromQr = async (payload) => {
    setProcessingScan(true);

    try {
      await createPatientMutation.mutateAsync(createPatientPayload(payload));
      closeScanner();
      toast.success(
        isAr ? "تمت إضافة المريض من الـ QR بنجاح." : "Patient created from QR successfully."
      );
    } catch {
      setProcessingScan(false);
      setScannerError(
        isAr
          ? "فشل إنشاء المريض تلقائيًا. راجع البيانات وحاول مرة أخرى."
          : "Automatic patient creation failed. Review the data and try again."
      );
    }
  };

  const applyQrData = async (rawValue) => {
    try {
      const parsed = parseQrContent(rawValue);
      const nextForm = { ...EMPTY_FORM, ...parsed };

      if (hasRequiredPatientFields(nextForm)) {
        await createPatientFromQr(nextForm);
        return;
      }

      closeScanner();
      setForm(nextForm);
      setEditingId(null);
      setModalMode("add");
      setShowModal(true);
      toast(
        parsed.bookingReference
          ? isAr
            ? `تمت قراءة QR الحجز ${parsed.bookingReference}. الاسم والهاتف اتسجلوا، وأكمل تاريخ الميلاد ثم احفظ.`
            : `Booking QR ${parsed.bookingReference} was loaded. Name and phone were filled in; complete the date of birth, then save.`
          : isAr
            ? "تمت قراءة الـ QR لكن توجد بيانات ناقصة. أكمل الحقول ثم احفظ."
            : "QR data loaded, but some required fields are missing. Complete them and save."
      );
    } catch {
      setScannerError(
        isAr
          ? "تعذر قراءة بيانات الـ QR. استخدم JSON أو بيانات بصيغة key:value."
          : "Could not parse the QR data. Use JSON or key:value formatted text."
      );
    }
  };

  const startScanner = async () => {
    try {
      setScannerError("");
      setScannerStatus(isAr ? "جار طلب إذن الكاميرا..." : "Requesting camera access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      setScannerStatus(
        isAr ? "وجّه الكاميرا إلى رمز الـ QR." : "Point the camera at the QR code."
      );

      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current || handlingScanResultRef.current) {
          return;
        }

        try {
          if (videoRef.current.readyState >= 2) {
            const results = await detectorRef.current.detect(videoRef.current);
            const firstResult = results?.[0];
            const rawValue = firstResult?.rawValue || firstResult?.displayValue;

            if (rawValue) {
              handlingScanResultRef.current = true;
              await applyQrData(rawValue);
              return;
            }
          }
        } catch {
          setScannerError(
            isAr
              ? "حدث خطأ أثناء تحليل الصورة من الكاميرا."
              : "Failed to analyze the camera frame."
          );
        }

        scanFrameRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setScannerStatus("");
      setScannerError(
        isAr
          ? "تعذر فتح الكاميرا. تأكد من منح الإذن أو استخدم لصق محتوى الـ QR يدويًا."
          : "Could not open the camera. Allow camera access or paste the QR content manually."
      );
    }
  };

  const handleManualQrSubmit = async () => {
    if (!manualQrValue.trim()) {
      setScannerError(isAr ? "الصق محتوى الـ QR أولًا." : "Paste the QR content first.");
      return;
    }

    setScannerError("");
    setScannerStatus("");
    await applyQrData(manualQrValue);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(isAr ? "الاسم مطلوب" : "Name is required");
      return;
    }

    if (!form.dateOfBirth) {
      toast.error(isAr ? "تاريخ الميلاد مطلوب" : "Date of birth is required");
      return;
    }

    setSaving(true);
    const payload = createPatientPayload(form);

    try {
      if (modalMode === "add") {
        await createPatientMutation.mutateAsync(payload);
        toast.success(isAr ? "تمت إضافة المريض بنجاح" : "Patient added successfully");
      } else {
        await updatePatientMutation.mutateAsync({ id: editingId, payload });
        toast.success(isAr ? "تم تحديث بيانات المريض" : "Patient updated successfully");
      }

      setShowModal(false);
    } catch {
      toast.error(isAr ? "حدث خطأ، حاول مرة أخرى" : "Something went wrong, please try again");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePatientMutation.mutateAsync(id);
      toast.success(isAr ? "تم حذف المريض بنجاح" : "Patient deleted successfully");
    } catch {
      toast.error(isAr ? "فشل حذف المريض" : "Failed to delete patient");
    }
  };

  const filteredPatients = useMemo(
    () =>
      patients.filter(
        (patient) =>
          patient.name?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          patient.email?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          (patient.phone || patient.phoneNumber)?.includes(deferredSearch)
      ),
    [patients, deferredSearch]
  );
  const {
    visibleItems: visiblePatients,
    hasMore: hasMorePatients,
    loadMoreRef: patientsLoadMoreRef,
  } = useInfinitePagination(filteredPatients, 24);

  const inputCls =
    "w-full px-4 py-3 bg-surface border border-outline rounded-xl text-sm font-semibold text-on-surface focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-slate-400";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <Layout title={t("patients")}>
      <div className="max-w-[1400px] mx-auto space-y-8 pb-24" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex flex-col gap-5 bg-surface-alt border border-outline p-6 sm:p-10 rounded-[2rem] relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-on-surface flex items-center gap-4">
              <div className="w-11 h-11 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl sm:rounded-3xl flex items-center justify-center text-primary border border-blue-100 shadow-xl shrink-0">
                <Users className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              {t("patients")}
            </h1>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-surface border border-outline hover:border-primary hover:text-primary rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>{isAr ? "مسح QR" : "Scan QR"}</span>
              </button>
              <button
                onClick={openAdd}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{isAr ? "إضافة مريض" : "Add Patient"}</span>
                <span className="sm:hidden">{isAr ? "إضافة" : "Add"}</span>
              </button>
            </div>
          </div>
          <div className="relative w-full group">
            <Search
              className={`absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors`}
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`w-full ${isRtl ? "pr-12 pl-5" : "pl-12 pr-5"} py-4 bg-surface border border-outline rounded-2xl text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-inner`}
            />
          </div>
          {refreshing && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {isAr ? "تحديث..." : "Refreshing..."}
            </div>
          )}
        </div>

        {!loading && filteredPatients.length > 0 && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {filteredPatients.length} {isAr ? "مريض" : "patients"}
            </span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
              >
                {isAr ? "مسح البحث" : "Clear search"}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {t("fetchingRegistry")}
            </p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-32 text-center bg-surface-alt border border-outline rounded-[2rem]">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mx-auto mb-6 border border-outline text-slate-200 shadow-sm">
              <Users className="w-10 h-10" />
            </div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
              {t("noPatientsFound")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-outline rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:border-primary hover:text-primary"
              >
                <QrCode className="w-4 h-4" />
                {isAr ? "مسح QR" : "Scan QR"}
              </button>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                {isAr ? "إضافة أول مريض" : "Add first patient"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {visiblePatients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-surface border border-outline rounded-[1.5rem] overflow-hidden transition-all hover:shadow-md hover:border-primary/20 group"
                >
                  <Link to={`/patients/${patient.id}`} className="flex items-center gap-4 p-4">
                    <div className="w-11 h-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-on-surface text-sm truncate group-hover:text-primary transition-colors">
                        {patient.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {(patient.phone || patient.phoneNumber) && (
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <Phone className="w-3 h-3" />
                            {patient.phone || patient.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 text-[9px] font-black uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("active")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </Link>
                  <div className="flex border-t border-outline/50">
                    <button
                      onClick={(event) => openEdit(event, patient)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-primary hover:bg-primary hover:text-white text-[11px] font-black uppercase tracking-widest transition-all border-r border-outline/50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isAr ? "تعديل" : "Edit"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(patient.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 text-red-400 hover:bg-red-500 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isAr ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block bg-surface border border-outline shadow-sm rounded-[2rem] overflow-hidden">
              <table className={`w-full ${isRtl ? "text-right" : "text-left"} border-collapse`}>
                <thead>
                  <tr className="bg-surface-alt">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-outline">
                      {t("patientInfo")}
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-outline">
                      {t("contactDetails")}
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-outline">
                      {t("status")}
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-outline">
                      {t("joined")}
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-outline">
                      {isAr ? "إجراءات" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/50">
                  {visiblePatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-primary/[0.03] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-surface-alt flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-outline shrink-0">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-on-surface group-hover:text-primary transition-colors">
                              {patient.name}
                            </p>
                            <p className="text-[9px] font-black font-mono text-slate-300 uppercase tracking-widest mt-0.5">
                              #{patient.id.substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          {patient.email && (
                            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                              <Mail className="w-3.5 h-3.5 opacity-40 text-primary shrink-0" />
                              {patient.email}
                            </div>
                          )}
                          {(patient.phone || patient.phoneNumber) && (
                            <div className="flex items-center gap-2.5 text-sm text-slate-500 font-medium">
                              <Phone className="w-3.5 h-3.5 opacity-40 text-primary shrink-0" />
                              {patient.phone || patient.phoneNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t("active")}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                          <Calendar className="w-4 h-4 opacity-30 text-primary" />
                          {patient.createdAt
                            ? new Date(patient.createdAt).toLocaleDateString(lang, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            : "-"}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="p-2.5 bg-surface-alt hover:bg-primary hover:text-white text-slate-400 rounded-xl transition-all border border-outline hover:border-primary hover:shadow-md"
                            title={isAr ? "عرض السجل" : "View record"}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(event) => openEdit(event, patient)}
                            className="p-2.5 bg-surface-alt hover:bg-primary hover:text-white text-slate-400 rounded-xl transition-all border border-outline hover:border-primary hover:shadow-md"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(patient.id)}
                            disabled={deletingId === patient.id}
                            className="p-2.5 bg-surface-alt hover:bg-red-500 hover:text-white text-slate-400 rounded-xl transition-all border border-outline hover:border-red-300 hover:shadow-md disabled:opacity-40"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            {deletingId === patient.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMorePatients && (
              <div ref={patientsLoadMoreRef} className="flex items-center justify-center py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-alt border border-outline text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAr ? "تحميل المزيد" : "Loading more"}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeScanner} />
          <div className="relative z-10 w-full sm:max-w-2xl bg-surface rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-outline overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline bg-surface-alt">
              <div>
                <h2 className="font-black text-on-surface text-lg">
                  {isAr ? "إضافة مريض من QR" : "Add Patient From QR"}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  {isAr
                    ? "سيتم إنشاء المريض تلقائيًا إذا كانت البيانات كاملة"
                    : "The patient will be created automatically when the QR contains all required data"}
                </p>
              </div>
              <button
                onClick={closeScanner}
                className="p-2 text-slate-400 hover:text-on-surface hover:bg-surface rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="rounded-[1.75rem] overflow-hidden border border-outline bg-black relative">
                <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-0 border-[3px] border-white/15">
                  <div className="absolute inset-6 sm:inset-10 border-2 border-primary/70 rounded-[1.5rem]" />
                </div>
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-full bg-black/55 text-white text-[11px] font-bold uppercase tracking-widest">
                  {processingScan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  {processingScan
                    ? isAr
                      ? "جار المعالجة"
                      : "Processing"
                    : isAr
                      ? "وضع المسح"
                      : "Scan mode"}
                </div>
              </div>
              {scannerStatus && (
                <div className="flex items-start gap-2 text-sm text-slate-500 font-semibold">
                  <Camera className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{scannerStatus}</span>
                </div>
              )}
              {scannerError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm font-semibold">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{scannerError}</span>
                </div>
              )}
              <div className="space-y-3">
                <label className={labelCls}>
                  {isAr ? "أو الصق محتوى الـ QR يدويًا" : "Or paste the QR content manually"}
                </label>
                <textarea
                  rows={5}
                  value={manualQrValue}
                  onChange={(event) => setManualQrValue(event.target.value)}
                  placeholder='{"name":"Ahmed","phone":"010...","dateOfBirth":"1990-05-01"}'
                  className={`${inputCls} resize-none font-mono text-xs`}
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-outline bg-surface-alt">
              <button
                onClick={closeScanner}
                disabled={processingScan}
                className="flex-1 py-3 font-black text-on-surface-variant bg-surface border border-outline hover:bg-surface-container rounded-2xl transition-all text-sm disabled:opacity-50"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
              <button
                onClick={handleManualQrSubmit}
                disabled={processingScan}
                className="flex-1 py-3 font-black text-white bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                {processingScan ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
                {isAr ? "إنشاء من البيانات" : "Create from data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setShowModal(false)}
          />
          <div className="relative z-10 w-full sm:max-w-2xl bg-surface rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-outline overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-outline bg-surface-alt">
              <div>
                <h2 className="font-black text-on-surface text-lg">
                  {modalMode === "add"
                    ? isAr
                      ? "إضافة مريض جديد"
                      : "Add New Patient"
                    : isAr
                      ? "تعديل بيانات المريض"
                      : "Edit Patient"}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                  {modalMode === "add"
                    ? isAr
                      ? "أدخل بيانات المريض"
                      : "Enter patient details"
                    : isAr
                      ? "تحديث المعلومات"
                      : "Update information"}
                </p>
              </div>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="p-2 text-slate-400 hover:text-on-surface hover:bg-surface rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>{isAr ? "الاسم الكامل *" : "Full Name *"}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder={isAr ? "اسم المريض" : "Patient full name"}
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="01xxxxxxxxx"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "البريد الإلكتروني" : "Email"}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="example@email.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{isAr ? "النوع" : "Gender"}</label>
                  <select
                    value={form.gender}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        gender: parseInt(event.target.value, 10),
                      }))
                    }
                    className={inputCls}
                  >
                    <option value={0}>{isAr ? "غير محدد" : "Not specified"}</option>
                    <option value={1}>{isAr ? "ذكر" : "Male"}</option>
                    <option value={2}>{isAr ? "أنثى" : "Female"}</option>
                    <option value={3}>{isAr ? "آخر" : "Other"}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    {isAr ? "تاريخ الميلاد *" : "Date of Birth *"}
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                    }
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{isAr ? "الحساسية" : "Allergies"}</label>
                  <textarea
                    rows={3}
                    value={form.allergies}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, allergies: event.target.value }))
                    }
                    placeholder={isAr ? "أي حساسية معروفة" : "Known allergies"}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    {isAr ? "الأمراض المزمنة" : "Chronic Diseases"}
                  </label>
                  <textarea
                    rows={3}
                    value={form.chronicDiseases}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        chronicDiseases: event.target.value,
                      }))
                    }
                    placeholder={isAr ? "سكري، ضغط..." : "Diabetes, hypertension..."}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{isAr ? "التاريخ الدوائي" : "Drug History"}</label>
                  <textarea
                    rows={3}
                    value={form.drugHistory}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, drugHistory: event.target.value }))
                    }
                    placeholder={
                      isAr ? "الأدوية الحالية أو السابقة" : "Current or previous medications"
                    }
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-outline bg-surface-alt">
              <button
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                className="flex-1 py-3 font-black text-on-surface-variant bg-surface border border-outline hover:bg-surface-container rounded-2xl transition-all text-sm disabled:opacity-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 font-black text-white bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving
                  ? isAr
                    ? "جار الحفظ..."
                    : "Saving..."
                  : modalMode === "add"
                    ? isAr
                      ? "إضافة"
                      : "Add Patient"
                    : isAr
                      ? "حفظ التعديلات"
                      : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deletingId && setConfirmDelete(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-surface rounded-[2rem] shadow-2xl border border-outline overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="font-black text-on-surface text-lg mb-2">
                {isAr ? "حذف المريض؟" : "Delete Patient?"}
              </h3>
              <p className="text-sm text-slate-400 font-medium mb-6">
                {isAr
                  ? "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع البيانات المرتبطة بهذا المريض."
                  : "This action cannot be undone. All records associated with this patient will be permanently removed."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={!!deletingId}
                  className="flex-1 py-3 font-black text-on-surface-variant bg-surface-alt border border-outline hover:bg-surface-container rounded-2xl transition-all text-sm disabled:opacity-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={!!deletingId}
                  className="flex-1 py-3 font-black text-white bg-red-500 hover:bg-red-600 rounded-2xl transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
                >
                  {deletingId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deletingId
                    ? isAr
                      ? "جار الحذف..."
                      : "Deleting..."
                    : isAr
                      ? "تأكيد الحذف"
                      : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PatientsPage;
