import React, { useDeferredValue, useMemo, useState } from "react";
import Modal from "../Modal";
import { Search, Stethoscope, UserRound } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePatientsQuery } from "../../hooks/queries";
import { useInfinitePagination } from "../../hooks/useInfinitePagination";

const DoctorQuickSearchModal = ({ open, mode, onClose, onPick }) => {
  const { lang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const patientsQuery = usePatientsQuery(open);
  const patients = patientsQuery.data || [];

  const title =
    mode === "start"
      ? isAr
        ? "ابدأ زيارة"
        : "Start visit"
      : mode === "rx"
        ? isAr
          ? "إضافة روشتة"
          : "Add prescription"
        : isAr
          ? "فتح مريض"
          : "Open patient";

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return patients;

    return patients.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const phone = (p.phone || p.phoneNumber || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [patients, deferredQuery]);

  const { visibleItems, hasMore, loadMoreRef } = useInfinitePagination(filtered, 20);

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        <div className="relative group">
          <Search
            className={`absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors`}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم أو الهاتف..." : "Search by name or phone..."}
            className={`w-full ${isRtl ? "pr-12 pl-5" : "pl-12 pr-5"} py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-inner`}
            autoFocus
          />
        </div>

        {patientsQuery.isLoading ? (
          <div className="text-sm font-semibold text-slate-400">
            {isAr ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-sm font-semibold text-slate-400">
            {isAr ? "لا يوجد نتائج" : "No results"}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                className="w-full text-left rounded-[1.5rem] border border-slate-200 bg-white p-4 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                    {mode === "start" ? (
                      <Stethoscope className="w-5 h-5" />
                    ) : (
                      <UserRound className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 truncate">{p.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {p.phone || p.phoneNumber || (isAr ? "بدون رقم" : "No phone")}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {hasMore ? <div ref={loadMoreRef} className="h-6" /> : null}
      </div>
    </Modal>
  );
};

export default DoctorQuickSearchModal;

