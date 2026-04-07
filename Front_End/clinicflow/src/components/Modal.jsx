import React, { useEffect } from "react";
import { X } from "lucide-react";

const Modal = ({ open, onClose, title, children, maxWidth = "max-w-2xl" }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 lg:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className={`relative w-full ${maxWidth} bg-surface dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-outline overflow-hidden transform transition-all animate-fade-in duration-200 max-h-[95dvh] sm:max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="px-6 sm:px-10 py-5 sm:py-8 border-b border-outline flex items-center justify-between shrink-0">
          <h2 className="text-lg sm:text-2xl font-headline font-black tracking-tight text-on-surface truncate pr-4">{title}</h2>
          <button onClick={onClose}
            className="p-3 bg-surface-alt hover:bg-outline rounded-2xl transition-all text-on-surface-variant hover:text-on-surface shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="px-5 sm:px-10 py-6 sm:py-10 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
