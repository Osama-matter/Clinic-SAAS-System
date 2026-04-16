import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import useSubdomain from "./hooks/useSubdomain";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import PatientsPage from "./pages/PatientsPage";
import DoctorsPage from "./pages/DoctorsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import GuestBookingPage from "./pages/GuestBookingPage";
import ManageBookingPage from "./pages/ManageBookingPage";
import DoctorSchedulePage from "./pages/DoctorSchedulePage";
import MedicalRecordPage from "./pages/medical-record/MedicalRecordPage";
import RegisterClinicPage from "./pages/RegisterClinicPage";
import SaaSManagementPage from "./pages/SaaSManagementPage";
import ClinicLandingPage from "./pages/ClinicLandingPage";
import ClinicPageSettingsPage from "./pages/ClinicPageSettingsPage";
import EncounterReportPage from "./pages/medical-record/EncounterReportPage";

const PublicClinicRoutes = ({ subdomain }) => (
  <Routes>
    <Route path="/" element={<ClinicLandingPage subdomain={subdomain} />} />
    <Route path="/book-guest" element={<GuestBookingPage />} />
    <Route path="/appointments/lookup" element={<ManageBookingPage />} />
    <Route path="/manage-booking" element={<Navigate to="/appointments/lookup" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const MainRoutes = () => (
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
