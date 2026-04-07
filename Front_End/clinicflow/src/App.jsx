import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";

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


const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Routes>
          {/* ── Public ─────────────────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/book-guest" element={<GuestBookingPage />} />
          <Route path="/appointments/lookup" element={<ManageBookingPage />} />
          <Route path="/manage-booking" element={<Navigate to="/appointments/lookup" replace />} />

          {/* ── Protected (any authenticated user) ─────────── */}
          <Route path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          <Route path="/appointments"
            element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />

          <Route path="/patients"
            element={<ProtectedRoute staffOnly><PatientsPage /></ProtectedRoute>} />
          <Route path="/patients/:id"
            element={<ProtectedRoute staffOnly><MedicalRecordPage /></ProtectedRoute>} />
          <Route path="/doctors"
            element={<ProtectedRoute staffOnly><DoctorsPage /></ProtectedRoute>} />

          <Route path="/schedule"
            element={<ProtectedRoute staffOnly><DoctorSchedulePage /></ProtectedRoute>} />

          <Route path="/doctor/schedule"
            element={<ProtectedRoute doctorOnly><DoctorSchedulePage /></ProtectedRoute>} />

          <Route path="/reports"
            element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />

          <Route path="/settings"
            element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          <Route path="/consultations" element={<Navigate to="/doctor/schedule" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
