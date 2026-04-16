import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useDeferredSection } from "../../hooks/useDeferredSection";
import { useDoctorScheduleQuery, useNotificationsQuery } from "../../hooks/queries";
import { getActiveVisitSessions, getDoctorActivity, getLastIncompleteVisit } from "../../lib/doctorActivity";

const DoctorQuickSearchModal = lazy(() => import("./DoctorQuickSearchModal"));

const Card = ({ title, value, icon, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="card-premium p-4 sm:p-6 flex items-center gap-4 hover:border-primary/30 transition-all text-left disabled:opacity-60"
  >
    <div className="w-12 h-12 rounded-2xl bg-surface-alt border border-outline flex items-center justify-center text-primary shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{title}</div>
      <div className="text-2xl font-black text-on-surface leading-none mt-1">{value}</div>
      {hint ? <div className="text-[11px] font-semibold text-slate-400 mt-2 truncate">{hint}</div> : null}
    </div>
  </button>
);

const ActionButton = ({ label, icon, onClick, primary }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      primary
        ? "btn-vibrant px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        : "px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-surface border border-outline hover:border-primary hover:text-primary transition-all"
    }
  >
    {icon}
    {label}
  </button>
);

const DoctorDashboardPanel = ({ lang }) => {
  const navigate = useNavigate();
  const isAr = lang === "ar";
  const [pickerMode, setPickerMode] = useState(null); // "open" | "start" | "rx"
  const [kpiEnabled, setKpiEnabled] = useState(false);
  const today = useMemo(() => new Date(), []);
  useEffect(() => {
    // Let the page paint first; then fetch KPIs in background.
    const t = setTimeout(() => setKpiEnabled(true), 150);
    return () => clearTimeout(t);
  }, []);

  const scheduleQuery = useDoctorScheduleQuery({ date: today, enabled: kpiEnabled });
  const notificationsQuery = useNotificationsQuery(kpiEnabled);

  const schedule = scheduleQuery.data || [];
  const now = Date.now();

  const todayAppointments = scheduleQuery.isLoading ? "…" : schedule.length;
  const waitingPatients = schedule.filter((appt) => {
    const status = appt.status;
    const slotTime = new Date(appt.slotDateTime).getTime();
    const isActiveStatus = status === 0 || status === 1 || status === 4; // pending/confirmed/rescheduled
    return isActiveStatus && slotTime <= now;
  }).length;
  const waitingPatientsValue = scheduleQuery.isLoading ? "…" : waitingPatients;

  const unreadNotifications = (notificationsQuery.data || []).filter((n) => !n.isRead).length;
  const unreadNotificationsValue = notificationsQuery.isLoading ? "…" : unreadNotifications;

  const activeVisits = getActiveVisitSessions(240).length;

  const continueVisit = getLastIncompleteVisit();
  const activity = getDoctorActivity();
  const recentPatients = (activity.recentPatients || []).slice(0, 5);
  const recentFiles = (activity.recentFiles || []).slice(0, 5);

  const openPicker = (mode) => setPickerMode(mode);
  const closePicker = () => setPickerMode(null);

  const handlePickPatient = (patient) => {
    if (!patient?.id) return;
    if (pickerMode === "start") {
      navigate(`/patients/${patient.id}?start=1`);
    } else if (pickerMode === "rx") {
      navigate(`/patients/${patient.id}?start=1&focus=rx`);
    } else {
      navigate(`/patients/${patient.id}`);
    }
    closePicker();
  };

  const quickActionsRef = useDeferredSection();

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card
          title={isAr ? "مواعيد اليوم" : "Today appointments"}
          value={todayAppointments}
          icon={<ClipboardList className="w-5 h-5" />}
          hint={isAr ? "افتح الجدول" : "Open schedule"}
          onClick={() => navigate("/doctor/schedule")}
        />
        <Card
          title={isAr ? "في الانتظار" : "Waiting patients"}
          value={waitingPatientsValue}
          icon={<UserRound className="w-5 h-5" />}
          hint={isAr ? "حسب وقت الموعد" : "Based on slot time"}
          onClick={() => navigate("/doctor/schedule")}
        />
        <Card
          title={isAr ? "متابعات حرجة" : "Critical follow-ups"}
          value={0}
          icon={<HeartPulse className="w-5 h-5" />}
          hint={isAr ? "قريبًا" : "Coming soon"}
          onClick={() => {}}
        />
        <Card
          title={isAr ? "نتائج غير مقروءة" : "Unread results"}
          value={unreadNotificationsValue}
          icon={<FlaskConical className="w-5 h-5" />}
          hint={isAr ? "الإشعارات" : "Notifications"}
          onClick={() => navigate("/settings")}
        />
        <Card
          title={isAr ? "زيارات نشطة" : "Active visits"}
          value={activeVisits}
          icon={<Activity className="w-5 h-5" />}
          hint={continueVisit ? (isAr ? "أكمل آخر زيارة" : "Continue last visit") : (isAr ? "ابدأ زيارة" : "Start visit")}
          onClick={() => {
            if (continueVisit?.patientId) {
              navigate(`/patients/${continueVisit.patientId}?start=1`);
            } else {
              openPicker("start");
            }
          }}
        />
      </div>

      <div ref={quickActionsRef.ref} className="card-premium p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "إجراءات سريعة" : "Quick actions"}
            </div>
            <div className="text-xl sm:text-2xl font-black text-on-surface mt-1">
              {isAr ? "نفّذ خطوة واحدة الآن" : "One action, now"}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
            <ActionButton
              primary
              label={isAr ? "ابدأ زيارة" : "Start visit"}
              icon={<Stethoscope className="w-4 h-4" />}
              onClick={() => openPicker("start")}
            />
            <ActionButton
              label={isAr ? "افتح مريض" : "Open patient"}
              icon={<UserRound className="w-4 h-4" />}
              onClick={() => openPicker("open")}
            />
            <ActionButton
              label={isAr ? "أضف روشتة" : "Add Rx"}
              icon={<ClipboardList className="w-4 h-4" />}
              onClick={() => openPicker("rx")}
            />
            <ActionButton
              label={isAr ? "بحث عام" : "Global search"}
              icon={<Search className="w-4 h-4" />}
              onClick={() => openPicker("open")}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <div className="card-premium p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "نشاط حديث" : "Recent patients"}
            </div>
            <button
              type="button"
              onClick={() => openPicker("open")}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
            >
              {isAr ? "فتح" : "Open"}
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <div className="text-sm font-semibold text-slate-400">
              {isAr ? "لا يوجد نشاط بعد" : "No activity yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {recentPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-outline bg-surface-alt px-4 py-3 hover:border-primary/30 transition-all"
                >
                  <div className="min-w-0">
                    <div className="font-black text-on-surface truncate">{p.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {p.phone || (isAr ? "بدون رقم" : "No phone")}
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                    {new Date(p.lastOpenedAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              ))}
            </div>
          )}

          {continueVisit?.patientId ? (
            <button
              type="button"
              onClick={() => navigate(`/patients/${continueVisit.patientId}?start=1`)}
              className="mt-4 w-full px-5 py-4 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {isAr ? "أكمل آخر زيارة" : "Continue last visit"}
            </button>
          ) : null}
        </div>

        <div className="card-premium p-5 sm:p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
            {isAr ? "آخر ملفات" : "Last opened files"}
          </div>

          {recentFiles.length === 0 ? (
            <div className="text-sm font-semibold text-slate-400">
              {isAr ? "لا يوجد ملفات بعد" : "No files yet"}
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-outline bg-surface-alt px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-black text-on-surface truncate">{f.title}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {isAr ? "PDF روشتة" : "Prescription PDF"}
                    </div>
                  </div>
                  {f.patientId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/patients/${f.patientId}`)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline shrink-0"
                    >
                      {isAr ? "فتح المريض" : "Open patient"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pickerMode ? (
        <Suspense fallback={null}>
          <DoctorQuickSearchModal
            open
            mode={pickerMode}
            onClose={closePicker}
            onPick={handlePickPatient}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default DoctorDashboardPanel;
