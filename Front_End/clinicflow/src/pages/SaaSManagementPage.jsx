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
  Activity,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
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

const formatLimit = (value, isAr) =>
  value == null ? (isAr ? "غير محدود" : "Unlimited") : value;

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
  const [clinicModalOpen, setClinicModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingClinic, setEditingClinic] = useState(null);
  const [form, setForm] = useState(emptyPlanForm);
  const [clinicForm, setClinicForm] = useState({
    name: "",
    subdomain: "",
    address: "",
    phoneNumber: "",
    isActive: true,
  });

  const statusMeta = {
    Active: {
      label: isAr ? "نشط" : "Active",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: <CheckCircle2 className="h-3 w-3" />,
      dot: "bg-emerald-400",
    },
    Trial: {
      label: isAr ? "تجريبي" : "Trial",
      className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: <Clock className="h-3 w-3" />,
      dot: "bg-blue-400",
    },
    Expired: {
      label: isAr ? "منتهي" : "Expired",
      className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      icon: <XCircle className="h-3 w-3" />,
      dot: "bg-rose-400",
    },
    PendingPayment: {
      label: isAr ? "بانتظار الدفع" : "Pending",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: <AlertCircle className="h-3 w-3" />,
      dot: "bg-amber-400",
    },
    Inactive: {
      label: isAr ? "غير نشط" : "Inactive",
      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      icon: <XCircle className="h-3 w-3" />,
      dot: "bg-slate-400",
    },
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, clinicsRes] = await Promise.all([
        planService.getAll(),
        clinicService.getAll(),
      ]);
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
    const stats = {
      Total: clinics.length,
      Active: 0,
      Trial: 0,
      Expired: 0,
      PendingPayment: 0,
      Inactive: 0,
    };
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
    if (
      !window.confirm(
        isAr ? "هل تريد حذف هذه الباقة؟" : "Are you sure you want to delete this plan?"
      )
    )
      return;
    try {
      await planService.delete(id);
      toast.success(isAr ? "تم الحذف." : "Deleted successfully.");
      await fetchData();
    } catch {
      toast.error(isAr ? "فشل الحذف." : "Delete failed.");
    }
  };

  const openClinicModal = (clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name || "",
      subdomain: clinic.subdomain || "",
      address: clinic.address || "",
      phoneNumber: clinic.phoneNumber || "",
      isActive: !!clinic.isActive,
    });
    setClinicModalOpen(true);
  };

  const saveClinic = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const toastId = toast.loading(isAr ? "جارٍ الحفظ..." : "Saving clinic...");
    try {
      await clinicService.update(editingClinic.id, {
        ...editingClinic,
        name: clinicForm.name.trim(),
        subdomain: clinicForm.subdomain.trim(),
        address: clinicForm.address.trim(),
        phoneNumber: clinicForm.phoneNumber.trim(),
        isActive: clinicForm.isActive,
      });
      toast.success(isAr ? "تم تحديث بيانات العيادة." : "Clinic updated successfully.", {
        id: toastId,
      });
      setClinicModalOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(isAr ? "فشل تحديث البيانات." : "Failed to update clinic.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClinic = async (id) => {
    if (
      !window.confirm(
        isAr
          ? "هل أنت متأكد من حذف هذه العيادة؟ لا يمكن التراجع عن هذا الإجراء."
          : "Are you sure you want to delete this clinic? This action cannot be undone."
      )
    )
      return;
    const toastId = toast.loading(isAr ? "جاري الحذف..." : "Deleting...");
    try {
      await clinicService.delete(id);
      toast.success(isAr ? "تم حذف العيادة." : "Clinic deleted successfully.", { id: toastId });
      await fetchData();
    } catch {
      toast.error(isAr ? "فشل الحذف." : "Delete failed.", { id: toastId });
    }
  };

  const toggleClinicActive = async (clinic) => {
    const action = clinic.isActive
      ? isAr
        ? "إلغاء تنشيط"
        : "deactivate"
      : isAr
      ? "تنشيط"
      : "activate";
    if (
      !window.confirm(
        isAr
          ? `هل تريد ${action} هذه العيادة؟`
          : `Are you sure you want to ${action} this clinic?`
      )
    )
      return;
    const toastId = toast.loading(isAr ? "جاري التحديث..." : "Updating...");
    try {
      await clinicService.update(clinic.id, { ...clinic, isActive: !clinic.isActive });
      toast.success(isAr ? "تم التحديث." : "Updated successfully.", { id: toastId });
      await fetchData();
    } catch {
      toast.error(isAr ? "فشل التحديث." : "Update failed.", { id: toastId });
    }
  };

  // ─── Shared input class ────────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3.5 text-sm font-medium text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-primary/70 focus:ring-2 focus:ring-primary/20 focus:bg-slate-800";

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white">
            {isAr ? "جاري التحميل..." : "Loading dashboard..."}
          </p>
          <p className="text-xs text-slate-500">
            {isAr ? "يرجى الانتظار" : "Please wait a moment"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen space-y-8 p-4 sm:p-6 lg:p-10"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ═══ HERO HEADER ══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10 shadow-2xl ring-1 ring-white/10">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="space-y-5 max-w-2xl">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 backdrop-blur-sm ring-1 ring-white/10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {isAr ? "لوحة التحكم — مباشر" : "SaaS Admin Panel — Live"}
            </div>

            {/* Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl" />
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-400 shadow-2xl shadow-primary/40">
                  <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
                  {isAr ? "إدارة المنصة" : "Platform"}
                </h1>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-primary via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  {isAr ? "SaaS" : "Management"}
                </h1>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg">
              {isAr
                ? "إدارة متقدمة للباقات والعيادات. راقب النمو وصمم تجربة المستخدم بفاعلية تامة."
                : "Advanced oversight for plans and clinics. Monitor growth and shape user experience effortlessly."}
            </p>

            {/* Quick stats strip */}
            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { label: isAr ? "باقات" : "Plans", value: plans.length, color: "text-blue-400" },
                { label: isAr ? "عيادات" : "Clinics", value: clinics.length, color: "text-emerald-400" },
                {
                  label: isAr ? "نشطة" : "Active",
                  value: clinicStats.Active,
                  color: "text-primary",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 ring-1 ring-white/10">
                  <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
                  <span className="text-xs font-semibold text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => (activeTab === "plans" ? openPlanModal() : fetchData())}
            className="group relative w-full md:w-auto flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-400 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-primary/40 transition-all duration-300 hover:shadow-primary/60 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
            {activeTab === "plans" ? (
              <Plus className="relative h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
            ) : (
              <RefreshCw className="relative h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
            )}
            <span className="relative">
              {activeTab === "plans"
                ? isAr
                  ? "إضافة باقة"
                  : "Create Plan"
                : isAr
                ? "تحديث"
                : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* ═══ TAB SWITCHER ═════════════════════════════════════════════════════ */}
      <div className="flex w-full sm:w-fit gap-1 rounded-2xl bg-slate-900/80 p-1.5 ring-1 ring-white/10 backdrop-blur-xl mx-auto md:mx-0 overflow-x-auto">
        {[
          {
            key: "plans",
            label: isAr ? "الباقات" : "Plans",
            icon: <CreditCard className="h-4 w-4 shrink-0" />,
            count: plans.length,
          },
          {
            key: "clinics",
            label: isAr ? "العيادات" : "Clinics",
            icon: <Building2 className="h-4 w-4 shrink-0" />,
            count: clinics.length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex flex-1 sm:flex-none items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.key
                ? "bg-gradient-to-r from-primary to-blue-400 text-white shadow-lg shadow-primary/30"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                activeTab === tab.key
                  ? "bg-white/20 text-white"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ═══ PLANS TAB ════════════════════════════════════════════════════════ */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, idx) => {
            // Cycle accent colors per card
            const accents = [
              { from: "from-primary", to: "to-blue-400", glow: "shadow-primary/30", ring: "group-hover:ring-primary/40", text: "text-blue-400" },
              { from: "from-emerald-500", to: "to-teal-400", glow: "shadow-emerald-500/30", ring: "group-hover:ring-emerald-500/40", text: "text-emerald-400" },
              { from: "from-violet-500", to: "to-purple-400", glow: "shadow-violet-500/30", ring: "group-hover:ring-violet-500/40", text: "text-violet-400" },
            ];
            const accent = accents[idx % accents.length];

            return (
              <div
                key={plan.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 p-6 sm:p-8 ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-2 hover:ring-2 ${accent.ring} hover:shadow-2xl ${accent.glow}`}
              >
                {/* Top glow orb */}
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25`}
                />

                {/* Inactive badge */}
                {!plan.isActive && (
                  <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-400 ring-1 ring-rose-500/20">
                    <XCircle className="h-3 w-3" />
                    {isAr ? "غير نشطة" : "Inactive"}
                  </div>
                )}

                {/* Plan header */}
                <div className="relative z-10 mb-6 mt-2">
                  <div
                    className={`mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${accent.from} ${accent.to} bg-opacity-10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-white/60`}
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${accent.from} ${accent.to}`}
                    />
                    {isAr ? "خطة الاشتراك" : "Subscription Plan"}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                    {plan.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="relative z-10 mb-8 flex items-end gap-3">
                  <span
                    className={`text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-br ${accent.from} ${accent.to} bg-clip-text text-transparent`}
                  >
                    {plan.price}
                  </span>
                  <div className="pb-2 space-y-0.5">
                    <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                      EGP
                    </span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                      / {plan.durationDays} {isAr ? "يوم" : "Days"}
                    </span>
                  </div>
                </div>

                {/* Limits */}
                <div className="relative z-10 flex-1 space-y-3 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {isAr ? "حدود الباقة" : "Limits"}
                    </span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  {[
                    {
                      label: isAr ? "دكاترة" : "Doctors",
                      value: plan.maxDoctors,
                      icon: <Users className="h-4 w-4" />,
                    },
                    {
                      label: isAr ? "مرضى" : "Patients",
                      value: plan.maxPatients,
                      icon: <UserRound className="h-4 w-4" />,
                    },
                    {
                      label: isAr ? "حجوزات" : "Bookings",
                      value: plan.maxBookings,
                      icon: <CalendarRange className="h-4 w-4" />,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10 ring-1 ring-white/5"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent.from} ${accent.to} text-white shadow-lg`}
                      >
                        {item.icon}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-slate-300">
                        {item.label}
                      </span>
                      <span
                        className={`text-sm font-black ${
                          item.value == null ? "text-slate-500 italic" : "text-white"
                        }`}
                      >
                        {formatLimit(item.value, isAr)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="relative z-10 flex items-center gap-3 pt-6 border-t border-white/10">
                  <button
                    onClick={() => openPlanModal(plan)}
                    className={`group/btn flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r ${accent.from} ${accent.to} py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98]`}
                  >
                    <Edit2 className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                    {isAr ? "تعديل" : "Edit Plan"}
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 transition-all hover:bg-rose-500 hover:text-white hover:ring-0 hover:shadow-lg hover:shadow-rose-500/30 active:scale-[0.95]"
                    title={isAr ? "حذف" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CLINICS TAB ══════════════════════════════════════════════════════ */}
      {activeTab === "clinics" && (
        <div className="space-y-8 sm:space-y-10">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {[
              {
                key: "Total",
                label: isAr ? "الإجمالي" : "Total",
                gradient: "from-blue-600 to-indigo-500",
                icon: <Building2 className="h-5 w-5" />,
              },
              {
                key: "Active",
                label: isAr ? "نشطة" : "Active",
                gradient: "from-emerald-500 to-teal-400",
                icon: <CheckCircle2 className="h-5 w-5" />,
              },
              {
                key: "Trial",
                label: isAr ? "تجريبية" : "Trial",
                gradient: "from-amber-500 to-orange-400",
                icon: <Clock className="h-5 w-5" />,
              },
              {
                key: "PendingPayment",
                label: isAr ? "انتظار" : "Pending",
                gradient: "from-violet-500 to-purple-400",
                icon: <AlertCircle className="h-5 w-5" />,
              },
              {
                key: "Expired",
                label: isAr ? "منتهية" : "Expired",
                gradient: "from-rose-500 to-red-400",
                icon: <XCircle className="h-5 w-5" />,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="group relative overflow-hidden rounded-2xl bg-slate-900 p-5 ring-1 ring-white/10 hover:ring-white/20 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Glow bg */}
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${item.gradient} opacity-15 blur-2xl transition-opacity group-hover:opacity-30`}
                />

                <div className="relative flex items-start justify-between mb-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-lg`}
                  >
                    {item.icon}
                  </div>
                </div>

                <p
                  className={`text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-br ${item.gradient} bg-clip-text text-transparent`}
                >
                  {clinicStats[item.key] || 0}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          {/* Clinic Cards */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
            {clinics.map((clinic) => {
              const subscription = subscriptionsByClinic[clinic.id];
              const meta = statusMeta[subscription?.status] || statusMeta.Inactive;

              return (
                <div
                  key={clinic.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 p-6 sm:p-8 ring-1 ring-white/10 transition-all duration-500 hover:-translate-y-1 hover:ring-white/20 hover:shadow-2xl hover:shadow-black/40"
                >
                  {/* Top accent stripe */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Background orb */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Header */}
                  <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-6">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-white/10 shadow-xl flex items-center justify-center">
                        {clinic.logoUrl ? (
                          <img
                            src={clinic.logoUrl}
                            alt={clinic.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-slate-400" />
                        )}
                        {/* Active indicator dot */}
                        {clinic.isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                        )}
                      </div>

                      <div>
                        <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary ring-1 ring-primary/20">
                          {clinic.subdomain || (isAr ? "بدون نطاق" : "No subdomain")}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                          {clinic.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                          {clinic.address || (isAr ? "لا يوجد عنوان" : "No address")}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${meta.className}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </div>
                  </div>

                  {/* Data grid */}
                  <div className="relative grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/5 transition-colors group-hover:bg-white/8">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <Shield className="h-3 w-3 text-primary" />
                        {isAr ? "الباقة" : "Plan"}
                      </p>
                      <p className="text-base font-black text-white truncate">
                        {subscription?.planName || (isAr ? "غير محدد" : "None")}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/5 transition-colors group-hover:bg-white/8">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <CreditCard className="h-3 w-3 text-emerald-400" />
                        {isAr ? "المدفوع" : "Paid"}
                      </p>
                      <p className="text-base font-black text-emerald-400">
                        {subscription?.paidAmount ?? 0}{" "}
                        <span className="text-xs font-bold text-slate-500">EGP</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-white/10">
                    {/* Payment ref */}
                    <span className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 ring-1 ring-white/5">
                      <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
                      {subscription?.paymentRef || "—————"}
                    </span>

                    {/* Expiry */}
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-rose-400" />
                      {subscription?.expiresAt
                        ? new Date(subscription.expiresAt).toLocaleDateString()
                        : "---"}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openClinicModal(clinic)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 ring-1 ring-white/10 transition-all hover:bg-primary hover:text-white hover:ring-0 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.95]"
                        title={isAr ? "تعديل" : "Edit"}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleClinicActive(clinic)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-all active:scale-[0.95] ${
                          clinic.isActive
                            ? "bg-rose-500/10 text-rose-400 ring-rose-500/20 hover:bg-rose-500 hover:text-white hover:ring-0 hover:shadow-lg hover:shadow-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:ring-0 hover:shadow-lg hover:shadow-emerald-500/30"
                        }`}
                        title={
                          clinic.isActive
                            ? isAr
                              ? "إلغاء تنشيط"
                              : "Deactivate"
                            : isAr
                            ? "تنشيط"
                            : "Activate"
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteClinic(clinic.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 transition-all hover:bg-rose-500 hover:text-white hover:ring-0 hover:shadow-lg hover:shadow-rose-500/30 active:scale-[0.95]"
                        title={isAr ? "حذف" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ PLAN MODAL ═══════════════════════════════════════════════════════ */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={
          editingPlan
            ? isAr
              ? "تعديل باقة"
              : "Edit Plan"
            : isAr
            ? "إضافة باقة جديدة"
            : "Create New Plan"
        }
      >
        <form onSubmit={savePlan} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "اسم الباقة" : "Plan Name"}
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                className={inputCls}
                placeholder={isAr ? "مثال: باقة برو" : "e.g. Pro Plan"}
              />
            </div>
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "السعر (EGP)" : "Price (EGP)"}
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                required
                min="0"
                className={inputCls}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAr ? "المدة (أيام)" : "Duration (Days)"}
              </label>
              <input
                type="number"
                min="1"
                value={form.durationDays}
                onChange={(e) => setForm((p) => ({ ...p, durationDays: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-4 pt-7">
              <label className="relative inline-flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
                <span className="text-sm font-bold text-slate-400">
                  {isAr ? "مفعلة" : "Active"}
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "الحدود" : "Limits"}
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { key: "maxDoctors", label: isAr ? "الدكاترة" : "Doctors", ph: "5" },
                { key: "maxPatients", label: isAr ? "المرضى" : "Patients", ph: "500" },
                { key: "maxBookings", label: isAr ? "الحجوزات" : "Bookings", ph: "∞" },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form[item.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [item.key]: e.target.value }))}
                    placeholder={item.ph}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              className="flex-1 rounded-xl bg-slate-800 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-400 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/30 transition-all hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isAr ? "حفظ" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══ CLINIC MODAL ═════════════════════════════════════════════════════ */}
      <Modal
        open={clinicModalOpen}
        onClose={() => setClinicModalOpen(false)}
        title={isAr ? "تعديل بيانات العيادة" : "Edit Clinic Details"}
      >
        <form onSubmit={saveClinic} className="space-y-4">
          {[
            {
              key: "name",
              label: isAr ? "اسم العيادة" : "Clinic Name",
              ph: isAr ? "مثال: عيادة نور" : "e.g. Nour Clinic",
              req: true,
            },
            {
              key: "subdomain",
              label: isAr ? "النطاق الفرعي" : "Subdomain",
              ph: "my-clinic",
              req: false,
            },
            {
              key: "address",
              label: isAr ? "العنوان" : "Address",
              ph: isAr ? "الشارع، المدينة" : "Street, City",
              req: false,
            },
            {
              key: "phoneNumber",
              label: isAr ? "رقم الهاتف" : "Phone",
              ph: "+20...",
              req: false,
            },
          ].map((field) => (
            <div key={field.key} className="space-y-2">
              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {field.label}
              </label>
              <input
                value={clinicForm[field.key]}
                onChange={(e) =>
                  setClinicForm((p) => ({ ...p, [field.key]: e.target.value }))
                }
                required={field.req}
                placeholder={field.ph}
                className={inputCls}
              />
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={clinicForm.isActive}
                onChange={() => setClinicForm((p) => ({ ...p, isActive: !p.isActive }))}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
              <span className="text-sm font-bold text-slate-400">
                {isAr ? "العيادة نشطة" : "Clinic Active"}
              </span>
            </label>
          </div>

          <div className="flex gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => setClinicModalOpen(false)}
              className="flex-1 rounded-xl bg-slate-800 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-400 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/30 transition-all hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isAr ? "حفظ" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SaaSManagementPage;