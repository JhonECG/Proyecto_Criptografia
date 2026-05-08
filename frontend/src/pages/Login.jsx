import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import KriptLogo from "@/components/kript/KriptLogo";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await login(email.trim(), password);
    setLoading(false);
    if (r.ok) {
      toast.success("Bóveda desbloqueada");
      nav(from, { replace: true });
    } else {
      setErr(r.error || "No se pudo iniciar sesión");
    }
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
            Tu contraseña maestra deriva la clave de tu bóveda en tu dispositivo
            con Argon2id. Ni nosotros ni nadie podemos restaurarla si la pierdes —
            esa es la garantía del modelo zero-knowledge.
          </p>
        </div>
        <div className="relative z-10 text-xs font-mono-kr text-[var(--kript-text-muted)] tracking-widest">
          CLIENT-SIDE KDF · AES-256-GCM · CSPRNG
        </div>
      </div>

      <div className="flex flex-col justify-center p-8 md:p-14 relative">
        <Link to="/" className="absolute top-6 left-6 text-sm text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)] inline-flex items-center gap-2" data-testid="back-to-landing">
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
                type="email" required autoComplete="email"
                className="input-kr" placeholder="tú@correo.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
              />
            </div>
            <div>
              <label className="label-kr">Contraseña maestra</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"} required autoComplete="current-password"
                  className="input-kr pr-11 font-mono-kr" placeholder="••••••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                />
                <button
                  type="button" onClick={() => setShow((s) => !s)}
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

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading} data-testid="login-submit">
              <KeyRound size={18} /> {loading ? "Desbloqueando…" : "Desbloquear bóveda"}
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
