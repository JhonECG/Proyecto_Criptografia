import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authMe, authLogin, authRegister, authLogout } from "@/api/authClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = initial check in progress, false = not authenticated, object = authenticated
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await authMe();
      setUser(data);
      return data;
    } catch {
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, masterPassword) => {
    try {
      const data = await authLogin(email, masterPassword);
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      return { ok: false, error: typeof detail === "string" ? detail : "Error al iniciar sesión" };
    }
  };

  const register = async (email, masterPassword, name = "") => {
    try {
      const data = await authRegister(email, masterPassword, name);
      setUser(data);
      return { ok: true, user: data };
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      return { ok: false, error: typeof detail === "string" ? detail : "Error al registrarse" };
    }
  };

  const logout = async () => {
    try { await authLogout(); } catch {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
