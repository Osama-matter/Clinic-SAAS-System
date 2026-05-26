import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  appointmentService,
  doctorService,
  medicalPatientService,
  notificationService,
  reportService,
  visitService,
} from "../services/api";

export const queryKeys = {
  dashboardStats: (roleKey) => ["dashboard-stats", roleKey],
  patients: ["patients"],
  appointments: (filterKey) => ["appointments", filterKey],
  doctorSchedule: (dateKey, statusKey) => ["doctor-schedule", dateKey, statusKey || "all"],
  notifications: ["notifications"],
  patientRecord: (patientId) => ["patient-record", patientId],
  patientVisits: (patientId) => ["patient-visits", patientId],
  doctors: ["doctors"],
};

export function useDashboardStatsQuery({ enabled, roleKey, isStaff, isPatient }) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(roleKey),
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      if (isStaff) {
        const response = await reportService.getAttendance();
        const source = response.data || {};
        return {
          totalBookings: source.totalAppointments || 0,
          confirmed: source.confirmedAppointments || 0,
          completed: source.completedAppointments || 0,
          noShow: source.noShowAppointments || 0,
        };
      }

      if (isPatient) {
        const response = await appointmentService.getMy();
        const bookings = Array.isArray(response.data) ? response.data : [];
        return {
          totalBookings: bookings.length,
          confirmed: bookings.filter((booking) => booking.status === "Confirmed").length,
          completed: bookings.filter((booking) => booking.status === "Completed").length,
          noShow: bookings.filter((booking) => booking.status === "NoShow").length,
        };
      }

      return {
        totalBookings: 0,
        confirmed: 0,
        completed: 0,
        noShow: 0,
      };
    },
  });
}

export function usePatientsQuery(enabled = true, page = 1, pageSize = 24, searchTerm = "") {
  return useQuery({
    queryKey: [...queryKeys.patients, page, pageSize, searchTerm],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await medicalPatientService.getAll({ page, pageSize, searchTerm });
      return response.data;
    },
  });
}

export function useInfinitePatientsQuery(enabled = true, searchTerm = "") {
  return useInfiniteQuery({
    queryKey: [...queryKeys.patients, "infinite", searchTerm],
    enabled,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await medicalPatientService.getAll({ 
        page: pageParam, 
        pageSize: 24, 
        searchTerm 
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < Math.ceil(lastPage.totalCount / lastPage.pageSize)) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });
}

export function useAppointmentsQuery(filter) {
  return useQuery({
    queryKey: queryKeys.appointments(filter || "All"),
    placeholderData: (previous) => previous,
    refetchInterval: 45 * 1000,
    queryFn: async () => {
      const response = await appointmentService.getMy({
        status: filter === "All" ? undefined : filter,
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useDoctorScheduleQuery({ date, status, enabled = true }) {
  const dateKey = date ? new Date(date).toISOString().slice(0, 10) : "none";

  return useQuery({
    queryKey: queryKeys.doctorSchedule(dateKey, status),
    enabled: enabled && !!date,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 1000,
    queryFn: async () => {
      const dateStr = new Date(date).toISOString().split("T")[0];
      const params = { date: dateStr, status: status ?? undefined };
      const response = await appointmentService.getDoctorSchedule(params);
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    enabled,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 1000,
    queryFn: async () => {
      const response = await notificationService.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function usePatientRecordQuery(patientId) {
  return useQuery({
    queryKey: queryKeys.patientRecord(patientId),
    enabled: !!patientId,
    queryFn: async () => {
      const response = await medicalPatientService.getById(patientId);
      return response.data;
    },
  });
}

export function usePatientVisitsQuery(patientId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.patientVisits(patientId),
    enabled: enabled && !!patientId,
    queryFn: async () => {
      const response = await visitService.getByPatient(patientId);
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useDoctorsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.doctors,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await doctorService.getAll();
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}
