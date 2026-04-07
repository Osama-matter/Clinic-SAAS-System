import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { authService, API_BASE_URL } from "../services/api";
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
  RefreshCw
} from "lucide-react";

const SettingsPage = () => {
  const { user, isAdmin } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [adminForm, setAdminForm]   = useState({ fullName:"", email:"", password:"" });
  const [adminLoading, setAdminL]   = useState(false);

  const isAr = lang === "ar";


  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminL(true);
    const tid = toast.loading(isAr ? "جاري إنشاء الحساب..." : "Creating staff account...");
    try {
      await authService.createAdmin(adminForm);
      toast.success(isAr ? "تم إنشاء الحساب بنجاح!" : "Account created successfully!", { id: tid });
      setAdminForm({ fullName:"", email:"", password:"" });
    } catch (err) {
      toast.error(err.response?.data?.message || (isAr ? "فشل إنشاء الحساب" : "Failed to create account"), { id: tid });
    } finally { setAdminL(false); }
  };

  return (
    <Layout title={t('settings')}>
      <div className="max-w-2xl mx-auto space-y-10 pb-24" dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-surface border border-outline p-6 sm:p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-headline">{t('settings')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{isAr ? "إدارة حسابك وتفضيلات العيادة." : "Manage your account and clinic preferences."}</p>
          </div>
        </div>

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
                <Mail className="w-4 h-4 opacity-50" />
                {user?.email}
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

        {/* Admin: Create Doctor account */}
        {isAdmin && (
          <div className="bg-surface rounded-[2.5rem] border border-outline p-6 sm:p-10 space-y-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-headline font-black text-slate-900 dark:text-white text-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-primary border border-blue-100 dark:border-blue-800 shadow-sm">
                  <UserPlus className="w-6 h-6" />
                </div>
                {isAr ? "إضافة طاقم جديد" : "Staff Onboarding"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{isAr ? "قم بتسجيل طاقم طبي أو إداري جديد في النظام." : "Register new medical or administrative personnel into the system."}</p>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name:"fullName", label: isAr ? "الاسم الكامل" : "Staff Full Name", type:"text", icon: <User className="w-4 h-4" />, placeholder: isAr ? "مثال: د. أحمد حسن" : "e.g. Dr. Ahmed Hassan" },
                  { name:"email",    label: isAr ? "البريد الإلكتروني المهني" : "Professional Email", type:"email", icon: <Mail className="w-4 h-4" />, placeholder: "staff@clinicflow.com" },
                  { name:"password", label: isAr ? "كلمة المرور الأولية" : "Initial Password", type:"password", icon: <Lock className="w-4 h-4" />, placeholder: "••••••••" },
                ].map(({ name, label, type, icon, placeholder }) => (
                  <div key={name} className={`space-y-2 ${name === 'fullName' ? 'md:col-span-2' : ''}`}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
                      {label}
                    </label>
                    <div className="relative group">
                      <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                        {icon}
                      </div>
                      <input name={name} type={type} value={adminForm[name]} placeholder={placeholder}
                        onChange={e => setAdminForm({ ...adminForm, [name]: e.target.value })}
                        className={`w-full ${isRtl ? 'pr-12' : 'pl-12'} bg-surface-alt border border-outline rounded-2xl px-6 py-4 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-bold shadow-sm`} required />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <button type="submit" disabled={adminLoading}
                  className="w-full py-5 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 transition-all flex items-center justify-center gap-3">
                  {adminLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  {isAr ? "تسجيل حساب جديد" : "Register New Account"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;
