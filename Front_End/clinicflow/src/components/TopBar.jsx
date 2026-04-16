import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/api";
import {
  Globe,
  Search,
  Bell,
  User,
  Check,
  Trash2,
  LayoutDashboard,
  Clock,
  Menu,
  Sun,
  Moon,
  Keyboard
} from "lucide-react";
import GlobalSearchModal from "../pages/medical-record/GlobalSearchModal";


const TopBar = ({ title, onMenuClick, hideUserActions = false }) => {
  const { user, isAdmin, isDoctor, isReceptionist } = useAuth();
  const { lang, toggleLang, t, isRtl } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);


  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    if (hideUserActions) return;
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("clinicflow_token");
    if (user && token && !hideUserActions) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [user, hideUserActions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // â”€â”€ Global Keyboard Shortcuts â”€â”€
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      
      // Global Cancel (Esc)
      if (e.key === "Escape") {
        setShowSearch(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const getRoleLabel = () => {
    if (isAdmin) return lang === "ar" ? "Ù…Ø¯ÙŠØ±" : "Admin";
    if (isReceptionist) return lang === "ar" ? "Ù…ÙˆØ¸Ù Ø§Ø³ØªÙ‚Ø¨Ø§Ù„" : "Receptionist";
    if (isDoctor) return lang === "ar" ? "Ø·Ø¨ÙŠØ¨" : "Doctor";
    return lang === "ar" ? "Ù…Ø±ÙŠØ¶" : "Patient";
  };

  const getRoleColor = () => {
    if (isAdmin) return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    if (isReceptionist) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (isDoctor) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    return "bg-green-500/10 text-green-400 border-green-500/20";
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (lang === "ar") {
      if (diffInMins < 1) return "Ø§Ù„Ø¢Ù†";
      if (diffInMins < 60) return `Ù…Ù†Ø° ${diffInMins} Ø¯Ù‚ÙŠÙ‚Ø©`;
      if (diffInHours < 24) return `Ù…Ù†Ø° ${diffInHours} Ø³Ø§Ø¹Ø©`;
      return `Ù…Ù†Ø° ${diffInDays} Ø£ÙŠØ§Ù…`;
    }
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  return (
    <header className="h-[64px] lg:h-[80px] flex items-center justify-between px-3 sm:px-4 lg:px-8 bg-surface border-b border-outline shrink-0 relative z-40 gap-2">

      {/* LEFT: Menu + Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 shrink-0 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-surface-alt"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-headline truncate">
          {title}
        </h1>

        {title !== "Dashboard" && title !== "Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…" && (
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl border border-primary/10 transition-all font-bold text-[10px] uppercase tracking-widest shrink-0"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('dashboard')}</span>
          </Link>
        )}

        {/* Search â€” desktop only */}
        <div 
          onClick={() => setShowSearch(true)}
          className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-slate-100/50 border border-outline/10 rounded-2xl text-slate-400 hover:border-primary/20 hover:bg-white transition-all w-72 cursor-text shadow-inner group"
        >
          <Search className="w-4 h-4 group-hover:text-primary transition-colors shrink-0" />
          <span className="text-xs font-bold opacity-60 italic truncate">
            {lang === "ar" ? "Ø¨Ø­Ø« Ø¹Ù† Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ù…ÙˆØ¹Ø¯..." : "Search patients, phone..."}
          </span>
          <div className={`${isRtl ? 'mr-auto' : 'ml-auto'} flex items-center gap-1 opacity-40 shrink-0`}>
            <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border border-outline/10 shadow-sm">âŒ˜</span>
            <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg border border-outline/10 shadow-sm">K</span>
          </div>
        </div>
      </div>
      
      <GlobalSearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />


      {/* RIGHT: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 border border-outline hover:border-primary/40 text-slate-600 dark:text-slate-300 hover:text-primary transition-all font-black text-[10px] tracking-widest shadow-sm"
          title={lang === "en" ? "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "English"}
        >
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          <span>{lang === "en" ? "AR" : "EN"}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 border border-outline hover:border-primary/40 text-slate-600 dark:text-slate-300 hover:text-primary transition-all shadow-sm"
          title={isDark ? (lang === "ar" ? "Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù…Ø¶ÙŠØ¡" : "Light Mode") : (lang === "ar" ? "Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù„ÙŠÙ„ÙŠ" : "Dark Mode")}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500 animate-in zoom-in duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-400 animate-in zoom-in duration-300" />
          )}
        </button>

        {!hideUserActions && (
          <>
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 sm:p-2.5 rounded-xl lg:rounded-2xl transition-all relative border ${showNotifications
                  ? "text-primary bg-white border-primary/20 shadow-xl shadow-primary/10"
                  : "text-slate-400 bg-white border-outline hover:text-primary hover:border-primary/40"
                  }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[9px] sm:text-[10px] font-black text-white flex items-center justify-center rounded-lg ring-2 ring-white shadow-xl animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setShowNotifications(false)} />
                  <div className="z-50 animate-in fade-in duration-200 fixed left-3 right-3 top-[72px] sm:top-auto sm:absolute sm:left-auto sm:right-0 sm:mt-4 sm:w-96 bg-surface rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.25)] overflow-hidden border border-outline">
                    <div className="p-5 border-b border-outline flex items-center justify-between bg-surface-alt">
                      <h3 className="font-black text-xs text-on-surface uppercase tracking-widest">
                        {lang === "ar" ? "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª" : "Notifications"}
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-black text-white bg-primary px-3 py-1 rounded-full shadow-lg shadow-primary/20">
                          {unreadCount} {lang === "ar" ? "Ø¬Ø¯ÙŠØ¯" : "New"}
                        </span>
                      )}
                    </div>

                    <div className="max-h-[55vh] sm:max-h-[420px] overflow-y-auto custom-scrollbar bg-surface">
                      {notifications.length === 0 ? (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-400">
                          <div className="w-14 h-14 bg-surface-alt rounded-[1.5rem] flex items-center justify-center mb-4">
                            <Bell className="w-7 h-7 opacity-20" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest opacity-60">
                            {lang === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª" : "Empty Inbox"}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-outline flex gap-3 transition-all group relative ${!notif.isRead ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-surface-alt"
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.isRead ? "bg-primary ring-4 ring-primary/10" : "bg-transparent"}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-relaxed mb-1 ${!notif.isRead ? "text-on-surface font-bold" : "text-on-surface-variant font-medium"}`}>
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                <Clock className="w-3 h-3 opacity-40" />
                                {formatTime(notif.createdAt)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {!notif.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="p-2 bg-surface text-primary rounded-xl border border-outline hover:border-primary/40 shadow-sm transition-all"
                                  title={lang === "ar" ? "ØªØ­Ø¯ÙŠØ¯ ÙƒÙ…Ù‚Ø±ÙˆØ¡" : "Mark as read"}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notif.id)}
                                className="p-2 bg-surface text-error rounded-xl border border-outline hover:border-error/40 shadow-sm transition-all"
                                title={lang === "ar" ? "Ø­Ø°Ù" : "Delete"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4 bg-surface-alt border-t border-outline text-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-[11px] font-black text-slate-400 hover:text-primary transition-all uppercase tracking-[0.2em]"
                      >
                        {lang === "ar" ? "Ø¥ØºÙ„Ø§Ù‚" : "Close"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
              {/* Name + Role â€” hidden on small screens */}
              <div className={`${isRtl ? 'text-left' : 'text-right'} hidden md:block`}>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1.5 tracking-tight group-hover:text-primary transition-colors">
                  {user?.fullName || user?.email}
                </p>
                <span className={`inline-flex text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border shadow-sm leading-none ${getRoleColor()}`}>
                  {getRoleLabel()}
                </span>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-xl lg:rounded-2xl bg-white border border-outline group-hover:border-primary/30 flex items-center justify-center text-primary shadow-xl shadow-slate-200/20 transition-all duration-500 overflow-hidden">
                  {user?.fullName ? (
                    <span className="text-lg font-black">{user.fullName.charAt(0).toUpperCase()}</span>
                  ) : (
                    <User className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default TopBar;
