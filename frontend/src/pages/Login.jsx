import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, KeyRound, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";
import KriptLogo from "@/components/kript/KriptLogo";
import { toast } from "sonner";
import { getDeviceKeys } from "@/store/clientSecret";

export default function LoginPage() {
  const { login } = useAuth();
  const vault = useVault();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Set when the account exists but this device has no Client Secret
  const [requiresImport, setRequiresImport] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  // Import flow state
  const [importFile, setImportFile] = useState(null);
  const [importPassword, setImportPassword] = useState("");
  const [importing, setImporting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await login(email.trim(), password);
      if (!r.ok) {
        setErr(r.error || "No se pudo iniciar sesión");
        setLoading(false);
        return;
      }

      const deviceKeys = await getDeviceKeys(r.user.id);
      if (!deviceKeys) {
        // New device — require import before the vault can be decrypted
        setPendingUser(r.user);
        setRequiresImport(true);
        setLoading(false);
        return;
      }

      await vault.unlock(password, r.user.id, deviceKeys);
      toast.success("Bóveda desbloqueada");
      nav(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Error al desbloquear");
    } finally {
      setLoading(false);
    }
  }

  async function onImport(e) {
    e.preventDefault();
    if (!importFile) { setErr("Selecciona un archivo de respaldo"); return; }
    setErr("");
    setImporting(true);
    try {
      const text = await importFile.text();
      const exportObj = JSON.parse(text);
      if (!exportObj.exportSalt || !exportObj.blob) {
        throw new Error("El archivo no es un respaldo válido de Kript");
      }
      await vault.importVault(importPassword, exportObj, pendingUser.id);
      toast.success("Bóveda importada y desbloqueada");
      nav(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Error al importar. Verifica la contraseña maestra y el archivo.");
    } finally {
      setImporting(false);
    }
  }

  if (requiresImport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--kript-bg)] p-6">
        <div className="w-full max-w-md card-kr p-8">
          <KriptLogo size={32} />
          <div className="mt-6">
            <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-2">// DISPOSITIVO NUEVO</div>
            <h1 className="font-display text-2xl font-black">Importa tu bóveda</h1>
            <p className="text-sm text-[var(--kript-text-dim)] mt-2">
              Este dispositivo no tiene la clave local asociada a tu cuenta.
              Importa un archivo de respaldo cifrado para continuar.
            </p>
          </div>

          <form onSubmit={onImport} className="mt-8 space-y-5">
            <div>
              <label className="label-kr">Archivo de respaldo (.kript)</label>
              <input
                type="file"
                accept=".kript,.json"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="input-kr text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-[rgba(198,224,138,0.1)] file:text-[var(--kript-primary)] file:text-xs file:cursor-pointer"
                data-testid="import-file-input"
              />
            </div>
            <div>
              <label className="label-kr">Contraseña maestra</label>
              <input
                type="password"
                required
                className="input-kr font-mono-kr"
                placeholder="••••••••••••"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                data-testid="import-password-input"
              />
            </div>

            {err && (
              <div className="text-sm text-[var(--kript-danger)] font-mono-kr" data-testid="import-error">
                {err}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={importing}
              data-testid="import-submit"
            >
              <Upload size={16} />
              {importing ? "Importando…" : "Importar bóveda"}
            </button>

            <button
              type="button"
              className="btn-ghost w-full justify-center text-sm"
              onClick={() => { setRequiresImport(false); setPendingUser(null); setErr(""); }}
            >
              Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--kript-bg)]">
      <div className="hidden lg:flex flex-col justify-between p-10 border-r border-[rgba(168,198,224,0.1)] relative kript-grid">
        <div className="relative z-10"><KriptLogo size={70} /></div>
        <div className="relative z-10 max-w-md">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-4">// CONTRASEÑA MAESTRA</div>
          <h2 className="font-display text-4xl font-black leading-tight">
            Una llave para todas,<br />
            <span style={{ color: "var(--kript-primary)" }}>imposible de recuperar.</span>
          </h2>
          <p className="mt-6 text-[var(--kript-text-dim)]">
            Tu contraseña maestra deriva la clave de tu bóveda localmente
            con PBKDF2-SHA256. Ni nosotros ni nadie puede restaurarla si la
            pierdes — esa es la garantía del modelo zero-knowledge.
          </p>
        </div>
        <div className="relative z-10 text-xs font-mono-kr text-[var(--kript-text-muted)] tracking-widest">
          CLIENT-SIDE KDF · AES-256-GCM · CSPRNG
        </div>
      </div>

      <div className="flex flex-col justify-center p-8 md:p-14 relative">
        <Link
          to="/"
          className="absolute top-6 left-6 text-sm text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)] inline-flex items-center gap-2"
          data-testid="back-to-landing"
        >
          <ArrowLeft size={16} /> Volver
        </Link>
        <div className="lg:hidden mb-10"><KriptLogo size={32} /></div>

        <div className="max-w-md w-full">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-2">// INICIAR SESIÓN</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black">Desbloquea tu bóveda</h1>
          <p className="text-[var(--kript-text-dim)] mt-2">Ingresa con tu correo y contraseña maestra.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="login-form">
            <div>
              <label className="label-kr">Correo</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input-kr"
                placeholder="tú@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="label-kr">Contraseña maestra</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input-kr pr-11 font-mono-kr"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
                  aria-label={show ? "Ocultar" : "Mostrar"}
                  data-testid="login-toggle-password"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {err && (
              <div className="text-sm text-[var(--kript-danger)] font-mono-kr" data-testid="login-error">
                {err}
              </div>
            )}

            {loading && (
              <div className="text-xs font-mono-kr text-[var(--kript-text-dim)] animate-pulse">
                DERIVANDO CLAVE… (puede tardar unos segundos)
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={loading}
              data-testid="login-submit"
            >
              <KeyRound size={18} />
              {loading ? "Desbloqueando…" : "Desbloquear bóveda"}
            </button>
          </form>

          <div className="mt-8 text-sm text-[var(--kript-text-dim)]">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-[var(--kript-primary)] hover:underline" data-testid="go-to-register">
              Crea tu bóveda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
