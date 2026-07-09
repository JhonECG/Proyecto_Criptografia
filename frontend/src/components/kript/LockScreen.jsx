import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { getDeviceKeys } from "@/store/clientSecret";
import KriptLogo from "@/components/kript/KriptLogo";
import { toast } from "sonner";

export default function LockScreen({ userId }) {
  const { unlock } = useVault();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const deviceKeys = await getDeviceKeys(userId);
      if (!deviceKeys) {
        setErr("No se encontró la clave local de este dispositivo. Cierra sesión e importa tu bóveda.");
        return;
      }
      await unlock(password, userId, deviceKeys);
      toast.success("Bóveda desbloqueada");
    } catch {
      setErr("Contraseña incorrecta o bóveda corrupta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--kript-bg)] bg-opacity-95 backdrop-blur-sm">
      <div className="w-full max-w-sm card-kr p-8">
        <div className="flex flex-col items-center mb-8">
          <KriptLogo size={40} />
          <div className="mt-5 flex items-center gap-2 text-[var(--kript-primary)]">
            <Lock size={18} />
            <span className="font-mono-kr text-sm tracking-widest">BÓVEDA BLOQUEADA</span>
          </div>
          <p className="text-sm text-[var(--kript-text-dim)] mt-2 text-center">
            Ingresa tu contraseña maestra para desbloquear.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="lock-screen-form">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              autoFocus
              className="input-kr pr-11 font-mono-kr w-full"
              placeholder="Contraseña maestra"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="lock-password-input"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {err && (
            <div className="text-sm text-[var(--kript-danger)] font-mono-kr" data-testid="lock-error">
              {err}
            </div>
          )}

          {loading && (
            <div className="text-xs font-mono-kr text-[var(--kript-text-dim)] animate-pulse">
              DERIVANDO CLAVE…
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={loading}
            data-testid="lock-submit"
          >
            <Lock size={16} />
            {loading ? "Desbloqueando…" : "Desbloquear"}
          </button>
        </form>
      </div>
    </div>
  );
}
