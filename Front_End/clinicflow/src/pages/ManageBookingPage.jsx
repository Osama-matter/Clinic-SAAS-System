import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { appointmentService } from "../services/api";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ClipboardList,
  Phone,
  Search,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";

const statusClasses = {
  0: "bg-amber-50 text-amber-700 border-amber-200",
  1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  2: "bg-rose-50 text-rose-700 border-rose-200",
  3: "bg-blue-50 text-blue-700 border-blue-200",
  4: "bg-slate-100 text-slate-700 border-slate-200",
};

const emptyForm = { name: "", phone: "", bookingReference: "" };

const formatAppointmentDate = (value, locale) =>
  new Date(value).toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatAppointmentTime = (value, locale) =>
  new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

const BookingResultCard = ({ appointment, highlightExact = false, isAr = false, locale }) => {
  const statusText = {
    0: isAr ? "قيد الانتظار" : "Pending",
    1: isAr ? "مؤكد" : "Confirmed",
    2: isAr ? "ملغي" : "Cancelled",
    3: isAr ? "أُعيدت الجدولة" : "Rescheduled",
    4: isAr ? "مكتمل" : "Completed",
  };

  return (
  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
    <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_55%,rgba(37,99,235,0.95)_100%)] px-5 py-5 text-white sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
            <Ticket className="h-3.5 w-3.5" />
            {isAr ? "مرجع الحجز" : "Booking Reference"}
          </p>
          <h2 className="break-all text-xl font-black tracking-[0.14em] text-white sm:text-2xl">
            {appointment.bookingReference}
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-200">
            {isAr
              ? `${appointment.patientName || "مريض"} مع د. ${appointment.doctorName}`
              : `${appointment.patientName || "Patient"} with Dr. ${appointment.doctorName}`}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
              statusClasses[appointment.status] || "bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {statusText[appointment.status] || (isAr ? "غير معروف" : "Unknown")}
          </span>
          {highlightExact && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isAr ? "QR / تطابق مباشر" : "QR / Exact Match"}
            </span>
          )}
        </div>
      </div>
    </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {isAr ? "اسم المريض" : "Patient Name"}
        </p>
        <p className="text-sm font-black text-slate-900">{appointment.patientName || "-"}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          <Phone className="h-3.5 w-3.5" />
          {isAr ? "هاتف المريض" : "Patient Phone"}
        </p>
        <p className="text-sm font-black text-slate-900">{appointment.patientPhone || "-"}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          {isAr ? "تاريخ الموعد" : "Appointment Date"}
        </p>
        <p className="text-sm font-black text-slate-900">
          {formatAppointmentDate(appointment.slotDateTime, locale)}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          {isAr ? "وقت الموعد" : "Appointment Time"}
        </p>
        <p className="text-sm font-black text-slate-900">
          {formatAppointmentTime(appointment.slotDateTime, locale)}
        </p>
      </div>
    </div>
  </div>
  );
};

