import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  GraduationCap,
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  HeartPulse,
  Activity,
  Microscope,
  Stethoscope,
  ClipboardList,
  Globe,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronDown,
  Award,
  Calendar,
  Star,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Shield,
  Search
} from "lucide-react";

const EndoscopeIcon = ({ className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21 4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4Z" />
    <path d="M19 8v3a4 4 0 0 1-4 4H7a4 4 0 0 0-4 4v3" />
    <circle cx="3" cy="20" r="2" />
  </svg>
);

const LandingPage = () => {
  const { user } = useAuth();
  const { t, lang, toggleLang, isRtl } = useLanguage();
  const isAr = lang === "ar";

  const [isDark, setIsDark] = useState(localStorage.getItem("theme") === "dark");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observerRef.current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observerRef.current.observe(el));
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [lang]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=Cairo:wght@300;400;500;600;700;900&display=swap');

        :root {
          --blue: #0066FF;
          --blue-light: #3385FF;
          --blue-pale: #EBF3FF;
          --blue-deep: #0052CC;
          --blue-glow: rgba(0, 102, 255, 0.35);
          --blue-muted: rgba(0, 102, 255, 0.08);
          --blue-border: rgba(0, 102, 255, 0.2);
          --blue-border-hover: rgba(0, 102, 255, 0.4);
          --ink: #0F172A;
          --ink-mid: #1E293B;
          --cream: #F8FAFC;
          --mist: #F1F5FB;
          --white: #FFFFFF;
          --primary: var(--blue);
        }

        .dark {
          --cream: #0B1120;
          --mist: #0F172A;
          --blue-pale: #0F1F3D;
          --ink: #F0EDE8;
          --ink-mid: #C8C4BC;
          --white: #111827;
          --blue-muted: rgba(0, 102, 255, 0.12);
          --blue-border: rgba(0, 102, 255, 0.25);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'DM Sans', 'Cairo', sans-serif; }

        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-ui { font-family: 'DM Sans', 'Cairo', sans-serif; }

        /* Reveal animations */
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .reveal.delay-1 { transition-delay: 0.1s; }
        .reveal.delay-2 { transition-delay: 0.2s; }
        .reveal.delay-3 { transition-delay: 0.3s; }
        .reveal.delay-4 { transition-delay: 0.4s; }
        .reveal.delay-5 { transition-delay: 0.5s; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }

        /* Hero entrance */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .hero-title  { animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .hero-sub    { animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.38s both; }
        .hero-body   { animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
        .hero-creds  { animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.62s both; }
        .hero-btns   { animation: fadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.72s both; }
        .hero-image  { animation: fadeIn 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .hero-badge  { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.85s both; }
        .hero-stats  { animation: fadeUp 1s cubic-bezier(0.22,1,0.36,1) 0.95s both; }

        /* Blue decorative line */
        .blue-line::after {
          content: '';
          display: block;
          width: 52px;
          height: 2px;
          background: linear-gradient(90deg, var(--blue), var(--blue-light));
          margin-top: 14px;
          border-radius: 2px;
        }

        /* Hover card lift */
        .spec-card {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease, border-color 0.3s ease;
        }
        .spec-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 56px rgba(0,102,255,0.14);
          border-color: rgba(0,102,255,0.35) !important;
        }

        /* WhatsApp float */
        @keyframes float-wa {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.04); }
        }
        .wa-float { animation: float-wa 3.5s ease-in-out infinite; }

        /* Ornamental divider */
        .ornament {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--blue);
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .ornament::before, .ornament::after {
          content: '';
          flex: 1;
          max-width: 40px;
          height: 1px;
          background: var(--blue);
          opacity: 0.4;
        }
        /* Hero ornament — white since hero has dark bg */
        .hero-ornament {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.6);
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .hero-ornament::before, .hero-ornament::after {
          content: '';
          flex: 1;
          max-width: 40px;
          height: 1px;
          background: rgba(255,255,255,0.4);
        }

        /* Nav link */
        .nav-link {
          position: relative;
          transition: color 0.3s ease;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0; right: 0;
          height: 1.5px;
          background: var(--blue);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.3s ease;
          border-radius: 2px;
        }
        .nav-link:hover { color: var(--blue) !important; }
        .nav-link:hover::after { transform: scaleX(1); transform-origin: left; }

        /* Section separator */
        .section-sep {
          width: 1px;
          height: 70px;
          background: linear-gradient(to bottom, transparent, rgba(0,102,255,0.28), transparent);
          margin: 0 auto;
        }

        /* Image zoom */
        .img-zoom { transition: transform 0.8s cubic-bezier(0.22,1,0.36,1); }
        .img-zoom:hover { transform: scale(1.05); }

        /* Credential item hover */
        .cred-item {
          transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease;
        }
        .cred-item:hover {
          border-color: rgba(0,102,255,0.3) !important;
          background: rgba(0,102,255,0.06) !important;
        }
        [dir="ltr"] .cred-item:hover { transform: translateX(5px); }
        [dir="rtl"] .cred-item:hover { transform: translateX(-5px); }

        /* Stat number */
        .stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          line-height: 1;
          color: var(--blue);
        }

        /* Footer link hover */
        .footer-link { transition: color 0.25s ease; }
        .footer-link:hover { color: var(--blue-light) !important; }

        /* Ripple animation */
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .ripple-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: ripple 2s ease-out infinite;
        }

        /* Diagonal hero background pattern */
        .hero-pattern {
          background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 60px,
            rgba(0,102,255,0.018) 60px,
            rgba(0,102,255,0.018) 61px
          );
        }

        /* Blue shimmer button */
        .btn-blue {
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .btn-blue::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transition: left 0.5s ease;
        }
        .btn-blue:hover::before { left: 100%; }
        .btn-blue:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,102,255,0.42) !important; }

        /* Trust badge */
        .trust-badge {
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .trust-badge:hover {
          transform: translateY(-3px);
          border-color: rgba(0,102,255,0.35) !important;
        }

        /* Section heading underline */
        .section-title-line {
          position: relative;
          display: inline-block;
        }
        .section-title-line::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--blue), transparent);
          border-radius: 2px;
        }

        /* Clinic card */
        .clinic-card {
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease;
        }
        .clinic-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0,102,255,0.13);
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,102,255,0.25); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,102,255,0.45); }

        /* Mobile menu */
        .mobile-menu {
          transform: translateY(-10px);
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
          pointer-events: none;
        }
        .mobile-menu.open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: all;
        }
        .float-tag {
          animation: float-wa 4s ease-in-out infinite;
        }
        .float-tag-1 {
          top: 18px;
          right: 18px;
        }
        [dir="rtl"] .float-tag-1 {
          right: auto;
          left: 18px;
        }
      `}</style>

      <div
        className="min-h-screen transition-colors duration-500"
        style={{ background: 'var(--cream)', color: 'var(--ink)' }}
        dir={isRtl ? "rtl" : "ltr"}
      >

        {/* ── WhatsApp Float ── */}
        <a
          href="https://wa.me/201206070140"
          className={`wa-float fixed bottom-8 ${isAr ? 'left-8' : 'right-8'} w-[54px] h-[54px] rounded-full flex items-center justify-center z-[999] shadow-xl`}
          style={{ background: '#25d366', boxShadow: '0 8px 32px rgba(37,211,102,0.45)' }}
          target="_blank" rel="noopener noreferrer"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white fill-white" />
        </a>

        {/* ── Navigation ── */}
        <nav
          className="fixed top-0 w-full z-[100] transition-all duration-500"
          style={{
            background: isScrolled
              ? (isDark ? 'rgba(11,17,32,0.97)' : 'rgba(248,250,252,0.97)')
              : 'transparent',
            borderBottom: isScrolled ? '1px solid rgba(0,102,255,0.12)' : '1px solid transparent',
            backdropFilter: isScrolled ? 'blur(24px)' : 'none',
            boxShadow: isScrolled ? '0 2px 28px rgba(0,0,0,0.07)' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between">

            {/* Logo */}
            <a href="#" className="flex items-center gap-3 no-underline" style={{ textDecoration: 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border"
                style={{ background: 'rgba(0,102,255,0.07)', borderColor: 'rgba(0,102,255,0.2)' }}>
                <img src="/favicon.ico" alt="Mattar Clinic" className="w-7 h-7 object-contain" />
              </div>
              <div className="font-display tracking-wide" style={{ fontSize: '21px', fontWeight: 600, color: 'var(--ink)' }}>
                Mattar <span style={{ color: 'var(--blue)' }}>Clinic</span>
              </div>
            </a>

            {/* Desktop Nav */}
            <ul className="hidden md:flex items-center gap-9 m-0 p-0 list-none">
              {[
                { href: '#about', ar: 'عن الدكتور', en: 'About' },
                { href: '#specialties', ar: 'التخصصات', en: 'Specialties' },
                { href: '#clinics', ar: 'العيادات', en: 'Clinics' },
                { href: '#book', ar: 'احجز موعد', en: 'Book' },
              ].map(item => (
                <li key={item.href} style={{ listStyle: 'none' }}>
                  <a
                    href={item.href}
                    className="nav-link font-ui"
                    style={{
                      color: isDark ? 'rgba(240,237,232,0.55)' : 'rgba(15,23,42,0.5)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                    }}
                  >
                    {isAr ? item.ar : item.en}
                  </a>
                </li>
              ))}
            </ul>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-ui transition-all"
                style={{
                  background: 'rgba(0,102,255,0.07)',
                  color: 'var(--blue)',
                  border: '1px solid rgba(0,102,255,0.18)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang.toUpperCase()}</span>
              </button>

              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(0,102,255,0.07)',
                  color: 'var(--blue)',
                  border: '1px solid rgba(0,102,255,0.18)',
                }}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-ui btn-blue"
                  style={{
                    background: 'var(--blue)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(0,102,255,0.32)',
                  }}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('dashboard')}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-lg font-ui btn-blue"
                  style={{
                    background: 'var(--blue)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(0,102,255,0.32)',
                  }}
                >
                  {isAr ? "تسجيل الدخول" : "Login"}
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* ════════════════════════════════
            HERO SECTION
        ════════════════════════════════ */}
        <section
          className="relative min-h-screen flex items-center overflow-hidden"
          style={{ paddingTop: '76px' }}
        >
          {/* Full background image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/young-handsome-physician-medical-robe-with-stethoscope.jpg"
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                display: 'block',
              }}
            />
            {/* Dark overlay for readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: isDark
                ? 'linear-gradient(105deg, rgba(6,13,31,0.93) 0%, rgba(6,13,31,0.82) 45%, rgba(6,13,31,0.45) 100%)'
                : 'linear-gradient(105deg, rgba(8,20,60,0.91) 0%, rgba(8,20,60,0.78) 45%, rgba(8,20,60,0.35) 100%)',
            }} />
            {/* Blue tint overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(0,102,255,0.18) 0%, transparent 60%)',
            }} />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full px-5 sm:px-8 py-16"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '48px',
              alignItems: 'center'
            }}>

            {/* ── Text Column ── */}
            <div style={{ maxWidth: 620 }}>

              {/* Available badge */}
              <div className="hero-badge inline-flex items-center gap-2.5 mb-8 px-4 py-2.5 rounded-full font-ui"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.35)',
                  color: '#4ade80',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}>
                <span className="relative w-2 h-2" style={{ display: 'inline-block' }}>
                  <span className="ripple-ring" style={{ background: '#22c55e' }} />
                  <span style={{
                    position: 'relative', display: 'block',
                    width: 8, height: 8, borderRadius: '50%', background: '#22c55e'
                  }} />
                </span>
                {isAr ? "الطبيب متاح الآن" : "Doctor Available Now"}
              </div>

              {/* Ornament */}
              <div className="hero-ornament mb-5" style={{ width: 'fit-content' }}>
                {isAr ? "طبيب باطنة وجهاز هضمي" : "Internal Medicine & Gastroenterology"}
              </div>

              {/* Name */}
              <h1 className="hero-title font-display leading-tight mb-4"
                style={{ fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 600, lineHeight: 1.08, color: '#fff' }}>
                {isAr ? (
                  <>د. أيمن<br /><span style={{ color: '#60a5fa' }}>أحمد مطر</span></>
                ) : (
                  <>Dr. Ayman<br /><span style={{ color: '#60a5fa' }}>Ahmed Mattar</span></>
                )}
              </h1>

              {/* Specialty tags */}
              <div className="hero-sub flex flex-wrap gap-2 mb-8">
                {(isAr
                  ? ["طبيب الباطنة", "الجهاز الهضمي", "المناظير"]
                  : ["Internal Medicine", "Gastroenterology", "Endoscopy"]
                ).map((tag, i) => (
                  <span key={i} className="font-ui px-3 py-1.5 rounded-full"
                    style={{
                      background: i === 0 ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
                      color: i === 0 ? '#fff' : 'rgba(255,255,255,0.85)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="hero-body font-ui mb-10"
                style={{
                  fontSize: '15px',
                  lineHeight: 1.95,
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 400,
                  maxWidth: 520,
                }}>
                {isAr
                  ? "طبيب متخصص في أمراض الباطنة العامة والجهاز الهضمي والمناظير، تخرج من كلية الطب – جامعة الأزهر. د. ماجستير في أمراض الباطنة العامة جامعة القاهرة (القصر العيني)، بالإضافة إلى دبلومة في إدارة المستشفيات."
                  : "Physician specializing in Internal Medicine, Gastroenterology and Endoscopy. Graduated from Al-Azhar University Faculty of Medicine. Dr. M.D. in Internal Medicine — Cairo University (Kasr Al Ainy), with a Diploma in Hospital Management."}
              </p>

              {/* Credentials */}
              <div className="hero-creds flex flex-col gap-2.5 mb-10">
                {[
                  { icon: <GraduationCap className="w-4 h-4" />, text: isAr ? "كلية الطب — جامعة الأزهر" : "Faculty of Medicine — Al-Azhar University" },
                  { icon: <Building2 className="w-4 h-4" />, text: isAr ? "د. ماجستير أمراض الباطنة — جامعة القاهرة (القصر العيني)" : "Dr. M.D. Internal Medicine — Cairo University (Kasr Al Ainy)" },
                  { icon: <Award className="w-4 h-4" />, text: isAr ? "دبلومة إدارة المستشفيات" : "Diploma in Hospital Management" },
                ].map((item, i) => (
                  <div key={i} className="cred-item flex items-center gap-3 px-4 py-3 rounded-xl border font-ui"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.82)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    <span style={{ color: '#60a5fa', flexShrink: 0 }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="hero-btns flex flex-wrap gap-3">
                <Link
                  to="/book-guest"
                  className="btn-blue flex items-center gap-2.5 px-7 py-4 rounded-xl font-ui"
                  style={{
                    background: 'var(--blue)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    boxShadow: '0 6px 24px rgba(0,102,255,0.5)',
                    textDecoration: 'none',
                  }}
                >
                  <Calendar className="w-4 h-4" />
                  {isAr ? "احجز موعدك الآن" : "Book Appointment"}
                </Link>

                <Link
                  to="/appointments/lookup"
                  className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-ui transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.16)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Search className="w-4 h-4" />
                  {t("manageBooking")}
                </Link>

                <a
                  href="https://wa.me/201206070140"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-ui transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(37,211,102,0.15)',
                    color: '#4ade80',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(37,211,102,0.35)',
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  {isAr ? "واتساب" : "WhatsApp"}
                </a>
              </div>

              {/* Stats row */}
              <div className="hero-stats flex flex-wrap gap-6 mt-10 pt-8"
                style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                {[
                  { val: '+5', label: isAr ? 'سنوات خبرة' : 'Years Exp.' },
                  { val: '2', label: isAr ? 'عيادات' : 'Clinics' },
                  { val: '3', label: isAr ? 'مستشفيات' : 'Hospitals' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="stat-num" style={{ fontSize: '34px', color: '#60a5fa' }}>{s.val}</div>
                    <div className="font-ui" style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.42)',
                      marginTop: '2px',
                    }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Doctor Image Column — hidden since image is now the background ── */}
            <div className="hidden" />

          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ opacity: 0.5 }}>
            <span className="font-ui" style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#93c5fd' }}>scroll</span>
            <ChevronDown className="w-4 h-4" style={{ color: '#93c5fd' }} />
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            TRUST SECTION
        ════════════════════════════════ */}
        <section className="py-16 px-5 sm:px-8" style={{ background: isDark ? 'rgba(15,23,42,0.6)' : '#fff' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Shield className="w-5 h-5" />, title: isAr ? "طبيب متخصص" : "Certified Physician", sub: isAr ? "د. ماجستير القاهرة" : "Dr. M.D. Cairo University" },
                { icon: <Star className="w-5 h-5" />, title: isAr ? "خبرة +٥ سنوات" : "+5 Years Experience", sub: isAr ? "في كبرى المستشفيات" : "At top hospitals" },
                { icon: <Users className="w-5 h-5" />, title: isAr ? "آلاف المرضى" : "Thousands of Patients", sub: isAr ? "معالجون بنجاح" : "Successfully treated" },
                { icon: <Clock className="w-5 h-5" />, title: isAr ? "حجز سريع" : "Fast Booking", sub: isAr ? "تأكيد فوري" : "Instant confirmation" },
              ].map((item, i) => (
                <div key={i} className="trust-badge text-center p-6 rounded-2xl border"
                  style={{
                    background: 'rgba(0,102,255,0.025)',
                    borderColor: 'rgba(0,102,255,0.1)',
                  }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(0,102,255,0.08)', color: 'var(--blue)' }}>
                    {item.icon}
                  </div>
                  <div className="font-ui" style={{ fontSize: '13px', fontWeight: 700, color: isDark ? 'rgba(240,237,232,0.9)' : 'var(--ink)', marginBottom: '3px' }}>
                    {item.title}
                  </div>
                  <div className="font-ui" style={{ fontSize: '11px', color: isDark ? 'rgba(240,237,232,0.4)' : 'rgba(15,23,42,0.43)', fontWeight: 400 }}>
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            ABOUT SECTION
        ════════════════════════════════ */}
        <section id="about" className="py-24 px-5 sm:px-8"
          style={{ background: 'var(--mist)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Image */}
              <div className="reveal relative">
                <div className="relative overflow-hidden" style={{ borderRadius: '24px', aspectRatio: '4/5' }}>
                  <img
                    src="/doctor.png"
                    alt="Dr. Ayman Mattar"
                    className="img-zoom w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/young-handsome-physician-medical-robe-with-stethoscope.jpg'; }}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)', opacity: 0.6 }} />
                </div>

                {/* Experience badge */}
                <div
                  className="absolute text-center py-5 px-6 z-10"
                  style={{
                    bottom: -18,
                    right: isRtl ? 'auto' : -18,
                    left: isRtl ? -18 : 'auto',
                    background: 'var(--blue)',
                    borderRadius: '18px',
                    boxShadow: '0 12px 36px rgba(0,102,255,0.4)',
                  }}
                >
                  <span className="font-display text-white block" style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>+5</span>
                  <span className="font-ui text-white block mt-1" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.9 }}>
                    {isAr ? "سنوات خبرة" : "Years Exp"}
                  </span>
                </div>

                {/* Decorative border frame */}
                <div className="absolute pointer-events-none"
                  style={{ top: 18, left: 18, right: 18, bottom: 18, borderRadius: '20px', border: '1px solid rgba(0,102,255,0.14)', zIndex: -1 }} />
              </div>

              {/* Text */}
              <div className="reveal delay-2">
                <div className="ornament mb-6" style={{ width: 'fit-content', fontSize: '9px' }}>
                  {isAr ? "نبذة عن الطبيب" : "About the Doctor"}
                </div>

                <h2 className="font-display mb-1 blue-line" style={{ fontSize: 'clamp(36px, 4vw, 54px)', fontWeight: 600, lineHeight: 1.15 }}>
                  {isAr ? "دكتور " : "Dr. "}
                  <span style={{ color: 'var(--blue)' }}>{isAr ? "أيمن مطر" : "Ayman Mattar"}</span>
                </h2>

                <p className="font-ui mt-4 mb-2"
                  style={{ fontSize: '14px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.05em' }}>
                  {isAr
                    ? "طبيب باطنة وجهاز هضمي ومناظير"
                    : "Physician — Internal Medicine, GIT & Endoscopy"}
                </p>

                <p className="font-ui mt-6 mb-10"
                  style={{
                    fontSize: '14.5px',
                    lineHeight: 2.0,
                    color: isDark ? 'rgba(240,237,232,0.62)' : 'rgba(15,23,42,0.58)',
                  }}>
                  {isAr
                    ? "طبيب متخصص في أمراض الباطنة العامة والجهاز الهضمي والمناظير، تخرج من كلية الطب – جامعة الأزهر. د. ماجستير في أمراض الباطنة العامة جامعة القاهرة (القصر العيني)، بالإضافة إلى دبلومة في إدارة المستشفيات. يعمل في عدد من أبرز المستشفيات والمراكز الطبية بالقاهرة، منها مستشفى السلام الدولي بالمعادي ومستشفى المعلمين بالزمالك، كما يعمل بمعهد الكبد القومي."
                    : "Physician specializing in Internal Medicine, Gastroenterology and Endoscopy, graduated from the Faculty of Medicine at Al-Azhar University. Dr. M.D. in Internal Medicine — Cairo University (Kasr Al Ainy), along with a Diploma in Hospital Management. He practices at leading medical institutions in Cairo including As-Salam International Hospital in Maadi, Teachers Hospital in Zamalek, and the National Liver Institute."}
                </p>

                <div className="flex flex-col gap-3">
                  {[
                    isAr
                      ? "طبيب باطنة — مستشفى السلام الدولي (المعادي) ومستشفى المعلمين (الزمالك)"
                      : "Internal Medicine Physician — As-Salam International Hospital (Maadi) & Teachers Hospital (Zamalek)",
                    isAr
                      ? "طبيب جهاز هضمي — معهد الكبد القومي — القاهرة"
                      : "Gastroenterology Physician — National Liver Institute — Cairo",
                    isAr
                      ? "د. ماجستير أمراض الباطنة — جامعة القاهرة (القصر العيني)"
                      : "Dr. M.D. Internal Medicine — Cairo University (Kasr Al Ainy)",
                    isAr
                      ? "دبلومة إدارة المستشفيات"
                      : "Diploma in Hospital Management",
                  ].map((text, i) => (
                    <div key={i} className="cred-item flex items-start gap-4 px-5 py-4 rounded-xl border"
                      style={{ background: 'rgba(0,102,255,0.025)', borderColor: 'rgba(0,102,255,0.08)' }}>
                      <span className="font-display shrink-0 mt-0.5"
                        style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 700, minWidth: 28, lineHeight: 1.4 }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-ui"
                        style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.7, color: isDark ? 'rgba(240,237,232,0.76)' : 'rgba(15,23,42,0.68)' }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            SPECIALTIES SECTION
        ════════════════════════════════ */}
        <section id="specialties" className="py-24 px-5 sm:px-8"
          style={{ background: isDark ? 'rgba(15,23,42,0.6)' : '#fff' }}>
          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-16 reveal">
              <div className="ornament justify-center mb-5" style={{ fontSize: '9px' }}>
                {isAr ? "ما نقدمه" : "What We Offer"}
              </div>
              <h2 className="font-display section-title-line"
                style={{ fontSize: 'clamp(34px, 4.5vw, 54px)', fontWeight: 600, lineHeight: 1.15 }}>
                {isAr ? "التخصصات " : "Medical "}
                <span style={{ color: 'var(--blue)' }}>{isAr ? "الطبية" : "Specialties"}</span>
              </h2>
              <p className="font-ui mt-6 mx-auto"
                style={{ maxWidth: 480, fontSize: '14px', lineHeight: 1.85, color: isDark ? 'rgba(240,237,232,0.5)' : 'rgba(15,23,42,0.48)', fontWeight: 400 }}>
                {isAr
                  ? "نقدم خدمات طبية متكاملة في مجال الباطنة والجهاز الهضمي والمناظير بأعلى معايير الجودة"
                  : "Comprehensive medical services in Internal Medicine, Gastroenterology and Endoscopy to the highest standards"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: <HeartPulse className="w-5 h-5" />, title: isAr ? "أمراض الباطنة العامة" : "General Internal Medicine", desc: isAr ? "تشخيص وعلاج أمراض القلب، الضغط، السكر، الكلى، وجميع أمراض الجهاز الداخلي." : "Diagnosis and treatment of cardiovascular diseases, hypertension, diabetes, kidney conditions, and internal disorders." },
                { icon: <Activity className="w-5 h-5" />, title: isAr ? "أمراض الجهاز الهضمي" : "Gastroenterology", desc: isAr ? "تخصص في أمراض المعدة، الأمعاء، القولون، الكبد، والبنكرياس." : "Specialized care for stomach, intestinal, colon, liver, and pancreatic conditions." },
                { icon: <EndoscopeIcon className="w-5 h-5" />, title: isAr ? "وحدة المناظير" : "Endoscopy Unit", desc: isAr ? "مناظير الجهاز الهضمي التشخيصية والعلاجية بدقة وأمان تام." : "Diagnostic and therapeutic gastrointestinal endoscopies with precision and safety." },
                { icon: <Microscope className="w-5 h-5" />, title: isAr ? "متابعة الأمراض المزمنة" : "Chronic Disease Management", desc: isAr ? "متابعة طويلة المدى لمرضى السكري وضغط الدم وبروتوكولات علاجية متكاملة." : "Long-term follow-up for diabetes, hypertension, and comprehensive treatment protocols." },
                { icon: <Stethoscope className="w-5 h-5" />, title: isAr ? "الفحص الدوري الشامل" : "Comprehensive Check-up", desc: isAr ? "برامج فحص دوري متكاملة لاكتشاف الأمراض مبكراً والحفاظ على الصحة." : "Comprehensive health screening programs for early disease detection and prevention." },
                { icon: <ClipboardList className="w-5 h-5" />, title: isAr ? "إدارة الرعاية الصحية" : "Healthcare Management", desc: isAr ? "رعاية منهجية بأعلى معايير الجودة بفضل دبلومة إدارة المستشفيات." : "Systematic care to the highest quality standards with a Hospital Management Diploma." },
              ].map((spec, i) => (
                <div key={i}
                  className={`spec-card reveal delay-${Math.min(i + 1, 5)} relative overflow-hidden rounded-[22px] p-8 border`}
                  style={{ background: isDark ? 'rgba(15,23,42,0.85)' : '#fff', borderColor: 'rgba(0,102,255,0.1)' }}
                >
                  {/* Top blue accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,102,255,0.5), transparent)' }} />

                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                    style={{ background: 'rgba(0,102,255,0.07)', color: 'var(--blue)', border: '1px solid rgba(0,102,255,0.14)' }}>
                    {spec.icon}
                  </div>

                  <h3 className="font-display mb-3" style={{ fontSize: '21px', fontWeight: 600 }}>
                    {spec.title}
                  </h3>
                  <p className="font-ui"
                    style={{ fontSize: '13.5px', lineHeight: 1.85, color: isDark ? 'rgba(240,237,232,0.52)' : 'rgba(15,23,42,0.5)' }}>
                    {spec.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            CLINICS SECTION
        ════════════════════════════════ */}
        <section id="clinics" className="py-24 px-5 sm:px-8"
          style={{ background: 'var(--mist)' }}>
          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-16 reveal">
              <div className="ornament justify-center mb-5" style={{ fontSize: '9px' }}>
                {isAr ? "مواقعنا" : "Locations"}
              </div>
              <h2 className="font-display section-title-line"
                style={{ fontSize: 'clamp(34px, 4.5vw, 54px)', fontWeight: 600, lineHeight: 1.15 }}>
                {isAr ? "العيادات " : "Our "}
                <span style={{ color: 'var(--blue)' }}>{isAr ? "والمستشفيات" : "Clinics"}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: isAr ? "مستشفى السلام الدولي" : "As-Salam International Hospital",
                  location: isAr ? "المعادي، القاهرة" : "Maadi, Cairo",
                  type: isAr ? "طبيب باطنة" : "Internal Medicine",
                  icon: "🏥",
                },
                {
                  name: isAr ? "مستشفى المعلمين" : "Teachers Hospital",
                  location: isAr ? "الزمالك، القاهرة" : "Zamalek, Cairo",
                  type: isAr ? "طبيب باطنة" : "Internal Medicine",
                  icon: "🏥",
                },
                {
                  name: isAr ? "معهد الكبد القومي" : "National Liver Institute",
                  location: isAr ? "القاهرة" : "Cairo",
                  type: isAr ? "طبيب جهاز هضمي" : "Gastroenterology",
                  icon: "🔬",
                },
              ].map((clinic, i) => (
                <div key={i} className="clinic-card reveal delay-2 rounded-[22px] p-8 border"
                  style={{
                    background: isDark ? 'rgba(15,23,42,0.85)' : '#fff',
                    borderColor: 'rgba(0,102,255,0.12)',
                  }}>
                  <div className="text-4xl mb-5">{clinic.icon}</div>
                  <h3 className="font-display mb-2" style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.3 }}>
                    {clinic.name}
                  </h3>
                  <div className="font-ui mb-4 flex items-center gap-2"
                    style={{ fontSize: '12px', color: isDark ? 'rgba(240,237,232,0.45)' : 'rgba(15,23,42,0.43)', fontWeight: 500 }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--blue)' }} />
                    {clinic.location}
                  </div>
                  <span className="font-ui px-3 py-1.5 rounded-full inline-block"
                    style={{
                      background: 'rgba(0,102,255,0.07)',
                      color: 'var(--blue)',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(0,102,255,0.18)',
                    }}>
                    {clinic.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            BOOK CTA SECTION
        ════════════════════════════════ */}
        <section id="book" className="py-24 px-5 sm:px-8"
          style={{ background: isDark ? 'rgba(15,23,42,0.6)' : '#fff' }}>
          <div className="max-w-3xl mx-auto text-center reveal">
            <div className="ornament justify-center mb-6" style={{ fontSize: '9px' }}>
              {isAr ? "احجز الآن" : "Get Started"}
            </div>
            <h2 className="font-display mb-6"
              style={{ fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 600, lineHeight: 1.15 }}>
              {isAr ? "احجز موعدك " : "Book Your "}
              <span style={{ color: 'var(--blue)' }}>{isAr ? "اليوم" : "Appointment"}</span>
            </h2>
            <p className="font-ui mb-10 mx-auto"
              style={{ maxWidth: 460, fontSize: '15px', lineHeight: 1.9, color: isDark ? 'rgba(240,237,232,0.55)' : 'rgba(15,23,42,0.53)' }}>
              {isAr
                ? "تواصل معنا الآن لحجز موعدك مع الدكتور أيمن مطر في إحدى عياداتنا بالمعادي أو الزمالك."
                : "Contact us now to book your appointment with Dr. Ayman Mattar at our clinics in Maadi or Zamalek."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/book-guest"
                className="btn-blue flex items-center gap-3 px-8 py-4 rounded-xl font-ui"
                style={{
                  background: 'var(--blue)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 28px rgba(0,102,255,0.36)',
                  textDecoration: 'none',
                }}
              >
                <Calendar className="w-4 h-4" />
                {isAr ? "احجز موعد" : "Book Now"}
              </Link>
              <Link
                to="/appointments/lookup"
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-ui transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(0,102,255,0.06)',
                  color: 'var(--blue)',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(0,102,255,0.2)',
                  textDecoration: 'none',
                }}
              >
                <Search className="w-4 h-4" />
                {t("manageBooking")}
              </Link>
              <a
                href="tel:+201206070140"
                className="flex items-center gap-3 px-8 py-4 rounded-xl font-ui transition-all hover:-translate-y-0.5"
                style={{
                  background: 'rgba(0,102,255,0.06)',
                  color: 'var(--blue)',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(0,102,255,0.2)',
                  textDecoration: 'none',
                }}
              >
                <Phone className="w-4 h-4" />
                +201206070140
              </a>
            </div>
          </div>
        </section>

        <div className="py-4 flex justify-center"><div className="section-sep" /></div>

        {/* ════════════════════════════════
            FOOTER
        ════════════════════════════════ */}
        <footer style={{ background: '#060D1F', borderTop: '1px solid rgba(0,102,255,0.1)' }}>

          <div className="h-[1px] w-full" style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,102,255,0.35), transparent)'
          }} />

          <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-12 mb-12">

              {/* Brand */}
              <div>
                <a href="#" className="flex items-center gap-3 no-underline mb-5" style={{ textDecoration: 'none' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)' }}>
                    <EndoscopeIcon className="w-5 h-5" style={{ color: '#3385FF' }} />
                  </div>
                  <span className="font-display text-white tracking-wide" style={{ fontSize: '20px', fontWeight: 600 }}>
                    Mattar <span style={{ color: '#3385FF' }}>Clinic</span>
                  </span>
                </a>
                <p className="font-ui"
                  style={{ fontSize: '13px', lineHeight: 1.9, color: 'rgba(240,237,232,0.36)', maxWidth: 300 }}>
                  {isAr
                    ? "عيادة د. أيمن أحمد مطر — طبيب الباطنة، الجهاز الهضمي والمناظير. الحجوزات متاحة في المعادي والزمالك."
                    : "Dr. Ayman Ahmed Mattar Clinic — Internal Medicine, Endoscopy & GIT Physician. Bookings in Maadi & Zamalek."}
                </p>

                {/* Contact info */}
                <div className="mt-6 flex flex-col gap-3">
                  <a href="tel:+201206070140" className="footer-link font-ui flex items-center gap-2.5"
                    style={{ fontSize: '13px', color: 'rgba(240,237,232,0.36)', textDecoration: 'none' }} dir="ltr">
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: '#3385FF' }} />
                    +201206070140
                  </a>
                  <a href="https://wa.me/201206070140" target="_blank" rel="noopener noreferrer"
                    className="footer-link font-ui flex items-center gap-2.5"
                    style={{ fontSize: '13px', color: 'rgba(240,237,232,0.36)', textDecoration: 'none' }}>
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" style={{ color: '#25d366' }} />
                    WhatsApp
                  </a>
                  <div className="font-ui flex items-center gap-2.5"
                    style={{ fontSize: '13px', color: 'rgba(240,237,232,0.36)' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#3385FF' }} />
                    {isAr ? "المعادي، الزمالك، القاهرة" : "Maadi, Zamalek, Cairo"}
                  </div>
                </div>
              </div>

              {/* Links */}
              <div>
                <div className="font-ui mb-5"
                  style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#3385FF' }}>
                  {isAr ? "روابط سريعة" : "Quick Links"}
                </div>
                <ul className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {[
                    { href: '#about', ar: 'عن الدكتور', en: 'About' },
                    { href: '#specialties', ar: 'التخصصات', en: 'Specialties' },
                    { href: '#clinics', ar: 'العيادات', en: 'Clinics' },
                    { href: '#book', ar: 'احجز موعد', en: 'Book Now' },
                  ].map(link => (
                    <li key={link.href}>
                      <a href={link.href} className="footer-link font-ui"
                        style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(240,237,232,0.36)', textDecoration: 'none' }}>
                        {isAr ? link.ar : link.en}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Specialties */}
              <div>
                <div className="font-ui mb-5"
                  style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#3385FF' }}>
                  {isAr ? "التخصصات" : "Specialties"}
                </div>
                <ul className="flex flex-col gap-3" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {(isAr
                    ? ["أمراض الباطنة", "الجهاز الهضمي", "المناظير", "الأمراض المزمنة"]
                    : ["Internal Medicine", "Gastroenterology", "Endoscopy", "Chronic Disease"]
                  ).map((item, i) => (
                    <li key={i}>
                      <span className="footer-link font-ui flex items-center gap-2"
                        style={{ fontSize: '13px', color: 'rgba(240,237,232,0.36)' }}>
                        <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: '#3385FF', opacity: 0.6 }} />
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Footer bottom */}
            <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
              style={{ borderTop: '1px solid rgba(0,102,255,0.1)' }}>
              <span className="font-ui" style={{ fontSize: '11px', color: 'rgba(240,237,232,0.26)' }}>
                © {new Date().getFullYear()} <span style={{ color: '#3385FF' }}>Mattar Clinic</span>.{' '}
                {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
              </span>
              <span className="font-ui" style={{ fontSize: '11px', color: 'rgba(240,237,232,0.26)' }}>
                {isAr
                  ? "د. أيمن أحمد مطر — طبيب باطنة وجهاز هضمي"
                  : "Dr. Ayman Ahmed Mattar — Internal Medicine & GIT Physician"}
              </span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;

