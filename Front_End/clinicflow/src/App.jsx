import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import useSubdomain from "./hooks/useSubdomain";
import LoadingScreen from "./components/LoadingScreen";

// ─── Lazy Loaded Pages ──────────────────────────────────────────────────────
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const DoctorsPage = lazy(() => import("./pages/DoctorsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const GuestBookingPage = lazy(() => import("./pages/GuestBookingPage"));
const ManageBookingPage = lazy(() => import("./pages/ManageBookingPage"));
const DoctorSchedulePage = lazy(() => import("./pages/DoctorSchedulePage"));
const MedicalRecordPage = lazy(() => import("./pages/medical-record/MedicalRecordPage"));
const RegisterClinicPage = lazy(() => import("./pages/RegisterClinicPage"));
const SaaSManagementPage = lazy(() => import("./pages/SaaSManagementPage"));
const ClinicLandingPage = lazy(() => import("./pages/ClinicLandingPage"));
const ClinicPageSettingsPage = lazy(() => import("./pages/ClinicPageSettingsPage"));
const EncounterReportPage = lazy(() => import("./pages/medical-record/EncounterReportPage"));

const PublicClinicRoutes = ({ subdomain }) => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/" element={<ClinicLandingPage subdomain={subdomain} />} />
      <Route path="/book-guest" element={<GuestBookingPage />} />
      <Route path="/appointments/lookup" element={<ManageBookingPage />} />
      <Route path="/manage-booking" element={<Navigate to="/appointments/lookup" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

const MainRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-clinic" element={<RegisterClinicPage />} />
      <Route path="/book-guest" element={<GuestBookingPage />} />
      <Route path="/appointments/lookup" element={<ManageBookingPage />} />
      <Route path="/manage-booking" element={<Navigate to="/appointments/lookup" replace />} />
      <Route path="/clinic/:subdomain" element={<ClinicLandingPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute staffOnly><PatientsPage /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute staffOnly><MedicalRecordPage /></ProtectedRoute>} />
      <Route path="/doctors" element={<ProtectedRoute staffOnly><DoctorsPage /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute staffOnly><DoctorSchedulePage /></ProtectedRoute>} />
      <Route path="/doctor/schedule" element={<ProtectedRoute doctorOnly><DoctorSchedulePage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/clinic-page-settings" element={<ProtectedRoute adminOnly><ClinicPageSettingsPage /></ProtectedRoute>} />
      <Route path="/saas-management" element={<ProtectedRoute superAdminOnly><SaaSManagementPage /></ProtectedRoute>} />
      <Route path="/saas-features" element={<ProtectedRoute superAdminOnly><SaaSManagementPage initialTab="features" /></ProtectedRoute>} />
      <Route path="/encounter/:visitId/report" element={<ProtectedRoute staffOnly><EncounterReportPage /></ProtectedRoute>} />
      <Route path="/consultations" element={<Navigate to="/doctor/schedule" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);

const App = () => {
  const hostSubdomain = useSubdomain();

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <BrowserRouter>
            {hostSubdomain ? <PublicClinicRoutes subdomain={hostSubdomain} /> : <MainRoutes />}
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
