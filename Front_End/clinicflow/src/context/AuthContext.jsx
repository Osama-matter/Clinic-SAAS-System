import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (value) => {
    if (!value) return value;
    const email = String(value.email ?? value.Email ?? "").toLowerCase();
    const isSeedSuperAdmin = email === "admin@clinic.com";
    const role = value.role ?? value.Role;
    return {
      ...value,
      role: isSeedSuperAdmin ? "SuperAdmin" : role,
      tenantId: isSeedSuperAdmin ? null : (value.tenantId ?? value.TenantId ?? null),
    };
  };

  // Restore session on load
  useEffect(() => {
    const savedUser = localStorage.getItem("clinicflow_user");
    const token = localStorage.getItem("clinicflow_token");
    if (savedUser && savedUser !== "undefined" && token) {
      try {
        const parsedUser = normalizeUser(JSON.parse(savedUser));
        setUser(parsedUser);
        if (parsedUser?.tenantId) {
          localStorage.setItem("clinicflow_tenantId", parsedUser.tenantId);
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem("clinicflow_user");
      }
    }
    setLoading(false);
  }, []);

  // POST /api/Auth/login → AuthTokenDto
  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    // AuthTokenDto: { accessToken, refreshToken, expiresIn, user: UserDto }
    const { accessToken, refreshToken, user: userData } = res.data;
    const normalizedUser = normalizeUser(userData);
    localStorage.setItem("clinicflow_token", accessToken);
    localStorage.setItem("clinicflow_refreshToken", refreshToken);
    localStorage.setItem("clinicflow_user", JSON.stringify(normalizedUser));
    if (normalizedUser?.tenantId) {
      localStorage.setItem("clinicflow_tenantId", normalizedUser.tenantId);
    } else {
      localStorage.removeItem("clinicflow_tenantId");
    }
    setUser(normalizedUser);
    return normalizedUser;
  };

  // POST /api/Auth/register → RegisterCommand
  const register = async (data) => {
    // Map fullName to Name for backend RegisterCommand
    const registerData = {
      name: data.fullName,
      email: data.email,
      password: data.password,
      tenantId: data.tenantId || null
    };
    const res = await authService.register(registerData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("clinicflow_token");
    localStorage.removeItem("clinicflow_refreshToken");
    localStorage.removeItem("clinicflow_user");
    localStorage.removeItem("clinicflow_tenantId");
    setUser(null);
  };

  // Helper: check user roles (consistent with backend UserRole enum)
  // Mapping based on UserRole enum: 1=User, 2=Admin, 3=Receptionist, 4=Doctor, 6=SuperAdmin
  const isSuperAdmin = user?.role === 6 || user?.role === "6" || user?.role === "SuperAdmin";
  const isAdmin = user?.role === 2 || user?.role === "2" || user?.role === "Admin";
  const isReceptionist = user?.role === 3 || user?.role === "3" || user?.role === "Receptionist";
  const isDoctor = user?.role === 4 || user?.role === "4" || user?.role === "Doctor";
  const isPatient = user?.role === 5 || user?.role === "5" || user?.role === "Patient";

  console.log("Current User:", user);
  console.log("isSuperAdmin:", isSuperAdmin);
  console.log("isAdmin:", isAdmin);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      loading,
      isAdmin: isAdmin,
      isSuperAdmin: isSuperAdmin,
      isDoctor: isDoctor,
      isReceptionist: isReceptionist,
      isPatient: isPatient
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
