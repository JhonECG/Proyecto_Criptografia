import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "@/context/AuthContext";
import { VaultProvider } from "@/context/VaultContext";
import ProtectedRoute from "@/components/kript/ProtectedRoute";
import LandingPage from "@/pages/Landing";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import { AppShell, VaultPage, GeneratorPage, SettingsPage } from "@/pages/AppPages";

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <VaultProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<VaultPage />} />
                <Route path="generator" element={<GeneratorPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#0f1b2d",
                border: "1px solid rgba(198,224,138,0.35)",
                color: "#ffffff",
                borderRadius: 2,
                fontFamily: "IBM Plex Sans, sans-serif",
              },
            }}
          />
        </VaultProvider>
      </AuthProvider>
    </div>
  );
}
