import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  BadgeDollarSign,
  Building2,
  Calendar,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  UserRound,
  CalendarRange,
  ArrowUpRight,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import Modal from "../components/Modal";
import { clinicService, clinicSubscriptionService, planService } from "../services/api";

const emptyPlanForm = {
  name: "",
  price: "",
  durationDays: 30,
  maxDoctors: "",
  maxPatients: "",
  maxBookings: "",
  isActive: true,
};

const toNullableInt = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatLimit = (value, isAr) => (value == null ? (isAr ? "غير محدود" : "Unlimited") : value);

const SaaSManagementPage = ({ initialTab = "plans" }) => {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [plans, setPlans] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [subscriptionsByClinic, setSubscriptionsByClinic] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlanForm);

  const statusMeta = {
    Active: { label: isAr ? "نشط" : "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    Trial: { label: isAr ? "تجريبي" : "Trial", className: "bg-blue-50 text-blue-700 border-blue-100" },
    Expired: { label: isAr ? "منتهي" : "Expired", className: "bg-rose-50 text-rose-700 border-rose-100" },
    PendingPayment: { label: isAr ? "بانتظار الدفع" : "Pending Payment", className: "bg-amber-50 text-amber-700 border-amber-100" },
    Inactive: { label: isAr ? "غير نشط" : "Inactive", className: "bg-slate-100 text-slate-600 border-slate-200" },
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, clinicsRes] = await Promise.all([planService.getAll(), clinicService.getAll()]);
      setPlans(plansRes.data || []);

      const clinicList = clinicsRes.data || [];
      setClinics(clinicList);

      const subscriptionEntries = await Promise.all(
        clinicList.map(async (clinic) => {
          try {
            const subRes = await clinicSubscriptionService.getByClinic(clinic.id);
            const latest =
              (subRes.data || [])
                .slice()
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
            return [clinic.id, latest];
          } catch {
            return [clinic.id, null];
          }
        })
      );

      setSubscriptionsByClinic(Object.fromEntries(subscriptionEntries));
    } catch (err) {
      toast.error(isAr ? "فشل تحميل البيانات." : "Failed to load management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clinicStats = useMemo(() => {
    const stats = { Total: clinics.length, Active: 0, Trial: 0, Expired: 0, PendingPayment: 0, Inactive: 0 };
    clinics.forEach((clinic) => {
      const key = subscriptionsByClinic[clinic.id]?.status || "Inactive";
      stats[key] = (stats[key] || 0) + 1;
    });
    return stats;
  }, [clinics, subscriptionsByClinic]);

  const openPlanModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setForm({
        name: plan.name || "",
        price: plan.price ?? "",
        durationDays: plan.durationDays ?? 30,
        maxDoctors: plan.maxDoctors ?? "",
        maxPatients: plan.maxPatients ?? "",
        maxBookings: plan.maxBookings ?? "",
        isActive: !!plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setForm(emptyPlanForm);
    }
    setPlanModalOpen(true);
  };

  const savePlan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(isAr ? "جارٍ الحفظ..." : "Saving plan...");

    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        durationDays: Number(form.durationDays) || 30,
        maxDoctors: toNullableInt(form.maxDoctors),
        maxPatients: toNullableInt(form.maxPatients),
        maxBookings: toNullableInt(form.maxBookings),
        isActive: form.isActive,
      };

      if (editingPlan) {
        await planService.update(editingPlan.id, { ...payload, id: editingPlan.id });
        toast.success(isAr ? "تم تحديث الباقة." : "Plan updated successfully.", { id: toastId });
      } else {
        await planService.create(payload);
        toast.success(isAr ? "تم إنشاء الباقة." : "Plan created successfully.", { id: toastId });
      }

      setPlanModalOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ." : "Error while saving.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm(isAr ? "هل تريد حذف هذه الباقة؟" : "Are you sure you want to delete this plan?")) return;
    try {
      await planService.delete(id);
      toast.success(isAr ? "تم الحذف." : "Deleted successfully.");
      await fetchData();
    } catch {
      toast.error(isAr ? "فشل الحذف." : "Delete failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          {isAr ? "جاري تحميل الإدارة..." : "Loading management dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 p-4 sm:p-6 lg:p-10 min-h-screen bg-slate-50/50 dark:bg-slate-950/50" dir={isRtl ? "rtl" : "ltr"}>
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-white to-slate-50 p-6 sm:p-10 shadow-2xl shadow-slate-200/50 ring-1 ring-slate-100 dark:from-slate-900 dark:to-slate-800 dark:shadow-none dark:ring-white/10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />
        
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary dark:bg-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              SaaS Admin Panel
            </div>
            <h1 className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              <div className="rounded-2xl bg-primary shadow-xl shadow-primary/30 p-2 sm:p-3 text-white w-fit">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
                {isAr ? "إدارة المنصة" : "Platform Management"}
              </span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-500 leading-relaxed dark:text-slate-400">
              {isAr
                ? "إدارة متقدمة للباقات والعيادات. راقب النمو وصمم تجربة المستخدم بفاعلية تامة."
                : "Advanced oversight for plans and clinics. Monitor growth and shape the user experience effortlessly."}
            </p>
          </div>

          <button
            onClick={() => (activeTab === "plans" ? openPlanModal() : fetchData())}
            className="group w-full md:w-auto relative flex items-center justify-center gap-3 overflow-hidden rounded-[1rem] sm:rounded-[1.5rem] bg-gradient-to-r from-primary to-emerald-500 px-6 sm:px-8 py-4 sm:py-5 text-xs sm:text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
            <Plus className="relative h-6 w-6 transition-transform group-hover:rotate-90" />
            <span className="relative">{activeTab === "plans" ? (isAr ? "إضافة باقة" : "Create Plan") : isAr ? "تحديث" : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className="flex w-full sm:w-fit gap-1 sm:gap-2 rounded-full bg-white/80 p-1.5 sm:p-2 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 backdrop-blur-xl dark:bg-slate-900/50 dark:shadow-none dark:ring-white/10 mx-auto md:mx-0 overflow-x-auto">
        {[
          { key: "plans", label: isAr ? "الباقات" : "Plans", icon: <CreditCard className="h-4 w-4 shrink-0" /> },
          { key: "clinics", label: isAr ? "العيادات" : "Clinics", icon: <Building2 className="h-4 w-4 shrink-0" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 sm:flex-none justify-center items-center gap-2 sm:gap-3 rounded-full px-4 sm:px-8 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900 sm:scale-105"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "plans" && (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white p-6 sm:p-8 shadow-2xl shadow-slate-200/40 ring-1 ring-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-3xl hover:shadow-primary/20 dark:bg-slate-900 dark:shadow-none dark:ring-white/10 dark:hover:ring-primary/50">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {!plan.isActive && (
                <div className="absolute right-4 top-4 sm:right-6 sm:top-6 rounded-full bg-rose-50 px-3 py-1 sm:px-4 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-500 ring-1 ring-rose-200/50 dark:bg-rose-500/10 dark:ring-rose-500/20">
                  {isAr ? "غير نشطة" : "Inactive"}
                </div>
              )}

              <div className="relative z-10 mb-6 sm:mb-8 mt-4 sm:mt-0">
                <div className="mb-2 sm:mb-3 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  {isAr ? "خطة الاشتراك" : "Subscription Plan"}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors">{plan.name}</h3>
              </div>

              <div className="relative z-10 mb-6 sm:mb-8 flex items-end gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">{plan.price}</span>
                <div className="pb-1 sm:pb-2">
                  <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">EGP</span>
                  <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">/ {plan.durationDays} {isAr ? "يوم" : "Days"}</span>
                </div>
              </div>

              <div className="relative z-10 space-y-4 mb-8 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? "حدود الباقة" : "Features & Limits"}</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                </div>
                <div className="space-y-3">
                  {[
                    { label: isAr ? "دكاترة" : "Doctors", value: plan.maxDoctors, icon: <Users className="h-5 w-5" /> },
                    { label: isAr ? "مرضى" : "Patients", value: plan.maxPatients, icon: <UserRound className="h-5 w-5" /> },
                    { label: isAr ? "حجوزات" : "Bookings", value: plan.maxBookings, icon: <CalendarRange className="h-5 w-5" /> },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-slate-50/50 p-3 transition-colors hover:bg-primary/5 dark:bg-slate-800/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-white/10">
                        {item.icon}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white bg-white px-3 py-1 rounded-full shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-white/10">
                          {formatLimit(item.value, isAr)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-3 mt-auto pt-6 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => openPlanModal(plan)}
                  className="group/btn flex flex-1 items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-primary dark:bg-white dark:text-slate-900 dark:hover:bg-primary dark:hover:text-white shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                >
                  <Edit2 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  {isAr ? "تعديل" : "Edit Plan"}
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-all hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 hover:shadow-xl hover:shadow-rose-500/30 active:scale-[0.98]"
                  title={isAr ? "حذف" : "Delete"}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "clinics" && (
        <div className="space-y-8 sm:space-y-12">
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {[
              { key: "Total", label: isAr ? "إجمالي العيادات" : "Total Clinics", color: "from-blue-500 to-indigo-500" },
              { key: "Active", label: isAr ? "نشطة" : "Active", color: "from-emerald-400 to-emerald-600" },
              { key: "Trial", label: isAr ? "تجريبية" : "Trial", color: "from-amber-400 to-orange-500" },
              { key: "PendingPayment", label: isAr ? "بانتظار الدفع" : "Pending Payment", color: "from-purple-400 to-fuchsia-500" },
              { key: "Expired", label: isAr ? "منتهية" : "Expired", color: "from-rose-400 to-red-600" },
            ].map((item) => (
              <div key={item.key} className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-white p-4 sm:p-6 shadow-2xl shadow-slate-200/50 ring-1 ring-slate-100 dark:bg-slate-900 dark:shadow-none dark:ring-white/10 group hover:-translate-y-1 transition-transform">
                <div className={`absolute -right-4 -top-4 h-16 w-16 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br ${item.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 sm:mb-4 inline-flex items-center gap-1 sm:gap-2 truncate w-full">
                  <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full bg-gradient-to-br ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </p>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <p className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{clinicStats[item.key] || 0}</p>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400">{isAr ? "عيادة" : "Clinics"}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
            {clinics.map((clinic) => {
              const subscription = subscriptionsByClinic[clinic.id];
              const meta = statusMeta[subscription?.status] || statusMeta.Inactive;

              return (
                <div key={clinic.id} className="group flex flex-col justify-between overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-white p-5 sm:p-8 shadow-2xl shadow-slate-200/40 ring-1 ring-slate-100 transition-all hover:shadow-3xl hover:shadow-primary/10 dark:bg-slate-900 dark:shadow-none dark:ring-white/10 border-l-[4px] sm:border-l-[6px] hover:border-primary/50" style={{ borderLeftColor: clinic.primaryColor || 'transparent' }}>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
                    <div className="flex items-start gap-3 sm:gap-5">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-white/10 shadow-inner flex items-center justify-center">
                        {clinic.logoUrl ? (
                          <img src={clinic.logoUrl} alt={clinic.name} className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-full w-fit max-w-[150px] sm:max-w-xs truncate">
                            {clinic.subdomain || (isAr ? "بدون نطاق" : "No subdomain")}
                          </p>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight break-words">{clinic.name}</h3>
                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-slate-500 line-clamp-1">
                          {clinic.address || (isAr ? "البيانات غير مكتملة" : "Data incomplete")}
                        </p>
                      </div>
                    </div>
                    <div className={`w-fit sm:shrink-0 inline-flex items-center gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${meta.className}`}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-current"></span>
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current"></span>
                      </span>
                      {meta.label}
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="relative overflow-hidden rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-white/5 transition-colors group-hover:bg-primary/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        {isAr ? "خطة الاشتراك" : "Subscription Plan"}
                      </p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                        {subscription?.planName || (isAr ? "غير محدد" : "None")}
                      </p>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-white/5 transition-colors group-hover:bg-primary/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" />
                        {isAr ? "المدفوع" : "Amount Paid"}
                      </p>
                      <p className="mt-2 text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {subscription?.paidAmount ?? 0} <span className="text-[10px] font-bold text-slate-400">EGP</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                        REF: {subscription?.paymentRef || "-----"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{isAr ? "تاريخ الانتهاء" : "Renewal Date"}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-rose-500" />
                        {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : '---'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? (isAr ? "تعديل باقة" : "Edit Plan") : isAr ? "إضافة باقة جديدة" : "Create New Plan"}
      >
        <form onSubmit={savePlan} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "اسم الباقة" : "Plan Name"}
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "السعر (EGP)" : "Price (EGP)"}
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                required
                min="0"
                className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "المدة بالأيام" : "Duration (Days)"}
              </label>
              <input
                type="number"
                min="1"
                value={form.durationDays}
                onChange={(e) => setForm((prev) => ({ ...prev, durationDays: e.target.value }))}
                required
                className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-slate-900"
              />
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none dark:bg-slate-700"></div>
                <span className="ml-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                  {isAr ? "مفعلة" : "Is Active"}
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "الحدود" : "Plan Limits"}
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { key: "maxDoctors", label: isAr ? "حد الدكاترة" : "Doctor Limit", placeholder: isAr ? "مثال: 5" : "e.g. 5" },
                { key: "maxPatients", label: isAr ? "حد المرضى" : "Patient Limit", placeholder: isAr ? "مثال: 500" : "e.g. 500" },
                { key: "maxBookings", label: isAr ? "حد الحجوزات" : "Booking Limit", placeholder: isAr ? "اتركه فارغًا لغير محدود" : "Leave blank for unlimited" },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[item.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    placeholder={item.placeholder}
                    className="w-full rounded-2xl border border-outline bg-slate-50 px-5 py-4 font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 border-t border-outline pt-6 dark:border-white/10">
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              className="flex-1 rounded-2xl bg-slate-100 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:bg-white/5"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/30 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isAr ? "حفظ التغييرات" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SaaSManagementPage;
