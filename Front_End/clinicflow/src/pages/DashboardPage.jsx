import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { reportService, appointmentService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  Calendar as CalendarIcon,
  Users,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  Home,
  Building2
} from "lucide-react";
import ClinicsManagement from "../components/ClinicsManagement";
import SubscriptionStatusCard from "../components/SubscriptionStatusCard";

/* ─── Main Dashboard ─── */
import { useLanguage } from "../context/LanguageContext";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isDoctor, isReceptionist, isPatient, user } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [stats, setStats] = useState({ totalBookings: 0, confirmed: 0, completed: 0, noShow: 0 });
  const [loading, setLoading] = useState(true);

  const isAr = lang === "ar";
  const isStaff = isAdmin || isReceptionist || isDoctor;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isStaff || isDoctor) {
          const attRes = await reportService.getAttendance();
          if (attRes.data) {
            setStats({
              totalBookings: attRes.data.totalAppointments || 0,
              confirmed: attRes.data.confirmedAppointments || 0,
              completed: attRes.data.completedAppointments || 0,
              noShow: attRes.data.noShowAppointments || 0
            });
          }
        } else if (isPatient) {
          const res = await appointmentService.getMy();
          if (Array.isArray(res.data)) {
            const bookings = res.data;
            setStats({
              totalBookings: bookings.length,
              confirmed: bookings.filter(b => b.status === "Confirmed").length,
              completed: bookings.filter(b => b.status === "Completed").length,
              noShow: bookings.filter(b => b.status === "NoShow").length
            });
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, isReceptionist, isDoctor, isPatient]);

  const statCards = [
    {
      icon: <Users className="w-6 h-6" />,
      label: t('totalAppointments'),
      value: stats.totalBookings,
      color: "text-blue-500 bg-blue-50 border-blue-100 shadow-blue-500/5",
    },
    {
      icon: <Activity className="w-6 h-6" />,
      label: t('confirmed'),
      value: stats.confirmed,
      color: "text-amber-500 bg-amber-50 border-amber-100 shadow-amber-500/5",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      label: t('completed'),
      value: stats.completed,
      color: "text-emerald-500 bg-emerald-50 border-emerald-100 shadow-emerald-500/5",
    }
  ];

  return (
    <Layout title={t('dashboard')}>
      <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6 lg:space-y-10 dark:text-slate-100 px-1 sm:px-0" dir={isRtl ? "rtl" : "ltr"}>
        {/* Greeting Section */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-[2rem] lg:rounded-[3rem] bg-surface border border-outline p-4 sm:p-8 lg:p-12 shadow-sm">
          <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-primary/5 blur-[40px] md:blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 lg:gap-8">
            <div className="text-center md:text-left rtl:md:text-right w-full md:w-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-tighter text-on-surface font-headline mb-2 md:mb-4 leading-tight">
                {t('welcomeBack')}{user?.name ? `, ${user.name.split(' ')[0]}` : ""} <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="text-on-surface-variant text-sm sm:text-base lg:text-lg font-medium opacity-80">
                {t('clinicSummary')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-3.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-surface-alt border border-outline text-on-surface-variant hover:bg-surface transition-all shadow-sm active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                {isAr ? "الرئيسية" : "Home"}
              </button>
              <button
                onClick={() => navigate(isAdmin || isReceptionist ? '/schedule' : (isDoctor ? '/doctor/schedule' : '/appointments'))}
                className="w-full sm:w-auto btn-vibrant px-8 py-4 sm:py-5 flex items-center justify-center gap-3 text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95"
              >
                {t('viewAppointments')}
                <ArrowUpRight className="w-4 sm:w-5 h-4 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32">
            <div className="relative">
              <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
              <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary w-5 h-5 md:w-6 md:h-6" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] mt-6">{t('loadingDashboard')}</p>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-10 animate-fade-in">
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
              {statCards.map((card, i) => (
                <div key={i} className="card-premium group p-4 sm:p-6 lg:p-8 flex items-center gap-4 sm:gap-6">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-all scale-100 group-hover:scale-110 group-active:scale-95 group-hover:shadow-lg ${card.color}`}>
                    {React.cloneElement(card.icon, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 truncate">{card.label}</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-black text-on-surface font-headline leading-none">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Quick action ── */}
            {isAdmin && (
              <div className="pt-2">
                <SubscriptionStatusCard />
              </div>
            )}

            {(isStaff || isDoctor) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                <div className="card-premium relative overflow-hidden group p-5 sm:p-8 lg:p-10 flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-primary/5 blur-2xl md:blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-primary mb-6 md:mb-8 border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform">
                      <CalendarIcon className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h2 className="text-xl md:text-3xl font-black text-on-surface font-headline mb-2 md:mb-3">{t('manageSchedule')}</h2>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-8 md:mb-10 flex-1 leading-relaxed max-w-md">
                      {isAr ? "قم بمراجعة وإدارة مواعيد العيادة وجداول الأطباء بكفاءة عالية." : "View and manage clinical appointments and doctor schedules with high efficiency."}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      <button
                        onClick={() => navigate('/schedule')}
                        className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-primary text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        {t('viewAppointments')}
                      </button>
                      {isDoctor && (
                        <button
                          onClick={() => navigate('/doctor/schedule')}
                          className="flex-1 sm:flex-none px-6 md:px-8 py-3.5 md:py-4 bg-surface-alt text-on-surface-variant font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-2xl border border-outline hover:bg-surface active:scale-95 transition-all"
                        >
                          {t('myAvailability')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card-premium bg-gradient-to-br from-emerald-50/50 to-transparent border-emerald-100 relative overflow-hidden group p-5 sm:p-8 lg:p-10 flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-emerald-100/20 blur-2xl md:blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-500 mb-6 md:mb-8 border border-emerald-100 dark:border-emerald-900/30 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                    <h2 className="text-xl md:text-3xl font-black text-on-surface font-headline mb-2 md:mb-3">
                      {isAr ? "التقارير والتحليلات" : "Reports & Analytics"}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-8 md:mb-10 flex-1 leading-relaxed max-w-md">
                      {isAr ? "تتبع أداء العيادة، نمو المرضى، والإحصائيات الحيوية لاتخاذ قرارات مدروسة." : "Track clinic performance, patient growth, and vital stats to make informed decisions."}
                    </p>
                    <button
                      onClick={() => navigate('/reports')}
                      className="w-full sm:w-fit px-8 py-3.5 md:py-4 bg-emerald-500 text-white font-black text-[10px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all font-sans"
                    >
                      {isAr ? "عرض التقارير" : "View Reports"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Admin Clinic Management (Super Admin ONLY) ── */}
            {isSuperAdmin && (
              <div className="animate-fade-in pt-8 border-t border-outline/50">
                <ClinicsManagement />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
