import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarClock,
  Clock3,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  BadgeCheck,
  Users,
  UserRound,
  CalendarRange,
} from "lucide-react";
import { clinicService, clinicSubscriptionService, planService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const statusMeta = {
  Active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: <BadgeCheck className="w-4 h-4" />,
  },
  Trial: {
    label: "Trial",
    className: "bg-blue-50 text-blue-700 border-blue-100",
    icon: <Sparkles className="w-4 h-4" />,
  },
  Expired: {
    label: "Expired",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  PendingPayment: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: <Clock3 className="w-4 h-4" />,
  },
  Inactive: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
};

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Clinic", lastName: "Admin" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const SubscriptionStatusCard = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [subscriptionRes, clinicsRes] = await Promise.all([
          clinicSubscriptionService.getMy(),
          clinicService.getAll(),
        ]);

        setSubscription(subscriptionRes.data);
        const tenantId = user?.tenantId || localStorage.getItem("clinicflow_tenantId");
        const currentClinic = (clinicsRes.data || []).find((item) => String(item.id) === String(tenantId));
        setClinic(currentClinic || null);

        if (subscriptionRes.data?.planId) {
          try {
            const planRes = await planService.getById(subscriptionRes.data.planId);
            setPlan(planRes.data || null);
          } catch {
            setPlan(null);
          }
        }
      } catch (err) {
        console.error("Failed to load subscription card", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.tenantId || localStorage.getItem("clinicflow_tenantId")) {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.tenantId]);

  const daysRemaining = subscription?.daysRemaining ?? 0;
  const totalDays = useMemo(() => {
    if (!subscription?.startDate || !subscription?.expiresAt) return 30;
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.expiresAt).getTime();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  }, [subscription?.startDate, subscription?.expiresAt]);

  const progress = useMemo(() => {
    if (!subscription?.startDate || !subscription?.expiresAt) return 0;
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.expiresAt).getTime();
    const now = Date.now();
    const total = Math.max(1, end - start);
    const elapsed = Math.min(total, Math.max(0, now - start));
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }, [subscription?.startDate, subscription?.expiresAt]);

  const startRenewal = async () => {
    if (!subscription || !clinic) {
      toast.error(isAr ? "تعذر تحميل بيانات الاشتراك." : "Subscription data is not ready.");
      return;
    }

    setRenewing(true);
    const tid = toast.loading(isAr ? "جارٍ تجهيز التجديد..." : "Preparing renewal...");
    try {
      const { firstName, lastName } = splitName(user?.fullName || user?.name || clinic?.doctorName || clinic?.name || "Clinic Admin");
      const response = await clinicSubscriptionService.initiatePayment({
        clinicId: clinic.id,
        planId: subscription.planId,
        firstName,
        lastName,
        email: user?.email || "",
        phone: user?.phoneNumber || clinic?.phoneNumber || "",
        successUrl: `${window.location.origin}/dashboard?renewal=success`,
        failUrl: `${window.location.origin}/dashboard?renewal=failed`,
      });

      toast.success(isAr ? "سيتم تحويلك الآن لبوابة الدفع." : "Redirecting to the payment gateway.", { id: tid });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? "فشل بدء التجديد." : "Failed to start renewal."), { id: tid });
    } finally {
      setRenewing(false);
    }
  };

  const meta = statusMeta[subscription?.status] || statusMeta.Inactive;
  const expiringSoon = subscription?.isExpiringSoon || false;

  if (loading) {
    return (
      <div className="card-premium p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-36 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-3 w-56 rounded-full bg-slate-100 animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
        <div className="mt-6 h-28 rounded-[1.5rem] bg-slate-50 animate-pulse" />
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  return (
    <div className="card-premium relative overflow-hidden p-5 sm:p-7">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl" />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              {isAr ? "إدارة الاشتراك" : "Subscription"}
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-on-surface font-headline">
              {subscription.planName}
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              {clinic?.name || (isAr ? "العيادة الحالية" : "Current clinic")}
            </p>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${meta.className}`}>
            {meta.icon}
            {meta.label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <div className="rounded-[1.75rem] border border-outline bg-surface-alt p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                {isAr ? "المدة المتبقية" : "Time remaining"}
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <CalendarClock className="w-4 h-4" />
                {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString(lang) : "-"}
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${expiringSoon ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-black tracking-tight text-on-surface">
                  {Math.max(0, daysRemaining)}
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  {isAr ? "يوم متبقي" : "days remaining"}
                </p>
              </div>

              <div className="text-right rtl:text-left">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {isAr ? "المبلغ المدفوع" : "Paid"}
                </p>
                <p className="text-2xl font-black text-on-surface">
                  {subscription.paidAmount} <span className="text-xs text-slate-400">EGP</span>
                </p>
              </div>
            </div>

            {expiringSoon && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {isAr ? "تنبيه: الاشتراك يقترب من الانتهاء." : "Heads up: your subscription is expiring soon."}
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-outline bg-surface p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-3">
              {isAr ? "الحدود" : "Plan limits"}
            </p>
            <div className="space-y-2 max-h-[170px] overflow-auto pr-1">
              {plan ? (
                [
                  { label: isAr ? "الدكاترة" : "Doctors", value: plan.maxDoctors, icon: <Users className="w-4 h-4" /> },
                  { label: isAr ? "المرضى" : "Patients", value: plan.maxPatients, icon: <UserRound className="w-4 h-4" /> },
                  { label: isAr ? "الحجوزات" : "Bookings", value: plan.maxBookings, icon: <CalendarRange className="w-4 h-4" /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="mt-0.5 h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-on-surface">{item.label}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.value == null ? (isAr ? "غير محدود" : "Unlimited") : item.value}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 font-medium">
                  {isAr ? "لم يتم تحميل حدود الباقة بعد." : "No plan limits found yet."}
                </div>
              )}
            </div>

            <button
              onClick={startRenewal}
              disabled={renewing}
              className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              {isAr ? "تجديد الاشتراك" : "Renew subscription"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard;
