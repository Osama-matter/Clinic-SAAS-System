import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { doctorService, scheduleService, clinicService, getFileUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import {
  Stethoscope,
  Plus,
  Edit,
  Trash2,
  User,
  Clock,
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";

const DoctorsPage = () => {
  const { isAdmin } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialty: "",
    bio: "",
    photo: "",
    tenantId: "",
  });
  const [saving, setSaving] = useState(false);

  const isAr = lang === "ar";

  useEffect(() => {
    loadDoctors();
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const res = await clinicService.getAll();
      const data = res.data?.items || res.data || [];
      setClinics(data);
    } catch (err) {
      console.error("Error loading clinics:", err);
    }
  };

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const res = await doctorService.getAll();
      let data = res.data;
      let finalArray = [];
      if (Array.isArray(data)) {
        finalArray = data;
      } else if (data && typeof data === "object") {
        finalArray = data.items || data.data || data.value || [];
      }
      setDoctors(finalArray);
    } catch (err) {
      setDoctors([]);
      toast.error(
        isAr ? "فشل الاتصال بقاعدة البيانات." : "Failed to connect to the database."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.tenantId) {
      toast.error(isAr ? "يرجى اختيار العيادة" : "Please select a clinic");
      return;
    }
    setSaving(true);
    const tid = toast.loading(selectedDoctor ? t("updatingDoctor") : t("addingDoctor"));
    try {
      if (selectedDoctor) {
        await doctorService.update(selectedDoctor.id, {
          ...form,
          id: selectedDoctor.id,
          isActive: selectedDoctor.isActive !== undefined ? selectedDoctor.isActive : true,
          tenantId: form.tenantId || selectedDoctor.tenantId || null,
        });
        toast.success(t("doctorUpdated"), { id: tid });
      } else {
        await doctorService.create(form);
        toast.success(t("doctorAdded"), { id: tid });
      }
      setShowForm(false);
      loadDoctors();
    } catch (err) {
      const msg =
        err.response?.data?.message || (isAr ? "فشلت العملية" : "Operation failed");
      toast.error(msg, { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    const tid = toast.loading(t("deletingDoctor"));
    try {
      await doctorService.delete(id);
      toast.success(t("doctorDeleted"), { id: tid });
      loadDoctors();
    } catch (err) {
      toast.error(t("deleteFailed"), { id: tid });
    }
  };

  const openCreate = () => {
    setSelectedDoctor(null);
    setForm({ name: "", email: "", password: "", specialty: "", bio: "", photo: "", tenantId: "" });
    setShowForm(true);
  };

  const openEdit = (doc) => {
    setSelectedDoctor(doc);
    setForm({
      name: doc.name,
      email: doc.email || "",
      password: "",
      specialty: doc.specialty,
      bio: doc.bio || "",
      photo: doc.photo || "",
      tenantId: doc.tenantId || "",
    });
    setShowForm(true);
  };

  const handleToggleActive = async (doc) => {
    const action = doc.isActive
      ? isAr ? "تعطيل" : "deactivate"
      : isAr ? "تفعيل" : "activate";
    if (
      !window.confirm(
        isAr
          ? `هل تريد ${action} الطبيب؟`
          : `Are you sure you want to ${action} this doctor?`
      )
    )
      return;
    const tid = toast.loading(isAr ? "جاري التحديث..." : "Updating...");
    try {
      await doctorService.toggleActive(doc);
      toast.success(isAr ? "تم التحديث بنجاح" : "Updated successfully", { id: tid });
      loadDoctors();
    } catch (err) {
      toast.error(isAr ? "فشلت العملية" : "Operation failed", { id: tid });
    }
  };

  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMinutes: 30,
  });

  const handleScheduleSave = async (e) => {
    e.preventDefault();
    const tid = toast.loading(isAr ? "جاري إضافة ساعات العمل..." : "Adding working hours...");
    try {
      const payload = {
        ...scheduleForm,
        doctorId: selectedDoctor.id,
        startTime:
          scheduleForm.startTime.includes(":") &&
            scheduleForm.startTime.split(":").length === 2
            ? `${scheduleForm.startTime}:00`
            : scheduleForm.startTime,
        endTime:
          scheduleForm.endTime.includes(":") &&
            scheduleForm.endTime.split(":").length === 2
            ? `${scheduleForm.endTime}:00`
            : scheduleForm.endTime,
      };
      await scheduleService.create(payload);
      toast.success(t("scheduleAdded"), { id: tid });
      const res = await scheduleService.getByDoctor(selectedDoctor.id);
      setSchedules(res.data);
      setShowScheduleForm(false);
    } catch (err) {
      toast.error(t("scheduleFailed"), { id: tid });
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm(isAr ? "هل تريد حذف هذا الجدول؟" : "Delete this schedule?"))
      return;
    const tid = toast.loading(isAr ? "جاري إزالة الجدول..." : "Removing schedule...");
    try {
      await scheduleService.delete(id);
      toast.success(t("scheduleRemoved"), { id: tid });
      const res = await scheduleService.getByDoctor(selectedDoctor.id);
      setSchedules(res.data);
    } catch (err) {
      toast.error(t("removeScheduleFailed"), { id: tid });
    }
  };

  const viewSchedules = async (doctor) => {
    setSelectedDoctor(doctor);
    try {
      const res = await scheduleService.getByDoctor(doctor.id);
      setSchedules(res.data);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to load schedules", err);
    }
  };

  const getDayName = (dayNum) => {
    const days = [
      t("daySunday"),
      t("dayMonday"),
      t("dayTuesday"),
      t("dayWednesday"),
      t("dayThursday"),
      t("dayFriday"),
      t("daySaturday"),
    ];
    return days[dayNum] || (isAr ? "غير معروف" : "Unknown");
  };

  return (
    <Layout title={t("doctors")}>
      <div
        className="max-w-[1400px] mx-auto space-y-12 pb-24"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-surface-alt border border-outline p-10 lg:p-14 rounded-[3rem] relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex-1">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-on-surface font-headline flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-primary border border-blue-100 shadow-xl">
                <Stethoscope className="w-8 h-8" />
              </div>
              {t("doctors")}
            </h1>
            <p className="text-on-surface-variant mt-4 text-lg font-medium max-w-2xl">
              {t("doctorsSubtitle")}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="btn-vibrant px-8 py-4 font-black text-xs uppercase tracking-[0.2em] relative z-10 whitespace-nowrap shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all rounded-2xl"
            >
              <Plus className="w-4 h-4" /> {t("addDoctor")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {t("loading")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="card-premium group p-8 flex flex-col relative hover:border-primary/30 min-h-[420px] bg-surface-alt border border-outline shadow-sm hover:shadow-xl transition-all"
              >
                {isAdmin && (
                  <div
                    className={`absolute top-5 ${isRtl ? "left-5" : "right-5"
                      } flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20`}
                  >
                    <button
                      onClick={() => openEdit(doc)}
                      className="p-2.5 bg-surface hover:bg-blue-50 rounded-[1rem] border border-outline text-slate-400 hover:text-primary transition-all shadow-md"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(doc)}
                      className={`p-2.5 rounded-[1rem] border transition-all shadow-md ${doc.isActive
                          ? "bg-emerald-50 border-emerald-200 text-emerald-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-500"
                        }`}
                      title={
                        doc.isActive
                          ? isAr ? "تعطيل" : "Deactivate"
                          : isAr ? "تفعيل" : "Activate"
                      }
                    >
                      {doc.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2.5 bg-surface hover:bg-rose-50 rounded-[1rem] border border-outline text-slate-400 hover:text-rose-500 transition-all shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-28 h-28 rounded-[2.5rem] bg-surface flex items-center justify-center overflow-hidden border border-outline group-hover:scale-105 transition-all duration-700 shadow-xl relative">
                    {doc.photo ? (
                      <img
                        src={getFileUrl(doc.photo)}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-slate-200" />
                    )}
                  </div>
                  <div className="mt-6">
                    <h3 className="font-headline font-black text-on-surface text-2xl tracking-tight group-hover:text-primary transition-colors">
                      {doc.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                      <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-800 inline-block">
                        {doc.specialty}
                      </p>
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border inline-block ${doc.isActive
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                          }`}
                      >
                        {doc.isActive
                          ? isAr ? "● نشط" : "● Active"
                          : isAr ? "○ غير نشط" : "○ Inactive"}
                      </span>
                    </div>
                    {/* Clinic name badge */}
                    {doc.tenantId && clinics.length > 0 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                          {clinics.find((c) => c.id === doc.tenantId)?.name ||
                            (isAr ? "عيادة" : "Clinic")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed line-clamp-4 mb-10 flex-1">
                  {doc.bio ||
                    (isAr ? "لا يوجد سيرة ذاتية متوفرة." : "No biography provided.")}
                </p>
                <button
                  onClick={() => viewSchedules(doc)}
                  className="w-full py-4 bg-surface hover:bg-surface-alt border border-outline rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant group-hover:border-primary/30 transition-all flex items-center justify-center gap-3 shadow-inner hover:shadow-md"
                >
                  <CalendarIcon className="w-4 h-4 text-primary opacity-60" />
                  {t("viewSchedule")}
                </button>
              </div>
            ))}
          </div>
        )}

        {doctors.length === 0 && !loading && (
          <div className="card-premium p-24 text-center bg-surface-alt border border-outline">
            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-slate-100 text-slate-200 shadow-xl">
              <Stethoscope className="w-12 h-12" />
            </div>
            <h2 className="font-headline font-black text-on-surface text-3xl mb-4">
              {t("noDoctorsFound")}
            </h2>
            <p className="text-on-surface-variant font-medium max-w-md mx-auto mb-12 text-lg">
              {t("noDoctorsFoundSubtitle")}
            </p>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="btn-vibrant px-10 py-5 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> {t("addFirstDoctor")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          Form Modal — Add / Edit Doctor
      ══════════════════════════════════════════════ */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={selectedDoctor ? t("editDoctor") : t("addDoctor")}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Clinic / Branch selector ── */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3 h-3" />
                  {isAr ? "العيادة / الفرع" : "Clinic / Branch"}
                </span>
              </label>
              <select
                className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                required
              >
                <option value="">
                  {isAr
                    ? "--- اختر العيادة التي يعمل بها الطبيب ---"
                    : "--- Select the doctor's clinic ---"}
                </option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Name ── */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                {t("doctorName")}
              </label>
              <input
                className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                placeholder={t("doctorName")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* ── Specialty ── */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                {t("specialty")}
              </label>
              <input
                className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                placeholder={t("specialty")}
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                required
              />
            </div>

            {/* ── Email & Password (create only) ── */}
            {!selectedDoctor && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    {t("email")}
                  </label>
                  <input
                    className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                    placeholder={t("email")}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    {t("password")}
                  </label>
                  <input
                    className="w-full px-6 py-4 bg-slate-50 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                    type="password"
                    placeholder={t("password")}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Bio ── */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              {t("bio")}
            </label>
            <textarea
              className="w-full px-6 py-4 bg-surface rounded-[1.5rem] border border-outline focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none font-medium text-on-surface h-32 placeholder:text-slate-400 transition-all custom-scrollbar resize-none"
              placeholder={t("bio")}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          {/* ── Photo upload (edit only) ── */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
              {t("doctorPhoto")}
            </label>
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group/photo shadow-inner">
              <div className="w-20 h-20 rounded-[1.5rem] bg-white flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-xl relative z-10 transition-transform group-hover/photo:scale-105 duration-500">
                {form.photo ? (
                  <img
                    src={getFileUrl(form.photo)}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-200" />
                )}
              </div>
              <div className="flex-1 space-y-3 relative z-10">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!selectedDoctor) {
                      toast.error(
                        isAr
                          ? "يرجى إضافة الطبيب أولاً، ثم رفع الصورة."
                          : "Please add the doctor first, then upload the photo."
                      );
                      return;
                    }
                    const tid = toast.loading(
                      isAr ? "جاري رفع الصورة..." : "Uploading photo..."
                    );
                    try {
                      const res = await doctorService.uploadPhoto(selectedDoctor.id, file);
                      setForm({ ...form, photo: res.data.photo });
                      toast.success(isAr ? "تم رفع الصورة!" : "Photo uploaded!", {
                        id: tid,
                      });
                      loadDoctors();
                    } catch (err) {
                      toast.error(isAr ? "فشل الرفع." : "Upload failed.", { id: tid });
                    }
                  }}
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-2xl cursor-pointer hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  <Plus className="w-4 h-4" />{" "}
                  {isAr ? "اختيار صورة" : "Choose Photo"}
                </label>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.1em]">
                  {t("photoUploadTip")}
                </p>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-5 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-vibrant py-5 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 disabled:opacity-50 rounded-2xl"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {saving
                ? selectedDoctor
                  ? t("updatingDoctor")
                  : t("addingDoctor")
                : t("saveDoctor")}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════
          Schedule Modal
      ══════════════════════════════════════════════ */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`${t("workingHours")}: Dr. ${selectedDoctor?.name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-10" dir={isRtl ? "rtl" : "ltr"}>
          {isAdmin && (
            <div className="relative overflow-hidden rounded-[2rem] bg-surface-alt border border-outline p-6 sm:p-8 shadow-inner">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6 px-1 flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  {t("addWorkingHours")}
                </h4>
                <form
                  onSubmit={handleScheduleSave}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <div className="sm:col-span-2 lg:col-span-1">
                    <select
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none"
                      value={scheduleForm.dayOfWeek}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          dayOfWeek: parseInt(e.target.value),
                        })
                      }
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <option
                          key={d}
                          value={d}
                          className="font-sans normal-case tracking-normal"
                        >
                          {getDayName(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      type="time"
                      className="flex-1 px-3 py-3 bg-surface border border-outline rounded-2xl text-sm font-bold text-on-surface outline-none"
                      value={scheduleForm.startTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, startTime: e.target.value })
                      }
                    />
                    <span className="text-on-surface-variant">-</span>
                    <input
                      type="time"
                      className="flex-1 px-3 py-3 bg-surface border border-outline rounded-2xl text-sm font-bold text-on-surface outline-none"
                      value={scheduleForm.endTime}
                      onChange={(e) =>
                        setScheduleForm({ ...scheduleForm, endTime: e.target.value })
                      }
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={t("durationMin")}
                      className="w-full px-4 py-3 bg-surface border border-outline rounded-2xl text-sm font-bold text-on-surface focus:ring-4 focus:ring-primary/5 outline-none"
                      value={scheduleForm.slotDurationMinutes}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          slotDurationMinutes: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-vibrant py-3 font-black text-[10px] uppercase tracking-widest shadow-lg rounded-2xl"
                  >
                    {isAr ? "إضافة" : "Add"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">
              {isAr ? "الساعات الحالية" : "Current Hours"}
            </h4>
            <div
              className={`max-h-72 overflow-y-auto ${isRtl ? "pl-2" : "pr-2"
                } custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-3`}
            >
              {schedules.length > 0 ? (
                schedules.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 bg-surface border border-outline rounded-[1.5rem] flex justify-between items-center group/item hover:border-primary/20 transition-all hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-surface-alt rounded-xl flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform duration-300">
                        <Clock className="w-4 h-4 opacity-60" />
                      </div>
                      <div>
                        <p className="font-black text-on-surface text-sm uppercase tracking-widest">
                          {getDayName(s.dayOfWeek)}
                        </p>
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em] mt-0.5">
                          {s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)} (
                          {s.slotDurationMinutes}m)
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteSchedule(s.id)}
                        className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-16 text-center bg-surface-alt rounded-[2rem] border border-dashed border-outline">
                  <CalendarDays className="w-10 h-10 mx-auto mb-5 opacity-10 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 italic">
                    {t("noWorkingHours")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowModal(false)}
            className="w-full py-4 bg-surface-alt hover:bg-outline text-on-surface-variant font-black text-[10px] uppercase tracking-widest rounded-2xl border border-outline transition-all mt-2"
          >
            {t("close")}
          </button>
        </div>
      </Modal>
    </Layout>
  );
};

export default DoctorsPage;