const ManageBookingPage = () => {
  const { t, lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const locale = isAr ? "ar-EG" : "en-US";
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(() => ({
    name: searchParams.get("name") || "",
    phone: searchParams.get("phone") || "",
    bookingReference: searchParams.get("ref") || "",
  }));
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [lastSearch, setLastSearch] = useState(emptyForm);

  const hasAnySearchValue = useMemo(
    () => formData.name.trim() || formData.phone.trim() || formData.bookingReference.trim(),
    [formData]
  );

  const runSearch = async (payload) => {
    const name = payload.name.trim();
    const phone = payload.phone.trim();
    const bookingReference = payload.bookingReference.trim().toUpperCase();

    if (!name && !phone && !bookingReference) {
      toast.error(
        isAr
          ? "أدخل مرجع الحجز أو اسم المريض أو رقم الهاتف"
          : "Enter booking reference, patient name, or phone number"
      );
      return;
    }

    try {
      setSearching(true);
      setExactMatch(false);
      setLastSearch({ name, phone, bookingReference });

      if (bookingReference) {
        const response = await appointmentService.publicLookup({
          bookingReference,
          phone: phone || undefined,
        });

        const appointment = response.data
          ? {
              ...response.data,
              patientName: name || (isAr ? "حجز مطابق" : "Matched Booking"),
              patientPhone: phone || (isAr ? "تم عبر المسح" : "Scanned Lookup"),
            }
          : null;

        setResults(appointment ? [appointment] : []);
        setExactMatch(true);
      } else {
        const response = await appointmentService.publicSearch({
          name: name || undefined,
          phone: phone || undefined,
        });
        setResults(response.data || []);
      }

      setSearched(true);
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        (isAr ? "فشل البحث عن الحجوزات" : "Failed to search bookings");
      toast.error(message);
      setResults([]);
      setSearched(true);
      setExactMatch(false);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const ref = searchParams.get("ref") || "";
    const phone = searchParams.get("phone") || "";
    const name = searchParams.get("name") || "";

    if (ref || phone || name) {
      runSearch({ name, phone, bookingReference: ref });
    }
  }, [searchParams]);

  const handleSearch = async (e) => {
    e.preventDefault();
    await runSearch(formData);
  };

  const handleReset = () => {
    setFormData(emptyForm);
    setResults([]);
    setSearched(false);
    setExactMatch(false);
    setLastSearch(emptyForm);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_48%,#f8fbff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.22),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-primary dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200"
          >
            <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
            {t("backToHome")}
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_80px_-35px_rgba(37,99,235,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-950/85">
          <div className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,rgba(2,6,23,1)_0%,rgba(15,23,42,1)_58%,rgba(37,99,235,0.92)_100%)] px-6 py-8 text-white dark:border-white/10 sm:px-10 sm:py-10">
            <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-blue-400/15 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-blue-100">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {isAr ? "بوابة الحجز العامة" : "Public Booking Portal"}
                </p>
                <h1 className="text-3xl font-black sm:text-4xl">
                  {isAr ? "ابحث وتحقق من أي حجز" : "Find And Verify Any Booking"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-200 sm:text-base">
                  {isAr
                    ? "ابحث بمرجع الحجز أو اسم المريض أو رقم الهاتف. وإذا تم مسح رمز QR، سيفتح الحجز هنا مباشرة ويظهر فورًا."
                    : "Search by booking reference, patient name, or phone number. If a QR code is scanned, the booking can open here directly and load instantly."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                    {isAr ? "مرجع الحجز" : "Booking Ref"}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {isAr ? "وصول سريع ودقيق" : "Fast exact match"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                    {isAr ? "بحث المريض" : "Patient Search"}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {isAr ? "بالاسم أو الهاتف" : "Name or phone"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100">
                    {isAr ? "الاستقبال" : "Front Desk"}
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {isAr ? "امسح QR وافتح الحجز" : "Scan QR and open booking"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10">
            <form
              onSubmit={handleSearch}
              className="grid gap-4 rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] sm:p-6 xl:grid-cols-[1.1fr_1fr_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "مرجع الحجز" : "Booking Reference"}
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Ticket className="h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={formData.bookingReference}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bookingReference: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder={isAr ? "امسح أو أدخل المرجع" : "Scan or enter reference"}
                    className="w-full bg-transparent text-sm font-black uppercase tracking-[0.08em] text-slate-800 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "اسم المريض" : "Patient Name"}
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <User className="h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={isAr ? "ابحث باسم المريض" : "Search by patient name"}
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "رقم الهاتف" : "Phone Number"}
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Phone className="h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder={isAr ? "ابحث برقم الهاتف" : "Search by phone number"}
                    className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end gap-3 sm:flex-row xl:flex-col">
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  {searching ? (isAr ? "جارٍ البحث..." : "Searching...") : isAr ? "بحث" : "Search"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!hasAnySearchValue && !searched}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  {isAr ? "إعادة تعيين" : "Reset"}
                </button>
              </div>
            </form>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "نصائح البحث" : "Search Tips"}
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  {isAr
                    ? "استخدم مرجع الحجز للحصول على أسرع نتيجة دقيقة، أو ابحث باسم المريض ورقم الهاتف إذا لم يكن معه رمز QR."
                    : "Use the booking reference for the fastest exact result, or search by patient phone and name if the user does not have the QR."}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "جاهز للـ QR" : "QR Ready"}
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  {isAr
                    ? "بعد ما المريض يكمّل الحجز، رمز الـ QR الناتج يفتح نفس الصفحة ويحمّل مرجع الحجز تلقائيًا."
                    : "When the patient finishes booking, the generated QR opens this same page with the booking reference already loaded."}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "الوصول" : "Access"}
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                  {isAr
                    ? "الصفحة تعمل بدون تسجيل دخول، لذلك يقدر فريق الاستقبال أو المريض استخدامها بسرعة."
                    : "This page works without login so front desk staff and patients can use it quickly."}
                </p>
              </div>
            </div>

            {searched && (
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {isAr ? "ملخص البحث" : "Search Summary"}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                      {isAr
                        ? "احتفظ بهذه البيانات الظاهرة لو احتجت مراجعة ما تم البحث به أو ما ظهر في النتيجة."
                        : "Keep these details in case you need to review what was searched and what appeared in the result."}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
                    {isAr ? `عدد النتائج: ${results.length}` : `Results: ${results.length}`}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {isAr ? "مرجع الحجز" : "Booking Reference"}
                    </p>
                    <p className="break-all text-sm font-black text-slate-900 dark:text-slate-100">
                      {lastSearch.bookingReference || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {isAr ? "اسم المريض" : "Patient Name"}
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {lastSearch.name || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      {isAr ? "رقم الهاتف" : "Phone Number"}
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {lastSearch.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {searched && results.length === 0 && (
                <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  {isAr ? "لم يتم العثور على حجوزات بهذا البحث." : "No bookings found with this search."}
                </div>
              )}

              {results.map((appointment) => (
                <BookingResultCard
                  key={appointment.id}
                  appointment={appointment}
                  highlightExact={exactMatch}
                  isAr={isAr}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageBookingPage;
