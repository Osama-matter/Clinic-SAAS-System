import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { appointmentService, doctorService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { Calendar, Clock, User, Phone, CheckCircle2, ChevronRight, Edit2, Loader2, Save, X, Stethoscope, AlertTriangle, ArrowUpRight } from "lucide-react";

import { useLanguage } from "../context/LanguageContext";
import DoctorPatientDrawer from "../components/doctor/DoctorPatientDrawer";
import { getDoctorActivity, hasActiveVisitForPatient } from "../lib/doctorActivity";

const STATUS_UI = {
  waiting: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  inProgress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  done: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  canceled: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  late: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

const normalizePhone = (raw) => `${raw || ""}`.replace(/[^\d+]/g, "");

const DoctorSchedulePage = () => {
  const navigate = useNavigate();
  const { isAdmin, isDoctor, isReceptionist } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [filter, setFilter] = useState("Today"); // Today | MyPatients | Confirmed | Late | Completed
  const [drawerAppt, setDrawerAppt] = useState(null);

  const isAr = lang === "ar";
  const activity = getDoctorActivity();
  const myPatientPhones = useMemo(() => {
    const phones = (activity.recentPatients || [])
      .map((p) => normalizePhone(p.phone))
      .filter(Boolean);
    return new Set(phones);
  }, [activity]);

  const loadSchedule = async (date, doctorId = selectedDoctorId) => {
    try {
      setLoading(true);
      const dateStr = date.toISOString().split("T")[0];
      const params = { date: dateStr };
      if (doctorId) params.doctorId = doctorId;

      const res = await appointmentService.getDoctorSchedule(params);
      setAppointments(res.data || []);
    } catch (err) {
      console.error("Failed to load schedule", err);
      // Handle 403 Forbidden specifically for non-doctor accounts (like Admin/Receptionist)
      if (err.response?.status === 403) {
        toast.error(isAr ? "عفواً، لا تملك صلاحية الوصول لهذا الجدول بصفتك الحالية." : "Access denied. Your current role does not have permission to view this schedule.");
      } else {
        toast.error(isAr ? "فشل تحميل المواعيد." : "Failed to load schedule.");
      }
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await doctorService.getAll();
      setDoctors(res.data?.items ?? res.data ?? []);
    } catch (err) {
      console.error("Failed to load doctors", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDoctors();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadSchedule(dateObj, selectedDoctorId);
  }, [dateObj, selectedDoctorId]);

  const updateStatus = async (id, newStatus) => {
    try {
      await appointmentService.updateStatus(id, { newStatus });
      toast.success(isAr ? "تم تحديث الحالة!" : "Status updated!");
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      toast.error(isAr ? "فشل تحديث الحالة." : "Failed to update status.");
    }
  };

  const togglePayment = async (id, currentPaid) => {
    try {
      const isPaid = !currentPaid;
      await appointmentService.updateStatus(id, { isPaid });
      toast.success(isPaid
        ? (isAr ? "تم التحديد كمدفوع" : "Marked as Paid")
        : (isAr ? "تم التحديد كغير مدفوع" : "Marked as Unpaid")
      );
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, isPaid } : a));
    } catch (err) {
      toast.error(isAr ? "فشل تحديث حالة الدفع." : "Failed to update payment status.");
    }
  };

  const saveNote = async (id) => {
    try {
      await appointmentService.addNotes(id, { notes: tempNote });
      toast.success(isAr ? "تم حفظ الملاحظة!" : "Note saved!");
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, notes: tempNote } : a));
      setEditingNoteId(null);
    } catch (err) {
      toast.error(isAr ? "فشل حفظ الملاحظة." : "Failed to save note.");
    }
  };

  const statusMap = {
    0: { label: t('statusWaiting'), color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    1: { label: t('statusConfirmed'), color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    2: { label: t('statusCancelled'), color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
    3: { label: t('statusRescheduled'), color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    4: { label: t('statusDone'), color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    5: { label: t('statusNoShow'), color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
    6: { label: t('statusWaiting'), color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    7: { label: t('statusInProgress'), color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    8: { label: t('statusLate'), color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  };

  const computeUiStatus = (appt) => {
    if (appt.status === 2 || appt.status === 5) return "canceled";
    if (appt.status === 4 || appt.status === 3) return "done";
    if (appt.status === 7) return "inProgress";
    if (appt.status === 8) return "late";
    if (appt.status === 6 || appt.status === 0) return "waiting";

    const inProgress = hasActiveVisitForPatient({ patientPhone: normalizePhone(appt.patientPhone) });
    if (inProgress) return "inProgress";

    return "waiting";
  };

  const filteredAppointments = useMemo(() => {
    const base = [...appointments];
    const now = Date.now();
    const graceMs = 10 * 60 * 1000;

    if (filter === "Today") return base;
    if (filter === "Confirmed") return base.filter((a) => a.status === 1);
    if (filter === "Completed") return base.filter((a) => a.status === 4 || a.status === 3);
    if (filter === "Late") return base.filter((a) => a.status === 8);
    if (filter === "MyPatients") {
      return base.filter((a) => myPatientPhones.has(normalizePhone(a.patientPhone)));
    }

    return base;
  }, [appointments, filter, myPatientPhones]);

  const displayAppointments = useMemo(
    () => filteredAppointments.filter((a) => !selectedDoctorId || a.doctorId === selectedDoctorId),
    [filteredAppointments, selectedDoctorId]
  );

  const nextDay = () => { const d = new Date(dateObj); d.setDate(d.getDate() + 1); setDateObj(d); };
  const prevDay = () => { const d = new Date(dateObj); d.setDate(d.getDate() - 1); setDateObj(d); };

  return (
    <Layout title={t('doctorSchedule')}>
      <div className="max-w-5xl mx-auto space-y-10 pb-24" dir={isRtl ? "rtl" : "ltr"}>

        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-6 lg:gap-8 bg-surface-alt p-6 sm:p-10 rounded-[2.5rem] border border-outline relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl" />
          <div className="relative z-10 w-full lg:w-auto">
            <h1 className="text-3xl sm:text-4xl font-headline font-black text-on-surface mb-2">{t('doctorSchedule')}</h1>
            <p className="text-on-surface-variant font-medium text-sm sm:text-base">{t('viewAppointmentsSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto">
            {isAdmin && (
              <div className="relative group">
                <select
                  value={selectedDoctorId}
                  onChange={e => setSelectedDoctorId(e.target.value)}
                  className="bg-surface px-6 py-4 border border-outline rounded-2xl shadow-sm text-sm font-black text-on-surface outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none min-w-[200px]"
                >
                  <option value="">{t('allDoctors')}</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 bg-surface p-2 border border-outline rounded-2xl shadow-sm">
              <button onClick={prevDay} className="p-3 hover:bg-surface-alt text-on-surface-variant hover:text-primary rounded-xl transition-all shadow-sm hover:shadow-md">
                <ChevronRight className={`w-5 h-5 ${isRtl ? '' : 'rotate-180'}`} />
              </button>
              <div className="flex items-center gap-3 px-4 font-black text-sm uppercase tracking-widest text-primary">
                <Calendar className="w-5 h-5 opacity-50" />
                {dateObj.toLocaleDateString(lang, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <button onClick={nextDay} className="p-3 hover:bg-surface-alt text-on-surface-variant hover:text-primary rounded-xl transition-all shadow-sm hover:shadow-md">
                <ChevronRight className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-2xl border border-outline shadow-sm">
          {["Today", "MyPatients", "Confirmed", "Late", "Completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                  : "bg-surface-alt text-on-surface-variant hover:bg-surface border border-outline"
                }`}
            >
              {f === "MyPatients" ? t("myPatients") : t(f.toLowerCase())}
            </button>
          ))}
        </div>


        {loading ? (
          <div className="py-32 text-center flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{isAr ? "جاري تحميل المواعيد..." : "Loading appointments..."}</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="card-premium p-20 text-center animate-fade-in bg-surface-alt border border-outline">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-200 border border-outline">
              <Calendar className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-on-surface mb-3 font-headline">{t('noAppointments')}</h3>
            <p className="text-on-surface-variant font-medium">{t('noAppointmentsSubtitle')}</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {appointments
              .filter(a => !selectedDoctorId || a.doctorId === selectedDoctorId)
              .map(a => (
                <div key={a.id} className="card-premium group p-0 overflow-hidden hover:border-primary/30 transition-all bg-surface-alt border border-outline">
                  <div className="flex flex-col lg:flex-row">

                    {/* Time Badge (LTR Side / RTL Side) */}
                    <div className={`p-5 sm:p-8 lg:w-48 shrink-0 flex flex-col items-center justify-center border-outline ${isRtl ? 'lg:border-l' : 'lg:border-r'} bg-surface`}>
                      <p className="text-2xl sm:text-3xl font-black font-headline text-on-surface mb-3">
                        {new Date(a.slotDateTime).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border text-center shadow-sm ${statusMap[a.status]?.color || 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {statusMap[a.status]?.label || 'Unknown'}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-5 sm:p-8 flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-surface-alt rounded-2xl flex items-center justify-center text-primary border border-outline shadow-sm group-hover:scale-110 transition-transform">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <div
                                onClick={() => setDrawerAppt(a)}
                                className="cursor-pointer group/name"
                              >
                                <h3 className="text-xl font-black text-on-surface group-hover/name:text-primary transition-colors flex items-center gap-2">
                                  {a.patientName || (isAr ? "مريض مجهول" : "Unknown Patient")}
                                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover/name:opacity-100 transition-all" />
                                </h3>

                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 opacity-40" /> {a.patientPhone || "—"}
                                  </span>
                                  {isAdmin && (
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                                      <Stethoscope className="w-3 h-3" /> {a.doctorName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="bg-surface px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border border-outline shadow-inner">
                            <span className="opacity-30 mr-2 rtl:ml-2 rtl:mr-0">{t('reference')}:</span>
                            <span className="text-on-surface">{a.bookingReference}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => togglePayment(a.id, a.isPaid)}
                              className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border transition-all ${a.isPaid ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white'}`}
                            >
                              {a.isPaid ? t('paid') : t('markPaid')}
                            </button>

                            {(isDoctor || isAdmin) && (
                              <select
                                value={a.status}
                                onChange={(e) => updateStatus(a.id, parseInt(e.target.value))}
                                className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border bg-surface border-outline outline-none cursor-pointer hover:border-primary transition-all appearance-none min-w-[120px] text-center"
                              >
                                <option value="6">{t('statusWaiting')}</option>
                                <option value="7">{t('statusInProgress')}</option>
                                <option value="4">{t('statusDone')}</option>
                                <option value="1">{t('statusConfirmed')}</option>
                                <option value="2">{t('statusCancelled')}</option>
                                <option value="8">{t('statusLate')}</option>
                                <option value="5">{t('statusNoShow')}</option>

                              </select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      {editingNoteId === a.id ? (
                        <div className="bg-primary/5 rounded-3xl p-5 sm:p-6 border border-primary/20 animate-fade-in">
                          <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-primary/60">
                            <Edit2 className="w-3.5 h-3.5" />
                            {t('clinicalNotes')}
                          </div>
                          <textarea
                            value={tempNote}
                            onChange={e => setTempNote(e.target.value)}
                            className="w-full bg-surface-alt border border-outline rounded-2xl p-4 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none resize-none min-h-[120px] text-on-surface placeholder:text-slate-400 transition-all"
                            placeholder={t('addNotePlaceholder')}
                          />
                          <div className="flex gap-3 mt-6 justify-end">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2"
                            >
                              <X className="w-4 h-4" /> {t('cancel')}
                            </button>
                            <button
                              onClick={() => saveNote(a.id)}
                              className="px-8 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" /> {t('saveNote')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-surface rounded-[1.5rem] p-5 sm:p-6 group/note border border-outline relative">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                              <Stethoscope className="w-3.5 h-3.5 opacity-30" />
                              {t('clinicalNotes')}
                            </span>
                            <button
                              onClick={() => { setEditingNoteId(a.id); setTempNote(a.notes || ""); }}
                              className="p-2 bg-surface-alt rounded-lg text-primary opacity-0 group-hover/note:opacity-100 hover:bg-primary/10 transition-all shadow-sm border border-outline"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className={`text-sm leading-relaxed ${a.notes ? "text-on-surface font-medium" : "text-on-surface-variant italic font-bold"}`}>
                            {a.notes || t('noNotes')}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <DoctorPatientDrawer
        open={!!drawerAppt}
        appointment={drawerAppt}
        onClose={() => setDrawerAppt(null)}
        onOpenFull={(id) => navigate(`/patients/${id}`)}
      />
    </Layout>

  );
};

export default DoctorSchedulePage;
