import React, { useMemo, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  Loader2,
  CalendarDays,
  Stethoscope,
  Edit2,
} from "lucide-react";
import Modal from "../components/Modal";
import Layout from "../components/Layout";
import { appointmentService, getFileUrl } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import { toast } from "react-hot-toast";
import { queryKeys, useAppointmentsQuery } from "../hooks/queries";
import { useInfinitePagination } from "../hooks/useInfinitePagination";

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang, isRtl } = useLanguage();
  const [statusModal, setModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [filter, setFilter] = useState("All");

  const isAr = lang === "ar";
  const bookingsQuery = useAppointmentsQuery(filter);
  const bookings = bookingsQuery.data || [];
  const loading = bookingsQuery.isLoading && bookings.length === 0;
  const refreshing = bookingsQuery.isFetching && bookings.length > 0;
  const updating = false;

  const STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed", "NoShow"];

  const getStatusLabel = (s) => {
    const map = {
      Pending: t("statusPending"),
      Confirmed: t("statusConfirmed"),
      Cancelled: t("statusCancelled"),
      Completed: t("statusCompleted"),
      NoShow: t("statusNoShow"),
    };
    return map[s] || s;
  };

  const STATUS_STYLES = {
    Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    Completed: "bg-primary/10 text-primary border-primary/20",
    NoShow: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const STATUS_ICONS = {
    Pending: <Clock className="w-4 h-4" />,
    Confirmed: <CheckCircle2 className="w-4 h-4" />,
    Cancelled: <XCircle className="w-4 h-4" />,
    Completed: <CheckCircle2 className="w-4 h-4" />,
    NoShow: <AlertCircle className="w-4 h-4" />,
  };

  const optimisticUpdateBooking = (bookingId, updater) => {
    const affectedKeys = ["All", filter];

    affectedKeys.forEach((filterKey) => {
      queryClient.setQueryData(queryKeys.appointments(filterKey), (current = []) =>
        current.map((booking) => (booking.id === bookingId ? updater(booking) : booking))
      );
    });
  };

  const optimisticRemoveBooking = (bookingId) => {
    const affectedKeys = ["All", filter];

    affectedKeys.forEach((filterKey) => {
      queryClient.setQueryData(queryKeys.appointments(filterKey), (current = []) =>
        current.filter((booking) => booking.id !== bookingId)
      );
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentService.updateStatus(id, { newStatus: status }),
    onMutate: async ({ id, status }) => {
      const previousAll = queryClient.getQueryData(queryKeys.appointments("All")) || [];
      const previousFiltered = queryClient.getQueryData(queryKeys.appointments(filter)) || [];
      optimisticUpdateBooking(id, (booking) => ({ ...booking, status }));
      return { previousAll, previousFiltered };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.appointments("All"), context?.previousAll || []);
      queryClient.setQueryData(queryKeys.appointments(filter), context?.previousFiltered || []);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id) => appointmentService.cancel(id),
    onMutate: async (id) => {
      const previousAll = queryClient.getQueryData(queryKeys.appointments("All")) || [];
      const previousFiltered = queryClient.getQueryData(queryKeys.appointments(filter)) || [];

      if (filter === "All") {
        optimisticUpdateBooking(id, (booking) => ({ ...booking, status: "Cancelled" }));
      } else {
        optimisticRemoveBooking(id);
      }

      return { previousAll, previousFiltered };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.appointments("All"), context?.previousAll || []);
      queryClient.setQueryData(queryKeys.appointments(filter), context?.previousFiltered || []);
    },
  });

  const filtered = useMemo(
    () => (filter === "All" ? bookings : bookings.filter((booking) => booking.status === filter)),
    [bookings, filter]
  );
  const {
    visibleItems: visibleBookings,
    hasMore: hasMoreBookings,
    loadMoreRef: bookingsLoadMoreRef,
  } = useInfinitePagination(filtered, 10);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const tid = toast.loading(t("updatingStatus"));

    try {
      await updateStatusMutation.mutateAsync({ id: statusModal.id, status: newStatus });
      toast.success(t("statusUpdated"), { id: tid });
      setModal(null);
    } catch {
      toast.error(t("updateFailed"), { id: tid });
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(t("confirmCancel"))) return;

    const tid = toast.loading(t("cancelling"));
    try {
      await cancelBookingMutation.mutateAsync(id);
      toast.success(t("cancelledSuccess"), { id: tid });
    } catch {
      toast.error(t("cancelledFailed"), { id: tid });
    }
  };

  return (
    <Layout title={t("myAppointments")}>
      <div className="max-w-6xl mx-auto space-y-12 pb-24" dir={isRtl ? "rtl" : "ltr"}>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-200 p-6 sm:p-10 lg:p-14 shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 font-headline mb-3 sm:mb-4">
              {t("myAppointments")}
            </h1>
            <p className="text-slate-500 text-sm sm:text-lg font-medium">{t("myAppointmentsSubtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: t("total"), status: "All", value: bookings.length },
            { label: t("statusConfirmed"), status: "Confirmed", value: bookings.filter((b) => b.status === "Confirmed").length },
            { label: t("statusPending"), status: "Pending", value: bookings.filter((b) => b.status === "Pending").length },
            { label: t("statusCancelled"), status: "Cancelled", value: bookings.filter((b) => b.status === "Cancelled").length },
          ].map(({ label, status, value }) => (
            <div
              key={label}
              onClick={() => startTransition(() => setFilter(status))}
              className={`card-premium p-4 sm:p-6 cursor-pointer group transition-all border-2 ${
                filter === status
                  ? "border-primary shadow-xl shadow-primary/10 scale-105"
                  : "border-transparent bg-white hover:border-slate-200"
              }`}
            >
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                {label}
              </p>
              <p className={`text-2xl sm:text-4xl font-black font-headline ${filter === status ? "text-slate-900" : "text-slate-300"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {refreshing && (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isAr ? "تحديث..." : "Refreshing..."}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-8" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {t("syncingRecords") || (isAr ? "جاري مزامنة السجلات..." : "Syncing records...")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-20 text-center animate-fade-in bg-white border border-slate-200">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 text-slate-200 border border-slate-100">
              <CalendarDays className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 font-headline">{t("noAppointmentsFound")}</h3>
            <p className="text-slate-500 font-medium mb-12 max-w-sm mx-auto leading-relaxed">
              {t("noAppointmentsFoundSubtitle")}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn-vibrant px-10 py-4 font-black text-xs uppercase tracking-widest"
            >
              {t("returnToDashboard")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 animate-fade-in">
            {visibleBookings.map((b) => (
              <div
                key={b.id}
                className="card-premium group p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-start md:items-center hover:border-primary/30 transition-all bg-white border border-slate-200"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-110 transition-all duration-500 shadow-sm">
                  {b.doctorPhoto ? (
                    <img src={getFileUrl(b.doctorPhoto)} alt={b.doctorName} className="w-full h-full object-cover" />
                  ) : (
                    <Stethoscope className="w-10 h-10 text-primary opacity-20" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <h3 className="text-2xl font-black text-slate-900">Dr. {b.doctorName}</h3>
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${STATUS_STYLES[b.status] || ""}`}>
                      <span className="opacity-60">{STATUS_ICONS[b.status]}</span>
                      {getStatusLabel(b.status)}
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      #{b.bookingReference}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-y-3 gap-x-8 text-sm font-medium">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar className="w-4 h-4 text-primary opacity-40" />
                      {b.slotDateTime
                        ? new Date(b.slotDateTime).toLocaleDateString(lang, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Clock className="w-4 h-4 text-primary opacity-40" />
                      {b.slotDateTime
                        ? new Date(b.slotDateTime).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </div>
                  </div>

                  {b.notes && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 italic leading-relaxed font-medium">
                      " {b.notes} "
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
                  {b.status !== "Cancelled" && b.status !== "Completed" && b.status !== "NoShow" && (
                    <>
                      <button
                        onClick={() => {
                          setModal(b);
                          setNewStatus(b.status);
                        }}
                        className="p-4 bg-slate-50 hover:bg-primary hover:text-white rounded-2xl transition-all border border-slate-100 group/btn"
                        title={t("updateStatus")}
                      >
                        <Edit2 className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                      </button>
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="p-4 bg-slate-50 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-slate-100 group/btn"
                        title={t("cancelAppointment")}
                      >
                        <XCircle className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {hasMoreBookings && (
              <div ref={bookingsLoadMoreRef} className="flex items-center justify-center py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isAr ? "تحميل المزيد" : "Loading more"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={!!statusModal} onClose={() => setModal(null)} title={t("updateStatus")} maxWidth="max-w-md">
        {statusModal && (
          <form onSubmit={handleUpdate} className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-lg">Dr. {statusModal.doctorName}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                  Ref: {statusModal.bookingReference}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">
                {isAr ? "الحالة الجديدة" : "New Status"}
              </label>
              <div className="relative group">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-700 font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none transition-all appearance-none shadow-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {getStatusLabel(s)}
                    </option>
                  ))}
                </select>
                <div className={`absolute ${isRtl ? "left-6" : "right-6"} top-1/2 -translate-y-1/2 pointer-events-none text-slate-300`}>
                  <Filter className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={updateStatusMutation.isPending || updating}
                className="flex-1 py-4 bg-primary text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("updatingStatus")}
                  </>
                ) : (
                  <>
                    {t("updateStatus")}
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
};

export default MyBookingsPage;
