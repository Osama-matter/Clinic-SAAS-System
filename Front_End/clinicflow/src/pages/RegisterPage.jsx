import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { 
  Activity, 
  Loader2, 
  User, 
  Mail, 
  Lock, 
  CheckCircle2,
  ShieldCheck
} from "lucide-react";

const RegisterPage = () => {
  const { register } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const isAr = lang === "ar";

  const handleChange = (e) => { 
    setForm({ ...form, [e.target.name]: e.target.value }); 
    if (error) setError(""); 
  };

  const validate = () => {
    if (form.password !== form.confirmPassword) { 
      setError(isAr ? "كلمات المرور غير متطابقة." : "Passwords do not match."); 
      return false; 
    }
    if (form.password.length < 8) { 
      setError(isAr ? "يجب أن تكون كلمة المرور ٨ أحرف على الأقل." : "Password must be at least 8 characters."); 
      return false; 
    }
    if (!/[A-Z]/.test(form.password)) { 
      setError(isAr ? "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل." : "Password must contain at least one uppercase letter."); 
      return false; 
    }
    if (!/[0-9]/.test(form.password)) { 
      setError(isAr ? "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل." : "Password must contain at least one number."); 
      return false; 
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const tid = toast.loading(isAr ? "جاري إنشاء الحساب..." : "Creating account...");
    try {
      await register(form);
      toast.success(isAr ? "تم إنشاء الحساب بنجاح!" : "Account created successfully!", { id: tid });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      toast.error(isAr ? "فشل إنشاء الحساب. حاول مرة أخرى." : "Registration failed. Please try again.", { id: tid });
      setError(err.response?.data?.message || (isAr ? "فشل إنشاء الحساب." : "Registration failed."));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 lg:p-6 relative overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="relative w-full max-w-xl z-10 p-2 lg:p-4 transition-all">
        <main className="bg-surface/80 backdrop-blur-xl rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-14 border border-outline shadow-2xl shadow-slate-200/50">
          {/* Brand */}
          <div className="flex flex-col items-center mb-10">
            <Link to="/" className="flex flex-col items-center group">
              <div className="mb-4 w-14 h-14 bg-gradient-to-br from-primary to-primary-container rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="text-on-primary w-8 h-8" />
              </div>
              <h1 className="font-headline font-black tracking-tighter text-3xl text-on-surface">Clinic<span className="text-primary">Flow</span></h1>
            </Link>
          </div>

          <div className="text-center mb-8 lg:mb-10">
            <h2 className="font-headline font-black text-3xl lg:text-4xl tracking-tight text-slate-900 dark:text-white mb-3">{t('registerTitle')}</h2>
            <p className="text-slate-500 font-medium">
              {isAr ? "انضم إلينا كـ مريض واستمتع برعاية صحية أسهل" : "Join us as a patient and experience easier healthcare"}
            </p>
          </div>

          {error && (
            <div className="mb-6 px-5 py-4 rounded-2xl bg-error/10 text-error border border-error/20 text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 px-1">{t('fullName')}</label>
              <div className="relative group">
                <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                  <User className="w-5 h-5" />
                </div>
                <input 
                  name="fullName" 
                  type="text" 
                  required
                  value={form.fullName} 
                  onChange={handleChange}
                  placeholder={isAr ? "أحمد محمد" : "John Doe"}
                  className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 px-1">{t('email')}</label>
              <div className="relative group">
                <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  name="email" 
                  type="email" 
                  required
                  value={form.email} 
                  onChange={handleChange}
                  placeholder="patient@email.com"
                  className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 px-1">{t('password')}</label>
                <div className="relative group">
                  <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                    <Lock className="w-5 h-5" />
                  </div>
                    <input 
                      name="password" 
                      type="password" 
                      required
                      value={form.password} 
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 px-1">
                  {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
                </label>
                <div className="relative group">
                  <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input 
                    name="confirmPassword" 
                    type="password" 
                    required
                    value={form.confirmPassword} 
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50 rounded-[1.25rem] shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all group"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {isAr ? "جاري الإنشاء..." : "Creating Account..."}</>
                ) : (
                  <>
                    {isAr ? "إنشاء حساب كمريض" : "Register as Patient"}
                    <CheckCircle2 className={`w-5 h-5 group-hover:${isRtl ? '-translate-x-2' : 'translate-x-2'} transition-transform`} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="relative my-10 flex items-center">
            <div className="flex-grow border-t border-slate-100" />
            <span className="mx-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              {isAr ? "أو" : "OR"}
            </span>
            <div className="flex-grow border-t border-slate-100" />
          </div>

          <p className="text-center text-sm font-bold text-slate-500">
            {t('alreadyHaveAccount')}
            <Link to="/login" className="text-primary hover:text-primary-dark transition-colors mx-2 border-b-2 border-primary/20 hover:border-primary">
              {t('signIn')}
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
};

export default RegisterPage;
