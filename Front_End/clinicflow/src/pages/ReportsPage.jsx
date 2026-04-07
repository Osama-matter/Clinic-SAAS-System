import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { reportService } from "../services/api";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { 
  Users, 
  CalendarCheck, 
  XCircle, 
  Activity,
  Loader2,
  RefreshCw,
  TrendingUp,
  FileText
} from "lucide-react";

const ReportsPage = () => {
  const { t, lang, isRtl } = useLanguage();
  const [stats, setStats] = useState({ totalAppointments: 0, confirmedAppointments: 0, completedAppointments: 0, noShowAppointments: 0 });
  const [loading, setL] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const isAr = lang === "ar";

  const load = async () => {
    setL(true);
    const tid = toast.loading("Generating analytics...");
    try {
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await reportService.getAttendance(params);
      if (res.data) setStats(res.data);
      toast.success("Reports updated", { id: tid });
    } catch (err) {
      toast.error("Failed to generate reports", { id: tid });
    }
    finally { setL(false); }
  };

  const handleExport = async (format) => {
    try {
      const tid = toast.loading(`Exporting ${format.toUpperCase()}...`);
      const res = await reportService.exportReport({ format, from: from || undefined, to: to || undefined });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appointments_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Export complete", { id: tid });
    } catch (err) {
      toast.error("Export failed");
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const kpis = [
    { label: t('totalBookings') || "Total Bookings", value: stats.totalAppointments, icon: <Users className="w-4 h-4" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: t('confirmed') || "Confirmed", value: stats.confirmedAppointments, icon: <Activity className="w-4 h-4" />, color: "text-amber-500", bg: "bg-amber-50" },
    { label: t('completed') || "Completed", value: stats.completedAppointments, icon: <CalendarCheck className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: t('noShows') || "No Shows", value: stats.noShowAppointments, icon: <XCircle className="w-4 h-4" />, color: "text-rose-500", bg: "bg-rose-50" },
  ];

  return (
    <Layout title={t('reports')}>
      <div className="max-w-[1400px] mx-auto space-y-8 pb-20" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex flex-wrap gap-6 justify-between items-start bg-surface border border-outline p-6 sm:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-headline">{isAr ? "تقارير العيادة" : "Clinic Reports"}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{isAr ? "تحليلات الحضور والأداء. (للمسؤولين فقط)" : "Attendance and performance analytics. (Admin only)"}</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 bg-surface-alt p-4 rounded-2xl border border-outline flex-wrap shadow-inner">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isAr ? "من" : "From"}</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="bg-surface border border-outline rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all color-scheme-dark" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isAr ? "إلى" : "To"}</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="bg-surface border border-outline rounded-xl px-4 py-2 text-slate-700 dark:text-slate-200 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all color-scheme-dark" />
            </div>
            <button onClick={load} disabled={loading}
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isAr ? "تطبيق" : "Apply"}
            </button>
            <div className="h-6 w-px bg-outline mx-2" />
            <button onClick={() => handleExport('csv')} className="px-5 py-3 bg-surface text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-surface-alt border border-outline transition-all shadow-sm">CSV</button>
            <button onClick={() => handleExport('pdf')} className="px-5 py-3 bg-surface text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-surface-alt border border-outline transition-all shadow-sm">PDF</button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {kpis.map(({ label, value, color, icon, bg }) => (
            <div key={label} className="bg-surface rounded-3xl p-5 sm:p-8 border border-outline shadow-sm group hover:border-primary/20 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${bg} dark:bg-opacity-10 ${color} rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform shadow-sm border border-current/5`}>
                {icon}
              </div>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">{label}</p>
              <p className={`text-2xl sm:text-4xl font-black font-headline ${color}`}>{value ?? "0"}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface-alt rounded-[3rem] border border-outline p-6 sm:p-12 text-center shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all" />
          <FileText className="w-20 h-20 text-slate-200 dark:text-slate-700 mx-auto mb-6 group-hover:text-primary/20 transition-colors" />
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 font-headline">{isAr ? "سجلات مفصلة" : "Detailed Records"}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed">
            {isAr ? "قم بتنزيل سجلات المواعيد الكاملة للفترة المختارة لعرض تفاصيل المرضى وأداء الأطباء." : "Export the full appointment logs for the selected period to view patient details and doctor performance."}
          </p>
          <div className="flex flex-wrap justify-center gap-6 relative z-10">
            <button onClick={() => handleExport('csv')} className="px-10 py-5 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-2xl transition-all shadow-xl shadow-primary/20 hover:-translate-y-1 active:translate-y-0">
              {isAr ? "تحميل CSV كامل" : "Download Full CSV"}
            </button>
            <button onClick={() => handleExport('pdf')} className="px-10 py-5 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:shadow-2xl transition-all shadow-xl shadow-emerald-500/20 hover:-translate-y-1 active:translate-y-0 font-sans">
              {isAr ? "إنشاء PDF للطباعة" : "Generate Printable PDF"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
