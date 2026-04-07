import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { appointmentService, clinicService, doctorService, getFileUrl } from "../services/api";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Phone,
  QrCode,
  ScanLine,
  Ticket,
  User,
} from "lucide-react";

const StepBar = ({ step }) => (
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4, 5].map((s) => (
      <div
        key={s}
        className={`h-1.5 w-10 rounded-full transition-all ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
      />
    ))}
  </div>
);

const GuestBookingPage = () => {
  const { t, lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const publicHost = "https://mattarclinic.vercel.app";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });

  const qrLookupUrl = useMemo(() => {
    if (!bookingResult) return "";

    const params = new URLSearchParams({
      ref: bookingResult.bookingReference,
      phone: formData.phone || "",
      name: formData.name || "",
    });

    return `${publicHost}/appointments/lookup?${params.toString()}`;
  }, [bookingResult, formData.name, formData.phone]);

  const qrImageUrl = useMemo(() => {
    if (!qrLookupUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(qrLookupUrl)}`;
  }, [qrLookupUrl]);

  const qrDownloadName = useMemo(() => {
    const reference = bookingResult?.bookingReference || "booking";
    return `booking-qr-${reference}.png`;
  }, [bookingResult]);

  const dateOptions = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);

      return {
        value: date.toISOString().split("T")[0],
        dayLabel: new Intl.DateTimeFormat(lang, { weekday: "short" }).format(date),
        dateLabel: new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(date),
        isToday: index === 0,
      };
    });
  }, [lang]);

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setLoading(true);
        const res = await clinicService.getAll();
        setClinics(res.data || []);
      } catch {
        toast.error(isAr ? "فشل تحميل العيادات" : "Failed to load clinics");
      } finally {
        setLoading(false);
      }
    };

    loadClinics();
  }, [isAr]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const res = await doctorService.getAll();
      setDoctors(res.data || []);
    } catch {
      toast.error(isAr ? "فشل تحميل الأطباء" : "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (doctorId, dateValue) => {
    try {
      setLoading(true);
      const dateParam = dateValue.includes("T") ? dateValue : `${dateValue}T00:00:00`;
      const res = await doctorService.getAvailableSlots(doctorId, { date: dateParam });
      setSlots(res.data || []);
    } catch {
      toast.error(isAr ? "فشل تحميل المواعيد" : "Failed to load time slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === 3 && selectedDoctor?.id) {
      loadSlots(selectedDoctor.id, selectedDate);
    }
  }, [step, selectedDoctor, selectedDate]);

  const handleClinicSelect = async (clinic) => {
    setSelectedClinic(clinic);
    clinicService.setSelectedClinicId(clinic.id);
    setStep(2);
    await loadDoctors();
  };

  const handleDateChange = (value) => {
    setSelectedDate(value);
    setSelectedSlot(null);
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error(isAr ? "الاسم ورقم الهاتف مطلوبان" : "Name and phone are required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        doctorId: selectedDoctor.id,
        patientName: formData.name,
        patientPhone: formData.phone,
        patientEmail: formData.email,
        slotDateTime: selectedSlot.start,
        notes: formData.notes,
      };
      const res = await appointmentService.publicBook(payload);
      setBookingResult(res.data);
      setStep(5);
      toast.success(isAr ? "تم الحجز بنجاح" : "Appointment booked successfully!");
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to book appointment";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] sm:px-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition-colors hover:text-primary dark:text-slate-300">
            <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            {t("backToHome")}
          </Link>
          <StepBar step={step} />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_80px_-35px_rgba(37,99,235,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_62%,rgba(37,99,235,0.92)_100%)] px-6 py-8 text-white dark:border-white/10 sm:px-10">
            <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
              {isAr ? "حجز المرضى" : "Guest Booking"}
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">{isAr ? "احجز موعدك بسهولة" : "Book Your Appointment"}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium text-slate-200 sm:text-base">
              {isAr ? "اختَر العيادة والطبيب والموعد ثم أكمل بياناتك. بعد الحجز سنعرض QR لسهولة الاستعلام في العيادة." : "Choose clinic, doctor, and time, then complete your details. After booking, a QR code will be shown for quick clinic lookup."}
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{isAr ? "اختيار العيادة" : "Choose Clinic"}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">{isAr ? "ابدأ بتحديد العيادة المناسبة." : "Start by selecting the clinic."}</p>
                </div>

                {loading ? (
                  <div className="flex h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-bold text-slate-500">{isAr ? "جارٍ التحميل..." : "Loading clinics..."}</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {clinics.map((clinic) => (
                      <button
                        key={clinic.id}
                        onClick={() => handleClinicSelect(clinic)}
                        className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 text-start shadow-sm transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl"
                      >
                        <div className="mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                          {clinic.clinicImageUrl ? (
                            <img src={getFileUrl(clinic.clinicImageUrl)} alt={clinic.name} className="h-full w-full object-cover" />
                          ) : clinic.logoUrl ? (
                            <img src={getFileUrl(clinic.logoUrl)} alt={clinic.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 transition-colors group-hover:text-primary">{clinic.name}</h3>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{clinic.subdomain || "General Service"}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{t("chooseDoctor")}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">{selectedClinic?.name}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                    {isAr ? "تغيير العيادة" : "Change Clinic"}
                  </button>
                </div>

                {loading ? (
                  <div className="flex h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-bold text-slate-500">{isAr ? "جارٍ تحميل الأطباء..." : "Loading doctors..."}</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {doctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setSelectedSlot(null);
                          setStep(3);
                        }}
                        className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-start shadow-sm transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl"
                      >
                        <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
                          {doctor.photo ? (
                            <img src={getFileUrl(doctor.photo)} alt={doctor.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-primary">{doctor.name?.charAt(0)}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900">Dr. {doctor.name}</h3>
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{doctor.specialty}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{t("selectTime")}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">Dr. {selectedDoctor?.name}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                    {isAr ? "تغيير الطبيب" : "Change Doctor"}
                  </button>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {t("chooseDate")}
                    </label>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      {isAr ? "اختر اليوم" : "Pick a day"}
                    </span>
                  </div>

                  <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                    {dateOptions.map((option) => {
                      const isSelectedDate = selectedDate === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleDateChange(option.value)}
                          className={`min-w-[96px] rounded-2xl border px-4 py-3 text-center transition-all ${
                            isSelectedDate
                              ? "border-primary bg-primary text-white shadow-lg shadow-primary/25"
                              : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          <div className="text-[11px] font-black uppercase tracking-[0.14em]">
                            {option.isToday ? (isAr ? "اليوم" : "Today") : option.dayLabel}
                          </div>
                          <div className={`mt-1 text-sm font-black ${isSelectedDate ? "text-white" : "text-slate-900"}`}>
                            {option.dateLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 outline-none focus:border-primary"
                  />
                </div>

                {loading ? (
                  <div className="flex h-56 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50">
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-bold text-slate-500">{isAr ? "جارٍ تحميل المواعيد..." : "Loading slots..."}</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                    {isAr ? "لا توجد مواعيد متاحة لهذا التاريخ." : "No slots available for this date."}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((slot, index) => {
                      const isSelected = selectedSlot === slot;
                      const time = new Date(slot.start).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

                      return (
                        <button
                          key={index}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-2xl border p-4 text-sm font-black transition-all ${
                            !slot.isAvailable
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                              : isSelected
                                ? "border-primary bg-primary text-white shadow-lg shadow-primary/25"
                                : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    disabled={!selectedSlot}
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 disabled:opacity-40"
                  >
                    {t("continue")}
                    <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{t("yourDetails")}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Dr. {selectedDoctor?.name} - {selectedSlot && new Date(selectedSlot.start).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <button onClick={() => setStep(3)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                    {t("back")}
                  </button>
                </div>

                <form onSubmit={handleBook} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t("fullName")} *</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <User className="h-4 w-4 text-primary" />
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-transparent font-bold text-slate-800 outline-none"
                          placeholder={isAr ? "الاسم الكامل" : "Full name"}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t("phoneNumber")} *</label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <Phone className="h-4 w-4 text-primary" />
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-transparent font-bold text-slate-800 outline-none"
                          placeholder={isAr ? "رقم الهاتف" : "Phone number"}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t("emailAddress")}</label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-transparent font-bold text-slate-800 outline-none"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t("notes")}</label>
                    <textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-medium text-slate-800 outline-none"
                      placeholder={isAr ? "أي ملاحظات إضافية للطبيب..." : "Any additional notes for the doctor..."}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-2xl bg-primary px-10 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 disabled:opacity-50"
                    >
                      {loading ? (isAr ? "جارٍ الحجز..." : "Booking...") : t("confirmBooking")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 5 && bookingResult && (
              <div className="py-6">
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">{isAr ? "تم تأكيد الحجز" : "Booking Confirmed"}</h2>
                  <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500">
                    {isAr ? "تم إنشاء الحجز بنجاح. احتفظ بالمرجع أو اعرض رمز QR في الاستقبال ليظهر الحجز مباشرة." : "Your booking was created successfully. Keep the reference or show the QR code at reception to open the booking instantly."}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1.1fr)]">
                  <div className="order-2 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8 lg:order-2">
                    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <Ticket className="h-3.5 w-3.5 text-primary" />
                      {isAr ? "مرجع الحجز" : "Booking Reference"}
                    </p>

                    <div className="mb-6 break-all rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-center font-mono text-xl font-black tracking-[0.14em] text-primary sm:text-3xl">
                      {bookingResult.bookingReference}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isAr ? "الاسم" : "Patient"}</p>
                        <p className="text-sm font-black text-slate-900">{formData.name}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isAr ? "الهاتف" : "Phone"}</p>
                        <p className="text-sm font-black text-slate-900">{formData.phone}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isAr ? "الطبيب" : "Doctor"}</p>
                        <p className="text-sm font-black text-slate-900">Dr. {bookingResult.doctorName}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isAr ? "الموعد" : "Appointment"}</p>
                        <p className="text-sm font-black text-slate-900">
                          {selectedSlot && new Date(selectedSlot.start).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="order-1 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 lg:order-1 lg:sticky lg:top-6">
                    <div className="mb-4 flex items-center justify-center gap-2 text-primary">
                      <QrCode className="h-5 w-5" />
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]">{isAr ? "رمز الحجز" : "Booking QR"}</p>
                    </div>

                    <div className="mx-auto flex max-w-[260px] flex-col items-center rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                      {qrImageUrl ? (
                        <img src={qrImageUrl} alt="Booking QR" className="h-full w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-700 dark:bg-slate-950" />
                      ) : (
                        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
                          <QrCode className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                  <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 text-white">
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                      <ScanLine className="h-3.5 w-3.5" />
                      {isAr ? "للاستقبال" : "For Reception"}
                    </p>
                    <p className="text-sm font-medium leading-6 text-slate-200">
                      {isAr ? "عند مسح الرمز سيفتح الحجز مباشرة في صفحة الاستعلام مع المرجع ورقم الهاتف." : "Scanning this code opens the booking lookup page with the reference and phone already filled in."}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-start dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="text-sm font-black text-amber-800 dark:text-amber-200">
                      {isAr ? "مهم: احتفظ برمز QR ومرجع الحجز تحسبًا لأي مشكلة أو عند الوصول للعيادة." : "Important: Keep the QR and booking reference in case of any issue or when you arrive at the clinic."}
                    </p>
                  </div>

                  {qrImageUrl && (
                    <a
                      href={qrImageUrl}
                      download={qrDownloadName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {isAr ? "تنزيل رمز QR" : "Download QR"}
                    </a>
                  )}
                </div>
              </div>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link to="/" className="rounded-2xl border border-slate-200 bg-white px-8 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {t("backToHome")}
                  </Link>
                  <Link
                    to={`/appointments/lookup?ref=${encodeURIComponent(bookingResult.bookingReference)}&phone=${encodeURIComponent(formData.phone || "")}&name=${encodeURIComponent(formData.name || "")}`}
                    className="rounded-2xl bg-primary px-8 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25"
                  >
                    {t("manageBookings") || (isAr ? "إدارة الحجز" : "Manage Booking")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestBookingPage;
