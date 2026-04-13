import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  GraduationCap, Building2, Phone, MessageCircle, MapPin,
  Activity, Globe, Sun, Moon, ChevronDown, Award, Calendar,
  Star, Clock, Users, Shield, Share2, Loader2,
} from "lucide-react";
import { clinicService, getFileUrl } from "../services/api";
import useSubdomain from "../hooks/useSubdomain";

/* ═══════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Cairo:wght@300;400;500;600;700;900&display=swap');

  .clp-root {
    /* BLUE PALETTE */
    --blue:        #0066FF;
    --blue-light:  #3385FF;
    --blue-deep:   #0052CC;
    --blue-pale:   #EBF3FF;
    --blue-glow:   rgba(0,102,255,.35);
    --blue-muted:  rgba(0,102,255,.08);
    --blue-border: rgba(0,102,255,.18);

    /* LIGHT MODE TOKENS */
    --bg:          #F8FAFC;
    --surface:     #FFFFFF;
    --mist:        #F1F5FB;
    --ink:         #0F172A;
    --ink-mid:     #334155;
    --ink-soft:    #64748B;
    --border:      rgba(0,0,0,.08);

    font-family: 'DM Sans','Cairo',sans-serif;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    overflow-x: hidden;
    width: 100%;
    box-sizing: border-box;
    transition: background .4s, color .4s;
    -webkit-font-smoothing: antialiased;
  }

  .clp-root *, .clp-root *::before, .clp-root *::after { box-sizing: border-box; }

  /* DARK MODE */
  .clp-root.dark {
    --bg:          #060D1F;
    --surface:     #0F172A;
    --mist:        #0B1426;
    --ink:         #F0EDE8;
    --ink-mid:     #CBD5E1;
    --ink-soft:    #94A3B8;
    --border:      rgba(255,255,255,.07);
    --blue-pale:   #0F1F3D;
    --blue-muted:  rgba(0,102,255,.14);
    --blue-border: rgba(0,102,255,.28);
  }

  .font-display { font-family:'Cormorant Garamond',serif; }
  .font-ui      { font-family:'DM Sans','Cairo',sans-serif; }

  /* SCROLLBAR */
  ::-webkit-scrollbar        { width:5px; }
  ::-webkit-scrollbar-track  { background:transparent; }
  ::-webkit-scrollbar-thumb  { background:rgba(0,102,255,.25); border-radius:10px; }

  /* KEYFRAMES */
  @keyframes fadeUp  { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ripple  { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.8);opacity:0} }
  @keyframes floatWa { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .hero-badge { animation:fadeUp .8s cubic-bezier(.22,1,.36,1) .15s both; }
  .hero-orn   { animation:fadeUp .8s cubic-bezier(.22,1,.36,1) .25s both; }
  .hero-title { animation:fadeUp .9s cubic-bezier(.22,1,.36,1) .35s both; }
  .hero-body  { animation:fadeUp .9s cubic-bezier(.22,1,.36,1) .48s both; }
  .hero-creds { animation:fadeUp .9s cubic-bezier(.22,1,.36,1) .58s both; }
  .hero-btns  { animation:fadeUp .9s cubic-bezier(.22,1,.36,1) .70s both; }
  .hero-stats { animation:fadeUp .9s cubic-bezier(.22,1,.36,1) .82s both; }

  .reveal {
    opacity:0; transform:translateY(26px);
    transition:opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1);
  }
  .reveal.delay-1 { transition-delay:.14s; }
  .reveal.delay-2 { transition-delay:.28s; }
  .reveal.is-visible { opacity:1; transform:translateY(0); }

  /* ORNAMENT */
  .ornament {
    display:flex; align-items:center; gap:10px;
    color:var(--blue); font-size:9px; letter-spacing:.3em;
    text-transform:uppercase; font-weight:700;
  }
  .ornament::before,.ornament::after {
    content:''; flex:1; max-width:36px; height:1px; background:var(--blue); opacity:.4;
  }
  .ornament-white { color:rgba(255,255,255,.65); }
  .ornament-white::before,.ornament-white::after { background:rgba(255,255,255,.4); }

  /* BLUE LINE */
  .blue-line::after {
    content:''; display:block; width:48px; height:2px;
    background:linear-gradient(90deg,var(--blue),var(--blue-light));
    margin-top:12px; border-radius:2px;
  }

  /* RIPPLE */
  .ripple-ring { position:absolute; inset:0; border-radius:50%; animation:ripple 2s ease-out infinite; }

  /* BUTTONS */
  .btn-primary {
    position:relative; overflow:hidden;
    background:var(--blue); color:#fff;
    border:none; cursor:pointer;
    transition:transform .25s, box-shadow .25s;
  }
  .btn-primary::before {
    content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
    transition:left .45s;
  }
  .btn-primary:hover::before { left:100%; }
  .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,102,255,.42)!important; }

  .btn-ghost {
    background:transparent; color:#fff; cursor:pointer;
    border:1.5px solid rgba(255,255,255,.22);
    transition:background .25s, border-color .25s;
  }
  .btn-ghost:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.38); }

  /* FOOTER LINK */
  .footer-link { text-decoration:none; transition:color .22s; }
  .footer-link:hover { color:var(--blue-light)!important; }

  /* CARDS */
  .spec-card {
    transition:transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s, border-color .25s;
  }
  .spec-card:hover {
    transform:translateY(-7px);
    box-shadow:0 20px 48px rgba(0,102,255,.13);
    border-color:rgba(0,102,255,.32)!important;
  }

  .cred-item { transition:transform .25s, border-color .25s, background .25s; }
  [dir="rtl"] .cred-item:hover { transform:translateX(-4px); border-color:rgba(0,102,255,.3)!important; }
  [dir="ltr"] .cred-item:hover { transform:translateX( 4px); border-color:rgba(0,102,255,.3)!important; }

  /* WHATSAPP */
  .wa-float { animation:floatWa 3.5s ease-in-out infinite; }

  /* STAT */
  .stat-num { font-family:'Cormorant Garamond',serif; font-weight:700; line-height:1; }

  /* HERO DESC — clamp to 3 lines */
  .hero-desc {
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }

  /* ══════════════════════════════
     RESPONSIVE
  ══════════════════════════════ */

  /* ≤ 640px  (phones) */
  @media(max-width:640px){
    .clp-nav-inner  { padding:0 14px!important; height:58px!important; }
    .clp-nav-name   { font-size:15px!important; }
    .clp-nav-btns   { gap:6px!important; }

    .clp-hero-inner { padding:14px 14px 60px!important; }
    .hero-title     { font-size:28px!important; line-height:1.14!important; }
    .hero-body      { font-size:13px!important; }
    .hero-stats     { gap:18px!important; }
    .stat-num       { font-size:26px!important; }

    .clp-trust-grid { grid-template-columns:1fr 1fr!important; gap:8px!important; }
    .trust-badge    { padding:12px 8px!important; }

    .clp-about-img  { aspect-ratio:16/9!important; max-height:220px!important; }
    .clp-about-badge{ right:10px!important; bottom:-10px!important; padding:10px 14px!important; }
    .clp-about-badge .clp-badge-num { font-size:26px!important; }

    .clp-svc-grid   { grid-template-columns:1fr!important; }
    .clp-footer-grid{ grid-template-columns:1fr!important; gap:22px!important; }
    .clp-footer-bot { flex-direction:column!important; text-align:center!important; gap:5px!important; }

    /* prevent any card from overflowing on mobile */
    .spec-card { margin:0!important; max-width:100%!important; }
    section, div { max-width:100%; }
  }

  /* 641–768px */
  @media(min-width:641px) and (max-width:768px){
    .clp-nav-inner  { height:64px!important; padding:0 20px!important; }
    .hero-title     { font-size:34px!important; }
    .clp-trust-grid { grid-template-columns:1fr 1fr!important; }
    .clp-svc-grid   { grid-template-columns:1fr 1fr!important; }
    .clp-footer-grid{ grid-template-columns:1fr!important; }
  }

  /* ≤ 768px shared — hero centering */
  @media(max-width:768px){
    .clp-hero-inner             { text-align:center!important; }
    .hero-badge                 { margin-left:auto!important; margin-right:auto!important; }
    .ornament                   { justify-content:center!important; margin:0 auto 14px!important; }
    .hero-title                 { text-align:center!important; }
    .hero-body                  { text-align:center!important; max-width:100%!important; margin-left:auto!important; margin-right:auto!important; }
    .hero-creds .cred-item      { text-align:start!important; }
    .hero-btns                  { flex-direction:column!important; width:100%!important; gap:10px!important; }
    .hero-btns button           { width:100%!important; justify-content:center!important; }
    .hero-stats                 { justify-content:center!important; flex-wrap:wrap!important; gap:22px!important; }
    .hero-stats > div           { text-align:center!important; }

    .clp-about-grid             { grid-template-columns:1fr!important; gap:32px!important; }
    .clp-about-text             { text-align:center!important; }
    .clp-about-text .ornament   { justify-content:center!important; }
    .clp-about-text .blue-line::after { margin:12px auto 0!important; }
    .clp-about-creds .cred-item { text-align:start!important; }
  }

  /* 769–1024px tablet landscape */
  @media(min-width:769px) and (max-width:1024px){
    .clp-trust-grid { grid-template-columns:repeat(4,1fr)!important; }
    .clp-svc-grid   { grid-template-columns:1fr 1fr!important; }
    .clp-footer-grid{ grid-template-columns:1fr 1fr!important; gap:28px!important; }
  }

  /* ≥ 1025px desktop */
  @media(min-width:1025px){
    .clp-about-grid { grid-template-columns:1fr 1fr!important; }
    .clp-trust-grid { grid-template-columns:repeat(4,1fr)!important; }
    .clp-svc-grid   { grid-template-columns:repeat(3,1fr)!important; }
    .clp-footer-grid{ grid-template-columns:2fr 1fr 1.5fr!important; }
  }
