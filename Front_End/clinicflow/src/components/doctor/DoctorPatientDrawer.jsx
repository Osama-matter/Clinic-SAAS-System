import React, { useMemo, useState, Suspense, lazy } from "react";
import { X, Loader2, UserRound, Phone, ArrowUpRight, Stethoscope } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePatientsQuery } from "../../hooks/queries";
import { usePatientRecord } from "../../pages/medical-record/usePatientRecord";
import { hasActiveVisitForPatient, recordVisitSessionStart } from "../../lib/doctorActivity";

const DoctorQuickSearchModal = lazy(() => import("./DoctorQuickSearchModal"));

function normalizePhone(raw) {
  const s = `${raw || ""}`.replace(/[^\d+]/g, "");
  return s.startsWith("+") ? s : s;
}

const DrawerShell = ({ open, onClose, children }) => (
  <div className={`fixed inset-0 z-[95] ${open ? "" : "pointer-events-none"}`}>
    <div
      className={`absolute inset-0 bg-black/35 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      onClick={onClose}
    />
    <div
      className={`absolute top-0 right-0 h-full w-full sm:w-[520px] bg-white border-l border-slate-200 shadow-2xl transition-transform ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {children}
    </div>
  </div>
);

const DoctorPatientDrawer = ({ open, appointment, onClose, onOpenFull }) => {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualPatientId, setManualPatientId] = useState(null);

  const patientsQuery = usePatientsQuery(open);
  const patients = patientsQuery.data || [];

  const resolvedPatientId = useMemo(() => {
    if (manualPatientId) return manualPatientId;
    const apptPhone = normalizePhone(appointment?.patientPhone);
    if (!apptPhone) return null;

    const match = patients.find((p) => normalizePhone(p.phone || p.phoneNumber) === apptPhone);
    return match?.id || null;
  }, [appointment, manualPatientId, patients]);

  const record = usePatientRecord(resolvedPatientId || "");
  const patient = record.patient;
  const visits = record.visits || [];
  const loading = resolvedPatientId ? record.loading : false;

  const derivedInProgress = hasActiveVisitForPatient({
    patientId: resolvedPatientId,
    patientPhone: normalizePhone(appointment?.patientPhone),
  });

  const headerTitle = appointment?.patientName || (isAr ? "المريض" : "Patient");

  return (
    <DrawerShell open={open} onClose={onClose}>
      <div className="h-full flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "بطاقة المريض" : "Patient chart"}
            </div>
            <div className="text-xl font-black text-slate-900 truncate mt-1">{headerTitle}</div>
            {appointment?.patientPhone ? (
              <div className="text-[12px] font-semibold text-slate-500 flex items-center gap-2 mt-2">
                <Phone className="w-4 h-4 opacity-40" />
                <span className="truncate">{appointment.patientPhone}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:border-primary hover:text-primary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!resolvedPatientId ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-black text-amber-700">
                {isAr ? "لم يتم العثور على المريض" : "Patient not found"}
              </div>
              <div className="text-[12px] font-semibold text-amber-700/70 mt-1">
                {isAr
                  ? "اختر المريض يدويًا لعرض السجل داخل الجدول."
                  : "Pick a patient to preview the chart here."}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-4 w-full px-4 py-3 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest"
              >
                {isAr ? "اختيار مريض" : "Pick patient"}
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? "جاري تحميل السجل..." : "Loading chart..."}
            </div>
          ) : !patient ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-400">
              {isAr ? "لا يوجد بيانات" : "No data"}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">{patient.name}</div>
                    <div className="text-[12px] font-semibold text-slate-400 truncate">
                      {patient.phone || (isAr ? "بدون رقم" : "No phone")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isAr ? "عدد الزيارات" : "Total visits"}
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{visits.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isAr ? "حالة الزيارة" : "Visit status"}
                  </div>
                  <div className={`mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                    derivedInProgress ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                    <Stethoscope className="w-4 h-4" />
                    {derivedInProgress ? (isAr ? "جارية" : "In progress") : (isAr ? "غير نشطة" : "Not active")}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  {isAr ? "آخر زيارات" : "Recent visits"}
                </div>
                {visits.length === 0 ? (
                  <div className="text-sm font-semibold text-slate-400">
                    {isAr ? "لا يوجد زيارات بعد" : "No visits yet"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visits
                      .slice()
                      .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
                      .slice(0, 6)
                      .map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-black text-slate-900 truncate">
                              {new Date(v.visitDate).toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" })}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 truncate">
                              {v.symptoms ? v.symptoms : isAr ? "بدون شكوى" : "No complaint"}
                            </div>
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                            {(v.visitType || "").toString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-white flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (resolvedPatientId && patient) {
                recordVisitSessionStart({
                  patientId: resolvedPatientId,
                  patientName: patient.name,
                  patientPhone: patient.phone || patient.phoneNumber || appointment?.patientPhone || null,
                });
              }
              if (resolvedPatientId) onOpenFull(resolvedPatientId);
            }}
            className="flex-1 px-4 py-3.5 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            {isAr ? "فتح السجل الكامل" : "Open full chart"}
          </button>
        </div>

        {pickerOpen ? (
          <Suspense fallback={null}>
            <DoctorQuickSearchModal
              open
              mode="open"
              onClose={() => setPickerOpen(false)}
              onPick={(p) => {
                setManualPatientId(p.id);
                setPickerOpen(false);
              }}
            />
          </Suspense>
        ) : null}
      </div>
    </DrawerShell>
  );
};

export default DoctorPatientDrawer;

