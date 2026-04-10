import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Globe, 
  Palette, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
  Check
} from "lucide-react";
import { authService, planService } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

const RegisterClinicPage = () => {
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isAr = lang === "ar";

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);

  const [form, setForm] = useState({
    clinicName: "",
    subdomain: "",
    address: "",
    phone: "",
    primaryColor: "#3b82f6",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    planId: ""
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentStatus = params.get("payment");
    const paymentError = params.get("error");

    if (paymentStatus === "success") {
      setPaymentResult("success");
    } else if (paymentStatus === "pending") {
      setPaymentResult("pending");
    } else if (paymentError === "payment-failed") {
      setPaymentResult("failed");
    } else {
      setPaymentResult(null);
    }

    const fetchPlans = async () => {
      try {
        const res = await planService.getAll({ isActive: true });
        setPlans(res.data);
        
        // Pre-select plan from URL
        const planId = params.get("plan");
        if (planId) {
          setForm(prev => ({ ...prev, planId }));
        } else if (res.data.length > 0) {
          setForm(prev => ({ ...prev, planId: res.data[0].id }));
        }
      } catch (err) {
        toast.error(isAr ? "فشل تحميل باقات الاشتراك." : "Failed to load subscription plans.");
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, [location.search, isAr]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "subdomain") {
      // Clean subdomain: lowercase, no spaces, only hyphens
      const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      setForm({ ...form, [name]: cleaned });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const nextStep = () => {
    if (step === 1 && (!form.clinicName || !form.subdomain || !form.phone)) {
      toast.error(isAr ? "برجاء إكمال بيانات العيادة." : "Please complete clinic details.");
      return;
    }
    if (step === 2 && (!form.adminName || !form.adminEmail || !form.adminPassword)) {
      toast.error(isAr ? "برجاء إكمال بيانات المسئول." : "Please complete admin details.");
      return;
    }
    if (step === 2 && form.adminPassword !== form.confirmPassword) {
      toast.error(isAr ? "كلمات المرور غير متطابقة." : "Passwords do not match.");
      return;
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e, isTrial = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    const tid = toast.loading(isTrial 
      ? (isAr ? "جاري بدء الفترة التجريبية..." : "Starting free trial...") 
      : (isAr ? "جاري إنشاء عيادتك..." : "Creating your clinic...")
    );

    try {
      const payload = {
        ...form,
        isTrial: isTrial,
        successUrl: `${window.location.origin}/register-clinic?payment=success`,
        failUrl: `${window.location.origin}/register-clinic?error=payment-failed`,
        pendingUrl: `${window.location.origin}/register-clinic?payment=pending`
      };
      
      const res = await authService.registerClinic(payload);
      
      if (isTrial && res.data.url === "trial_success") {
        toast.success(isAr ? "تم تفعيل الفترة التجريبية بنجاح!" : "Free trial activated successfully!", { id: tid });
        setPaymentResult("trial_success");
      } else if (res.data.url) {
        toast.success(isAr ? "تم إنشاء الحساب! جاري التحويل للدفع..." : "Account created! Redirecting to payment...", { id: tid });
        window.location.href = res.data.url;
      } else {
        navigate("/login");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || (isAr ? "فشل التسجيل. حاول مرة أخرى." : "Registration failed. Try again.");
      toast.error(msg, { id: tid });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === form.planId);
  const selectedPlanLimits = selectedPlan
    ? [
        { label: isAr ? "الدكاترة" : "Doctors", value: selectedPlan.maxDoctors },
        { label: isAr ? "المرضى" : "Patients", value: selectedPlan.maxPatients },
        { label: isAr ? "الحجوزات" : "Bookings", value: selectedPlan.maxBookings }
      ]
    : [];

  if (paymentResult === "success" || paymentResult === "trial_success") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center px-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-2xl w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">
              {paymentResult === "trial_success" 
                ? (isAr ? "بدأت تجربتك المجانية!" : "Your free trial has started!")
                : (isAr ? "تم استلام الدفع بنجاح" : "Payment received successfully")}
            </h1>
            <p className="text-slate-500 leading-relaxed">
              {paymentResult === "trial_success"
                ? (isAr 
                    ? "لقد قمنا بتنشيط فترة تجريبية لمدة 7 أيام لعيادتك. يمكنك الآن تسجيل الدخول واستكشاف كافة المميزات."
                    : "We've activated a 7-day free trial for your clinic. You can now log in and explore all features.")
                : (isAr
                    ? "جاري تفعيل العيادة الآن. عندما يكتمل تأكيد Fawaterk ستتمكن من تسجيل الدخول واستخدام النظام."
                    : "Your clinic is being activated now. Once Fawaterk confirms the payment, you can log in and start using the system.")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/login" className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200">
              {isAr ? "الذهاب إلى تسجيل الدخول" : "Go to Login"}
            </Link>
            <Link to="/" className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs">
              {isAr ? "العودة للرئيسية" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (paymentResult === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center px-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-2xl w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">{isAr ? "فشل الدفع" : "Payment failed"}</h1>
            <p className="text-slate-500 leading-relaxed">
              {isAr
                ? "لم يكتمل الدفع، لذلك لم يتم تفعيل العيادة بعد. يمكنك المحاولة مرة أخرى من صفحة التسجيل."
                : "The payment did not complete, so the clinic was not activated. You can try again from the registration page."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={() => setPaymentResult(null)} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200">
              {isAr ? "إعادة المحاولة" : "Try Again"}
            </button>
            <Link to="/" className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs">
              {isAr ? "العودة للرئيسية" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (paymentResult === "pending") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center px-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-2xl w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight">{isAr ? "الدفع قيد المراجعة" : "Payment pending"}</h1>
            <p className="text-slate-500 leading-relaxed">
              {isAr
                ? "تم إرسال الدفع بنجاح لكنه ما زال قيد المعالجة. انتظر قليلًا ثم حاول تسجيل الدخول مرة أخرى."
                : "Your payment has been submitted but is still being processed. Wait a moment, then try logging in again."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/login" className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200">
              {isAr ? "الذهاب إلى تسجيل الدخول" : "Go to Login"}
            </Link>
            <button onClick={() => window.location.reload()} className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs">
              {isAr ? "تحديث الصفحة" : "Refresh Page"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="py-4 px-4 md:px-10 border-b bg-white flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Building2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight ml-2">Royal<span className="text-blue-600">Clinic</span></span>
        </Link>
        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-sm font-bold text-slate-400">
          <span className={step >= 1 ? "text-blue-600" : ""}>{isAr ? "١" : "1"} <span className="hidden sm:inline">{isAr ? "العيادة" : "Clinic"}</span></span>
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 opacity-30" />
          <span className={step >= 2 ? "text-blue-600" : ""}>{isAr ? "٢" : "2"} <span className="hidden sm:inline">{isAr ? "المسئول" : "Admin"}</span></span>
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 opacity-30" />
          <span className={step >= 3 ? "text-blue-600" : ""}>{isAr ? "٣" : "3"} <span className="hidden sm:inline">{isAr ? "الدفع" : "Payment"}</span></span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Form Side */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  className="space-y-8"
                >
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{isAr ? "لنبدأ بتجهيز عيادتك" : "Let's setup your clinic"}</h1>
                    <p className="text-slate-500">{isAr ? "أدخل البيانات الأساسية لتعريف عيادتك على المنصة." : "Enter essential info to identify your clinic on the platform."}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "اسم العيادة" : "Clinic Name"}</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          name="clinicName"
                          value={form.clinicName}
                          onChange={handleChange}
                          placeholder={isAr ? "مركز الشفاء الطبي" : "Medical Care Center"}
                          className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "الرابط المخصص (Slug)" : "Subdomain Slug"}</label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          name="subdomain"
                          value={form.subdomain}
                          onChange={handleChange}
                          placeholder="al-hayat"
                          className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">.royalclinic.net</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "لون الهوية" : "Primary Brand Color"}</label>
                    <div className="flex flex-wrap gap-3">
                      {["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#14b8a6"].map(c => (
                        <button 
                          key={c}
                          onClick={() => setForm({...form, primaryColor: c})}
                          className={`w-10 h-10 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${form.primaryColor === c ? 'ring-4 ring-offset-2 ring-blue-100 scale-110' : ''}`}
                          style={{ background: c }}
                        >
                          {form.primaryColor === c && <Check className="w-5 h-5 text-white" />}
                        </button>
                      ))}
                      <input type="color" value={form.primaryColor} onChange={(e) => setForm({...form, primaryColor: e.target.value})} className="w-10 h-10 rounded-full p-0 border-0 bg-transparent cursor-pointer" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "رقم الهاتف" : "Phone Number"}</label>
                      <input 
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="010XXXXXXXX"
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "العنوان" : "Address"}</label>
                      <input 
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder={isAr ? "القاهرة، مدينة نصر" : "Cairo, Heliopolis"}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={nextStep}
                      className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all group"
                    >
                      {isAr ? "التالي: بيانات المسئول" : "Next: Admin Details"}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  className="space-y-8"
                >
                  <button onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {isAr ? "العودة لبيانات العيادة" : "Back to Clinic Details"}
                  </button>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{isAr ? "بيانات مسئول النظام" : "System Admin Details"}</h1>
                    <p className="text-slate-500">{isAr ? "هذا الحساب سيكون له كامل الصلاحيات لإدارة العيادة." : "This account will have full permissions to manage the clinic."}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "الاسم بالكامل" : "Full Name"}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        name="adminName"
                        value={form.adminName}
                        onChange={handleChange}
                        placeholder={isAr ? "د. محمد أحمد" : "Dr. Mohamed Ahmed"}
                        className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "البريد الإلكتروني" : "Email Address"}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        name="adminEmail"
                        type="email"
                        value={form.adminEmail}
                        onChange={handleChange}
                        placeholder="doctor@clinic.com"
                        className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "كلمة المرور" : "Password"}</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          name="adminPassword"
                          type="password"
                          value={form.adminPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">{isAr ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          name="confirmPassword"
                          type="password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-600 transition-all font-bold" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      onClick={nextStep}
                      className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all group"
                    >
                      {isAr ? "التالي: مراجعة الاشتراك" : "Next: Review Subscription"}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <button onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {isAr ? "تعديل البيانات" : "Edit Details"}
                  </button>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">{isAr ? "أكد اشتراكك الآن" : "Confirm Subscription"}</h1>
                    <p className="text-slate-500">{isAr ? "مراجعة نهائية لباقة الاشتراك والبيانات قبل التوجه للدفع." : "Final review of your plan and details before proceeding to payment."}</p>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] uppercase font-black text-blue-600 tracking-widest mb-1">{isAr ? "باقة الاشتراك" : "PLAN SELECTED"}</div>
                        <h3 className="text-2xl font-black">{selectedPlan?.name || "Standard Plan"}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-blue-600">{selectedPlan?.price || 0} <span className="text-xs text-slate-400">EGP</span></div>
                        <div className="text-[10px] font-bold text-slate-400">{selectedPlan?.durationDays || 30} {isAr ? "يوم" : "Days"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                      <div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">{isAr ? "اسم العيادة" : "CLINIC"}</div>
                        <div className="font-bold">{form.clinicName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">{isAr ? "الرابط" : "SUBDOMAIN"}</div>
                        <div className="font-bold">{form.subdomain}.royalclinic.net</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">{isAr ? "المسئول" : "ADMIN"}</div>
                        <div className="font-bold">{form.adminName}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">{isAr ? "البريد" : "EMAIL"}</div>
                        <div className="font-bold truncate max-w-[150px]">{form.adminEmail}</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">
                        {isAr ? "الحدود" : "Plan Limits"}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlanLimits.length > 0 ? selectedPlanLimits.map((item) => (
                          <span key={item.label} className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                            {item.label}: {item.value == null ? (isAr ? "غير محدود" : "Unlimited") : item.value}
                          </span>
                        )) : (
                          <span className="text-xs text-slate-400 italic">
                            {isAr ? "لا توجد حدود محددة" : "No limits selected"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                      <Sparkles className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <p className="text-xs font-bold text-blue-800 leading-relaxed">
                        {isAr 
                          ? "سيتم توجيهك الآن لبوابة الدفع 'فواتيرك' لإتمام العملية. سيتم تفعيل حسابك فور إتمام الدفع بنجاح." 
                          : "You will be redirected to Fawaterak payment gateway. Your account will be activated immediately after successful payment."}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={loading}
                      className="w-full py-5 bg-white text-blue-600 border-2 border-blue-600 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 rounded-2xl hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {isAr ? "بدء تجربة مجانية" : "Start Free Trial"}
                        </>
                      )}
                    </button>

                    <button 
                      onClick={(e) => handleSubmit(e, false)}
                      disabled={loading}
                      className="w-full py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all group disabled:opacity-50"
                    >
                      {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> {isAr ? "جاري المعالجة..." : "Processing..."}</>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          {isAr ? "تأكيد والدفع" : "Confirm & Pay"}
                          <CheckCircle2 className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side Info */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm sticky top-[120px] space-y-8">
              <h3 className="text-xl font-black">{isAr ? "لماذا تختار Royal Clinic؟" : "Why Royal Clinic?"}</h3>
              
              <div className="space-y-6">
                {[
                  { title: isAr ? "نظام متكامل" : "Comprehensive", desc: isAr ? "إدارة كاملة للعيادة تشمل المواعيد والتقارير الطبية." : "Full clinic management from bookings to records." },
                  { title: isAr ? "أمان البيانات" : "Secure Data", desc: isAr ? "تشفير كامل لبيانات المرضى وسجلاتهم الطبية." : "Full encryption for patient data and records." },
                  { title: isAr ? "واجهة عصرية" : "Modern UI", desc: isAr ? "سهولة في الاستخدام لك ولطاقم العمل وللمرضى." : "Easy to use for you, your staff, and patients." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-bold">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{isAr ? "موثوق من قبل" : "TRUSTED BY"}</p>
                <div className="flex justify-center flex-wrap gap-4 opacity-50 grayscale">
                   {/* Logo placeholders or small icons */}
                   <span className="font-black italic">CLINICS+</span>
                   <span className="font-black italic">HEALTH.IO</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t bg-white text-center">
        <p className="text-sm font-bold text-slate-400">© 2026 Royal Clinic SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default RegisterClinicPage;