`;

const STYLE_ID = "clp-v3";
let styleRC = 0;
function injectStyles() {
  styleRC++;
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement("style");
    el.id = STYLE_ID; el.textContent = STYLES;
    document.head.appendChild(el);
  }
}
function removeStyles() {
  if (--styleRC <= 0) { styleRC = 0; document.getElementById(STYLE_ID)?.remove(); }
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const ClinicLandingPage = ({ subdomain: propSubdomain }) => {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const { t, lang, toggleLang, setLang, isRtl } = useLanguage();
  const hostSubdomain = useSubdomain();
  const observerRef = useRef(null);

  // ── derive lang/dir locally — never trust stale isRtl from context ──
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState(null);
  const [error, setError] = useState("");

  const resolvedSubdomain = useMemo(
    () => propSubdomain || params.subdomain || hostSubdomain || null,
    [params.subdomain, propSubdomain, hostSubdomain]
  );

  useEffect(() => { injectStyles(); return () => removeStyles(); }, []);

  // Force Arabic on first mount — runs once only via ref guard
  const _langInitialized = useRef(false);
  useEffect(() => {
    if (_langInitialized.current) return;
    _langInitialized.current = true;
    if (lang !== "ar") {
      if (typeof setLang === "function") setLang("ar");
      else if (typeof toggleLang === "function") toggleLang();
    }
  }, [lang, setLang, toggleLang]);

  // persist dark
  useEffect(() => { localStorage.setItem("theme", isDark ? "dark" : "light"); }, [isDark]);

  // scroll watcher
  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // fetch clinic
  useEffect(() => {
    const load = async () => {
      if (!resolvedSubdomain) {
        setError(isAr ? "لا يمكن تحديد رابط العيادة." : "Clinic link could not be resolved.");
        setLoading(false); return;
      }
      
      // Keep existing data if we have it to avoid flicker
      setError("");
      
      try {
        // 1. Fetch text-only profile (very fast)
        const res = await clinicService.getPublicProfile(resolvedSubdomain);
        setClinic(res.data);
        setLoading(false);

        // 2. Fetch images in background
        const imgRes = await clinicService.getPublicProfileImages(resolvedSubdomain);
        setClinic(prev => ({
          ...prev,
          ...imgRes.data
        }));
      } catch (err) {
        if (!clinic) { // only show error if we don't have partial data
          setClinic(null);
          setError(err.response?.data?.message || (isAr ? "لم نعثر على هذه العيادة." : "Clinic not found."));
          setLoading(false);
        }
      }
    };
    load();
  }, [resolvedSubdomain, isAr]);

  // scroll-reveal
  useEffect(() => {
    if (!loading && clinic) {
      observerRef.current = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); observerRef.current.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
      document.querySelectorAll(".reveal").forEach(el => observerRef.current.observe(el));
      return () => observerRef.current?.disconnect();
    }
  }, [loading, clinic, lang]);

  const bookingLink = useMemo(
    () => resolvedSubdomain ? `/book-guest?clinic=${encodeURIComponent(resolvedSubdomain)}` : "/book-guest",
    [resolvedSubdomain]
  );
  const shareLink = useMemo(
    () => resolvedSubdomain
      ? `${window.location.origin}/clinic/${encodeURIComponent(resolvedSubdomain)}`
      : window.location.href,
    [resolvedSubdomain]
  );
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareLink); toast.success(isAr ? "تم نسخ الرابط" : "Link copied"); }
    catch { toast.error(isAr ? "تعذر النسخ" : "Could not copy"); }
  };

  /* ── LOADING (GHOST UI) ── */
  if (loading && !clinic) return (
    <div className={`clp-root${isDark ? " dark" : ""} flex items-center justify-center min-h-screen`} dir={dir}>
      <div className="text-center animate-pulse">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl mx-auto mb-6 flex items-center justify-center">
          <Activity size={32} className="text-blue-500/30" />
        </div>
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto mb-4" />
        <div className="h-4 w-32 bg-slate-100 dark:bg-slate-900 rounded-lg mx-auto" />
      </div>
    </div>
  );

  /* ── ERROR ── */
  if (error || !clinic) return (
    <div className={`clp-root${isDark ? " dark" : ""} flex items-center justify-center min-h-screen`} dir={dir}>
      <div className="text-center p-8" style={{ maxWidth: 380 }}>
        <Building2 size={56} style={{ color: "var(--blue)", opacity: .2, margin: "0 auto 20px" }} />
        <h1 className="font-display mb-3" style={{ fontSize: 30, color: "var(--ink)" }}>
          {isAr ? "الصفحة غير متاحة" : "Page Unavailable"}
        </h1>
        <p className="font-ui mb-8" style={{ fontSize: 14, color: "var(--ink-soft)" }}>{error}</p>
        <button className="btn-primary px-8 py-3 rounded-xl font-ui font-bold text-[12px] uppercase tracking-widest"
          onClick={() => navigate("/")}>
          {isAr ? "العودة للرئيسية" : "Go Home"}
        </button>
      </div>
    </div>
  );

  /* ── DATA ── */
  const defaultImg = "/young-handsome-physician-medical-robe-with-stethoscope.jpg";
  const coverImage = clinic.clinicImageUrl || clinic.doctorImageUrl || clinic.logoUrl || defaultImg;
  const workingHours = clinic.workingHours || (isAr ? "حسب المواعيد" : "By Appointment");
  const shortDesc = clinic.description || (isAr
    ? "خدمات طبية متميزة تهدف للارتقاء بصحتكم من خلال الخبرة والمهنية العالية."
    : "Distinguished medical services aimed at enhancing your health through high expertise.");
  const services = Array.isArray(clinic.services)
    ? clinic.services
    : typeof clinic.services === "string" ? clinic.services.split("\n") : [];

  const credentials = [
    { icon: <GraduationCap className="w-4 h-4" />, text: clinic.specialty || (isAr ? "طبيب متخصص" : "Specialist Physician") },
    { icon: <Award className="w-4 h-4" />, text: isAr ? "خبرة في أفضل المستشفيات" : "Experienced in Top Hospitals" },
    { icon: <Shield className="w-4 h-4" />, text: isAr ? "جودة طبية معتمدة" : "Certified Medical Quality" },
  ];

  return (
    <div className={`clp-root${isDark ? " dark" : ""}`} dir={dir}>

      {/* ── WhatsApp float ── */}
      {clinic.phoneNumber && (
        <a
          href={`https://wa.me/${clinic.phoneNumber.replace(/\D/g, "")}`}
          className="wa-float fixed bottom-6 z-[999] w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl"
          style={{
            [dir === "rtl" ? "left" : "right"]: "18px",
            background: "#25d366",
            boxShadow: "0 8px 28px rgba(37,211,102,.45)",
          }}
          target="_blank" rel="noopener noreferrer"
        >
          <MessageCircle className="w-6 h-6 text-white fill-white" />
        </a>
      )}

      {/* ════════════════════════
          NAVBAR
      ════════════════════════ */}
      <nav className="fixed top-0 w-full z-[100] transition-all duration-400"
        style={{
          background: isScrolled ? (isDark ? "rgba(6,13,31,.97)" : "rgba(248,250,252,.97)") : "transparent",
          borderBottom: isScrolled ? "1px solid var(--border)" : "1px solid transparent",
          backdropFilter: isScrolled ? "blur(20px)" : "none",
          boxShadow: isScrolled ? "0 2px 24px rgba(0,0,0,.07)" : "none",
        }}>
        <div className="clp-nav-inner max-w-7xl mx-auto flex items-center justify-between"
          style={{ height: 72, padding: "0 24px" }}>

          {/* Logo + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border"
              style={{ background: "var(--blue-muted)", borderColor: "var(--blue-border)" }}>
              {clinic.logoUrl
                ? <img src={getFileUrl(clinic.logoUrl)} alt="logo" className="w-full h-full object-cover" loading="lazy" />
                : <Building2 className="w-5 h-5" style={{ color: "var(--blue)" }} />}
            </div>
            <span className="clp-nav-name font-display truncate"
              style={{ fontSize: 19, fontWeight: 600, color: isScrolled ? "var(--ink)" : "#fff" }}>
              {clinic.name.split(" ")[0]}{" "}
              <span style={{ color: "var(--blue)" }}>{clinic.name.split(" ").slice(1).join(" ")}</span>
            </span>
          </div>

          {/* Actions */}
          <div className="clp-nav-btns flex items-center gap-2">
            <button onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-ui"
              style={{ background: "var(--blue-muted)", color: "var(--blue)", border: "1px solid var(--blue-border)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang.toUpperCase()}</span>
            </button>
            <button onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg"
              style={{ background: "var(--blue-muted)", color: "var(--blue)", border: "1px solid var(--blue-border)" }}>
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button className="hidden sm:flex btn-primary px-5 py-2 rounded-lg font-ui text-[10px] font-bold uppercase tracking-widest"
              onClick={() => navigate(bookingLink)}>
              {isAr ? "حجز موعد" : "Book Now"}
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════
          HERO
      ════════════════════════ */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: "100svh", paddingTop: 72 }}>

        {/* BG — strong dark overlay always, regardless of light/dark mode */}
        <div className="absolute inset-0 z-0">
          <img src={getFileUrl(coverImage)} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            loading="lazy" />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(120deg, rgba(4,12,36,.94) 0%, rgba(4,12,36,.82) 55%, rgba(4,12,36,.48) 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, rgba(0,80,255,.14) 0%, transparent 55%)",
          }} />
        </div>

        <div className="clp-hero-inner relative z-10 max-w-7xl mx-auto w-full" style={{ padding: "64px 24px 80px" }}>
          <div style={{ maxWidth: 680 }} className="mx-auto lg:mx-0">

            {/* Badge */}
            <div className="hero-badge inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full font-ui"
              style={{ background: "rgba(34,197,94,.14)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".18em" }}>
              <span className="relative w-2 h-2">
                <span className="ripple-ring" style={{ background: "#22c55e" }} />
                <span style={{ position: "relative", display: "block", width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              </span>
              {isAr ? "متاح الآن" : "Available Now"}
            </div>

            {/* Ornament */}
            <div className="ornament ornament-white hero-orn mb-4" style={{ width: "fit-content" }}>
              {clinic.specialty || (isAr ? "تميز طبي" : "Medical Excellence")}
            </div>

            {/* Title */}
            <h1 className="hero-title font-display mb-5"
              style={{ fontSize: "clamp(30px,6vw,68px)", fontWeight: 600, color: "#fff", lineHeight: 1.12 }}>
              {clinic.doctorName || clinic.name}
            </h1>

            {/* Description — clamped to 3 lines */}
            <p className="hero-body hero-desc font-ui mb-8"
              style={{ fontSize: "14.5px", lineHeight: 1.9, color: "rgba(255,255,255,.68)", maxWidth: 500 }}>
              {shortDesc}
            </p>

            {/* Credentials */}
            <div className="hero-creds flex flex-col gap-2 mb-8">
              {credentials.map((item, i) => (
                <div key={i} className="cred-item flex items-center gap-3 px-4 py-2.5 rounded-xl border font-ui"
                  style={{ background: "rgba(255,255,255,.07)", borderColor: "rgba(255,255,255,.12)", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.85)", backdropFilter: "blur(10px)" }}>
                  <span style={{ color: "#60a5fa", flexShrink: 0 }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="hero-btns flex flex-wrap gap-3">
              <button className="btn-primary flex items-center gap-2 px-7 py-3.5 rounded-xl font-ui text-[12px] font-bold uppercase tracking-widest shadow-lg"
                onClick={() => navigate(bookingLink)}>
                <Calendar className="w-4 h-4 flex-shrink-0" />
                {isAr ? "احجز موعدك الآن" : "Book Appointment"}
              </button>
              <button className="btn-ghost flex items-center gap-2 px-7 py-3.5 rounded-xl font-ui text-[12px] font-bold uppercase tracking-widest"
                onClick={copyLink}>
                <Share2 className="w-4 h-4 flex-shrink-0" />
                {isAr ? "مشاركة" : "Share"}
              </button>
            </div>

            {/* Stats */}
            <div className="hero-stats flex flex-wrap gap-8 mt-10 pt-8"
              style={{ borderTop: "1px solid rgba(255,255,255,.12)" }}>
              {[
                { val: "+10", label: isAr ? "سنوات خبرة" : "Years Exp." },
                { val: "500+", label: isAr ? "مريض سعيد" : "Patients" },
                { val: "4.9", label: isAr ? "تقييم" : "Rating" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="stat-num" style={{ fontSize: 32, color: "#60a5fa" }}>{s.val}</div>
                  <div className="font-ui mt-1 opacity-40" style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".22em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-40">
          <ChevronDown className="w-5 h-5 text-blue-300 animate-bounce" />
        </div>
      </section>

      {/* ════════════════════════
          TRUST BAR
      ════════════════════════ */}
      <section className="py-12 px-4" style={{ background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="clp-trust-grid grid gap-3" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            {[
              { icon: <Shield className="w-5 h-5" />, title: isAr ? "طبيب متخصص" : "Certified Specialist", sub: clinic.specialty || (isAr ? "تخصص طبي" : "Medical Specialty") },
              { icon: <Star className="w-5 h-5" />, title: isAr ? "جودة مضمونة" : "Top Quality", sub: isAr ? "رعاية فائقة" : "Professional Care" },
              { icon: <Users className="w-5 h-5" />, title: isAr ? "+٥٠٠ مريض" : "500+ Patients", sub: isAr ? "معالجون بنجاح" : "Successful Cases" },
              { icon: <Clock className="w-5 h-5" />, title: isAr ? "حجز ذكي" : "Smart Booking", sub: isAr ? "تأكيد فوري" : "Instant Confirm" },
            ].map((item, i) => (
              <div key={i} className="trust-badge text-center rounded-2xl border"
                style={{ padding: "18px 12px", background: "var(--blue-muted)", borderColor: "var(--blue-border)" }}>
                <div className="trust-icon w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "var(--blue-pale)", color: "var(--blue)" }}>
                  {item.icon}
                </div>
                <div className="trust-title font-ui font-bold mb-1" style={{ fontSize: 13, color: "var(--ink)" }}>{item.title}</div>
                <div className="trust-sub font-ui uppercase tracking-tight" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════
          ABOUT / BIO
      ════════════════════════ */}
      <section className="py-20 px-4" style={{ background: "var(--mist)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="clp-about-grid grid gap-12 items-center" style={{ gridTemplateColumns: "1fr" }}>

            {/* Image */}
            <div className="reveal relative">
              <div className="clp-about-img relative overflow-hidden"
                style={{ borderRadius: 22, aspectRatio: "4/5", maxHeight: 500 }}>
                <img src={getFileUrl(coverImage)} alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ transition: "transform .8s cubic-bezier(.22,1,.36,1)" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.3),transparent)" }} />
              </div>
              <div className="clp-about-badge absolute text-center text-white rounded-xl shadow-xl"
                style={{ background: "var(--blue)", right: 22, bottom: -14, padding: "14px 20px" }}>
                <span className="clp-badge-num font-display font-bold block" style={{ fontSize: 34 }}>+10</span>
                <span className="font-ui font-bold uppercase tracking-widest opacity-80" style={{ fontSize: 9 }}>
                  {isAr ? "سنوات خبرة" : "Years Exp"}
                </span>
              </div>
            </div>

            {/* Text */}
            <div className="clp-about-text reveal delay-1" style={{ paddingTop: 16 }}>
              <div className="ornament mb-4" style={{ width: "fit-content" }}>
                {isAr ? "نبذة عن الطبيب" : "Doctor's Profile"}
              </div>
              <h2 className="font-display font-bold mb-1 blue-line"
                style={{ fontSize: "clamp(26px,4vw,46px)", color: "var(--ink)" }}>
                {isAr ? "دكتور " : "Dr. "}
                <span style={{ color: "var(--blue)" }}>{clinic.doctorName || clinic.name}</span>
              </h2>
              <p className="font-ui font-semibold uppercase tracking-widest mt-5"
                style={{ color: "var(--blue)", fontSize: 12 }}>
                {clinic.specialty || (isAr ? "طبيب متخصص" : "Specialist Physician")}
              </p>
              <p className="font-ui leading-loose mt-5 mb-8"
                style={{ fontSize: 14.5, color: "var(--ink-soft)" }}>
                {shortDesc}
              </p>
              <div className="clp-about-creds flex flex-col gap-3">
                {[
                  clinic.specialty || (isAr ? "دبلوم التخصص الطبي" : "Medical Specialty Diploma"),
                  isAr ? "ممارس معتمد في كبرى المستشفيات" : "Certified at top hospitals",
                  isAr ? "خبرة في إدارة الحالات المعقدة" : "Expertise in complex cases",
                ].map((txt, i) => (
                  <div key={i} className="cred-item flex items-center gap-4 px-4 py-3.5 rounded-xl border"
                    style={{ borderColor: "var(--blue-border)", background: "var(--blue-muted)" }}>
                    <span className="font-display font-bold flex-shrink-0" style={{ color: "var(--blue)", fontSize: 18 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-ui font-medium" style={{ fontSize: 13.5, color: "var(--ink)" }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════
          SERVICES
      ════════════════════════ */}
      {services.length > 0 && (
        <section className="py-20 px-4" style={{ background: "var(--surface)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 reveal">
              <div className="ornament justify-center mb-4">{isAr ? "خدماتنا" : "Our Services"}</div>
              <h2 className="font-display font-bold" style={{ fontSize: "clamp(26px,4vw,46px)", color: "var(--ink)" }}>
                {isAr ? "التخصصات " : "Clinical "}
                <span style={{ color: "var(--blue)" }}>{isAr ? "الطبية" : "Specialties"}</span>
              </h2>
            </div>
            <div className="clp-svc-grid grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
              {services.map((s, i) => (
                <div key={i} className="spec-card reveal relative overflow-hidden border"
                  style={{
                    padding: "26px 22px",
                    borderColor: "var(--blue-border)",
                    borderRadius: 24,
                    background: isDark ? "rgba(255,255,255,0.04)" : "var(--blue-pale)"
                  }}>
                  <div className="absolute top-0 left-0 w-full h-0.5"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(0,102,255,.22),transparent)" }} />
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 border"
                    style={{ background: "rgba(0,102,255,0.1)", borderColor: "var(--blue-border)", color: "var(--blue)" }}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold mb-2" style={{ fontSize: 22, color: "var(--ink)" }}>{s}</h3>
                  <p className="font-ui leading-relaxed" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                    {isAr
                      ? "رعاية فائقة باستخدام أحدث التقنيات والبروتوكولات الطبية."
                      : "Premium care using the latest technology and medical protocols."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════
          FOOTER
      ════════════════════════ */}
      <footer style={{ background: "#060D1F", borderTop: "1px solid rgba(0,102,255,.1)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-14">
          <div className="clp-footer-grid grid gap-10 mb-12" style={{ gridTemplateColumns: "1fr" }}>

            {/* Brand */}
            <div>
              <div className="font-display font-bold text-white mb-5" style={{ fontSize: 22 }}>
                {clinic.name.split(" ")[0]}{" "}
                <span style={{ color: "var(--blue)" }}>{clinic.name.split(" ").slice(1).join(" ")}</span>
              </div>
              <p className="font-ui leading-loose mb-7" style={{ fontSize: 13, color: "rgba(255,255,255,.35)", maxWidth: 320 }}>
                {shortDesc}
              </p>
              <div className="flex flex-col gap-2.5 font-ui" style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                <div className="flex items-center gap-3">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--blue)" }} />{clinic.phoneNumber || "—"}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--blue)" }} />{clinic.address || "—"}
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--blue)" }} />{workingHours}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-ui font-bold uppercase tracking-widest mb-5" style={{ fontSize: 10, color: "var(--blue)" }}>
                {isAr ? "روابط" : "Links"}
              </h4>
              <ul className="flex flex-col gap-3 list-none p-0 m-0" style={{ fontSize: 13 }}>
                <li>
                  <a href="#" className="footer-link" style={{ color: "rgba(255,255,255,.4)" }}>
                    {isAr ? "البداية" : "Home"}
                  </a>
                </li>
                <li>
                  <button className="footer-link bg-transparent border-none p-0 cursor-pointer font-ui"
                    style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}
                    onClick={() => navigate(bookingLink)}>
                    {isAr ? "حجز موعد" : "Book"}
                  </button>
                </li>
              </ul>
            </div>

            {/* Share card */}
            <div className="clp-footer-share rounded-3xl border"
              style={{ padding: "24px", background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.06)" }}>
              <h4 className="font-ui font-bold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: "var(--blue)" }}>
                {isAr ? "شارك الصفحة" : "Share Profile"}
              </h4>
              <p className="font-ui mb-4" style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>
                {isAr ? "شارك رابط العيادة مع أصدقائك" : "Share the clinic link with friends"}
              </p>
              <div className="font-mono truncate mb-4 rounded-lg px-3 py-2.5 border"
                style={{ background: "rgba(0,0,0,.3)", fontSize: 11, color: "var(--blue)", borderColor: "rgba(255,255,255,.05)" }}>
                {shareLink}
              </div>
              <button className="btn-primary w-full py-3 rounded-xl font-bold uppercase tracking-widest"
                style={{ fontSize: 10 }} onClick={copyLink}>
                {isAr ? "نسخ الرابط" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="clp-footer-bot flex flex-row justify-between items-center gap-2 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 11, color: "rgba(255,255,255,.25)" }}>
            <span>© {new Date().getFullYear()} {clinic.name}. {isAr ? "جميع الحقوق محفوظة" : "All rights reserved."}</span>
            <span>Powered by Royal Clinic</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ClinicLandingPage;