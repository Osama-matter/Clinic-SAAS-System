import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// adminOnly = true → only Admin role can access
// doctorOnly = true → only Doctor or Admin role can access
// staffOnly = true → only Receptionist or Admin role can access
const ProtectedRoute = ({ children, adminOnly = false, doctorOnly = false, staffOnly = false }) => {
  const { user, loading, isAdmin, isDoctor, isReceptionist } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-5xl animate-pulse">
            event_seat
          </span>
          <p className="text-on-surface-variant text-sm font-label uppercase tracking-widest">
            Loading EAMS...
          </p>
        </div>
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (doctorOnly && !isDoctor && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (staffOnly && !isReceptionist && !isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
};

export default ProtectedRoute;
