import axios from "axios";

// ─── Base config ─────────────────────────────────────────────────────────────
const defaultApiBaseUrl = "https://clinicore.runasp.net/api";

export const API_BASE_URL = "https://clinicore.runasp.net/api";



const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Helper to get full URL for uploaded files
export const getFileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("data:")) return path; // Base64 support

  const baseUrl = API_BASE_URL.replace("/api", "");
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

// Flag to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};
// ─── Attach JWT and Tenant ID on every request ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("clinicflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const tenantId = localStorage.getItem("clinicflow_tenantId");
  if (tenantId) config.headers["X-Tenant-Id"] = tenantId;

  return config;
});

export const clinicService = {
  getAll: () => api.get("/Tenants"),
  create: (data) => api.post("/Tenants", data),
  update: (id, data) => api.put(`/Tenants/${id}`, data),
  delete: (id) => api.delete(`/Tenants/${id}`),
  setSelectedClinicId: (id) => localStorage.setItem("clinicflow_tenantId", id),
  getSelectedClinicId: () => localStorage.getItem("clinicflow_tenantId"),
  clearSelectedClinic: () => localStorage.removeItem("clinicflow_tenantId"),
};

// ─── Refresh Token Logic ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // If error is 401 and not already retrying
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("clinicflow_refreshToken");
      const accessToken = localStorage.getItem("clinicflow_token");

      if (!refreshToken) {
        logoutAndRedirect();
        return Promise.reject(err);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/Auth/refresh-token`, {
          accessToken,
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

        localStorage.setItem("clinicflow_token", newAccessToken);
        localStorage.setItem("clinicflow_refreshToken", newRefreshToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logoutAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

const logoutAndRedirect = () => {
  localStorage.removeItem("clinicflow_token");
  localStorage.removeItem("clinicflow_refreshToken");
  localStorage.removeItem("clinicflow_user");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH — /api/Auth
//  POST /api/Auth/register          → Register a new user account
//  POST /api/Auth/login             → Login and receive JWT tokens
//  POST /api/Auth/refresh-token     → Refresh access token
//  POST /api/Auth/create-admin      → Create a new admin user (Admin only)
// ═══════════════════════════════════════════════════════════════════════════════
export const authService = {
  register: (data) =>
    api.post("/Auth/register", data),

  login: (data) =>
    api.post("/Auth/login", data),

  refreshToken: (data) =>
    api.post("/Auth/refresh-token", data),

  createAdmin: (data) => api.post("/auth/create-admin", {
    name: data.fullName,
    email: data.email,
    password: data.password
  }),

  // Clinic Profile & Uploads
  uploadClinicImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/clinic-image", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },

  updateClinicProfile: (id, data) => api.put(`/tenants/${id}`, data),
  getClinicProfile: (id) => api.get(`/tenants/${id}`),
};


// ═══════════════════════════════════════════════════════════════════════════════
//  APPOINTMENTS — /api/Appointments
//  POST   /api/Appointments/book          → Book an PatientAppointment
//  GET    /api/Appointments/my            → Get my Appointments
//  PUT    /api/Appointments/{id}/status   → Update PatientAppointment status
//  DELETE /api/Appointments/{id}          → Cancel an PatientAppointment
// ═══════════════════════════════════════════════════════════════════════════════
export const appointmentService = {
  book: (data) =>
    api.post("/Appointments/book", data),

  getMy: (params) =>
    api.get("/Appointments/my", { params }),

  updateStatus: (id, data) =>
    api.put(`/Appointments/${id}/status`, data),

  cancel: (id) =>
    api.delete(`/Appointments/${id}`),

  // ── Public (Guest) Bookings
  publicBook: (data) =>
    api.post("/Appointments/public", data),

  publicLookup: (data) =>
    api.post("/Appointments/public/lookup", data),
  publicSearch: (params) =>
    api.get("/Appointments/public/search", { params }),
  publicReschedule: (data) =>
    api.put("/Appointments/public/reschedule", data),
  publicCancel: (data) =>
    api.delete("/Appointments/public/cancel", { data }),

  // ── Doctor Specific
  getDoctorSchedule: (params) =>
    api.get("/Appointments/my-schedule", { params }),

  addNotes: (id, data) =>
    api.patch(`/Appointments/${id}/notes`, data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DOCTORS — /api/Doctors
//  GET    /api/Doctors            → List doctors (specialty, isActive)
//  POST   /api/Doctors            → Create doctor
//  GET    /api/Doctors/{id}       → Get doctor details
//  PUT    /api/Doctors/{id}       → Update doctor
//  DELETE /api/Doctors/{id}       → Delete doctor
// ═══════════════════════════════════════════════════════════════════════════════
export const doctorService = {
  getAll: (params) =>
    api.get("/Doctors", { params }),

  getById: (id) =>
    api.get(`/Doctors/${id}`),

  create: (data) =>
    api.post("/Doctors", data),

  update: (id, data) =>
    api.put(`/Doctors/${id}`, data),

  delete: (id) =>
    api.delete(`/Doctors/${id}`),

  getAvailableSlots: (id, params) =>
    api.get(`/Doctors/${id}/slots`, { params }),

  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(`/Doctors/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  toggleActive: (doc) =>
    api.put(`/Doctors/${doc.id}`, {
      id: doc.id,
      name: doc.name,
      specialty: doc.specialty,
      bio: doc.bio || "",
      photo: doc.photo || "",
      isActive: !doc.isActive,
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHEDULES — /api/Schedules
// ═══════════════════════════════════════════════════════════════════════════════
export const scheduleService = {
  getByDoctor: (doctorId) =>
    api.get(`/Schedules/doctor/${doctorId}`),

  create: (data) =>
    api.post("/Schedules", data),

  update: (id, data) =>
    api.put(`/Schedules/${id}`, data),

  delete: (id) =>
    api.delete(`/Schedules/${id}`),
};


// ═══════════════════════════════════════════════════════════════════════════════
//  PATIENTS — /api/Auth/patients
// ═══════════════════════════════════════════════════════════════════════════════
export const patientService = {
  getAll: (params) =>
    api.get("/Auth/patients", { params }),
};

export const reportService = {
  getAttendance: (params) =>
    api.get("/Reports/attendance", { params }),

  exportReport: (params) =>
    api.get("/Reports/export", { params, responseType: "blob" }),
};

export const notificationService = {
  getAll: () =>
    api.get("/Notifications"),

  markAsRead: (id) =>
    api.put(`/Notifications/${id}/read`),

  delete: (id) =>
    api.delete(`/Notifications/${id}`),
};

export const medicalPatientService = {
  getAll: () => api.get("/Patients"),
  getById: (id) => api.get(`/Patients/${id}`),
  create: (data) => api.post("/Patients", data),
  update: (id, data) => api.put(`/Patients/${id}`, data),
  delete: (id) => api.delete(`/Patients/${id}`),
  updateComprehensive: (id, data) => api.put(`/Visits/${id}/comprehensive`, data) // Fallback or extra
};

export const visitService = {
  getById: (id) => api.get(`/Visits/${id}`),
  getByPatient: (patientId) => api.get(`/Visits/patient/${patientId}`),
  create: (data) => api.post("/Visits", data),
  createComprehensive: (data) => api.post("/Visits/comprehensive", data),
  addVitals: (id, data) => api.post(`/Visits/${id}/vitals`, data),
  addPrescription: (id, data) => api.post(`/Visits/${id}/prescriptions`, data),
  addDiagnosis: (id, data) => api.post(`/Visits/${id}/diagnoses`, data),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/Visits/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  updateComprehensive: (id, data) => api.put(`/Visits/${id}`, data),
  delete: (id) => api.delete(`/Visits/${id}`)
};

export const drugService = {
  search: (query, take = 15) => api.get("/Drugs/search", { params: { query, take } }),
};

export default api;
