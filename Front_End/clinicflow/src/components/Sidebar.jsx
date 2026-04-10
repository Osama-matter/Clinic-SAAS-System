import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UserRound,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  CalendarDays,
  CalendarPlus,
  Search,
  ChevronRight,
  Shield,
  Zap,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, isSuperAdmin, isDoctor } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();

  const getSections = () => {
    if (isAdmin || isSuperAdmin) {
      return [
        {
          label: lang === "ar" ? "نظرة عامة" : "Overview",
          items: [
            { label: t("dashboard"), icon: <LayoutDashboard className="w-[18px] h-[18px]" />, path: "/dashboard" },
            { label: lang === "ar" ? "الجدول" : "Calendar", icon: <CalendarDays className="w-[18px] h-[18px]" />, path: "/schedule" },
          ],
        },
        {
          label: lang === "ar" ? "الإدارة" : "Management",
          items: [
            { label: lang === "ar" ? "المرضى" : "Patients", icon: <Users className="w-[18px] h-[18px]" />, path: "/patients" },
            { label: t("doctors"), icon: <UserRound className="w-[18px] h-[18px]" />, path: "/doctors" },
            { label: lang === "ar" ? "حجز لمريض" : "Book for Patient", icon: <CalendarPlus className="w-[18px] h-[18px]" />, path: "/book-guest" },
            { label: lang === "ar" ? "بحث عن حجز" : "Search Booking", icon: <Search className="w-[18px] h-[18px]" />, path: "/manage-booking" },
          ],
        },
        {
          label: lang === "ar" ? "النظام" : "System",
          items: [
            { label: lang === "ar" ? "التقارير" : "Reports", icon: <BarChart3 className="w-[18px] h-[18px]" />, path: "/reports" },
            { label: lang === "ar" ? "الإعدادات" : "Settings", icon: <Settings className="w-[18px] h-[18px]" />, path: "/settings" },
            { label: lang === "ar" ? "صفحتي العامة" : "Public Page", icon: <Sparkles className="w-[18px] h-[18px]" />, path: "/clinic-page-settings" },
          ],
        },
        ...(isSuperAdmin
          ? [
              {
                label: lang === "ar" ? "المنصة" : "Platform",
                items: [
                  { label: lang === "ar" ? "إدارة الباقات" : "Manage Plans", icon: <Shield className="w-[18px] h-[18px]" />, path: "/saas-management" },
                  { label: lang === "ar" ? "المميزات" : "Features", icon: <Zap className="w-[18px] h-[18px]" />, path: "/saas-features" },
                ],
              },
            ]
          : []),
      ];
    }

    if (isDoctor) {
      return [
        {
          label: lang === "ar" ? "نظرة عامة" : "Overview",
          items: [
            { label: t("dashboard"), icon: <LayoutDashboard className="w-[18px] h-[18px]" />, path: "/dashboard" },
            { label: lang === "ar" ? "جدولي" : "My Schedule", icon: <Activity className="w-[18px] h-[18px]" />, path: "/doctor/schedule" },
          ],
        },
        {
          label: lang === "ar" ? "الدليل" : "Directory",
          items: [
            { label: lang === "ar" ? "المرضى" : "Patients", icon: <Users className="w-[18px] h-[18px]" />, path: "/patients" },
            { label: t("doctors"), icon: <UserRound className="w-[18px] h-[18px]" />, path: "/doctors" },
          ],
        },
      ];
    }

    return [
      {
        label: lang === "ar" ? "نظرة عامة" : "Overview",
        items: [{ label: t("dashboard"), icon: <LayoutDashboard className="w-[18px] h-[18px]" />, path: "/dashboard" }],
      },
      {
        label: lang === "ar" ? "المواعيد" : "Appointments",
        items: [
          { label: lang === "ar" ? "حجز موعد" : "Book Appointment", icon: <CalendarPlus className="w-[18px] h-[18px]" />, path: "/book-guest" },
          { label: lang === "ar" ? "حجوزاتي" : "My Bookings", icon: <CalendarCheck className="w-[18px] h-[18px]" />, path: "/appointments" },
        ],
      },
    ];
  };

  const sections = getSections();

  const handleLogout = () => {
    if (window.confirm(lang === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to log out?")) {
      logout();
      navigate("/login");
    }
  };

  const roleBadge = isSuperAdmin
    ? { label: lang === "ar" ? "مدير النظام" : "System Admin", color: "bg-red-500/10 text-red-400 border-red-500/20" }
    : isAdmin
      ? { label: lang === "ar" ? "مدير العيادة" : "Clinic Admin", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" }
      : isDoctor
        ? { label: lang === "ar" ? "طبيب" : "Doctor", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" }
        : { label: lang === "ar" ? "مريض" : "Patient", color: "bg-green-500/10 text-green-400 border-green-500/20" };

  return (
    <aside
      className={`fixed lg:sticky top-0 ${isRtl ? "right-0" : "left-0"} z-[70] lg:z-20 w-[280px] h-full bg-surface dark:bg-slate-900 border-${
        isRtl ? "l" : "r"
      } border-outline dark:border-white/5 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : isRtl ? "translate-x-full" : "-translate-x-full"
      }`}
    >
      <div className="px-8 h-[80px] flex items-center justify-between shrink-0 border-b border-outline bg-surface-alt">
        <NavLink to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="w-11 h-11 bg-primary rounded-[1rem] flex items-center justify-center shadow-xl shadow-primary/30 group-hover:rotate-6 transition-all duration-500">
            <Activity className="text-white w-6 h-6" />
          </div>
          <span className="font-headline font-black text-2xl tracking-tighter text-slate-900 dark:text-white leading-none">
            Royal<span className="text-primary italic">Clinic</span>
          </span>
        </NavLink>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-primary transition-colors">
          <ChevronRight className={`w-6 h-6 ${isRtl ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-8 overflow-y-auto custom-scrollbar">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-8">
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30 mb-4">{section.label}</p>
            <div className="space-y-1.5">
              {section.items.map((item, iIdx) => (
                <NavLink
                  key={`${item.path}-${iIdx}`}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-4 py-3.5 text-sm font-bold tracking-tight transition-all rounded-[1.25rem] relative group border border-transparent ${
                      isActive
                        ? "bg-white dark:bg-primary text-primary dark:text-white shadow-xl shadow-primary/5 border-primary/10"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className={`absolute ${isRtl ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-lg shadow-primary/50`} />
                      )}
                      <span className={`transition-all duration-300 ${isActive ? "text-primary scale-110" : "text-slate-400 group-hover:text-slate-900 group-hover:scale-110"}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-outline shrink-0 bg-surface-alt">
        {user && (
          <div className="px-4 py-4 flex items-center gap-4 mb-4 bg-surface rounded-2xl border border-outline shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex items-center justify-center text-primary shadow-inner shrink-0">
              <UserRound className="w-5 h-5" />
            </div>
            <div className="min-w-0 overflow-hidden flex-1">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight mb-1">{user.fullName || user.email}</p>
              <span className={`inline-flex text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border leading-none ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3.5 flex items-center gap-4 text-xs font-black tracking-widest uppercase text-slate-400 hover:text-error hover:bg-error/5 transition-all rounded-2xl group active:scale-95"
        >
          <LogOut className="w-4.5 h-4.5 group-hover:scale-110 group-hover:-translate-x-1 transition-all" />
          {lang === "ar" ? "تسجيل خروج" : "Logout"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
