import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { authService, clinicService, API_BASE_URL, clinicSubscriptionService, planService } from "../services/api";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import {
  User,
  Settings as SettingsIcon,
  Building2,
  Globe,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  UserPlus,
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  RefreshCw,
  CreditCard,
  Zap,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Star,
  ChevronRight,
  XCircle,
} from "lucide-react";

/* ─── tiny helpers ─── */
const ProgressBar = ({ value, max, color = "bg-primary" }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const StatusBadge = ({ status, isAr }) => {
  const map = {
    Active:   { label: isAr ? "نشط" : "Active",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" },
    Expired:  { label: isAr ? "منتهى" : "Expired", cls: "bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:border-red-800" },
    Trial:    { label: isAr ? "تجريبي" : "Trial",   cls: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" },
    Pending:  { label: isAr ? "معلق" : "Pending",  cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700" },
  };
  const cfg = map[status] || map["Pending"];
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

const SettingsPage = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const isAr = lang === "ar";

  const [clinics, setClinics]       = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);

  /* ── subscription state ── */
  const [sub, setSub]               = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [plans, setPlans]           = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen]   = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [upgrading, setUpgrading]       = useState(false);

  /* ── load clinics (super-admin) ── */
  useEffect(() => {
    const loadClinics = async () => {
      if (!isSuperAdmin) return;
      setClinicsLoading(true);
      try {
        const res = await clinicService.getAll();
        const clinicList = res.data || [];
        setClinics(clinicList);
      } catch {
        toast.error(isAr ? "تعذر تحميل قائمة العيادات." : "Failed to load clinics.");
      } finally { setClinicsLoading(false); }
    };
    loadClinics();
  }, [isSuperAdmin, isAr]);

  /* ── load subscription ── */
  const loadSub = async () => {
    if (!isAdmin && !isSuperAdmin) { setSubLoading(false); return; }
    setSubLoading(true);
    try {
      const res = await clinicSubscriptionService.getMy();
      setSub(res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error(isAr ? "تعذر تحميل بيانات الاشتراك." : "Failed to load subscription.");
      }
      setSub(null);
    } finally { setSubLoading(false); }
  };
  useEffect(() => { loadSub(); }, [isAdmin, isSuperAdmin]);

  /* ── load plans for upgrade ── */
  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await planService.getAll({ isActive: true });
      setPlans(res.data || []);
    } catch { toast.error(isAr ? "تعذر تحميل الباقات." : "Failed to load plans."); }
    finally { setPlansLoading(false); }
  };

  const openUpgrade = () => {
    setUpgradeOpen(true);
    if (plans.length === 0) loadPlans();
  };

  /* ── upgrade / change plan ── */
  const handleUpgrade = async () => {
    if (!selectedPlanId) return;
    setUpgrading(true);
    const tid = toast.loading(isAr ? "جاري معالجة الاشتراك..." : "Processing subscription...");
    try {
      const names = (user?.fullName || "Clinic Admin").split(" ");
      const firstName = names[0] || "Admin";
      const lastName = names.slice(1).join(" ") || "User";

      const activeClinicId = sub?.clinicId || user?.tenantId || localStorage.getItem("clinicflow_tenantId");

      const payload = {
        clinicId: activeClinicId,
        planId: selectedPlanId,
        firstName: firstName,
        lastName: lastName,
        email: user?.email || "admin@royalclinic.com",
        phone: "01000000000", // Fawaterak validation might require a valid standard format
        successUrl: `${window.location.origin}/settings?sub=success`,
        failUrl:    `${window.location.origin}/settings?sub=fail`
      };

      if (!payload.clinicId || payload.clinicId.trim() === "") {
        toast.error(isAr ? "يرجى تحديد العيادة أولاً" : "Please select a clinic first.", { id: tid });
        setUpgrading(false);
        return;
      }
      if (!payload.planId || payload.planId.trim() === "") {
        toast.error(isAr ? "الباقة المحددة غير صالحة" : "Invalid plan selected.", { id: tid });
        setUpgrading(false);
        return;
      }

      console.log("Initiating payment with payload:", payload);
      const res = await clinicSubscriptionService.initiatePayment(payload);
      toast.dismiss(tid);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        setUpgradeOpen(false); // Close the drawer
        toast.success(isAr ? "تم فتح صفحة الدفع في نافذة جديدة" : "Payment page opened in a new tab.");
      } else {
        toast.success(isAr ? "تم تحديث الاشتراك!" : "Subscription updated!");
        setUpgradeOpen(false);
        loadSub();
      }
    } catch (err) {
      console.error("Payment initiation failed:", err.response?.data || err.message);
      let errMsg = isAr ? "فشل تحديث الاشتراك." : "Failed to update subscription.";
      
      if (err.response?.data) {
          const data = err.response.data;
          if (typeof data === 'string') errMsg = data;
          else if (data.detail) errMsg = data.detail;
          else if (data.message) errMsg = data.message;
          else if (data.errors) {
              const errKeys = Object.keys(data.errors);
              if (errKeys.length > 0) {
                 errMsg = `${errKeys[0]}: ${data.errors[errKeys[0]][0]}`;
              }
          }
      }
      toast.error(errMsg, { id: tid, duration: 6000 });
    } finally { setUpgrading(false); }
  };

  return (
    <Layout title={t('settings')}>
      <div className="max-w-2xl mx-auto space-y-10 pb-24" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Expiry Warning Banner */}
        {sub?.isExpiringSoon && sub?.status !== 2 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center sm:text-left rtl:sm:text-right">
              <h3 className="font-bold text-amber-900 dark:text-amber-100">
                {isAr ? "اشتراكك ينتهي قريباً!" : "Your subscription is expiring soon!"}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {isAr 
                  ? `بقي ${sub.daysRemaining} أيام فقط. قم بالتجديد الآن لتجنب انقطاع الخدمة.`
                  : `Only ${sub.daysRemaining} days remaining. Renew now to avoid any service interruption.`}
              </p>
            </div>
            <button 
              onClick={openUpgrade}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-600/20 hover:shadow-amber-600/40 shrink-0"
            >
              {isAr ? "تجديد الآن" : "Renew Now"}
            </button>
          </div>
        )}

        {/* Hero header */}
        <div className="bg-surface border border-outline p-6 sm:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-headline">{t('settings')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{isAr ? "إدارة حسابك وتفضيلات العيادة." : "Manage your account and clinic preferences."}</p>
          </div>
        </div>

        {/* Subscription section */}
        {(isAdmin || isSuperAdmin) && (
          <div className="bg-surface rounded-[2.5rem] border border-outline p-6 sm:p-10 space-y-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h2 className="font-headline font-black text-slate-900 dark:text-white text-2xl">
                    {isAr ? "اشتراكي" : "My Subscription"}
                  </h2>
                  <button onClick={loadSub} disabled={subLoading} className="p-2 hover:bg-surface-alt rounded-lg transition-colors text-slate-400 hover:text-primary">
                    <RefreshCw className={`w-4 h-4 ${subLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {!sub && !subLoading ? (
                   <p className="text-slate-400 text-sm font-medium">{isAr ? "لا يوجد بيانات اشتراك حالية." : "No active subscription data found."}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                      {isAr ? "الباقة الحالية" : "Current Plan"}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {sub?.planName || "—"}
                      </span>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm ${
                        sub?.status === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                        sub?.status === 2 ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                        'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800'
                      }`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          sub?.status === 1 ? 'bg-emerald-500' :
                          sub?.status === 2 ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        {sub?.status === 1 ? (isAr ? "نشط" : "Active") :
                         sub?.status === 2 ? (isAr ? "تجريبي" : "Trial") : (isAr ? "منتهي" : "Expired")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={openUpgrade}
                className="group relative px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 overflow-hidden"
              >
                <ArrowUpRight className="w-4 h-4" />
                {isAr ? "تحديث / ترقية الباقة" : "Upgrade / Change Plan"}
              </button>
            </div>

            {sub && (
              <div className="relative z-10 space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: <Calendar className="w-5 h-5" />,
                      label: isAr ? "تاريخ الانتهاء" : "Expiry Date",
                      value: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString(isAr ? "ar-EG" : "en-GB") : "—",
                    },
                    {
                      icon: <Clock className="w-5 h-5" />,
                      label: isAr ? "الأيام المتبقية" : "Days Left",
                      value: sub.daysRemaining ?? "—",
                      highlight: sub.isExpiringSoon,
                    },
                    {
                      icon: <CreditCard className="w-5 h-5" />,
                      label: isAr ? "التكلفة" : "Amount",
                      value: sub.paidAmount != null ? `${sub.paidAmount} EGP` : "—",
                    },
                  ].map((item) => (
                    <div key={item.label} className={`bg-surface-alt border rounded-2xl p-5 flex flex-col items-start gap-2 shadow-sm transition-all hover:border-primary/30 ${item.highlight ? "border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800" : "border-outline"}`}>
                      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${item.highlight ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                        {item.icon} <span className="mt-0.5">{item.label}</span>
                      </div>
                      <div className={`text-xl font-black ${item.highlight ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-white"}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6 pt-2 border-t border-outline">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                      {isAr ? "حدود الاستخدام" : "Plan Usage & Limits"}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sub.features?.filter(f => f.isEnabled && f.limitValue > 0).map(feature => {
                      const usage = feature.currentUsage || 0;
                      const limit = feature.limitValue;
                      const percent = Math.min(100, (usage / limit) * 100);
                      const isNearLimit = percent > 85;

                      return (
                        <div key={feature.code} className="space-y-3">
                          <div className="flex justify-between items-end">
                            <div className="space-y-1">
                              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                {isAr ? feature.nameAr : feature.name}
                              </p>
                              <p className="text-xs font-bold text-slate-400">
                                {isAr ? `المستخدم حالياً: ${usage} من أصل ${limit}` : `Current usage: ${usage} of ${limit}`}
                              </p>
                            </div>
                            <span className={`text-xs font-black p-1.5 rounded-lg border ${
                              isNearLimit 
                                ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800' 
                                : 'text-primary bg-primary/5 border-primary/20'
                            }`}>
                              {Math.round(percent)}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-surface-alt border border-outline rounded-full overflow-hidden shadow-inner p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                                isNearLimit ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-primary/80 to-primary'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Drawer */}
        {upgradeOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setUpgradeOpen(false)} />
             <div className="relative w-full max-w-lg bg-surface border border-outline rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-10 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-500 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline font-black text-2xl text-slate-900 dark:text-white">{isAr ? "اختر باقة" : "Select a Plan"}</h3>
                  <button onClick={() => setUpgradeOpen(false)} className="p-3 hover:bg-surface-alt rounded-2xl transition-colors text-slate-400"><XCircle className="w-6 h-6" /></button>
                </div>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {plansLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-300">{isAr ? "جاري تحميل الباقات..." : "Loading Plans..."}</p>
                    </div>
                  ) : plans.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`group relative p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                        selectedPlanId === p.id 
                        ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' 
                        : 'border-outline hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedPlanId === p.id ? 'bg-primary text-white' : 'bg-surface-alt text-slate-400 group-hover:text-primary transition-colors'}`}>
                            {selectedPlanId === p.id ? <ShieldCheck className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full border-2 border-current" />}
                          </div>
                          <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{p.price} EGP</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>


                {/* Upgrade button */}
                <div className="pt-2">
                  <button
                    onClick={openUpgrade}
                    className="w-full py-4 border-2 border-primary text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 group"
                  >
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    {isAr ? "تحديث / ترقية الباقة" : "Upgrade / Change Plan"}
                  </button>
                </div>
              </div>
            )}

            {/* ── UPGRADE DRAWER ── */}
            {upgradeOpen && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
                <div className="bg-surface w-full max-w-lg rounded-[2rem] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {isAr ? "اختر باقة" : "Select a Plan"}
                    </h3>
                    <button onClick={() => setUpgradeOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {plansLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : plans.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">{isAr ? "لا توجد باقات متاحة." : "No plans available."}</p>
                  ) : (
                    <div className="space-y-3">
                      {plans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        const isCurrent  = sub?.planId === plan.id || sub?.plan?.id === plan.id;
                        return (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`w-full text-left rtl:text-right p-4 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 dark:bg-primary/10"
                                : "border-outline hover:border-primary/40 bg-surface-alt"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 dark:text-white">{plan.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-full dark:bg-emerald-900/20 dark:border-emerald-800">
                                      {isAr ? "الحالية" : "Current"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {[
                                    plan.maxDoctors  != null ? `${plan.maxDoctors} ${isAr ? "أطباء" : "doctors"}` : null,
                                    plan.maxPatients != null ? `${plan.maxPatients} ${isAr ? "مرضى" : "patients"}` : null,
                                    plan.maxBookings != null ? `${plan.maxBookings} ${isAr ? "حجوزات" : "bookings"}` : null,
                                  ].filter(Boolean).join(" · ") || (isAr ? "غير محدود" : "Unlimited")}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-lg font-black text-primary">{plan.price == 0 || plan.price === "0" ? (isAr ? "مجاني" : "Free") : `${plan.price} EGP`}</div>
                                <div className="text-[10px] text-slate-400">{plan.durationDays} {isAr ? "يوم" : "days"}</div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-primary bg-primary" : "border-slate-300"}`}>
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setUpgradeOpen(false)} className="py-4 border border-outline rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-surface-alt transition-all">
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      onClick={handleUpgrade}
                      disabled={!selectedPlanId || upgrading}
                      className="py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      {isAr ? "تأكيد الاشتراك" : "Confirm & Pay"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        <div className="bg-surface rounded-[2rem] border border-outline p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-black text-slate-800 dark:text-white text-lg flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-primary border border-blue-100 dark:border-blue-800 shadow-sm">
                <User className="w-5 h-5" />
              </div>
              {isAr ? "ملف الحساب" : "Account Profile"}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-surface-alt rounded-2xl border border-outline shadow-inner">
            <div className="w-20 h-20 rounded-full bg-surface border-4 border-surface flex items-center justify-center text-slate-300 shadow-xl overflow-hidden shrink-0">
              <User className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left rtl:sm:text-right">
              <p className="font-black text-slate-900 dark:text-white text-xl sm:text-2xl truncate">{user?.fullName || "—"}</p>
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1 font-medium truncate">
                <Mail className="w-4 h-4 opacity-50" />{user?.email}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center gap-2 border border-blue-100 dark:border-blue-800 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user?.role === 2 || user?.role === "2" || user?.role === "Admin" ? (isAr ? "مسؤول" : "Admin") : user?.role === 4 || user?.role === "4" || user?.role === "Doctor" ? (isAr ? "طبيب" : "Doctor") : (isAr ? "مريض" : "Patient")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend config */}
        <div className="bg-surface rounded-[2rem] border border-outline p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="font-headline font-black text-slate-800 dark:text-white text-lg flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-alt rounded-xl flex items-center justify-center text-slate-400 border border-outline shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            {isAr ? "إعدادات النظام" : "System Configuration"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {isAr ? "عنوان API المستخدم حالياً في هذا الاتصال:" : "Current Backend API URL used for this connection:"}
          </p>
          <div className="p-5 rounded-2xl bg-slate-900 font-mono text-xs sm:text-sm text-emerald-400 border border-slate-800 shadow-2xl break-all">
            {API_BASE_URL}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;

