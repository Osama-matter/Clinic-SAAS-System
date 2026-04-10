import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { 
  Activity, 
  Loader2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight 
} from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const [form, setForm]   = useState({ email: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => { 
    setForm({ ...form, [e.target.name]: e.target.value }); 
    if (error) setError(""); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tid = toast.loading(lang === "ar" ? "جاري التحقق..." : "Authenticating...");
    try {
      const user = await login(form.email, form.password);
      toast.success(lang === "ar" ? "مرحباً بعودتك!" : "Welcome back!", { id: tid });
      
      const role = user.role;
      if (role === 2 || role === "2" || role === "Admin") {
        navigate("/dashboard");
      } else if (role === 4 || role === "4" || role === "Doctor") {
        navigate("/doctor/schedule");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error(lang === "ar" ? "بيانات غير صحيحة. حاول مرة أخرى." : "Invalid credentials. Please try again.", { id: tid });
      setError(err.response?.data?.message || (lang === "ar" ? "بيانات غير صحيحة." : "Invalid credentials."));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 lg:p-6 relative overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="relative w-full max-w-lg z-10 transition-all">
        <main className="bg-surface/80 backdrop-blur-xl rounded-[2rem] lg:rounded-[3rem] p-6 sm:p-8 lg:p-14 border border-outline shadow-2xl shadow-slate-200/50">
          {/* Brand */}
          <div className="flex flex-col items-center mb-12">
            <Link to="/" className="flex flex-col items-center group">
              <div className="mb-4 w-14 h-14 bg-gradient-to-br from-primary to-primary-container rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="text-on-primary w-8 h-8" />
              </div>
              <h1 className="font-headline font-black tracking-tighter text-3xl text-on-surface">Royal<span className="text-primary">Clinic</span></h1>
            </Link>
          </div>

          <div className="text-center mb-8 lg:mb-10">
            <h2 className="font-headline font-black text-3xl lg:text-4xl tracking-tight text-slate-900 dark:text-white mb-3">{t('loginTitle')}</h2>
            <p className="text-slate-500 font-medium">
              {isAr ? "سجل دخولك للوصول إلى منصة إدارة العيادة" : "Sign in to the Clinic Management Portal"}
            </p>
          </div>

          {error && (
            <div className="mb-6 px-5 py-4 rounded-2xl bg-error/10 text-error border border-error/20 text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
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
                  placeholder="doctor@royalclinic.com"
                  className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-5' : 'pl-14 pr-5'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-end px-1">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">{t('password')}</label>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-dark transition-colors">
                  {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </a>
              </div>
              <div className="relative group">
                <div className={`absolute ${isRtl ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  name="password" 
                  type={showPw ? "text" : "password"} 
                  required
                  value={form.password} 
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full bg-surface-alt border border-outline rounded-[1.25rem] ${isRtl ? 'pr-14 pl-14' : 'pl-14 pr-14'} py-4 text-on-surface focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300 font-bold`} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPw(!showPw)}
                  className={`absolute ${isRtl ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors`}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50 rounded-[1.25rem] shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all group"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {isAr ? "جاري الدخول..." : "Signing In..."}</>
                ) : (
                  <>
                    {t('signIn')}
                    <ArrowRight className={`w-5 h-5 group-hover:${isRtl ? '-translate-x-2' : 'translate-x-2'} transition-transform`} />
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
