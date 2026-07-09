import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ShieldAlert, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVault } from "@/context/VaultContext";
import KriptLogo from "@/components/kript/KriptLogo";
import { toast } from "sonner";
import { randomBase64 } from "@/crypto/csprng";

export default function RegisterPage() {
  const { register } = useAuth();
  const vault = useVault();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) { setErr("La contraseña maestra debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setErr("Las contraseñas no coinciden."); return; }
    if (!ack) { setErr("Debes confirmar que entiendes la política de cero recuperación."); return; }

    setLoading(true);
    try {
      // 1. Register with auth hash (not plain password)
      const r = await register(email.trim(), password, name.trim());
      if (!r.ok) {
        setErr(r.error || "No se pudo crear la cuenta");
        setLoading(false);
        return;
      }

      // 2. Generate device-bound Client Secret and vaultSalt
      const clientSecret = randomBase64(32);
      const vaultSalt = randomBase64(16);

      // 3. Derive Vault Key, store device keys in IndexedDB, create empty encrypted vault
      await vault.initVault(password, r.user.id, clientSecret, vaultSalt);

      toast.success("Bóveda creada — guarda bien tu contraseña maestra");
      nav("/app", { replace: true });
    } catch (e) {
      setErr(e.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--kript-bg)]">
      <div className="hidden lg:flex flex-col justify-between p-10 border-r border-[rgba(168,198,224,0.1)] relative kript-grid">
        <div className="relative z-10"><KriptLogo size={70} /></div>
        <div className="relative z-10 max-w-md">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-4">// NUEVA BÓVEDA</div>
          <h2 className="font-display text-4xl font-black leading-tight">
            Elige tu contraseña maestra<br />
            <span style={{ color: "var(--kript-primary)" }}>con cuidado.</span>
          </h2>
          <p className="mt-6 text-[var(--kript-text-dim)]">
            Derivará la clave única que abre tu bóveda. Si la olvidas,
            ni el equipo de Kript podrá recuperarla: es la contrapartida
            necesaria de un modelo sin puertas traseras.
          </p>
        </div>
        <div className="relative z-10 text-xs font-mono-kr text-[var(--kript-text-muted)] tracking-widest">
          SALT ÚNICO · NONCE POR OPERACIÓN · VERIFICACIÓN MAC
        </div>
      </div>

      <div className="flex flex-col justify-center p-8 md:p-14 relative">
        <Link
          to="/"
          className="absolute top-6 left-6 text-sm text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)] inline-flex items-center gap-2"
          data-testid="back-to-landing-r"
        >
          <ArrowLeft size={16} /> Volver
        </Link>
        <div className="lg:hidden mb-10"><KriptLogo size={32} /></div>

        <div className="max-w-md w-full">
          <div className="text-xs font-mono-kr tracking-widest text-[var(--kript-secondary)] mb-2">// CREAR CUENTA</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black">Crea tu bóveda</h1>
          <p className="text-[var(--kript-text-dim)] mt-2">Solo necesitas un correo y una contraseña maestra.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5" data-testid="register-form">
            <div>
              <label className="label-kr">Nombre</label>
              <input
                type="text"
                className="input-kr"
                placeholder="Opcional"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name-input"
              />
            </div>
            <div>
              <label className="label-kr">Correo</label>
              <input
                type="email"
                required
                className="input-kr"
                placeholder="tú@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email-input"
              />
            </div>
            <div>
              <label className="label-kr">Contraseña maestra</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  className="input-kr pr-11 font-mono-kr"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kript-text-dim)] hover:text-[var(--kript-primary)]"
                  data-testid="register-toggle-password"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-kr">Confirmar contraseña</label>
              <input
                type={show ? "text" : "password"}
                required
                className="input-kr font-mono-kr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                data-testid="register-confirm-input"
              />
            </div>

            <label
              className="flex items-start gap-3 p-3 border border-[rgba(255,77,79,0.3)] bg-[rgba(255,77,79,0.05)] text-sm cursor-pointer"
              data-testid="register-ack-label"
            >
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-1 accent-[var(--kript-danger)]"
                data-testid="register-ack-checkbox"
              />
              <span className="text-[var(--kript-text)]">
                <span className="inline-flex items-center gap-2 text-[var(--kript-danger)] font-semibold">
                  <ShieldAlert size={14} /> Entiendo que
                </span>{" "}
                si pierdo mi contraseña maestra, <strong>nadie</strong> podrá recuperar mi bóveda.
              </span>
            </label>

            {err && (
              <div className="text-sm text-[var(--kript-danger)] font-mono-kr" data-testid="register-error">
                {err}
              </div>
            )}

            {loading && (
              <div className="text-xs font-mono-kr text-[var(--kript-text-dim)] animate-pulse">
                DERIVANDO CLAVE Y CREANDO BÓVEDA… (puede tardar unos segundos)
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={loading}
              data-testid="register-submit"
            >
              <UserPlus size={18} />
              {loading ? "Creando…" : "Crear mi bóveda"}
            </button>
          </form>

          <div className="mt-8 text-sm text-[var(--kript-text-dim)]">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-[var(--kript-primary)] hover:underline" data-testid="go-to-login">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
